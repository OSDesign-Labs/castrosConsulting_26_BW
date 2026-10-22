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
   Only the months are known (e.g. "novembro – dezembro")? Set date to the first day,
   dateEnd to the last day and monthsOnly: true: the card shows "Nov – Dez 2026" and the
   event counts as upcoming until dateEnd has passed.
   Anything marked EDIT is provisional text: confirm before launch.

   English: js/translations.json, keys "events.item.<id>.<field>"
   (title, category, city, format, summary, description, highlights).
   A field without an English key shows the Portuguese below.
   After adding or editing an event, run: python3 tools/i18n_sync.py
   (it translates what is new or changed and drops removed events).
   ========================================================== */
(function () {
    "use strict";

    var EVENTS = [
        {
            // flyer: assets/images/recent/flyer-outubro-rosa-2026.webp (same event as the "Próximo evento" hero slide)
            id: "workshop-outubro-rosa-2026",
            featured: true,
            title: "Workshop Outubro Rosa",
            category: "Saúde e bem-estar",
            date: "2026-10-28",
            time: "11:00 – 14:00",
            city: "Auditório da Universidade Joaquim Chissano",
            format: "Presencial",
            image: "assets/images/recent/flyer-outubro-rosa-2026.webp",
            summary: "Saúde, autocuidado e a importância da prevenção do cancro da mama.",
            description: "Venha fazer parte: um workshop para falar sobre saúde, autocuidado e a importância " +
                "da prevenção do cancro da mama, com a oradora confirmada Verônica Carlos Nunes, especialista " +
                "em saúde materno-infantil. Em parceria com a Associação dos Estudantes da Universidade " +
                "Joaquim Chissano. Porque a prevenção é vida!",
            highlights: [
                "Saúde e autocuidado no dia a dia",
                "A importância da prevenção do cancro da mama",
                "Conversa com Verônica Carlos Nunes, especialista em saúde materno-infantil"
            ]
        },
        {
            // flyer: assets/images/recent/flyer-comunicacao-oratoria-2-edicao.webp
            // the flyer gives months only (novembro – dezembro, 30 dias): date/dateEnd span the two months
            // and the card shows "Nov – Dez 2026". EDIT: put the real start day in "date" once it is set.
            id: "formacao-comunicacao-oratoria-2-edicao",
            featured: true,
            title: "Formação em Comunicação e Oratória (2.ª edição)",
            category: "Comunicação",
            date: "2026-11-01",
            dateEnd: "2026-12-31",
            monthsOnly: true,
            time: null,
            city: "Rua da Tchamba n.º 113, Maputo",
            format: "Presencial · 30 dias",
            image: "assets/images/recent/flyer-comunicacao-oratoria-2-edicao.webp",
            summary: "30 dias para comunicar de forma assertiva, eficaz e profissional.",
            description: "Segunda edição da formação em Comunicação e Oratória: expressão oral e oratória, " +
                "comunicação assertiva e comunicação eficaz e profissional, ao longo de 30 dias, entre " +
                "novembro e dezembro. Local: Rua da Tchamba n.º 113, Maputo, próximo da Maternidade do HCM.",
            highlights: [
                "Técnicas para falar em público",
                "Voz, dicção e linguagem corporal",
                "Autoconfiança e gestão do medo",
                "Apresentações com impacto"
            ]
        },
        {
            // flyer: assets/images/flyers/outcourse.webp
            id: "course-oratoria-comunicacao-eficaz",
            featured: false,
            title: "Curso de Oratória e Comunicação Eficaz",
            category: "Comunicação",
            date: "2026-10-13",
            time: "Ter. e Qui. 17:00 – 19:00 · Sáb. 09:00 – 13:00",
            city: "Rua da Tchamba n.º 113, Maputo",
            format: "Presencial · 1 mês",
            image: "assets/images/flyers/outcourse.webp",
            summary: "A arte de falar bem transforma ideias em impacto.",
            description: "Curso de um mês, presencial, para quem quer falar em público com confiança e " +
                "comunicar com clareza. Investimento: 1.200 MT (300 MT de inscrição e 900 MT de certificado). " +
                "Local: Rua da Tchamba n.º 113, Maputo, próximo da Maternidade do Hospital Central.",
            highlights: [
                "Comunicação eficaz e assertiva",
                "Técnicas de oratória e expressão verbal",
                "Linguagem corporal e presença",
                "Organização e estrutura de discursos",
                "Como falar em público com confiança"
            ]
        },
        {
            // flyer: assets/images/flyers/elas.webp
            id: "workshop-elas",
            featured: true,
            title: "Workshop entre Elas: Parcerias Estratégicas de Vida e Negócio",
            category: "Liderança",
            date: "2026-10-01",
            time: "09:00 – 13:30",
            city: "Access Bank Sede, Maputo",
            format: "Presencial · Fórum GBNA e ELAS",
            image: "assets/images/flyers/elas.webp",
            summary: "Masterclass com Elizabeth Castro: conectar pessoas, ideias e oportunidades.",
            description: "A GBNA (Global Business Network Africa Agency) e a plataforma ELAS apresentaram o " +
                "Workshop entre Elas, com Elizabeth Castro como oradora confirmada. Tema do masterclass: " +
                "Parcerias Estratégicas de Vida e Negócio, conectando pessoas, ideias e oportunidades para um " +
                "futuro mais próspero. Sala Corporativa da sede do Access Bank, em Maputo. Fórum exclusivo " +
                "para membros da GBNA e da plataforma ELAS.",
            highlights: [
                "Finanças pessoais e empresariais",
                "Parcerias estratégicas de vida",
                "Vendas pessoais e empresariais",
                "Network: conexões que geram oportunidades"
            ]
        },
        {
            // flyer: assets/images/flyers/setwork.webp
            id: "workshop-arte",
            featured: false,
            title: "Workshop: A Arte de Encantar e Fidelizar",
            category: "Atendimento",
            date: "2026-09-19",
            time: null,
            city: "Maputo",
            format: "Presencial",
            image: "assets/images/flyers/setwork.webp",
            summary: "Como o início do atendimento determina a venda e a satisfação final.",
            description: "Workshop com Elizabeth Castro sobre o momento que decide tudo no atendimento: " +
                "o início. Como os primeiros minutos com o cliente determinam a venda e a satisfação final, " +
                "e o que fazer para encantar e fidelizar.",
            highlights: [
                "Porque o início do atendimento decide a venda",
                "Encantar o cliente desde o primeiro contacto",
                "Da satisfação à fidelização"
            ]
        },
        {
            // real course (flyer: assets/images/flyers/curso-atendimento-2025.webp)
            id: "curso-atendimento-ao-cliente-2025",
            featured: false,
            title: "Curso: Atendimento ao Cliente",
            category: "Atendimento",
            date: "2025-11-27",                       // 27 e 28 de novembro de 2025 (quinta e sexta)
            time: "17:00 – 19:00",
            city: "Maputo",
            format: "Presencial · Certificado + lanche",
            image: "assets/images/flyers/curso-atendimento-2025.webp",
            summary: "Dois dias para elevar o padrão de atendimento, da primeira impressão à gestão de reclamações.",
            description: "Curso de dois dias (27 e 28 de novembro de 2025) para empreendedores, gestores, " +
                "estabelecimentos comerciais e equipas de front line e back office que querem melhorar a " +
                "sua performance de atendimento. Local: NuLimit, Av. Tomás Nduda n.º 1050 R/C, Polana, " +
                "Maputo. Valor: 2.500 MT, com certificado e lanche incluídos.",
            highlights: [
                "O impacto da primeira impressão",
                "Comportamento profissional e imagem da marca",
                "Técnicas práticas de comunicação e empatia",
                "O cliente como parceiro, não apenas como consumidor",
                "Gestão de reclamações e de clientes insatisfeitos"
            ]
        },
        {
            // real event (flyer: assets/images/flyers/masterclass-codigos-lideranca-2025.webp)
            id: "masterclass-codigos-da-lideranca-2025",
            featured: false,
            title: "Master Class: Códigos da Liderança",
            category: "Liderança",
            date: "2025-11-22",
            time: "09:00 – 13:00",
            city: "Hotel Afrin, Maputo",
            format: "Presencial · Aberto a expositores",
            image: "assets/images/flyers/masterclass-codigos-lideranca-2025.webp",
            summary: "Um encontro de líderes, empreendedores e profissionais de referência, com espaço para expositores.",
            description: "Se pretende dar visibilidade à sua marca ou negócio e conectar-se com líderes, " +
                "empreendedores e profissionais de referência, esta é a sua oportunidade. A Master Class " +
                "\u201cCódigos da Liderança\u201d reúne mentes visionárias, energia transformadora e oportunidades " +
                "reais de networking. Participação como expositor: 1.500 MT. Bilhete: 1.000 MT " +
                "(e-Mola ou M-Pesa).",
            highlights: [
                "Dar visibilidade à sua marca ou negócio",
                "Networking com líderes, empreendedores e profissionais de referência",
                "Mostrar os seus produtos e serviços num ambiente de alto impacto"
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

    // months only: "Nov – Dez 2026" / "Novembro – Dezembro de 2026"
    function monthSpan(e, long) {
        var a = e._date, b = e._end || e._date;
        if (long) {
            var locale = window.CastrosI18n ? window.CastrosI18n.locale : "pt-PT";
            var m = new Intl.DateTimeFormat(locale, { month: "long" });
            var s = m.format(a) + (b.getMonth() !== a.getMonth() ? " – " + m.format(b) : "");
            s = s.charAt(0).toUpperCase() + s.slice(1);
            return s + (locale.indexOf("pt") === 0 ? " de " : " ") + b.getFullYear();
        }
        var months = T("events.months", MONTHS);
        return months[a.getMonth()] + (b.getMonth() !== a.getMonth() ? " – " + months[b.getMonth()] : "") +
            " " + b.getFullYear();
    }
    function cardDate(e) { return e.monthsOnly && e._date ? monthSpan(e, false) : shortDate(e._date); }
    function fullDate(e) { return e.monthsOnly && e._date ? monthSpan(e, true) : longDate(e._date); }

    EVENTS.forEach(function (e) {
        e._date = parseDate(e.date);
        e._end = parseDate(e.dateEnd);
        e._status = !e._date ? "tbd" : ((e._end || e._date) < today ? "past" : "upcoming");
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
        return e._date ? '<time datetime="' + e.date + '">' + cardDate(e) + '</time>' : esc(tbd());
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
            { title: F(e, "title"), date: cardDate(e), city: F(e, "city") });
    }

    /* ---------- QR code: sign up from your phone (computers only, see css/home.css .event-qr) ----------
       Scanning it opens WhatsApp on the visitor's phone, in a chat with Elizabeth, with the
       same message the "Inscrever-me" button puts in the contact form (event name, date, city). */
    var WHATSAPP = "258848665180";       // EDIT: Elizabeth's WhatsApp (the number on the flyers)
    function drawQr(e) {
        var box = field("qr");
        if (!box) return;
        var item = box.closest(".event-qr");
        if (typeof window.qrcode !== "function") { if (item) item.hidden = true; return; }
        // short message = fewer, bigger squares = scans easily off a screen
        // short on purpose: a longer message makes a denser code that won't fit the facts box
        // same intent as the button for each status (CTA above)
        var QR_MSG = {
            upcoming: "Olá! Quero inscrever-me: {title}",
            tbd:      "Olá! Tenho interesse: {title}",
            past:     "Olá! Quero a próxima edição: {title}"
        };
        var msg = T("events.qr-msg." + e._status, QR_MSG[e._status], { title: F(e, "title") });
        var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
        var qr = window.qrcode(0, "L");       // size picked automatically; "L" keeps the code as simple as possible
        qr.addData(url);
        qr.make();
        box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });   // margin is in svg units: 8 = two squares of white edge, which scanners need
        if (item) { item.hidden = false; item.setAttribute("data-url", url); }
        // every square a whole number of screen pixels: blurry half-pixel edges are what make
        // a small on-screen QR hard to scan. Sized once the pop-up is laid out.
        box.setAttribute("data-modules", qr.getModuleCount() + 4);
        var svg = box.querySelector("svg");
        if (svg) svg.setAttribute("shape-rendering", "crispEdges");
        sizeQr();
    }
    function sizeQr() {
        var box = field("qr");
        var svg = box && box.querySelector("svg");
        if (!svg) return;
        svg.style.width = svg.style.height = "";              // let the CSS size it first
        var room = box.clientHeight, modules = +box.getAttribute("data-modules");
        if (!room || !modules) return;                         // pop-up not on screen yet
        var dpr = window.devicePixelRatio || 1;
        var px = Math.max(2, Math.floor(room * dpr / modules));   // device pixels per square
        svg.style.width = svg.style.height = (px * modules / dpr) + "px";
    }

    function fill(e) {
        current = e;
        var img = field("image");
        img.src = e.image;
        img.alt = "";
        var highlights = F(e, "highlights") || [];
        field("category").textContent = F(e, "category");
        field("title").textContent = F(e, "title");
        field("date").textContent = fullDate(e);
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
        drawQr(e);
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
    detailEl.addEventListener("shown.bs.modal", sizeQr);
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
