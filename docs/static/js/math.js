// Render inline TeX written as \( ... \) with the bundled KaTeX, so symbols use the same
// Computer Modern math fonts as the paper. Text inside <pre>, <code> and <script> is left alone.
if (window.renderMathInElement) {
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}
