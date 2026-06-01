/*
 * Security scanner orchestration for /security.html.
 *
 * Calls the Vercel backend `POST /api/scan`, animates a per-category progress
 * checklist while the request is in flight (the backend is non-streaming
 * today, so the animation is a deliberate UX choreograph — categories are
 * revealed in sequence once results arrive), then renders the summary
 * dashboard and findings.
 */
(function () {
  'use strict';

  var API_ENDPOINT = 'https://aryan-portfolio-api.vercel.app/api/scan';
  var CATEGORIES = ['Transport', 'Headers', 'Disclosure', 'Exposure', 'HTML'];
  var REVEAL_INTERVAL_MS = 380;     // delay between category reveals
  var MIN_SCAN_THEATRE_MS = 1400;   // minimum perceived scan time

  var els = {};
  var state = { running: false };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ─── progress UI ─── */
  function buildProgressRows() {
    els.progressList.innerHTML = '';
    CATEGORIES.forEach(function (cat) {
      var row = document.createElement('div');
      row.className = 'scan-row';
      row.setAttribute('data-cat', cat);
      row.innerHTML =
        '<span class="scan-row-status" aria-hidden="true">' +
          '<span class="scan-spinner"></span>' +
          '<svg class="scan-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 L7 12 L13 4"/></svg>' +
        '</span>' +
        '<span class="scan-row-name">' + escape(cat) + '</span>' +
        '<span class="scan-row-meta mono" data-meta>queued</span>';
      els.progressList.appendChild(row);
    });
  }

  function setRowState(cat, status, metaText) {
    var row = els.progressList.querySelector('[data-cat="' + cat + '"]');
    if (!row) return;
    row.setAttribute('data-status', status);
    var meta = row.querySelector('[data-meta]');
    if (meta) meta.textContent = metaText || '';
  }

  /* ─── findings render ─── */
  function severityLabel(sev) {
    return ({ high: 'High', medium: 'Medium', low: 'Low', info: 'Info', pass: 'Pass' })[sev] || sev;
  }
  var SEV_ORDER = { high: 0, medium: 1, low: 2, info: 3, pass: 4 };

  function renderSummary(data) {
    els.scannedTarget.textContent = data.target.replace(/^https?:\/\//, '');
    els.scannedAt.textContent = new Date(data.scannedAt).toLocaleString();
    els.scanDuration.textContent = data.durationMs + ' ms';
    var s = data.summary || {};
    ['high', 'medium', 'low', 'info', 'pass'].forEach(function (sev) {
      var el = els.summaryStrip.querySelector('[data-sev="' + sev + '"] .sev-num');
      if (el) el.textContent = s[sev] || 0;
    });
    els.report.classList.add('is-ready');
  }

  function renderCategoryFindings(cat, findings) {
    var section = document.createElement('section');
    section.className = 'finding-cat-block';
    var title = document.createElement('div');
    title.className = 'finding-cat-head mono';
    title.textContent = cat;
    section.appendChild(title);

    var sorted = findings.slice().sort(function (a, b) {
      return (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99);
    });

    sorted.forEach(function (f) { section.appendChild(buildFindingRow(f)); });
    return section;
  }

  function buildFindingRow(f) {
    var row = document.createElement('div');
    row.className = 'finding';
    row.setAttribute('data-sev', f.severity);

    var meta =
      '<div class="finding-meta">' +
        '<span class="finding-pill is-' + escape(f.severity) + '">' + escape(severityLabel(f.severity)) + '</span>' +
        '<span class="finding-cat">' + escape(f.id) + '</span>' +
      '</div>';

    var refHtml = f.reference
      ? '<a class="finding-ref mono" href="' + escape(f.reference) + '" target="_blank" rel="noopener">Docs ↗</a>'
      : '';

    var evidenceHtml = f.evidence
      ? '<pre class="finding-evidence">' + escape(f.evidence) + '</pre>'
      : '';

    var recHtml = f.recommendation
      ? '<div class="finding-rec"><span class="finding-rec-label mono">Fix</span><p>' + escape(f.recommendation) + '</p></div>'
      : '';

    row.innerHTML = meta +
      '<div>' +
        '<h4 class="finding-title">' + escape(f.title) + '</h4>' +
        '<p class="finding-desc">' + escape(f.detail) + '</p>' +
        evidenceHtml +
        recHtml +
        '<div class="finding-actions">' + refHtml + '</div>' +
      '</div>';
    return row;
  }

  function renderAllFindings(data) {
    els.findingsBody.innerHTML = '';
    var total = 0;
    data.categories.forEach(function (cat) {
      if (!cat.findings || cat.findings.length === 0) return;
      els.findingsBody.appendChild(renderCategoryFindings(cat.category, cat.findings));
      total += cat.findings.length;
    });
    els.findingsLabel.textContent = 'Findings · ' + total + ' total';
  }

  /* ─── orchestration ─── */
  function setRunning(b) {
    state.running = b;
    els.runBtn.disabled = b;
    els.runBtn.classList.toggle('is-running', b);
    els.runBtn.querySelector('[data-run-label]').textContent = b ? 'Scanning…' : 'Run live scan';
  }

  function resetUi() {
    els.report.classList.remove('is-ready');
    els.findingsBody.innerHTML = '';
    els.findingsLabel.textContent = 'Awaiting scan';
    els.errorEl.hidden = true;
    els.errorEl.textContent = '';
    ['high', 'medium', 'low', 'info', 'pass'].forEach(function (sev) {
      var el = els.summaryStrip.querySelector('[data-sev="' + sev + '"] .sev-num');
      if (el) el.textContent = '—';
    });
    els.scannedTarget.textContent = '—';
    els.scannedAt.textContent = '—';
    els.scanDuration.textContent = '—';
  }

  function showError(msg) {
    els.errorEl.hidden = false;
    els.errorEl.textContent = msg;
  }

  function revealCategoriesInSequence(data) {
    var map = {};
    data.categories.forEach(function (c) { map[c.category] = c; });
    return new Promise(function (resolve) {
      setRowState(CATEGORIES[0], 'scanning', 'scanning…');
      var i = 0;
      function tick() {
        var cat = CATEGORIES[i];
        var r = map[cat];
        if (r) {
          var label = r.error ? 'error · ' + r.error : r.durationMs + 'ms · ' + r.findings.length + ' findings';
          setRowState(cat, r.error ? 'error' : 'done', label);
        } else {
          setRowState(cat, 'skipped', 'no result');
        }
        i++;
        if (i >= CATEGORIES.length) { resolve(); return; }
        setRowState(CATEGORIES[i], 'scanning', 'scanning…');
        setTimeout(tick, REVEAL_INTERVAL_MS);
      }
      setTimeout(tick, REVEAL_INTERVAL_MS);
    });
  }

  function runScan() {
    if (state.running) return;
    setRunning(true);
    resetUi();
    buildProgressRows();
    els.progressWrap.hidden = false;

    var apiStart = Date.now();
    var apiPromise = fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    });

    apiPromise.then(function (result) {
      var apiDur = Date.now() - apiStart;
      var wait = Math.max(0, MIN_SCAN_THEATRE_MS - apiDur);
      setTimeout(function () { afterScan(result); }, wait);
    }).catch(function (err) {
      console.error('[scanner]', err);
      showError('Network error while running the scan: ' + (err && err.message ? err.message : 'unknown'));
      // Mark all queued rows as errored
      CATEGORIES.forEach(function (c) { setRowState(c, 'error', 'aborted'); });
      setRunning(false);
    });
  }

  function afterScan(result) {
    if (!result.ok) {
      var msg = result.status === 429
        ? "Rate-limited (10 scans/min). Try again in a moment."
        : 'Scanner returned ' + result.status + ': ' + ((result.data && result.data.detail) || (result.data && result.data.error) || 'unknown error.');
      showError(msg);
      CATEGORIES.forEach(function (c) { setRowState(c, 'error', 'aborted'); });
      setRunning(false);
      return;
    }
    var data = result.data;
    revealCategoriesInSequence(data).then(function () {
      renderSummary(data);
      renderAllFindings(data);
      setRunning(false);
      // Scroll the report into view smoothly.
      if (els.report && typeof els.report.scrollIntoView === 'function') {
        els.report.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ─── init ─── */
  function init() {
    els.runBtn       = $('[data-scan-run]');
    els.progressWrap = $('[data-scan-progress]');
    els.progressList = $('[data-scan-progress-list]');
    els.report       = $('[data-scan-report]');
    els.summaryStrip = $('[data-scan-summary]');
    els.findingsBody = $('[data-scan-findings]');
    els.findingsLabel = $('[data-scan-findings-label]');
    els.scannedTarget = $('[data-scan-target]');
    els.scannedAt    = $('[data-scan-at]');
    els.scanDuration = $('[data-scan-duration]');
    els.errorEl      = $('[data-scan-error]');

    if (!els.runBtn) return; // page doesn't have scanner UI

    buildProgressRows();
    els.runBtn.addEventListener('click', runScan);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
