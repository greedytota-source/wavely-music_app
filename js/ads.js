/* ────────────────────────────────────────────────────────────────
   AdSense slots — Aurum player
   (loaded after js/app.js; config lives in js/ads-config.js)

   Rules this file exists to keep:

   * Playback is sacred. Nothing here touches the bottom player, the
     now-playing panel, the queue drawer or any play/seek control, and the
     ad script is injected only after `load` + idle so it never competes
     with the first paint or the first play.
   * No layout jumps. The slot box reserves its height before the ad script
     exists, so adding or swapping an ad never moves a row under the
     listener's cursor while a song is running.
   * Disabled until configured. With the shipped placeholder ids nothing
     below runs — no script tag, no request, no markup.
   ──────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const cfg = window.AdsConfig || {};
  const client = String(cfg.client || "").trim();
  const slot = String((cfg.slots && cfg.slots.content) || "").trim();

  // The shipped ids are all zeroes, which fails both patterns below.
  const usable = /^ca-pub-[1-9][0-9]{4,}$/.test(client) && /^[1-9][0-9]*$/.test(slot);
  if (!usable) {
    console.info("[ads] js/ads-config.js still holds the placeholder ids — no ads loaded.");
    return;
  }

  /* Only these routes get a slot: Home, Search, playlist/album and artist.
     /library, /profile, /genre, /legal, /not-found and admin.html stay clean,
     and the player shell is never a candidate because it lives outside #view. */
  function routeAllowed() {
    const raw = location.hash.replace(/^#/, "");
    const path = (raw.split("?")[0] || "/").replace(/\/+$/, "") || "/";
    return path === "/" || path === "/search" || path.startsWith("/playlist/") || path.startsWith("/artist/");
  }

  let scriptStarted = false;
  let adScriptLoaded = false;

  function loadAdScript() {
    if (scriptStarted) return;
    scriptStarted = true;
    const el = document.createElement("script");
    el.async = true;
    el.crossOrigin = "anonymous";
    el.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
    el.addEventListener("load", () => {
      adScriptLoaded = true;
      // Nothing else may have mutated #view since the slot was reserved,
      // so push the queued unit now that the library can read it.
      sync();
    });
    document.head.appendChild(el);
  }

  function buildSlot() {
    const box = document.createElement("aside");
    box.className = "ad-slot";
    box.setAttribute("data-ad-key", "content");
    box.setAttribute("aria-label", "Advertisement");
    // The label is in the DOM from the start (opacity 0) so revealing it
    // after the ad fills cannot move anything.
    box.innerHTML = '<span class="ad-slot__label">Advertisement</span>';
    return box;
  }

  function fill(box) {
    if (box.dataset.filled) return;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", client);
    ins.setAttribute("data-ad-slot", slot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    box.appendChild(ins);
    box.dataset.filled = "true";
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("[ads] ad unit did not render:", err);
    }
  }

  function sync() {
    const view = document.getElementById("view");
    if (!view) return;

    if (!routeAllowed()) {
      const stale = view.querySelector(":scope > .ad-slot");
      if (stale) stale.remove();
      return;
    }

    let box = view.querySelector(":scope > .ad-slot");
    if (!box) {
      box = buildSlot();
      view.appendChild(box);
    }
    if (scriptStarted && adScriptLoaded) fill(box);
  }

  /* #view is re-created wholesale on every hashchange, so a MutationObserver
     re-arms the slot instead of patching each view function in app.js. Calling
     sync() straight from the callback is safe: appending the box queues one
     more mutation, and the follow-up pass sees the box already there. */
  function observe() {
    const view = document.getElementById("view");
    if (!view) return;
    new MutationObserver(sync).observe(view, { childList: true });
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }

  /* The ad script waits for the page's own work to finish: after `load` plus
     an idle slice, so fetching ad code can never delay audio or rendering. */
  function startAds() {
    loadAdScript();
    sync();
  }

  window.addEventListener("load", () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(startAds, { timeout: 4000 });
    } else {
      setTimeout(startAds, 1500);
    }
  });
})();
