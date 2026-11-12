/* ==========================================================
   CONSULTORIA PAGE (html/consultoria.html)
   Testimonials: the arrows scroll the card row one card at a time;
   they are hidden when every card already fits (wide screens) and
   disabled at either end.
   ========================================================== */
(function () {
    "use strict";

    /* TESTIMONIAL ARROWS */
    var track = document.querySelector("[data-cs-track]");
    var arrows = document.querySelector("[data-cs-arrows]");
    if (track && arrows) {
        var prev = arrows.querySelector("[data-cs-prev]");
        var next = arrows.querySelector("[data-cs-next]");

        var step = function () {
            var card = track.firstElementChild;
            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
        };

        var update = function () {
            var max = track.scrollWidth - track.clientWidth;
            arrows.hidden = max <= 2;
            prev.disabled = track.scrollLeft <= 2;
            next.disabled = track.scrollLeft >= max - 2;
        };

        prev.addEventListener("click", function () { track.scrollBy({ left: -step() }); });
        next.addEventListener("click", function () { track.scrollBy({ left: step() }); });
        track.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        document.addEventListener("i18n:change", update);   // English text can change card heights, not widths, but cheap to re-check
        update();
    }
})();
