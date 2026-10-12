/* ==========================================================
   SECONDARY NAVBAR (top bar: location, hours, phone, socials)
   Shown while the first section of the page (the hero) is on
   screen; folds away once it is scrolled past, so the navbar
   goes back to its normal height. Desktop only: below 992px the
   bar is hidden and the same info sits at the bottom of the menu.
   Markup: .topbar inside #mainNavbar. Styles: .topbar in
   css/home.css / css/services.css.
   ========================================================== */
(function () {
    "use strict";

    var navbar = document.getElementById("mainNavbar");
    if (!navbar || !navbar.querySelector(".topbar")) return;

    // the hero on the home page, the page header on the other pages
    var first = document.querySelector("main > .hero, main > .page-hero") ||
                document.querySelector("main > section");
    if (!first) return;

    function setCollapsed(collapsed) {
        navbar.classList.toggle("topbar-collapsed", collapsed);
    }

    if ("IntersectionObserver" in window) {
        // -110px: the section counts as gone once its bottom slides under the navbar
        new IntersectionObserver(function (entries) {
            setCollapsed(!entries[0].isIntersecting);
        }, { rootMargin: "-110px 0px 0px 0px", threshold: 0 }).observe(first);
    } else {
        var check = function () { setCollapsed(first.getBoundingClientRect().bottom < 110); };
        window.addEventListener("scroll", check, { passive: true });
        check();
    }
})();
