/* ==========================================================
   MOTION · parallax between sections (styles in css/motion.css)

   While you scroll from one section to the next, the content moves
   a little slower than the page, so sections slide past each other
   with a sense of depth.
   - When a section sits where the page snaps (its top just under the
     navbar) its content is exactly where the design puts it.
   - The shift grows softly as the section moves away, up to 40px,
     and never more than ~half the section's own top/bottom space,
     so content never leaves its coloured band.
   - It uses the CSS "translate" property, which adds to the AOS
     animations instead of replacing them.

   Left out: the hero carousel, and sections a link jumps into (the
   contact form, Consultoria's 4 steps), so those links still land
   exactly. Any section can opt out with data-parallax="none".
   Off for visitors who ask for reduced motion.
   ========================================================== */
(function () {
    "use strict";

    var STRENGTH = 0.06;          // share of the scroll the content lags behind
    var MAX = 40;                 // px, never more than this
    var ROOM = 0.45;              // ...nor more than this share of the section's padding
    var SKIP = ".hero-carousel, .contact-section, [data-parallax='none']";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* ---------- parallax between sections ---------- */
    // Moving a block makes it the reference point for anything "position: fixed" inside it
    // (a pop-up would stop covering the screen) and for "position: absolute" pieces that
    // were placed against the section. Such blocks are left still.
    function safeToMove(el) {
        if (getComputedStyle(el).position !== "static") {
            return !Array.prototype.some.call(el.querySelectorAll("*"), function (d) { return getComputedStyle(d).position === "fixed"; });
        }
        return !Array.prototype.some.call(el.querySelectorAll("*"), function (d) {
            var pos = getComputedStyle(d).position;
            if (pos === "fixed") return true;
            if (pos !== "absolute") return false;
            for (var a = d.parentElement; a && a !== el; a = a.parentElement) {
                if (getComputedStyle(a).position !== "static") return false;   // placed against something inside the block
            }
            return true;                                                        // placed against the section itself
        });
    }

    var items = [];
    document.querySelectorAll("main > section").forEach(function (section) {
        if (section.matches(SKIP) || section.querySelector("#contact-form, #processo")) return;
        // the content blocks, not the decorations (pattern patch, glow), and never a block
        // that would change how something inside it is positioned once it moves
        var parts = Array.prototype.filter.call(section.children, function (el) {
            return !el.matches(".cc-pattern, .glow, script, style") && safeToMove(el);
        });
        if (!parts.length) return;
        parts.forEach(function (el) { el.classList.add("cc-drift"); });
        items.push({ section: section, parts: parts, visible: false, anchor: 0, up: MAX, down: MAX });
    });
    if (!items.length) return;

    // how far each section's content may move: a section with its own background
    // keeps its content inside that band; a see-through one can use the full 40px
    function measure() {
        items.forEach(function (it) {
            var cs = getComputedStyle(it.section);
            var bg = cs.backgroundImage !== "none" || !/^rgba\([^)]*,\s*0\)$|transparent/.test(cs.backgroundColor);
            it.anchor = parseFloat(cs.scrollMarginTop) || 0;      // where the page snaps it (under the navbar)
            it.up = bg ? Math.min(MAX, parseFloat(cs.paddingTop) * ROOM) : MAX;
            it.down = bg ? Math.min(MAX, parseFloat(cs.paddingBottom) * ROOM) : MAX;
        });
    }
    measure();

    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                items.forEach(function (it) { if (it.section === e.target) it.visible = e.isIntersecting; });
            });
            request();
        }, { rootMargin: "200px 0px" });
        items.forEach(function (it) { io.observe(it.section); });
    } else {
        items.forEach(function (it) { it.visible = true; });
    }

    var ticking = false;
    function update() {
        ticking = false;
        var amount = window.innerWidth < 768 ? 0.5 : 1;          // gentler on phones
        // read every position first, then write, so the browser lays out once
        var moves = items.map(function (it) {
            if (!it.visible) return null;
            var raw = (it.anchor - it.section.getBoundingClientRect().top) * STRENGTH * amount;
            var cap = (raw < 0 ? it.up : it.down) * amount;
            return cap > 0 ? cap * Math.tanh(raw / cap) : 0;      // soft limit: eases into the cap, no hard stop
        });
        items.forEach(function (it, i) {
            if (moves[i] === null) return;
            var v = "0 " + moves[i].toFixed(1) + "px";
            it.parts.forEach(function (el) { el.style.translate = v; });
        });
    }
    function request() {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", function () { measure(); request(); });
    request();
})();
