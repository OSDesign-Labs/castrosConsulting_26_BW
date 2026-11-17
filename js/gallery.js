/* ==========================================================
   GALLERY (index.html, .g-marquee)
   1. The photos drift left in one endless row. The row is copied once so
      the loop has no gap: the position wraps every half of the track, and
      since both halves are the same the jump can't be seen. The speed is in
      pixels per second, so it is the same slow pace on every screen.
      It pauses while the mouse is on the row, while a photo in it has
      keyboard focus, while a photo is open, and while the row is off screen.
      With "reduce motion" on it does not drift; the buttons still work.
   2. The buttons under the row slide it 3 photos: left arrow to the left,
      right arrow to the right. Then the drift carries on.
   3. Clicking a photo opens it full view: it grows from where it sits in
      the row (tilt and crop included) to the whole picture in the middle of
      the screen. Closing (click anywhere, ×, or Esc) shrinks it back.
   ========================================================== */
(function () {
    "use strict";

    var section = document.querySelector(".g-section");
    var marquee = section && section.querySelector(".g-marquee");
    var track = marquee && marquee.querySelector(".g-track");
    if (!track) return;

    var SPEED = 35;        // px per second: slow
    var STEP_PHOTOS = 3;   // how far one button press slides the row
    var SLIDE_MS = 700;    // how long that slide takes
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---------- each photo becomes a button (keyboard + screen readers) ---------- */
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (li, i) {
        var img = li.querySelector("img");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "g-open";
        btn.setAttribute("data-g", i);
        li.insertBefore(btn, img);
        btn.appendChild(img);
    });

    /* ---------- copy the row once so the loop never shows a gap ---------- */
    originals.forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.querySelector("button").tabIndex = -1;
        var img = copy.querySelector("img");
        img.alt = "";
        img.removeAttribute("data-i18n-attr");
        track.appendChild(copy);
    });

    /* ---------- the drift ---------- */
    var x = 0;               // how far the row has moved (px, grows negative); wrapped only when drawn
    var half = 0;            // width of one copy of the row
    var slide = null;        // a button slide in progress: { from, to, start, ms }
    var hover = false, kbFocus = false, held = false, onScreen = true;
    var last = 0;

    function measure() { half = track.scrollWidth / 2; }
    function step() { var it = track.querySelector(".g-item"); return it ? it.offsetWidth : 0; }
    function draw() {
        if (!half) return;
        var w = ((x % half) - half) % half;            // always between -half and 0
        track.style.transform = "translate3d(" + w.toFixed(2) + "px, 0, 0)";
    }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function tick(now) {
        var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        if (slide) {
            var p = Math.min((now - slide.start) / slide.ms, 1);
            x = slide.from + (slide.to - slide.from) * ease(p);
            if (p === 1) slide = null;
        } else if (!hover && !kbFocus && !held && onScreen && !reduced.matches) {
            x -= SPEED * dt;
        }
        draw();
        requestAnimationFrame(tick);
    }

    measure(); draw();
    requestAnimationFrame(tick);
    window.addEventListener("resize", function () { measure(); draw(); });
    window.addEventListener("load", function () { measure(); draw(); });

    marquee.addEventListener("mouseenter", function () { hover = true; });
    marquee.addEventListener("mouseleave", function () { hover = false; });
    marquee.addEventListener("focusin", function (e) { kbFocus = e.target.matches(":focus-visible"); });
    marquee.addEventListener("focusout", function () { kbFocus = false; });
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(marquee);
    }

    /* ---------- the buttons: slide 3 photos left or right ---------- */
    section.querySelectorAll("[data-g-dir]").forEach(function (b) {
        b.addEventListener("click", function () {
            var dir = +b.getAttribute("data-g-dir");          // -1 left, 1 right
            var base = slide ? slide.to : x;                   // pressing again mid-slide adds 3 more
            slide = { from: x, to: base + dir * STEP_PHOTOS * step(), start: performance.now(), ms: reduced.matches ? 1 : SLIDE_MS };
        });
    });

    /* ---------- full view ---------- */
    var open = null;
    var EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
    var OPEN_MS = 260, CLOSE_MS = 220;

    function isEn() { return /^en/i.test(document.documentElement.lang || ""); }

    // where the card sits in the row: its untilted box, its tilt and its crop
    function thumbState(card) {
        var img = card.querySelector("img");
        var r = card.getBoundingClientRect();          // box around the tilted card; its centre is the card's centre
        var m = new DOMMatrix(getComputedStyle(card).transform);
        var k = Math.hypot(m.a, m.b) || 1;              // the hover zoom, if the mouse is on it
        var w = card.offsetWidth * k, h = card.offsetHeight * k;
        var deg = Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI * 100) / 100;
        return {
            left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2,
            width: w, height: h, rotate: deg,
            radius: getComputedStyle(card).borderRadius,
            pos: getComputedStyle(img).objectPosition
        };
    }

    // the whole picture, as big as fits in the middle of the screen
    function fullState(card) {
        var img = card.querySelector("img");
        var ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 4 / 3;
        var maxW = window.innerWidth * (window.innerWidth < 768 ? 0.94 : 0.88);
        var maxH = window.innerHeight * 0.84;
        var w = Math.min(maxW, maxH * ratio), h = w / ratio;
        return {
            left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2,
            width: w, height: h, rotate: 0, radius: "14px", pos: "50% 50%"
        };
    }

    function frame(s) {
        return {
            left: s.left + "px", top: s.top + "px", width: s.width + "px", height: s.height + "px",
            transform: "rotate(" + s.rotate + "deg)", borderRadius: s.radius
        };
    }

    function openPhoto(card, byKeyboard) {
        if (open) return;
        var thumb = card.querySelector("img");
        var label = originals[+card.getAttribute("data-g")].querySelector("img").alt;
        held = true;                                   // stop the drift so the photo can go back to the same spot
        slide = null;

        var back = document.createElement("div");
        back.className = "g-lb-back";
        var box = document.createElement("div");
        box.className = "g-lb";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", label);
        var big = document.createElement("img");
        big.src = thumb.currentSrc || thumb.src;
        big.alt = label;
        box.appendChild(big);
        var closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "g-lb-close";
        closeBtn.setAttribute("aria-label", isEn() ? "Close" : "Fechar");
        closeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
        document.body.append(back, box, closeBtn);

        var from = thumbState(card), to = fullState(card);
        Object.assign(box.style, frame(to));
        big.style.objectPosition = to.pos;
        card.style.visibility = "hidden";             // the photo "lifts out" of the row
        document.documentElement.classList.add("g-lb-on");

        var t = reduced.matches ? 0 : OPEN_MS;
        box.animate([frame(from), frame(to)], { duration: t, easing: EASE });
        big.animate([{ objectPosition: from.pos }, { objectPosition: to.pos }], { duration: t, easing: EASE });
        back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t || 120, easing: "ease-out" });
        closeBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: t * 0.5, fill: "backwards" });

        open = { box: box, big: big, back: back, closeBtn: closeBtn, card: card, to: to, kb: byKeyboard };
        closeBtn.focus({ preventScroll: true });
    }

    function closePhoto() {
        if (!open || open.closing) return;
        var o = open; o.closing = true;
        var from = thumbState(o.card);
        var t = reduced.matches ? 0 : CLOSE_MS;
        o.closeBtn.remove();
        o.back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t || 120, fill: "forwards" });
        o.big.animate([{ objectPosition: o.to.pos }, { objectPosition: from.pos }], { duration: t, easing: EASE, fill: "forwards" });
        var anim = o.box.animate([frame(o.to), frame(from)], { duration: t, easing: EASE, fill: "forwards" });
        anim.onfinish = function () {
            o.card.style.visibility = "";
            o.box.remove(); o.back.remove();
            document.documentElement.classList.remove("g-lb-on");
            held = false;
            if (o.kb) o.card.focus({ preventScroll: true });   // keyboard users land back on the photo
            open = null;
        };
    }

    track.addEventListener("click", function (e) {
        var card = e.target.closest(".g-open");
        if (card) openPhoto(card, e.detail === 0);   // detail 0: Enter / Space, not a mouse or tap
    });
    document.addEventListener("click", function (e) {
        if (open && !e.target.closest(".g-open")) closePhoto();   // a click anywhere closes it
    });
    document.addEventListener("keydown", function (e) {
        if (!open) return;
        if (e.key === "Escape") { e.preventDefault(); closePhoto(); }
        else if (e.key === "Tab" && !open.closing) { e.preventDefault(); open.closeBtn.focus(); }   // keep focus in the full view
    });
    window.addEventListener("resize", function () {
        if (open && !open.closing) { open.to = fullState(open.card); Object.assign(open.box.style, frame(open.to)); }
    });
})();
