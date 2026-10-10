/* ==========================================================
   SITE LOADER
   1. The loader (logo centred, large) is on screen from the first
      paint. A tiny inline script in <head> adds html.is-loading.
   2. When the page has fully loaded (window load + web fonts),
      "Castros Consultoria" slides out from behind the logo (and
      the lockup shrinks to fit narrow screens).
   3. Logo + name fly to the navbar and land exactly on the real
      nav logo, while the dark background fades away. Then the
      real nav logo is shown and the loader copy is removed.
   4. Clicking a link to another page of the site fades the loader
      back in (logo centred) before leaving, so the next page
      starts from the same picture → one continuous transition.

   Other scripts can wait for it:
       document.addEventListener("site-loader:done", start)
   or check   window.siteLoaderDone === true

   Options, on <html>:
       data-loader="always"   (default) every page load
       data-loader="session"  only the first page of a visit
   Links with data-no-loader are never intercepted.
   ========================================================== */
(function () {
    "use strict";

    var root = document.documentElement;
    var loader = document.getElementById("siteLoader");
    if (!loader) return;

    var lockup = loader.querySelector(".site-loader__lockup");
    var mark = loader.querySelector(".brand-mark");
    var clip = loader.querySelector(".brand-name-clip");
    var name = loader.querySelector(".brand-name");
    var bg = loader.querySelector(".site-loader__bg");

    var KEY_SEEN = "cc-loader-seen";
    var KEY_HANDOFF = "cc-loader-handoff";
    /* timings (ms), tune here */
    var T = {
        minShow: 700,      // loader stays at least this long after navigation start (no "flash")
        maxWait: 7000,     // a slow image/video never holds the page longer than this
        reveal: 650,       // "Castros" sliding out from behind the logo
        hold: 250,         // pause with the full lockup centred
        flight: 850,       // centre → navbar
        bgFade: 600,       // dark background fading away during the flight
        bgDelay: 250,      // ...starting this long after the flight begins
        exit: 340          // fade back in when leaving for another page
    };
    var EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
    var EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

    var mode = root.getAttribute("data-loader") || "always";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var running = [];
    var leaving = false;

    if (reduceMotion) root.classList.add("loader-reduced");

    /* ---------- small helpers ---------- */
    function store(key, value) {
        try {
            if (value === null) sessionStorage.removeItem(key);
            else sessionStorage.setItem(key, value);
        } catch (e) { /* private mode: fine, just no memory */ }
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // Web Animations API, holds the end state until we reset
    function animate(el, frames, options) {
        if (!el || !el.animate) return Promise.resolve();
        options.fill = "forwards";
        var a = el.animate(frames, options);
        running.push(a);
        return a.finished.catch(function () { /* cancelled */ });
    }

    function reset() {
        running.forEach(function (a) { a.cancel(); });
        running = [];
        if (lockup) lockup.style.transformOrigin = "";
    }

    function pageReady() {
        var loaded = new Promise(function (resolve) {
            if (document.readyState === "complete") resolve();
            else window.addEventListener("load", resolve, { once: true });
        });
        var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        var minimum = wait(Math.max(0, T.minShow - performance.now()));
        // a visitor who chose English: keep the logo up until the page is translated (js/i18n.js)
        var translated = window.CastrosI18n && window.CastrosI18n.ready ? window.CastrosI18n.ready : Promise.resolve();
        return Promise.race([Promise.all([loaded, fonts, minimum, translated]), wait(T.maxWait)]);
    }

    function navTarget() {
        return document.querySelector("[data-brand-target]") ||
               document.querySelector(".main-navbar .brand-lockup");
    }

    // the logo must land on a visible navbar (it auto-hides on scroll, and the
    // contact form's autofocus can scroll the page while we are loading)
    function showNavbar(target) {
        var navbar = target && target.closest(".main-navbar");
        if (!navbar) return;
        navbar.classList.remove("navbar-hidden");
        navbar.classList.add("navbar-hovered");
    }

    /* ---------- the end: hand over to the real nav logo ---------- */
    function finish() {
        if (window.siteLoaderDone) return;               // runs once (the safety timer below may get here first)
        // same frame: real logo appears, loader copy disappears
        root.classList.remove("is-loading", "loader-handoff");
        loader.hidden = true;
        loader.classList.remove("is-active");
        reset();
        window.siteLoaderDone = true;
        document.dispatchEvent(new CustomEvent("site-loader:done"));
    }

    /* ---------- arrival ---------- */
    function arrive() {
        if (!root.classList.contains("is-loading")) {     // skipped (session mode)
            loader.hidden = true;
            window.siteLoaderDone = true;
            document.dispatchEvent(new CustomEvent("site-loader:done"));
            return;
        }
        store(KEY_SEEN, "1");
        store(KEY_HANDOFF, null);

        // safety net: the arrival waits on animations, which stall if the browser stops drawing
        // frames. Without this, "site-loader:done" never fires, so AOS (every fade-in section) and
        // the hero carousel never start; the CSS failsafe only hides the overlay. 12 s, same as it.
        setTimeout(finish, T.maxWait + 5000);

        pageReady().then(function () {
            var target = navTarget();

            if (reduceMotion || !target || !lockup.animate) {
                showNavbar(target);
                return animate(loader, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: "ease" })
                    .then(finish);
            }

            // 1. the name slides out from behind the logo; if logo + name would be
            //    wider than the screen, the lockup shrinks to fit at the same time
            var width = name.offsetWidth;
            var fullWidth = mark.offsetWidth + width;
            var fit = Math.min(1, (window.innerWidth * 0.86) / fullWidth);
            var fitAnim = null;
            var reveal = [
                animate(clip, [{ width: "0px" }, { width: width + "px" }], { duration: T.reveal, easing: EASE_OUT }),
                animate(name, [
                    { transform: "translateX(-100%)", opacity: 0 },
                    { transform: "translateX(0)", opacity: 1 }
                ], { duration: T.reveal, easing: EASE_OUT })
            ];
            if (fit < 1) {
                reveal.push(animate(lockup, [
                    { transform: "scale(1)" },
                    { transform: "scale(" + fit + ")" }
                ], { duration: T.reveal, easing: EASE_OUT }));   // same curve as the reveal: never wider than the screen
                fitAnim = running[running.length - 1];
            }
            return Promise.all(reveal)
            .then(function () { return wait(T.hold); })
            .then(function () {
                // 2. fly onto the nav logo
                showNavbar(target);

                var toMark = (target.querySelector(".brand-mark") || target).getBoundingClientRect();
                var targetName = target.querySelector(".brand-name");

                // measure the untransformed layout with sub-pixel precision: drop the
                // fit scale for a moment (same task, so nothing is painted in between)
                if (fitAnim) fitAnim.cancel();
                var L = lockup.getBoundingClientRect();
                var M = mark.getBoundingClientRect();

                // origin at the lockup's top-left corner: a point p lands at L + t + s·p
                var s = toMark.height / M.height;
                var tx = toMark.left - L.left - s * (M.left - L.left);
                var ty = toMark.top - L.top - s * (M.top - L.top);

                // the fit scale re-expressed around the top-left corner, so
                // switching the origin causes no jump
                var startTransform = "translate(" + ((1 - fit) * L.width / 2) + "px, " + ((1 - fit) * L.height / 2) + "px) scale(" + fit + ")";
                lockup.style.transformOrigin = "0 0";

                var steps = [
                    animate(lockup, [
                        { transform: startTransform },
                        { transform: "translate(" + tx + "px, " + ty + "px) scale(" + s + ")" }
                    ], { duration: T.flight, easing: EASE_IN_OUT }),
                    animate(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: T.bgFade, delay: T.bgDelay, easing: "ease" })
                ];
                if (targetName) {                            // e.g. white on the loader → ink on a light page
                    steps.push(animate(name, [
                        { color: getComputedStyle(name).color },
                        { color: getComputedStyle(targetName).color }
                    ], { duration: T.flight, easing: EASE_IN_OUT }));
                }
                return Promise.all(steps);
            })
            .then(finish);
        }).catch(finish);
    }

    /* ---------- leaving: fade the loader back in, then go ---------- */
    function leave(href) {
        if (leaving) return;
        leaving = true;
        store(KEY_HANDOFF, "1");

        var go = function () { window.location.href = href; };
        if (reduceMotion || !loader.animate) { go(); return; }

        reset();
        loader.hidden = false;
        loader.classList.add("is-active");

        Promise.all([
            animate(bg, [{ opacity: 0 }, { opacity: 1 }], { duration: T.exit, easing: "ease" }),
            animate(mark, [
                { opacity: 0, transform: "scale(0.9)" },
                { opacity: 1, transform: "scale(1)" }
            ], { duration: T.exit, easing: EASE_OUT })
        ]).then(go);

        setTimeout(go, 900);                                 // never get stuck on the overlay
        setTimeout(restore, 9000);                           // navigation stopped/failed: give the page back
    }

    function restore() {
        leaving = false;
        reset();
        loader.hidden = true;
        loader.classList.remove("is-active");
        store(KEY_HANDOFF, null);
    }

    function isPageLink(e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
        var a = e.target.closest && e.target.closest("a[href]");
        if (!a) return null;
        if ((a.target && a.target !== "_self") || a.hasAttribute("download") ||
            a.hasAttribute("data-no-loader") || a.hasAttribute("data-bs-toggle")) return null;

        var url = new URL(a.getAttribute("href"), window.location.href);
        if (!/^(https?|file):$/.test(url.protocol) || url.origin !== window.location.origin) return null;
        // same page (#anchors, href="#"): not a page change
        if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
        return url.href;
    }

    if (mode !== "session") {
        document.addEventListener("click", function (e) {
            var href = isPageLink(e);
            if (!href) return;
            e.preventDefault();
            leave(href);
        });
    }

    // back/forward cache: the page comes back exactly as we left it (overlay up) → clear it
    window.addEventListener("pageshow", function (e) {
        if (e.persisted && leaving) restore();
    });

    arrive();
})();
