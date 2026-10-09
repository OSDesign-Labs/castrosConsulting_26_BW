/* ==========================================================
   HERO CAROUSEL
   Works wherever the <script> tag sits: it waits for the page
   and for Bootstrap before starting.

   One clock drives everything, so pausing pauses everything:
   - each slide stays for its data-duration (ms): Início 8000, others 3500
   - the line under the active tab shows the time left
   - Início's 3 background photos split its 8 s into equal parts
   - videos play only while their slide is on screen
   Pauses on: the pause button, mouse over the hero, keyboard
   focus inside it, and the hero being scrolled off screen.
   ========================================================== */
(function () {
    "use strict";

    function init() {
        const section = document.querySelector(".hero-carousel");
        const el = section && section.querySelector("#heroCarousel");
        if (!el || el.dataset.heroReady) return true;     // nothing to do / already running
        if (!window.bootstrap) return false;               // Bootstrap not loaded yet → try again later
        el.dataset.heroReady = "1";

        const items = Array.from(el.querySelectorAll(".carousel-item"));
        const tabs = Array.from(section.querySelectorAll(".hero-tab"));
        const bars = tabs.map(function (tab) { return tab.querySelector(".ht-bar i"); });
        const pauseBtn = section.querySelector(".hero-pause");
        const live = el.querySelector(".carousel-inner");
        const bgImgs = Array.from(section.querySelectorAll(".hero-bg img"));
        const counters = Array.from(section.querySelectorAll(".metric-value[data-count]"));
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const carousel = bootstrap.Carousel.getOrCreateInstance(el, {
            interval: false,   // timing is ours (see top note)
            ride: false,
            pause: false,
            touch: true,       // swipe on phones
            keyboard: true,    // ← → when focus is inside the hero
            wrap: true
        });

        /* ---------- state ---------- */
        let current = 0;
        let elapsed = 0;            // ms spent on the current slide (only counts while running)
        let last = null;            // timestamp of the previous frame
        let userPaused = reduceMotion;
        let hovering = false;
        let keyboardFocus = false;
        let offscreen = false;

        function duration(i) {
            return parseInt(items[i].dataset.duration, 10) || 3500;
        }

        function isRunning() {
            return !userPaused && !hovering && !keyboardFocus && !offscreen && !document.hidden;
        }

        /* ---------- stagger numbers for the text animation ---------- */
        items.forEach(function (item) {
            item.querySelectorAll(".hs-anim").forEach(function (node, i) {
                node.style.setProperty("--i", i);
            });
        });

        /* ---------- Início background photos ---------- */
        function updateBackground() {
            if (!bgImgs.length) return;
            const part = duration(0) / bgImgs.length;                // 8000 / 3 ≈ 2667 ms each
            const idx = current === 0 ? Math.min(bgImgs.length - 1, Math.floor(elapsed / part)) : 0;
            bgImgs.forEach(function (img, i) {
                img.classList.toggle("is-on", i === idx);
                // slow zoom-out while each photo is on screen (pauses with the clock)
                const local = Math.max(0, Math.min(1, (elapsed - i * part) / part));
                img.style.setProperty("--z", reduceMotion ? 1 : (1.08 - 0.08 * local).toFixed(4));
            });
        }

        /* ---------- metric numbers count up ---------- */
        let countFrame = null;
        function countUp() {
            cancelAnimationFrame(countFrame);
            if (reduceMotion) return;
            const start = performance.now();
            const time = 1400;
            counters.forEach(function (c) { c.textContent = "+0"; });
            (function step(now) {
                const t = Math.min(1, (now - start) / time);
                const eased = 1 - Math.pow(1 - t, 3);                  // fast start, soft landing
                counters.forEach(function (c) {
                    c.textContent = "+" + Math.round(eased * parseInt(c.dataset.count, 10));
                });
                if (t < 1) countFrame = requestAnimationFrame(step);
            })(start);
        }

        /* ---------- videos: only the visible slide plays ---------- */
        function syncVideos() {
            items.forEach(function (item, i) {
                item.querySelectorAll("video").forEach(function (v) {
                    v.muted = true;
                    if (i === current && !userPaused && !offscreen && !reduceMotion) {
                        const p = v.play();
                        if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
                    } else {
                        v.pause();
                    }
                });
            });
        }

        /* ---------- slide change ---------- */
        function setActive(index) {
            current = index;
            elapsed = 0;
            tabs.forEach(function (tab, i) {
                const on = i === index;
                tab.classList.toggle("active", on);
                if (on) tab.setAttribute("aria-current", "true");
                else tab.removeAttribute("aria-current");
                bars[i].style.transform = "scaleX(0)";
            });
            items.forEach(function (item, i) {
                item.classList.toggle("is-current", i === index);
            });
            items[index].querySelectorAll("video").forEach(function (v) {
                try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
            });
            updateBackground();
            syncVideos();
            if (index === 0) countUp();
        }

        // fires at the START of a change, so the new slide animates while it fades in
        el.addEventListener("slide.bs.carousel", function (e) {
            setActive(e.to);
        });

        /* ---------- the clock ---------- */
        function tick(now) {
            if (last !== null && isRunning()) {
                elapsed += Math.min(now - last, 100);                 // cap big jumps (tab switch, lag)
                const p = Math.min(1, elapsed / duration(current));
                bars[current].style.transform = "scaleX(" + p.toFixed(4) + ")";
                if (current === 0) updateBackground();
                if (p >= 1) {
                    elapsed = duration(current);                       // hold until Bootstrap moves on
                    carousel.next();
                }
            }
            last = now;
            requestAnimationFrame(tick);
        }

        /* ---------- pausing ---------- */
        // pause button label in the current language (js/i18n.js)
        function pauseLabel(paused) {
            var i18n = window.CastrosI18n;
            return paused ? (i18n ? i18n.t("hero.resume", "Retomar destaques") : "Retomar destaques")
                          : (i18n ? i18n.t("hero.pause", "Pausar destaques") : "Pausar destaques");
        }
        function syncPauseLabel() { if (pauseBtn) pauseBtn.setAttribute("aria-label", pauseLabel(userPaused)); }
        document.addEventListener("i18n:change", syncPauseLabel);
        syncPauseLabel();                       // in case the page was translated before the carousel started

        function setUserPaused(paused) {
            userPaused = paused;
            section.classList.toggle("is-paused", paused);
            if (pauseBtn) {
                pauseBtn.setAttribute("aria-pressed", String(paused));
                pauseBtn.setAttribute("aria-label", pauseLabel(paused));
            }
            live.setAttribute("aria-live", paused ? "polite" : "off");
            syncVideos();
        }

        if (pauseBtn) {
            pauseBtn.addEventListener("click", function () {
                setUserPaused(!userPaused);
            });
        }

        // mouse only: a tap on a phone must not freeze the carousel
        section.addEventListener("pointerenter", function (e) {
            if (e.pointerType === "mouse") hovering = true;
        });
        section.addEventListener("pointerleave", function () {
            hovering = false;
        });

        // keyboard users get time to read; mouse clicks don't count as "focus" here
        section.addEventListener("focusin", function (e) {
            keyboardFocus = e.target.matches(":focus-visible");
        });
        section.addEventListener("focusout", function () {
            keyboardFocus = false;
        });

        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                offscreen = !entries[0].isIntersecting;
                syncVideos();
            }, { threshold: 0.25 }).observe(section);
        }

        /* ---------- "Inscrever-me" pre-selects the service in the contact form ---------- */
        section.addEventListener("click", function (e) {
            const link = e.target.closest("[data-prefill-service]");
            const select = document.getElementById("service");
            if (!link || !select) return;
            select.value = link.dataset.prefillService;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });

        /* ---------- start ---------- */
        if (reduceMotion) setUserPaused(true);
        function start() {
            section.classList.add("is-ready");
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    setActive(0);
                    requestAnimationFrame(tick);
                });
            });
        }
        // wait for the site loader (logo intro) to finish, so slide 1 is seen from its start
        if (window.siteLoaderDone || !document.documentElement.classList.contains("is-loading")) start();
        else document.addEventListener("site-loader:done", start, { once: true });
        return true;
    }

    // Run after the HTML is parsed (Bootstrap's <script> has run by then, wherever it is);
    // if Bootstrap still isn't there, try once more when everything has loaded.
    function boot() {
        if (!init()) window.addEventListener("load", init, { once: true });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
