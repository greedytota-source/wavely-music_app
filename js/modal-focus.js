/* ═══════════════════════════════════════════════════════════════
   Aurum — modal focus handling
   Keeps keyboard focus inside the open dialog, closes it on Escape,
   makes the page behind it inert, and returns focus to whatever
   opened it. Shared by the account, playlist and add-to-playlist
   modals so all three behave the same.

   window.ModalFocus.open(modal, { initialFocus, onClose, returnFocus })
   window.ModalFocus.close(modal)
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  const stack = [];

  const isVisible = (el) => Boolean(el && el.isConnected && el.getClientRects().length);
  const focusables = (modal) => [...modal.querySelectorAll(FOCUSABLE)].filter(isVisible);

  function syncBackground() {
    const root = document.getElementById("app");
    if (root && "inert" in root) root.inert = stack.length > 0;
    document.body.classList.toggle("modal-open", stack.length > 0);
  }

  function focusElement(el) {
    if (!isVisible(el)) return false;
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      el.focus();
    }
    return document.activeElement === el;
  }

  function open(modal, options = {}) {
    if (!modal) return;

    const already = stack.find((entry) => entry.modal === modal);
    if (already) {
      if (options.onClose) already.onClose = options.onClose;
      return;
    }

    // Prefer the trigger the caller hands us: a mouse click on Safari does not
    // always move focus to the clicked button.
    const restoreTo = options.returnFocus instanceof HTMLElement && options.returnFocus.isConnected
      ? options.returnFocus
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    modal.hidden = false;
    stack.push({
      modal,
      restoreTo,
      onClose: options.onClose || (() => close(modal))
    });
    syncBackground();

    // Focus after the card is laid out so the browser does not scroll the page.
    setTimeout(() => {
      if (modal.hidden) return;
      const wanted = typeof options.initialFocus === "function"
        ? options.initialFocus()
        : options.initialFocus;
      if (focusElement(wanted)) return;
      if (focusElement(focusables(modal)[0])) return;
      const card = modal.querySelector("[role='dialog']");
      if (card) {
        card.tabIndex = -1;
        focusElement(card);
      }
    }, 30);
  }

  function close(modal) {
    if (!modal) return;

    const index = stack.findIndex((entry) => entry.modal === modal);
    const entry = index >= 0 ? stack.splice(index, 1)[0] : null;
    modal.hidden = true;
    syncBackground();

    if (!entry) return;

    // Prefer the element that opened the dialog; otherwise fall back into the
    // dialog that is still on top (nested opens), then to the account button.
    if (focusElement(entry.restoreTo)) return;
    if (stack.length) {
      focusElement(focusables(stack[stack.length - 1].modal)[0]);
      return;
    }
    if (focusElement(document.getElementById("authBtn"))) return;
    focusElement(document.getElementById("searchInput"));
  }

  document.addEventListener("keydown", (event) => {
    const entry = stack[stack.length - 1];
    if (!entry) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      entry.onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const items = focusables(entry.modal);
    if (!items.length) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (!entry.modal.contains(active)) {
      event.preventDefault();
      focusElement(event.shiftKey ? last : first);
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      focusElement(last);
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusElement(first);
    }
  });

  window.ModalFocus = { open, close };
})();
