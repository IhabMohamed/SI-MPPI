// Video groups: every section marked [data-clip-group] (benchmark maps, additional runs, k_b = 1)
// works on its own. Without JavaScript every panel stays visible.
// - A group with map tabs ([data-env-tabs]) shows one map at a time and pauses the clips of the
//   other maps; posters of maps not yet opened wait in data-poster, so hidden maps cost nothing.
// - The player bar ([data-env-toolbar]) plays the visible clips together from the start, pauses
//   them and sets their speed. The pause button toggles: after "Pause all" it reads "Resume all"
//   ("Pause both" / "Resume both") and continues the clips it paused from where they stopped.
// - The URL hash opens a map directly: #rand ... #mgate (benchmark), #kb1-rand ... #kb1-mgate (k_b = 1).
// - A clip that has played to the end gets a frame (.is-done): green when the robot reached the goal,
//   red for runs marked .is-failed. It clears when the clip is replayed or scrubbed back.
(() => {
  document.querySelectorAll('.clip video').forEach(video => {
    const clip = video.closest('.clip');
    video.addEventListener('ended', () => clip.classList.add('is-done'));
    video.addEventListener('seeking', () => clip.classList.remove('is-done'));
    video.addEventListener('seeked', () => clip.classList.toggle('is-done', video.ended));
  });

  function setUp(section) {
    const tabList = section.querySelector('[data-env-tabs]');
    const toolbar = section.querySelector('[data-env-toolbar]');
    const tabs = tabList ? Array.from(tabList.querySelectorAll('[role="tab"]')) : [];
    // Without tabs the whole section is a single panel.
    const panels = tabList ? tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls'))) : [section];
    let current = 0;
    let rate = 1;
    let resetPause = () => {};   // set by the player bar: shows "Pause" again

    const videosIn = panel => Array.from(panel.querySelectorAll('video'));

    function applyRate(video) {
      // defaultPlaybackRate survives the media load that resets playbackRate.
      video.defaultPlaybackRate = rate;
      video.playbackRate = rate;
    }

    function select(index, { focus = false, writeHash = false } = {}) {
      panels.forEach((panel, i) => {
        const selected = i === index;
        if (tabList) {
          tabs[i].setAttribute('aria-selected', String(selected));
          tabs[i].tabIndex = selected ? 0 : -1;
          panel.hidden = !selected;
        }
        if (!selected) videosIn(panel).forEach(video => video.pause());
      });
      videosIn(panels[index]).forEach(video => {
        if (video.dataset.poster) {
          video.poster = video.dataset.poster;
          video.removeAttribute('data-poster');
        }
        applyRate(video);
      });
      current = index;
      resetPause();
      if (focus) tabs[index].focus();
      if (writeHash) history.replaceState(null, '', `#${panels[index].dataset.env}`);
    }

    tabs.forEach((tab, index) => {
      tab.id = `${tab.getAttribute('aria-controls')}-tab`;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].tabIndex = -1;
      tab.addEventListener('click', () => select(index, { writeHash: true }));
      tab.addEventListener('keydown', event => {
        const destination = {
          ArrowRight: (index + 1) % tabs.length,
          ArrowLeft: (index - 1 + tabs.length) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        }[event.key];
        if (destination === undefined) return;
        event.preventDefault();
        select(destination, { focus: true, writeHash: true });
      });
    });

    if (toolbar) {
      const pauseButton = toolbar.querySelector('[data-action="pause"]');
      const pauseIcon = pauseButton.querySelector('path');
      const pauseText = Array.from(pauseButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      const PAUSE = { d: pauseIcon.getAttribute('d'), text: pauseText.textContent.trim() };       // "Pause all" / "Pause both"
      const RESUME = { d: 'M4 2.5v11l9-5.5z', text: PAUSE.text.replace(/^Pause/, 'Resume') };    // "Resume all" / "Resume both"
      let held = [];   // clips paused by the button, continued by its next click
      const show = state => { pauseIcon.setAttribute('d', state.d); pauseText.textContent = ` ${state.text} `; };
      resetPause = () => { held = []; show(PAUSE); };

      pauseButton.addEventListener('click', () => {
        if (held.length) {                       // "Resume": continue the clips that were paused here
          const clips = held;
          resetPause();
          clips.filter(video => !video.ended).forEach(video => {
            applyRate(video);
            const started = video.play();
            if (started) started.catch(() => {});
          });
          return;
        }
        const playing = videosIn(panels[current]).filter(video => !video.paused && !video.ended);
        if (!playing.length) return;             // nothing is playing: nothing to pause or resume
        playing.forEach(video => video.pause());
        held = playing;
        show(RESUME);
      });
      // A clip started by hand (or by "Play all") makes the button a pause button again.
      section.querySelectorAll('video').forEach(video => video.addEventListener('play', () => { if (held.length) resetPause(); }));

      toolbar.querySelector('[data-action="play"]').addEventListener('click', () => {
        resetPause();
        videosIn(panels[current]).forEach(video => {
          applyRate(video);
          video.currentTime = 0;
          const started = video.play();
          if (started) started.catch(() => {});
        });
      });
      const rateButtons = Array.from(toolbar.querySelectorAll('[data-rate]'));
      rateButtons.forEach(button => {
        button.addEventListener('click', () => {
          rate = Number(button.dataset.rate);
          rateButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          panels.forEach(panel => videosIn(panel).forEach(applyRate));
        });
      });
      toolbar.hidden = false;
    }

    function openFromHash(behavior) {
      if (!tabList) return false;
      const key = decodeURIComponent(location.hash.slice(1)).toLowerCase();
      const index = panels.findIndex(panel => panel.dataset.env === key);
      if (index < 0) return false;
      select(index);
      section.scrollIntoView({ behavior, block: 'start' });
      return true;
    }

    // On page load, jump straight to the requested map; a smooth scroll would race the page layout.
    const opened = openFromHash('instant');
    if (!opened) select(0);
    if (tabList) tabList.hidden = false;
    const hint = section.querySelector('[data-env-hint]');   // "Pick a map ...": only useful with the tabs
    if (tabList && hint) hint.hidden = false;
    return { section, openFromHash, opened };
  }

  const groups = Array.from(document.querySelectorAll('[data-clip-group]')).map(setUp);
  window.addEventListener('hashchange', () => groups.forEach(group => group.openFromHash('smooth')));
  const target = groups.find(group => group.opened);
  if (target) {
    // Fonts and images that finish loading later shift the layout; re-align once everything is in.
    window.addEventListener('load', () => target.section.scrollIntoView({ behavior: 'instant', block: 'start' }), { once: true });
  }
})();
