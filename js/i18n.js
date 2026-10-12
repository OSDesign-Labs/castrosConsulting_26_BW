/* ==========================================================
   PT / EN TRANSLATION
   - The HTML is written in Portuguese, and the HTML stays the one
     place to edit the Portuguese: switching back to PT puts back
     exactly what the page was written with.
   - Every translatable piece carries a key:
       data-i18n="key"            → textContent
       data-i18n-html="key"       → innerHTML (only for text with <br>)
       data-i18n-attr="attr:key;attr:key" → attributes (placeholder,
                                     aria-label, alt, title…)
   - The English lives in translations.json, next to this file.
     It is fetched the first time it is needed: straight away if the
     visitor chose English before, otherwise when they click EN.
     Its "pt" section holds the Portuguese the scripts need, plus a
     copy of the page text for reference (?i18n-debug says when the
     page and that copy no longer match, i.e. the English may be out
     of date).
   - The language buttons ([data-lang]) get a click listener.
   - The choice is remembered (localStorage) for the next visit.
   - Scripts that build text themselves (events, contact form,
     carousel) listen for "i18n:change" and use CastrosI18n.t().
   - ?lang=en / ?lang=pt in the address overrides the saved choice.
   - ?i18n-debug lists missing keys and outdated entries in the console.

   Needs a web server (Live Server, hosting…): browsers block
   fetch() for pages opened straight from disk (file://).
   ========================================================== */
(function () {
    "use strict";

    var STORAGE_KEY = "cc-lang";
    var LANGS = ["pt", "en"];
    var BASE = "pt";                                       // the language the HTML is written in
    var script = document.currentScript;
    var JSON_URL = new URL("translations.json", script ? script.src : window.location.href).href;
    var DEBUG = /[?&]i18n-debug\b/.test(window.location.search);
    var root = document.documentElement;
    var BASE_HTML_LANG = root.getAttribute("lang") || "pt";

    var db = null;          // parsed translations.json
    var loading = null;     // the fetch, while it runs
    var current = BASE;     // language currently on screen
    var original = new WeakMap();   // element → the Portuguese it was written with
    var readyResolve;
    var ready = new Promise(function (resolve) { readyResolve = resolve; });

    var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

    /* ---------- saved choice ---------- */
    function readChoice() {
        var m = window.location.search.match(/[?&]lang=(pt|en)\b/);
        if (m) return m[1];
        try {
            var saved = window.localStorage.getItem(STORAGE_KEY);
            return LANGS.indexOf(saved) !== -1 ? saved : null;
        } catch (e) { return null; }       // private mode / storage blocked
    }

    function saveChoice(lang) {
        try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* not remembered, still works */ }
    }

    /* ---------- the Portuguese written in the HTML ---------- */
    function attrPairs(el) {
        return el.getAttribute("data-i18n-attr").split(";").map(function (pair) {
            var i = pair.indexOf(":");
            return i < 1 ? null : { attr: pair.slice(0, i).trim(), key: pair.slice(i + 1).trim() };
        }).filter(Boolean);
    }

    // stored once per element, before anything is translated
    function remember(el) {
        var o = original.get(el);
        if (!o) { o = { attrs: {} }; original.set(el, o); }
        if (el.hasAttribute("data-i18n") && !has(o, "text")) o.text = el.textContent;
        if (el.hasAttribute("data-i18n-html") && !has(o, "html")) o.html = el.innerHTML;
        if (el.hasAttribute("data-i18n-attr")) {
            attrPairs(el).forEach(function (p) {
                if (!has(o.attrs, p.attr)) o.attrs[p.attr] = el.getAttribute(p.attr);
            });
        }
        return o;
    }

    function tagged() { return document.querySelectorAll("[data-i18n],[data-i18n-html],[data-i18n-attr]"); }

    /* ---------- the JSON ---------- */
    function load() {
        if (db) return Promise.resolve(db);
        if (!loading) {
            loading = fetch(JSON_URL, { credentials: "same-origin" })
                .then(function (res) {
                    if (!res.ok) throw new Error("HTTP " + res.status);
                    return res.json();
                })
                .then(function (data) {
                    if (!data || !data[BASE] || !data.en || !data._meta) throw new Error("unexpected format");
                    db = data;
                    if (DEBUG) audit();
                    return data;
                })
                .catch(function (err) {
                    loading = null;                          // allow a retry on the next click
                    if (window.location.protocol === "file:") {
                        console.error("[i18n] translations.json can't be loaded from a file:// page. " +
                            "Open the site through a web server (e.g. VS Code Live Server).");
                    } else {
                        console.error("[i18n] Could not load " + JSON_URL + ":", err);
                    }
                    throw err;
                });
        }
        return loading;
    }

    function dict(lang) { return (db && db[lang]) || {}; }

    // text for a key in the current language; fallback when the key isn't in the JSON
    function t(key, fallback, vars) {
        var value = dict(current)[key];
        if (value === undefined && current !== BASE) value = dict(BASE)[key];
        if (value === undefined) value = fallback;
        if (value === undefined) value = "";
        if (typeof value === "string" && vars) {
            value = value.replace(/\{(\w+)\}/g, function (m, name) {
                return vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : m;
            });
        }
        return value;
    }

    /* ---------- put a language on the page ---------- */
    function apply(lang) {
        var toBase = lang === BASE;
        var d = dict(lang);
        var missing = [];

        // English from the JSON; the Portuguese always from the HTML itself
        function pick(key, pt) {
            if (toBase) return pt;
            if (has(d, key)) return d[key];
            missing.push(key);
            return pt;                                      // never leave a key or a blank on screen
        }

        tagged().forEach(function (el) {
            var o = remember(el);
            var key = el.getAttribute("data-i18n");
            if (key !== null) {
                var text = pick(key, o.text);
                if (el.textContent !== text) el.textContent = text;
            }
            key = el.getAttribute("data-i18n-html");
            if (key !== null) {
                var html = pick(key, o.html);
                if (el.innerHTML !== html) el.innerHTML = html;      // trusted: our own HTML / JSON
            }
            if (el.hasAttribute("data-i18n-attr")) {
                attrPairs(el).forEach(function (p) {
                    var v = pick(p.key, o.attrs[p.attr]);
                    if (v === null || v === undefined) el.removeAttribute(p.attr);
                    else if (el.getAttribute(p.attr) !== v) el.setAttribute(p.attr, v);
                });
            }
        });

        current = lang;
        root.setAttribute("lang", toBase ? BASE_HTML_LANG : db._meta.languages[lang].htmlLang);
        updateButtons(false);

        if (missing.length) {                               // a key in the HTML that the JSON doesn't have
            console.warn("[i18n] " + missing.length + " key(s) missing in '" + lang + "' (left in Portuguese):",
                DEBUG ? missing : missing.slice(0, 5));
        }
        document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: lang } }));
    }

    // ?i18n-debug: page text that no longer matches the reference copy in translations.json
    function audit() {
        var pt = dict(BASE), en = dict("en"), outdated = [], missing = [];
        var n = function (s) {
            return String(s === null || s === undefined ? "" : s).replace(/<br\s*\/?>/gi, "<br>").replace(/\s+/g, " ").trim();
        };
        function check(key, value) {
            if (!has(en, key)) missing.push(key);
            else if (has(pt, key) && n(pt[key]) !== n(value)) outdated.push(key);
        }
        tagged().forEach(function (el) {
            var o = remember(el);
            if (el.hasAttribute("data-i18n")) check(el.getAttribute("data-i18n"), o.text);
            if (el.hasAttribute("data-i18n-html")) check(el.getAttribute("data-i18n-html"), o.html);
            if (el.hasAttribute("data-i18n-attr")) attrPairs(el).forEach(function (p) { check(p.key, o.attrs[p.attr]); });
        });
        if (missing.length) console.warn("[i18n] keys with no English:", missing);
        if (outdated.length) console.warn("[i18n] Portuguese changed in the HTML since the English was written " +
            "(update translations.json):", outdated);
        if (!missing.length && !outdated.length) console.info("[i18n] all " + tagged().length + " tagged elements have up-to-date English");
    }

    /* ---------- the buttons ---------- */
    function buttons() { return document.querySelectorAll("[data-lang]"); }

    function updateButtons(busy) {
        buttons().forEach(function (btn) {
            var on = btn.getAttribute("data-lang") === current;
            btn.setAttribute("aria-pressed", String(on));
            btn.classList.toggle("is-active", on);
        });
        document.querySelectorAll(".lang-switch").forEach(function (sw) {
            sw.classList.toggle("is-busy", !!busy);
            if (busy) sw.setAttribute("aria-busy", "true"); else sw.removeAttribute("aria-busy");
        });
    }

    function setLanguage(lang) {
        if (LANGS.indexOf(lang) === -1) return Promise.resolve(current);
        saveChoice(lang);
        if (lang === current) { updateButtons(false); return Promise.resolve(current); }
        updateButtons(true);
        return load().then(function () {
            apply(lang);
            return lang;
        }).catch(function () {
            updateButtons(false);                           // stay on the current language
            return current;
        });
    }

    function bindButtons() {
        buttons().forEach(function (btn) {
            if (btn.dataset.langBound) return;
            btn.dataset.langBound = "1";
            btn.addEventListener("click", function (event) {
                event.preventDefault();
                setLanguage(btn.getAttribute("data-lang"));
            });
        });
    }

    /* ---------- start ---------- */
    function start() {
        tagged().forEach(remember);                         // the Portuguese, before anything changes it
        bindButtons();
        updateButtons(false);
        var choice = readChoice();
        if (choice && choice !== BASE) {
            setLanguage(choice).then(function () { readyResolve(current); });
        } else {
            readyResolve(current);
            // fetch quietly once the page has loaded, so the first click is instant
            var prefetch = function () { load().catch(function () {}); };
            if (document.readyState === "complete") setTimeout(prefetch, 1500);
            else window.addEventListener("load", function () { setTimeout(prefetch, 1500); }, { once: true });
        }
    }

    window.CastrosI18n = {
        get lang() { return current; },
        get locale() { return db ? db._meta.languages[current].locale : "pt-PT"; },
        t: t,
        set: setLanguage,
        load: load,
        ready: ready
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
})();
