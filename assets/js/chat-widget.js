/* Aryan Mainkar — Portfolio FAQ Widget
   Pure client-side, zero backend, zero cost. Pattern-matched intent detection
   over a knowledge base extracted from the resume.

   To upgrade to real LLM later:
     1. Deploy a Cloudflare Worker calling Workers AI (Llama 3.3, free tier).
     2. Replace `respond(query)` with a fetch() to that Worker endpoint.
   Everything else stays the same.
*/
(function () {
  'use strict';
  if (window.__faqWidgetMounted) return;
  window.__faqWidgetMounted = true;

  /* ─── knowledge base ─── */
  const ABOUT = {
    name: 'Aryan Mainkar',
    role: 'UI/UX Developer & Front-End Engineer',
    title: 'Full Stack Developer at BroadAxis Inc',
    location: 'Arlington, Texas',
    email: 'aryan.mainkar@mavs.uta.edu',
    phone: '+1 (925) 436-2418',
    phoneHref: 'tel:+19254362418',
    linkedin: 'https://www.linkedin.com/in/aryanmainkar',
    github: 'https://github.com/aryanmainkar',
    education: 'B.S. Computer Science, University of Texas at Arlington (Aug 2020 – Dec 2024). Maverick Academic Scholar.',
    available: 'Open to senior front-end and design-engineering roles. Remote, hybrid, or on-site.',
    timezone: 'CST (UTC −06:00)',
    responseSLA: '~24 hours on weekdays'
  };

  const SKILLS = {
    languages: ['Python', 'PHP', 'Java', 'C', 'HTML', 'CSS', 'MATLAB', 'R', 'Dart', 'LaTeX'],
    frameworks: ['Flask', 'Spring Boot', 'Flutter', 'WordPress', 'Elementor', 'Bootstrap', 'scikit-learn', 'pandas', 'NumPy', 'OpenCV', 'Jupyter Notebook'],
    cloud: ['Microsoft Azure (DevOps, Kubernetes, ADF, Monitor, VMs)', 'GCP', 'Firestore', 'MySQL', 'Microsoft CRM'],
    design: ['Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe Firefly', 'Midjourney'],
    ai: ['Claude Code', 'Midjourney', 'Adobe Firefly', 'AI/ML research (cybersecurity)', 'Random forest, linear regression']
  };

  const EXPERIENCE = [
    { co: 'BroadAxis Inc', role: 'Full Stack Developer', when: 'Feb 2026 – Present', bullets: [
      'Owns the full web development lifecycle across 20+ projects (e-commerce, corporate, portfolio) using PHP, WordPress, Python, Elementor, CSS, MySQL.',
      'Integrated AI image-generation workflows (Midjourney, Adobe Firefly) into production.',
      'Custom WordPress plugins handling YMM mapping across a 60,000+ product catalog.'
    ]},
    { co: 'University of Texas at Arlington', role: 'Cybersecurity Research Volunteer', when: 'Mar 2025 – Dec 2025', bullets: [
      'Cybersecurity curriculum development under Dr. Nadra Guizani.',
      'Literature reviews and AI/ML implementation analysis for a research paper.'
    ]},
    { co: 'Kshan Tech Soft Pvt LTD', role: 'Flutter Developer Intern', when: 'May 2024 – Aug 2024', bullets: [
      'Responsive web pages in Flutter and Dart.',
      'Cross-platform testing (Android, Windows, Linux).'
    ]},
    { co: 'Viridium AI', role: 'Software Developer Intern', when: 'May 2023 – Aug 2023', bullets: [
      'Azure data ingestion pipelines via Azure Data Factory.',
      'ML (random forest, linear regression) for environmental insights.',
      'Logging & monitoring framework with Spring Boot (SLF4J, LOG4J).'
    ]}
  ];

  const PROJECTS = [
    { name: 'LSB Steganography Application', stack: 'Flask, Python, GCP, Firestore', repo: 'https://github.com/aryanmainkar/Steganography-Website' },
    { name: 'Keypoint Detection (HOG & SIFT)', stack: 'Python, Jupyter, OpenCV, NumPy', repo: 'https://github.com/aryanmainkar/Matching-and-Image-stitching-with-SIFT-and-RANSAC.' },
    { name: 'Customer Spending Prediction', stack: 'Python, scikit-learn, pandas', repo: 'https://github.com/aryanmainkar/Customer-Sales-Data-Analysis' }
  ];

  /* ─── intent matchers ─── */
  /* Each intent has trigger patterns and a response builder. Order matters — more specific intents first. */
  const INTENTS = [
    {
      id: 'greet',
      patterns: [/^\s*(hi|hello|hey|yo|sup|howdy|good (morning|afternoon|evening))\b/i],
      respond: () => `Hi! I'm Aryan's portfolio assistant. Ask me about his **experience**, **skills**, **contact info**, **resume**, or **projects** — or anything else recruiter-relevant.`
    },
    {
      id: 'thanks',
      patterns: [/\b(thanks|thank you|thx|ty|appreciate)\b/i],
      respond: () => `You're welcome! If you want to reach out, his email is **${ABOUT.email}** and phone is **${ABOUT.phone}** — he replies in ~24h on weekdays.`
    },
    {
      id: 'email',
      patterns: [/\b(email|e-mail|mail|reach (out|him)|contact info|how do i (contact|reach))\b/i, /\bemail\b/i],
      respond: () => `📧 **${ABOUT.email}** — copy from the [contact page](contact.html) or click to email directly: <a href="mailto:${ABOUT.email}">${ABOUT.email}</a>`
    },
    {
      id: 'phone',
      patterns: [/\b(phone|call|number|cell|telephone|ring)\b/i],
      respond: () => `📞 **${ABOUT.phone}** &mdash; <a href="${ABOUT.phoneHref}">tap to call</a>. He's one call away. Timezone: ${ABOUT.timezone}.`
    },
    {
      id: 'linkedin',
      patterns: [/\blinkedin\b/i],
      respond: () => `🔗 LinkedIn: <a href="${ABOUT.linkedin}" target="_blank" rel="noopener">${ABOUT.linkedin.replace('https://www.', '')}</a>`
    },
    {
      id: 'github',
      patterns: [/\b(github|gh|git hub|repo|repositor(y|ies)|code on)\b/i],
      respond: () => `💻 GitHub: <a href="${ABOUT.github}" target="_blank" rel="noopener">${ABOUT.github.replace('https://', '')}</a> &mdash; featured projects:<br>${PROJECTS.map(p => `• <a href="${p.repo}" target="_blank" rel="noopener">${p.name}</a> &middot; <em>${p.stack}</em>`).join('<br>')}`
    },
    {
      id: 'location',
      patterns: [/\b(where|location|based|live|city|state|address|relocate|relocation)\b/i],
      respond: () => `📍 Based in **${ABOUT.location}** &mdash; ${ABOUT.timezone}. Open to remote, hybrid, or on-site.`
    },
    {
      id: 'resume',
      patterns: [/\b(resume|cv|curriculum vitae|download)\b/i],
      respond: () => `📄 Full resume with ATS keywords highlighted: <a href="resume.html">/resume</a> &mdash; or <a href="assets/pdf/Aryan_Mainkar_Resume.docx" download>download the .docx directly</a>.`
    },
    {
      id: 'ats',
      patterns: [/\b(ats|keyword|tracker|applicant tracking|scan|parse)\b/i],
      respond: () => `The <a href="resume.html">/resume page</a> highlights every ATS keyword in neon by category &mdash; languages, frameworks, cloud, domain, soft skills. Click any chip to jump to its hit in the resume.`
    },
    {
      id: 'skills_overall',
      patterns: [/\b(skills|tech stack|expertise|stack|technologies|good at|specialt(y|ies)|what (can|does) (he|aryan) do)\b/i],
      respond: () => `Aryan's stack &mdash; pulled from his resume:<br>
• <strong>Languages:</strong> ${SKILLS.languages.join(', ')}<br>
• <strong>Frameworks:</strong> ${SKILLS.frameworks.join(', ')}<br>
• <strong>Cloud:</strong> ${SKILLS.cloud.join(', ')}<br>
• <strong>Design:</strong> ${SKILLS.design.join(', ')}<br>
• <strong>AI tools:</strong> ${SKILLS.ai.join(', ')}<br>
Want detail on any of these? Just ask.`
    },
    {
      id: 'skills_python',
      patterns: [/\b(python|flask|django|pandas|scikit|numpy|jupyter)\b/i],
      respond: () => `Yes &mdash; Python is one of his core languages. Used in production at BroadAxis, in academic ML projects (random forest, linear regression with scikit-learn, pandas), and in the LSB Steganography app (Flask backend on GCP).`
    },
    {
      id: 'skills_wordpress',
      patterns: [/\b(wordpress|elementor|woocommerce|cms|php)\b/i],
      respond: () => `Strong WordPress &amp; PHP background. At BroadAxis he ships custom WordPress plugins handling complex data transfer and YMM (Year/Make/Model) mapping across <strong>60,000+ products</strong>. Also fluent with Elementor.`
    },
    {
      id: 'skills_frontend',
      patterns: [/\b(front[- ]?end|react|vue|html|css|tailwind|bootstrap|design system|ui|ux|figma)\b/i],
      respond: () => `Front-end is his focus &mdash; pixel-perfect, cross-browser, accessible. Comfortable with HTML, CSS, Bootstrap, Figma-to-code workflows, and design systems. Builds responsive interfaces from Figma mockups end-to-end.`
    },
    {
      id: 'skills_flutter',
      patterns: [/\b(flutter|dart|mobile|ios|android|cross[- ]?platform)\b/i],
      respond: () => `Flutter &amp; Dart experience from his Kshan Tech internship (May–Aug 2024) &mdash; built responsive web pages and tested across Android, Windows, and Linux.`
    },
    {
      id: 'skills_azure',
      patterns: [/\b(azure|cloud|devops|kubernetes|adf|data factory|pipeline|ci[- ]?cd)\b/i],
      respond: () => `Azure stack: DevOps, Kubernetes, Data Factory (ADF), Monitor, Virtual Machines. Built data ingestion pipelines and logging/monitoring frameworks (Spring Boot + SLF4J/LOG4J) at Viridium AI.`
    },
    {
      id: 'skills_ai',
      patterns: [/\b(ai|ml|machine learning|llm|claude|chatgpt|midjourney|firefly|generative)\b/i],
      respond: () => `AI-augmented workflows are part of his daily work. At BroadAxis he integrates Midjourney and Adobe Firefly into production. Uses Claude Code daily. Academic background includes ML (random forest, linear regression) and AI/ML cybersecurity research at UTA.`
    },
    {
      id: 'experience_overall',
      patterns: [/\b(experience|background|career|history|roles?|previous|past job|work history|where (has|did) he work)\b/i],
      respond: () => `Aryan has worked at <strong>4 companies</strong>:<br>${EXPERIENCE.map(e => `• <strong>${e.co}</strong> &mdash; ${e.role} <em>(${e.when})</em>`).join('<br>')}<br>Ask about any specific one for details.`
    },
    {
      id: 'experience_broadaxis',
      patterns: [/\b(broadaxis|current(ly)?|present|now|latest|today)\b/i],
      respond: () => {
        const e = EXPERIENCE[0];
        return `<strong>${e.co}</strong> &mdash; ${e.role} (${e.when}):<br>${e.bullets.map(b => `→ ${b}`).join('<br>')}`;
      }
    },
    {
      id: 'experience_uta',
      patterns: [/\b(uta|arlington|university|cybersecurity|research|guizani)\b/i],
      respond: () => {
        const e = EXPERIENCE[1];
        return `<strong>${e.co}</strong> &mdash; ${e.role} (${e.when}):<br>${e.bullets.map(b => `→ ${b}`).join('<br>')}`;
      }
    },
    {
      id: 'experience_kshan',
      patterns: [/\b(kshan|pune|india|intern)\b/i],
      respond: () => {
        const e = EXPERIENCE[2];
        return `<strong>${e.co}</strong> (Pune, India) &mdash; ${e.role} (${e.when}):<br>${e.bullets.map(b => `→ ${b}`).join('<br>')}`;
      }
    },
    {
      id: 'experience_viridium',
      patterns: [/\b(viridium|seattle)\b/i],
      respond: () => {
        const e = EXPERIENCE[3];
        return `<strong>${e.co}</strong> (Seattle, WA) &mdash; ${e.role} (${e.when}):<br>${e.bullets.map(b => `→ ${b}`).join('<br>')}`;
      }
    },
    {
      id: 'projects',
      patterns: [/\b(projects?|portfolio|side projects|built|made|created|showcase|demo)\b/i],
      respond: () => `Featured projects (more on <a href="${ABOUT.github}" target="_blank" rel="noopener">GitHub</a>):<br>${PROJECTS.map(p => `• <a href="${p.repo}" target="_blank" rel="noopener"><strong>${p.name}</strong></a> &mdash; <em>${p.stack}</em>`).join('<br>')}`
    },
    {
      id: 'education',
      patterns: [/\b(education|school|college|university|degree|major|study|gpa|graduated|graduate)\b/i],
      respond: () => `🎓 ${ABOUT.education}`
    },
    {
      id: 'hire_status',
      patterns: [/\b(hire|hiring|available|open|opportunit(y|ies)|interview|recruit|recruiter|join|onboard|start date)\b/i],
      respond: () => `✅ ${ABOUT.available} Response time: ${ABOUT.responseSLA}.<br><br>Fastest path → <a href="${ABOUT.phoneHref}">call ${ABOUT.phone}</a> or email <a href="mailto:${ABOUT.email}">${ABOUT.email}</a>.`
    },
    {
      id: 'salary',
      patterns: [/\b(salary|comp|compensation|pay|rate|expectation|how much|cost)\b/i],
      respond: () => `That's a conversation he prefers to have over a quick call &mdash; <a href="${ABOUT.phoneHref}">${ABOUT.phone}</a> or <a href="mailto:${ABOUT.email}">${ABOUT.email}</a>.`
    },
    {
      id: 'who',
      patterns: [/\b(who (is|are) (he|aryan|you)|tell me about|introduce|about (him|aryan))\b/i],
      respond: () => `<strong>${ABOUT.name}</strong> &mdash; ${ABOUT.role}. ${ABOUT.title}, based in ${ABOUT.location}. ${ABOUT.education} ${ABOUT.available}`
    },
    {
      id: 'thisbot',
      patterns: [/\b(who are you|what are you|are you (a )?bot|are you (an )?ai|chatbot|how do you work)\b/i],
      respond: () => `I'm a small JavaScript widget built into Aryan's portfolio &mdash; pure client-side, no backend, no API calls. I match your question against a knowledge base extracted from his resume. Ask me anything about his work.`
    }
  ];

  /* ─── matcher ─── */
  function respond(query) {
    const q = (query || '').trim();
    if (!q) return null;
    for (const intent of INTENTS) {
      for (const pat of intent.patterns) {
        if (pat.test(q)) return intent.respond();
      }
    }
    /* fallback: keyword scoring */
    const tokens = q.toLowerCase().match(/[a-z][a-z0-9+#.\-]+/g) || [];
    const candidates = INTENTS.map(i => {
      const score = tokens.reduce((s, t) =>
        s + i.patterns.reduce((p, pat) => p + (pat.source.includes(t) ? 1 : 0), 0), 0);
      return { intent: i, score };
    }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    if (candidates.length) return candidates[0].intent.respond();
    return null;
  }

  function fallback() {
    return `I don't have a canned answer for that &mdash; but here are quick links:<br>
• <a href="mailto:${ABOUT.email}">Email</a> · <a href="${ABOUT.phoneHref}">Call</a> · <a href="${ABOUT.linkedin}" target="_blank" rel="noopener">LinkedIn</a> · <a href="${ABOUT.github}" target="_blank" rel="noopener">GitHub</a><br>
• <a href="resume.html">Resume + ATS keywords</a><br>
• <a href="contact.html">Contact page</a><br>
Or try asking about: <em>experience, skills, projects, location, availability, education</em>.`;
  }

  /* ─── DOM ─── */
  const css = `
.faq-bubble{position:fixed;right:24px;bottom:24px;width:60px;height:60px;border-radius:50%;background:#0a0a0a;border:1.5px solid #39FF14;color:#39FF14;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;cursor:pointer;z-index:9990;display:grid;place-items:center;box-shadow:0 0 0 0 rgba(57,255,20,.45),0 8px 32px rgba(0,0,0,.45);animation:faqPulse 2.6s ease-in-out infinite;transition:transform .3s ease,box-shadow .3s ease}
.faq-bubble:hover{transform:scale(1.08);box-shadow:0 0 0 6px rgba(57,255,20,.18),0 8px 32px rgba(0,0,0,.5)}
@keyframes faqPulse{0%,100%{box-shadow:0 0 0 0 rgba(57,255,20,.5),0 8px 32px rgba(0,0,0,.45)}50%{box-shadow:0 0 0 12px rgba(57,255,20,0),0 8px 32px rgba(0,0,0,.45)}}
@media(prefers-reduced-motion:reduce){.faq-bubble{animation:none}}
.faq-bubble svg{width:24px;height:24px;stroke:#39FF14;fill:none;stroke-width:1.5}
.faq-panel{position:fixed;right:24px;bottom:96px;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 130px);background:#0a0a0a;border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 80px rgba(0,0,0,.65),0 0 0 1px rgba(57,255,20,.15);z-index:9989;display:flex;flex-direction:column;font-family:'Inter',system-ui,sans-serif;color:#f5f5f5;font-size:13.5px;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .25s ease,transform .25s cubic-bezier(.65,0,.35,1)}
.faq-panel.is-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.faq-head{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;gap:10px}
.faq-head-title{font-family:'Fraunces',serif;font-size:16px;font-weight:500;display:flex;align-items:center;gap:10px}
.faq-head-title .dot{width:8px;height:8px;border-radius:50%;background:#39FF14;box-shadow:0 0 10px rgba(57,255,20,.6);animation:faqDotPulse 2s ease-in-out infinite}
@keyframes faqDotPulse{0%,100%{opacity:1}50%{opacity:.45}}
.faq-head-meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#6b6b6b;letter-spacing:.1em;text-transform:uppercase}
.faq-close{background:none;border:none;color:#a3a3a3;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1}
.faq-close:hover{color:#39FF14}
.faq-body{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
.faq-body::-webkit-scrollbar{width:5px}
.faq-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:100px}
.faq-msg{padding:10px 14px;border-radius:12px;line-height:1.55;max-width:88%;word-wrap:break-word}
.faq-msg.bot{background:#141414;border:1px solid rgba(255,255,255,.08);align-self:flex-start;border-top-left-radius:4px}
.faq-msg.user{background:#39FF14;color:#0a0a0a;align-self:flex-end;border-top-right-radius:4px;font-weight:500}
.faq-msg a{color:#39FF14;text-decoration:underline;text-underline-offset:2px}
.faq-msg.user a{color:#0a0a0a}
.faq-msg em{color:#9fe8a0;font-style:italic}
.faq-msg.user em{color:#0a0a0a}
.faq-suggest{display:flex;flex-wrap:wrap;gap:6px;padding:0 20px 14px}
.faq-suggest button{background:transparent;border:1px solid rgba(255,255,255,.18);color:#a3a3a3;font-family:'JetBrains Mono',monospace;font-size:11px;padding:6px 11px;border-radius:100px;cursor:pointer;transition:all .2s}
.faq-suggest button:hover{border-color:#39FF14;color:#39FF14}
.faq-form{display:flex;border-top:1px solid rgba(255,255,255,.12);padding:14px 20px;gap:10px}
.faq-input{flex:1;background:transparent;border:none;color:#f5f5f5;font-family:inherit;font-size:13.5px;outline:none}
.faq-input::placeholder{color:#6b6b6b}
.faq-send{background:transparent;border:1px solid rgba(255,255,255,.22);color:#a3a3a3;border-radius:100px;padding:7px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.08em;cursor:pointer;transition:all .2s}
.faq-send:hover,.faq-send:focus{border-color:#39FF14;color:#39FF14}
@media(max-width:480px){.faq-panel{right:8px;left:8px;width:auto;bottom:84px}.faq-bubble{right:16px;bottom:16px}}`;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const bubble = document.createElement('button');
  bubble.className = 'faq-bubble';
  bubble.setAttribute('aria-label', 'Open FAQ chat');
  bubble.innerHTML = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const panel = document.createElement('div');
  panel.className = 'faq-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Aryan FAQ assistant');
  panel.innerHTML = `
    <div class="faq-head">
      <div class="faq-head-title"><span class="dot"></span>Ask about Aryan</div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="faq-head-meta">Beta</span>
        <button class="faq-close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="faq-body" id="faq-body"></div>
    <div class="faq-suggest" id="faq-suggest">
      <button data-q="What's his email?">Email</button>
      <button data-q="What's his phone number?">Phone</button>
      <button data-q="What are his skills?">Skills</button>
      <button data-q="What's his current job?">Current role</button>
      <button data-q="Show me his projects">Projects</button>
      <button data-q="Is he available for hire?">Hiring</button>
      <button data-q="ATS keywords">ATS keywords</button>
    </div>
    <form class="faq-form" id="faq-form">
      <input class="faq-input" id="faq-input" type="text" placeholder="Ask anything…" autocomplete="off" />
      <button class="faq-send" type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const body = panel.querySelector('#faq-body');
  const input = panel.querySelector('#faq-input');
  const form = panel.querySelector('#faq-form');
  const suggest = panel.querySelector('#faq-suggest');
  const closeBtn = panel.querySelector('.faq-close');

  function append(role, html) {
    const m = document.createElement('div');
    m.className = `faq-msg ${role}`;
    m.innerHTML = html;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
  }

  function ask(q) {
    if (!q) return;
    append('user', escape(q));
    setTimeout(() => {
      const reply = respond(q) || fallback();
      append('bot', reply);
    }, 240);
  }

  function escape(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function open() {
    panel.classList.add('is-open');
    setTimeout(() => input.focus(), 250);
    if (!body.children.length) {
      append('bot', `Hi 👋 I'm Aryan's portfolio assistant. Ask me anything &mdash; <em>experience</em>, <em>skills</em>, <em>contact info</em>, <em>projects</em>, <em>availability</em>. Try a chip below to start.`);
    }
  }
  function close() { panel.classList.remove('is-open'); }
  function toggle() { panel.classList.contains('is-open') ? close() : open(); }

  bubble.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    ask(q);
    input.value = '';
  });
  suggest.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-q]');
    if (btn) ask(btn.dataset.q);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
  });
})();
