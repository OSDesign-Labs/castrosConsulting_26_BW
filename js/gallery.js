/* ==========================================================
   GALLERY (index.html, .g-marquee)
   The photos drift left in one endless row (CSS animation in home.css).
   For the loop to have no jump, the row is copied once here and the
   animation moves the track by exactly half its width. The speed is set
   in pixels per second so it stays the same slow pace on every screen.
   The copies are hidden from screen readers and keyboard.
   ========================================================== */
(function () {
    "use strict";

    var track = document.querySelector(".g-marquee .g-track");
    if (!track) return;
    var SPEED = 35;   // px per second: slow

    Array.prototype.slice.call(track.children).forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        var img = copy.querySelector("img");
        if (img) { img.alt = ""; img.removeAttribute("data-i18n-attr"); }
        track.appendChild(copy);
    });

    function setSpeed() {
        var half = track.scrollWidth / 2;
        if (half) track.style.setProperty("--g-dur", (half / SPEED).toFixed(1) + "s");
    }
    setSpeed();
    window.addEventListener("resize", setSpeed);
})();
