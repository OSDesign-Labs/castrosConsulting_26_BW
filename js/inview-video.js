/* ==========================================================
   IN-VIEW VIDEOS
   Any <video data-inview-play muted loop playsinline preload="none">
   starts playing only when it is on screen (and visible: a closed
   accordion tab or a closed modal doesn't count) and pauses when it
   leaves. Nothing is downloaded until the first time it shows up.
   People who asked their system for reduced motion get the poster only.
   The hero carousel videos (.hs-video) are handled by js/hero-carousel.js.
   ========================================================== */
(function () {
    "use strict";

    var videos = Array.prototype.slice.call(document.querySelectorAll("video[data-inview-play]"));
    if (!videos.length) return;

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;                                   // keep the poster, never autoplay

    function shown(v) {                                   // laid out and not hidden by a parent
        return v.offsetParent !== null && v.getBoundingClientRect().width > 0;
    }

    function play(v) {
        if (!shown(v)) return;
        v.muted = true;                                   // autoplay is only allowed when muted
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* blocked (data saver, low power): poster stays */ });
    }

    function stop(v) { if (!v.paused) v.pause(); }

    if (!("IntersectionObserver" in window)) {
        videos.forEach(play);
        return;
    }

    var onScreen = new Set();
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { onScreen.add(e.target); play(e.target); }
            else { onScreen.delete(e.target); stop(e.target); }
        });
    }, { threshold: 0.25 });

    videos.forEach(function (v) { io.observe(v); });

    // re-check after things that show/hide videos without scrolling:
    // accordion tabs opening, Bootstrap modals opening/closing, tab visibility
    function recheck() {
        onScreen.forEach(function (v) { if (shown(v)) play(v); else stop(v); });
    }
    document.addEventListener("click", function () { setTimeout(recheck, 450); });
    document.addEventListener("shown.bs.modal", recheck);
    document.addEventListener("hidden.bs.modal", recheck);
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) videos.forEach(stop); else recheck();
    });
})();
