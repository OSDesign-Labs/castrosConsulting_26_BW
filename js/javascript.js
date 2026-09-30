/*
 * CASTROS CONSULTORIA
 * CONTACT FORM
 *
 * The UI is ready for a future email/WhatsApp backend.
 * For now, submission is simulated so the complete interaction
 * can be tested without a server.
 */

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

    function showStep(step) {

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

        if (firstField) {
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

        interestSelect.innerHTML = `
            <option value="" selected disabled>
                Selecione uma área
            </option>
        `;

        options.forEach((interest) => {

            const option = document.createElement("option");

            option.value = interest;
            option.textContent = interest;

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

    /*
     * BACKEND INTEGRATION POINT
     *
     * Later, replace the simulated delay with:
     *
     * fetch("/api/contact", {
     *     method: "POST",
     *     headers: { "Content-Type": "application/json" },
     *     body: JSON.stringify(data)
     * });
     */

    async function sendContactData(data) {

        console.log("Contact data ready for backend:", data);

        await new Promise((resolve) => {
            setTimeout(resolve, 1800);
        });

        return { success: true };
    }

    /* BOOTSTRAP ALERT */

    function showAlert(success = true) {

        alertElement.classList.remove(
            "alert-success",
            "alert-danger"
        );

        if (success) {

            alertElement.classList.add("alert-success");

            alertTitle.textContent = "Mensagem enviada";
            alertMessage.textContent =
                "Obrigado por contactar a Castros Consultoria. Entraremos em contacto consigo.";

        } else {

            alertElement.classList.add("alert-danger");

            alertTitle.textContent = "Não foi possível enviar";
            alertMessage.textContent =
                "Ocorreu um problema. Verifique os dados e tente novamente.";
        }

        bootstrap.Alert.getOrCreateInstance(alertElement).show();
    }

    /* SUCCESS STATE */

    function showSuccessState() {

        const card = document.querySelector(".contact-form-card");

        card.innerHTML = `
            <div class="form-success">
                <div class="form-success-icon">
                    <i class="bi bi-check-lg"></i>
                </div>

                <span class="contact-eyebrow">
                    Pedido recebido
                </span>

                <h2 class="form-step-title mb-3">
                    Obrigado pelo contacto.
                </h2>

                <p class="form-step-description mx-auto mb-4">
                    A sua mensagem foi preparada com sucesso.
                    A nossa equipa entrará em contacto consigo.
                </p>

                <button type="button" class="btn btn-contact-secondary" id="newContactButton">
                    Enviar outra mensagem
                </button>
            </div>
        `;

        document
            .getElementById("newContactButton")
            .addEventListener("click", () => {
                window.location.reload();
            });
    }

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

    showStep(1);
});


