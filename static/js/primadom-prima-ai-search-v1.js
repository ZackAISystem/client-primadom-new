/* PRIMADOM PRIMA AI SEARCH V1
   Only explicitly marked AI Search forms; all other site UI untouched.
   Prima owns greeting, input, voice UI, conversation and session.
   No query or page details are sent in iframe URL.
*/
(function () {
  'use strict';
  if (window.__primadomPrimaSearchV1) return;
  window.__primadomPrimaSearchV1 = true;

  var FRAME_URL = 'https://prima.primadom.ai/';
  var FORM_SELECTOR = 'form[data-prima-ai-search="v1"]';
  var overlay = null;
  var frame = null;
  var opener = null;
  var priorOverflow = '';
  var priorHtmlOverflow = '';
  var scrollX = 0;
  var scrollY = 0;

  function lang() {
    var code = String(document.documentElement.lang || '').toLowerCase().split('-')[0];
    if (!/^(en|ru|hi|zh|es|fr|de|ar)$/.test(code)) {
      code = String(location.pathname.split('/')[1] || 'en').toLowerCase();
    }
    return /^(en|ru|hi|zh|es|fr|de|ar)$/.test(code) ? code : 'en';
  }

  function label() {
    var labels = {
      en: 'Close Prima AI', ru: 'Закрыть Prima AI', hi: 'Prima AI बंद करें',
      zh: '关闭 Prima AI', es: 'Cerrar Prima AI', fr: 'Fermer Prima AI',
      de: 'Prima AI schließen', ar: 'إغلاق Prima AI'
    };
    return labels[lang()] || labels.en;
  }

  function createOverlay() {
    if (overlay) return;
    var style = document.createElement('style');
    style.setAttribute('data-prima-search-v1', '');
    style.textContent = [
      '#primadom-prima-search-v1{position:fixed;inset:0;z-index:2147483646;',
      'background:#101f22;display:none;overflow:hidden;}',
      '#primadom-prima-search-v1.is-open{display:block;}',
      '#primadom-prima-search-v1 iframe{display:block;width:100%;height:100%;',
      'border:0;background:#101f22;}',
      '#primadom-prima-search-v1 .pd-prima-close{position:absolute;',
      'z-index:3;top:max(12px,env(safe-area-inset-top));',
      'right:max(12px,env(safe-area-inset-right));width:44px;height:44px;',
      'display:grid;place-items:center;border:1px solid rgba(255,255,255,.25);',
      'border-radius:50%;background:rgba(16,31,34,.88);color:#fff;',
      'font:normal 30px/1 Arial,sans-serif;cursor:pointer;',
      'box-shadow:0 3px 20px rgba(0,0,0,.15);}',
      '#primadom-prima-search-v1 .pd-prima-close:focus-visible{',
      'outline:3px solid #f5c46d;outline-offset:2px;}'
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

    var close = document.createElement('button');
    close.className = 'pd-prima-close';
    close.type = 'button';
    close.setAttribute('aria-label', label());
    close.title = label();
    close.textContent = '\u00d7';
    close.addEventListener('click', hide);
    overlay.appendChild(close);

    document.body.appendChild(overlay);
    overlay.__close = close;
  }

  function open(source) {
    createOverlay();
    if (overlay.classList.contains('is-open')) return;
    opener = source || document.activeElement;
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    priorOverflow = document.body.style.overflow;
    priorHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    overlay.__close.setAttribute('aria-label', label());
    overlay.__close.title = label();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.__close.focus({preventScroll:true});
  }

  function hide() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = priorOverflow;
    document.documentElement.style.overflow = priorHtmlOverflow;
    window.scrollTo(scrollX, scrollY);
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

  function markedForm(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(FORM_SELECTOR);
  }

  function isActivationTarget(target) {
    if (!(target instanceof Element)) return false;
    return !!target.closest('textarea,input:not([type="hidden"]),button,[role="button"]');
  }

  function activateEvent(event) {
    var form = markedForm(event.target);
    if (!form || !isActivationTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(event.target);
  }

  document.addEventListener('pointerdown', activateEvent, true);
  document.addEventListener('click', activateEvent, true);
  document.addEventListener('focusin', function (event) {
    if (markedForm(event.target) && event.target.matches('textarea,input:not([type="hidden"])')) {
      open(event.target);
    }
  }, true);
  document.addEventListener('submit', function (event) {
    if (!event.target.matches || !event.target.matches(FORM_SELECTOR)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(event.target.querySelector('textarea,input') || event.target);
  }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
      hide();
    }
  });
})();
