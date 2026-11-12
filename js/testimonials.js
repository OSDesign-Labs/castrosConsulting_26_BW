/* Testemunhos em vídeo (section#testimonials.tv, styled in css/testimonials.css).

   How it works
   - The people are plain HTML buttons (.tv-item) in the page, each with data-src (the video)
     and data-poster (the still image). To add, remove or rename someone, edit the HTML.
   - Nothing is downloaded until someone presses play (preload="none"): the page only loads
     the small still images, so the 4 videos cost visitors nothing unless they watch.
   - Choosing a person swaps the video on the stage and plays it with sound.
   - A video pauses by itself when the section leaves the screen.
*/
(function () {
    "use strict";

    var section = document.querySelector("#testimonials.tv");
    if (!section) return;

    var stage = section.querySelector(".tv-stage");
    var video = stage.querySelector("video");
    var playBtn = stage.querySelector(".tv-play");
    var capName = stage.querySelector(".tv-caption .tv-name");
    var capRole = stage.querySelector(".tv-caption .tv-role");
    var items = Array.prototype.slice.call(section.querySelectorAll(".tv-item"));
    if (!items.length) return;

    var current = items[0];

    function text(el, sel) {
        var n = el.querySelector(sel);
        return n ? n.textContent : "";
    }

    // put a person on the stage (without playing)
    function show(item) {
        current = item;
        items.forEach(function (it) {
            it.setAttribute("aria-pressed", it === item ? "true" : "false");
        });
        capName.textContent = text(item, ".tv-name");
        capRole.textContent = text(item, ".tv-role");
        stage.classList.remove("is-playing");
        video.controls = false;
        video.pause();
        video.poster = item.getAttribute("data-poster");
        video.src = item.getAttribute("data-src");
        video.load();                       // back to the still image of the new video
    }

    function play() {
        stage.classList.add("is-playing");
        video.controls = true;
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* the browser refused: its own controls are there */ });
    }

    items.forEach(function (item) {
        item.addEventListener("click", function () {
            if (item !== current) show(item);
            play();
            // on phones the list sits under the video: bring the video back into view
            if (stage.getBoundingClientRect().top < 0) {
                stage.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    });

    playBtn.addEventListener("click", play);

    // finished: show the next person, ready to play (it never starts by itself)
    video.addEventListener("ended", function () {
        var next = items[(items.indexOf(current) + 1) % items.length];
        show(next);
    });

    // scrolled away: pause
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting && !video.paused) video.pause();
        }, { threshold: 0.15 }).observe(stage);
    }

    // language switched (js/i18n.js): the role under the name on the stage follows
    document.addEventListener("i18n:change", function () {
        capRole.textContent = text(current, ".tv-role");
    });

    // first paint: the caption of the first person (the video tag already has its poster)
    capName.textContent = text(current, ".tv-name");
    capRole.textContent = text(current, ".tv-role");
})();
