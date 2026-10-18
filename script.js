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
     data-flip       card turns over on click
     data-copy       click copies text and shows a toast
     data-clock      live local time (set the zone with data-tz)
     data-year       current year
   ===================================================================== */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  if (!reduceMotion) {
    $$('.char').forEach(ch => {
      ch.addEventListener('mouseenter', () => {
        if (ch.classList.contains('hop')) return;
        ch.style.setProperty('--r', `${(Math.random() * 30 - 15).toFixed(1)}deg`);
        ch.classList.add('hop');
      });
      ch.addEventListener('animationend', () => ch.classList.remove('hop'));
    });
  }


  /* ---------- Custom cursor ----------------------------------------- */
  if (finePointer) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.style.opacity = 0; // hidden until the mouse first moves
    document.body.append(cursor);
    document.documentElement.classList.add('has-cursor');

    let x = 0, y = 0, cx = 0, cy = 0, seen = false;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; cx = x; cy = y; cursor.style.opacity = 1; }
      const t = e.target;
      const labelled = t.closest('[data-cursor]');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.textContent = labelled ? labelled.dataset.cursor : '';
      cursor.classList.toggle('is-grab', !labelled && !!t.closest('[data-drag]'));
      cursor.classList.toggle('is-link', !labelled && !t.closest('[data-drag]') && !!t.closest('a, button'));
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup',   () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => (cursor.style.opacity = 0));
    document.addEventListener('mouseenter', () => (cursor.style.opacity = 1));

    (function follow() {
      // Slight lag makes the cursor feel soft rather than mechanical.
      cx = lerp(cx, x, reduceMotion ? 1 : 0.25);
      cy = lerp(cy, y, reduceMotion ? 1 : 0.25);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    })();
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
      if (reduceMotion) { vx = vy = 0; render(); return; }
      raf = requestAnimationFrame(glide);
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    // On small screens a sticker's starting spot can poke out; nudge it in.
    requestAnimationFrame(() => { keepInside(); render(); });
  });


  /* ---------- Tilt toward cursor ------------------------------------ */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(media => {
      const card = media.closest('a') || media;
      card.addEventListener('pointermove', e => {
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


  /* ---------- Magnetic buttons -------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
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

    if (!reduceMotion) {
      offset -= 0.6 + Math.abs(velocity) * 0.8;
      skew = lerp(skew, clamp(velocity * -0.4, -12, 12), 0.15);
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
  if (!reduceMotion) {
    addEventListener('click', e => {
      if (e.target.closest('a, button, [data-drag], input, textarea')) return;
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


  /* ---------- Flip cards -------------------------------------------- */
  // Click (or Enter/Space, since they're buttons) to turn a card over.
  $$('[data-flip]').forEach(card => {
    card.addEventListener('click', () => {
      const flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped);
    });
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
})();
