/* Aryan Mainkar — Portfolio Assistant (AI-backed)
   Replaces the original pattern-matched FAQ widget. Posts to the Vercel
   backend (aryan-portfolio-api) which routes through Groq Llama models.

   Other scripts can drive the widget:
     window.AryanChat.open()
     window.AryanChat.ask("question text")  // opens panel and submits
*/
(function () {
  'use strict';
  if (window.__faqWidgetMounted) return;
  window.__faqWidgetMounted = true;

  var API_ENDPOINT = 'https://aryan-portfolio-api.vercel.app/api/ask';
  var STORAGE_KEY = 'aryanchat:history';
  var MAX_HISTORY = 12;

  var SUGGESTIONS = [
    { label: 'Email',         q: "What's the best email to reach Aryan?" },
    { label: 'Phone',         q: "What's his phone number?" },
    { label: 'Skills',        q: 'Summarize his stack and strongest skills.' },
    { label: 'Current role',  q: 'What is he doing at BroadAxis right now?' },
    { label: 'Projects',      q: 'Walk me through his most impressive projects.' },
    { label: 'Hiring',        q: 'Is he open to new roles?' },
    { label: 'BroadAxis',     q: 'Tell me about his work at BroadAxis.' },
    { label: 'Viridium',      q: 'What did he build at Viridium AI?' }
  ];

  var state = {
    open: false,
    busy: false,
    history: loadHistory()
  };

  /* ─── DOM ─── */
  var css = [
    '.faq-bubble{position:fixed;right:24px;bottom:24px;width:60px;height:60px;border-radius:50%;background:#0a0a0a;border:1.5px solid #39FF14;color:#39FF14;font-family:"JetBrains Mono",ui-monospace,monospace;cursor:pointer;z-index:9990;display:grid;place-items:center;box-shadow:0 0 0 0 rgba(57,255,20,.45),0 8px 32px rgba(0,0,0,.45);animation:faqPulse 2.6s ease-in-out infinite;transition:transform .3s ease,box-shadow .3s ease}',
    '.faq-bubble:hover{transform:scale(1.08);box-shadow:0 0 0 6px rgba(57,255,20,.18),0 8px 32px rgba(0,0,0,.5)}',
    '@keyframes faqPulse{0%,100%{box-shadow:0 0 0 0 rgba(57,255,20,.5),0 8px 32px rgba(0,0,0,.45)}50%{box-shadow:0 0 0 12px rgba(57,255,20,0),0 8px 32px rgba(0,0,0,.45)}}',
    '@media(prefers-reduced-motion:reduce){.faq-bubble{animation:none}}',
    '.faq-bubble svg{width:24px;height:24px;stroke:#39FF14;fill:none;stroke-width:1.5}',
    '.faq-panel{position:fixed;right:24px;bottom:96px;width:400px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 130px);background:#0a0a0a;border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 80px rgba(0,0,0,.65),0 0 0 1px rgba(57,255,20,.15);z-index:9989;display:flex;flex-direction:column;font-family:"Inter",system-ui,sans-serif;color:#f5f5f5;font-size:13.5px;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .25s ease,transform .25s cubic-bezier(.65,0,.35,1)}',
    '.faq-panel.is-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
    '.faq-head{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.faq-head-title{font-family:"Fraunces",serif;font-size:16px;font-weight:500;display:flex;align-items:center;gap:10px}',
    '.faq-head-title .dot{width:8px;height:8px;border-radius:50%;background:#39FF14;box-shadow:0 0 10px rgba(57,255,20,.6);animation:faqDotPulse 2s ease-in-out infinite}',
    '@keyframes faqDotPulse{0%,100%{opacity:1}50%{opacity:.45}}',
    '.faq-meta{font-family:"JetBrains Mono",monospace;font-size:10px;color:#6b6b6b;letter-spacing:.12em;text-transform:uppercase}',
    '.faq-close{background:none;border:none;color:#a3a3a3;font-size:22px;cursor:pointer;padding:4px 8px;line-height:1}',
    '.faq-close:hover{color:#39FF14}',
    '.faq-body{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(57,255,20,.25) transparent}',
    '.faq-body::-webkit-scrollbar{width:5px}',
    '.faq-body::-webkit-scrollbar-thumb{background:rgba(57,255,20,.25);border-radius:100px}',
    '.faq-msg{padding:11px 14px;border-radius:14px;line-height:1.55;max-width:88%;word-wrap:break-word;white-space:pre-wrap}',
    '.faq-msg.bot{background:rgba(57,255,20,.06);border:1px solid rgba(57,255,20,.18);align-self:flex-start;border-bottom-left-radius:5px;color:#f5f5f5}',
    '.faq-msg.user{background:rgba(245,245,245,.08);border:1px solid rgba(245,245,245,.16);align-self:flex-end;border-bottom-right-radius:5px;color:#f5f5f5}',
    '.faq-msg a{color:#39FF14;text-decoration:underline;text-underline-offset:2px}',
    '.faq-msg em{color:#9fe8a0;font-style:italic}',
    '.faq-typing{display:inline-flex;gap:4px;padding:14px 14px;background:rgba(57,255,20,.06);border:1px solid rgba(57,255,20,.18);border-radius:14px;border-bottom-left-radius:5px;align-self:flex-start;max-width:88%}',
    '.faq-typing span{width:6px;height:6px;border-radius:50%;background:#39FF14;opacity:.4;animation:faqBlink 1.2s infinite}',
    '.faq-typing span:nth-child(2){animation-delay:.2s}',
    '.faq-typing span:nth-child(3){animation-delay:.4s}',
    '@keyframes faqBlink{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}',
    '.faq-suggest{display:flex;flex-wrap:wrap;gap:6px;padding:8px 20px 10px}',
    '.faq-suggest:empty{display:none}',
    '.faq-suggest button{background:transparent;border:1px solid rgba(255,255,255,.18);color:#a3a3a3;font-family:"JetBrains Mono",monospace;font-size:10.5px;padding:6px 11px;border-radius:100px;cursor:pointer;transition:all .2s}',
    '.faq-suggest button:hover{border-color:#39FF14;color:#39FF14}',
    '.faq-form{display:flex;align-items:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,.12);padding:12px 20px}',
    '.faq-form textarea{flex:1;background:rgba(245,245,245,.04);border:1px solid rgba(245,245,245,.12);color:#f5f5f5;font:inherit;font-size:13.5px;line-height:1.5;padding:10px 13px;border-radius:14px;resize:none;min-height:40px;max-height:120px;outline:none;transition:border-color .2s,background .2s}',
    '.faq-form textarea:focus{border-color:#39FF14;background:rgba(57,255,20,.04)}',
    '.faq-form textarea:disabled{opacity:.5;cursor:progress}',
    '.faq-send{width:40px;height:40px;background:#39FF14;color:#0a0a0a;border:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s,transform .15s}',
    '.faq-send:hover{background:#5BFF36}',
    '.faq-send:active{transform:scale(.94)}',
    '.faq-send:disabled{opacity:.4;cursor:not-allowed}',
    '.faq-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 20px 14px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.08em;color:rgba(245,245,245,.4)}',
    '.faq-foot-clear{background:none;border:none;color:rgba(245,245,245,.4);font:inherit;cursor:pointer;padding:0;text-transform:uppercase;letter-spacing:.08em}',
    '.faq-foot-clear:hover{color:#39FF14}',
    '@media(max-width:480px){.faq-panel{right:8px;left:8px;width:auto;bottom:84px;height:calc(100vh - 110px)}.faq-bubble{right:16px;bottom:16px}}'
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var bubble = document.createElement('button');
  bubble.className = 'faq-bubble';
  bubble.setAttribute('aria-label', 'Open Aryan chat assistant');
  bubble.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'faq-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Aryan portfolio assistant');
  panel.innerHTML =
    '<div class="faq-head">' +
      '<div class="faq-head-title"><span class="dot"></span>Ask about Aryan</div>' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<span class="faq-meta" data-faq-tier>AI</span>' +
        '<button class="faq-close" aria-label="Close">×</button>' +
      '</div>' +
    '</div>' +
    '<div class="faq-body" data-faq-body></div>' +
    '<div class="faq-suggest" data-faq-suggest></div>' +
    '<form class="faq-form" data-faq-form>' +
      '<textarea data-faq-input rows="1" placeholder="Ask anything about Aryan…" maxlength="1000" autocomplete="off"></textarea>' +
      '<button type="submit" class="faq-send" data-faq-send aria-label="Send">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8 L14 8 M9 3 L14 8 L9 13"></path></svg>' +
      '</button>' +
    '</form>' +
    '<div class="faq-foot">' +
      '<span>Powered by Groq · free tier</span>' +
      '<button type="button" class="faq-foot-clear" data-faq-clear>Clear chat</button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var bodyEl = panel.querySelector('[data-faq-body]');
  var input = panel.querySelector('[data-faq-input]');
  var sendBtn = panel.querySelector('[data-faq-send]');
  var form = panel.querySelector('[data-faq-form]');
  var suggestEl = panel.querySelector('[data-faq-suggest]');
  var tierEl = panel.querySelector('[data-faq-tier]');
  var closeBtn = panel.querySelector('.faq-close');
  var clearBtn = panel.querySelector('[data-faq-clear]');

  /* ─── helpers ─── */
  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch (e) { return []; }
  }
  function saveHistory() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.slice(-MAX_HISTORY))); }
    catch (e) {}
  }
  function clearHistory() {
    state.history = [];
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    bodyEl.innerHTML = '';
    setTier('AI');
    renderInitial();
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Linkify URLs, emails, phone numbers in escaped text.
  function linkify(escaped) {
    return escaped
      .replace(/(https?:\/\/[^\s<]+)/g, function (m) {
        return '<a href="' + m + '" target="_blank" rel="noopener">' + m + '</a>';
      })
      .replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, function (m) {
        return '<a href="mailto:' + m + '">' + m + '</a>';
      })
      .replace(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g, function (m) {
        var tel = m.replace(/[^\d+]/g, '');
        return '<a href="tel:' + tel + '">' + m + '</a>';
      });
  }

  function appendBubble(role, text) {
    var el = document.createElement('div');
    el.className = 'faq-msg ' + (role === 'user' ? 'user' : 'bot');
    el.innerHTML = role === 'user' ? escape(text) : linkify(escape(text));
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }

  function appendTyping() {
    var t = document.createElement('div');
    t.className = 'faq-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    bodyEl.appendChild(t);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return t;
  }

  function setBusy(b) {
    state.busy = b;
    input.disabled = b;
    sendBtn.disabled = b;
  }

  function setTier(label) { tierEl.textContent = label; }

  function renderInitial() {
    if (state.history.length > 0) {
      state.history.forEach(function (t) { appendBubble(t.role, t.content); });
      renderSuggestions(false);
      return;
    }
    appendBubble('assistant', "Hi 👋  I'm Aryan's portfolio assistant. Ask me about his experience, skills, projects, availability, or anything else recruiter-relevant. Or tap a chip below to start.");
    renderSuggestions(true);
  }

  function renderSuggestions(show) {
    suggestEl.innerHTML = '';
    if (!show) return;
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.label;
      b.setAttribute('data-q', s.q);
      suggestEl.appendChild(b);
    });
  }

  function autoSize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  /* ─── core ─── */
  function ask(text) {
    if (state.busy) return;
    var message = (text || '').trim();
    if (!message) return;
    if (!state.open) open();

    state.history.push({ role: 'user', content: message });
    saveHistory();
    appendBubble('user', message);
    renderSuggestions(false);
    var typing = appendTyping();
    setBusy(true);
    setTier('…');

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        history: state.history.slice(-MAX_HISTORY, -1)
      })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      typing.remove();
      if (!result.ok) {
        var msg = result.status === 429
          ? "I'm rate-limited for the next minute — try again shortly, or email aryanmainkar2@gmail.com."
          : 'Something went wrong (' + result.status + '). ' + ((result.data && result.data.error) || '');
        appendBubble('assistant', msg);
        setTier('ERR');
        return;
      }
      var reply = (result.data && result.data.reply) || 'No reply received.';
      state.history.push({ role: 'assistant', content: reply });
      saveHistory();
      appendBubble('assistant', reply);
      setTier(result.data.tier === 'L2' ? 'L2' : (result.data.tier === 'L3' ? 'L3' : 'AI'));
    }).catch(function (err) {
      typing.remove();
      appendBubble('assistant', 'Network error. Check your connection and try again.');
      setTier('ERR');
      console.error('[chat-widget]', err);
    }).then(function () {
      setBusy(false);
      input.focus();
    });
  }

  /* ─── window controls ─── */
  function open() {
    state.open = true;
    panel.classList.add('is-open');
    if (!bodyEl.children.length) renderInitial();
    setTimeout(function () { input.focus(); }, 250);
  }
  function close() {
    state.open = false;
    panel.classList.remove('is-open');
  }
  function toggle() { state.open ? close() : open(); }

  /* ─── events ─── */
  bubble.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  clearBtn.addEventListener('click', clearHistory);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) return;
    input.value = '';
    autoSize();
    ask(v);
  });

  input.addEventListener('input', autoSize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  suggestEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-q]');
    if (btn) ask(btn.getAttribute('data-q'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.open) close();
  });

  /* ─── public API ─── */
  window.AryanChat = {
    open: open,
    close: close,
    ask: function (q) { open(); setTimeout(function () { ask(q); }, 200); },
    isOpen: function () { return state.open; }
  };
})();
