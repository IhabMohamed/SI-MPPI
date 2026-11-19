// End zoom, as in the supplementary video: once a clip has played to the end (robot at the goal), it
// stays in the full view for ZOOM_DELAY, then zooms in 1.5 s into its own path, using the zoom factor
// and crop of the video (data-zoom, data-zoom-x, data-zoom-y; written by tools/prepare_media.py from
// ZOOM_PLAN in make_video.py). The zoomed view is a sharp still of the run's last frame, since the clip
// MP4 is too compressed to magnify. A button switches between the zoomed and the full view; replaying
// or scrubbing the clip returns to the plain clip. Without JavaScript the clips end in the full view.
(() => {
  const ZOOM_DELAY = 1000;      // ms, as ZOOM_PRE in make_video.py
  const ZOOM_TIME = 1500;       // ms, as ZOOM_T in make_video.py (and the CSS transition)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.clip-media[data-zoom]').forEach(media => {
    const video = media.querySelector('video');
    const factor = Number(media.dataset.zoom);
    media.style.setProperty('--z', factor);
    media.style.setProperty('--zx', media.dataset.zoomX);
    media.style.setProperty('--zy', media.dataset.zoomY);

    const still = document.createElement('img');
    still.className = 'zoom-still';
    still.alt = '';
    still.decoding = 'async';
    still.title = 'Click for the full view';
    const badge = document.createElement('span');
    badge.className = 'zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = `${factor}× zoom`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'zoom-toggle';
    toggle.hidden = true;
    media.append(still, badge, toggle);

    let timer = 0;
    let settle = 0;
    const load = () => { if (!still.getAttribute('src')) still.src = media.dataset.zoomStill; };
    const clearTimers = () => { clearTimeout(timer); clearTimeout(settle); };
    const setToggle = zoomed => {
      toggle.hidden = false;
      toggle.textContent = zoomed ? 'Full view' : 'Zoom to path';
      toggle.setAttribute('aria-label', zoomed ? 'Show the full map' : `Zoom ${factor} times into the path`);
    };

    function zoomIn() {
      clearTimers();
      load();
      const start = () => {
        media.classList.add('has-still');
        video.controls = false;              // the still covers the video; the button takes over
        void still.offsetWidth;              // lay out the full view first so the zoom animates
        media.classList.add('is-zoomed');
        setToggle(true);
      };
      if (still.complete && still.naturalWidth) start();
      else still.addEventListener('load', start, { once: true });
    }

    function zoomOut() {
      clearTimers();
      media.classList.remove('is-zoomed');
      setToggle(false);
      const done = () => { media.classList.remove('has-still'); video.controls = true; };
      if (reduceMotion.matches) done();
      else settle = setTimeout(done, ZOOM_TIME + 100);   // once the zoom-out has finished
    }

    function reset() {                        // replay or scrub: back to the plain clip at once
      clearTimers();
      media.classList.remove('is-zoomed', 'has-still');
      video.controls = true;
      toggle.hidden = true;
    }

    video.addEventListener('play', () => { reset(); load(); });   // fetch the still while the clip plays
    video.addEventListener('seeking', reset);
    video.addEventListener('ended', () => {
      timer = setTimeout(zoomIn, reduceMotion.matches ? 0 : ZOOM_DELAY);
    });
    toggle.addEventListener('click', () => (media.classList.contains('is-zoomed') ? zoomOut() : zoomIn()));
    still.addEventListener('click', zoomOut);
  });
})();
