/* PRIMADOM PRIMA AI SEARCH V1
   Only explicitly marked AI Search forms; all other site UI untouched.
   Prima owns greeting, input, voice UI, conversation and session.
   No query or page details are sent in iframe URL.
*/
(function () {
  'use strict';
  if (window.__primadomPrimaSearchV1) return;
  window.__primadomPrimaSearchV1 = true;

  var FRAME_URL = 'https://prima.primadom.ai/?embed=1';
  var FORM_SELECTOR = 'form[data-prima-ai-search="v1"]';
  var overlay = null;
  var frame = null;
  var opener = null;
  var priorOverflow = '';
  var priorHtmlOverflow = '';
  var scrollX = 0;
  var scrollY = 0;

  /* Native Prima mini pill copied from the actual Prima app source. */
  var miniButtonV1 = null;
  var miniMarkupV1 = "<span class=\"mini-icon\"><img src=\"/images/prima/prima-mini-mark-v1.png\" alt=\"Prima AI mark\"></span><span><strong>Continue with Prima</strong><small>Conversation saved</small></span>";
  var miniCssV1 = "#primadom-prima-mini-v1{position:fixed;right:28px;bottom:28px;z-index:60;display:none;align-items:center;gap:11px;min-height:58px;padding:0 18px 0 14px;border-radius:999px;color:#fff;border:1px solid rgba(255,255,255,.15);background:linear-gradient(135deg,rgba(18,15,13,.96),rgba(50,36,29,.94));box-shadow:0 26px 74px rgba(0,0,0,.38);backdrop-filter:blur(22px);z-index:2147483645;font-family:Montserrat,Arial,sans-serif;text-align:left;cursor:pointer;box-sizing:border-box;appearance:none;}#primadom-prima-mini-v1.show{display:flex;}#primadom-prima-mini-v1 .mini-icon{width:12px;height:20px;display:grid;place-items:center;align-self:center;background:transparent;flex:0 0 auto}#primadom-prima-mini-v1 .mini-icon img{width:100%;height:100%;display:block;object-fit:contain;object-position:center center;transform:translateY(-2px)}#primadom-prima-mini-v1 strong{display:block;font-size:12px;font-weight:500;line-height:1.08;letter-spacing:.01em}#primadom-prima-mini-v1 span small{display:block;color:rgba(255,255,255,.5);font-size:9.5px;line-height:1.1;margin-top:3px}#primadom-prima-mini-v1:focus-visible{outline:2px solid #f7d8aa;outline-offset:3px;}@media(max-width:760px){#primadom-prima-mini-v1{right:14px;bottom:calc(18px + env(safe-area-inset-bottom));min-height:54px;padding:0 16px 0 13px;gap:10px}#primadom-prima-mini-v1 strong{font-size:11.5px}#primadom-prima-mini-v1 span small{font-size:9px}}";

  function ensureMiniV1() {
    if (miniButtonV1) return miniButtonV1;
    var style = document.createElement('style');
    style.setAttribute('data-prima-mini-v1', '');
    style.textContent = miniCssV1;
    document.head.appendChild(style);

    var button = document.createElement('button');
    button.id = 'primadom-prima-mini-v1';
    button.className = 'mini';
    button.type = 'button';
    button.setAttribute('aria-label', 'Continue with Prima');
    button.innerHTML = miniMarkupV1;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      open(button);
    });
    document.body.appendChild(button);
    miniButtonV1 = button;
    return button;
  }

  function showMiniV1() {
    ensureMiniV1().classList.add('show');
  }

  function createOverlay() {
    if (overlay) return;
    var style = document.createElement('style');
    style.setAttribute('data-prima-search-v1', '');
    style.textContent = [
      '#primadom-prima-search-v1{position:fixed;inset:0;z-index:2147483646;',
      'background:#101f22;opacity:0;visibility:hidden;pointer-events:none;',
      'overflow:hidden;transition:opacity .38s cubic-bezier(.22,1,.36,1),',
      'visibility .38s linear;}',
      '#primadom-prima-search-v1.is-open{opacity:1;visibility:visible;',
      'pointer-events:auto;}',
      '#primadom-prima-search-v1 iframe{display:block;width:100%;height:100%;',
      'border:0;background:#101f22;transform:translateY(10px) scale(.994);',
      'transition:transform .44s cubic-bezier(.22,1,.36,1);}',
      '#primadom-prima-search-v1.is-open iframe{transform:translateY(0) scale(1);}',
      '@media (prefers-reduced-motion:reduce){',
      '#primadom-prima-search-v1,#primadom-prima-search-v1 iframe{transition:none;}}'
    ].join('');
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.id = 'primadom-prima-search-v1';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Prima AI');
    overlay.setAttribute('aria-hidden', 'true');

    frame = document.createElement('iframe');
    frame.title = 'Prima AI';
    frame.setAttribute('allow', 'microphone; clipboard-write');
    frame.setAttribute('referrerpolicy', 'origin');
    frame.setAttribute('loading', 'eager');
    frame.src = FRAME_URL;
    overlay.appendChild(frame);
    document.body.appendChild(overlay);


  }

  function open(source) {
    createOverlay();
    if (overlay.classList.contains('is-open')) return;
    if (miniButtonV1) miniButtonV1.classList.remove('show');
    opener = source || document.activeElement;
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    priorOverflow = document.body.style.overflow;
    priorHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    try { frame.focus({preventScroll:true}); } catch (_) {}
  }

  function hide() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = priorOverflow;
    document.documentElement.style.overflow = priorHtmlOverflow;
    window.scrollTo(scrollX, scrollY);
    showMiniV1();
    if (opener && opener.isConnected && !markedForm(opener) && typeof opener.focus === 'function') {
      try { opener.focus({preventScroll:true}); } catch (_) {}
    } else {
      // Returning focus to the marked textarea would instantly reopen Prima.
      var fallback = document.querySelector('main') || document.body;
      var oldTabIndex = fallback.getAttribute('tabindex');
      fallback.setAttribute('tabindex', '-1');
      try { fallback.focus({preventScroll:true}); } catch (_) {}
      if (oldTabIndex === null) fallback.removeAttribute('tabindex');
      else fallback.setAttribute('tabindex', oldTabIndex);
    }
  }

  /* Homepage Entry V1: only three explicit AI inputs, never Hero Find. */
  var HOME_AI_INPUTS_V1 = [
    '.top-projects-ask__input',
    '.top-developers-ask__input',
    '.intent-ask__input'
  ];

  function homeAiInputV1(target) {
    if (!document.body.classList.contains('page-home')) return null;
    if (!(target instanceof Element)) return null;
    if (target.closest('.home-hero__search')) return null;

    for (var i = 0; i < HOME_AI_INPUTS_V1.length; i++) {
      var field = document.querySelector(HOME_AI_INPUTS_V1[i]);
      if (!field) continue;
      var rect = field.getBoundingClientRect();
      var visible = rect.width > 10 && rect.height > 8 &&
        getComputedStyle(field).visibility !== 'hidden' &&
        !field.closest('[hidden],[aria-hidden="true"]');
      if (!visible) continue;

      if (target === field || field.contains(target)) return field;

      var button = target.closest('button');
      if (!button) continue;

      var container = field.closest('form') ||
        field.closest('.top-projects-ask,.top-developers-ask,.intent-ask');
      if (!container || !container.contains(button)) continue;

      var className = String(button.className || '').toLowerCase();
      var aria = String(button.getAttribute('aria-label') || '').toLowerCase();
      var isVoice = /voice|microphone|mic\b/.test(className + ' ' + aria);
      var isSubmit = button.type === 'submit' ||
        /(?:__|[-_])(submit|send|get|ask-button|ask-btn)(?:\b|$)/.test(className);
      if (isVoice || isSubmit) return field;
    }
    return null;
  }

  function homeAiFormV1(form) {
    if (!document.body.classList.contains('page-home') ||
        !(form instanceof Element) ||
        form.matches('.home-hero__search')) return false;
    for (var i = 0; i < HOME_AI_INPUTS_V1.length; i++) {
      var field = form.querySelector(HOME_AI_INPUTS_V1[i]);
      if (!field) continue;
      var rect = field.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 8 &&
          !field.closest('[hidden],[aria-hidden="true"]')) return true;
    }
    return false;
  }

  function markedForm(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(FORM_SELECTOR);
  }

  function isActivationTarget(target) {
    if (!(target instanceof Element)) return false;
    return !!target.closest('textarea,input:not([type="hidden"]),button,[role="button"]');
  }

  function activateEvent(event) {
    var homeField = homeAiInputV1(event.target);
    if (homeField) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open(event.target);
      return;
    }
    var form = markedForm(event.target);
    if (!form || !isActivationTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(event.target);
  }

  window.addEventListener('message', function (event) {
    if (!frame || !overlay) return;
    if (event.origin !== 'https://prima.primadom.ai') return;
    if (event.source !== frame.contentWindow) return;
    var message = event.data;
    if (!message || message.version !== 'PrimaEmbedControlV1') return;
    if (message.type === 'prima:embed:close' ||
        message.type === 'prima:embed:minimize') {
      hide();
    }
  });

  window.PrimadomPrimaSearchV1 = Object.freeze({open: open});

  document.addEventListener('pointerdown', activateEvent, true);
  document.addEventListener('click', activateEvent, true);
  document.addEventListener('focusin', function (event) {
    if (markedForm(event.target) && event.target.matches('textarea,input:not([type="hidden"])')) {
      open(event.target);
    }
  }, true);
  document.addEventListener('submit', function (event) {
    if (homeAiFormV1(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open(event.target);
      return;
    }
    if (!event.target.matches || !event.target.matches(FORM_SELECTOR)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(event.target.querySelector('textarea,input') || event.target);
  }, true);
  document.addEventListener('keydown', function (event) {
    var homeField = homeAiInputV1(event.target);
    if (homeField && (event.key.length === 1 || event.key === 'Enter')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open(event.target);
      return;
    }
    if (event.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
      hide();
    }
  });
})();
