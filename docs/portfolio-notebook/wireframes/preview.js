// Template variants retain the selected entry's name while sharing one layout.
const entry = new URLSearchParams(location.search).get('entry');
const variants = {
  'field-note': ['A note from something you built', 'Field note'],
  'reflection': ['An idea worth exploring', 'Reflection']
};
if (variants[entry] && document.querySelector('#article-title')) {
  document.querySelector('#article-title').textContent = variants[entry][0];
  document.querySelector('#article-category').textContent = variants[entry][1];
}
if (location.hash === '#next-project' && document.querySelector('#project-title')) {
  document.querySelector('#project-title').textContent = 'Your next project.';
}
document.fonts.ready.then(() => {
  lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  // Narrow marker strokes keep the letterforms clear, unlike the old solid blocks.
  const marks = [
    ...Array.from(document.querySelectorAll('[data-highlight]'), element =>
      RoughNotation.annotate(element, { type: 'underline', color: '#f1df85', animate: false, strokeWidth: 9, padding: -3, iterations: 1 })),
    ...Array.from(document.querySelectorAll('[data-underline]'), element =>
      RoughNotation.annotate(element, { type: 'underline', color: '#292a24', animate: false, strokeWidth: 1, padding: 3, iterations: 1 }))
  ];
  marks.forEach(mark => mark.show());
  window.previewReady = true;
});
