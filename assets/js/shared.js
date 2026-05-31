/* ─────────── shared.js ───────────
   Common scripts for every page: split-text, Lenis, GSAP boot,
   reveal scroll-triggers, marquees, custom cursor, orb parallax,
   active-nav detection, scroll progress.

   Page-specific scripts can listen for `portfolio:ready` (libs loaded,
   init done) or `portfolio:fallback` (reduced-motion or libs missing)
   to layer their own animations on top.

   Loaded with `defer`, so this runs after GSAP/Lenis defer scripts
   have parsed but before DOMContentLoaded finishes.
*/

(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const isMobile = matchMedia('(max-width: 900px)').matches;

  /* ─── split text helpers (also exposed on window for page scripts) ─── */
  function splitChars(el) {
    const walk = (node) => {
      const out = document.createDocumentFragment();
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          for (const ch of child.textContent) {
            if (ch === ' ') {
              out.appendChild(document.createTextNode(' '));
            } else {
              const mask = document.createElement('span');
              mask.className = 'char-mask';
              const inner = document.createElement('span');
              inner.className = 'char';
              inner.textContent = ch;
              mask.appendChild(inner);
              out.appendChild(mask);
            }
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') {
            out.appendChild(child.cloneNode(true));
          } else {
            const clone = child.cloneNode(false);
            clone.appendChild(walk(child));
            out.appendChild(clone);
          }
        }
      });
      return out;
    };
    const fragment = walk(el);
    el.innerHTML = '';
    el.appendChild(fragment);
  }

  function splitWords(el) {
    const text = el.innerHTML;
    const tokens = text.split(/(<[^>]+>|\s+)/).filter(Boolean);
    let html = '';
    tokens.forEach((tok) => {
      if (/^<[^>]+>$/.test(tok)) html += tok;
      else if (/^\s+$/.test(tok)) html += ' ';
      else html += `<span class="word-mask"><span class="word">${tok}</span></span>`;
    });
    el.innerHTML = html;
  }

  window.splitChars = splitChars;
  window.splitWords = splitWords;

  document.querySelectorAll('[data-split="chars"]').forEach(splitChars);
  document.querySelectorAll('[data-split="words"]').forEach(splitWords);

  /* ─── active-nav detection (path-based) ─── */
  function markActiveNav() {
    const path = location.pathname.replace(/\/$/, '');
    const file = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      // strip query/hash for path comparison
      const base = href.split('#')[0].split('?')[0];
      const target = base.split('/').pop();
      if (!target) return;
      if (target === file || (file === '' && target === 'index.html')) {
        a.classList.add('is-active');
      }
    });
  }
  markActiveNav();

  /* ─── anchor smooth scroll (handles same-page hashes + cross-page hashes) ─── */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    let hash = null;
    if (href.startsWith('#')) {
      hash = href;
    } else if (href.includes('#')) {
      const [path, h] = href.split('#');
      const linkFile = (path.split('/').pop() || 'index.html');
      const currentFile = (location.pathname.split('/').pop() || 'index.html');
      if (linkFile === currentFile) hash = '#' + h;
    }
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    if (window.lenis) {
      window.lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    } else {
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  });

  /* ─── scroll progress bar (works with or without Lenis) ─── */
  const progress = document.querySelector('.scroll-progress');
  function updateProgress() {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    progress.style.height = (ratio * 100) + '%';
  }
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  /* ─── boot management ─── */
  function dropJsAnim() {
    document.documentElement.classList.remove('js-anim');
  }
  function fireFallback() {
    document.dispatchEvent(new CustomEvent('portfolio:fallback'));
  }
  function fireReady() {
    document.dispatchEvent(new CustomEvent('portfolio:ready'));
  }

  if (reduced) {
    dropJsAnim();
    fireFallback();
    return;
  }

  function tryBoot() {
    if (typeof gsap !== 'undefined' && typeof Lenis !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      init();
    } else {
      console.warn('[portfolio] GSAP/Lenis missing — content stays static.');
      dropJsAnim();
      fireFallback();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBoot);
  } else {
    tryBoot();
  }

  function init() {
    gsap.registerPlugin(ScrollTrigger);

    /* ── Lenis smooth scroll ── */
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    /* ── reveal-on-scroll for [.reveal] blocks (skips hero so hero timeline can own them) ── */
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.fromTo(
        el,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1.0, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }
      );
    });

    /* ── headline drift for serif heads on every page ── */
    document.querySelectorAll('[data-drift]').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        }
      );
    });

    /* ── marquees ── */
    document.querySelectorAll('.marquee-track').forEach((track) => {
      const dir = parseFloat(track.dataset.direction || '1');
      const tween = gsap.to(track, {
        xPercent: -50 * dir,
        duration: 32,
        ease: 'none',
        repeat: -1,
      });
      if (dir < 0) gsap.set(track, { xPercent: -50 });
      const wrap = track.parentElement;
      wrap.addEventListener('mouseenter', () => tween.timeScale(0.25));
      wrap.addEventListener('mouseleave', () => tween.timeScale(1));
    });

    /* ── orb mouse parallax ── */
    const orbs = document.querySelectorAll('.orb');
    if (orbs.length) {
      const orbState = { tx: 0, ty: 0, x: 0, y: 0 };
      addEventListener('mousemove', (e) => {
        orbState.tx = (e.clientX / innerWidth - 0.5) * 30;
        orbState.ty = (e.clientY / innerHeight - 0.5) * 30;
      });
      function orbTick() {
        orbState.x += (orbState.tx - orbState.x) * 0.06;
        orbState.y += (orbState.ty - orbState.y) * 0.06;
        orbs.forEach((o, i) => {
          const f = (i + 1) * 0.6;
          o.style.transform = `translate3d(${orbState.x * f}px, ${orbState.y * f}px, 0)` + (o.classList.contains('orb-3') ? ' translateX(-50%)' : '');
        });
        requestAnimationFrame(orbTick);
      }
      orbTick();
    }

    /* ── spotlight cursor ── */
    if (!isTouch) {
      const ring = document.querySelector('.cursor-ring');
      const dot = document.querySelector('.cursor-dot');
      if (ring && dot) {
        const cur = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };

        addEventListener('mousemove', (e) => {
          cur.x = e.clientX;
          cur.y = e.clientY;
          dot.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%)`;
        });

        function cursorTick() {
          cur.rx += (cur.x - cur.rx) * 0.2;
          cur.ry += (cur.y - cur.ry) * 0.2;
          ring.style.transform = `translate3d(${cur.rx}px, ${cur.ry}px, 0) translate(-50%, -50%)`;
          requestAnimationFrame(cursorTick);
        }
        cursorTick();
        requestAnimationFrame(() => document.body.classList.add('cursor-ready'));

        const linkSel = 'a, button, .skill-tag, .skill-tile, .info-row, .filter-chip';
        document.querySelectorAll(linkSel).forEach((el) => {
          el.addEventListener('mouseenter', () => document.body.classList.add('cursor-link'));
          el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-link'));
        });
      }
    }

    /* ── magnetic [data-magnetic] elements ── */
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    /* ── refresh on font load + resize ── */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    addEventListener('resize', () => ScrollTrigger.refresh());

    /* ── current-year footer auto-fill ── */
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    fireReady();
  }
})();
