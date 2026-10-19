/* =====================================================================
   PORTFOLIO INTERACTIONS
   The "playful" layer. Each feature is a small self-contained block and
   only switches on when the matching HTML attribute exists, so pages
   can use as many or as few as they like.

     data-split      letters hop on hover
     data-drag       draggable, throwable stickers
     data-tilt       3D tilt toward the cursor
     data-magnetic   element leans toward the cursor
     data-cursor     text shown inside the custom cursor
     data-reveal     fades up when scrolled into view
     data-marquee    endless ticker that reacts to scroll speed
     data-filter     Play page chips that filter items by data-tags
     data-liquid     footer wordmark that wobbles as you move
     data-pt         label shown during the page transition
     data-count      number counts up when scrolled into view
     data-carousel   drag/scroll strip with arrow buttons + progress
     data-lightbox   click an image to view it large
     data-compare    before/after wipe that follows the pointer
     data-over       header stays transparent over the green hero
     data-glow       soft light follows the cursor
     data-dark       cursor turns light over this section
     data-copy       click copies text and shows a toast
     data-clock      live local time (set the zone with data-tz)
     data-year       current year
   ===================================================================== */
(() => {
  // Motion level: the Settings panel stores "full", "calm" or "still" on
  // <html data-motion>. With no choice saved, follow the system setting.
  // Checked live, so changing it in Settings takes effect immediately.
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const motionLevel = () => document.documentElement.dataset.motion || (motionQuery.matches ? 'calm' : 'full');
  const calm = () => motionLevel() !== 'full';
  const finePointer  = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;


  /* ---------- Year + clock ------------------------------------------ */
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  $$('[data-clock]').forEach(el => {
    const city = el.textContent.trim();
    const fmt = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.tz });
    const tick = () => (el.textContent = [city, fmt.format(new Date())].filter(Boolean).join(' '));
    tick();
    setInterval(tick, 15000);
  });


  /* ---------- Split letters that hop on hover ----------------------- */
  // Words stay together (so lines still wrap naturally); each letter gets
  // its own span with a random tilt.
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(word =>
      `<span style="display:inline-block;white-space:nowrap" aria-hidden="true">${
        [...word].map(ch => `<span class="char">${ch}</span>`).join('')
      }</span>`
    ).join(' ');
  });

  {
    // One listener for the whole page (works for every letter, in every
    // tab panel). A letter hops once, then waits until the pointer has
    // left it before it can hop again, so it never loops under a resting
    // cursor.
    const hop = ch => {
      if (calm() || ch.classList.contains('hop') || ch.dataset.rest) return;
      ch.style.setProperty('--r', `${(Math.random() * 30 - 15).toFixed(1)}deg`);
      ch.classList.add('hop');
      ch.dataset.rest = '1';
    };
    document.addEventListener('pointerover', e => {
      const ch = e.target.closest && e.target.closest('.char');
      if (ch) hop(ch);
    });
    document.addEventListener('pointerout', e => {
      const ch = e.target.closest && e.target.closest('.char');
      if (ch && !ch.contains(e.relatedTarget)) delete ch.dataset.rest;
    });
    document.addEventListener('animationend', e => {
      if (e.animationName === 'hop') e.target.classList.remove('hop');
    });
  }


  /* ---------- Hero tabs --------------------------------------------- */
  // Clicking a tab swaps the big headline: letters rise in one by one and
  // the handwritten note rewrites itself. Arrow keys move between tabs.
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const scribble = document.querySelector('.hero-scribble');

    // Number every letter in each panel so the rise can be staggered.
    tabs.forEach(tab => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      $$('.char', panel).forEach((ch, i) => ch.style.setProperty('--i', i));
    });

    const select = (tab, focus) => {
      if (tab.getAttribute('aria-selected') === 'true') return;
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.classList.toggle('is-active', on);
        panel.classList.remove('is-entering');
        clearTimeout(panel._enterTimer);
        if (on && !calm()) {
          void panel.offsetWidth; // restart the animation
          panel.classList.add('is-entering');
          // Drop the class once every letter has risen, so hover hops work again.
          const letters = panel.querySelectorAll('.char').length;
          panel._enterTimer = setTimeout(() => panel.classList.remove('is-entering'), letters * 12 + 750);
        }
      });
      if (scribble && tab.dataset.scribble) {
        scribble.textContent = tab.dataset.scribble;
        scribble.classList.remove('is-writing');
        void scribble.offsetWidth;
        if (!calm()) scribble.classList.add('is-writing');
      }
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home') select(tabs[0], true);
        else if (e.key === 'End') select(tabs[tabs.length - 1], true);
        else if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
      });
    });

    if (scribble && !calm()) scribble.classList.add('is-writing'); // write once on load
  });


  /* ---------- Header over a dark hero ------------------------------- */
  // [data-over] headers stay transparent while the green hero is behind
  // them, then switch to the normal frosted header.
  const overHeader = document.querySelector('[data-over]');
  const darkHero = document.querySelector('.cs-hero');
  if (overHeader && darkHero) {
    const check = () => {
      overHeader.classList.toggle('is-moved', scrollY > 8);
      overHeader.classList.toggle('is-scrolled', darkHero.getBoundingClientRect().bottom <= overHeader.offsetHeight);
    };
    addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------- Cursor glow ------------------------------------------- */
  // A soft light in [data-glow] sections drifts toward the cursor.
  if (finePointer) {
    $$('[data-glow]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (calm()) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--gx', `${e.clientX - r.left}px`);
        el.style.setProperty('--gy', `${e.clientY - r.top}px`);
      });
    });
  }


  /* ---------- Custom cursor ----------------------------------------- */
  // Retro cursor: one big arrow (pointed head + short straight tail) in
  // speckled grey with a white outline (styles.css, "Retro cursor").
  // It tilts over things you can click, squeezes over stickers, and shows
  // a little pixel tag ("VIEW", "ZOOM"...) over anything with data-cursor.
  if (finePointer) {
    const SIZE = 52;            // on-screen size in px (a normal cursor is ~20)
    const HOT = 4 * SIZE / 40;  // the arrow tip sits at (4, 4) on a 40 x 40 grid
    const ARROW = `<svg class="c-arrow" width="${SIZE}" height="${SIZE}" viewBox="0 0 40 40"
        style="left:${-HOT}px;top:${-HOT}px;transform-origin:${HOT}px ${HOT}px">
      <defs>
        <!-- 4 x 4 speckle tile that gives the grey its textured, retro look -->
        <pattern id="c-speckle" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#9c9c9c"/>
          <rect x="0" y="0" width="1" height="1" fill="#cfcfcf"/>
          <rect x="2" y="1" width="1" height="1" fill="#7a7a7a"/>
          <rect x="1" y="3" width="1" height="1" fill="#c4c4c4"/>
          <rect x="3" y="2" width="1" height="1" fill="#838383"/>
        </pattern>
      </defs>
      <path class="c-body" d="M4 4 24.5 11.8 20.3 16 30.2 25.9 25.9 30.2 16 20.3 11.8 24.5Z"/>
    </svg>`;

    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = ARROW + '<span class="cursor-label"></span>';
    cursor.dataset.state = 'arrow';
    cursor.style.opacity = 0; // hidden until the mouse first moves
    document.body.append(cursor);
    document.documentElement.classList.add('has-cursor');
    const tag = cursor.querySelector('.cursor-label');

    let x = 0, y = 0, queued = false, label = '', trailX = 0, trailY = 0;
    const place = () => { queued = false; cursor.style.transform = `translate(${x}px, ${y}px)`; };

    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return; // mouse, trackpad and pen all count
      x = e.clientX; y = e.clientY;
      cursor.style.opacity = 1;
      if (!queued) { queued = true; requestAnimationFrame(place); }

      // Work out which sprite to show (only touch the DOM when it changes).
      const t = e.target;
      const labelled = t.closest('[data-cursor]');
      const state = t.closest('[data-drag]') ? 'grab'
        : (!labelled && t.closest('a, button, [role="tab"], [data-lightbox]')) ? 'point' : 'arrow';
      if (cursor.dataset.state !== state) cursor.dataset.state = state;
      const next = labelled ? labelled.dataset.cursor : '';
      if (next !== label) {
        label = next;
        tag.textContent = label;
        cursor.classList.toggle('has-label', !!label);
      }

      // Pixel trail
      if (!calm() && Math.hypot(x - trailX, y - trailY) > 22) {
        trailX = x; trailY = y;
        const p = document.createElement('span');
        p.className = 'px-trail';
        p.style.left = `${x + 30}px`; // puffs out from the end of the tail
        p.style.top = `${y + 30}px`;
        p.addEventListener('animationend', () => p.remove());
        document.body.append(p);
      }
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup',   () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => (cursor.style.opacity = 0));
    // Show it as soon as the mouse is over the page, even before it moves.
    document.addEventListener('mouseover', e => {
      if (cursor.style.opacity === '1') return;
      x = e.clientX; y = e.clientY; place();
      cursor.style.opacity = 1;
    });
  }


  /* ---------- Draggable stickers ------------------------------------ */
  // Grab, drag and throw. They glide to a stop and bounce off the edges
  // of their container.
  $$('[data-drag]').forEach(el => {
    const area = el.offsetParent || document.body;
    let x = 0, y = 0, vx = 0, vy = 0, lastX = 0, lastY = 0, dragging = false, raf = 0;
    const baseRot = parseFloat(getComputedStyle(el).getPropertyValue('--rot')) || 0;

    const render = () => {
      el.style.setProperty('--x', `${x}px`);
      el.style.setProperty('--y', `${y}px`);
      el.style.setProperty('--rot', `${baseRot + clamp(vx * 1.5, -25, 25)}deg`);
    };

    // Keep the sticker inside its container; flip velocity when it hits a wall.
    const keepInside = () => {
      const a = area.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.left < a.left)     { x += a.left - r.left;     vx =  Math.abs(vx) * 0.6; }
      if (r.right > a.right)   { x -= r.right - a.right;   vx = -Math.abs(vx) * 0.6; }
      if (r.top < a.top)       { y += a.top - r.top;       vy =  Math.abs(vy) * 0.6; }
      if (r.bottom > a.bottom) { y -= r.bottom - a.bottom; vy = -Math.abs(vy) * 0.6; }
    };

    const glide = () => {
      vx *= 0.92; vy *= 0.92;
      x += vx; y += vy;
      keepInside();
      render();
      if (Math.abs(vx) + Math.abs(vy) > 0.2) raf = requestAnimationFrame(glide);
      else { vx = vy = 0; render(); }
    };

    el.addEventListener('pointerdown', e => {
      cancelAnimationFrame(raf);
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      vx = e.clientX - lastX; vy = e.clientY - lastY;
      x += vx; y += vy;
      lastX = e.clientX; lastY = e.clientY;
      render();
    });
    const drop = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      if (calm()) { vx = vy = 0; render(); return; }
      raf = requestAnimationFrame(glide);
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    // On small screens a sticker's starting spot can poke out; nudge it in.
    requestAnimationFrame(() => { keepInside(); render(); });
  });


  /* ---------- Tilt toward cursor ------------------------------------ */
  if (finePointer) {
    $$('[data-tilt]').forEach(media => {
      const card = media.closest('a') || media;
      card.addEventListener('pointermove', e => {
        if (calm()) return;
        const r = media.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        media.style.setProperty('--ry', `${px * 8}deg`);
        media.style.setProperty('--rx', `${py * -8}deg`);
      });
      card.addEventListener('pointerleave', () => {
        media.style.setProperty('--rx', '0deg');
        media.style.setProperty('--ry', '0deg');
      });
    });
  }


  /* ---------- Scroll hint (home page) ------------------------------- */
  // Fades out once you've scrolled a little; comes back at the very top.
  const scrollHint = document.querySelector('[data-scroll-hint]');
  if (scrollHint) {
    const toggleHint = () => scrollHint.classList.toggle('is-gone', scrollY > 60);
    addEventListener('scroll', toggleHint, { passive: true });
    toggleHint();
  }


  /* ---------- Project stages (home page) ---------------------------- */
  // A project is "in focus" while its panel crosses the middle band of the
  // screen: its screenshot pops up and the tags fly out (styles.css 5f-b).
  // Hover does the same on desktop. With Calm/Still motion, CSS keeps
  // every project in focus, so there's nothing to animate.
  const projects = $$('.project');
  if (projects.length) {
    const focusIO = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.closest('.project').classList.toggle('is-active', entry.isIntersecting));
    }, { rootMargin: '-38% 0px -38% 0px' });
    projects.forEach(p => focusIO.observe(p.querySelector('.project-stage')));
  }


  /* ---------- Magnetic buttons -------------------------------------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (calm()) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${dx * 0.3}px ${dy * 0.4}px`;
      });
      el.addEventListener('pointerleave', () => (el.style.translate = '0 0'));
    });
  }


  /* ---------- Scroll reveal ----------------------------------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));


  /* ---------- Scroll progress + reactive marquee -------------------- */
  const progress = document.createElement('div');
  progress.className = 'progress';
  document.body.prepend(progress);

  const tracks = $$('[data-marquee]');
  tracks.forEach(track => (track.innerHTML += track.innerHTML)); // duplicate for a seamless loop

  let lastScroll = scrollY, velocity = 0, offset = 0, skew = 0;
  (function loop() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--progress', max > 0 ? scrollY / max : 0);

    // Scroll speed feeds the marquee: faster scroll = faster ticker + lean.
    velocity = lerp(velocity, scrollY - lastScroll, 0.1);
    lastScroll = scrollY;

    // Full: speeds up and leans with scroll. Calm: slow, steady drift. Still: stopped.
    const level = motionLevel();
    if (level !== 'still') {
      offset -= level === 'full' ? 0.6 + Math.abs(velocity) * 0.8 : 0.25;
      skew = lerp(skew, level === 'full' ? clamp(velocity * -0.4, -12, 12) : 0, 0.15);
      tracks.forEach(track => {
        const half = track.scrollWidth / 2;
        if (-offset >= half) offset += half;
        track.style.setProperty('--mx', `${offset}px`);
        track.style.setProperty('--skew', `${skew}deg`);
      });
    }
    requestAnimationFrame(loop);
  })();


  /* ---------- Click burst ------------------------------------------- */
  // Clicking empty space pops a little ring of green dots.
  {
    addEventListener('click', e => {
      if (calm()) return;
      if (e.target.closest('a, button, input, textarea, label, [data-drag], [data-lightbox], [data-compare], [data-carousel], .lightbox, .settings')) return;
      const n = 10;
      for (let i = 0; i < n; i++) {
        const dot = document.createElement('span');
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 30 + Math.random() * 30;
        dot.className = 'burst-dot';
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        dot.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        dot.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        dot.addEventListener('animationend', () => dot.remove());
        document.body.append(dot);
      }
    });
  }


  /* ---------- Play filters ------------------------------------------ */
  // Chips filter the masonry grid by data-tags; shown items pop back in.
  $$('[data-filter-group]').forEach(group => {
    const chips = $$('[data-filter]', group);
    const items = $$('[data-tags]');
    chips.forEach(chip => chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
      let n = 0;
      items.forEach(item => {
        const show = filter === 'all' || item.dataset.tags.split(' ').includes(filter);
        item.classList.toggle('is-hidden', !show);
        item.classList.remove('is-shown');
        if (!show) return;
        item.classList.add('is-in'); // skip the scroll reveal
        item.style.setProperty('--d', n++);
        void item.offsetWidth; // restart the pop-in
        if (!calm()) item.classList.add('is-shown');
      });
    }));
  });


  /* ---------- Liquid wordmark (footer) ------------------------------ */
  // Moving across the footer warps the big wordmark through the #liquid
  // SVG filter; the faster you move, the wobblier it gets.
  const wordmark = document.querySelector('[data-liquid]');
  if (wordmark) {
    // Size the wordmark to exactly fill the page width, whatever the text.
    const fit = () => {
      // Measure the text itself (a Range), so short names grow and long ones shrink.
      wordmark.style.fontSize = '100px';
      const range = document.createRange();
      range.selectNodeContents(wordmark);
      const textWidth = range.getBoundingClientRect().width;
      if (!textWidth) return;
      wordmark.style.fontSize = `${Math.min(100 * (wordmark.clientWidth / textWidth) * 0.98, 190)}px`; // capped so a short name stays modest
    };
    fit();
    addEventListener('resize', fit);
    document.fonts && document.fonts.ready.then(fit);
  }
  const disp = document.querySelector('#liquid feDisplacementMap');
  const turb = document.querySelector('#liquid feTurbulence');
  if (wordmark && disp && turb) {
    let amount = 0, target = 0, lastX = null, lastY = 0, t = 0, raf = 0;
    const loop = () => {
      amount += (target - amount) * 0.18;
      target *= 0.9;
      t += 0.02;
      disp.setAttribute('scale', amount.toFixed(2));
      turb.setAttribute('baseFrequency', `${(0.008 + Math.sin(t) * 0.002).toFixed(4)} ${(0.016 + Math.cos(t * 0.8) * 0.004).toFixed(4)}`);
      if (amount < 0.1 && target < 0.1) { disp.setAttribute('scale', 0); raf = 0; return; }
      raf = requestAnimationFrame(loop);
    };
    wordmark.closest('footer').addEventListener('pointermove', e => {
      if (calm()) return;
      if (lastX !== null) target = Math.min(70, target + Math.hypot(e.clientX - lastX, e.clientY - lastY) * 0.6);
      lastX = e.clientX; lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    wordmark.closest('footer').addEventListener('pointerleave', () => (lastX = null));
  }


  /* ---------- Page transitions -------------------------------------- */
  // Clicking a link to another page grows a green circle from the click
  // point with the destination's name; the next page slides it away
  // (see the inline script in each page's <head> and styles.css §7f).
  const root = document.documentElement;
  if (root.classList.contains('pt-enter')) setTimeout(() => root.classList.remove('pt-enter'), 950);
  addEventListener('pageshow', e => {
    if (!e.persisted) return; // coming back via the back button
    root.classList.remove('pt-enter');
    $$('.pt-curtain').forEach(c => c.remove());
  });

  const pageNames = { 'index.html': 'work', 'play.html': 'play', 'about.html': 'about' };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || calm()) return;
    const url = new URL(a.href, location.href);
    const file = url.pathname.split('/').pop() || 'index.html';
    if (url.origin !== location.origin || !/\.html$/.test(file)) return; // résumé PDF, mailto, etc.
    if (url.pathname === location.pathname) return;                    // same page (#anchors)

    e.preventDefault();
    const card = a.closest('.card');
    const label = a.dataset.pt
      || (card && card.querySelector('.card-title') && card.querySelector('.card-title').textContent.trim())
      || pageNames[file] || '';
    try { sessionStorage.setItem('pt', label); } catch (_) { /* storage blocked: still navigate */ }

    const curtain = document.createElement('div');
    curtain.className = 'pt-curtain';
    curtain.style.setProperty('--x', `${e.clientX || innerWidth / 2}px`);
    curtain.style.setProperty('--y', `${e.clientY || innerHeight / 2}px`);
    const word = document.createElement('span');
    word.textContent = label;
    curtain.append(word);
    document.body.append(curtain);

    let gone = false;
    const go = () => { if (!gone) { gone = true; location.href = a.href; } };
    curtain.addEventListener('animationend', ev => { if (ev.target === curtain) go(); });
    setTimeout(go, 700); // in case animations are throttled
  });


  /* ---------- Count-up numbers -------------------------------------- */
  // <strong data-count="34" data-prefix="−" data-suffix="%">−34%</strong>
  // The HTML holds the final value, so it reads fine without JS.
  if (!calm()) {
    const countIO = new IntersectionObserver(entries => {
      entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        countIO.unobserve(el);
        const end = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        const { prefix = '', suffix = '' } = el.dataset;
        const start = performance.now(), dur = 1400;
        (function step(now) {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = prefix + (end * eased).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(el => {
      el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
      countIO.observe(el);
    });
  }


  /* ---------- Carousel ---------------------------------------------- */
  // Native horizontal scroll (works with trackpads and touch), plus
  // arrow buttons, mouse drag-to-throw and a progress bar.
  $$('[data-carousel]').forEach(root => {
    const track = root.querySelector('.carousel-track');
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    const bar = root.querySelector('.carousel-progress span');
    const behavior = calm() ? 'auto' : 'smooth';
    const step = () => {
      const card = track.querySelector('.card');
      return card ? card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 24) : 320;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
      if (bar) bar.style.setProperty('--p', clamp((track.scrollLeft + track.clientWidth) / track.scrollWidth, 0, 1));
    };
    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    // Mouse drag with a little momentum when you let go.
    let down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, vx = 0, raf = 0;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(raf);
      down = true; moved = false;
      startX = lastX = e.clientX; startLeft = track.scrollLeft; vx = 0;
    });
    track.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
      }
      if (!moved) return;
      track.scrollLeft = startLeft - dx;
      vx = e.clientX - lastX; lastX = e.clientX;
    });
    const release = () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      let v = calm() ? 0 : -vx * 1.5;
      (function glide() {
        track.scrollLeft += v;
        v *= 0.92;
        if (Math.abs(v) > 0.5) raf = requestAnimationFrame(glide);
        else track.classList.remove('is-dragging'); // snapping resumes here
      })();
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    // A drag should never count as a click on the card underneath.
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });


  /* ---------- Lightbox ---------------------------------------------- */
  // Click any [data-lightbox] shot to view it large. Arrow keys / buttons
  // move through every shot on the page; Esc or a click outside closes.
  const shots = $$('[data-lightbox]');
  if (shots.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
      <button class="lightbox-btn lightbox-close" aria-label="Close">✕</button>
      <button class="lightbox-btn lightbox-prev" aria-label="Previous image">←</button>
      <button class="lightbox-btn lightbox-next" aria-label="Next image">→</button>
      <div class="lightbox-stage">
        <div class="lightbox-slot"></div>
        <div class="lightbox-caption"><span class="lightbox-text"></span><span class="label lightbox-count"></span></div>
      </div>`;
    document.body.append(lb);
    const slot = lb.querySelector('.lightbox-slot');
    const text = lb.querySelector('.lightbox-text');
    const count = lb.querySelector('.lightbox-count');
    let index = 0, lastFocus = null, list = shots;

    const show = i => {
      index = (i + list.length) % list.length;
      const shot = list[index];
      const media = shot.querySelector('.shot-media').cloneNode(true);
      media.style.setProperty('--ratio', getComputedStyle(shot).getPropertyValue('--ratio'));
      slot.replaceChildren(media);
      const cap = shot.querySelector('figcaption');
      text.textContent = cap ? cap.textContent.trim() : '';
      count.textContent = `${index + 1} / ${list.length}`;
    };
    const open = shot => {
      lastFocus = document.activeElement;
      list = shots.filter(s => !s.classList.contains('is-hidden')); // skip filtered-out items
      show(list.indexOf(shot));
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox-close').focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      lastFocus && lastFocus.focus();
    };

    shots.forEach(shot => {
      shot.tabIndex = 0;
      shot.setAttribute('role', 'button');
      shot.addEventListener('click', () => open(shot));
      shot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(shot); } });
    });
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
    lb.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }


  /* ---------- Before / After comparison ----------------------------- */
  // The divider follows the pointer across the picture: moving from right
  // to left wipes the After image in. Leaving the picture eases back to
  // Before. Touch: drag. Keyboard: arrow keys (Home/End jump to ends).
  $$('[data-compare]').forEach(el => {
    const media = el.querySelector('.shot-media');
    let split = 100;
    const set = (pct, settle) => {
      split = clamp(pct, 0, 100);
      el.classList.toggle('is-settling', !!settle && !calm());
      el.style.setProperty('--split', `${split}%`);
      el.setAttribute('aria-valuenow', Math.round(100 - split)); // how much After shows
    };
    const fromPointer = e => {
      const r = media.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    media.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && !e.buttons) return; // touch: only while dragging
      fromPointer(e);
    });
    media.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') fromPointer(e); });
    media.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') set(100, true); });
    el.addEventListener('keydown', e => {
      const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowLeft') set(split - step);
      else if (e.key === 'ArrowRight') set(split + step);
      else if (e.key === 'Home') set(0, true);
      else if (e.key === 'End') set(100, true);
      else return;
      e.preventDefault();
    });
    el.addEventListener('transitionend', () => el.classList.remove('is-settling'));
  });


  /* ---------- Copy to clipboard + toast ----------------------------- */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2000);
  };

  $$('[data-copy]').forEach(el => {
    el.addEventListener('click', async e => {
      if (!navigator.clipboard) return; // fall back to the normal mailto link
      e.preventDefault();
      await navigator.clipboard.writeText(el.dataset.copy);
      showToast('Email copied ✓');
    });
  });


  /* ---------- Settings (accessibility) ------------------------------ */
  // Opened by the "settings" pill in the header. Choices are saved in this
  // browser (localStorage) and applied as attributes on <html>, which
  // styles.css reacts to. The inline script in each page's <head> applies
  // them before the page paints, so there's no flash.
  //   data-theme    light | dark             (absent = follow the system)
  //   data-motion   full | calm | still      (absent = follow the system)
  //   data-text     large | larger           (absent = default size)
  //   data-contrast high
  //   data-cursor   off                      (use the normal system cursor)
  //   narration     reads text aloud on click/focus (not stored on <html>)
  const PREFS_KEY = 'site-prefs';
  const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (_) { return {}; } };
  const savePrefs = p => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) { /* private mode: still works for this visit */ } };
  let prefs = loadPrefs();

  const applyPrefs = () => {
    const html = document.documentElement;
    const set = (attr, value) => value ? html.setAttribute(attr, value) : html.removeAttribute(attr);
    set('data-theme', prefs.theme && prefs.theme !== 'auto' ? prefs.theme : '');
    set('data-motion', prefs.motion);
    set('data-text', prefs.text && prefs.text !== 'default' ? prefs.text : '');
    set('data-contrast', prefs.contrast ? 'high' : '');
    set('data-cursor', prefs.cursor === false ? 'off' : '');
    if (!prefs.narration) stopSpeaking();
    dispatchEvent(new Event('resize')); // re-fit the wordmark etc. after text size changes
  };

  // --- Narration (Web Speech API) ---
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let speakingEl = null, queue = [];
  const textOf = el => (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim();
  const mark = el => { speakingEl && speakingEl.classList.remove('is-speaking'); speakingEl = el; el && el.classList.add('is-speaking'); };
  function stopSpeaking() {
    queue = [];
    if (synth) synth.cancel();
    mark(null);
    readBtn && (readBtn.textContent = 'Read this page aloud');
  }
  const speak = (el, onDone) => {
    const text = textOf(el);
    if (!synth || !text) { onDone && onDone(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.onend = u.onerror = () => { if (speakingEl === el) mark(null); onDone && onDone(); };
    mark(el);
    synth.speak(u);
  };
  const speakOne = el => { stopSpeaking(); speak(el); };
  const readPage = () => {
    stopSpeaking();
    const blocks = $$('main h1, main h2, main h3, main p, main li, main figcaption, main blockquote, main dt, main dd')
      .filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' || el.matches('h1.visually-hidden'))
      .filter((el, _, all) => !all.some(other => other !== el && other.contains(el)));
    queue = blocks;
    readBtn.textContent = 'Stop reading';
    const next = () => { const el = queue.shift(); if (el) { el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); speak(el, next); } else stopSpeaking(); };
    next();
  };
  const READABLE = 'h1, h2, h3, p, li, figcaption, blockquote, dt, dd, a, button, [role="tab"], .card-title';
  document.addEventListener('focusin', e => {
    if (!prefs.narration || e.target.closest('.settings')) return;
    const el = e.target.closest(READABLE);
    if (el) speakOne(el);
  });
  document.addEventListener('click', e => {
    if (!prefs.narration || e.target.closest('.settings')) return;
    const el = e.target.closest(READABLE);
    if (el && !el.matches('a, button')) speakOne(el); // links/buttons speak on focus instead
  });

  // --- The panel ---
  const panel = document.createElement('div');
  panel.className = 'settings';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="settings-backdrop" data-close></div>
    <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="settings-head">
        <h2 id="settings-title" class="settings-title">Settings</h2>
        <button type="button" class="settings-close" data-close aria-label="Close settings">✕</button>
      </header>
      <p class="settings-intro">Make this site comfortable for you. Your choices are saved on this device.</p>

      <fieldset class="seg" data-pref="theme">
        <legend class="label">Theme</legend>
        <label><input type="radio" name="theme" value="auto"><span>Auto</span></label>
        <label><input type="radio" name="theme" value="light"><span>☀ Light</span></label>
        <label><input type="radio" name="theme" value="dark"><span>☾ Dark</span></label>
      </fieldset>
      <p class="seg-hint">Auto matches your device.</p>

      <fieldset class="seg seg--spaced" data-pref="motion">
        <legend class="label">Motion</legend>
        <label><input type="radio" name="motion" value="full"><span>Full</span></label>
        <label><input type="radio" name="motion" value="calm"><span>Calm</span></label>
        <label><input type="radio" name="motion" value="still"><span>Still</span></label>
      </fieldset>
      <p class="seg-hint" data-hint="motion"></p>

      <fieldset class="seg seg--text" data-pref="text">
        <legend class="label">Text size</legend>
        <label><input type="radio" name="text" value="default" aria-label="Default text size"><span style="font-size:0.95rem">Aa</span></label>
        <label><input type="radio" name="text" value="large" aria-label="Large text"><span style="font-size:1.3rem">Aa</span></label>
        <label><input type="radio" name="text" value="larger" aria-label="Larger text"><span style="font-size:1.65rem">Aa</span></label>
      </fieldset>

      <div class="switches">
        <label class="switch">
          <span class="switch-text"><strong>Narration</strong><small>Click any text, or tab to a link, to hear it read aloud.</small></span>
          <input type="checkbox" role="switch" name="narration">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <button type="button" class="settings-read" data-read hidden>Read this page aloud</button>

        <label class="switch">
          <span class="switch-text"><strong>High contrast</strong><small>Darker secondary text and stronger lines.</small></span>
          <input type="checkbox" role="switch" name="contrast">
          <span class="switch-track" aria-hidden="true"></span>
        </label>

        <label class="switch" data-needs-mouse>
          <span class="switch-text"><strong>Fun cursor</strong><small>Turn off to use your normal system cursor.</small></span>
          <input type="checkbox" role="switch" name="cursor">
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>

      <button type="button" class="settings-reset" data-reset>Reset to default</button>
    </section>`;
  document.body.append(panel);
  const dialog = panel.querySelector('.settings-panel');
  const readBtn = panel.querySelector('[data-read]');
  const hints = {
    full: 'Everything on: transitions, wobbles, trails and tilts.',
    calm: 'Gentle fades only. No page transitions, trails, wobbles or tilts.',
    still: 'No animation at all.',
  };
  if (!synth) {
    const n = panel.querySelector('[name="narration"]');
    n.disabled = true;
    n.closest('.switch').querySelector('small').textContent = "Your browser doesn't support reading aloud.";
  }
  if (!finePointer) panel.querySelector('[data-needs-mouse]').hidden = true;

  // Reflect the current prefs in the controls
  const syncControls = () => {
    panel.querySelector(`[name="theme"][value="${prefs.theme || 'auto'}"]`).checked = true;
    const motion = prefs.motion || motionLevel();
    panel.querySelector(`[name="motion"][value="${motion}"]`).checked = true;
    panel.querySelector(`[name="text"][value="${prefs.text || 'default'}"]`).checked = true;
    panel.querySelector('[name="narration"]').checked = !!prefs.narration;
    panel.querySelector('[name="contrast"]').checked = !!prefs.contrast;
    panel.querySelector('[name="cursor"]').checked = prefs.cursor !== false;
    panel.querySelector('[data-hint="motion"]').textContent = hints[motion];
    readBtn.hidden = !prefs.narration || !synth;
  };

  panel.addEventListener('change', e => {
    const { name, value, checked, type } = e.target;
    prefs[name] = type === 'checkbox' ? checked : value;
    savePrefs(prefs);
    if (name === 'theme' && !calm()) {
      // Cross-fade the colours for a moment (styles.css: .theme-switching)
      document.documentElement.classList.add('theme-switching');
      setTimeout(() => document.documentElement.classList.remove('theme-switching'), 450);
    }
    applyPrefs();
    syncControls();
    if (name === 'narration' && checked) speak(panel.querySelector('[name="narration"]').closest('.switch'));
  });
  readBtn.addEventListener('click', () => (queue.length || speakingEl ? stopSpeaking() : readPage()));
  panel.querySelector('[data-reset]').addEventListener('click', () => {
    prefs = {};
    savePrefs(prefs);
    applyPrefs();
    syncControls();
  });

  // Open / close, with focus kept inside while open
  let opener = null;
  const openSettings = btn => {
    opener = btn;
    syncControls();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    $$('[data-settings]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    panel.querySelector('input:checked, input').focus();
  };
  const closeSettings = () => {
    panel.classList.remove('is-open');
    document.body.style.overflow = '';
    $$('[data-settings]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    setTimeout(() => (panel.hidden = true), calm() ? 0 : 320);
    opener && opener.focus();
  };
  $$('[data-settings]').forEach(btn => btn.addEventListener('click', () => openSettings(btn)));
  panel.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSettings(); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSettings(); return; }
    if (e.key !== 'Tab') return;
    const focusable = $$('button:not([hidden]), input:not([disabled])', dialog).filter(el => el.offsetParent !== null);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  applyPrefs();
})();
