// Copy button for the BibTeX entry.
document.querySelectorAll('[data-copy]').forEach(button => {
  const target = document.querySelector(button.dataset.copy);
  if (!target || !navigator.clipboard) return;
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(target.textContent);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl+C';
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setTimeout(() => { button.textContent = label; }, 1600);
  });
  button.hidden = false;
});
