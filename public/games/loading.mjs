export function watchLoading() {
  const panel = document.getElementById('astra-loading');
  const status = document.getElementById('astra-loading-status');
  const progress = panel.querySelector('progress');
  const retry = document.getElementById('astra-loading-retry');
  retry.onclick = () => location.reload();
  let finished = false;
  const update = message => { if (!finished) status.textContent = message; };
  const ready = () => {
    if (finished) return;
    update('Ready to play');
    finished = true;
    // Wait until the real scene has had an opportunity to render.
    requestAnimationFrame(() => requestAnimationFrame(() => panel.remove()));
  };
  const fail = () => {
    if (finished) return;
    panel.dataset.state = 'error';
    status.textContent = 'Your game could not load. Please try again.';
    progress.hidden = true;
    retry.hidden = false;
  };
  globalThis.AstraGameReady = ready;
  globalThis.AstraGameLoading = update;
  globalThis.AstraGameError = fail;
  return { update, ready, fail };
}
