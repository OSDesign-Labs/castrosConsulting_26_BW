/* ==========================================================
   HERO CAROUSEL
   Load AFTER bootstrap.bundle.min.js.
   - Autoplay is driven by the timer line under the active tab:
     when its CSS animation ends, we go to the next slide.
     So pausing the animation pauses the carousel, and the line
     always shows exactly how long is left.
   - Pauses on mouse hover, keyboard focus, the pause button,
     and when the hero is scrolled off screen.
   - "Inscrever-me" buttons pre-select the service in the contact form.
   ========================================================== */
(function () {
    const section = document.querySelector(".hero-carousel");
    const el = section && section.querySelector("#heroCarousel");
    if (!el || !window.bootstrap) return;

    const items = Array.from(el.querySelectorAll(".carousel-item"));
    const tabs = Array.from(section.querySelectorAll(".hero-tab"));
    const pauseBtn = section.querySelector(".hero-pause");
    const live = el.querySelector(".carousel-inner");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const carousel = bootstrap.Carousel.getOrCreateInstance(el, {
        interval: false,   // we drive autoplay ourselves (see top note)
        ride: false,
        pause: false,
        touch: true,       // swipe on phones
        keyboard: true,    // ← → when focus is inside the hero
        wrap: true
    });

    /* Number the animated lines in each slide, for the stagger delay */
    items.forEach(function (item) {
        item.querySelectorAll(".hs-anim").forEach(function (node, i) {
            node.style.setProperty("--i", i);
        });
    });

    function setActive(index) {
        tabs.forEach(function (tab, i) {
            const on = i === index;
            tab.classList.toggle("active", on);
            if (on) tab.setAttribute("aria-current", "true");
            else tab.removeAttribute("aria-current");
        });
        items.forEach(function (item, i) {
            item.classList.toggle("is-current", i === index);
        });
    }

    // Fires at the START of a slide change, so text animates in while the slide fades in
    el.addEventListener("slide.bs.carousel", function (e) {
        setActive(e.to);
    });

    // Timer line finished → next slide
    section.addEventListener("animationend", function (e) {
        if (e.animationName === "heroTabFill") carousel.next();
    });

    /* ---------- Pausing ---------- */
    function setPaused(paused) {
        section.classList.toggle("is-paused", paused);
        if (!pauseBtn) return;
        pauseBtn.setAttribute("aria-pressed", String(paused));
        pauseBtn.setAttribute("aria-label", paused ? "Retomar destaques" : "Pausar destaques");
        pauseBtn.querySelector(".bi").className = paused ? "bi bi-play-fill" : "bi bi-pause-fill";
        live.setAttribute("aria-live", paused ? "polite" : "off");
    }

    if (pauseBtn) {
        pauseBtn.addEventListener("click", function () {
            setPaused(!section.classList.contains("is-paused"));
        });
    }

    // Hover pause for mouse only (a tap on a phone must not freeze the carousel)
    section.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") section.classList.add("is-hover");
    });
    section.addEventListener("pointerleave", function () {
        section.classList.remove("is-hover");
    });

    // Don't change slides while nobody can see them
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            section.classList.toggle("is-offscreen", !entries[0].isIntersecting);
        }, { threshold: 0.25 }).observe(section);
    }

    if (reduceMotion.matches) live.setAttribute("aria-live", "polite");

    /* ---------- Pre-select the service in the contact form ---------- */
    section.addEventListener("click", function (e) {
        const link = e.target.closest("[data-prefill-service]");
        const select = document.getElementById("service");
        if (!link || !select) return;
        select.value = link.dataset.prefillService;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    /* ---------- Start: first slide animates in on load ---------- */
    section.classList.add("is-ready");
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            setActive(0);
        });
    });
})();
