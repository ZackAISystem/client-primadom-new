(() => {
  "use strict";

  const ENDPOINT = "/api/analytics/v1/lead";

  /*
   * REAL LEAD MODAL FORMS ONLY.
   * Hero / Ask AI forms are intentionally excluded.
   */
  const FORM_MAP = [
    ["[data-ai-answer-form]", "ai_answer_lead"],
    ["[data-budget-form]", "budget_lead"],
    ["[data-buyer-scenario-form]", "buyer_scenario_lead"],
    ["[data-developer-comparison-form]", "developer_comparison_lead"],
    ["[data-developer-form]", "developer_lead"],
    ["[data-comparison-form]", "district_comparison_lead"],
    ["[data-pa-lead-form]", "district_lead"],
    ["[data-intent-form]", "intent_lead"],
    ["[data-origin-buyer-form]", "origin_buyer_lead"],
    ["[data-project-comparison-form]", "project_comparison_lead"],
    ["[data-property-type-form]", "property_type_lead"],
    ["[data-project-lead-form]", "project_lead"]
  ];

  const FORM_SELECTOR =
    FORM_MAP.map(([selector]) => selector).join(",");

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const ERROR_LABELS = {
    en: "Try again",
    ru: "Повторите",
    hi: "फिर कोशिश करें",
    zh: "请重试",
    es: "Inténtalo de nuevo",
    fr: "Réessayez",
    de: "Erneut versuchen",
    ar: "حاول مرة أخرى"
  };

  function clean(value, max = 2000) {
    if (value === undefined || value === null) {
      return "";
    }

    return String(value).trim().slice(0, max);
  }

  function uuid(value) {
    const v = clean(value, 64);
    return UUID_RE.test(v) ? v : null;
  }

  function languageCode() {
    const html =
      clean(document.documentElement.lang, 16)
        .toLowerCase();

    if (html) {
      return html.split("-")[0];
    }

    return (
      clean(
        location.pathname.split("/")[1],
        16
      ).toLowerCase() || "en"
    );
  }

  function analyticsTag() {
    return document.querySelector(
      '[data-primadom-analytics="v1"][data-page-id]'
    );
  }

  function analyticsContext() {
    const source =
      window.__primadomAnalyticsContextV1 &&
      typeof window.__primadomAnalyticsContextV1 === "object"
        ? window.__primadomAnalyticsContextV1
        : {};

    return {
      visitor_id: uuid(source.visitor_id),
      session_id: uuid(source.session_id),
      pageview_id: uuid(source.pageview_id)
    };
  }

  function canonicalPath() {
    const canonical =
      document.querySelector(
        'link[rel="canonical"]'
      );

    if (!canonical || !canonical.href) {
      return null;
    }

    try {
      return new URL(
        canonical.href,
        location.href
      ).pathname || null;
    } catch (_) {
      return null;
    }
  }

  function formKey(form) {
    for (const [selector, key] of FORM_MAP) {
      if (form.matches(selector)) {
        return key;
      }
    }

    return "lead_form";
  }

  function controls(form) {
    return Array.from(form.elements || [])
      .filter((el) => {
        return (
          el &&
          !el.disabled &&
          typeof el.value !== "undefined"
        );
      });
  }

  function value(el, max = 3000) {
    return el
      ? clean(el.value, max)
      : "";
  }

  function controlName(el) {
    return clean(
      el?.name || el?.id || "",
      100
    ).toLowerCase();
  }

  function firstNamed(items, names) {
    const wanted =
      new Set(
        names.map((v) =>
          v.toLowerCase()
        )
      );

    return (
      items.find((el) =>
        wanted.has(controlName(el))
      ) || null
    );
  }

  function extract(form) {
    const items = controls(form);

    const phoneEl =
      firstNamed(
        items,
        [
          "phone",
          "telephone",
          "tel",
          "mobile",
          "whatsapp"
        ]
      ) ||
      items.find(
        (el) =>
          clean(el.type)
            .toLowerCase() === "tel"
      ) ||
      null;

    const emailEl =
      firstNamed(
        items,
        ["email"]
      ) ||
      items.find(
        (el) =>
          clean(el.type)
            .toLowerCase() === "email"
      ) ||
      null;

    const budgetEl =
      firstNamed(
        items,
        [
          "budget",
          "budget_range",
          "price_range"
        ]
      );

    let nameEl =
      firstNamed(
        items,
        [
          "name",
          "full_name",
          "fullname",
          "customer_name"
        ]
      );

    if (!nameEl) {
      nameEl =
        items.find((el) => {
          const type =
            clean(el.type)
              .toLowerCase();

          return (
            el !== phoneEl &&
            el !== emailEl &&
            el !== budgetEl &&
            type !== "hidden" &&
            type !== "submit" &&
            type !== "button" &&
            type !== "email" &&
            type !== "tel" &&
            el.tagName !== "TEXTAREA"
          );
        }) || null;
    }

    const context = {
      form_key: formKey(form)
    };

    const hiddenFields = {
      project_key: "project_key",
      project_name: "project_name",
      location: "project_location",
      price_from: "price_from",
      developer_key: "developer_key",
      developer_name: "developer_name",
      city: "entity_city",
      country: "entity_country"
    };

    for (const [source, target] of
      Object.entries(hiddenFields)) {

      const el =
        form.querySelector(
          `[name="${source}"]`
        );

      const v =
        value(el, 1000);

      if (v) {
        context[target] = v;
      }
    }

    const budget =
      value(budgetEl, 1000);

    if (budget) {
      context.budget = budget;
    }

    const requestParts = [];

    for (const el of items) {
      if (
        el === nameEl ||
        el === phoneEl ||
        el === emailEl ||
        el === budgetEl
      ) {
        continue;
      }

      const type =
        clean(el.type)
          .toLowerCase();

      if (
        type === "hidden" ||
        type === "submit" ||
        type === "button" ||
        type === "checkbox" ||
        type === "radio" ||
        type === "file"
      ) {
        continue;
      }

      const v =
        value(el, 3000);

      if (!v) {
        continue;
      }

      const rawName =
        controlName(el);

      let label =
        rawName || "request";

      if (
        el.tagName === "TEXTAREA" ||
        rawName.includes("comment") ||
        rawName.includes("message") ||
        rawName.includes("detail")
      ) {
        label = "details";

        if (!context.comment) {
          context.comment =
            clean(v, 3000);
        }
      } else if (
        rawName.includes("request") ||
        rawName.includes("question") ||
        rawName.includes("inquiry")
      ) {
        label = "request";

        if (!context.request_short) {
          context.request_short =
            clean(v, 2000);
        }
      }

      requestParts.push(
        `${label}: ${v}`
      );
    }

    return {
      name:
        value(nameEl, 300) || null,

      phone:
        value(phoneEl, 200) || null,

      email:
        value(emailEl, 500) || null,

      request_text:
        requestParts.length
          ? clean(
              requestParts.join("\n\n"),
              6000
            )
          : null,

      fingerprint:
        clean(
          requestParts
            .map((part) =>
              part.replace(
                /^[^:]+:\s*/,
                ""
              )
            )
            .join("\n"),
          6000
        ),

      interest_context:
        context
    };
  }

  function inputMethod(form, data) {
    const voiceUsed =
      form.dataset
        .primadomLeadVoiceUsed === "1";

    if (!voiceUsed) {
      return data.request_text
        ? "text"
        : "unknown";
    }

    const before =
      clean(
        form.dataset
          .primadomLeadVoiceBefore,
        6000
      );

    const changed =
      Boolean(data.fingerprint) &&
      data.fingerprint !== before;

    const typedAfter =
      form.dataset
        .primadomLeadTypedAfterVoice === "1";

    if (changed && typedAfter) {
      return "mixed";
    }

    if (changed) {
      return "voice";
    }

    if (typedAfter) {
      return "text";
    }

    return data.request_text
      ? "text"
      : "unknown";
  }

  function idempotencyKey(form) {
    if (
      form.dataset
        .primadomLeadIdempotencyKey
    ) {
      return form.dataset
        .primadomLeadIdempotencyKey;
    }

    let key;

    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      key =
        "web:" +
        window.crypto.randomUUID();
    } else {
      key =
        "web:" +
        Date.now() +
        ":" +
        Math.random()
          .toString(16)
          .slice(2);
    }

    form.dataset
      .primadomLeadIdempotencyKey =
        key;

    return key;
  }

  function payload(form) {
    const data =
      extract(form);

    const analytics =
      analyticsContext();

    const tag =
      analyticsTag();

    return {
      visitor_id:
        analytics.visitor_id,

      session_id:
        analytics.session_id,

      pageview_id:
        analytics.pageview_id,

      page_id:
        clean(
          tag?.dataset?.pageId,
          500
        ) || null,

      page_type:
        clean(
          tag?.dataset?.pageType,
          200
        ) || null,

      language_code:
        languageCode(),

      url_path:
        clean(
          location.pathname,
          2000
        ) || null,

      canonical_url_path:
        clean(
          canonicalPath(),
          2000
        ) || null,

      request_type:
        formKey(form)
          .replace(/_lead$/, "") +
        "_inquiry",

      cta_type:
        "modal_submit",

      interest_context:
        data.interest_context,

      name:
        data.name,

      phone:
        data.phone,

      email:
        data.email,

      request_text:
        data.request_text,

      request_input_method:
        inputMethod(
          form,
          data
        ),

      idempotency_key:
        idempotencyKey(form)
    };
  }

  function submitButton(form) {
    return (
      form.querySelector(
        'button[type="submit"]'
      ) ||
      form.querySelector(
        'input[type="submit"]'
      ) ||
      form.querySelector(
        ".pd-lead-submit," +
        ".pa-submit," +
        ".pi-submit," +
        ".pc-submit," +
        ".pt-submit"
      )
    );
  }

  function readButton(button) {
    if (!button) {
      return "";
    }

    if (button.tagName === "INPUT") {
      return button.value || "";
    }

    return button.textContent || "";
  }

  function writeButton(
    button,
    text
  ) {
    if (!button) {
      return;
    }

    if (button.tagName === "INPUT") {
      button.value = text;
      return;
    }

    button.textContent = text;
  }

  function setBusy(form, busy) {
    const button =
      submitButton(form);

    if (!button) {
      return;
    }

    if (
      !button.dataset
        .primadomLeadNormalLabel
    ) {
      button.dataset
        .primadomLeadNormalLabel =
          clean(
            button.dataset.submitLabel ||
              readButton(button),
            300
          );
    }

    button.disabled =
      Boolean(busy);

    button.setAttribute(
      "aria-busy",
      busy ? "true" : "false"
    );
  }

  function showError(form) {
    const button =
      submitButton(form);

    if (!button) {
      return;
    }

    const normal =
      button.dataset
        .primadomLeadNormalLabel ||
      button.dataset.submitLabel ||
      readButton(button);

    const label =
      ERROR_LABELS[languageCode()] ||
      ERROR_LABELS.en;

    writeButton(
      button,
      label
    );

    window.setTimeout(() => {
      writeButton(
        button,
        normal
      );
    }, 2200);
  }

  async function post(body) {
    for (
      let attempt = 0;
      attempt < 2;
      attempt++
    ) {
      try {
        const controller =
          typeof AbortController ===
          "function"
            ? new AbortController()
            : null;

        const timer =
          controller
            ? window.setTimeout(
                () =>
                  controller.abort(),
                8000
              )
            : null;

        let response;

        try {
          response =
            await fetch(
              ENDPOINT,
              {
                method: "POST",
                credentials:
                  "same-origin",
                headers: {
                  "Content-Type":
                    "application/json",
                  "Accept":
                    "application/json"
                },
                body:
                  JSON.stringify(body),
                signal:
                  controller
                    ? controller.signal
                    : undefined
              }
            );
        } finally {
          if (timer) {
            window.clearTimeout(
              timer
            );
          }
        }

        if (
          response.status >= 500 &&
          attempt === 0
        ) {
          await new Promise(
            (resolve) =>
              window.setTimeout(
                resolve,
                350
              )
          );

          continue;
        }

        let data;

        try {
          data =
            await response.json();
        } catch (_) {
          return null;
        }

        if (
          response.ok &&
          data &&
          data.ok === true &&
          data.lead_id
        ) {
          return data;
        }

        return null;
      } catch (_) {
        if (attempt === 1) {
          return null;
        }

        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              350
            )
        );
      }
    }

    return null;
  }

  function replaySubmit(
    form,
    submitter
  ) {
    form.dataset
      .primadomLeadReplay = "1";

    if (
      typeof form.requestSubmit ===
      "function"
    ) {
      if (
        submitter &&
        submitter.form === form
      ) {
        form.requestSubmit(
          submitter
        );
      } else {
        form.requestSubmit();
      }

      return;
    }

    const replay =
      new Event(
        "submit",
        {
          bubbles: true,
          cancelable: true
        }
      );

    form.dispatchEvent(
      replay
    );
  }

  /*
   * Capture phase:
   * save lead FIRST.
   *
   * Only after successful storage do we replay
   * the submit so the existing visual handler
   * can show Sent and close the modal.
   */
  document.addEventListener(
    "submit",
    async (event) => {
      const form =
        event.target;

      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches(FORM_SELECTOR)
      ) {
        return;
      }

      if (
        form.dataset
          .primadomLeadReplay === "1"
      ) {
        delete form.dataset
          .primadomLeadReplay;

        /*
         * Previous lead is fully persisted.
         * A future submit is a new logical lead.
         */
        delete form.dataset
          .primadomLeadIdempotencyKey;

        delete form.dataset
          .primadomLeadVoiceUsed;

        delete form.dataset
          .primadomLeadVoiceBefore;

        delete form.dataset
          .primadomLeadTypedAfterVoice;

        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (
        form.__primadomLeadSending
      ) {
        return;
      }

      form.__primadomLeadSending =
        true;

      const submitter =
        event.submitter || null;

      setBusy(
        form,
        true
      );

      try {
        const result =
          await post(
            payload(form)
          );

        if (!result) {
          showError(form);
          return;
        }

        window.dispatchEvent(
          new CustomEvent(
            "primadom:lead-created",
            {
              detail: {
                lead_id:
                  result.lead_id,

                conversion_id:
                  result.conversion_id ||
                  null,

                duplicate:
                  result.duplicate ===
                  true
              }
            }
          )
        );

        setBusy(
          form,
          false
        );

        replaySubmit(
          form,
          submitter
        );
      } finally {
        form.__primadomLeadSending =
          false;

        setBusy(
          form,
          false
        );
      }
    },
    true
  );

  /*
   * Detect voice ONLY inside actual lead forms.
   * Hero AI voice controls never match.
   */
  document.addEventListener(
    "click",
    (event) => {
      if (
        !(event.target instanceof Element)
      ) {
        return;
      }

      const control =
        event.target.closest(
          "button,[role='button']"
        );

      if (!control) {
        return;
      }

      const form =
        control.closest(
          FORM_SELECTOR
        );

      if (!form) {
        return;
      }

      const marker =
        (
          clean(
            control.className,
            500
          ) +
          " " +
          Array.from(
            control.attributes
          )
            .map(
              (attr) =>
                attr.name
            )
            .join(" ")
        ).toLowerCase();

      if (
        !marker.includes("voice")
      ) {
        return;
      }

      const current =
        extract(form);

      form.dataset
        .primadomLeadVoiceUsed =
          "1";

      form.dataset
        .primadomLeadVoiceBefore =
          current.fingerprint;

      delete form.dataset
        .primadomLeadTypedAfterVoice;
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (
        !(event.target instanceof Element)
      ) {
        return;
      }

      const form =
        event.target.closest(
          FORM_SELECTOR
        );

      if (!form) {
        return;
      }

      /*
       * If user changes data after a failed attempt,
       * this is a new logical payload.
       */
      delete form.dataset
        .primadomLeadIdempotencyKey;

      if (
        form.dataset
          .primadomLeadVoiceUsed ===
          "1" &&
        event.isTrusted
      ) {
        form.dataset
          .primadomLeadTypedAfterVoice =
            "1";
      }
    },
    true
  );

  document.addEventListener(
    "reset",
    (event) => {
      const form =
        event.target;

      if (
        !form ||
        !form.matches ||
        !form.matches(FORM_SELECTOR)
      ) {
        return;
      }

      delete form.dataset
        .primadomLeadIdempotencyKey;

      delete form.dataset
        .primadomLeadVoiceUsed;

      delete form.dataset
        .primadomLeadVoiceBefore;

      delete form.dataset
        .primadomLeadTypedAfterVoice;
    },
    true
  );

  window.PrimadomLead =
    Object.freeze({
      version: "1.0.1"
    });
})();
