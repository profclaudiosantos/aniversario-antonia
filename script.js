// ------------------------------------------------------------
// Abertura do envelope — roda de forma independente e primeiro,
// para que o convite sempre abra mesmo se outra parte do site falhar
// (ex: config.js não carregado, erro no envio do formulário, etc.)
// ------------------------------------------------------------
(function setupEnvelope() {
  const envelopeWrap = document.getElementById("envelopeWrap");
  const inviteCard = document.getElementById("inviteCard");
  if (!envelopeWrap || !inviteCard) return;

  const openEnvelope = () => {
    envelopeWrap.classList.add("is-open");
    inviteCard.classList.add("is-visible");
  };

  envelopeWrap.addEventListener("click", openEnvelope);
  envelopeWrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEnvelope();
    }
  });
})();

document.addEventListener("DOMContentLoaded", () => {

  /* ------------------------------------------------------------
     1. Preenche o convite com os dados do config.js
  ------------------------------------------------------------ */
  try {
    if (typeof CONFIG === "undefined") {
      throw new Error("config.js não foi encontrado ou não carregou. Confira se o arquivo config.js foi enviado ao GitHub junto com os outros.");
    }

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el && value) el.textContent = value;
    };

    setText("nomeAniversariante", CONFIG.aniversariante);
    setText("nomeAniversariante2", CONFIG.aniversariante);
    setText("idadeAniversariante", CONFIG.idade);
    setText("idadeAniversariante2", CONFIG.idade);
    setText("nomeOrganizador", CONFIG.organizador);
    setText("prazoConfirmacao", CONFIG.prazoConfirmacao);
    setText("dataFesta", CONFIG.dataFesta);
    setText("horaFesta", CONFIG.horaFesta);

    const localEl = document.getElementById("localFesta");
    if (localEl) {
      if (CONFIG.linkLocalizacao) {
        localEl.innerHTML = "";
        const link = document.createElement("a");
        link.href = CONFIG.linkLocalizacao;
        link.target = "_blank";
        link.rel = "noopener";
        link.style.color = "inherit";
        link.textContent = CONFIG.localFesta;
        localEl.appendChild(link);
      } else {
        localEl.textContent = CONFIG.localFesta;
      }
    }

    document.title = `Confirmação — Aniversário da ${CONFIG.aniversariante} 🎂`;
  } catch (err) {
    console.error("Erro ao preencher os dados do convite:", err);
  }

  /* ------------------------------------------------------------
     2. Toggle "Vai comparecer?"
  ------------------------------------------------------------ */
  let comparecera, adultosInput, criancasInput, countsWrap, selectComparecera;
  try {
    const btnSim = document.getElementById("btnSim");
    const btnNao = document.getElementById("btnNao");
    comparecera = document.getElementById("comparecera");
    countsWrap = document.getElementById("countsWrap");
    adultosInput = document.getElementById("adultos");
    criancasInput = document.getElementById("criancas");

    selectComparecera = (value) => {
      comparecera.value = value;
      btnSim.classList.toggle("active", value === "sim");
      btnNao.classList.toggle("active", value === "nao");
      countsWrap.classList.toggle("is-hidden", value === "nao");
      if (value === "nao") {
        adultosInput.value = 0;
        criancasInput.value = 0;
      } else if (Number(adultosInput.value) === 0 && Number(criancasInput.value) === 0) {
        adultosInput.value = 1;
      }
    };

    btnSim.addEventListener("click", () => selectComparecera("sim"));
    btnNao.addEventListener("click", () => selectComparecera("nao"));
  } catch (err) {
    console.error("Erro ao configurar os botões Sim/Não:", err);
  }

  /* ------------------------------------------------------------
     3. Steppers de adultos / crianças
  ------------------------------------------------------------ */
  try {
    document.querySelectorAll(".step-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const delta = Number(btn.dataset.delta);
        const input = document.getElementById(targetId);
        const min = input.min !== "" ? Number(input.min) : 0;
        const max = input.max !== "" ? Number(input.max) : Infinity;
        const next = Math.min(max, Math.max(min, (Number(input.value) || 0) + delta);
        input.value = next;
      });
    });

    [adultosInput, criancasInput].forEach((input) => {
      if (!input) return;
      input.addEventListener("change", () => {
        const min = input.min !== "" ? Number(input.min) : 0;
        const max = input.max !== "" ? Number(input.max) : Infinity;
        let value = Number(input.value);
        if (input.value === "" || Number.isNaN(value)) value = min;
        input.value = Math.min(max, Math.max(min, value));
      });
    });
  } catch (err) {
    console.error("Erro ao configurar os contadores:", err);
  }

  /* ------------------------------------------------------------
     4. Envio do formulário para o Supabase
  ------------------------------------------------------------ */
  try {
    const form = document.getElementById("rsvpForm");
    const submitBtn = document.getElementById("submitBtn");
    const btnLabel = submitBtn.querySelector(".btn-label");
    const btnSpinner = submitBtn.querySelector(".btn-spinner");
    const statusEl = document.getElementById("formStatus");

    const setStatus = (message, kind) => {
      statusEl.textContent = message;
      statusEl.className = "form-status" + (kind ? ` ${kind}` : "");
    };

    const setLoading = (loading) => {
      submitBtn.disabled = loading;
      btnSpinner.hidden = !loading;
      btnLabel.textContent = loading ? "Enviando..." : "Confirmar presença";
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");

      const nome = document.getElementById("nome").value.trim();
      const valorComparecera = comparecera.value;

      if (!nome) {
        setStatus("Por favor, informe o nome do responsável.", "err");
        document.getElementById("nome").focus();
        return;
      }
      if (!valorComparecera) {
        setStatus("Por favor, informe se vai comparecer.", "err");
        return;
      }

      if (typeof CONFIG === "undefined" || !CONFIG.supabaseUrl || CONFIG.supabaseUrl.startsWith("COLE_AQUI")) {
        setStatus("O site ainda não foi conectado ao banco de dados. Veja o README.md.", "err");
        return;
      }

      const payload = {
        nome_responsavel: nome,
        comparecera: valorComparecera === "sim",
        adultos: Number(adultosInput.value) || 0,
        criancas: Number(criancasInput.value) || 0,
        observacoes: document.getElementById("observacoes").value.trim() || null,
      };

      setLoading(true);

      try {
        const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/confirmacoes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": CONFIG.supabaseAnonKey,
            "Authorization": `Bearer ${CONFIG.supabaseAnonKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erro do Supabase:", errText);
          throw new Error("Falha ao salvar");
        }

        form.reset();
        selectComparecera("");
        countsWrap.classList.remove("is-hidden");
        setStatus("Presença confirmada com sucesso! Muito obrigado 🎉", "ok");
      } catch (err) {
        setStatus("Não conseguimos enviar sua confirmação agora. Tente novamente em instantes.", "err");
      } finally {
        setLoading(false);
      }
    });
  } catch (err) {
    console.error("Erro ao configurar o envio do formulário:", err);
  }
});
