"use strict";

window.dataLayer = window.dataLayer || [];

  function gtag() {
    dataLayer.push(arguments);
  }

  gtag("consent", "default", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500
  });

  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", false);

  window.__primadomStatisticsConsent = null;

  function clearPrimadomAnalyticsStorage() {
    try {
      localStorage.removeItem(
        "primadom_analytics_visitor_id_v1"
      );

      localStorage.removeItem(
        "primadom_analytics_session_v1"
      );
    } catch (_) {
      // Storage may be unavailable.
    }
  }

  function syncPrimadomConsent() {
    var previous =
      window.__primadomStatisticsConsent;

    var allowed =
      !!(
        window.Cookiebot &&
        window.Cookiebot.consent &&
        window.Cookiebot.consent.statistics
      );

    window.__primadomStatisticsConsent =
      allowed;

    if (!allowed) {
      clearPrimadomAnalyticsStorage();

      if (
        window.posthog &&
        typeof window.posthog.opt_out_capturing === "function"
      ) {
        window.posthog.opt_out_capturing();
      }

      return;
    }

    if (
      window.posthog &&
      typeof window.posthog.opt_in_capturing === "function"
    ) {
      window.posthog.opt_in_capturing();
    }

    /*
     * If analytics had already started and consent was then
     * withdrawn, reload after a later re-consent so a clean
     * visitor/session/pageview chain is created.
     */
    if (
      previous === false &&
      window.__primadomAnalyticsEverStarted
    ) {
      window.location.reload();
    }
  }

  window.addEventListener(
    "CookiebotOnConsentReady",
    syncPrimadomConsent
  );

  window.addEventListener(
    "CookiebotOnAccept",
    syncPrimadomConsent
  );

  window.addEventListener(
    "CookiebotOnDecline",
    syncPrimadomConsent
  );
