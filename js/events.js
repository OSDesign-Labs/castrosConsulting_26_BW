/* ==========================================================
   EVENTOS
   One list of events → one card template → every card.

   - EVENTS below is the only place to edit event content.
   - The home section shows the events marked featured: true.
   - "Ver todos" shows all of them: upcoming first (soonest
     first), then "data a anunciar", then past (most recent first).
   - "Ver evento" opens one Bootstrap 5 modal, filled from the
     same data, so every event gets exactly the same layout.
   - The weekday is calculated from the date (no more typos), and
     an event whose date has passed is shown as "Realizado".

   Dates: "YYYY-MM-DD", or null for "Data a anunciar".
   Anything marked EDIT is provisional text: confirm before launch.

   English: js/translations.json, keys "events.item.<id>.<field>"
   (title, category, city, format, summary, description, highlights).
   A field without an English key shows the Portuguese below.
   ========================================================== */
(function () {
    "use strict";

    var EVENTS = [
        {
            id: "lideranca-pratica",
            featured: true,
            title: "Liderança prática",
            category: "Liderança",
            date: "2026-03-09",
            time: null,
            city: "Maputo",
            format: "Presencial",
            image: "assets/events/lideranca-pratica.webp",
            summary: "Um dia intensivo para líderes que querem equipas mais fortes e autónomas.",
            description: "Um dia intensivo e prático para líderes que querem construir equipas mais fortes, " +
                "autónomas e comprometidas. Trabalhamos situações reais do dia a dia da liderança, com " +
                "ferramentas que pode aplicar logo na semana seguinte.",                          // EDIT
            highlights: [                                                                         // EDIT
                "Delegar com confiança e acompanhar sem microgerir",
                "Dar feedback que faz a equipa crescer",
                "Criar autonomia e responsabilidade partilhada"
            ]
        },
        {
            id: "comunicacao-com-impacto",
            featured: true,
            title: "Comunicação com impacto",
            category: "Comunicação",
            date: "2026-02-12",
            time: null,
            city: "Beira",
            format: "Presencial",
            image: "assets/events/comunicacao-com-impacto.webp",
            summary: "Como falar de forma clara e mobilizar pessoas para a ação.",
            description: "Uma sessão sobre como comunicar de forma clara, estruturar a mensagem e mobilizar " +
                "pessoas para a ação, em reuniões, apresentações e conversas difíceis.",       // EDIT
            highlights: [                                                                         // EDIT
                "Estruturar uma mensagem clara em poucos minutos",
                "Falar com confiança perante um grupo",
                "Adaptar a comunicação a cada público"
            ]
        },
        {
            id: "decidir-com-clareza",
            featured: true,
            title: "Decidir com clareza",
            category: "Estratégia",
            date: "2026-02-11",
            time: null,
            city: "Online",
            format: "Sessão online",
            image: "assets/events/decidir-com-clareza.webp",
            summary: "Ferramentas simples para tomar decisões difíceis com dados e convicção.",
            description: "Ferramentas simples para tomar decisões difíceis com base em dados e com convicção, " +
                "mesmo em contextos de incerteza.",                                              // EDIT
            highlights: [                                                                         // EDIT
                "Separar factos, suposições e opiniões",
                "Comparar opções com critérios claros",
                "Comunicar a decisão e assumir o compromisso"
            ]
        },
        {
            // same event as the "Próximo evento" slide in the hero
            id: "oratoria-comunicacao-impacto",
            featured: false,
            title: "Oratória e Comunicação com Impacto",
            category: "Comunicação",
            date: "2026-10-13",
            time: null,
            city: "Maputo",
            format: "Presencial · Vagas limitadas",
            image: "assets/events/oratoria-comunicacao-impacto.webp",
            summary: "Como falar de forma clara, ganhar confiança em palco e mobilizar pessoas para a ação.",
            description: "Para quem precisa de falar em público com segurança: preparar a mensagem, controlar " +
                "o nervosismo, usar a voz e o corpo a seu favor e terminar com um apelo que leva as " +
                "pessoas a agir.",                                                                 // EDIT
            highlights: [                                                                         // EDIT
                "Preparar e ensaiar uma intervenção curta",
                "Gerir o nervosismo antes e durante",
                "Prender a atenção do início ao fim"
            ]
        },
        {
            // EDIT: provisional event (content and date to be confirmed)
            id: "atendimento-ao-cliente",
            featured: false,
            title: "Excelência no Atendimento ao Cliente",
            category: "Atendimento",
            date: null,
            time: null,
            city: "Maputo",
            format: "Workshop presencial",
            image: "assets/events/atendimento-ao-cliente.webp",
            summary: "Práticas para transformar cada contacto com o cliente numa experiência que gera confiança.",
            description: "Um workshop para equipas de linha da frente: escuta ativa, gestão de reclamações e " +
                "padrões de serviço que transformam clientes satisfeitos em clientes fiéis.",
            highlights: [
                "Escutar antes de responder",
                "Transformar uma reclamação numa oportunidade",
                "Definir padrões de serviço para toda a equipa"
            ]
        },
        {
            // EDIT: provisional event (content and date to be confirmed)
            id: "etica-e-lideranca",
            featured: false,
            title: "Ética e Liderança Organizacional",
            category: "Liderança",
            date: null,
            time: null,
            city: "Maputo",
            format: "Conferência",
            image: "assets/events/etica-e-lideranca.webp",
            summary: "Valores, integridade e o papel da liderança na construção de organizações sólidas.",
            description: "Uma conversa aberta sobre valores, integridade e decisões difíceis, e sobre como " +
                "a liderança dá o exemplo na construção de organizações sólidas e de confiança.",
            highlights: [
                "Traduzir valores em comportamentos do dia a dia",
                "Decidir quando o certo e o fácil não coincidem",
                "Construir uma cultura de confiança"
            ]
        }
    ];

    /* ---------- language (js/i18n.js) ---------- */
    // text in the current language; the Portuguese given here is the fallback
    function T(key, fallback, vars) {
        if (window.CastrosI18n) return window.CastrosI18n.t(key, fallback, vars);
        if (typeof fallback === "string" && vars) {
            return fallback.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
        }
        return fallback;
    }
    // one field of an event, translated
    function F(e, fieldName) { return T("events.item." + e.id + "." + fieldName, e[fieldName]); }

    /* ---------- dates ---------- */
    var DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    var MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    function tbd() { return T("events.tbd", "Data a anunciar"); }

    function parseDate(iso) {
        if (!iso) return null;
        var p = iso.split("-");
        return new Date(+p[0], +p[1] - 1, +p[2]);          // local date, not UTC
    }

    function shortDate(d) {                                 // "Seg, 09 Mar 2026" / "Mon, 09 Mar 2026"
        if (!d) return tbd();
        var days = T("events.days", DAYS), months = T("events.months", MONTHS);
        return days[d.getDay()] + ", " + String(d.getDate()).padStart(2, "0") + " " +
            months[d.getMonth()] + " " + d.getFullYear();
    }

    function longDate(d) {                                  // "Segunda-feira, 9 de março de 2026" / "Monday, 9 March 2026"
        if (!d) return tbd();
        var locale = window.CastrosI18n ? window.CastrosI18n.locale : "pt-PT";
        var s = new Intl.DateTimeFormat(locale, {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        }).format(d);
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    EVENTS.forEach(function (e) {
        e._date = parseDate(e.date);
        e._status = !e._date ? "tbd" : (e._date < today ? "past" : "upcoming");
    });

    function byId(id) {
        for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
        return null;
    }

    function sortedAll() {
        var rank = { upcoming: 0, tbd: 1, past: 2 };
        return EVENTS.slice().sort(function (a, b) {
            if (rank[a._status] !== rank[b._status]) return rank[a._status] - rank[b._status];
            if (a._status === "upcoming") return a._date - b._date;     // soonest first
            if (a._status === "past") return b._date - a._date;         // most recent first
            return 0;
        });
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* ---------- the card template (home section AND "Ver todos") ---------- */
    function dateHTML(e) {
        return e._date ? '<time datetime="' + e.date + '">' + shortDate(e._date) + '</time>' : esc(tbd());
    }

    function cardHTML(e, i, opts) {
        var aos = opts.aos ? ' data-aos="fade-up" data-aos-delay="' + (i % 3) * 100 + '"' : "";
        var status = e._status === "past"
            ? '<span class="event-status"><i class="bi bi-check2-circle" aria-hidden="true"></i>' +
              '<span class="event-status-label">' + esc(T("events.realizado", "Realizado")) + '</span></span>'
            : "";
        return '' +
            '<div class="' + opts.col + ' event-col" style="--i:' + i + '"' + aos + '>' +
            '  <article class="card-c event-card h-100" data-status="' + e._status + '">' +
            '    <div class="event-thumb">' +
            '      <img src="' + esc(e.image) + '" alt="" loading="lazy" decoding="async" width="1200" height="750">' +
            '      <span class="badge-c event-badge">' + esc(F(e, "category")) + '</span>' + status +
            '    </div>' +
            '    <div class="event-body">' +
            '      <div class="event-meta">' +
            '        <span><svg class="bi" aria-hidden="true"><use href="#i-calendar"></use></svg>' +
            '<span class="event-date">' + dateHTML(e) + '</span></span>' +
            '        <span><svg class="bi" aria-hidden="true"><use href="#i-geo"></use></svg>' +
            '<span class="event-city">' + esc(F(e, "city")) + '</span></span>' +
            '      </div>' +
            '      <h3 class="event-title">' + esc(F(e, "title")) + '</h3>' +
            '      <p class="event-summary">' + esc(F(e, "summary")) + '</p>' +
            '      <button type="button" class="link-arrow event-open stretched-link" data-event-id="' + esc(e.id) + '"' +
            '        aria-haspopup="dialog" aria-label="' + esc(viewLabel(e)) + '">' +
            '<span class="event-open-label">' + esc(T("events.view", "Ver evento")) + '</span> ' +
            '        <svg class="bi" aria-hidden="true"><use href="#i-arrow"></use></svg></button>' +
            '    </div>' +
            '  </article>' +
            '</div>';
    }

    function viewLabel(e) { return T("events.view-aria", "Ver evento: {title}", { title: F(e, "title") }); }

    function render(grid, list, opts) {
        if (!grid) return;
        grid.innerHTML = list.map(function (e, i) { return cardHTML(e, i, opts); }).join("");
    }

    // language switch: update the text of cards already on the page (no re-render,
    // so their scroll animations don't replay)
    function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }

    function updateCards(grid) {
        if (!grid) return;
        grid.querySelectorAll(".event-card").forEach(function (card) {
            var btn = card.querySelector(".event-open");
            var e = btn && byId(btn.getAttribute("data-event-id"));
            if (!e) return;
            setText(card.querySelector(".event-badge"), F(e, "category"));
            setText(card.querySelector(".event-status-label"), T("events.realizado", "Realizado"));
            card.querySelector(".event-date").innerHTML = dateHTML(e);
            setText(card.querySelector(".event-city"), F(e, "city"));
            setText(card.querySelector(".event-title"), F(e, "title"));
            setText(card.querySelector(".event-summary"), F(e, "summary"));
            setText(card.querySelector(".event-open-label"), T("events.view", "Ver evento"));
            btn.setAttribute("aria-label", viewLabel(e));
        });
    }

    /* ---------- equal layout: a loop that lines cards up row by row ----------
       Cards in the same row get the same title and description height,
       so dates, titles, text and the "Ver evento" button line up even when
       one title wraps to two lines and the others don't. */
    var PARTS = [".event-title", ".event-summary"];

    function equalize(grid) {
        if (!grid || !grid.offsetParent) return;            // hidden (closed modal): do it when shown
        var cards = Array.prototype.slice.call(grid.querySelectorAll(".event-card"));

        cards.forEach(function (card) {                     // 1. back to natural heights
            PARTS.forEach(function (sel) { card.querySelector(sel).style.minHeight = ""; });
        });

        var rows = [];                                      // 2. group cards by row
        cards.forEach(function (card) {
            // the column's layout position (its own AOS/entrance transform doesn't move it,
            // and the animated column would otherwise become the card's offsetParent)
            var top = (card.parentElement || card).offsetTop;
            var row = rows.filter(function (r) { return Math.abs(r.top - top) < 4; })[0];
            if (!row) rows.push(row = { top: top, cards: [] });
            row.cards.push(card);
        });

        rows.forEach(function (row) {                       // 3. tallest part wins in each row
            if (row.cards.length < 2) return;
            PARTS.forEach(function (sel) {
                var els = row.cards.map(function (c) { return c.querySelector(sel); });
                var max = Math.max.apply(null, els.map(function (el) { return el.getBoundingClientRect().height; }));
                els.forEach(function (el) { el.style.minHeight = max + "px"; });
            });
        });
    }

    /* ---------- modals ---------- */
    var homeGrid = document.getElementById("eventsGrid");
    var allGrid = document.getElementById("eventsAllGrid");
    var detailEl = document.getElementById("eventModal");
    var allEl = document.getElementById("eventsAllModal");

    render(homeGrid, EVENTS.filter(function (e) { return e.featured; }), { col: "col-lg-4", aos: true });
    render(allGrid, sortedAll(), { col: "col-md-6 col-xl-4", aos: false });

    if (!detailEl || !allEl) return;

    function modal(el) { return window.bootstrap ? bootstrap.Modal.getOrCreateInstance(el) : null; }
    function field(name) { return detailEl.querySelector('[data-field="' + name + '"]'); }
    function row(name) { return detailEl.querySelector('[data-row="' + name + '"]'); }

    var current = null;          // event shown in the detail modal
    var detailTrigger = null;    // element that opened the detail modal (focus returns there)
    var allTrigger = null;       // element that opened "Ver todos"
    var next = null;             // what to do once the open modal has finished closing

    // button label and pre-filled message, per status (English in translations.json)
    var CTA = {
        upcoming: { label: "Inscrever-me",
                    msg: 'Olá! Gostaria de me inscrever no evento "{title}" ({date}, {city}).' },
        tbd:      { label: "Manifestar interesse",
                    msg: 'Olá! Tenho interesse no evento "{title}". Avisem-me, por favor, quando a data for anunciada.' },
        past:     { label: "Quero a próxima edição",
                    msg: 'Olá! Tenho interesse numa próxima edição do evento "{title}".' }
    };
    function ctaLabel(e) { return T("events.cta." + e._status, CTA[e._status].label); }
    function ctaMessage(e) {
        return T("events.msg." + e._status, CTA[e._status].msg,
            { title: F(e, "title"), date: shortDate(e._date), city: F(e, "city") });
    }

    function fill(e) {
        current = e;
        var img = field("image");
        img.src = e.image;
        img.alt = "";
        var highlights = F(e, "highlights") || [];
        field("category").textContent = F(e, "category");
        field("title").textContent = F(e, "title");
        field("date").textContent = longDate(e._date);
        field("time").textContent = e.time || "";
        field("city").textContent = F(e, "city");
        field("format").textContent = e.format ? F(e, "format") : "";
        field("description").textContent = e.description ? F(e, "description") : F(e, "summary");
        field("highlights").innerHTML = highlights.map(function (h) {
            return '<li><i class="bi bi-check2-circle" aria-hidden="true"></i><span>' + esc(h) + "</span></li>";
        }).join("");
        field("status").hidden = e._status !== "past";
        row("time").hidden = !e.time;
        row("format").hidden = !e.format;
        row("highlights").hidden = !highlights.length;
        row("pastNote").hidden = e._status !== "past";
        field("cta").textContent = ctaLabel(e);
        detailEl.setAttribute("data-status", e._status);
    }

    function isShown(el) { return el.classList.contains("show"); }

    function openDetail(id, trigger) {
        var e = byId(id);
        var m = modal(detailEl);
        if (!e || !m) return;
        fill(e);
        var fromAll = isShown(allEl);
        row("back").hidden = !fromAll;
        detailTrigger = trigger;
        if (fromAll) {                       // Bootstrap can't stack modals: close the list first
            next = function () { m.show(); };
            modal(allEl).hide();
        } else {
            m.show();
        }
    }

    function openAll(trigger) {
        var m = modal(allEl);
        if (!m) return false;
        allTrigger = trigger;
        m.show();
        return true;
    }

    function refocus(el) {
        if (el && el.offsetParent) el.focus({ preventScroll: true });
        else if (allTrigger && allTrigger.offsetParent) allTrigger.focus({ preventScroll: true });
    }

    // "Inscrever-me": close the modal, go to the contact form, pre-fill it
    function goToContact(e) {
        var service = document.getElementById("service");
        if (service) {
            service.value = "Eventos";
            service.dispatchEvent(new Event("change", { bubbles: true }));
        }
        var msg = document.getElementById("message");
        if (msg && (!msg.value.trim() || msg.dataset.prefilled === "1")) {   // never overwrite what they typed
            msg.value = ctaMessage(e);
            msg.dataset.prefilled = "1";
            msg.addEventListener("input", function () { delete msg.dataset.prefilled; }, { once: true });
        }
        var contact = document.getElementById("contact-form") || document.getElementById("contact");
        if (contact) {
            var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            contact.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }
    }

    allEl.addEventListener("shown.bs.modal", function () { equalize(allGrid); });
    allEl.addEventListener("hidden.bs.modal", function () {
        var run = next; next = null;
        if (run) run(); else refocus(allTrigger);
    });
    detailEl.addEventListener("hidden.bs.modal", function () {
        var run = next; next = null;
        if (run) run(); else refocus(detailTrigger);
    });

    document.addEventListener("click", function (ev) {
        var t = ev.target.closest && ev.target.closest("[data-event-id], [data-events-all], [data-event-action]");
        if (!t) return;

        if (t.hasAttribute("data-event-id")) {
            ev.preventDefault();
            openDetail(t.getAttribute("data-event-id"), t);
        } else if (t.hasAttribute("data-events-all")) {
            if (openAll(t)) ev.preventDefault();       // no Bootstrap? the link just goes to #eventos
        } else if (t.getAttribute("data-event-action") === "back") {
            next = function () { modal(allEl).show(); };
            modal(detailEl).hide();
        } else if (t.getAttribute("data-event-action") === "register" && current) {
            var e = current;
            next = function () { goToContact(e); };
            modal(detailEl).hide();
        }
    });

    // language switched (js/i18n.js): cards, open modal, row heights
    document.addEventListener("i18n:change", function () {
        updateCards(homeGrid);
        updateCards(allGrid);
        if (current) fill(current);
        equalize(homeGrid);
        equalize(allGrid);
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { equalize(homeGrid); equalize(allGrid); }, 150);
    });
    // after web fonts and images have settled
    window.addEventListener("load", function () { equalize(homeGrid); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { equalize(homeGrid); });
    equalize(homeGrid);

    window.CastrosEvents = { list: EVENTS, open: openDetail, openAll: openAll, equalize: equalize };
})();
