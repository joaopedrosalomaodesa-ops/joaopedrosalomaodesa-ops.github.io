{
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Contador do carregamento ----------
  const count = $("#count");
  if (count && !reduce) {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1700);
      count.textContent = Math.round(100 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const INTRO = reduce ? 0 : 2.05; // segundos até a cortina do carregamento subir

  // ---------- Quebra de texto em letras e palavras ----------
  const splitChars = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((c) => {
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = c === " " ? " " : c;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else walk(n);
      });
    };
    walk(el);
    return $$(".ch", el);
  };
  const splitWords = (el, cls) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w) => (cls ? `<span class="${cls}">${w}</span>` : `<span class="w"><span class="wi">${w}</span></span>`))
      .join(" ");
    return $$(cls ? "." + cls : ".wi", el);
  };

  // Linha preenchida da trajetória
  const tl = $(".tl");
  if (tl) { const f = document.createElement("span"); f.className = "tl__fill"; tl.prepend(f); }

  // ---------- Sem GSAP ou com movimento reduzido: tudo já está visível ----------
  if (!hasGsap || reduce) {
    $$(".progress").forEach((p) => (p.style.display = "none"));
  } else {
    gsap.registerPlugin(ScrollTrigger);

    // Rolagem suave
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = id === "#top" ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === "#top" ? 0 : -10, duration: 1.6 });
      })
    );

    // Menu some ao descer e volta ao subir
    const nav = $(".nav");
    lenis.on("scroll", ({ scroll, direction }) => nav.classList.toggle("is-hidden", direction === 1 && scroll > innerHeight * 0.6));
    // Link da seção atual
    $$(".nav__links a").forEach((link) => {
      const sec = $(link.getAttribute("href"));
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", refreshPriority: -1, onToggle: (st) => link.classList.toggle("is-active", st.isActive) });
    });

    // Barra de progresso
    gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

    // ---------- Hero: entrada ----------
    const chars = $$(".hero__name [data-chars]").flatMap(splitChars);
    const intro = gsap.timeline({ delay: INTRO, defaults: { ease: "expo.out" } });
    intro
      .from(chars, { yPercent: 115, rotate: 6, duration: 1.4, stagger: 0.028 })
      .from(".hero__photo", { clipPath: "inset(100% 0 0 0)", duration: 1.5, ease: "expo.inOut" }, 0)
      .from(".hero__photo img", { scale: 1.4, duration: 2.2 }, 0)
      .from(".chip", { scale: 0.4, opacity: 0, y: 30, duration: 1.1, stagger: 0.12, ease: "back.out(1.8)" }, 0.8)
      .from(".hero__fade", { y: 24, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.5)
      .from(".nav", { y: -30, opacity: 0, duration: 1 }, 0.6);

    // Chips flutuando sem parar
    $$(".chip").forEach((c, i) =>
      gsap.to(c, { y: i % 2 ? 10 : -10, duration: 2.4 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: INTRO + 1.6 })
    );

    // Parallax do hero ao rolar
    gsap.to(".hero__photo img", { yPercent: -12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__text", { yPercent: 18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // Faixa corrida acelera com a velocidade do scroll
    const track = $(".marquee__track");
    if (track) {
      let skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
      ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-12, 12, s.getVelocity() / -200)) });
    }

    // ---------- Títulos palavra por palavra ----------
    $$("[data-split]").forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });

    // ---------- Blocos genéricos ----------
    gsap.set("[data-reveal]", { y: 40, opacity: 0 });
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 92%",
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.1, overwrite: true }),
      once: true,
    });

    // ---------- Sobre: palavras acendem conforme a leitura ----------
    const big = $("[data-words]");
    if (big) {
      const ws = splitWords(big, "aw");
      gsap.fromTo(ws, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.05, ease: "none",
        scrollTrigger: { trigger: big, start: "top 80%", end: "bottom 45%", scrub: true },
      });
    }
    gsap.fromTo(".about__photo img", { yPercent: -10 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".about__photo", { clipPath: "inset(0 0 100% 0)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: ".about", start: "top 70%" } });

    // ---------- Trajetória ----------
    gsap.to(".tl__fill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".tl", start: "top 70%", end: "bottom 60%", scrub: true } });
    $$(".tl__item").forEach((li) =>
      gsap.from(li, { x: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: li, start: "top 85%" } })
    );

    // ---------- Galeria ----------
    $$(".g").forEach((g, i) => {
      gsap.from(g.querySelector(".g__frame"), { clipPath: "inset(100% 0 0 0)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: g, start: "top 85%" } });
      gsap.fromTo(g.querySelector("img"), { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: g, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // ---------- Contato ----------
    gsap.from(".sig--big", { clipPath: "inset(0 100% 0 0)", duration: 2.2, ease: "power2.inOut", scrollTrigger: { trigger: ".contact__sign", start: "top 92%" } });

    // ---------- Seções fixas: só em telas largas ----------
    // Barra de endereço do celular não deve recalcular tudo a cada rolagem
    ScrollTrigger.config({ ignoreMobileResize: true });
    const bestChars = splitChars($(".mind__best"));
    const vc = $(".vc"), steps = $$(".step"), mind = $(".mind");

    const mm = gsap.matchMedia();
    mm.add({ desk: "(min-width: 901px)", mob: "(max-width: 900px)" }, (ctx) => {
      const { desk } = ctx.conditions;
      const H = () => window.innerHeight;

      // V-Clothes: seção fixa e as etapas do produto acendem com o scroll (computador e celular)
      vc.classList.add("is-steps");
      gsap.set(".vc__bar span", { scaleX: 0 });
      ScrollTrigger.create({
        trigger: vc, start: "top top", end: () => "+=" + H() * (desk ? 1.6 : 1.3), pin: ".vc__inner", scrub: true, invalidateOnRefresh: true,
        onUpdate: (st) => {
          const idx = Math.min(steps.length - 1, Math.floor(st.progress * steps.length));
          steps.forEach((el, i) => el.classList.toggle("is-on", i <= idx));
          gsap.set(".vc__bar span", { scaleX: st.progress });
        },
      });
      gsap.from(".vc__media", { clipPath: "inset(0 100% 0 0)", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: vc, start: "top 75%" } });
      gsap.from(".vc__media video", { scale: 1.35, duration: 2.2, ease: "expo.out", scrollTrigger: { trigger: vc, start: "top 75%" } });

      // Projetos: no computador sobem juntos; no celular, cada cartão entra quando aparece
      if (desk) {
        gsap.from(".card", { y: 80, opacity: 0, rotationX: -12, transformPerspective: 900, duration: 1.3, ease: "expo.out", stagger: 0.14, scrollTrigger: { trigger: ".hs__track", start: "top 82%" } });
      } else {
        $$(".card").forEach((c) => gsap.from(c, { y: 70, opacity: 0, rotationX: -10, transformPerspective: 800, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 88%" } }));
        // número do cartão desliza conforme a rolagem
        $$(".card__n").forEach((n) => gsap.fromTo(n, { xPercent: -12 }, { xPercent: 12, ease: "none", scrollTrigger: { trigger: n, start: "top bottom", end: "bottom top", scrub: true } }));
      }

      // Visão: frase entra, a seção fixa e a tela vira verde
      gsap.from(".mind__l", { xPercent: (i) => (i % 2 ? 30 : -30), opacity: 0, stagger: 0.14, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: mind, start: "top 70%" } });
      gsap.from(bestChars, { yPercent: 100, opacity: 0, rotate: 8, stagger: 0.04, duration: 1, ease: "expo.out", scrollTrigger: { trigger: mind, start: "top 55%" } });
      gsap.fromTo(".mind__u", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: mind, start: "top 40%" } });
      gsap.set(".mind__text", { y: 40, opacity: 0 });
      gsap.timeline({
        scrollTrigger: {
          trigger: mind, start: "top top", end: () => "+=" + H() * (desk ? 1.4 : 1.1), pin: ".mind__inner", scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (st) => mind.classList.toggle("is-flip", st.progress > 0.6),
        },
      }).fromTo(".mind__text", { y: 40, opacity: 0 }, { y: 0, opacity: 1, immediateRender: false }).to({}, { duration: 1 });

      // Celular: foto e selos do hero flutuam com a rolagem (no lugar do mouse)
      if (!desk) {
        gsap.to(".chip--a", { y: -40, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".chip--c", { y: -70, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero__photo", { rotation: -2, scale: 0.94, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      }

      return () => { vc.classList.remove("is-steps"); mind.classList.remove("is-flip"); };
    });

    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  // ---------- Interações de mouse ----------
  if (fine && !reduce) {
    const cursor = $(".cursor");
    const label = $(".cursor__label");
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("is-active"); });
    const loop = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$("a, [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
    $$("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => { label.textContent = el.dataset.cursor; cursor.classList.add("is-label"); });
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-label"));
    });

    // Botões magnéticos
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)"; el.style.transform = ""; setTimeout(() => (el.style.transition = ""), 600); });
    });

    if (hasGsap) {
      // Cartões inclinam em 3D seguindo o mouse
      $$("[data-tilt]").forEach((card) => {
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
        gsap.set(card, { transformPerspective: 900 });
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
        });
        card.addEventListener("mouseleave", () => { rx(0); ry(0); });
      });

      // Foto do hero inclina em 3D e o reflexo acompanha
      const hp = $(".hero__photo");
      gsap.set(hp, { transformPerspective: 1000 });
      const hrx = gsap.quickTo(hp, "rotationX", { duration: 0.9, ease: "power3" });
      const hry = gsap.quickTo(hp, "rotationY", { duration: 0.9, ease: "power3" });
      hp.addEventListener("mousemove", (e) => {
        const r = hp.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        hry(px * 10); hrx(-py * 10); hp.style.setProperty("--sx", `${px * 60}%`);
      });
      hp.addEventListener("mouseleave", () => { hrx(0); hry(0); hp.style.setProperty("--sx", "-30%"); });

      // Luz que segue o mouse nos cartões
      $$(".card").forEach((c) => c.addEventListener("mousemove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
      }));

      // Chips e foto do hero reagem ao mouse (profundidade)
      const hero = $(".hero");
      const movers = $$("[data-float]").map((el) => ({ el, d: +el.dataset.float, qx: gsap.quickTo(el, "x", { duration: 1, ease: "power3" }) }));
      const photo = gsap.quickTo(".hero__photo", "x", { duration: 1.2, ease: "power3" });
      hero.addEventListener("mousemove", (e) => {
        const nx = e.clientX / innerWidth - 0.5;
        movers.forEach((m) => m.qx(nx * m.d * 2));
        photo(nx * -14);
      });
    }
  }

  // ---------- Toque/clique: luz no ponto tocado dos cartões ----------
  $$(".card").forEach((c) => c.addEventListener("pointerdown", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
    c.classList.add("is-touch"); setTimeout(() => c.classList.remove("is-touch"), 900);
  }));

  // ---------- Menu do celular ----------
  const toggle = $(".nav__toggle"), menu = $(".menu");
  if (toggle && menu) {
    const setOpen = (open) => {
      document.documentElement.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open);
      menu.setAttribute("aria-hidden", !open);
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    };
    toggle.addEventListener("click", () => setOpen(!document.documentElement.classList.contains("menu-open")));
    $$(".menu a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  // ---------- Contato: copiar ----------
  $$(".copy").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const old = btn.textContent;
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = "Copiado!"; }
      catch { btn.textContent = "Selecione e copie"; }
      btn.classList.add("is-done");
      setTimeout(() => { btn.textContent = old; btn.classList.remove("is-done"); }, 1800);
    })
  );

  // ---------- Vídeo toca só quando está na tela ----------
  const video = $(".vc__media video");
  if (video) {
    if (reduce) { video.removeAttribute("autoplay"); video.controls = true; video.pause(); }
    else if ("IntersectionObserver" in window) {
      const vio = new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.2 });
      vio.observe(video);
    }
  }
}
