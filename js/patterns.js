/* ==========================================================
   PATTERNS + PARALLAX (styles in css/patterns.css)

   Gives every section a soft pattern.css texture in one corner,
   behind its content:
   - it picks the corner with the LEAST TEXT in it (measured from
     where the words actually sit on screen), so the texture stays
     out of the copy; picked again when the screen size changes;
     if even that corner has text, the patch shows at half strength;
   - two neighbouring sections never put patches on the same side
     of their shared edge, so patches never run into each other;
   - the pattern changes from section to section;
   - cyan on dark sections, navy on light ones (read from the
     section's background colour);
   - it fades in when the section comes into view, drifts slowly,
     and moves at its own speed while you scroll (parallax).

   Left out: the hero carousel (photos and video), the testimonials
   (a white panel fills them) and very short strips. Any other section
   can opt out with data-pattern="none".
   ========================================================== */
(function () {
    "use strict";

    var PATTERNS = ["pattern-dots-lg", "pattern-diagonal-lines-md", "pattern-cross-dots-lg", "pattern-grid-lg"];
    var CORNERS = ["tr", "bl", "br", "tl"];                    // preferred order when two corners tie
    var SPEED = { tr: 0.14, bl: -0.1, br: 0.18, tl: -0.12 };   // parallax: share of the scroll the patch moves by
    var SKIP = ".hero-carousel, #testimonials, [data-pattern='none']";
    // a section can name its own pattern and corner: data-pattern="pattern-grid-lg tr" (all footers use it)
    var MIN_HEIGHT = 260;                                      // px: thinner strips have no room for a patch
    var QUIET_AT = 4000;                                       // px² of text still under the best corner: show it at half strength

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // dark or light background? a transparent section shows the page's dark navy gradient
    function tone(section) {
        var m = getComputedStyle(section).backgroundColor.match(/[\d.]+/g);
        if (!m || (m.length > 3 && +m[3] < 0.5)) return "dark";
        var lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        return lum < 0.45 ? "dark" : "light";
    }

    /* ---------- build one patch per section ---------- */
    var items = [];
    document.querySelectorAll("main > section, body > footer").forEach(function (section) {
        if (section.matches(SKIP) || section.offsetHeight < MIN_HEIGHT) return;
        var i = items.length;
        var own = (section.getAttribute("data-pattern") || "").split(/\s+/);
        var ownPattern = own.filter(function (t) { return /^pattern-/.test(t); })[0];
        var ownCorner = own.filter(function (t) { return /^(tr|tl|br|bl)$/.test(t); })[0];
        var wrap = document.createElement("div");
        wrap.className = "cc-pattern cc-pattern--on-" + tone(section) + (i % 2 ? " cc-pattern--slow" : "");
        wrap.setAttribute("aria-hidden", "true");
        wrap.innerHTML = '<div class="cc-pattern__layer"><div class="cc-pattern__reveal">' +
            '<div class="cc-pattern__tile ' + (ownPattern || PATTERNS[(i + Math.floor(i / 4)) % 4]) + '"></div></div></div>';
        section.classList.add("has-pattern");
        section.insertBefore(wrap, section.firstChild);
        items.push({ section: section, wrap: wrap, layer: wrap.firstChild, corner: null, fixedCorner: ownCorner || null, visible: false });
    });
    if (!items.length) return;

    /* ---------- choose each patch's corner: the one with the least text ---------- */
    function textBoxes(section) {
        var boxes = [], range = document.createRange();
        var walk = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) { return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
        });
        while (walk.nextNode()) {
            range.selectNodeContents(walk.currentNode);
            var rects = range.getClientRects();
            for (var j = 0; j < rects.length; j++) if (rects[j].width && rects[j].height) boxes.push(rects[j]);
        }
        return boxes;
    }

    function overlap(a, b) {
        var w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        var h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return w > 0 && h > 0 ? w * h : 0;
    }

    function placeAll() {
        var prev = null;
        items.forEach(function (it, i) {
            it.layer.style.transform = "";                         // measure without the parallax shift
            var boxes = textBoxes(it.section);
            var s = it.section.getBoundingClientRect();
            var best = null, bestScore = Infinity;
            for (var c = 0; c < 4; c++) {
                var corner = it.fixedCorner || CORNERS[(i + c) % 4];   // rotate the tie-break order section by section
                if (it.fixedCorner && c > 0) break;                // corner named in data-pattern: just measure it
                // never the top of the same side where the section above ends with a patch
                if (!it.fixedCorner && prev === "bl" && corner === "tl") continue;
                if (!it.fixedCorner && prev === "br" && corner === "tr") continue;
                it.wrap.classList.remove("cc-pattern--" + it.corner);
                it.wrap.classList.add("cc-pattern--" + corner);
                it.corner = corner;
                var r = it.layer.getBoundingClientRect();
                // the strong middle of the patch (its edges fade out), cut to the visible section
                var core = {
                    left: Math.max(s.left, r.left + r.width * 0.15), right: Math.min(s.right, r.right - r.width * 0.15),
                    top: Math.max(s.top, r.top + r.height * 0.15), bottom: Math.min(s.bottom, r.bottom - r.height * 0.15)
                };
                var score = 0;
                for (var b = 0; b < boxes.length; b++) score += overlap(boxes[b], core);
                if (score < bestScore - 1) { bestScore = score; best = corner; }
            }
            it.wrap.classList.remove("cc-pattern--" + it.corner);
            it.wrap.classList.add("cc-pattern--" + best);
            it.wrap.setAttribute("data-text-overlap", Math.round(bestScore));   // px² of text under the patch (for testing)
            it.wrap.classList.toggle("cc-pattern--quiet", bestScore > QUIET_AT);  // every corner has text: step back
            it.corner = best;
            it.speed = SPEED[best];
            prev = best;
        });
    }
    placeAll();

    // text moves when the web fonts arrive or the layout changes width: choose again
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeAll(); requestScroll(); });
    var lastWidth = window.innerWidth, resizeTimer;
    window.addEventListener("resize", function () {
        if (window.innerWidth === lastWidth) return;               // phones fire resize when the address bar hides
        lastWidth = window.innerWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { placeAll(); requestScroll(); }, 250);
    });

    /* ---------- fade in when the section comes into view ---------- */
    if (reduceMotion || !("IntersectionObserver" in window)) {
        items.forEach(function (it) { it.wrap.classList.add("is-in"); it.visible = true; });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var it = items.filter(function (x) { return x.section === e.target; })[0];
                it.visible = e.isIntersecting;
                if (e.isIntersecting) it.wrap.classList.add("is-in");     // stays in once shown
            });
            requestScroll();
        }, { rootMargin: "120px 0px", threshold: 0.12 });
        items.forEach(function (it) { io.observe(it.section); });
    }

    /* ---------- parallax ---------- */
    var ticking = false;
    function update() {
        ticking = false;
        if (reduceMotion) return;
        var vh = window.innerHeight;
        var amount = window.innerWidth < 768 ? 0.5 : 1;          // gentler on phones
        // read every position first, then write, so the browser lays out once
        var moves = items.map(function (it) {
            if (!it.visible) return null;
            var r = it.section.getBoundingClientRect();
            return -((r.top + r.height / 2) - vh / 2) * it.speed * amount;
        });
        items.forEach(function (it, i) {
            if (moves[i] !== null) it.layer.style.transform = "translate3d(0," + moves[i].toFixed(1) + "px,0)";
        });
    }
    function requestScroll() {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", requestScroll, { passive: true });
    requestScroll();
})();
