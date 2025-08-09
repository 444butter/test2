(() => {
  // ---------- settings ----------
  const settings = {
    openOnStart: true,   // open when streaming begins
    closeOnEnd: true,    // close after streaming ends
    quietAfterMs: 900,   // how long with no changes = "done"
    debug: false
  };

  // ---------- tiny logger ----------
  const log = (...a) => settings.debug && console.log("[ACR]", ...a);

  // Expose a tiny debug/probe API so you can test in console.
  const api = {
    settings,
    probe() {
      const chat = document.querySelector("#chat") || document.body;
      const open = chat.querySelectorAll('details.reasoning[open],details[data-kind="reasoning"][open]').length;
      const all = chat.querySelectorAll('details.reasoning,details[data-kind="reasoning"]').length;
      return { open, all, observing: !!rootObs };
    }
  };
  window.__acr = api;

  // ---------- utilities ----------
  const REASONING_SEL = 'details.reasoning, details[data-kind="reasoning"]';
  const MESSAGE_SEL   = '.mes';                 // SillyTavern message container
  const TEXT_SEL      = '.mes_text, .mesText';  // defensive: different skins use either

  function findReasoningIn(msg) {
    return msg.querySelector(REASONING_SEL);
  }
  function openReasoning(msg) {
    const d = findReasoningIn(msg);
    if (d) { d.open = true; log("opened", d); }
  }
  function closeReasoning(msg) {
    const d = findReasoningIn(msg);
    // Respect manual open: if user clicked it open, don't auto-close.
    if (d && !d.dataset.acrManual) {
      d.open = false;
      log("closed", d);
    }
  }

  // Mark manual toggles so we don't fight the user.
  document.addEventListener("toggle", (ev) => {
    const d = ev.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    if (!d.matches(REASONING_SEL)) return;
    // If the user clicked, keep that preference
    d.dataset.acrManual = d.open ? "1" : "";
  }, true);

  // ---------- per-message watcher ----------
  function watchMessage(msg) {
    if (msg.__acrWatched) return;
    msg.__acrWatched = true;

    let opened = false;
    let idleTimer = null;

    const target = msg.querySelector(TEXT_SEL) || msg;

    const bumpIdle = () => {
      // First mutation = generation started
      if (!opened && settings.openOnStart) {
        openReasoning(msg);
        opened = true;
      }
      // Refresh quiet timer; when quiet we assume generation ended
      if (settings.closeOnEnd) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          closeReasoning(msg);
          obs.disconnect();
          msg.__acrWatched = false; // allow future edits to reattach if needed
        }, settings.quietAfterMs);
      }
    };

    // Observe content changes while streaming
    const obs = new MutationObserver(() => bumpIdle());
    obs.observe(target, { childList: true, subtree: true, characterData: true });

    // In case the reasoning details arrive a bit later (post-processing), also
    // observe new descendants briefly.
    const arriveObs = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && (n.matches?.(REASONING_SEL) || n.querySelector?.(REASONING_SEL))) {
            bumpIdle();
          }
        }
      }
    });
    arriveObs.observe(msg, { childList: true, subtree: true });

    // Safety: stop arrival observer after a while
    setTimeout(() => arriveObs.disconnect(), 5000);

    log("watching message", msg);
  }

  // ---------- root observer: hook new assistant messages ----------
  const chatRoot = document.querySelector("#chat") || document.body;

  const rootObs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // New message container added
        if (node.matches(MESSAGE_SEL)) {
          watchMessage(node);
          continue;
        }
        // Or message nested deeper
        const msg = node.querySelector?.(MESSAGE_SEL);
        if (msg) watchMessage(msg);
      }
    }
  });

  rootObs.observe(chatRoot, { childList: true, subtree: true });

  // Also attach to the last couple existing messages (in case streaming already started)
  document.querySelectorAll(MESSAGE_SEL).forEach(watchMessage);

  log("Auto Collapse Reasoning ready");
})();
