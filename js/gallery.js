/* ==========================================================
   GALLERY (index.html, .g-marquee)
   1. The photos drift left in one endless row (CSS animation in home.css).
      For the loop to have no jump, the row is copied once here and the
      animation moves the track by exactly half its width. The speed is set
      in pixels per second so it stays the same slow pace on every screen.
      The copies are hidden from screen readers and keyboard.
   2. Clicking a photo opens it full view: the photo grows from where it
      sits in the row (tilt and crop included) to the whole picture in the
      middle of the screen. Closing (click anywhere, ×, or Esc) shrinks it
      back into its place. The row stays paused while a photo is open.
   ========================================================== */
(function () {
    "use strict";

    var marquee = document.querySelector(".g-marquee");
    var track = marquee && marquee.querySelector(".g-track");
    if (!track) return;
    var SPEED = 35;   // px per second: slow
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
        var btn = copy.querySelector("button");
        btn.tabIndex = -1;
        var img = copy.querySelector("img");
        img.alt = "";
        img.removeAttribute("data-i18n-attr");
        track.appendChild(copy);
    });

    function setSpeed() {
        var half = track.scrollWidth / 2;
        if (half) track.style.setProperty("--g-dur", (half / SPEED).toFixed(1) + "s");
    }
    setSpeed();
    window.addEventListener("resize", setSpeed);

    /* ---------- full view ---------- */
    var open = null;   // { box, back, closeBtn, thumb, from }
    var EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
    var MS = 420;

    function isEn() { return /^en/i.test(document.documentElement.lang || ""); }

    // where the photo sits in the row: its untilted box, its tilt and its crop
    function thumbState(img) {
        var r = img.getBoundingClientRect();          // box around the tilted photo; its centre is the photo's centre
        var m = new DOMMatrix(getComputedStyle(img).transform);
        var k = Math.hypot(m.a, m.b) || 1;              // the hover zoom, if the mouse is on it
        var w = img.offsetWidth * k, h = img.offsetHeight * k;
        var deg = Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI * 100) / 100;
        return {
            left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2,
            width: w, height: h, rotate: deg,
            radius: getComputedStyle(img).borderRadius,
            pos: getComputedStyle(img).objectPosition
        };
    }

    // the whole picture, as big as fits in the middle of the screen
    function fullState(img) {
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

    function openPhoto(btn, byKeyboard) {
        if (open) return;
        var thumb = btn.querySelector("img");
        var label = originals[+btn.getAttribute("data-g")].querySelector("img").alt;
        marquee.classList.add("is-held");             // stop the drift so the photo can go back to the same spot

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

        var from = thumbState(thumb), to = fullState(thumb);
        Object.assign(box.style, frame(to));
        big.style.objectPosition = to.pos;
        thumb.style.visibility = "hidden";            // the photo "lifts out" of the row
        document.documentElement.classList.add("g-lb-on");

        var t = reduced.matches ? 0 : MS;
        box.animate([frame(from), frame(to)], { duration: t, easing: EASE });
        big.animate([{ objectPosition: from.pos }, { objectPosition: to.pos }], { duration: t, easing: EASE });
        back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t || 150, easing: "ease-out" });
        closeBtn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: t * 0.6, fill: "backwards" });

        open = { box: box, big: big, back: back, closeBtn: closeBtn, thumb: thumb, opener: btn, to: to, kb: byKeyboard };
        closeBtn.focus({ preventScroll: true });
    }

    function closePhoto() {
        if (!open || open.closing) return;
        var o = open; o.closing = true;
        var from = thumbState(o.thumb);
        var t = reduced.matches ? 0 : MS * 0.85;
        o.closeBtn.remove();
        o.back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t || 150, fill: "forwards" });
        o.big.animate([{ objectPosition: o.to.pos }, { objectPosition: from.pos }], { duration: t, easing: EASE, fill: "forwards" });
        var anim = o.box.animate([frame(o.to), frame(from)], { duration: t, easing: EASE, fill: "forwards" });
        anim.onfinish = function () {
            o.thumb.style.visibility = "";
            o.box.remove(); o.back.remove();
            document.documentElement.classList.remove("g-lb-on");
            marquee.classList.remove("is-held");
            if (o.kb) o.opener.focus({ preventScroll: true });   // keyboard users land back on the photo
            open = null;
        };
    }

    track.addEventListener("click", function (e) {
        var btn = e.target.closest(".g-open");
        if (btn) openPhoto(btn, e.detail === 0);   // detail 0: Enter / Space, not a mouse or tap
    });
    document.addEventListener("click", function (e) {
        if (open && !e.target.closest(".g-open")) closePhoto();   // a click anywhere closes it
    });
    document.addEventListener("keydown", function (e) {
        if (!open) return;
        if (e.key === "Escape") { e.preventDefault(); closePhoto(); }
        else if (e.key === "Tab") { e.preventDefault(); open.closeBtn.focus(); }   // keep focus in the full view
    });
    window.addEventListener("resize", function () {
        if (open && !open.closing) { open.to = fullState(open.thumb); Object.assign(open.box.style, frame(open.to)); }
    });
})();
