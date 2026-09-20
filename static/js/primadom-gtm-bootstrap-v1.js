(() => {
  "use strict";

  const script = document.currentScript;

  const GTM_ID = String(
    script?.dataset.gtmId || ""
  ).trim();

  const PAGE_ID = String(
    script?.dataset.pageId || ""
  ).trim();

  const LANGUAGE_CODE = String(
    script?.dataset.languageCode || "und"
  ).trim().toLowerCase();

  const PAGE_TYPE = String(
    script?.dataset.pageType || "unknown"
  ).trim();

  window.dataLayer =
    window.dataLayer || [];

  window.dataLayer.push({
    event: "primadom_analytics_bootstrap",
    page_id: PAGE_ID,
    language_code: LANGUAGE_CODE,
    page_type: PAGE_TYPE,
    section_key: "",
    interaction_key: "",
    interaction_type: "",
    action: "",
    input_method: ""
  });

  if (
    !GTM_ID ||
    window.__primadomGtmRequested
  ) {
    return;
  }

  window.__primadomGtmRequested = true;

  window.dataLayer.push({
    "gtm.start": Date.now(),
    event: "gtm.js"
  });

  const gtmScript =
    document.createElement("script");

  gtmScript.async = true;

  gtmScript.src =
    "https://www.googletagmanager.com/gtm.js?id=" +
    encodeURIComponent(GTM_ID);

  gtmScript.setAttribute(
    "data-primadom-gtm",
    GTM_ID
  );

  (
    document.head ||
    document.documentElement
  ).appendChild(gtmScript);
})();
