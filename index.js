// Auto-collapse reasoning after assistant finishes streaming
export function init() {
  const SEL = 'details.reasoning, details[data-kind="reasoning"]';

  function openIfPresent(root) {
    root.querySelectorAll(SEL).forEach(d => d.open = true);
  }

  function collapseWhenStreamEnds(msgEl) {
    const watcher = new MutationObserver(() => {
      const streaming = msgEl.querySelector('.typingIndicator,.streaming,.spinner,.stream-spinner');
      if (!streaming) {
        watcher.disconnect();
        msgEl.querySelectorAll(SEL).forEach(d => d.open = false);
      }
    });
    watcher.observe(msgEl, { childList: true, subtree: true, attributes: true });
  }

  function handleNewMessage(node) {
    if (!node.classList || (!node.classList.contains('mes') && !node.matches('.assistant'))) return;
    openIfPresent(node);          // keep open while generating
    collapseWhenStreamEnds(node); // fold when done
  }

  const mo = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) handleNewMessage(n);
    }));
  });
  mo.observe(document.body, { childList: true, subtree: true });

  console.log("[Auto Collapse Reasoning] ready");
}
