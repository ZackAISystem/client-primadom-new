/*
 * PRIMADOM POSTHOG SDK BOOTSTRAP
 * Executes only after Cookiebot statistics consent because
 * this entire asset is consent-gated.
 */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="vu fu pu gu bu init Hu zu qu ju Gu Xl Bu Qu Du eh ih nh sh rh oh capture getExtension Uu cu hh calculateEventProperties uh register register_once register_for_session unregister unregister_for_session gh Nu dh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync mh identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset yh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty fh Xu createPersonProfile setInternalOrTestUser ph wu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ju debug Yl Os getPageViewId captureTraceFeedback captureTraceMetric Ru".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init("phc_zV9JCANa34fjw8hgBErdhv373DujimvQeHzXfKLouB88", {
    api_host: "https://eu.i.posthog.com",
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true
  });

(() => {
  "use strict";

  const ANALYTICS_SCRIPT =
    document.currentScript ||
    document.querySelector(
      'script[data-primadom-analytics="v1"]'
    );
  const PAGE_ID = String(
    ANALYTICS_SCRIPT?.dataset.pageId || ""
  ).trim();

  if (!PAGE_ID) {
    return;
  }

  /*
   * PRIMADOM ANALYTICS V1 — STATISTICS CONSENT
   *
   * This tracker is activated by Cookiebot only after the
   * visitor grants the "statistics" category.
   */
  window.__primadomStatisticsConsent = true;
  window.__primadomAnalyticsEverStarted = true;
  const ENDPOINT = "/api/analytics/v1/collect";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  const VISITOR_KEY = "primadom_analytics_visitor_id_v1";
  const SESSION_KEY = "primadom_analytics_session_v1";

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function uuidV4() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join("-");
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function getVisitorId() {
    let id = storageGet(VISITOR_KEY);

    if (!UUID_RE.test(id || "")) {
      id = uuidV4();
      storageSet(VISITOR_KEY, id);
    }

    return id;
  }

  function getSessionId(nowMs) {
    let state = null;

    try {
      state = JSON.parse(storageGet(SESSION_KEY) || "null");
    } catch {
      state = null;
    }

    const reusable =
      state &&
      UUID_RE.test(state.id || "") &&
      Number.isFinite(Number(state.last_activity_at)) &&
      nowMs - Number(state.last_activity_at) >= 0 &&
      nowMs - Number(state.last_activity_at) <= SESSION_TIMEOUT_MS;

    const id = reusable ? state.id : uuidV4();

    storageSet(
      SESSION_KEY,
      JSON.stringify({
        id,
        last_activity_at: nowMs
      })
    );

    return id;
  }

  function acquisitionEvidence() {
    const acquisition = {};
    const params = new URLSearchParams(window.location.search);

    if (document.referrer) {
      try {
        const ref = new URL(document.referrer);

        acquisition.referrer_host =
          ref.hostname.toLowerCase();

        acquisition.referrer_path =
          ref.pathname || "/";
      } catch {
        // Ignore malformed referrer.
      }
    }

    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_id",
      "utm_term",
      "utm_content"
    ];

    for (const key of utmKeys) {
      const value = params.get(key);

      if (value) {
        acquisition[key] = value.slice(0, 500);
      }
    }

    const clickIdKeys = [
      "gclid",
      "gbraid",
      "wbraid",
      "msclkid",
      "dclid",
      "fbclid",
      "ttclid",
      "li_fat_id",
      "twclid",
      "yclid",
      "epik",
      "rdt_cid"
    ];

    const clickIds = {};

    for (const key of clickIdKeys) {
      const value = params.get(key);

      if (value) {
        clickIds[key] = value.slice(0, 500);
      }
    }

    if (Object.keys(clickIds).length > 0) {
      acquisition.click_ids = clickIds;
    }

    return acquisition;
  }

  const nowMs = Date.now();

  const visitorId = getVisitorId();
  const sessionId = getSessionId(nowMs);
  const pageviewId = uuidV4();

  window.__primadomAnalyticsContextV1 = {
    visitor_id: visitorId,
    session_id: sessionId,
    pageview_id: pageviewId
  };

  function touchSessionActivity(activityMs = Date.now()) {
    storageSet(
      SESSION_KEY,
      JSON.stringify({
        id: sessionId,
        last_activity_at: activityMs
      })
    );
  }

  async function sendPayload(payload, attempt = 0) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "omit",
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify(payload)
      });

      if (
        !response.ok &&
        response.status >= 500 &&
        attempt === 0
      ) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 750);
        });

        return sendPayload(payload, 1);
      }

      return response.ok;
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 750);
        });

        return sendPayload(payload, 1);
      }

      return false;
    }
  }

  /*
   * PRIMADOM ANALYTICS V1 — GTM / GA4 BRIDGE
   *
   * Supabase remains the source of truth.
   * GA4 receives only the selected marketing events below.
   * No raw AI query, transcript, form values or PII are sent.
   */

  const analyticsScript =
    ANALYTICS_SCRIPT;

  const GTM_CONTAINER_ID =
    analyticsScript?.dataset.gtmId || "";

  const PAGE_TYPE =
    analyticsScript?.dataset.pageType || "unknown";

  const LANGUAGE_CODE =
    String(
      document.documentElement.lang ||
      "und"
    )
      .trim()
      .toLowerCase() ||
    "und";


  const GA4_SELECTED_EVENTS =
    new Set([
      "engaged_view",
      "project_click",
      "district_click",
      "developer_click",
      "comparison_click",
      "faq_open",
      "gallery_interaction",
      "map_interaction",
      "cta_click",
      "form_start",
      "form_submit",
      "whatsapp_click",
      "phone_click",
      "email_click",
      "ai_search_interaction",
      "voice_interaction"
    ]);


  window.dataLayer =
    window.dataLayer || [];


  function ga4Scalar(value) {

    if (
      value === null ||
      typeof value === "undefined"
    ) {
      return "";
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    return "";
  }


  function firstGa4Value(...values) {

    for (const value of values) {

      const safe =
        ga4Scalar(value);

      if (
        safe !== ""
      ) {
        return safe;
      }
    }

    return "";
  }


  function pushGa4Event(
    eventName,
    eventContext = {}
  ) {

    if (
      !GA4_SELECTED_EVENTS.has(
        eventName
      )
    ) {
      return;
    }


    window.dataLayer.push({

      event:
        eventName,

      page_id:
        PAGE_ID,

      language_code:
        LANGUAGE_CODE,

      page_type:
        PAGE_TYPE,

      section_key:
        ga4Scalar(
          eventContext.section_key
        ),

      interaction_key:
        firstGa4Value(
          eventContext.interaction_key,
          eventContext.cta_key,
          eventContext.form_key,
          eventContext.target_entity_slug,
          eventContext.target_entity_id,
          eventContext.faq_key,
          eventContext.item_key,
          eventContext.contact_purpose
        ),

      interaction_type:
        firstGa4Value(
          eventContext.interaction_type,
          eventContext.cta_type,
          eventContext.target_entity_type,
          eventContext.request_type,
          eventContext.contact_purpose
        ),

      action:
        firstGa4Value(
          eventContext.action,
          eventContext.action_intent,
          eventContext.submission_status,
          eventContext.outcome
        ),

      input_method:
        ga4Scalar(
          eventContext.input_method
        )
    });
  }


  /*
   * PRIMADOM ANALYTICS V1 — POSTHOG CONTROLLED EVENTS
   *
   * Mirrors only the same normalized selected event layer
   * used for GA4. Supabase remains source of truth.
   */

  function postHogEventProperties(
    eventContext = {}
  ) {

    return {
      page_id:
        PAGE_ID,

      language_code:
        LANGUAGE_CODE,

      page_type:
        PAGE_TYPE,

      section_key:
        ga4Scalar(
          eventContext.section_key
        ),

      interaction_key:
        firstGa4Value(
          eventContext.interaction_key,
          eventContext.cta_key,
          eventContext.form_key,
          eventContext.target_entity_slug,
          eventContext.target_entity_id,
          eventContext.faq_key,
          eventContext.item_key,
          eventContext.contact_purpose
        ),

      interaction_type:
        firstGa4Value(
          eventContext.interaction_type,
          eventContext.cta_type,
          eventContext.target_entity_type,
          eventContext.request_type,
          eventContext.contact_purpose
        ),

      action:
        firstGa4Value(
          eventContext.action,
          eventContext.action_intent,
          eventContext.submission_status,
          eventContext.outcome
        ),

      input_method:
        ga4Scalar(
          eventContext.input_method
        )
    };
  }


  function pushPostHogEvent(
    eventName,
    eventContext = {}
  ) {

    if (
      !GA4_SELECTED_EVENTS.has(
        eventName
      ) ||
      window.__primadomStatisticsConsent === false ||
      !window.posthog ||
      typeof window.posthog.capture !== "function"
    ) {
      return;
    }

    window.posthog.capture(
      eventName,
      postHogEventProperties(
        eventContext
      )
    );
  }


  function loadGtmContainer() {

    if (
      !GTM_CONTAINER_ID ||
      window.__primadomGtmRequested
    ) {
      return;
    }

    window.__primadomGtmRequested =
      true;


    /*
     * Seed stable page metadata before GTM initializes.
     * The custom bootstrap event itself is NOT sent to GA4.
     */

    window.dataLayer.push({
      event:
        "primadom_analytics_bootstrap",

      page_id:
        PAGE_ID,

      language_code:
        LANGUAGE_CODE,

      page_type:
        PAGE_TYPE,

      section_key:
        "",

      interaction_key:
        "",

      interaction_type:
        "",

      action:
        "",

      input_method:
        ""
    });


    window.dataLayer.push({
      "gtm.start":
        Date.now(),

      event:
        "gtm.js"
    });


    const script =
      document.createElement(
        "script"
      );

    script.async =
      true;

    script.src =
      "https://www.googletagmanager.com/gtm.js?id=" +
      encodeURIComponent(
        GTM_CONTAINER_ID
      );

    script.setAttribute(
      "data-primadom-gtm",
      GTM_CONTAINER_ID
    );

    (
      document.head ||
      document.documentElement
    ).appendChild(
      script
    );
  }


  loadGtmContainer();


  const pageViewPayload = {
    schema_version: "1.0",
    event_id: uuidV4(),
    event_name: "page_view",
    occurred_at: new Date(nowMs).toISOString(),
    visitor_id: visitorId,
    session_id: sessionId,
    pageview_id: pageviewId,
    page_id: PAGE_ID,
    event_value: null,
    event_context: {
      context_version: "1.0"
    },
    acquisition: acquisitionEvidence()
  };

  const pageViewReady = sendPayload(pageViewPayload);

  /*
   * PRIMADOM POSTHOG PAGE VIEW
   */
  pageViewReady.then((accepted) => {

    if (
      !accepted ||
      window.__primadomStatisticsConsent === false ||
      !window.posthog ||
      typeof window.posthog.capture !== "function"
    ) {
      return;
    }

    window.posthog.capture(
      "page_view",
      {
        page_id:
          PAGE_ID,

        language_code:
          LANGUAGE_CODE,

        page_type:
          PAGE_TYPE
      }
    );
  });

  async function emitBehaviour(
    eventName,
    eventValue = null,
    eventContext = {}
  ) {
    if (
      window.__primadomStatisticsConsent === false
    ) {
      return false;
    }

    const ready = await pageViewReady;

    if (!ready) {
      return false;
    }

    const occurredMs = Date.now();

    const payload = {
      schema_version: "1.0",
      event_id: uuidV4(),
      event_name: eventName,
      occurred_at: new Date(occurredMs).toISOString(),
      visitor_id: visitorId,
      session_id: sessionId,
      pageview_id: pageviewId,
      page_id: PAGE_ID,
      event_value: eventValue,
      event_context: {
        context_version: "1.0",
        ...eventContext
      }
    };

    pushGa4Event(
      eventName,
      eventContext
    );

    pushPostHogEvent(
      eventName,
      eventContext
    );

    const accepted = await sendPayload(payload);

    if (accepted) {
      touchSessionActivity(occurredMs);
    }

    return accepted;
  }

  const scrollMilestones = [25, 50, 75, 90, 100];
  const sentScrollMilestones = new Set();

  let reachedTwentyFivePercent = false;
  let meaningfulInteractionOccurred = false;
  let engagedSent = false;

  let activeVisibleMs = 0;
  let activeTickStartedAt = null;

  function isActiveVisible() {
    return (
      document.visibilityState === "visible" &&
      document.hasFocus()
    );
  }

  function updateActiveClock() {
    const now = Date.now();

    if (
      activeTickStartedAt !== null &&
      isActiveVisible()
    ) {
      activeVisibleMs += Math.max(
        0,
        now - activeTickStartedAt
      );
    }

    activeTickStartedAt =
      isActiveVisible() ? now : null;
  }

  function maybeSendEngagedView() {
    if (engagedSent) {
      return;
    }

    updateActiveClock();

    const engagedByScroll =
      activeVisibleMs >= 10 * 1000 &&
      reachedTwentyFivePercent;

    const engagedByInteraction =
      activeVisibleMs >= 10 * 1000 &&
      meaningfulInteractionOccurred;

    const engagedByTime =
      activeVisibleMs >= 30 * 1000;

    if (
      !engagedByScroll &&
      !engagedByInteraction &&
      !engagedByTime
    ) {
      return;
    }

    engagedSent = true;

    let actionType = "active_30s";

    if (engagedByScroll) {
      actionType = "active_10s_plus_scroll_25";
    } else if (engagedByInteraction) {
      actionType = "active_10s_plus_interaction";
    }

    emitBehaviour(
      "engaged_view",
      null,
      {
        duration_ms: Math.round(activeVisibleMs),
        action_type: actionType
      }
    );
  }

  function currentScrollPercent() {
    const doc = document.documentElement;

    const scrollTop =
      window.scrollY ||
      doc.scrollTop ||
      0;

    const scrollable =
      Math.max(
        doc.scrollHeight,
        document.body?.scrollHeight || 0
      ) - window.innerHeight;

    if (scrollable <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (scrollTop / scrollable) * 100
      )
    );
  }

  let scrollFramePending = false;

  function processScroll() {
    scrollFramePending = false;

    const depth = currentScrollPercent();

    for (const milestone of scrollMilestones) {
      if (
        depth >= milestone &&
        !sentScrollMilestones.has(milestone)
      ) {
        sentScrollMilestones.add(milestone);

        if (milestone >= 25) {
          reachedTwentyFivePercent = true;
        }

        emitBehaviour(
          "scroll_depth",
          milestone,
          {
            milestone
          }
        );
      }
    }

    maybeSendEngagedView();
  }

  function onScroll() {
    if (scrollFramePending) {
      return;
    }

    scrollFramePending = true;

    window.requestAnimationFrame(processScroll);
  }

  function resetActiveClock() {
    updateActiveClock();
  }

  document.addEventListener(
    "visibilitychange",
    resetActiveClock
  );

  window.addEventListener(
    "focus",
    resetActiveClock
  );

  window.addEventListener(
    "blur",
    resetActiveClock
  );

  window.addEventListener(
    "scroll",
    onScroll,
    { passive: true }
  );

  const TRACKED_LANGUAGES = new Set([
    "en",
    "ru",
    "hi",
    "zh",
    "es",
    "fr",
    "de",
    "ar"
  ]);

  function markMeaningfulInteraction() {
    meaningfulInteractionOccurred = true;
    maybeSendEngagedView();
  }

  function isMeaningfulSection(section) {
    if (!(section instanceof HTMLElement)) {
      return false;
    }

    if (!section.id) {
      return false;
    }

    if (
      section.closest(
        '[role="dialog"], [aria-modal="true"]'
      )
    ) {
      return false;
    }

    if (
      section.hidden ||
      section.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }

    const id = section.id.toLowerCase();

    if (id.includes("modal")) {
      return false;
    }

    return true;
  }

  function sectionVisibilityQualified(section) {
    if (document.visibilityState !== "visible") {
      return false;
    }

    if (
      section.hidden ||
      section.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }

    const style = window.getComputedStyle(section);

    if (
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      return false;
    }

    const rect = section.getBoundingClientRect();

    if (
      rect.height <= 0 ||
      rect.width <= 0
    ) {
      return false;
    }

    const visibleTop = Math.max(
      0,
      rect.top
    );

    const visibleBottom = Math.min(
      window.innerHeight,
      rect.bottom
    );

    const visiblePixels = Math.max(
      0,
      visibleBottom - visibleTop
    );

    const requiredPixels = Math.min(
      rect.height * 0.5,
      window.innerHeight * 0.5
    );

    return visiblePixels >= requiredPixels;
  }

  const trackedSections = Array.from(
    document.querySelectorAll("section[id]")
  ).filter(isMeaningfulSection);

  const sectionPositions = new Map(
    trackedSections.map(
      (section, index) => [
        section,
        index + 1
      ]
    )
  );

  const sentSectionViews = new Set();
  const sectionVisibleSince = new Map();

  function processSectionVisibility() {
    const now = Date.now();

    for (const section of trackedSections) {
      const sectionKey = section.id;

      if (sentSectionViews.has(sectionKey)) {
        continue;
      }

      if (!sectionVisibilityQualified(section)) {
        sectionVisibleSince.delete(sectionKey);
        continue;
      }

      const visibleSince =
        sectionVisibleSince.get(sectionKey);

      if (visibleSince === undefined) {
        sectionVisibleSince.set(
          sectionKey,
          now
        );

        continue;
      }

      const durationMs =
        now - visibleSince;

      if (durationMs < 1000) {
        continue;
      }

      sentSectionViews.add(sectionKey);
      sectionVisibleSince.delete(sectionKey);

      emitBehaviour(
        "section_view",
        null,
        {
          section_key: sectionKey,
          section_position:
            sectionPositions.get(section) || null,
          duration_ms: Math.round(durationMs)
        }
      );
    }
  }

  function routeInfo(pathname) {
    const segments = pathname
      .split("/")
      .filter(Boolean);

    let language = null;
    let offset = 0;

    if (
      segments.length > 0 &&
      TRACKED_LANGUAGES.has(
        segments[0].toLowerCase()
      )
    ) {
      language =
        segments[0].toLowerCase();

      offset = 1;
    }

    return {
      language,
      family:
        (
          segments[offset] || ""
        ).toLowerCase(),
      slug:
        segments[offset + 1] || null
    };
  }

  function analyticsSectionKey(element) {
    const breadcrumb = element.closest(
      'nav[aria-label*="breadcrumb" i], [class*="breadcrumbs"]'
    );

    if (breadcrumb) {
      return "breadcrumbs";
    }

    const section =
      element.closest("section[id]");

    if (section?.id) {
      return section.id;
    }

    if (element.closest("header")) {
      return "header";
    }

    if (element.closest("footer")) {
      return "footer";
    }

    return "page";
  }

  function anchorPosition(anchor) {
    const container =
      anchor.closest(
        "section[id], nav, header, footer, main"
      ) ||
      document.body;

    const anchors = Array.from(
      container.querySelectorAll("a[href]")
    );

    const index =
      anchors.indexOf(anchor);

    return index >= 0
      ? index + 1
      : null;
  }

  function isManagedCtaAnchor(anchor) {
    if (
      anchor.matches(
        "[data-open-lead], [data-scroll-ask-ai], [data-analytics-managed-cta='1']"
      )
    ) {
      return true;
    }

    for (const attribute of anchor.attributes) {
      if (
        attribute.name.startsWith(
          "data-open-"
        ) ||
        attribute.name === "data-pa-modal"
      ) {
        return true;
      }
    }

    const href =
      anchor.getAttribute("href") || "";

    return (
      href.startsWith("#") &&
      href.toLowerCase().includes("modal")
    );
  }

  function isContactDestination(url) {
    const protocol =
      url.protocol.toLowerCase();

    if (
      protocol === "mailto:" ||
      protocol === "tel:" ||
      protocol === "sms:"
    ) {
      return true;
    }

    const host =
      url.hostname.toLowerCase();

    return (
      host === "wa.me" ||
      host === "api.whatsapp.com" ||
      host.endsWith(".whatsapp.com")
    );
  }

  function navigationEventForRoute(
    targetRoute
  ) {
    const family =
      targetRoute.family;

    if (
      family.includes("comparison") ||
      family.startsWith("compare-")
    ) {
      let entityType = null;

      if (family.includes("project")) {
        entityType = "project";
      } else if (
        family.includes("district")
      ) {
        entityType = "district";
      } else if (
        family.includes("developer")
      ) {
        entityType = "developer";
      }

      if (entityType) {
        return {
          eventName: "comparison_click",
          entityType
        };
      }
    }

    if (
      family === "projects" ||
      family === "project"
    ) {
      return {
        eventName: "project_click",
        entityType: "project"
      };
    }

    if (
      family === "districts" ||
      family === "district"
    ) {
      return {
        eventName: "district_click",
        entityType: "district"
      };
    }

    if (
      family === "developers" ||
      family === "developer"
    ) {
      return {
        eventName: "developer_click",
        entityType: "developer"
      };
    }

    return null;
  }

  function isMapDestination(url) {
    const host =
      url.hostname.toLowerCase();

    const path =
      url.pathname.toLowerCase();

    return (
      (
        host === "www.google.com" ||
        host === "google.com"
      ) &&
      path.startsWith("/maps")
    ) ||
      host === "maps.google.com" ||
      host === "maps.apple.com" ||
      (
        host === "goo.gl" &&
        path.startsWith("/maps")
      );
  }

  function faqDetailsElements() {
    return Array.from(
      new Set([
        ...document.querySelectorAll(
          '[id="faq"] details'
        ),
        ...document.querySelectorAll(
          '[class*="faq"] details'
        )
      ])
    );
  }

  for (const details of faqDetailsElements()) {
    details.addEventListener(
      "toggle",
      () => {
        if (!details.open) {
          return;
        }

        const container =
          details.closest(
            '[id="faq"], [class*="faq"]'
          );

        if (!container) {
          return;
        }

        const items = Array.from(
          container.querySelectorAll(
            "details"
          )
        );

        const index =
          items.indexOf(details);

        const position =
          index >= 0
            ? index + 1
            : null;

        markMeaningfulInteraction();

        emitBehaviour(
          "faq_open",
          null,
          {
            faq_key:
              details.id ||
              (
                position
                  ? `faq_${position}`
                  : "faq"
              ),
            item_position: position,
            section_key: "faq"
          }
        );
      }
    );
  }

  function galleryInteractionFromButton(
    button
  ) {
    const isProjectPrev =
      button.matches(
        "[data-project-gallery-prev]"
      );

    const isProjectNext =
      button.matches(
        "[data-project-gallery-next]"
      );

    const isDistrictPrev =
      button.matches(
        "[data-pa-gallery-prev]"
      );

    const isDistrictNext =
      button.matches(
        "[data-pa-gallery-next]"
      );

    if (
      !isProjectPrev &&
      !isProjectNext &&
      !isDistrictPrev &&
      !isDistrictNext
    ) {
      return null;
    }

    const isProject =
      isProjectPrev ||
      isProjectNext;

    const root = isProject
      ? button.closest(
          ".pd-project-gallery"
        ) ||
        button.closest(
          ".pd-project-hero"
        )
      : button.closest(
          ".pa-gallery"
        ) ||
        button.closest(
          ".pa-hero"
        );

    if (!root) {
      return null;
    }

    const slides = Array.from(
      root.querySelectorAll(
        isProject
          ? ".pd-project-slide"
          : ".pa-slide"
      )
    );

    if (slides.length <= 1) {
      return null;
    }

    let activeIndex =
      slides.findIndex(
        (slide) =>
          slide.classList.contains(
            "is-active"
          )
      );

    if (activeIndex < 0) {
      activeIndex = 0;
    }

    const isPrevious =
      isProjectPrev ||
      isDistrictPrev;

    const nextIndex =
      (
        activeIndex +
        (
          isPrevious
            ? -1
            : 1
        ) +
        slides.length
      ) % slides.length;

    return {
      action:
        isPrevious
          ? "previous"
          : "next",
      mediaPosition:
        nextIndex + 1,
      galleryKey:
        isProject
          ? "project_hero"
          : "district_hero"
    };
  }

  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : null;

      const button =
        target?.closest(
          [
            "[data-project-gallery-prev]",
            "[data-project-gallery-next]",
            "[data-pa-gallery-prev]",
            "[data-pa-gallery-next]"
          ].join(",")
        );

      if (!button) {
        return;
      }

      const interaction =
        galleryInteractionFromButton(
          button
        );

      if (!interaction) {
        return;
      }

      markMeaningfulInteraction();

      emitBehaviour(
        "gallery_interaction",
        null,
        {
          action:
            interaction.action,
          media_position:
            interaction.mediaPosition,
          gallery_key:
            interaction.galleryKey
        }
      );
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target
          : null;

      const anchor =
        target?.closest("a[href]");

      if (!anchor) {
        return;
      }

      let url;

      try {
        url = new URL(
          anchor.getAttribute("href"),
          window.location.href
        );
      } catch {
        return;
      }

      if (!isMapDestination(url)) {
        return;
      }

      markMeaningfulInteraction();

      emitBehaviour(
        "map_interaction",
        null,
        {
          action: "open_map",
          map_key: "map",
          section_key:
            analyticsSectionKey(
              anchor
            )
        }
      );
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0
      ) {
        return;
      }

      const target =
        event.target instanceof Element
          ? event.target
          : null;

      const anchor =
        target?.closest("a[href]");

      if (!anchor) {
        return;
      }

      if (isManagedCtaAnchor(anchor)) {
        return;
      }

      const rawHref =
        anchor.getAttribute("href");

      if (
        !rawHref ||
        rawHref === "#"
      ) {
        return;
      }

      let url;

      try {
        url = new URL(
          rawHref,
          window.location.href
        );
      } catch {
        return;
      }

      if (isContactDestination(url)) {
        return;
      }

      if (isMapDestination(url)) {
        return;
      }

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return;
      }

      const sectionKey =
        analyticsSectionKey(anchor);

      const itemPosition =
        anchorPosition(anchor);

      const currentRoute =
        routeInfo(
          window.location.pathname
        );

      const targetRoute =
        routeInfo(url.pathname);

      const isInternal =
        url.origin ===
        window.location.origin;

      if (!isInternal) {
        markMeaningfulInteraction();

        emitBehaviour(
          "external_link_click",
          null,
          {
            section_key: sectionKey,
            target_host:
              url.hostname.toLowerCase(),
            link_type: "external"
          }
        );

        return;
      }

      const isBreadcrumb =
        Boolean(
          anchor.closest(
            'nav[aria-label*="breadcrumb" i], [class*="breadcrumbs"]'
          )
        );

      const languageChanged =
        currentRoute.language &&
        targetRoute.language &&
        currentRoute.language !==
          targetRoute.language;

      const samePageAnchor =
        url.pathname ===
          window.location.pathname &&
        Boolean(url.hash);

      if (
        isBreadcrumb ||
        languageChanged ||
        samePageAnchor
      ) {
        let linkType = "internal";

        if (isBreadcrumb) {
          linkType = "breadcrumb";
        } else if (languageChanged) {
          linkType = "language_switch";
        } else if (samePageAnchor) {
          linkType = "anchor";
        }

        markMeaningfulInteraction();

        emitBehaviour(
          "internal_link_click",
          null,
          {
            section_key: sectionKey,
            link_type: linkType,
            target_path: url.pathname,
            item_position: itemPosition
          }
        );

        return;
      }

      const specialised =
        navigationEventForRoute(
          targetRoute
        );

      if (specialised) {
        markMeaningfulInteraction();

        if (
          specialised.eventName ===
          "comparison_click"
        ) {
          const context = {
            comparison_entity_type:
              specialised.entityType,
            pair_key:
              targetRoute.slug,
            section_key: sectionKey,
            item_position: itemPosition,
            target_path: url.pathname
          };

          if (
            targetRoute.slug &&
            targetRoute.slug.includes(
              "-vs-"
            )
          ) {
            const parts =
              targetRoute.slug.split(
                "-vs-"
              );

            if (parts.length === 2) {
              context.left_slug =
                parts[0];

              context.right_slug =
                parts[1];
            }
          }

          emitBehaviour(
            "comparison_click",
            null,
            context
          );

          return;
        }

        emitBehaviour(
          specialised.eventName,
          null,
          {
            target_entity_slug:
              targetRoute.slug,
            section_key: sectionKey,
            item_position: itemPosition,
            target_path: url.pathname
          }
        );

        return;
      }

      markMeaningfulInteraction();

      emitBehaviour(
        "internal_link_click",
        null,
        {
          section_key: sectionKey,
          link_type: "internal",
          target_path: url.pathname,
          item_position: itemPosition
        }
      );
    },
    true
  );


    /*
     * PRIMADOM ANALYTICS V1 — CTA / LEAD FORMS
     *
     * Production 12 page types only.
     * No translated labels are used as identifiers.
     * No form values / PII are sent to analytics.
     */

    let lastLeadEntry = null;

    function analyticsKeyPart(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "unknown";
    }

    function ctaSurfaceSection(anchor) {
      if (anchor.closest("header")) {
        return "header";
      }

      if (anchor.closest("footer")) {
        return "footer";
      }

      if (
        anchor.closest(
          [
            ".pd-project-actions",
            ".pa-actions",
            ".pd-actions",
            ".pc-actions",
            ".pb-actions",
            ".bs-actions",
            ".ob-actions",
            ".pt-actions",
            ".pi-actions",
            ".aa-actions",
            "#lead"
          ].join(",")
        )
      ) {
        return "cta";
      }

      return analyticsSectionKey(anchor);
    }

    function isCtaSurfaceAnchor(anchor) {
      if (!(anchor instanceof HTMLAnchorElement)) {
        return false;
      }

      if (isManagedCtaAnchor(anchor)) {
        return true;
      }

      if (
        anchor.closest("header") &&
        typeof anchor.className === "string" &&
        (
          anchor.className.includes("__cta") ||
          anchor.className.includes("-cta")
        )
      ) {
        return true;
      }

      if (
        anchor.closest("footer") &&
        typeof anchor.className === "string" &&
        (
          anchor.className.includes("footer-pill") ||
          anchor.className.includes("footer__cta")
        )
      ) {
        return true;
      }

      return Boolean(
        anchor.closest(
          [
            ".pd-project-actions",
            ".pa-actions",
            ".pd-actions",
            ".pc-actions",
            ".pb-actions",
            ".bs-actions",
            ".ob-actions",
            ".pt-actions",
            ".pi-actions",
            ".aa-actions",
            "#lead"
          ].join(",")
        )
      );
    }

    function ctaItemPosition(anchor) {
      const container =
        anchor.closest(
          [
            ".pd-project-actions",
            '[class*="actions"]',
            '[class*="contacts"]',
            "#lead",
            "#contact:not(footer)",
            "header",
            "footer"
          ].join(",")
        ) || anchor.parentElement;

      if (!container) {
        return null;
      }

      const anchors = Array.from(
        container.querySelectorAll("a[href]")
      ).filter(isCtaSurfaceAnchor);

      const index = anchors.indexOf(anchor);

      return index >= 0
        ? index + 1
        : null;
    }

    function hasModalOpenMarker(anchor) {
      if (
        anchor.matches(
          '[data-open-lead], [data-pa-modal="open"]'
        )
      ) {
        return true;
      }

      for (const attribute of anchor.attributes) {
        if (
          attribute.name.startsWith("data-open-")
        ) {
          return true;
        }
      }

      const href =
        anchor.getAttribute("href") || "";

      return (
        href.startsWith("#") &&
        href.toLowerCase().includes("modal")
      );
    }

    function modalTargetForAnchor(anchor) {
      if (!hasModalOpenMarker(anchor)) {
        return null;
      }

      const rawHref =
        anchor.getAttribute("href") || "";

      if (rawHref.startsWith("#")) {
        const id =
          rawHref.slice(1);

        if (
          id &&
          document.getElementById(id)
        ) {
          return id;
        }
      }

      const modals = Array.from(
        document.querySelectorAll(
          [
            '[id][aria-hidden]',
            '[id*="Modal"]',
            '[id*="modal"]',
            '[aria-modal="true"][id]'
          ].join(",")
        )
      );

      return modals.length === 1
        ? modals[0].id
        : null;
    }

    function contactKindForUrl(url) {
      const protocol =
        url.protocol.toLowerCase();

      if (protocol === "tel:") {
        return "phone";
      }

      if (protocol === "mailto:") {
        return "email";
      }

      const host =
        url.hostname.toLowerCase();

      if (
        host === "wa.me" ||
        host === "api.whatsapp.com" ||
        host.endsWith(".whatsapp.com")
      ) {
        return "whatsapp";
      }

      return null;
    }

    function looksLikeAiEntry(
      anchor,
      contactKind,
      modalTarget
    ) {
      if (
        contactKind ||
        modalTarget
      ) {
        return false;
      }

      if (
        anchor.matches(
          "[data-scroll-ask-ai]"
        )
      ) {
        return true;
      }

      const rawHref =
        (
          anchor.getAttribute("href") || ""
        ).toLowerCase();

      if (
        rawHref.startsWith("#") &&
        (
          rawHref.includes("ai") ||
          rawHref.includes("search")
        )
      ) {
        return true;
      }

      /*
       * Some V2 footers have an unmarked second pill
       * whose role is "Ask AI".
       * Position is used only as a final fallback.
       */
      if (
        anchor.closest("footer") &&
        typeof anchor.className === "string" &&
        anchor.className.includes(
          "footer-pill"
        )
      ) {
        const container =
          anchor.closest(
            '[class*="contacts"]'
          );

        if (container) {
          const pills =
            Array.from(
              container.querySelectorAll(
                "a[href]"
              )
            ).filter(
              (item) =>
                typeof item.className ===
                  "string" &&
                item.className.includes(
                  "footer-pill"
                )
            );

          return (
            pills.length >= 2 &&
            pills.indexOf(anchor) === 1
          );
        }
      }

      return false;
    }

    function ctaDescriptor(anchor) {
      let url = null;

      try {
        url = new URL(
          anchor.getAttribute("href") || "#",
          window.location.href
        );
      } catch {
        url = null;
      }

      const sectionKey =
        ctaSurfaceSection(anchor);

      const itemPosition =
        ctaItemPosition(anchor);

      const modalTarget =
        modalTargetForAnchor(anchor);

      const contactKind =
        url
          ? contactKindForUrl(url)
          : null;

      const aiEntry =
        looksLikeAiEntry(
          anchor,
          contactKind,
          modalTarget
        );

      let ctaType = "action";
      let actionIntent = "activate";
      let semanticPurpose = null;

      if (modalTarget) {
        ctaType = "lead";
        actionIntent = "open_modal";
      } else if (contactKind) {
        ctaType = "contact";

        actionIntent =
          contactKind === "whatsapp"
            ? "open_whatsapp"
            : contactKind === "phone"
              ? "call"
              : "email";
      } else if (aiEntry) {
        ctaType = "ai";
        actionIntent = "scroll_to_ai";
      }

      /*
       * Project CTA block has stable structural roles:
       * #1 lead/modal
       * #2 brochure via WhatsApp
       * #3 request call via WhatsApp
       */
      const projectActions =
        anchor.closest(
          ".pd-project-actions"
        );

      if (projectActions) {
        const anchors =
          Array.from(
            projectActions.querySelectorAll(
              "a[href]"
            )
          );

        const position =
          anchors.indexOf(anchor) + 1;

        if (position === 2) {
          ctaType = "brochure";
          semanticPurpose = "brochure";
        }

        if (position === 3) {
          ctaType = "call";
          semanticPurpose = "call";
        }
      }

      const ctaKey =
        [
          analyticsKeyPart(sectionKey),
          analyticsKeyPart(ctaType),
          itemPosition || 1
        ].join("_");

      return {
        ctaKey,
        ctaType,
        actionIntent,
        sectionKey,
        itemPosition,
        modalTarget,
        contactKind,
        semanticPurpose
      };
    }

    const ctaAnchors =
      Array.from(
        document.querySelectorAll(
          "a[href]"
        )
      ).filter(
        isCtaSurfaceAnchor
      );

    /*
     * Mark them so the existing navigation listener
     * does not also emit internal/external click events.
     */
    for (const anchor of ctaAnchors) {
      anchor.setAttribute(
        "data-analytics-managed-cta",
        "1"
      );
    }

    /*
     * CTA impression:
     * >=50% visible continuously for >=1 second.
     * Once per element/pageview.
     */
    if (
      "IntersectionObserver" in window &&
      ctaAnchors.length
    ) {
      const timers =
        new WeakMap();

      const impressed =
        new WeakSet();

      const impressedKeys =
        new Set();

      const observer =
        new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const anchor =
                entry.target;

              if (
                !(anchor instanceof HTMLAnchorElement) ||
                impressed.has(anchor)
              ) {
                continue;
              }

              const existing =
                timers.get(anchor);

              if (
                entry.isIntersecting &&
                entry.intersectionRatio >= 0.5
              ) {
                if (existing) {
                  continue;
                }

                const timer =
                  window.setTimeout(
                    () => {
                      timers.delete(anchor);

                      if (
                        impressed.has(anchor)
                      ) {
                        return;
                      }

                      const rect =
                        anchor.getBoundingClientRect();

                      if (
                        rect.width <= 0 ||
                        rect.height <= 0
                      ) {
                        return;
                      }

                      impressed.add(anchor);

                      const d =
                        ctaDescriptor(anchor);

                      if (
                        impressedKeys.has(
                          d.ctaKey
                        )
                      ) {
                        return;
                      }

                      impressedKeys.add(
                        d.ctaKey
                      );

                      emitBehaviour(
                        "cta_impression",
                        null,
                        {
                          cta_key:
                            d.ctaKey,
                          cta_type:
                            d.ctaType,
                          section_key:
                            d.sectionKey,
                          item_position:
                            d.itemPosition
                        }
                      );
                    },
                    1000
                  );

                timers.set(
                  anchor,
                  timer
                );
              } else if (existing) {
                window.clearTimeout(
                  existing
                );

                timers.delete(
                  anchor
                );
              }
            }
          },
          {
            threshold: [0, 0.5, 1]
          }
        );

      for (const anchor of ctaAnchors) {
        observer.observe(anchor);
      }
    }

    /*
     * CTA and specialised contact clicks.
     */
    document.addEventListener(
      "click",
      (event) => {
        if (event.button !== 0) {
          return;
        }

        const target =
          event.target instanceof Element
            ? event.target
            : null;

        const anchor =
          target?.closest("a[href]");

        if (
          !anchor ||
          !isCtaSurfaceAnchor(anchor)
        ) {
          return;
        }

        const d =
          ctaDescriptor(anchor);

        markMeaningfulInteraction();

        if (d.modalTarget) {
          lastLeadEntry = {
            ctaKey: d.ctaKey,
            ctaType: d.ctaType,
            sectionKey: d.sectionKey,
            entryType:
              `${d.ctaType}_${d.sectionKey}`,
            modalTarget: d.modalTarget,
            at: Date.now()
          };
        }

        if (d.contactKind) {
          let eventName = null;

          if (
            d.contactKind === "whatsapp"
          ) {
            eventName =
              "whatsapp_click";
          }

          if (
            d.contactKind === "phone"
          ) {
            eventName =
              "phone_click";
          }

          if (
            d.contactKind === "email"
          ) {
            eventName =
              "email_click";
          }

          if (eventName) {
            emitBehaviour(
              eventName,
              null,
              {
                section_key:
                  d.sectionKey,
                cta_key:
                  d.ctaKey,
                contact_purpose:
                  d.semanticPurpose ||
                  d.contactKind
              }
            );
          }

          return;
        }

        emitBehaviour(
          "cta_click",
          null,
          {
            cta_key:
              d.ctaKey,
            cta_type:
              d.ctaType,
            action_intent:
              d.actionIntent,
            section_key:
              d.sectionKey,
            item_position:
              d.itemPosition,
            modal_target:
              d.modalTarget
          }
        );
      },
      true
    );

    function leadModalForForm(form) {
      /*
       * Prefer the outer modal wrapper because that is
       * what existing page scripts toggle via class /
       * aria-hidden.
       */
      const rooted =
        form.closest(
          [
            '[id][aria-hidden]',
            '[id*="Modal"]',
            '[id*="modal"]',
            '[class*="modal"][id]'
          ].join(",")
        );

      if (rooted) {
        return rooted;
      }

      const panel =
        form.closest(
          [
            '[role="dialog"]',
            '[aria-modal="true"]',
            '[class*="modal"]'
          ].join(",")
        );

      if (!panel) {
        return null;
      }

      let current =
        panel.parentElement;

      while (
        current &&
        current !== document.body
      ) {
        const className =
          typeof current.className === "string"
            ? current.className.toLowerCase()
            : "";

        if (
          current.id &&
          (
            current.hasAttribute(
              "aria-hidden"
            ) ||
            className.includes("modal")
          )
        ) {
          return current;
        }

        current =
          current.parentElement;
      }

      return panel;
    }

    function leadForms() {
      return Array.from(
        document.querySelectorAll(
          "form"
        )
      ).filter(
        (form) =>
          Boolean(
            leadModalForForm(form)
          )
      );
    }

    function formKey(form) {
      const modal =
        leadModalForForm(form);

      return (
        analyticsKeyPart(
          modal?.id ||
          "lead_modal"
        ) +
        "_form"
      );
    }

    const leadFormStates =
      new WeakMap();

    function freshLeadFormState() {
      return {
        started: false,
        submitted: false,
        abandoned: false,
        startedAt: null,
        lastFieldKey: null
      };
    }

    function leadFormState(form) {
      let state =
        leadFormStates.get(form);

      if (!state) {
        state =
          freshLeadFormState();

        leadFormStates.set(
          form,
          state
        );
      }

      return state;
    }

    function resetLeadFormState(form) {
      leadFormStates.set(
        form,
        freshLeadFormState()
      );
    }

    function safeFieldKey(field) {
      if (
        field instanceof
          HTMLTextAreaElement
      ) {
        return "request_text";
      }

      if (
        field instanceof
          HTMLInputElement
      ) {
        const type =
          (
            field.type || "text"
          ).toLowerCase();

        if (type === "tel") {
          return "contact_tel";
        }

        if (type === "email") {
          return "contact_email";
        }

        if (type === "text") {
          return "contact_text";
        }

        return (
          "input_" +
          analyticsKeyPart(type)
        );
      }

      if (
        field instanceof
          HTMLSelectElement
      ) {
        return "selection";
      }

      if (
        field instanceof
          HTMLButtonElement
      ) {
        return "form_action";
      }

      return "form";
    }

    function ensureFormStarted(
      form,
      field
    ) {
      const state =
        leadFormState(form);

      if (state.started) {
        if (field) {
          state.lastFieldKey =
            safeFieldKey(field);
        }

        return;
      }

      state.started = true;
      state.startedAt =
        Date.now();

      state.lastFieldKey =
        safeFieldKey(field);

      const modal =
        leadModalForForm(form);

      const validEntry =
        lastLeadEntry &&
        (
          !modal?.id ||
          !lastLeadEntry.modalTarget ||
          modal.id ===
            lastLeadEntry.modalTarget
        ) &&
        Date.now() -
          lastLeadEntry.at <
          30 * 60 * 1000;

      emitBehaviour(
        "form_start",
        null,
        {
          form_key:
            formKey(form),
          entry_cta_type:
            validEntry
              ? lastLeadEntry.entryType
              : "direct",
          section_key:
            "modal"
        }
      );
    }

    for (const form of leadForms()) {
      form.addEventListener(
        "pointerdown",
        (event) => {
          if (!event.isTrusted) {
            return;
          }

          const field =
            event.target instanceof Element
              ? event.target.closest(
                  "input, textarea, select, button"
                )
              : null;

          if (field) {
            ensureFormStarted(
              form,
              field
            );
          }
        },
        true
      );

      form.addEventListener(
        "keydown",
        (event) => {
          if (!event.isTrusted) {
            return;
          }

          const field =
            event.target instanceof Element
              ? event.target.closest(
                  "input, textarea, select"
                )
              : null;

          if (field) {
            ensureFormStarted(
              form,
              field
            );
          }
        },
        true
      );

      form.addEventListener(
        "input",
        (event) => {
          if (!event.isTrusted) {
            return;
          }

          ensureFormStarted(
            form,
            event.target
          );
        },
        true
      );

      form.addEventListener(
        "change",
        (event) => {
          if (!event.isTrusted) {
            return;
          }

          ensureFormStarted(
            form,
            event.target
          );
        },
        true
      );

      form.addEventListener(
        "submit",
        () => {
          const state =
            leadFormState(form);

          if (!state.started) {
            ensureFormStarted(
              form,
              null
            );
          }

          state.submitted = true;

          markMeaningfulInteraction();

          emitBehaviour(
            "form_submit",
            null,
            {
              form_key:
                formKey(form),
              request_type:
                "lead",
              submission_status:
                "attempted"
            }
          );
        },
        true
      );
    }

    function maybeEmitFormAbandon(form) {
      const state =
        leadFormState(form);

      if (
        !state.started ||
        state.submitted ||
        state.abandoned
      ) {
        return;
      }

      state.abandoned = true;

      emitBehaviour(
        "form_abandon",
        null,
        {
          form_key:
            formKey(form),
          last_field_key:
            state.lastFieldKey ||
            "unknown",
          step_key:
            "modal_closed",
          elapsed_ms:
            Math.max(
              0,
              Date.now() -
                (
                  state.startedAt ||
                  Date.now()
                )
            )
        }
      );
    }

    const leadModals =
      Array.from(
        new Set(
          leadForms()
            .map(
              (form) =>
                leadModalForForm(form)
            )
            .filter(Boolean)
        )
      );

    function modalIsOpen(modal) {
      return (
        modal.getAttribute(
          "aria-hidden"
        ) === "false" ||
        modal.classList.contains(
          "is-open"
        )
      );
    }

    for (const modal of leadModals) {
      let wasOpen =
        modalIsOpen(modal);

      const observer =
        new MutationObserver(
          () => {
            const isOpen =
              modalIsOpen(modal);

            if (
              isOpen &&
              !wasOpen
            ) {
              for (
                const form of
                modal.querySelectorAll(
                  "form"
                )
              ) {
                resetLeadFormState(
                  form
                );
              }
            }

            if (
              !isOpen &&
              wasOpen
            ) {
              for (
                const form of
                modal.querySelectorAll(
                  "form"
                )
              ) {
                maybeEmitFormAbandon(
                  form
                );
              }
            }

            wasOpen = isOpen;
          }
        );

      observer.observe(
        modal,
        {
          attributes: true,
          attributeFilter: [
            "aria-hidden",
            "class"
          ]
        }
      );
    }



  /*
   * PRIMADOM ANALYTICS V1 — AI SEARCH / VOICE
   *
   * Privacy contract:
   * - never send raw AI query text
   * - never send transcript
   * - never send audio
   * - never send form values / PII
   *
   * Covers the 12 registered page types only.
   */

  const AI_FORM_SELECTOR = [
    "#project-ai-search",
    "#developer-ai-search",
    "#type-ai",
    "#compare-ai-search",
    "#answer-ai",
    "#budget-ai",
    "#area-ai-search",
    "#scenario-ai",
    "#intent-ai-search",
    "#origin-ai"
  ].join(", ");

  const aiFormStates = new WeakMap();
  const voiceStates = new WeakMap();

  function aiFormState(form) {
    let state = aiFormStates.get(form);

    if (!state) {
      state = {
        started: false,
        inputMethod: "text"
      };

      aiFormStates.set(form, state);
    }

    return state;
  }

  function aiInputForForm(form) {
    if (!(form instanceof HTMLFormElement)) {
      return null;
    }

    return form.querySelector(
      "textarea, input[type='search'], input[type='text']"
    );
  }

  function normalisedQueryValue(input) {
    if (
      !(input instanceof HTMLInputElement) &&
      !(input instanceof HTMLTextAreaElement)
    ) {
      return "";
    }

    return String(input.value || "").trim();
  }

  function queryLength(value) {
    return Array.from(value || "").length;
  }

  function queryLanguage(value) {
    const text = String(value || "");

    if (/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text)) {
      return "ar";
    }

    if (/[\u4e00-\u9fff\u3400-\u4dbf]/u.test(text)) {
      return "zh";
    }

    if (/[\u0900-\u097f]/u.test(text)) {
      return "hi";
    }

    if (/[\u0400-\u04ff]/u.test(text)) {
      return "ru";
    }

    const pageLanguage =
      String(document.documentElement.lang || "")
        .toLowerCase()
        .split("-")[0];

    if (
      ["en", "es", "fr", "de"].includes(
        pageLanguage
      )
    ) {
      return pageLanguage;
    }

    return "und";
  }

  function emitAiInteraction(
    action,
    inputMethod,
    input
  ) {
    const value = normalisedQueryValue(input);
    const length = queryLength(value);

    if (length <= 0) {
      return;
    }

    emitBehaviour(
      "ai_search_interaction",
      null,
      {
        action,
        input_method: inputMethod,
        query_length: length,
        query_language: queryLanguage(value)
      }
    );
  }

  function registerAiForms() {
    const forms =
      document.querySelectorAll(
        AI_FORM_SELECTOR
      );

    for (const form of forms) {
      if (!(form instanceof HTMLFormElement)) {
        continue;
      }

      const input = aiInputForForm(form);

      if (!input) {
        continue;
      }

      const state = aiFormState(form);

      input.addEventListener(
        "input",
        (event) => {
          if (!event.isTrusted) {
            return;
          }

          state.inputMethod = "text";

          const value =
            normalisedQueryValue(input);

          if (
            value.length > 0 &&
            !state.started
          ) {
            state.started = true;

            markMeaningfulInteraction();

            emitAiInteraction(
              "input_start",
              "text",
              input
            );
          }
        },
        true
      );

      form.addEventListener(
        "submit",
        () => {
          const value =
            normalisedQueryValue(input);

          if (!value) {
            return;
          }

          markMeaningfulInteraction();

          emitAiInteraction(
            "submit",
            state.inputMethod,
            input
          );
        },
        true
      );
    }
  }

  function voiceSurface(button) {
    if (
      button.closest(AI_FORM_SELECTOR)
    ) {
      return "hero";
    }

    if (
      button.closest(
        '[role="dialog"], [aria-modal="true"], [id*="Modal"], [id*="modal"]'
      )
    ) {
      return "modal";
    }

    return "unknown";
  }

  function voiceInput(button) {
    const aiForm =
      button.closest(AI_FORM_SELECTOR);

    if (aiForm) {
      return aiInputForForm(aiForm);
    }

    const form = button.closest("form");

    if (!form) {
      return null;
    }

    return form.querySelector(
      "textarea, input[type='search'], input[type='text']"
    );
  }

  function voiceButtonCandidate(button) {
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }

    if (button.closest(AI_FORM_SELECTOR)) {
      return (
        button.className
          .toString()
          .toLowerCase()
          .includes("voice")
      );
    }

    return (
      button.hasAttribute("data-lead-voice") ||
      button.hasAttribute("data-pa-modal-voice") ||
      button.className
        .toString()
        .toLowerCase()
        .includes("modal-voice")
    );
  }

  function clearVoiceState(button) {
    const state = voiceStates.get(button);

    if (!state) {
      return;
    }

    if (state.timer) {
      window.clearInterval(state.timer);
    }

    if (state.timeout) {
      window.clearTimeout(state.timeout);
    }

    voiceStates.delete(button);
  }

  function finishVoice(
    button,
    outcome,
    errorCode = null
  ) {
    const state = voiceStates.get(button);

    if (!state || state.finished) {
      return;
    }

    state.finished = true;

    const durationMs =
      Math.max(
        0,
        Date.now() - state.startedAt
      );

    const context = {
      action: `${state.surface}_finish`,
      outcome,
      duration_ms: durationMs
    };

    if (errorCode) {
      context.error_code = errorCode;
    }

    emitBehaviour(
      "voice_interaction",
      null,
      context
    );

    clearVoiceState(button);
  }

  function startVoiceTracking(button) {
    const existing =
      voiceStates.get(button);

    if (existing && !existing.finished) {
      finishVoice(
        button,
        "cancelled"
      );

      return;
    }

    const surface =
      voiceSurface(button);

    const input =
      voiceInput(button);

    const originalValue =
      normalisedQueryValue(input);

    markMeaningfulInteraction();

    if (
      !(
        window.SpeechRecognition ||
        window.webkitSpeechRecognition
      )
    ) {
      emitBehaviour(
        "voice_interaction",
        null,
        {
          action: `${surface}_start`,
          outcome: "unsupported",
          duration_ms: 0,
          error_code:
            "speech_recognition_unsupported"
        }
      );

      return;
    }

    emitBehaviour(
      "voice_interaction",
      null,
      {
        action: `${surface}_start`,
        outcome: "started",
        duration_ms: 0
      }
    );

    const state = {
      surface,
      input,
      originalValue,
      startedAt: Date.now(),
      finished: false,
      timer: null,
      timeout: null
    };

    voiceStates.set(
      button,
      state
    );

    state.timer =
      window.setInterval(
        () => {
          const currentValue =
            normalisedQueryValue(
              state.input
            );

          if (
            currentValue &&
            currentValue !==
              state.originalValue
          ) {
            if (
              state.surface === "hero"
            ) {
              const form =
                button.closest(
                  AI_FORM_SELECTOR
                );

              if (form) {
                const aiState =
                  aiFormState(form);

                aiState.inputMethod =
                  "voice";

                if (!aiState.started) {
                  aiState.started = true;

                  emitAiInteraction(
                    "input_start",
                    "voice",
                    state.input
                  );
                }
              }
            }

            finishVoice(
              button,
              "success"
            );
          }
        },
        200
      );

    state.timeout =
      window.setTimeout(
        () => {
          finishVoice(
            button,
            "timeout",
            "voice_result_timeout"
          );
        },
        30000
      );
  }

  registerAiForms();

  document.addEventListener(
    "click",
    (event) => {
      if (!event.isTrusted) {
        return;
      }

      const button =
        event.target instanceof Element
          ? event.target.closest("button")
          : null;

      if (
        !button ||
        !voiceButtonCandidate(button)
      ) {
        return;
      }

      startVoiceTracking(button);
    },
    true
  );

  processSectionVisibility();

  window.setInterval(
    processSectionVisibility,
    250
  );

  activeTickStartedAt =
    isActiveVisible() ? Date.now() : null;

  window.setInterval(
    maybeSendEngagedView,
    1000
  );
})();
