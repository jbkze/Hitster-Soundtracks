(function () {
  'use strict';

  const SONGS = window.SONGS || [];
  const STORE_KEY = 'hitster-soundtracks-v1';
  const $ = (id) => document.getElementById(id);

  const audio = $('audio');
  const el = {
    pos: $('pos'), total: $('total'),
    art: $('art'), artPh: $('artPlaceholder'),
    play: $('playBtn'), iconPlay: $('iconPlay'), iconPause: $('iconPause'),
    fill: $('fill'), status: $('status'),
    answer: $('answer'), kind: $('kind'), film: $('film'), orig: $('orig'), year: $('year'), recYear: $('recYear'),
    composer: $('composer'), artist: $('artist'), track: $('track'),
    yt: $('ytLink'), sp: $('spLink'),
    reveal: $('revealBtn'), again: $('againBtn'), next: $('nextBtn'),
    shuffle: $('shuffleBtn'), autoplay: $('autoplay'),
    search: $('search'), list: $('songList'),
  };

  let state = load() || { filter: 'all', autoplay: true, deck: [], i: 0 };
  let revealed = false;
  let userInteracted = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pool() {
    return SONGS.filter((s) => state.filter === 'all' || s.kind === state.filter).map((s) => s.id);
  }

  function newDeck() {
    state.deck = shuffled(pool());
    state.i = 0;
    save();
  }

  function current() {
    const id = state.deck[state.i];
    return SONGS.find((s) => s.id === id);
  }

  function composerOf(s) { return s.composer || s.artist; }

  function show() {
    const s = current();
    revealed = false;
    audio.pause();
    el.fill.style.width = '0';
    el.answer.hidden = true;
    el.art.hidden = true;
    el.artPh.hidden = false;
    el.again.hidden = true;
    el.reveal.hidden = false;
    el.next.textContent = 'Überspringen';
    el.status.textContent = '';
    el.pos.textContent = Math.min(state.i + 1, state.deck.length);
    el.total.textContent = state.deck.length;
    setPlaying(false);

    if (!s) {
      el.status.textContent = 'Keine Karten – neu mischen.';
      return;
    }

    audio.src = s.preview || '';
    audio.dataset.retried = '';
    if (!s.preview) el.status.textContent = 'Keine Hörprobe – nutze die Links nach dem Aufdecken.';

    el.kind.textContent = s.kind === 'S' ? 'Serie' : 'Film';
    el.film.textContent = s.film;
    el.orig.textContent = s.orig || '';
    el.year.textContent = s.year;
    el.recYear.textContent = s.cardYear && s.cardYear !== s.year ? 'Aufnahme: ' + s.cardYear : '';
    el.composer.textContent = composerOf(s);
    el.artist.textContent = s.artist;
    el.track.textContent = s.title;
    const q = encodeURIComponent(s.artist.split(',')[0] + ' ' + s.title);
    el.yt.href = 'https://www.youtube.com/results?search_query=' + q;
    el.sp.href = 'https://open.spotify.com/search/' + q;

    if (state.autoplay && userInteracted && s.preview) play();
  }

  function reveal() {
    const s = current();
    if (!s) return;
    revealed = true;
    el.answer.hidden = false;
    if (s.art) {
      el.art.src = s.art;
      el.art.hidden = false;
      el.artPh.hidden = true;
    }
    el.reveal.hidden = true;
    el.again.hidden = false;
    el.next.textContent = 'Weiter';
  }

  function next() {
    state.i++;
    if (state.i >= state.deck.length) {
      el.status.textContent = 'Stapel durch – neu gemischt!';
      newDeck();
    }
    save();
    show();
  }

  function again() {
    // Put the current card back a few positions later in the deck.
    const id = state.deck[state.i];
    const at = Math.min(state.deck.length, state.i + 6 + Math.floor(Math.random() * 6));
    state.deck.splice(at, 0, id);
    state.deck.splice(state.i, 1);
    state.i--;
    next();
  }

  function play() {
    const p = audio.play();
    if (p && p.catch) p.catch(() => setPlaying(false));
  }

  function togglePlay() {
    userInteracted = true;
    if (!audio.src) return;
    if (audio.paused) play(); else audio.pause();
  }

  function setPlaying(on) {
    el.iconPlay.hidden = on;
    el.iconPause.hidden = !on;
  }

  // Preview URLs can expire; fetch a fresh one via the iTunes lookup API (JSONP).
  function refreshPreview(s) {
    return new Promise((resolve) => {
      if (!s || !s.trackId) return resolve(null);
      const cb = '__itunes' + Date.now();
      const script = document.createElement('script');
      const done = (url) => { delete window[cb]; script.remove(); resolve(url); };
      window[cb] = (data) => done(data && data.results && data.results[0] && data.results[0].previewUrl);
      script.onerror = () => done(null);
      script.src = 'https://itunes.apple.com/lookup?country=DE&id=' + s.trackId + '&callback=' + cb;
      document.head.appendChild(script);
    });
  }

  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) el.fill.style.width = (100 * audio.currentTime / audio.duration) + '%';
  });
  audio.addEventListener('error', async () => {
    const s = current();
    if (!s || !audio.getAttribute('src') || audio.dataset.retried) {
      el.status.textContent = 'Hörprobe nicht verfügbar – nutze die Links nach dem Aufdecken.';
      return;
    }
    audio.dataset.retried = '1';
    const url = await refreshPreview(s);
    if (url && current() === s) {
      audio.src = url;
      if (userInteracted) play();
    } else {
      el.status.textContent = 'Hörprobe nicht verfügbar – nutze die Links nach dem Aufdecken.';
    }
  });

  el.play.addEventListener('click', togglePlay);
  el.reveal.addEventListener('click', () => { userInteracted = true; reveal(); });
  el.next.addEventListener('click', () => { userInteracted = true; next(); });
  el.again.addEventListener('click', () => { userInteracted = true; again(); });
  el.shuffle.addEventListener('click', () => { userInteracted = true; newDeck(); show(); });

  el.autoplay.checked = state.autoplay;
  el.autoplay.addEventListener('change', () => { state.autoplay = el.autoplay.checked; save(); });

  document.querySelectorAll('.seg button').forEach((b) => {
    b.classList.toggle('on', b.dataset.filter === state.filter);
    b.addEventListener('click', () => {
      state.filter = b.dataset.filter;
      document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
      newDeck();
      renderList();
      show();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'Enter') { e.preventDefault(); userInteracted = true; revealed ? next() : reveal(); }
    else if (e.key === 'ArrowRight') { userInteracted = true; next(); }
  });

  // Full list for browsing; tapping an entry jumps to that card.
  function renderList() {
    const q = el.search.value.trim().toLowerCase();
    const items = SONGS
      .filter((s) => state.filter === 'all' || s.kind === state.filter)
      .filter((s) => !q || [s.film, s.orig, s.artist, s.title, s.composer, String(s.year)]
        .join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.year - b.year || a.film.localeCompare(b.film));
    el.list.innerHTML = '';
    for (const s of items) {
      const li = document.createElement('li');
      const y = document.createElement('span'); y.className = 'y'; y.textContent = s.year;
      const t = document.createElement('span'); t.textContent = s.film + (s.kind === 'S' ? ' (Serie)' : '');
      const sub = document.createElement('span'); sub.className = 'sub';
      sub.textContent = composerOf(s) + ' – ' + s.title;
      li.append(y, t, sub);
      li.addEventListener('click', () => {
        userInteracted = true;
        const at = state.deck.indexOf(s.id);
        if (at >= 0) state.deck.splice(at, 1);
        state.deck.splice(state.i, 0, s.id);
        save();
        show();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      el.list.appendChild(li);
    }
  }
  el.search.addEventListener('input', renderList);

  // Drop stale ids (e.g. after the song list changed) and start.
  const valid = new Set(pool());
  state.deck = (state.deck || []).filter((id) => valid.has(id));
  if (!state.deck.length || state.deck.length !== valid.size) newDeck();
  if (state.i >= state.deck.length) state.i = 0;
  renderList();
  show();
})();
