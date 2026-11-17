/* Miró Joiers — interacciones */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;

  /* ---------- Cabecera clara u oscura según lo que hay debajo ---------- */
  const first = $('main > *');
  if (first && (first.matches('.band--light') || first.matches('.pdp'))) body.classList.add('top-light');

  /* ---------- Scroll suave (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const t = a.getAttribute('href'); if (t.length < 2) return;
      const el = $(t); if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: -80 });
    }));
  }
  const lock = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); };

  /* ---------- Cabecera ---------- */
  const hdr = $('[data-hdr]');
  const wa = $('.wa-float');
  let lastY = scrollY;
  const onHeader = () => {
    const y = scrollY;
    hdr.classList.toggle('is-solid', y > 30);
    hdr.classList.toggle('is-hidden', y > 500 && y > lastY + 2 && !body.classList.contains('menu-open'));
    if (y < lastY - 2) hdr.classList.remove('is-hidden');
    wa && wa.classList.toggle('is-on', y > 600);
    lastY = y;
  };

  /* ---------- Desplegable de joyería ---------- */
  const megaBtn = $('[data-mega-btn]');
  const mega = $('[data-mega]');
  const scrim = document.createElement('div'); scrim.className = 'mega-scrim'; body.append(scrim);
  let megaTimer, megaOpenedAt = 0;
  const setMega = (open) => {
    clearTimeout(megaTimer);
    if (!mega) return;
    if (open && !mega.classList.contains('is-open')) megaOpenedAt = Date.now();
    if (open) mega.hidden = false;
    requestAnimationFrame(() => {
      mega.classList.toggle('is-open', open);
      hdr.classList.toggle('mega-open', open);
      scrim.classList.toggle('is-on', open);
      megaBtn.setAttribute('aria-expanded', open);
    });
    if (!open) megaTimer = setTimeout(() => { if (!mega.classList.contains('is-open')) mega.hidden = true; }, 700);
  };
  if (megaBtn) {
    // Con ratón el hover ya lo abre: un clic inmediato no debe cerrarlo
    megaBtn.addEventListener('click', () => {
      const open = mega.classList.contains('is-open');
      if (open && Date.now() - megaOpenedAt < 600) return;
      setMega(!open);
    });
    if (finePointer) {
      megaBtn.addEventListener('mouseenter', () => setMega(true));
      hdr.addEventListener('mouseleave', () => { megaTimer = setTimeout(() => setMega(false), 180); });
      hdr.addEventListener('mouseenter', () => clearTimeout(megaTimer));
    }
    scrim.addEventListener('click', () => setMega(false));
    $$('[data-mega-i]', mega).forEach((a) => {
      const show = () => $$('[data-mega-img]', mega).forEach((im) => im.classList.toggle('is-on', im.dataset.megaImg === a.dataset.megaI));
      a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
    });
    $$('.nav--l a, .nav--r a').forEach((a) => a.addEventListener('mouseenter', () => { megaTimer = setTimeout(() => setMega(false), 120); }));
  }

  /* ---------- Menú móvil ---------- */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    lock(open);
    if (open) menu.hidden = false;
    else setTimeout(() => { if (!body.classList.contains('menu-open')) menu.hidden = true; }, 800);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Buscador ---------- */
  const search = $('[data-search]');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  let index = null;
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let indexReq = null;
  const loadIndex = () => indexReq || (indexReq = fetch('/miro-joiers/search.json').then((r) => r.json()).then((j) => { index = j; render(input.value); }).catch(() => { index = []; }));
  // Precarga en segundo plano para que la búsqueda sea instantánea
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => loadIndex());
  const render = (q) => {
    if (!index) { if (q.trim()) results.innerHTML = '<li class="search__empty">Buscando…</li>'; loadIndex(); return; }
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) { results.innerHTML = ''; return; }
    const hits = index.map((it) => {
      const t = norm(it.t), s = norm(it.s);
      let score = 0;
      for (const w of terms) { if (t.includes(w)) score += 3; else if (s.includes(w)) score += 1; else return null; }
      return { it, score: score + (it.k === 'Pieza' ? 0.5 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 18);
    results.innerHTML = hits.length
      ? hits.map(({ it }) => `<li><a href="${it.u}">${it.i ? `<img src="${it.i}" alt="" loading="lazy">` : ''}<span><small>${it.k}</small>${it.t}</span></a></li>`).join('')
      : `<li class="search__empty">No hemos encontrado nada con «${q.replace(/[<>&]/g, '')}». Prueba con otra palabra o <a href="/contacto/">pregúntanos</a>.</li>`;
  };
  const setSearch = async (open) => {
    if (open) {
      setMega(false);
      search.hidden = false; requestAnimationFrame(() => search.classList.add('is-open'));
      lock(true); setTimeout(() => input.focus(), 50);
      loadIndex();
    } else {
      search.classList.remove('is-open'); lock(false);
      setTimeout(() => { if (!search.classList.contains('is-open')) search.hidden = true; }, 400);
    }
  };
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => setSearch(true)));
  $('[data-search-close]').addEventListener('click', () => setSearch(false));
  search.addEventListener('click', (e) => { if (e.target === search) setSearch(false); });
  input.addEventListener('input', () => render(input.value));
  $$('[data-search-suggest]').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; render(input.value); input.focus(); }));

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (search.classList.contains('is-open')) setSearch(false);
      else if (body.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
      else if (mega && mega.classList.contains('is-open')) { setMega(false); megaBtn.focus(); }
    }
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); setSearch(true); }
  });

  /* ---------- Títulos palabra a palabra ---------- */
  const splitWords = (el, cls, wrap) => {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.append(document.createTextNode(' ')); return; }
          frag.append(wrap(p, i++));
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  };
  $$('[data-split]').forEach((el) => splitWords(el, 'split-w', (p, i) => {
    const w = document.createElement('span'); w.className = 'split-w';
    const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--i', i);
    w.append(s); return w;
  }));
  const words = $$('[data-words]').map((el) => {
    splitWords(el, 'w', (p) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; return s; });
    return { el, w: $$('.w', el) };
  });
  const onWords = () => words.forEach(({ el, w }) => {
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.9 - r.top) / (r.height + innerHeight * 0.3)));
    const n = Math.round(p * w.length);
    w.forEach((s, i) => s.classList.toggle('on', i < n));
  });

  /* ---------- Aparición al entrar en pantalla ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('[data-reveal], [data-reveal-img], [data-split]').forEach((el) => {
    const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches('[data-reveal]')) : [];
    const idx = sib.indexOf(el);
    if (idx > 0) el.style.setProperty('--d', `${Math.min(idx, 5) * 0.08}s`);
    io.observe(el);
  });
  // Las piezas entran escalonadas por fila
  const pio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-entering'); pio.unobserve(e.target); }
  }), { rootMargin: '0px 0px -5% 0px' });
  if (!reduce) $$('.pieces .piece').forEach((el, i) => { el.style.animationDelay = `${(i % 4) * 0.07}s`; el.style.opacity = '0'; pio.observe(el); el.addEventListener('animationend', () => { el.style.opacity = ''; }, { once: true }); });

  /* ---------- Parallax ---------- */
  const para = reduce ? [] : $$('[data-parallax]').map((el) => ({ el, k: parseFloat(el.dataset.parallax) || 0.1 }));
  const onParallax = () => para.forEach(({ el, k }) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -300 || r.top > innerHeight + 300) return;
    const c = r.top + r.height / 2 - innerHeight / 2;
    el.style.transform = `translate3d(0, ${(-c * k).toFixed(1)}px, 0)`;
  });

  /* ---------- Galería horizontal fijada ---------- */
  const hs = $$('[data-hscroll]').map((sec) => ({ sec, track: $('[data-track]', sec), sticky: $('.hscroll__sticky', sec) }));
  const desktop = matchMedia('(min-width: 901px)');
  const sizeHs = () => hs.forEach((h) => {
    if (!desktop.matches || reduce) { h.sec.style.height = ''; h.track.style.transform = ''; h.dist = 0; return; }
    h.dist = Math.max(0, h.track.scrollWidth - innerWidth);
    h.sec.style.height = `${h.sticky.offsetHeight + h.dist}px`;
  });
  const onHs = () => hs.forEach((h) => {
    if (!h.dist) return;
    const r = h.sec.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (h.sec.offsetHeight - innerHeight)));
    h.track.style.transform = `translate3d(${(-p * h.dist).toFixed(1)}px, 0, 0)`;
  });

  /* ---------- Bucle de scroll ---------- */
  let ticking = false;
  const frame = () => { onHeader(); onParallax(); onHs(); onWords(); ticking = false; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => { sizeHs(); frame(); });
  addEventListener('load', () => { sizeHs(); frame(); lenis && lenis.resize(); });
  sizeHs(); frame();

  /* ---------- Filtros del catálogo ---------- */
  $$('[data-filters]').forEach((bar) => {
    const grid = bar.nextElementSibling;
    const items = $$('.piece', grid);
    const count = $('[data-filter-count]', bar);
    $$('[data-filter]', bar).forEach((chip) => chip.addEventListener('click', () => {
      $$('[data-filter]', bar).forEach((c) => { c.classList.toggle('is-on', c === chip); c.setAttribute('aria-pressed', c === chip); });
      const [type, val] = chip.dataset.filter.split(':');
      let n = 0;
      items.forEach((it) => {
        const ok = type === '*' || (type === 'cat' && it.dataset.cats.split(' ').includes(val)) || (type === 'metal' && it.dataset.metal === val);
        it.classList.toggle('is-hidden', !ok);
        if (ok) { n++; it.classList.remove('is-entering'); void it.offsetWidth; it.classList.add('is-entering'); }
      });
      count.textContent = `${n} ${n === 1 ? 'pieza' : 'piezas'}`;
      lenis && lenis.resize();
    }));
  });

  /* ---------- Vídeos ---------- */
  if (reduce) $$('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) {
      const s = $('source[data-src]', v);
      if (s) { s.src = s.dataset.src; s.removeAttribute('data-src'); v.load(); }
      if (!reduce) v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: '200px 0px' });
  $$('video').forEach((v) => vio.observe(v));

  /* ---------- Cursor «Ver» ---------- */
  const cursor = $('[data-cursor]');
  if (cursor && finePointer && !reduce) {
    addEventListener('mousemove', (e) => { cursor.style.setProperty('--cx', e.clientX + 'px'); cursor.style.setProperty('--cy', e.clientY + 'px'); }, { passive: true });
    document.addEventListener('mouseover', (e) => cursor.classList.toggle('is-on', !!e.target.closest('[data-cursor-hover]')));
  }

  /* ---------- Zoom de la ficha ---------- */
  const zoom = $('[data-zoom]');
  if (zoom && finePointer) {
    zoom.addEventListener('mousemove', (e) => {
      const r = zoom.getBoundingClientRect();
      zoom.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%');
      zoom.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
    zoom.addEventListener('mouseenter', () => zoom.classList.add('is-zoom'));
    zoom.addEventListener('mouseleave', () => zoom.classList.remove('is-zoom'));
  }

  /* ---------- Formularios ---------- */
  const params = new URLSearchParams(location.search);
  $$('[data-form]').forEach((form) => {
    const status = $('.form__status', form);
    $('[name="t"]', form).value = Date.now();
    const hid = (n, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; form.append(i); };
    hid('pagina', location.pathname);
    const pieza = params.get('pieza');
    if (pieza) { hid('pieza', pieza); const ta = $('[name="mensaje"]', form); if (ta && !ta.value) ta.value = `Me gustaría ver la pieza ${pieza}.`; }
    const motivo = params.get('motivo');
    if (motivo) { const r = $$('[name="motivo"]', form).find((x) => x.value === motivo); if (r) r.checked = true; }
    const d = $('[data-min-today]', form); if (d) d.min = new Date().toISOString().slice(0, 10);

    const check = () => {
      let ok = true;
      const radios = $$('[name="motivo"]', form);
      if (radios.length) {
        const bad = !radios.some((r) => r.checked);
        radios[0].closest('.field').classList.toggle('is-error', bad);
        if (bad) { radios[0].focus(); ok = false; }
      }
      $$('[required]:not([type="radio"])', form).forEach((f) => {
        const bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
        (f.closest('.field') || f.closest('.check')).classList.toggle('is-error', bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) { status.className = 'form__status err'; status.textContent = 'Revisa los campos marcados.'; }
      return ok;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!check()) return;
      const btn = $('[type="submit"]', form); btn.disabled = true;
      status.className = 'form__status'; status.textContent = 'Enviando…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json();
        status.className = 'form__status ' + (data.ok ? 'ok' : 'err');
        status.textContent = data.msg;
        if (data.ok) form.reset();
      } catch {
        status.className = 'form__status err';
        status.textContent = 'No se ha podido enviar. Prueba con «Por WhatsApp» o llámanos al 610 464 581.';
      } finally { btn.disabled = false; }
    });
    $('[data-wa-send]', form).addEventListener('click', () => {
      const v = (n) => { const f = $(`[name="${n}"]`, form); return f ? (f.type === 'radio' ? ($(`[name="${n}"]:checked`, form) || {}).value || '' : f.value.trim()) : ''; };
      const lines = [`Hola, soy ${v('nombre') || '…'}.`];
      if (v('motivo')) lines.push(`Me gustaría pedir cita para: ${v('motivo')}.`);
      if (v('fecha') || v('franja')) lines.push(`Preferencia: ${[v('fecha'), v('franja')].filter(Boolean).join(', ')}.`);
      if (v('mensaje')) lines.push(v('mensaje'));
      window.open(`https://wa.me/34610464581?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    });
  });
})();
