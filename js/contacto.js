/* ==========================================================
   CONTACTO · inscrições, marcações e pagamento (3 passos)

   1. Os seus dados      → perfil (perguntas do Google Form do workshop)
   2. O que procura      → eventos/serviços escolhidos, perguntas próprias de
                           cada um, calendário + verificação para serviços
   3. Confirmar e pagar  → resumo, M-Pesa / e-Mola, QR (computador) ou
                           lembrete + botão WhatsApp (telemóvel)

   Everything marked EDIT is placeholder or unconfirmed: check it with
   Elizabeth before launch (prices, payment numbers, the busy agenda).

   Why services are NOT paid in step 3: a static site cannot see the team's
   real calendar. The page only checks the fixed rules (opening hours,
   2 working days ahead, holidays, no clash inside the same request) and
   sends the chosen time as a REQUEST; the team checks the agenda and
   confirms on WhatsApp, and only then is a price and payment requested.
   Nothing is reserved by the page. Real calendar sync is a later upgrade
   (n8n or Apps Script reading Google Calendar → fill BUSY from it).
   ========================================================== */
(function () {
    "use strict";

    /* ---------------------------------------------------------- CONFIG */
    var PREVIEW = false;                                  // true: nothing is sent (demo mode, logs the payload to the console)
    var FORMSPREE_ENDPOINT = "https://formspree.io/f/mwlpzyva";   // EDIT before launch: still delivers to the OS Design email; point it at castrosconsultoria@gmail.com (or swap for an n8n webhook URL)
    var WHATSAPP = "258878665180";                        // the one WhatsApp number used across the site
    var WHATSAPP_SHOWN = "+258 87 866 5180";
    var PAY = {                                           // EDIT: confirm wallets + account holder name
        mpesa: { name: "M-Pesa", number: "84 866 5180", holder: "Elizabeth Castro", color: "#e60000" },
        emola: { name: "e-Mola", number: "87 866 5180", holder: "Elizabeth Castro", color: "#f39200" }
    };
    var LEAD_WORKDAYS = 2;                                // earliest booking: 2 working days from today
    var MONTHS_AHEAD = 3;
    // opening hours per weekday (0 = Sunday). Saturday only for services that list day 6. EDIT: confirm Saturday
    var HOURS = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [9, 13] };
    var HOLIDAYS = {                                      // Mozambique public holidays in the booking window
        "2026-12-25": { pt: "Dia da Família", en: "Family Day" },
        "2027-01-01": { pt: "Dia da Fraternidade Universal", en: "New Year's Day" },
        "2027-02-03": { pt: "Dia dos Heróis Moçambicanos", en: "Heroes' Day" }
    };

    /* Castros' agenda: empty on purpose. The page cannot see the real calendar, so it does not
       pretend to; the team checks availability when the request arrives. When calendar sync exists,
       fill these from it. Format: BUSY { d: "2026-11-03", s: "09:00", e: "11:00", r: ["equipa"|"espaco"] },
       RECURRING { from, to, dow: [0-6], s, e, r, pub: event id }. Private entries never show who booked. */
    var BUSY = [];
    var RECURRING = [];

    /* ---------------------------------------------------------- TEXT */
    function L(pt, en) { return { pt: pt, en: en }; }
    function O(pt, en) { return { v: pt, pt: pt, en: en }; }        // option: value submitted in PT

    var STR = {
        pt: {
            "top.place": "Maputo, Moçambique", "top.hours": "Seg – Sex · 08:00 – 17:00",
            "nav.home": "Início", "nav.about": "Sobre nós", "nav.services": "Serviços", "nav.events": "Eventos", "nav.contact": "Contacto", "nav.cta": "Contacto",
            "hero.eyebrow": "Contacto e inscrições", "hero.title": "Inscreva-se, marque, reserve.",
            "hero.lead": "Escolha os eventos e serviços que lhe interessam, responda a algumas perguntas sobre cada um e pague por M-Pesa ou e-Mola. Tudo num só pedido.",
            "hero.s1": "Escolha", "hero.s2": "Responda", "hero.s3": "Confirme e pague",
            "dash.eyebrow": "Agenda e serviços", "dash.title": "O que procura?", "dash.lead": "Pode juntar vários eventos e serviços no mesmo pedido.",
            "dash.all": "Todos", "dash.events": "Eventos", "dash.services": "Serviços", "dash.go": "Preencher o pedido",
            "c.eyebrow": "Contacto", "c.title": "Vamos conversar sobre o seu próximo passo.",
            "c.intro": "Conte-nos um pouco sobre o que procura. A nossa equipa analisará a sua necessidade e entrará em contacto consigo.",
            "c.loc": "Localização", "c.imgLabel": "Estamos disponíveis para ouvir.",
            "c.imgTitle": "Pessoas reais.<br>Contextos reais.<br>Soluções relevantes.",
            "c.imgText": "Partilhe connosco o desafio ou oportunidade que pretende desenvolver.",
            "p.1": "Informação", "p.2": "Necessidade", "p.3": "Pagamento", "p.3b": "Confirmação",
            "s1.title": "Os seus dados.", "s1.desc": "Diga-nos quem é e como o podemos contactar.",
            "f.name": "Nome completo", "f.namePh": "O seu nome completo", "f.phone": "WhatsApp / Telefone",
            "f.org": "Empresa / Organização", "f.orgPh": "Opcional", "f.gender": "Sexo", "f.age": "Faixa etária",
            "f.loc": "Onde está?", "f.locOther": "Qual cidade ou bairro?", "f.sector": "Em que área trabalha ou actua?",
            "f.sectorPh": "Escolha uma área (opcional)",
            "err.name": "Escreva o seu nome.", "err.email": "Escreva um email válido, por exemplo nome@empresa.com.",
            "err.phone": "Escreva um número com 9 dígitos, por exemplo 84 000 0000.",
            "err.consent": "Marque esta caixa para enviar o pedido.", "err.required": "Escolha uma opção.",
            "err.none": "Escolha pelo menos um evento ou serviço para continuar.",
            "err.fix": "Faltam respostas em {n}. Estão assinaladas a vermelho.",
            "err.verify": "Confirme o horário pretendido de {n} antes de continuar.",
            "err.conflictNow": "O horário de {n} deixou de ser possível. Escolha outro e confirme de novo.",
            "s2.title": "O que procura.", "s2.desc": "Cada evento e serviço tem as suas perguntas. Para serviços com marcação, escolha o horário pretendido; a equipa confirma a disponibilidade por WhatsApp.",
            "s2.picker": "Adicionar ao pedido",
            "s2.empty": "Ainda não escolheu nada. Toque num evento ou serviço acima.",
            "s3.title": "Confirmar e pagar.", "s3.titleB": "Confirmar o pedido.",
            "s3.desc": "Reveja o pedido. Os eventos pagam-se já; os serviços com marcação só depois de a equipa confirmar o horário.",
            "s3.descB": "Reveja o pedido. Não há nada a pagar agora: a equipa confirma os horários e envia o orçamento por WhatsApp.",
            "f.msg": "Mensagem (opcional)", "f.msgPh": "Alguma coisa que devamos saber antes de confirmar?",
            "f.consent": "Aceito que a Castros Consultoria use estes dados para tratar o meu pedido, conforme a <a href=\"privacidade.html\" class=\"cp-link\">Política de Privacidade</a>.",
            "btn.next": "Continuar", "btn.back": "Voltar", "btn.submitPay": "Enviar inscrição", "btn.submit": "Enviar pedido", "btn.sending": "A enviar...",
            "preview": "Pré-visualização: este formulário não envia dados.",
            "err.send": "Não foi possível enviar o pedido. Verifique a ligação e tente de novo, ou envie-o pelo WhatsApp.", "err.sendWa": "Enviar pelo WhatsApp",
            "foot.loc": "Localização", "foot.contact": "Contacto", "foot.privacy": "Política de Privacidade", "foot.terms": "Termos de Serviço",
            "foot.rights": "© 2026 Castros Consultoria. Todos os direitos reservados.",
            "kind.event": "Evento", "kind.service": "Com marcação", "example": "Exemplo",
            "add": "Adicionar", "added": "Adicionado", "remove": "Remover {n} do pedido",
            "quote": "Sob orçamento", "perPerson": "por pessoa", "afterConfirm": "pago após confirmação",
            "tray.none": "Nenhum item escolhido", "tray.one": "1 item no pedido", "tray.many": "{n} itens no pedido",
            "tray.hint": "Toque nos cartões para juntar ao pedido.",
            "tray.payNow": "Pagar agora: {v}", "tray.toConfirm": "{n} a confirmar",
            "qty": "Participantes", "qtyHint": "Pode inscrever colegas no mesmo pedido.", "lineTotal": "{q} × {p}",
            "sched.title": "Escolha o dia e a hora.", "sched.tz": "Hora de Maputo (CAT, UTC+2)",
            "sched.day": "dia", "sched.time": "hora", "sched.prev": "Mês anterior", "sched.next": "Mês seguinte",
            "sched.free": "Livre", "sched.partial": "Poucos horários", "sched.full": "Esgotado", "sched.closed": "Fechado",
            "sched.pickDay": "Escolha um dia no calendário.", "sched.noSlots": "Sem horários livres neste dia. Experimente outro.",
            "sched.busy": "Ocupado", "sched.mine": "No seu pedido",
            "sched.multiDay": "Para formações de vários dias, escolha o primeiro dia; o resto combinamos consigo.",
            "sched.picked": "Horário escolhido", "sched.none": "Nenhum horário escolhido",
            "verify": "Confirmar horário pretendido", "verify.again": "Confirmar de novo", "verifying": "A verificar...",
            "chk.hours": "Dentro do horário de funcionamento", "chk.lead": "Com pelo menos 2 dias úteis de antecedência",
            "chk.agenda.equipa": "Equipa Castros livre", "chk.agenda.espaco": "Espaço da Rua da Tchamba livre",
            "chk.agenda.both": "Equipa e espaço livres",
            "chk.cart": "Sem sobreposição com o resto do seu pedido",
            "chk.busyPub": "Coincide com: {n}", "chk.busyPriv": "Já existe uma marcação nesse horário.",
            "chk.cartHit": "Coincide com {n}, que também está no seu pedido.",
            "chk.closed": "Fechado nesse horário.", "chk.holiday": "Feriado: {n}.", "chk.tooSoon": "Precisamos de pelo menos 2 dias úteis.",
            "res.ok": "Horário pretendido registado. Ainda não está reservado.",
            "res.okSub": "Depois de enviar o pedido, a equipa verifica a agenda e confirma por WhatsApp em até 24 horas úteis.",
            "res.bad": "Este horário não é possível.", "res.alts": "Horários possíveis mais próximos:",
            "res.noAlts": "Não há horários livres próximos. Escolha outra semana.",
            "res.changed": "Mudou a duração ou o local: escolha e verifique o horário de novo.",
            "st.pay": "Pagar agora", "st.pending": "A confirmar", "st.verified": "Horário pretendido",
            "sum.total": "Total a pagar agora", "sum.nothing": "Nada a pagar agora",
            "sum.note": "Serviços com marcação: a equipa confirma o horário e envia o orçamento por WhatsApp. Só paga depois disso.",
            "pay.title": "Como pagar", "pay.send": "Envie {v} por {m} para o número:", "pay.holder": "Em nome de {n}",
            "pay.ref": "Escreva esta referência na descrição, se a sua app permitir:",
            "pay.proof": "Guarde o SMS de confirmação e envie a captura pelo WhatsApp.",
            "pay.copy": "Copiar", "pay.copied": "Copiado",
            "pay.qr": "Já pagou? Leia este código com o telemóvel para enviar o comprovativo pelo WhatsApp.",
            "pay.remTitle": "Não se esqueça do comprovativo",
            "pay.remDesk": "Depois de pagar, envie a captura do SMS de confirmação para o WhatsApp {w}, com a referência {r}. A inscrição só fica confirmada depois disso.",
            "pay.remMob": "Depois de pagar, envie a captura do SMS de confirmação para o WhatsApp {w}, com a referência {r}. A inscrição só fica confirmada depois disso.",
            "pay.waBtn": "Enviar comprovativo no WhatsApp",
            "pay.txn": "Código da transacção (opcional)", "pay.txnHint": "Se já pagou, cole aqui o código que vem no SMS de confirmação.",
            "pay.nothingTitle": "Nada a pagar agora",
            "pay.nothing": "Os serviços que escolheu precisam de confirmação de horário. Responderemos por WhatsApp com a confirmação e o orçamento.",
            "wa.qr": "Olá! Comprovativo do pedido {r}: {v} por {m}.",
            "wa.full": "Olá! Sou {n}. Paguei {v} por {m} pelo pedido {r} ({i}). Segue o comprovativo.",
            "ok.titlePay": "Inscrição recebida.", "ok.title": "Pedido recebido.", "ok.ref": "Referência do pedido",
            "ok.t1": "Pedido registado", "ok.t1d": "Recebemos os seus dados e as suas respostas.",
            "ok.t2": "Envie o comprovativo", "ok.t2d": "Pague {v} por {m} e envie a captura do SMS pelo WhatsApp {w}, com a referência {r}.",
            "ok.t3": "Confirmação dos horários", "ok.t3d": "A equipa revê a agenda e confirma {n} por WhatsApp em até 24 horas úteis.",
            "ok.t4": "Confirmação final", "ok.t4d": "Recebe a confirmação por WhatsApp e por email.",
            "ok.again": "Fazer outro pedido",
            "announce": "Passo {n} de 3: {t}"
        },
        en: {
            "top.place": "Maputo, Mozambique", "top.hours": "Mon – Fri · 08:00 – 17:00",
            "nav.home": "Home", "nav.about": "About", "nav.services": "Services", "nav.events": "Events", "nav.contact": "Contact", "nav.cta": "Contact",
            "hero.eyebrow": "Contact and sign-ups", "hero.title": "Sign up, book, reserve.",
            "hero.lead": "Choose the events and services you want, answer a few questions about each one and pay with M-Pesa or e-Mola. All in one request.",
            "hero.s1": "Choose", "hero.s2": "Answer", "hero.s3": "Confirm and pay",
            "dash.eyebrow": "Events and services", "dash.title": "What are you looking for?", "dash.lead": "You can combine several events and services in one request.",
            "dash.all": "All", "dash.events": "Events", "dash.services": "Services", "dash.go": "Fill in the request",
            "c.eyebrow": "Contact", "c.title": "Let's talk about your next step.",
            "c.intro": "Tell us a little about what you need. Our team will look at it and get back to you.",
            "c.loc": "Location", "c.imgLabel": "We are here to listen.",
            "c.imgTitle": "Real people.<br>Real contexts.<br>Relevant solutions.",
            "c.imgText": "Share the challenge or opportunity you want to work on.",
            "p.1": "Details", "p.2": "Needs", "p.3": "Payment", "p.3b": "Confirmation",
            "s1.title": "Your details.", "s1.desc": "Tell us who you are and how to reach you.",
            "f.name": "Full name", "f.namePh": "Your full name", "f.phone": "WhatsApp / Phone",
            "f.org": "Company / Organisation", "f.orgPh": "Optional", "f.gender": "Gender", "f.age": "Age group",
            "f.loc": "Where are you?", "f.locOther": "Which city or neighbourhood?", "f.sector": "What field do you work in?",
            "f.sectorPh": "Choose a field (optional)",
            "err.name": "Enter your name.", "err.email": "Enter a valid email, for example name@company.com.",
            "err.phone": "Enter a 9-digit number, for example 84 000 0000.",
            "err.consent": "Tick this box to send the request.", "err.required": "Choose an option.",
            "err.none": "Choose at least one event or service to continue.",
            "err.fix": "Some answers are missing in {n}. They are marked in red.",
            "err.verify": "Confirm your preferred time for {n} before continuing.",
            "err.conflictNow": "The time for {n} is no longer possible. Pick another one and confirm again.",
            "s2.title": "What you need.", "s2.desc": "Each event and service has its own questions. For services with a booking, pick your preferred time; the team confirms availability on WhatsApp.",
            "s2.picker": "Add to the request",
            "s2.empty": "Nothing chosen yet. Tap an event or service above.",
            "s3.title": "Confirm and pay.", "s3.titleB": "Confirm the request.",
            "s3.desc": "Review your request. Events are paid now; booked services only after the team confirms the time.",
            "s3.descB": "Review your request. Nothing to pay now: the team confirms the times and sends a quote on WhatsApp.",
            "f.msg": "Message (optional)", "f.msgPh": "Anything we should know before confirming?",
            "f.consent": "I agree that Castros Consultoria may use this data to handle my request, as set out in the <a href=\"privacidade.html\" class=\"cp-link\">Privacy Policy</a>.",
            "btn.next": "Continue", "btn.back": "Back", "btn.submitPay": "Send sign-up", "btn.submit": "Send request", "btn.sending": "Sending...",
            "preview": "Preview: this form does not send any data.",
            "err.send": "We could not send your request. Check your connection and try again, or send it on WhatsApp.", "err.sendWa": "Send on WhatsApp",
            "foot.loc": "Location", "foot.contact": "Contact", "foot.privacy": "Privacy Policy", "foot.terms": "Terms of Service",
            "foot.rights": "© 2026 Castros Consultoria. All rights reserved.",
            "kind.event": "Event", "kind.service": "By booking", "example": "Example",
            "add": "Add", "added": "Added", "remove": "Remove {n} from the request",
            "quote": "On request", "perPerson": "per person", "afterConfirm": "paid after confirmation",
            "tray.none": "Nothing chosen", "tray.one": "1 item in the request", "tray.many": "{n} items in the request",
            "tray.hint": "Tap the cards to add them to the request.",
            "tray.payNow": "Pay now: {v}", "tray.toConfirm": "{n} to confirm",
            "qty": "Participants", "qtyHint": "You can sign up colleagues in the same request.", "lineTotal": "{q} × {p}",
            "sched.title": "Pick a day and time.", "sched.tz": "Maputo time (CAT, UTC+2)",
            "sched.day": "day", "sched.time": "time", "sched.prev": "Previous month", "sched.next": "Next month",
            "sched.free": "Free", "sched.partial": "Few times left", "sched.full": "Fully booked", "sched.closed": "Closed",
            "sched.pickDay": "Pick a day on the calendar.", "sched.noSlots": "No free times on this day. Try another.",
            "sched.busy": "Booked", "sched.mine": "In your request",
            "sched.multiDay": "For multi-day training, pick the first day; we will arrange the rest with you.",
            "sched.picked": "Chosen time", "sched.none": "No time chosen",
            "verify": "Confirm preferred time", "verify.again": "Confirm again", "verifying": "Checking...",
            "chk.hours": "Within opening hours", "chk.lead": "At least 2 working days ahead",
            "chk.agenda.equipa": "Castros team free", "chk.agenda.espaco": "Rua da Tchamba space free",
            "chk.agenda.both": "Team and space free",
            "chk.cart": "No overlap with the rest of your request",
            "chk.busyPub": "Clashes with: {n}", "chk.busyPriv": "There is already a booking at that time.",
            "chk.cartHit": "Clashes with {n}, which is also in your request.",
            "chk.closed": "Closed at that time.", "chk.holiday": "Public holiday: {n}.", "chk.tooSoon": "We need at least 2 working days.",
            "res.ok": "Preferred time noted. It is not booked yet.",
            "res.okSub": "Once you send the request, the team checks the agenda and confirms on WhatsApp within 24 working hours.",
            "res.bad": "This time is not possible.", "res.alts": "Nearest possible times:",
            "res.noAlts": "No free times nearby. Try another week.",
            "res.changed": "The duration or place changed: pick a time and check it again.",
            "st.pay": "Pay now", "st.pending": "To confirm", "st.verified": "Preferred time",
            "sum.total": "Total to pay now", "sum.nothing": "Nothing to pay now",
            "sum.note": "Booked services: the team confirms the time and sends a quote on WhatsApp. You only pay after that.",
            "pay.title": "How to pay", "pay.send": "Send {v} with {m} to:", "pay.holder": "Account name: {n}",
            "pay.ref": "Write this reference in the description, if your app allows it:",
            "pay.proof": "Keep the confirmation SMS and send a screenshot on WhatsApp.",
            "pay.copy": "Copy", "pay.copied": "Copied",
            "pay.qr": "Paid already? Scan this code with your phone to send the receipt on WhatsApp.",
            "pay.remTitle": "Remember the receipt",
            "pay.remDesk": "After paying, send a screenshot of the confirmation SMS to WhatsApp {w} with the reference {r}. Your place is confirmed only after that.",
            "pay.remMob": "After paying, send a screenshot of the confirmation SMS to WhatsApp {w} with the reference {r}. Your place is confirmed only after that.",
            "pay.waBtn": "Send receipt on WhatsApp",
            "pay.txn": "Transaction code (optional)", "pay.txnHint": "If you have paid, paste the code from the confirmation SMS.",
            "pay.nothingTitle": "Nothing to pay now",
            "pay.nothing": "The services you chose need a confirmed time. We will reply on WhatsApp with the confirmation and a quote.",
            "wa.qr": "Hi! Receipt for request {r}: {v} via {m}.",
            "wa.full": "Hi! I'm {n}. I paid {v} via {m} for request {r} ({i}). Here is the receipt.",
            "ok.titlePay": "Sign-up received.", "ok.title": "Request received.", "ok.ref": "Request reference",
            "ok.t1": "Request saved", "ok.t1d": "We have your details and answers.",
            "ok.t2": "Send the receipt", "ok.t2d": "Pay {v} via {m} and send a screenshot of the SMS to WhatsApp {w} with the reference {r}.",
            "ok.t3": "Times confirmed", "ok.t3d": "The team checks the agenda and confirms {n} on WhatsApp within 24 working hours.",
            "ok.t4": "Final confirmation", "ok.t4d": "You get the confirmation on WhatsApp and by email.",
            "ok.again": "Make another request",
            "announce": "Step {n} of 3: {t}"
        }
    };

    /* ---------------------------------------------------------- PROFILE (step 1, from the Google Form) */
    var PROFILE = {
        sexo: [O("Feminino", "Female"), O("Masculino", "Male")],
        faixa: [O("18–24 anos", "18–24"), O("25–34 anos", "25–34"), O("35–54 anos", "35–54"), O("55 anos ou mais", "55 or over")],
        localizacao: [O("Maputo", "Maputo"), O("Matola", "Matola"), O("Boane", "Boane"), O("Outra", "Other")],
        area: [O("Comércio", "Retail and trade"), O("Beleza e estética", "Beauty"), O("Saúde", "Health"), O("Educação", "Education"),
            O("Serviços", "Services"), O("Administração", "Administration"), O("Outros", "Other")]
    };

    /* ---------------------------------------------------------- THEMED QUESTIONS
       type: chips (one answer), multi (several), select, number, text, textarea */
    var Q = {
        atendimento: [   // the workshop's own Google Form, question by question
            { id: "experiencia", type: "chips", req: true, label: L("Tem experiência profissional com atendimento ao cliente?", "Do you have work experience in customer service?"),
                opts: [O("Sim, muita experiência", "Yes, a lot"), O("Sim, alguma experiência", "Yes, some"), O("Pouca experiência", "A little"), O("Nenhuma experiência", "None")] },
            { id: "frequencia", type: "chips", req: true, label: L("Com que frequência lida directamente com clientes?", "How often do you deal with customers directly?"),
                opts: [O("Diariamente", "Every day"), O("Algumas vezes por semana", "A few times a week"), O("Algumas vezes por mês", "A few times a month"), O("Raramente", "Rarely"), O("Nunca", "Never")] },
            { id: "expectativa", type: "chips", req: true, wide: true, label: L("Qual é a sua principal expectativa em relação ao workshop?", "What do you most expect from the workshop?"),
                opts: [O("Melhorar a comunicação com os clientes", "Communicate better with customers"), O("Aprender técnicas de atendimento", "Learn service techniques"),
                    O("Aprender a fidelizar clientes", "Learn to build loyalty"), O("Saber lidar com clientes difíceis", "Handle difficult customers"),
                    O("Melhorar a minha postura profissional", "Improve my professional manner"), O("Desenvolver várias destas competências", "Several of these")] },
            { id: "dificuldade", type: "chips", req: true, wide: true, label: L("Qual é a maior dificuldade que enfrenta no atendimento ao cliente?", "What is your biggest difficulty in customer service?"),
                opts: [O("Lidar com reclamações", "Handling complaints"), O("Clientes difíceis", "Difficult customers"), O("Falta de confiança", "Lack of confidence"),
                    O("Falta de conhecimento técnico", "Lack of technical knowledge"), O("Fidelização dos clientes", "Customer loyalty"), O("Não tenho dificuldades significativas", "No significant difficulties")] },
            { id: "pratica", type: "multi", wide: true, label: L("O que gostaria que o workshop tivesse além da componente teórica?", "Besides theory, what would you like the workshop to include?"),
                hint: L("Pode escolher várias.", "You can choose several."),
                opts: [O("Exercícios práticos", "Practical exercises"), O("Simulações de atendimento", "Service role-plays"), O("Dinâmicas de grupo", "Group activities"),
                    O("Estudo de casos reais", "Real case studies"), O("Sessão de perguntas e respostas", "Q&A session")] }
        ],
        oratoria: [
            { id: "nivel", type: "chips", req: true, label: L("Como se sente a falar em público hoje?", "How do you feel about public speaking today?"),
                opts: [O("Evito sempre", "I always avoid it"), O("Fico muito nervoso(a)", "I get very nervous"), O("Consigo, mas sem confiança", "I manage, without confidence"), O("Sinto-me à vontade", "I'm comfortable")] },
            { id: "situacoes", type: "multi", req: true, wide: true, label: L("Em que situações precisa de falar bem?", "Where do you need to speak well?"),
                opts: [O("Reuniões", "Meetings"), O("Apresentações", "Presentations"), O("Vendas e negociação", "Sales and negotiation"),
                    O("Eventos e cerimónias", "Events and ceremonies"), O("Entrevistas", "Interviews"), O("Vídeos e redes sociais", "Videos and social media")] },
            { id: "trava", type: "chips", req: true, wide: true, label: L("O que mais o/a trava?", "What holds you back most?"),
                opts: [O("Nervosismo", "Nerves"), O("Organizar as ideias", "Organising my ideas"), O("Voz e dicção", "Voice and diction"),
                    O("Linguagem corporal", "Body language"), O("Prender a atenção", "Holding attention")] },
            { id: "objectivo", type: "text", wide: true, label: L("O que quer conseguir no fim dos 30 dias?", "What do you want to achieve by the end of the 30 days?"),
                ph: L("Ex.: apresentar o meu negócio a investidores", "E.g. pitch my business to investors") }
        ],
        lideranca: [
            { id: "funcao", type: "chips", req: true, wide: true, label: L("Qual é a sua função?", "What is your role?"),
                opts: [O("Empreendedor(a)", "Entrepreneur"), O("Gestor(a)", "Manager"), O("Chefe de equipa", "Team lead"), O("Colaborador(a)", "Employee"), O("Estudante", "Student")] },
            { id: "equipa", type: "chips", req: true, label: L("Quantas pessoas lidera?", "How many people do you lead?"),
                opts: [O("Nenhuma", "None"), O("1 a 5", "1 to 5"), O("6 a 20", "6 to 20"), O("Mais de 20", "More than 20")] },
            { id: "desafio", type: "chips", req: true, label: L("Qual é o seu maior desafio?", "What is your biggest challenge?"),
                opts: [O("Motivar a equipa", "Motivating the team"), O("Delegar", "Delegating"), O("Decisões difíceis", "Hard decisions"),
                    O("Comunicar a visão", "Communicating the vision"), O("Gerir conflitos", "Managing conflict")] }
        ],
        consultoria: [
            { id: "area", type: "chips", req: true, wide: true, label: L("Em que área precisa de apoio?", "What do you need help with?"),
                opts: [O("Desenvolvimento organizacional", "Organisational development"), O("Gestão", "Management"), O("Pessoas e equipas", "People and teams"),
                    O("Estratégia", "Strategy"), O("Ética e liderança", "Ethics and leadership"), O("Outro", "Other")] },
            { id: "dimensao", type: "chips", req: true, label: L("Quantas pessoas trabalham na organização?", "How many people work in the organisation?"),
                opts: [O("Só eu", "Just me"), O("2 a 10", "2 to 10"), O("11 a 50", "11 to 50"), O("Mais de 50", "More than 50")] },
            { id: "fase", type: "chips", req: true, label: L("Em que fase está o negócio?", "What stage is the business at?"),
                opts: [O("Ainda é uma ideia", "Still an idea"), O("Menos de 1 ano", "Under 1 year"), O("1 a 3 anos", "1 to 3 years"), O("Mais de 3 anos", "Over 3 years")] },
            { id: "formato", type: "chips", req: true, label: L("Como prefere a primeira reunião?", "How would you like the first meeting?"),
                opts: [O("No escritório da Castros", "At the Castros office"), O("Nas nossas instalações", "At our premises"), O("Online", "Online")] },
            { id: "desafio", type: "textarea", wide: true, label: L("Descreva em poucas linhas o desafio", "Describe the challenge in a few lines"),
                ph: L("Ex.: a equipa cresceu e os processos deixaram de funcionar", "E.g. the team grew and our processes stopped working") }
        ],
        formacoes: [
            { id: "tema", type: "chips", req: true, wide: true, label: L("Que tema quer trabalhar com a equipa?", "Which topic do you want for your team?"),
                opts: [O("Atendimento ao cliente", "Customer service"), O("Comunicação e oratória", "Communication and public speaking"), O("Liderança", "Leadership"),
                    O("Gestão de equipas", "Team management"), O("Competências profissionais", "Professional skills"), O("Outro", "Other")] },
            { id: "participantes", type: "number", req: true, min: 1, max: 200, label: L("Número de participantes", "Number of participants"), ph: L("Ex.: 15", "E.g. 15") },
            { id: "local", type: "chips", req: true, affects: true, label: L("Onde?", "Where?"),
                opts: [O("No espaço Castros", "At the Castros space"), O("Nas nossas instalações", "At our premises"), O("Online", "Online")] },
            { id: "duracao", type: "chips", req: true, label: L("Duração prevista", "Expected length"),
                opts: [O("Meio dia", "Half a day"), O("1 dia", "1 day"), O("2 dias", "2 days"), O("Várias semanas", "Several weeks")] }
        ],
        palestras: [
            { id: "tipo", type: "chips", req: true, wide: true, label: L("Que tipo de evento é?", "What kind of event is it?"),
                opts: [O("Conferência", "Conference"), O("Evento corporativo", "Corporate event"), O("Escola ou universidade", "School or university"),
                    O("Encontro de equipa", "Team gathering"), O("Outro", "Other")] },
            { id: "tema", type: "chips", req: true, wide: true, label: L("Tema da palestra", "Talk topic"),
                opts: [O("Liderança", "Leadership"), O("Desenvolvimento profissional", "Professional growth"), O("Motivação e pessoas", "Motivation and people"),
                    O("Atendimento ao cliente", "Customer service"), O("Mulher e empreendedorismo", "Women and entrepreneurship"), O("Outro", "Other")] },
            { id: "publico", type: "chips", req: true, label: L("Público estimado", "Expected audience"),
                opts: [O("Até 30", "Up to 30"), O("30 a 100", "30 to 100"), O("100 a 300", "100 to 300"), O("Mais de 300", "Over 300")] },
            { id: "local", type: "text", req: true, label: L("Local do evento", "Event venue"), ph: L("Ex.: Hotel Afrin, Maputo", "E.g. Hotel Afrin, Maputo") }
        ],
        espacos: [
            { id: "uso", type: "chips", req: true, wide: true, label: L("Para que precisa do espaço?", "What do you need the space for?"),
                opts: [O("Gravação de podcast", "Podcast recording"), O("Workshop ou formação", "Workshop or training"), O("Reunião", "Meeting"),
                    O("Entrevista ou vídeo", "Interview or video"), O("Outro", "Other")] },
            { id: "pessoas", type: "number", req: true, min: 1, max: 40, label: L("Quantas pessoas?", "How many people?"), ph: L("Ex.: 4", "E.g. 4") },
            { id: "duracao", type: "chips", req: true, affects: true, label: L("Quanto tempo?", "How long?"),
                opts: [O("1 hora", "1 hour"), O("2 horas", "2 hours"), O("Meio dia (4 horas)", "Half day (4 hours)"), O("Dia inteiro (8 horas)", "Full day (8 hours)")] },
            { id: "equipamento", type: "multi", wide: true, label: L("Equipamento de que precisa", "Equipment you need"), hint: L("Pode escolher vários.", "You can choose several."),
                opts: [O("Microfones", "Microphones"), O("Projector", "Projector"), O("Ecrã TV", "TV screen"), O("Câmara", "Camera"), O("Wi-Fi", "Wi-Fi"), O("Ar condicionado", "Air conditioning")] }
        ],
        eventos: [
            { id: "tipo", type: "chips", req: true, wide: true, label: L("Que evento quer organizar?", "What event do you want to organise?"),
                opts: [O("Conferência", "Conference"), O("Evento corporativo", "Corporate event"), O("Team building", "Team building"), O("Lançamento", "Launch"), O("Outro", "Other")] },
            { id: "convidados", type: "chips", req: true, label: L("Número de convidados", "Number of guests"),
                opts: [O("Até 50", "Up to 50"), O("50 a 150", "50 to 150"), O("150 a 300", "150 to 300"), O("Mais de 300", "Over 300")] },
            { id: "espaco", type: "chips", req: true, affects: true, label: L("Precisa de espaço?", "Do you need a venue?"),
                opts: [O("Sim, no espaço Castros", "Yes, the Castros space"), O("Já temos local", "We have a venue"), O("Ainda não sabemos", "Not sure yet")] },
            { id: "orcamento", type: "select", label: L("Orçamento previsto", "Expected budget"),
                opts: [O("Prefiro não dizer", "I'd rather not say"), O("Até 50.000 MT", "Up to 50,000 MT"), O("50.000 a 150.000 MT", "50,000 to 150,000 MT"), O("Mais de 150.000 MT", "Over 150,000 MT")] }
        ]
    };

    /* ---------------------------------------------------------- ITEMS (dashboard cards)
       events: fixed date, paid in step 3. services: booked on the calendar, confirmed by the team.
       Events: only the upcoming ones from js/events.js (same id, title, dates, place and flyer as the
       home page). Add one here when it is added there; a past one hides itself (isUpcoming).
       theme = which question set in Q it uses (atendimento and lideranca are ready for the next editions). */
    var ITEMS = [
        {
            id: "formacao-comunicacao-oratoria-2-edicao", kind: "event", theme: "oratoria",
            img: "../assets/images/recent/flyer-comunicacao-oratoria-2-edicao.webp", imgPos: "center 20%",
            cat: L("Comunicação", "Communication"),
            title: L("Formação em Comunicação e Oratória (2.ª edição)", "Communication and Public Speaking Course (2nd edition)"),
            summary: L("30 dias para comunicar de forma assertiva, eficaz e profissional.", "30 days to communicate assertively, effectively and professionally."),
            date: "2026-11-01", dateEnd: "2026-12-31", monthsOnly: true, time: null,
            place: L("Rua da Tchamba n.º 113, Maputo", "Rua da Tchamba no. 113, Maputo"),
            price: 1200   // EDIT: the 1.ª edição cost 1.200 MT; confirm the 2.ª edição price
        },
        {
            id: "consultoria", kind: "service", theme: "consultoria",
            img: "../assets/images/contacto/sv-consultoria.webp", imgPos: "center 40%",
            cat: L("Consultoria", "Consulting"),
            title: L("Reunião de diagnóstico", "Diagnostic meeting"),
            summary: L("Uma hora para entender o seu desafio e propor um caminho.", "One hour to understand your challenge and propose a way forward."),
            sched: { mode: "hourly", days: [1, 2, 3, 4, 5], len: function () { return 60; } },
            res: function () { return ["equipa"]; }
        },
        {
            id: "formacoes", kind: "service", theme: "formacoes",
            img: "../assets/images/contacto/sv-formacoes.webp", imgPos: "center 30%",
            cat: L("Formações e treinamento", "Training"),
            title: L("Formação para a sua equipa", "Training for your team"),
            summary: L("Programas à medida, no nosso espaço, na sua empresa ou online.", "Tailored programmes at our space, your company or online."),
            sched: { mode: "blocks", days: [1, 2, 3, 4, 5], multiDay: true,
                blocks: [{ s: 480, e: 720, label: L("Manhã", "Morning") }, { s: 780, e: 1020, label: L("Tarde", "Afternoon") }, { s: 480, e: 1020, label: L("Dia inteiro", "Full day") }] },
            res: function (a) { return a.local === "No espaço Castros" ? ["equipa", "espaco"] : ["equipa"]; }
        },
        {
            id: "palestras", kind: "service", theme: "palestras",
            img: "../assets/images/contacto/sv-palestras.webp", imgPos: "center 30%",
            cat: L("Palestras e workshops", "Talks and workshops"),
            title: L("Palestra para o seu evento", "A talk for your event"),
            summary: L("Elizabeth Castro como oradora no seu evento, escola ou empresa.", "Elizabeth Castro as a speaker at your event, school or company."),
            sched: { mode: "hourly", days: [1, 2, 3, 4, 5], len: function () { return 120; } },
            res: function () { return ["equipa"]; }
        },
        {
            id: "espacos", kind: "service", theme: "espacos",
            img: "../assets/images/contacto/sv-espacos.webp", imgPos: "center 45%",
            cat: L("Espaços e podcasts", "Spaces and podcasts"),
            title: L("Aluguer do espaço", "Rent the space"),
            summary: L("Sala para workshops, reuniões e gravação de podcasts na Rua da Tchamba.", "A room for workshops, meetings and podcast recording on Rua da Tchamba."),
            sched: { mode: "hourly", days: [1, 2, 3, 4, 5, 6], len: function (a) {
                return ({ "1 hora": 60, "2 horas": 120, "Meio dia (4 horas)": 240, "Dia inteiro (8 horas)": 480 })[a.duracao] || 120; } },
            res: function () { return ["espaco"]; }
        },
        {
            id: "eventos", kind: "service", theme: "eventos",
            img: "../assets/images/contacto/sv-eventos.webp", imgPos: "center 35%",
            cat: L("Organização de eventos", "Event planning"),
            title: L("Organizar um evento", "Plan an event"),
            summary: L("Conferências, eventos corporativos e team building, do plano ao dia.", "Conferences, corporate events and team building, from plan to day."),
            sched: { mode: "day", days: [1, 2, 3, 4, 5, 6] },
            res: function (a) { return a.espaco === "Sim, no espaço Castros" ? ["equipa", "espaco"] : ["equipa"]; }
        }
    ];
    var BY_ID = {};
    ITEMS.forEach(function (it) { BY_ID[it.id] = it; });

    /* ---------------------------------------------------------- STATE */
    var state = {
        lang: "pt",
        step: 1,
        filter: "all",
        selected: [],
        profile: { sexo: "", faixa: "", localizacao: "" },
        answers: {},
        qty: {},
        book: {},
        method: "mpesa",
        ref: "",
        sent: false
    };

    /* ---------------------------------------------------------- HELPERS */
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    function t(key, vars) {
        var s = (STR[state.lang] && STR[state.lang][key]);
        if (s == null) s = STR.pt[key] || key;
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }
    function tx(o) { return o ? (o[state.lang] || o.pt) : ""; }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function mt(n) {
        var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, state.lang === "pt" ? "." : ",");
        return s + " MT";
    }

    var MONTHS = {
        pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
        en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    };
    var MON3 = {
        pt: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };
    var WD = {
        pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
        en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };
    var WDLONG = {
        pt: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
        en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    };

    function pd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function iso(d) {
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function hm(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
    function mins(s) { var p = s.split(":"); return +p[0] * 60 + +p[1]; }
    function dayLabel(d) {           // "Sáb, 21 Nov 2026"
        return WD[state.lang][d.getDay()] + ", " + d.getDate() + " " + MON3[state.lang][d.getMonth()] + " " + d.getFullYear();
    }
    function dayLong(d) {            // "quinta-feira, 5 de novembro"
        return state.lang === "pt"
            ? WDLONG.pt[d.getDay()] + ", " + d.getDate() + " de " + MONTHS.pt[d.getMonth()]
            : WDLONG.en[d.getDay()] + ", " + d.getDate() + " " + MONTHS.en[d.getMonth()];
    }
    function eventWhen(it) {
        if (it.monthsOnly) {
            var a = pd(it.date), b = pd(it.dateEnd);
            return MON3[state.lang][a.getMonth()] + " – " + MON3[state.lang][b.getMonth()] + " " + b.getFullYear();
        }
        return dayLabel(pd(it.date));
    }

    var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
    function isWorkday(d) { var w = d.getDay(); return w >= 1 && w <= 5 && !HOLIDAYS[iso(d)]; }
    var EARLIEST = (function () {
        var d = new Date(TODAY), n = 0;
        while (n < LEAD_WORKDAYS) { d = addDays(d, 1); if (isWorkday(d)) n++; }
        return d;
    })();
    var LAST_DAY = (function () { var d = new Date(TODAY); d.setMonth(d.getMonth() + MONTHS_AHEAD + 1, 0); return d; })();

    function isUpcoming(it) { return pd(it.dateEnd || it.date) >= TODAY; }
    function overlaps(a, b) { return a.s < b.e && b.s < a.e; }

    /* ---------------------------------------------------------- AGENDA */
    function castrosBusy(dateISO) {             // [{s, e, r, pub}]
        var out = [];
        BUSY.forEach(function (b) { if (b.d === dateISO) out.push({ s: mins(b.s), e: mins(b.e), r: b.r, pub: b.pub || null }); });
        var d = pd(dateISO);
        RECURRING.forEach(function (rr) {
            if (dateISO >= rr.from && dateISO <= rr.to && rr.dow.indexOf(d.getDay()) > -1) {
                out.push({ s: mins(rr.s), e: mins(rr.e), r: rr.r, pub: rr.pub || null });
            }
        });
        ITEMS.forEach(function (it) {           // Castros' own events block their room/team
            if (it.kind === "event" && it.busy && it.time && it.date === dateISO) {
                var p = it.time.split("–");
                out.push({ s: mins(p[0]), e: mins(p[1]), r: it.busy, pub: it.id });
            }
        });
        return out;
    }

    // what else in THIS request takes the visitor's time that day
    function cartBusy(dateISO, exceptId) {
        var out = [];
        state.selected.forEach(function (id) {
            if (id === exceptId) return;
            var it = BY_ID[id];
            if (it.kind === "event" && it.time && it.date === dateISO) {
                var p = it.time.split("–");
                out.push({ s: mins(p[0]), e: mins(p[1]), id: id });
            } else if (it.kind === "service") {
                var b = state.book[id];
                if (b && b.date === dateISO && b.s != null) out.push({ s: b.s, e: b.e, id: id });
            }
        });
        return out;
    }

    function openWindow(it, d) {                // [start, end] in minutes, or null
        var w = d.getDay();
        if (it.sched.days.indexOf(w) < 0 || !HOURS[w]) return null;
        if (HOLIDAYS[iso(d)]) return null;
        if (d < EARLIEST || d > LAST_DAY) return null;
        return [HOURS[w][0] * 60, HOURS[w][1] * 60];
    }

    function slotsFor(it, dateISO) {
        var d = pd(dateISO), win = openWindow(it, d);
        if (!win) return [];
        var a = state.answers[it.id] || {}, res = it.res(a), list = [];
        if (it.sched.mode === "hourly") {
            var len = it.sched.len(a);
            for (var s = win[0]; s + len <= win[1]; s += 60) list.push({ s: s, e: s + len });
        } else if (it.sched.mode === "blocks") {
            it.sched.blocks.forEach(function (b) { if (b.s >= win[0] && b.e <= win[1]) list.push({ s: b.s, e: b.e, label: b.label }); });
        } else {
            list.push({ s: win[0], e: win[1], label: L("Dia inteiro", "Full day") });
        }
        var busy = castrosBusy(dateISO).filter(function (b) { return b.r.some(function (r) { return res.indexOf(r) > -1; }); });
        var mine = cartBusy(dateISO, it.id);
        list.forEach(function (sl) {
            sl.busy = busy.some(function (b) { return overlaps(sl, b); });
            sl.mine = mine.some(function (b) { return overlaps(sl, b); });
            sl.free = !sl.busy && !sl.mine;
        });
        return list;
    }

    function dayStatus(it, d) {
        if (!openWindow(it, d)) return "closed";
        var sl = slotsFor(it, iso(d)), free = sl.filter(function (s) { return s.free; }).length;
        if (!free) return "full";
        return free <= Math.max(1, Math.floor(sl.length / 3)) ? "partial" : "open";
    }

    function firstOpenDay(it) {
        for (var d = new Date(EARLIEST); d <= LAST_DAY; d = addDays(d, 1)) {
            var st = dayStatus(it, d);
            if (st === "open" || st === "partial") return d;
        }
        return null;
    }

    function verify(it) {                       // the checks behind "Verificar disponibilidade"
        var b = state.book[it.id], d = pd(b.date), w = d.getDay(), a = state.answers[it.id] || {};
        var res = it.res(a), slot = { s: b.s, e: b.e }, checks = [];
        var hol = HOLIDAYS[b.date];
        var inHours = !hol && it.sched.days.indexOf(w) > -1 && HOURS[w] && b.s >= HOURS[w][0] * 60 && b.e <= HOURS[w][1] * 60;
        checks.push({ k: "hours", ok: !!inHours, why: hol ? t("chk.holiday", { n: tx(hol) }) : t("chk.closed") });
        checks.push({ k: "lead", ok: d >= EARLIEST, why: t("chk.tooSoon") });
        var hit = castrosBusy(b.date).filter(function (x) {
            return x.r.some(function (r) { return res.indexOf(r) > -1; }) && overlaps(slot, x);
        })[0];
        if (BUSY.length || RECURRING.length) {   // only claim "free" when there is an agenda to check against
            var agendaKey = res.length > 1 ? "chk.agenda.both" : "chk.agenda." + res[0];
            checks.push({ k: agendaKey, ok: !hit, why: hit ? (hit.pub ? t("chk.busyPub", { n: tx(BY_ID[hit.pub].title) }) : t("chk.busyPriv")) : "" });
        }
        var mine = cartBusy(b.date, it.id).filter(function (x) { return overlaps(slot, x); })[0];
        checks.push({ k: "chk.cart", ok: !mine, why: mine ? t("chk.cartHit", { n: tx(BY_ID[mine.id].title) }) : "" });
        return checks;
    }

    function alternatives(it, n) {
        var b = state.book[it.id], out = [], start = pd(b.date) < EARLIEST ? new Date(EARLIEST) : pd(b.date);
        for (var d = start; d <= LAST_DAY && out.length < n; d = addDays(d, 1)) {
            slotsFor(it, iso(d)).forEach(function (sl) {
                if (out.length < n && sl.free && !(iso(d) === b.date && sl.s === b.s)) out.push({ date: iso(d), s: sl.s, e: sl.e });
            });
        }
        return out;
    }

    /* ---------------------------------------------------------- DASHBOARD */
    function priceHTML(it) {
        if (it.kind === "event") return '<span class="cp-price">' + mt(it.price) + "<small>" + esc(t("perPerson")) + "</small></span>";
        return '<span class="cp-price cp-price--quote">' + esc(t("quote")) + "<small>" + esc(t("afterConfirm")) + "</small></span>";
    }

    function renderCards() {
        var box = $("#dashCards");
        box.innerHTML = ITEMS.filter(isShown).map(function (it) {
            var sel = state.selected.indexOf(it.id) > -1;
            var meta = it.kind === "event"
                ? '<span><i class="bi bi-calendar-event" aria-hidden="true"></i>' + esc(eventWhen(it)) + "</span>" +
                  (it.time ? '<span><i class="bi bi-clock" aria-hidden="true"></i>' + esc(it.time) + "</span>" : "") +
                  '<span><i class="bi bi-geo-alt" aria-hidden="true"></i>' + esc(tx(it.place)) + "</span>"
                : '<span><i class="bi bi-calendar2-check" aria-hidden="true"></i>' + esc(state.lang === "pt" ? "Escolha o dia e a hora" : "Choose day and time") + "</span>";
            return '<article class="cp-card' + (sel ? " is-selected" : "") + (state.filter !== "all" && state.filter !== it.kind ? " is-hidden" : "") + '" data-id="' + it.id + '">' +
                '<div class="cp-card-thumb"><img src="' + it.img + '" alt="" loading="lazy" style="object-position:' + (it.imgPos || "center") + '">' +
                '<span class="cp-badge">' + esc(tx(it.cat)) + "</span>" +
                (it.example ? '<span class="cp-badge cp-badge--example">' + esc(t("example")) + "</span>" : "") +
                '<span class="cp-kind"><i class="bi ' + (it.kind === "event" ? "bi-ticket-perforated" : "bi-calendar2-week") + '" aria-hidden="true"></i>' + esc(t("kind." + it.kind)) + "</span>" +
                '<span class="cp-check" aria-hidden="true"><i class="bi bi-check-lg"></i></span></div>' +
                '<div class="cp-card-body"><div class="cp-meta">' + meta + "</div>" +
                '<h3 class="cp-card-title">' + esc(tx(it.title)) + "</h3>" +
                '<p class="cp-card-summary">' + esc(tx(it.summary)) + "</p>" +
                '<div class="cp-card-foot">' + priceHTML(it) +
                '<button type="button" class="cp-toggle" data-toggle="' + it.id + '" aria-pressed="' + sel + '">' +
                '<i class="bi ' + (sel ? "bi-check2" : "bi-plus-lg") + '" aria-hidden="true"></i><span>' + esc(t(sel ? "added" : "add")) + "</span></button>" +
                "</div></div></article>";
        }).join("");
        $$("[data-tally]").forEach(function (b) {
            var k = b.getAttribute("data-tally");
            b.textContent = ITEMS.filter(function (it) { return isShown(it) && (k === "all" || it.kind === k); }).length;
        });
    }
    function isShown(it) { return it.kind === "service" || isUpcoming(it); }

    function totals() {
        var pay = 0, nPay = 0, nConfirm = 0;
        state.selected.forEach(function (id) {
            var it = BY_ID[id];
            if (it.kind === "event") { pay += it.price * (state.qty[id] || 1); nPay++; } else nConfirm++;
        });
        return { pay: pay, nPay: nPay, nConfirm: nConfirm };
    }

    function renderTray() {
        var n = state.selected.length, tt = totals(), tray = $("#dashTray");
        tray.classList.toggle("has-items", n > 0);
        $("#trayCount").textContent = n === 0 ? t("tray.none") : n === 1 ? t("tray.one") : t("tray.many", { n: n });
        var bits = [];
        if (tt.pay) bits.push(t("tray.payNow", { v: mt(tt.pay) }));
        if (tt.nConfirm) bits.push(t("tray.toConfirm", { n: tt.nConfirm }));
        $("#traySub").textContent = n ? bits.join(" · ") : t("tray.hint");
    }

    function toggleItem(id, force) {
        var i = state.selected.indexOf(id), on = force != null ? force : i < 0;
        if (on && i < 0) {
            state.selected.push(id);
            if (!state.answers[id]) state.answers[id] = {};
            if (BY_ID[id].kind === "event" && !state.qty[id]) state.qty[id] = 1;
        } else if (!on && i > -1) {
            state.selected.splice(i, 1);
            delete state.book[id];
        }
        renderCards(); renderTray(); renderPicker();
        if (state.step === 2) renderPanels();
    }

    /* ---------------------------------------------------------- STEP 1 */
    function chipsHTML(name, opts, current, type) {
        return opts.map(function (o, i) {
            var on = type === "checkbox" ? (current || []).indexOf(o.v) > -1 : current === o.v;
            return '<label class="cp-chip"><input type="' + (type || "radio") + '" name="' + name + '" value="' + esc(o.v) + '"' + (on ? " checked" : "") +
                ' data-i="' + i + '"><span>' + esc(tx(o)) + "</span></label>";
        }).join("");
    }

    function renderProfile() {
        ["sexo", "faixa", "localizacao"].forEach(function (g) {
            $('[data-group="' + g + '"]').innerHTML = chipsHTML("p_" + g, PROFILE[g], state.profile[g]);
        });
        var sel = $("#f-sector"), cur = sel.value;
        sel.innerHTML = '<option value="">' + esc(t("f.sectorPh")) + "</option>" +
            PROFILE.area.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(tx(o)) + "</option>"; }).join("");
        sel.value = cur;
        $("#f-loc-other").hidden = state.profile.localizacao !== "Outra";
    }

    function phoneOk(v) {
        var d = v.replace(/[\s().-]/g, "");
        if (/^(\+?258)?8[2-7]\d{7}$/.test(d)) return true;
        return /^\+\d{10,15}$/.test(d);
    }

    function validateStep1() {
        var ok = true, first = null;
        [["#f-name", function (v) { return v.trim().length >= 2; }],
         ["#f-email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }],
         ["#f-phone", phoneOk]].forEach(function (p) {
            var el = $(p[0]), good = p[1](el.value);
            el.classList.toggle("is-invalid", !good);
            el.setAttribute("aria-invalid", String(!good));
            if (!good) { ok = false; first = first || el; }
        });
        if (first) first.focus();
        return ok;
    }

    /* ---------------------------------------------------------- STEP 2 */
    function renderPicker() {
        var row = $("#pickerRow");
        if (!row) return;
        row.innerHTML = ITEMS.filter(isShown).map(function (it) {
            var on = state.selected.indexOf(it.id) > -1;
            return '<button type="button" class="cp-pick" data-toggle="' + it.id + '" aria-pressed="' + on + '">' +
                '<img src="' + it.img + '" alt="" style="object-position:' + (it.imgPos || "center") + '">' +
                "<span>" + esc(tx(it.kind === "event" ? it.cat : it.cat)) + (it.kind === "event" ? " · " + esc(eventWhen(it)) : "") + "</span>" +
                '<i class="bi ' + (on ? "bi-check-circle-fill" : "bi-plus-circle") + '" aria-hidden="true"></i></button>';
        }).join("");
    }

    function questionHTML(it, q) {
        var a = state.answers[it.id] || {}, name = "q_" + it.id + "_" + q.id, id = "q-" + it.id + "-" + q.id, html;
        var label = esc(tx(q.label)) + (q.req ? ' <span class="req">*</span>' : "");
        var hint = q.hint ? '<span class="cp-hint">' + esc(tx(q.hint)) + "</span>" : "";
        if (q.type === "chips" || q.type === "multi") {
            html = '<span class="form-label" id="' + id + '-l">' + label + "</span>" + hint +
                '<div class="cp-chips" role="' + (q.type === "chips" ? "radiogroup" : "group") + '" aria-labelledby="' + id + '-l" data-q="' + q.id + '">' +
                chipsHTML(name, q.opts, a[q.id], q.type === "multi" ? "checkbox" : "radio") + "</div>";
        } else if (q.type === "select") {
            html = '<label class="form-label" for="' + id + '">' + label + "</label>" +
                '<select class="form-select" id="' + id + '" data-q="' + q.id + '"><option value="">—</option>' +
                q.opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (a[q.id] === o.v ? " selected" : "") + ">" + esc(tx(o)) + "</option>"; }).join("") + "</select>";
        } else if (q.type === "textarea") {
            html = '<label class="form-label" for="' + id + '">' + label + "</label>" +
                '<textarea class="form-control" rows="3" id="' + id + '" data-q="' + q.id + '" placeholder="' + esc(tx(q.ph)) + '">' + esc(a[q.id] || "") + "</textarea>";
        } else {
            html = '<label class="form-label" for="' + id + '">' + label + "</label>" +
                '<input class="form-control" id="' + id + '" data-q="' + q.id + '" type="' + (q.type === "number" ? "number" : "text") + '"' +
                (q.type === "number" ? ' inputmode="numeric" min="' + q.min + '" max="' + q.max + '"' : "") +
                ' value="' + esc(a[q.id] || "") + '" placeholder="' + esc(tx(q.ph)) + '">';
        }
        return '<div class="cp-q' + (q.wide ? " cp-q--wide" : "") + '" data-qwrap="' + q.id + '">' + html +
            '<div class="cp-qerr">' + esc(t("err.required")) + "</div></div>";
    }

    function panelHTML(it) {
        var sub = it.kind === "event"
            ? esc(eventWhen(it)) + (it.time ? " · " + esc(it.time) : "") + " · " + esc(tx(it.place))
            : esc(tx(it.cat));
        var h = '<section class="cp-panel" data-panel="' + it.id + '" aria-label="' + esc(tx(it.title)) + '">' +
            '<header class="cp-panel-head"><img src="' + it.img + '" alt="" style="object-position:' + (it.imgPos || "center") + '">' +
            '<div class="cp-panel-title"><h4>' + esc(tx(it.title)) + "</h4><p>" + sub + "</p>" +
            '<span class="cp-status ' + (it.kind === "event" ? "cp-status--pay" : "cp-status--pending") + '" data-panel-status="' + it.id + '">' + statusText(it) + "</span></div>" +
            '<button type="button" class="cp-remove" data-remove="' + it.id + '" aria-label="' + esc(t("remove", { n: tx(it.title) })) + '"><i class="bi bi-x-lg" aria-hidden="true"></i></button></header>' +
            '<div class="cp-panel-body"><div class="cp-qgrid">' + Q[it.theme].map(function (q) { return questionHTML(it, q); }).join("") + "</div>";
        if (it.kind === "event") {
            var q = state.qty[it.id] || 1;
            h += '<div class="cp-qgrid"><div class="cp-q"><span class="form-label">' + esc(t("qty")) + '</span><span class="cp-hint">' + esc(t("qtyHint")) + "</span>" +
                '<div class="cp-qty"><button type="button" data-qty="-1" data-for="' + it.id + '" aria-label="−"' + (q <= 1 ? " disabled" : "") + '><i class="bi bi-dash"></i></button>' +
                '<output aria-live="polite">' + q + '</output><button type="button" data-qty="1" data-for="' + it.id + '" aria-label="+"' + (q >= 10 ? " disabled" : "") + '><i class="bi bi-plus"></i></button></div></div>' +
                '<div class="cp-q" style="align-self:end"><div class="cp-line-total"><span>' + esc(t("lineTotal", { q: q, p: mt(it.price) })) + "</span><strong>" + mt(q * it.price) + "</strong></div></div></div>";
        } else {
            h += '<div class="cp-sched" data-sched="' + it.id + '">' + schedHTML(it) + "</div>";
        }
        return h + "</div></section>";
    }

    function statusText(it) {
        if (it.kind === "event") return esc(t("st.pay"));
        var b = state.book[it.id];
        return esc(t(b && b.status === "ok" ? "st.verified" : "st.pending"));
    }

    function renderPanels() {
        var box = $("#itemPanels");
        if (!state.selected.length) {
            box.innerHTML = '<div class="cp-empty"><i class="bi bi-hand-index" aria-hidden="true"></i>' + esc(t("s2.empty")) + "</div>";
            return;
        }
        state.selected.forEach(function (id) {             // a day is pre-selected so the times show at once
            var it = BY_ID[id];
            if (it.kind !== "service") return;
            var b = state.book[id] || (state.book[id] = {});
            if (!b.date) {
                var d = firstOpenDay(it);
                if (d) { b.date = iso(d); b.view = [d.getFullYear(), d.getMonth()]; }
            }
            if (!b.view) { var v = b.date ? pd(b.date) : EARLIEST; b.view = [v.getFullYear(), v.getMonth()]; }
        });
        box.innerHTML = state.selected.map(function (id) { return panelHTML(BY_ID[id]); }).join("");
    }

    /* ----- scheduler */
    function schedHTML(it) {
        var b = state.book[it.id] || {}, view = b.view || [EARLIEST.getFullYear(), EARLIEST.getMonth()];
        var y = view[0], m = view[1], first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
        var minView = new Date(EARLIEST.getFullYear(), EARLIEST.getMonth(), 1), maxView = new Date(LAST_DAY.getFullYear(), LAST_DAY.getMonth(), 1);
        var lead = (first.getDay() + 6) % 7;      // Monday first
        var dows = [1, 2, 3, 4, 5, 6, 0].map(function (w) { return '<span class="cp-cal-dow">' + WD[state.lang][w] + "</span>"; }).join("");
        var cells = "";
        for (var i = 0; i < lead; i++) cells += "<span></span>";
        for (var dd = 1; dd <= days; dd++) {
            var d = new Date(y, m, dd), st = dayStatus(it, d), di = iso(d);
            var cls = "cp-day" + (st === "open" || st === "partial" ? " is-open" : "") + (st === "partial" ? " is-partial" : "") + (st === "full" ? " is-full" : "") +
                (+d === +TODAY ? " is-today" : "") + (b.date === di ? " is-selected" : "");
            var stLabel = st === "open" ? t("sched.free") : st === "partial" ? t("sched.partial") : st === "full" ? t("sched.full") : (HOLIDAYS[di] ? tx(HOLIDAYS[di]) : t("sched.closed"));
            var can = st === "open" || st === "partial";
            cells += '<button type="button" class="' + cls + '" data-day="' + di + '"' + (can ? "" : " disabled") +
                ' aria-pressed="' + (b.date === di) + '" aria-label="' + esc(dayLong(d) + " · " + stLabel) + '">' + dd + "</button>";
        }
        var times;
        if (!b.date) times = '<p class="cp-times-empty">' + esc(t("sched.pickDay")) + "</p>";
        else {
            var sl = slotsFor(it, b.date);
            times = sl.length && sl.some(function (s) { return s.free; })
                ? '<div class="cp-times-list" role="group" aria-label="' + esc(dayLong(pd(b.date))) + '">' + sl.map(function (s, i) {
                    var on = b.s === s.s && b.e === s.e;
                    var label = (s.label ? tx(s.label) + " · " : "") + hm(s.s) + " – " + hm(s.e);
                    var note = s.mine ? t("sched.mine") : s.busy ? t("sched.busy") : "";
                    return '<button type="button" class="cp-slot" style="animation-delay:' + (reduced ? 0 : i * 35) + 'ms" data-slot="' + s.s + "-" + s.e + '"' +
                        (s.free ? "" : " disabled") + ' aria-pressed="' + on + '"><span>' + esc(label) + "</span>" + (note ? "<small>" + esc(note) + "</small>" : "") + "</button>";
                }).join("") + "</div>"
                : '<p class="cp-times-empty">' + esc(t("sched.noSlots")) + "</p>";
        }
        var picked = b.s != null
            ? esc(dayLong(pd(b.date))) + "<small>" + hm(b.s) + " – " + hm(b.e) + " · " + esc(t("sched.tz")) + "</small>"
            : esc(t("sched.none")) + "<small>" + esc(t("sched.pickDay")) + "</small>";
        return '<div class="cp-sched-head"><strong>' + esc(t("sched.title")) + '</strong><span class="cp-tz"><i class="bi bi-globe2" aria-hidden="true"></i> ' + esc(t("sched.tz")) + "</span></div>" +
            '<div class="cp-sched-grid"><div class="cp-cal"><div class="cp-col-label"><em>01</em>' + esc(t("sched.day")) + ".</div>" +
            '<div class="cp-cal-nav"><button type="button" data-month="-1" aria-label="' + esc(t("sched.prev")) + '"' + (first <= minView ? " disabled" : "") + '><i class="bi bi-chevron-left"></i></button>' +
            '<span class="cp-cal-month" aria-live="polite">' + MONTHS[state.lang][m] + " " + y + "</span>" +
            '<button type="button" data-month="1" aria-label="' + esc(t("sched.next")) + '"' + (first >= maxView ? " disabled" : "") + '><i class="bi bi-chevron-right"></i></button></div>' +
            '<div class="cp-cal-days">' + dows + cells + "</div>" +
            '<div class="cp-legend"><span><i style="background:#04bfcd"></i>' + esc(t("sched.free")) + '</span><span><i style="background:#e2a33a"></i>' + esc(t("sched.partial")) +
            '</span><span><i style="background:#c3ccd3"></i>' + esc(t("sched.full")) + " / " + esc(t("sched.closed")) + "</span></div>" +
            (it.sched.multiDay ? '<p class="cp-hint mt-2 mb-0">' + esc(t("sched.multiDay")) + "</p>" : "") + "</div>" +
            '<div class="cp-times"><div class="cp-col-label"><em>02</em>' + esc(t("sched.time")) + ".</div>" + times + "</div></div>" +
            '<div class="cp-verify"><div class="cp-verify-row"><div class="cp-picked">' + picked + "</div>" +
            '<button type="button" class="cp-verify-btn" data-verify="' + it.id + '"' + (b.s == null || b.status === "checking" ? " disabled" : "") + ">" +
            '<i class="bi bi-shield-check" aria-hidden="true"></i><span>' + esc(t(b.status === "checking" ? "verifying" : (b.status === "ok" || b.status === "bad") ? "verify.again" : "verify")) + "</span></button></div>" +
            '<div data-verify-out="' + it.id + '" aria-live="polite">' + verifyOutHTML(it, b) + "</div></div>";
    }

    function checkLabel(k) { return t(k.indexOf("chk.") === 0 ? k : "chk." + k); }

    function verifyOutHTML(it, b) {
        if (b.note) return '<div class="cp-result cp-result--bad"><i class="bi bi-arrow-repeat" aria-hidden="true"></i><div>' + esc(t("res.changed")) + "</div></div>";
        if (!b.checks) return "";
        var h = '<ul class="cp-checks">' + b.checks.map(function (c, i) {
            var stc = b.status === "checking" ? (i < b.shown ? (c.ok ? "is-ok" : "is-bad") : i === b.shown ? "is-run" : "") : (c.ok ? "is-ok" : "is-bad");
            var ic = stc === "is-ok" ? '<i class="bi bi-check-lg"></i>' : stc === "is-bad" ? '<i class="bi bi-x-lg"></i>' : "";
            return '<li class="' + stc + '"><span class="ic" aria-hidden="true">' + ic + "</span><span>" + esc(checkLabel(c.k)) +
                (stc === "is-bad" && c.why ? "<small>" + esc(c.why) + "</small>" : "") + "</span></li>";
        }).join("") + "</ul>";
        if (b.status === "ok") {
            h += '<div class="cp-result cp-result--ok"><i class="bi bi-calendar2-check-fill" aria-hidden="true"></i><div><strong>' + esc(t("res.ok")) + "</strong>" + esc(t("res.okSub")) + "</div></div>";
        } else if (b.status === "bad") {
            h += '<div class="cp-result cp-result--bad"><i class="bi bi-exclamation-octagon-fill" aria-hidden="true"></i><div><strong>' + esc(t("res.bad")) + "</strong>" +
                (b.alts && b.alts.length ? esc(t("res.alts")) + '<div class="cp-alts">' + b.alts.map(function (a) {
                    return '<button type="button" data-alt="' + a.date + "|" + a.s + "|" + a.e + '">' + esc(dayLabel(pd(a.date)).replace(/ \d{4}$/, "")) + " · " + hm(a.s) + "–" + hm(a.e) + "</button>";
                }).join("") + "</div>" : esc(t("res.noAlts"))) + "</div></div>";
        }
        return h;
    }

    function rerenderSched(id, focusSel) {
        var box = $('[data-sched="' + id + '"]');
        if (!box) return;
        box.innerHTML = schedHTML(BY_ID[id]);
        var st = $('[data-panel-status="' + id + '"]');
        if (st) st.textContent = statusText(BY_ID[id]).replace(/&amp;/g, "&");
        if (focusSel) { var f = $(focusSel, box); if (f) f.focus({ preventScroll: true }); }
    }

    function runVerify(id) {
        var it = BY_ID[id], b = state.book[id];
        if (!b || b.s == null) return;
        b.note = false;
        b.checks = verify(it);
        b.status = "checking"; b.shown = 0;
        rerenderSched(id);
        var step = reduced ? 60 : 380;
        (function tick() {
            b.shown++;
            if (b.shown < b.checks.length) {
                var out = $('[data-verify-out="' + id + '"]');
                if (out) out.innerHTML = verifyOutHTML(it, b);
                setTimeout(tick, step);
            } else {
                var ok = b.checks.every(function (c) { return c.ok; });
                b.status = ok ? "ok" : "bad";
                b.alts = ok ? [] : alternatives(it, 3);
                rerenderSched(id, ".cp-verify-btn");
                renderTray();
                hideStepError();
            }
        })();
    }

    // a change elsewhere (duration, place, another booking) can invalidate a pre-booking
    function revalidateAll() {
        var broken = null;
        state.selected.forEach(function (id) {
            var it = BY_ID[id], b = state.book[id];
            if (it.kind !== "service" || !b || b.status !== "ok") return;
            var ok = verify(it).every(function (c) { return c.ok; });
            if (!ok) { b.status = "bad"; b.checks = verify(it); b.alts = alternatives(it, 3); broken = broken || it; rerenderSched(id); }
        });
        return broken;
    }

    function validateStep2() {
        hideStepError();
        if (!state.selected.length) return stepError(t("err.none"));
        var missing = null, unverified = null;
        state.selected.forEach(function (id) {
            var it = BY_ID[id], a = state.answers[id] || {};
            Q[it.theme].forEach(function (q) {
                var v = a[q.id], empty = q.req && (v == null || v === "" || (Array.isArray(v) && !v.length));
                var wrap = $('[data-panel="' + id + '"] [data-qwrap="' + q.id + '"]');
                if (!wrap) return;
                var field = $(".cp-chips, .form-control, .form-select", wrap);
                if (field) field.classList.toggle("is-invalid", !!empty);
                if (empty && !missing) missing = { it: it, el: wrap };
            });
            if (it.kind === "service") {
                var b = state.book[id];
                if ((!b || b.status !== "ok") && !unverified) unverified = it;
            }
        });
        if (missing) {
            stepError(t("err.fix", { n: tx(missing.it.title) }));
            missing.el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
            var f = $("input, select, textarea", missing.el); if (f) f.focus({ preventScroll: true });
            return false;
        }
        var broken = revalidateAll();
        if (broken) return stepError(t("err.conflictNow", { n: tx(broken.title) }), broken.id);
        if (unverified) return stepError(t("err.verify", { n: tx(unverified.title) }), unverified.id);
        return true;
    }

    function stepError(msg, focusId) {
        var e = $("#step2Error"); e.textContent = msg; e.hidden = false;
        if (focusId) {
            var p = $('[data-sched="' + focusId + '"]');
            if (p) { p.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); }
        }
        return false;
    }
    function hideStepError() { var e = $("#step2Error"); if (e) e.hidden = true; }

    /* ---------------------------------------------------------- STEP 3 */
    function makeRef() {
        var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = "";
        for (var i = 0; i < 3; i++) r += abc[Math.floor(Math.random() * abc.length)];
        var d = new Date();
        return "CC-" + String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + "-" + r;
    }

    function itemsShort() {
        return state.selected.map(function (id) {
            var it = BY_ID[id];
            return tx(it.title) + (it.kind === "event" && (state.qty[id] || 1) > 1 ? " ×" + state.qty[id] : "");
        }).join("; ");
    }

    function waUrl(text) { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text); }

    function renderSummary() {
        var tt = totals();
        $("#s3Title").textContent = t(tt.pay ? "s3.title" : "s3.titleB");
        $("#s3Desc").textContent = t(tt.pay ? "s3.desc" : "s3.descB");
        $("#progressLabel3").textContent = t(tt.pay ? "p.3" : "p.3b");
        $("#submitText").textContent = t(tt.pay ? "btn.submitPay" : "btn.submit");
        var rows = state.selected.map(function (id) {
            var it = BY_ID[id], line, amt;
            if (it.kind === "event") {
                var q = state.qty[id] || 1;
                line = esc(eventWhen(it)) + (it.time ? " · " + esc(it.time) : "") + " · " + esc(tx(it.place));
                amt = mt(q * it.price) + "<small>" + esc(t("lineTotal", { q: q, p: mt(it.price) })) + "</small>";
                return row(it, line, amt, '<span class="cp-status cp-status--pay"><i class="bi bi-wallet2" aria-hidden="true"></i>' + esc(t("st.pay")) + "</span>");
            }
            var b = state.book[id];
            line = esc(dayLong(pd(b.date))) + " · " + hm(b.s) + " – " + hm(b.e);
            amt = esc(t("quote")) + "<small>" + esc(t("afterConfirm")) + "</small>";
            return row(it, line, amt, '<span class="cp-status cp-status--pending"><i class="bi bi-hourglass-split" aria-hidden="true"></i>' + esc(t("st.verified")) + " · " + esc(t("st.pending")) + "</span>");
        }).join("");
        function row(it, line, amt, pill) {
            return '<div class="cp-sum-row"><img src="' + it.img + '" alt="" style="object-position:' + (it.imgPos || "center") + '">' +
                "<div><h4>" + esc(tx(it.title)) + "</h4><p>" + line + "</p>" + pill + '</div><div class="cp-sum-amt">' + amt + "</div></div>";
        }
        $("#summaryBox").innerHTML = '<div class="cp-summary">' + rows +
            (tt.nConfirm ? '<div class="cp-sum-note"><i class="bi bi-info-circle" aria-hidden="true"></i><span>' + esc(t("sum.note")) + "</span></div>" : "") +
            '<div class="cp-sum-total"><span>' + esc(t(tt.pay ? "sum.total" : "sum.nothing")) + "</span><strong>" + mt(tt.pay) + "</strong></div></div>";
        renderPay();
    }

    function renderPay() {
        var tt = totals(), box = $("#payBox");
        if (!tt.pay) {
            box.innerHTML = '<div class="cp-pay"><div class="cp-wa-reminder" style="margin:1.25rem"><i class="bi bi-chat-dots-fill" aria-hidden="true"></i><div><strong>' +
                esc(t("pay.nothingTitle")) + "</strong>" + esc(t("pay.nothing")) + "</div></div></div>";
            return;
        }
        var m = PAY[state.method], name = $("#f-name").value.trim();
        var short = t("wa.qr", { r: state.ref, v: mt(tt.pay), m: m.name });
        var full = t("wa.full", { n: name || "—", v: mt(tt.pay), m: m.name, r: state.ref, i: itemsShort() });
        box.innerHTML = '<div class="cp-pay">' +
            '<div class="cp-pay-tabs" role="tablist" aria-label="' + esc(t("pay.title")) + '">' +
            Object.keys(PAY).map(function (k) {
                var on = k === state.method;
                return '<button type="button" role="tab" class="cp-pay-tab" style="--tab-c:' + PAY[k].color + '" data-method="' + k + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '">' +
                    '<i style="background:' + PAY[k].color + '" aria-hidden="true"></i>' + PAY[k].name + "</button>";
            }).join("") + "</div>" +
            '<div class="cp-pay-body" role="tabpanel"><ol class="cp-pay-steps">' +
            "<li><div>" + esc(t("pay.send", { v: mt(tt.pay), m: m.name })) +
            '<div class="cp-copy"><code id="payNumber">' + m.number + '</code><button type="button" data-copy="' + m.number.replace(/\s/g, "") + '"><i class="bi bi-copy" aria-hidden="true"></i><span>' + esc(t("pay.copy")) + "</span></button></div>" +
            '<span class="cp-hint mt-1 mb-0">' + esc(t("pay.holder", { n: m.holder })) + "</span></div></li>" +
            "<li><div>" + esc(t("pay.ref")) + '<div class="cp-copy"><code>' + state.ref + '</code><button type="button" data-copy="' + state.ref + '"><i class="bi bi-copy" aria-hidden="true"></i><span>' +
            esc(t("pay.copy")) + "</span></button></div></div></li>" +
            "<li><div>" + esc(t("pay.proof")) + "</div></li></ol>" +
            '<div class="cp-qr only-desktop"><div class="cp-qr-code" id="payQr" role="img" aria-label="QR WhatsApp"></div><p>' + esc(t("pay.qr")) + "</p></div></div>" +
            '<div class="cp-wa-reminder"><i class="bi bi-whatsapp" aria-hidden="true"></i><div><strong>' + esc(t("pay.remTitle")) + "</strong>" +
            '<span class="only-desktop">' + esc(t("pay.remDesk", { w: WHATSAPP_SHOWN, r: state.ref })) + "</span>" +
            '<span class="only-mobile">' + esc(t("pay.remMob", { w: WHATSAPP_SHOWN, r: state.ref })) +
            '<br><a class="cp-wa-btn" href="' + waUrl(full) + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i>' + esc(t("pay.waBtn")) + "</a></span></div></div>" +
            '<div class="cp-txn"><label class="form-label" for="f-txn">' + esc(t("pay.txn")) + '</label><span class="cp-hint">' + esc(t("pay.txnHint")) + "</span>" +
            '<input class="form-control" id="f-txn" name="codigo_transaccao" autocomplete="off"></div></div>';
        drawQr($("#payQr"), waUrl(short));
    }

    function drawQr(box, url) {
        if (!box) return;
        if (typeof window.qrcode !== "function") { var p = box.closest(".cp-qr"); if (p) p.hidden = true; return; }
        var qr = window.qrcode(0, "L");
        qr.addData(url); qr.make();
        box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
        var svg = box.querySelector("svg"); if (svg) svg.setAttribute("shape-rendering", "crispEdges");
    }

    /* ---------------------------------------------------------- SUCCESS */
    function renderSuccess() {
        var tt = totals(), m = PAY[state.method], box = $("#successBox");
        var services = state.selected.filter(function (id) { return BY_ID[id].kind === "service"; }).map(function (id) { return tx(BY_ID[id].title); });
        var steps = ['<li class="is-done"><span class="dot"><i class="bi bi-check-lg"></i></span><div><strong>' + esc(t("ok.t1")) + "</strong>" + esc(t("ok.t1d")) + "</div></li>"];
        if (tt.pay) {
            steps.push('<li><span class="dot"><i class="bi bi-whatsapp"></i></span><div><strong>' + esc(t("ok.t2")) + "</strong>" +
                esc(t("ok.t2d", { v: mt(tt.pay), m: m.name, w: WHATSAPP_SHOWN, r: state.ref })) +
                '<div class="cp-qr only-desktop mt-3"><div class="cp-qr-code" id="okQr" role="img" aria-label="QR WhatsApp"></div><p>' + esc(t("pay.qr")) + "</p></div>" +
                '<span class="only-mobile"><a class="cp-wa-btn" href="' + waUrl(t("wa.full", { n: $("#f-name").value.trim(), v: mt(tt.pay), m: m.name, r: state.ref, i: itemsShort() })) +
                '" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i>' + esc(t("pay.waBtn")) + "</a></span></div></li>");
        }
        if (services.length) {
            steps.push('<li><span class="dot"><i class="bi bi-calendar2-check"></i></span><div><strong>' + esc(t("ok.t3")) + "</strong>" + esc(t("ok.t3d", { n: services.join(", ") })) + "</div></li>");
        }
        steps.push('<li><span class="dot"><i class="bi bi-envelope-check"></i></span><div><strong>' + esc(t("ok.t4")) + "</strong>" + esc(t("ok.t4d")) + "</div></li>");
        box.innerHTML = '<div class="cp-success-head"><span class="cp-success-icon"><i class="bi bi-check2"></i></span>' +
            "<h3>" + esc(t(tt.pay ? "ok.titlePay" : "ok.title")) + '</h3><p class="cp-success-ref">' + esc(t("ok.ref")) + ": <code>" + state.ref + "</code></p></div>" +
            '<ol class="cp-timeline">' + steps.join("") + "</ol>" +
            '<div class="cp-success-actions"><button type="button" class="btn btn-contact-secondary" id="againBtn"><i class="bi bi-arrow-counterclockwise"></i> ' + esc(t("ok.again")) + "</button></div>";
        if (tt.pay) drawQr($("#okQr"), waUrl(t("wa.qr", { r: state.ref, v: mt(tt.pay), m: m.name })));
    }

    /* ---------------------------------------------------------- STEPS + MOTION */
    function setExpanded(on) {
        var main = $("#cpMain"), media = $("#cpMedia");
        main.classList.toggle("is-expanded", on);
        if (on) { media.setAttribute("aria-hidden", "true"); media.inert = true; }
        else { media.removeAttribute("aria-hidden"); media.inert = false; }
    }

    function goTo(step, back) {
        state.step = step;
        $$(".cp-step").forEach(function (s) {
            var on = +s.getAttribute("data-form-step") === step;
            s.classList.toggle("active", on);
            s.classList.toggle("from-back", on && !!back);
        });
        $$(".progress-step").forEach(function (p, i) {
            p.classList.toggle("active", i + 1 === step);
            p.classList.toggle("completed", i + 1 < step);
        });
        $$(".progress-line").forEach(function (l, i) { l.classList.toggle("completed", i + 1 < step); });
        var titles = { 1: "s1.title", 2: "s2.title", 3: totals().pay ? "s3.title" : "s3.titleB" };
        $("#stepAnnounce").textContent = t("announce", { n: step, t: t(titles[step]) });
        var card = $("#contact-form");
        setTimeout(function () {
            var top = card.getBoundingClientRect().top;
            if (top < 0 || top > window.innerHeight * 0.4) {
                window.scrollTo({ top: window.scrollY + top - 96, behavior: reduced ? "auto" : "smooth" });
            }
            var h = $('.cp-step.active .form-step-title'); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        }, step === 2 && !back ? 120 : 30);
    }

    function next() {
        if (state.step === 1) {
            if (!validateStep1()) return;
            setExpanded(true);
            renderPicker(); renderPanels();
            goTo(2);
        } else if (state.step === 2) {
            if (!validateStep2()) return;
            if (!state.ref) state.ref = makeRef();
            renderSummary();
            goTo(3);
        }
    }

    function prev() { if (state.step > 1) goTo(state.step - 1, true); }

    function submit(e) {
        e.preventDefault();
        if (state.step !== 3) return;
        var c = $("#f-consent");
        c.classList.toggle("is-invalid", !c.checked);
        if (!c.checked) { c.focus(); return; }
        var payload = buildPayload();
        var btn = $("#submitBtn");
        btn.disabled = true;
        $(".submit-label", btn).hidden = true; $(".submit-loading", btn).hidden = false;
        var done = function () {
            btn.disabled = false; $(".submit-label", btn).hidden = false; $(".submit-loading", btn).hidden = true;
            state.sent = true;
            $("#cpForm").hidden = true;
            $$(".form-progress, .progress-labels").forEach(function (el) { el.hidden = true; });
            renderSuccess();
            var sb = $("#successBox"); sb.hidden = false; sb.focus({ preventScroll: true });
            var top = $("#contact-form").getBoundingClientRect().top;
            if (top < 0) window.scrollTo({ top: window.scrollY + top - 96, behavior: reduced ? "auto" : "smooth" });
        };
        if (PREVIEW) { console.info("[contacto] payload (preview, not sent):", payload); setTimeout(done, 1100); return; }
        var se = $("#sendError"); if (se) se.hidden = true;
        fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
            .catch(function (err) {
                console.error("[contacto] send failed:", err);
                btn.disabled = false; $(".submit-label", btn).hidden = false; $(".submit-loading", btn).hidden = true;
                if (se) {   // never fail silently: offer WhatsApp with the whole request in the message
                    se.innerHTML = esc(t("err.send")) + ' <a class="cp-wa-btn" href="' + waUrl(payload.resumo) + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i>' + esc(t("err.sendWa")) + "</a>";
                    se.hidden = false; se.focus && se.focus();
                }
            });
    }

    // one readable text block: easy to read in the notification email, and the WhatsApp fallback message
    function plainSummary() {
        var tt = totals(), L2 = [];
        L2.push("Pedido " + state.ref + " · " + $("#f-name").value.trim());
        L2.push("Email: " + $("#f-email").value.trim() + " · Tel: " + $("#f-phone").value.trim());
        if ($("#f-org").value.trim()) L2.push("Organização: " + $("#f-org").value.trim());
        state.selected.forEach(function (id) {
            var it = BY_ID[id], line = "- " + it.title.pt;
            if (it.kind === "event") line += " · " + (state.qty[id] || 1) + " participante(s) · " + mt((state.qty[id] || 1) * it.price);
            else { var b = state.book[id]; if (b && b.date && b.s != null) line += " · pretendido " + b.date + " " + hm(b.s) + "–" + hm(b.e) + " (a confirmar)"; }
            var ans = state.answers[id] || {};
            Object.keys(ans).forEach(function (k) {
                var v = ans[k]; if (v === "" || v == null || (Array.isArray(v) && !v.length)) return;
                line += "\n    " + k + ": " + (Array.isArray(v) ? v.join(", ") : v);
            });
            L2.push(line);
        });
        if (tt.pay) L2.push("Total a pagar: " + mt(tt.pay) + " por " + PAY[state.method].name);
        if ($("#f-msg").value.trim()) L2.push("Mensagem: " + $("#f-msg").value.trim());
        return L2.join("\n");
    }

    function buildPayload() {
        var tt = totals();
        return {
            referencia: state.ref,
            nome: $("#f-name").value.trim(), email: $("#f-email").value.trim(), contacto: $("#f-phone").value.trim(),
            organizacao: $("#f-org").value.trim(), sexo: state.profile.sexo, faixa_etaria: state.profile.faixa,
            localizacao: state.profile.localizacao === "Outra" ? "Outra: " + $("#f-loc-other").value.trim() : state.profile.localizacao,
            area: $("#f-sector").value,
            itens: state.selected.map(function (id) {
                var it = BY_ID[id], o = { id: id, titulo: it.title.pt, tipo: it.kind === "event" ? "evento" : "servico", respostas: state.answers[id] || {} };
                if (it.kind === "event") { o.participantes = state.qty[id] || 1; o.valor = (state.qty[id] || 1) * it.price; }
                else { var b = state.book[id]; o.marcacao = b.date + " " + hm(b.s) + "–" + hm(b.e); o.estado = "horário pretendido, a confirmar"; }
                return o;
            }),
            total_a_pagar: tt.pay, metodo: tt.pay ? PAY[state.method].name : "",
            codigo_transaccao: ($("#f-txn") || {}).value || "",
            mensagem: $("#f-msg").value.trim(), idioma: state.lang,
            resumo: plainSummary(),
            _gotcha: ($("#f-hp") || {}).value || ""   // Formspree drops the submission if a bot fills this
        };
    }

    function resetAll() {
        $("#cpForm").reset();
        state.selected = []; state.answers = {}; state.qty = {}; state.book = {}; state.ref = ""; state.sent = false;
        state.profile = { sexo: "", faixa: "", localizacao: "" };
        $("#cpForm").hidden = false; $("#successBox").hidden = true;
        $$(".form-progress, .progress-labels").forEach(function (el) { el.hidden = false; });
        $$(".is-invalid").forEach(function (el) { el.classList.remove("is-invalid"); });
        renderProfile(); renderCards(); renderTray(); renderPicker();
        setExpanded(false);
        goTo(1, true);
    }

    /* ---------------------------------------------------------- LANGUAGE */
    // the page's own text (data-t). The navbar, footer and <html lang> belong to js/i18n.js
    function applyStatic() {
        $$("[data-t]").forEach(function (el) { el.textContent = t(el.getAttribute("data-t")); });
        $$("[data-t-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-t-html")); });
        $$("[data-tp]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-tp")); });
    }

    function setLang(l) {
        if (!STR[l]) return;
        state.lang = l;
        applyStatic();
        renderProfile(); renderCards(); renderTray(); renderPicker();
        if (state.step >= 2) renderPanels();
        if (state.step === 3) renderSummary();
        if (state.sent) renderSuccess();
        $("#stepAnnounce").textContent = "";
        if (state.step === 3) $("#progressLabel3").textContent = t(totals().pay ? "p.3" : "p.3b");
    }

    /* ---------------------------------------------------------- EVENTS */
    function bind() {
        document.addEventListener("click", function (e) {
            var el;
            if ((el = e.target.closest("[data-toggle]"))) { toggleItem(el.getAttribute("data-toggle")); return; }
            if ((el = e.target.closest("[data-remove]"))) { toggleItem(el.getAttribute("data-remove"), false); return; }
            if ((el = e.target.closest("[data-filter]"))) {
                state.filter = el.getAttribute("data-filter");
                $$("[data-filter]").forEach(function (b) { var on = b === el; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
                renderCards(); return;
            }
            if (e.target.closest("[data-next-step]")) { next(); return; }
            if (e.target.closest("[data-prev-step]")) { prev(); return; }
            if ((el = e.target.closest("[data-qty]"))) {
                var id = el.getAttribute("data-for"), q = Math.min(10, Math.max(1, (state.qty[id] || 1) + +el.getAttribute("data-qty")));
                state.qty[id] = q;
                var panel = $('[data-panel="' + id + '"]');
                panel.outerHTML = panelHTML(BY_ID[id]);
                var np = $('[data-panel="' + id + '"]'); np.style.animation = "none";
                var btn = $('[data-qty="' + el.getAttribute("data-qty") + '"]', np); if (btn && !btn.disabled) btn.focus({ preventScroll: true });
                renderTray(); return;
            }
            if ((el = e.target.closest("[data-month]"))) {
                var sb = el.closest("[data-sched]"), sid = sb.getAttribute("data-sched"), b = state.book[sid];
                var d = new Date(b.view[0], b.view[1] + +el.getAttribute("data-month"), 1);
                b.view = [d.getFullYear(), d.getMonth()];
                rerenderSched(sid, '[data-month="' + el.getAttribute("data-month") + '"]:not(:disabled)'); return;
            }
            if ((el = e.target.closest("[data-day]"))) {
                var s2 = el.closest("[data-sched]").getAttribute("data-sched"), bk = state.book[s2];
                bk.date = el.getAttribute("data-day"); bk.s = bk.e = null; bk.status = null; bk.checks = null; bk.note = false;
                rerenderSched(s2, '[data-day="' + bk.date + '"]'); renderTray(); return;
            }
            if ((el = e.target.closest("[data-slot]"))) {
                var s3 = el.closest("[data-sched]").getAttribute("data-sched"), b3 = state.book[s3], p = el.getAttribute("data-slot").split("-");
                b3.s = +p[0]; b3.e = +p[1]; b3.status = null; b3.checks = null; b3.note = false;
                rerenderSched(s3, ".cp-verify-btn"); return;
            }
            if ((el = e.target.closest("[data-verify]"))) { runVerify(el.getAttribute("data-verify")); return; }
            if ((el = e.target.closest("[data-alt]"))) {
                var s4 = el.closest("[data-sched]").getAttribute("data-sched"), b4 = state.book[s4], a = el.getAttribute("data-alt").split("|");
                var ad = pd(a[0]);
                b4.date = a[0]; b4.s = +a[1]; b4.e = +a[2]; b4.view = [ad.getFullYear(), ad.getMonth()]; b4.checks = null; b4.status = null;
                runVerify(s4); return;
            }
            if ((el = e.target.closest("[data-method]"))) { state.method = el.getAttribute("data-method"); renderPay(); var tb = $('[data-method="' + state.method + '"]'); if (tb) tb.focus(); return; }
            if ((el = e.target.closest("[data-copy]"))) { copy(el); return; }
            if (e.target.closest("#againBtn")) { resetAll(); return; }
            if ((el = e.target.closest('a[href="#"]'))) { e.preventDefault(); }
        });

        // keyboard for the payment tabs
        document.addEventListener("keydown", function (e) {
            var tab = e.target.closest && e.target.closest(".cp-pay-tab");
            if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
                var keys = Object.keys(PAY), i = keys.indexOf(state.method);
                state.method = keys[(i + (e.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length];
                renderPay(); $('[data-method="' + state.method + '"]').focus(); e.preventDefault();
            }
        });

        // answers
        document.addEventListener("change", function (e) {
            var el = e.target, chips = el.closest(".cp-chips");
            var panel = el.closest("[data-panel]");
            if (chips && chips.hasAttribute("data-group")) {
                var g = chips.getAttribute("data-group");
                state.profile[g] = el.value;
                if (g === "localizacao") { $("#f-loc-other").hidden = el.value !== "Outra"; if (el.value === "Outra") $("#f-loc-other").focus(); }
                return;
            }
            if (!panel) return;
            var id = panel.getAttribute("data-panel"), it = BY_ID[id], a = state.answers[id] || (state.answers[id] = {});
            var qid = (chips || el).getAttribute("data-q");
            if (!qid) return;
            var q = Q[it.theme].filter(function (x) { return x.id === qid; })[0];
            if (q.type === "multi") a[qid] = $$("input:checked", chips).map(function (i) { return i.value; });
            else a[qid] = el.value;
            (chips || el).classList.remove("is-invalid");
            if (q.affects && it.kind === "service") {         // duration / place changed: the slot must be picked again
                var b = state.book[id];
                if (b && b.s != null) { b.s = b.e = null; b.status = null; b.checks = null; b.note = true; }
                rerenderSched(id);
            }
        });
        document.addEventListener("input", function (e) {
            var el = e.target;
            if (el.matches("#f-name, #f-email, #f-phone")) { el.classList.remove("is-invalid"); el.removeAttribute("aria-invalid"); return; }
            if (el.id === "f-consent") el.classList.remove("is-invalid");
            var panel = el.closest("[data-panel]");
            if (panel && el.matches("input[type=text], input[type=number], textarea")) {
                var id = panel.getAttribute("data-panel");
                (state.answers[id] || (state.answers[id] = {}))[el.getAttribute("data-q")] = el.value;
                el.classList.remove("is-invalid");
            }
        });

        $("#cpForm").addEventListener("submit", submit);
        $("#trayGo").addEventListener("click", function (e) {
            e.preventDefault();
            var card = $("#contact-form");
            window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().top - 96, behavior: reduced ? "auto" : "smooth" });
            var f = state.step === 1 ? $("#f-name") : null; if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 500);
        });
    }

    function copy(btn) {
        var text = btn.getAttribute("data-copy"), label = $("span", btn);
        var ok = function () {
            btn.classList.add("is-done"); label.textContent = t("pay.copied");
            setTimeout(function () { btn.classList.remove("is-done"); label.textContent = t("pay.copy"); }, 1600);
        };
        var fallback = function () {
            var code = btn.parentNode.querySelector("code");
            if (code) { var r = document.createRange(); r.selectNodeContents(code); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        };
        try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (err) { fallback(); }
    }

    /* ---------------------------------------------------------- NAVBAR
       show/hide and the topbar: js/javascript.js + js/topbar.js, as on every page.
       Here it only gets a navy background once past the hero (the form below is light). */
    function navbar() {
        var nav = $("#mainNavbar"), hero = $(".page-hero");
        if (!nav || !hero || !("IntersectionObserver" in window)) return;
        new IntersectionObserver(function (en) {
            nav.classList.toggle("is-solid", !en[0].isIntersecting);
        }, { rootMargin: "-110px 0px 0px 0px" }).observe(hero);
    }

    /* ---------------------------------------------------------- START */
    function start() {
        var h = (location.hash || "").slice(1), i18n = window.CastrosI18n;
        if (i18n) {
            state.lang = i18n.lang;
            i18n.ready.then(function (l) { if (l !== state.lang) setLang(l); });   // saved choice / ?lang=en
            document.addEventListener("i18n:change", function (e) { setLang(e.detail.lang); });
        }
        applyStatic();
        renderProfile(); renderCards(); renderTray(); renderPicker();
        if (BY_ID[h] && isShown(BY_ID[h])) toggleItem(h, true);   // e.g. #espacos pre-selects a card
        bind(); navbar();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
