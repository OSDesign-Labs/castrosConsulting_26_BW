/* CONTACT FORM */

document.addEventListener("DOMContentLoaded", () => {

    /* FORM REFERENCES */

    const form = document.getElementById("contactForm");
    const formSteps = [...document.querySelectorAll("[data-form-step]")];
    const progressSteps = [...document.querySelectorAll("[data-progress-step]")];
    const progressLines = [...document.querySelectorAll(".progress-line")];

    const serviceSelect = document.getElementById("service");
    const interestSelect = document.getElementById("interest");

    const submitButton = document.getElementById("submitButton");
    const submitLabel = submitButton.querySelector(".submit-label");
    const submitLoading = submitButton.querySelector(".submit-loading");

    const alertElement = document.getElementById("contactAlert");
    const alertTitle = document.getElementById("alertTitle");
    const alertMessage = document.getElementById("alertMessage");

    let currentStep = 1;

    /* LANGUAGE (js/i18n.js): text in the current language, the Portuguese here is the fallback.
       Service / interest VALUES stay in Portuguese (that's what the form submits). */
    const T = (key, fallback) => (window.CastrosI18n ? window.CastrosI18n.t(key, fallback) : fallback);
    const slugify = (s) => (s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) || []).join("-");
    const interestLabel = (value) => T("contact.interest." + slugify(value), value);
    let lastAlertSuccess = null;
    let successShown = false;

    /* DYNAMIC AREAS OF INTEREST */

    const interests = {
        Consultoria: [
            "Desenvolvimento Organizacional",
            "Gestão",
            "Pessoas e Equipas",
            "Estratégia",
            "Outro"
        ],

        Formação: [
            "Desenvolvimento Profissional",
            "Liderança",
            "Gestão de Equipas",
            "Competências Profissionais",
            "Outro"
        ],

        Treinamento: [
            "Capacitação de Equipas",
            "Desenvolvimento de Competências",
            "Treinamento Corporativo",
            "Outro"
        ],

        Palestras: [
            "Liderança",
            "Desenvolvimento Profissional",
            "Motivação e Pessoas",
            "Outro"
        ],

        Eventos: [
            "Workshop",
            "Conferência",
            "Evento Corporativo",
            "Team Building",
            "Outro"
        ],

        Outro: ["Outro"]
    };

    /* PROGRESS */

    function updateProgress(step) {

        progressSteps.forEach((item, index) => {
            const number = index + 1;

            item.classList.toggle("active", number === step);
            item.classList.toggle("completed", number < step);
        });

        progressLines.forEach((line, index) => {
            line.classList.toggle("completed", index < step - 1);
        });
    }

    /* SHOW STEP */

    function showStep(step, moveFocus = true) {

        currentStep = step;

        formSteps.forEach((item) => {
            item.classList.toggle(
                "active",
                Number(item.dataset.formStep) === step
            );
        });

        updateProgress(step);

        const activeStep = document.querySelector(
            `[data-form-step="${step}"]`
        );

        const firstField = activeStep?.querySelector(
            "input, select, textarea"
        );

        // only when the user moves between steps; on page load this
        // focus scrolled the whole page down to the contact form
        if (firstField && moveFocus) {
            setTimeout(() => firstField.focus(), 120);
        }
    }

    /* VALIDATE CURRENT STEP */

    function validateCurrentStep() {

        const activeStep = document.querySelector(
            `[data-form-step="${currentStep}"]`
        );

        const fields = [
            ...activeStep.querySelectorAll(
                "input[required], select[required], textarea[required]"
            )
        ];

        let valid = true;

        fields.forEach((field) => {
            if (!field.checkValidity()) {
                field.classList.add("is-invalid");
                valid = false;
            } else {
                field.classList.remove("is-invalid");
            }
        });

        return valid;
    }

    /* NEXT / PREVIOUS */

    document.querySelectorAll("[data-next-step]").forEach((button) => {

        button.addEventListener("click", () => {

            if (!validateCurrentStep()) {
                return;
            }

            if (currentStep < 3) {
                showStep(currentStep + 1);
            }
        });
    });

    document.querySelectorAll("[data-prev-step]").forEach((button) => {

        button.addEventListener("click", () => {

            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });
    });

    /* DYNAMIC INTEREST */

    serviceSelect.addEventListener("change", () => {

        const options = interests[serviceSelect.value] || [];

        interestSelect.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.selected = true;
        placeholder.disabled = true;
        placeholder.textContent = T("contact.select-area", "Selecione uma área");
        interestSelect.appendChild(placeholder);

        options.forEach((interest) => {

            const option = document.createElement("option");

            option.value = interest;                       // submitted in Portuguese
            option.textContent = interestLabel(interest);  // shown in the current language

            interestSelect.appendChild(option);
        });

        interestSelect.disabled = options.length === 0;
        interestSelect.classList.remove("is-invalid");
    });

    /* LIVE VALIDATION */

    form.addEventListener("input", (event) => {

        if (
            event.target.matches(
                "input, select, textarea"
            ) &&
            event.target.checkValidity()
        ) {
            event.target.classList.remove("is-invalid");
        }
    });

    /* COLLECT DATA */

    function collectFormData() {

        const data = new FormData(form);

        return {
            name: data.get("name")?.trim() || "",
            email: data.get("email")?.trim() || "",
            organization: data.get("organization")?.trim() || "",
            phone: data.get("phone")?.trim() || "",
            service: data.get("service") || "",
            interest: data.get("interest") || "",
            message: data.get("message")?.trim() || ""
        };
    }

    /* SEND TO FORMSPREE */

    const FORMSPREE_ENDPOINT = "https://formspree.io/f/mwlpzyva";

    async function sendContactData(data) {

        const payload = new FormData();
        Object.entries(data).forEach(([key, value]) => payload.append(key, value));

        payload.append("subject", `Novo contacto pelo site: ${data.service || "Geral"}`);
        payload.append("_gotcha", form.querySelector('[name="_gotcha"]').value);

        // Give up after 15s so a bad connection doesn't spin forever
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                body: payload,
                headers: { Accept: "application/json" },
                signal: controller.signal
            });
            return { success: response.ok };
        } finally {
            clearTimeout(timer);
        }
    }

    /* BOOTSTRAP ALERT */
    // Bootstrap's close button deletes the alert from the page.
    // Just hide it instead, so it can be shown again on the next submit.
    alertElement.addEventListener("close.bs.alert", (event) => {
       event.preventDefault();
       alertElement.classList.remove("show");
    });

    function showAlert(success = true) {

        lastAlertSuccess = success;

        alertElement.classList.remove(
            "alert-success",
            "alert-danger"
        );

        if (success) {

            alertElement.classList.add("alert-success");

            alertTitle.textContent = T("contact.alert.success-title", "Mensagem enviada");
            alertMessage.textContent = T("contact.alert.success-text",
                "Obrigado por contactar a Castros Consultoria. Entraremos em contacto consigo.");

        } else {

            alertElement.classList.add("alert-danger");

            alertTitle.textContent = T("contact.alert.error-title", "Não foi possível enviar");
            alertMessage.textContent = T("contact.alert.error-text",
                "Ocorreu um problema. Verifique os dados e tente novamente.");
        }

        alertElement.classList.add("show");
    }

    /* SUCCESS STATE */

    function showSuccessState() {

        const card = document.querySelector(".contact-form-card");
        successShown = true;

        card.innerHTML = `
            <div class="form-success">
                <div class="form-success-icon">
                    <i class="bi bi-check-lg"></i>
                </div>

                <span class="contact-eyebrow">
                    ${T("contact.success.eyebrow", "Pedido recebido")}
                </span>

                <h2 class="form-step-title mb-3">
                    ${T("contact.success.title", "Obrigado pelo contacto.")}
                </h2>

                <p class="form-step-description mx-auto mb-4">
                    ${T("contact.success.text", "A sua mensagem foi enviada com sucesso. A nossa equipa entrará em contacto consigo.")}
                </p>

                <button type="button" class="btn btn-contact-secondary" id="newContactButton">
                    ${T("contact.success.again", "Enviar outra mensagem")}
                </button>
            </div>
        `;

        document
            .getElementById("newContactButton")
            .addEventListener("click", () => {
                window.location.reload();
            });
    }

    /* LANGUAGE SWITCH: text this script created itself */
    document.addEventListener("i18n:change", () => {
        Array.from(interestSelect.options).forEach((option) => {
            if (option.value) option.textContent = interestLabel(option.value);
            else if (!option.hasAttribute("data-i18n")) option.textContent = T("contact.select-area", "Selecione uma área");
        });
        if (lastAlertSuccess !== null && alertElement.classList.contains("show")) showAlert(lastAlertSuccess);
        if (successShown) showSuccessState();
    });

    /* SUBMIT */

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!validateCurrentStep()) {
            return;
        }

        const data = collectFormData();

        submitButton.disabled = true;
        submitLabel.classList.add("d-none");
        submitLoading.classList.remove("d-none");

        updateProgress(3);

        try {

            const result = await sendContactData(data);

            if (!result.success) {
                throw new Error("Submission failed.");
            }

            showAlert(true);
            showSuccessState();

        } catch (error) {

            console.error(error);

            submitButton.disabled = false;
            submitLabel.classList.remove("d-none");
            submitLoading.classList.add("d-none");

            showAlert(false);
        }
    });

    /* INITIAL STATE */

    showStep(1, false);
});


/* ==========================================================
   LINKS TO THE CONTACT FORM (and other same-page anchors)
   - Contact links point at #contact-form, the form card itself.
   - Links in the mobile menu: close the menu first, then scroll.
     (data-bs-dismiss on an <a> makes Bootstrap cancel the link,
     which is why the mobile "Contacto" button did nothing.)
   - Arriving from another page (index.html#contact-form): once
     everything has loaded, line the target up again; images and
     fonts loading above it can push it down.
   ========================================================== */
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function findTarget(hash) {
        if (!hash || hash.length < 2) return null;
        try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return null; }
    }

    function jumpTo(target, smooth) {
        var html = document.documentElement;
        var before = html.style.scrollBehavior;
        if (!smooth) html.style.scrollBehavior = "auto";          // the CSS sets smooth for the whole page
        target.scrollIntoView({ behavior: smooth && !reduceMotion ? "smooth" : "auto", block: "start" });
        if (!smooth) html.style.scrollBehavior = before;
    }

    // mobile menu → same-page section
    document.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest && event.target.closest(".offcanvas a[href*='#']");
        if (!link || !window.bootstrap) return;
        var menu = link.closest(".offcanvas");
        var url = new URL(link.getAttribute("href"), window.location.href);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) return;  // other page
        var target = findTarget(url.hash);
        if (!target || !menu.classList.contains("show")) return;

        event.preventDefault();
        menu.addEventListener("hidden.bs.offcanvas", function () {
            if (window.history && history.pushState && window.location.hash !== url.hash) {
                history.pushState(null, "", url.hash);
                // pushState doesn't fire hashchange; listeners (e.g. the services accordion) need it
                window.dispatchEvent(new HashChangeEvent("hashchange"));
            }
            jumpTo(target, true);
        }, { once: true });
        bootstrap.Offcanvas.getOrCreateInstance(menu).hide();
    });

    // arrived with a #hash: re-align after load, unless the visitor already scrolled
    var userScrolled = false;
    ["wheel", "touchmove", "keydown"].forEach(function (type) {
        window.addEventListener(type, function () { userScrolled = true; }, { once: true, passive: true });
    });

    function realign() {
        var target = findTarget(window.location.hash);
        if (!target || userScrolled) return;
        var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        if (Math.abs(target.getBoundingClientRect().top - margin) > 2) jumpTo(target, false);
    }

    window.addEventListener("load", function () {
        realign();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(realign);
    }, { once: true });
})();
