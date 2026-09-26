(function () {
  'use strict';

  const SONGS = window.SONGS || [];
  const byId = new Map(SONGS.map((s) => [s.id, s]));
  const STORE_KEY = 'hitster-soundtracks-v2';
  const DEBUG = /[?&]debug/.test(location.search);
  const $ = (id) => document.getElementById(id);

  const el = {
    app: document.querySelector('.app'),
    pos: $('pos'), total: $('total'),
    coverImg: $('coverImg'), mystery: $('mystery'),
    film: $('film'), sub: $('sub'), again: $('againBtn'),
    details: $('details'), year: $('year'), kind: $('kind'), orig: $('orig'),
    artist: $('artist'), composer: $('composer'), composerRow: $('composerRow'), track: $('track'),
    spLink: $('spLink'), ytLink: $('ytLink'),
    waveBase: $('waveBase'), waveFill: $('waveFill'), waveRect: $('waveRect'),
    tCur: $('tCur'), tDur: $('tDur'),
    play: $('playBtn'), iconPlay: $('iconPlay'), iconPause: $('iconPause'), spinner: $('spinner'),
    prev: $('prevBtn'), next: $('nextBtn'), shuffle: $('shuffleBtn'), restart: $('restartBtn'),
    reveal: $('revealBtn'), fallback: $('fallback'),
    autoplay: $('autoplay'), search: $('search'), list: $('songList'), listCount: $('listCount'),
  };

  // ---------- state ----------

  let state = load() || {};
  state = Object.assign({ filter: 'all', autoplay: true, deck: [], i: 0, again: [] }, state);
  let revealed = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
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

  const current = () => byId.get(state.deck[state.i]);

  // ---------- Spotify player (iFrame API, kept off-screen) ----------

  const player = {
    ctrl: null,
    uri: null,
    ready: false,
    wantPlay: false,
    playing: false,
    started: false,
    position: 0,
    duration: 0,
    stallTimer: null,
    listening: false,
  };

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    const s = current();
    const uri = s ? 'spotify:track:' + s.spotify : '';
    IFrameAPI.createController($('embed'), { uri, width: '100%', height: 80 }, (ctrl) => {
      player.ctrl = ctrl;
      const frame = el.fallback.querySelector('iframe');
      if (frame) frame.loading = 'eager';
      player.uri = uri;
      ctrl.addListener('ready', () => {
        if (DEBUG) console.log('playback ready');
        player.ready = true;
        if (player.wantPlay) ctrl.play();
      });
      ctrl.addListener('playback_update', (e) => onPlayback(e.data));
    });
  };

  // The embed also reports "not paused" while it merely loads a track, so the UI follows
  // what the user asked for (wantPlay) and only uses the embed to confirm or to notice an end.
  function onPlayback(d) {
    if (!d) return;
    if (DEBUG) console.log('playback', JSON.stringify(d));
    if (d.playingURI && player.uri && d.playingURI !== player.uri) return; // stale event
    player.position = d.position || 0;
    player.duration = d.duration || 0;
    const ended = player.duration > 0 && player.position >= player.duration - 300;
    if (!d.isPaused && !d.isBuffering && d.position > 0 && !ended) {
      player.started = true;
      player.playing = true;
      player.wantPlay = true; // also when started by tapping the Spotify player itself
      player.listening = true;
      clearTimeout(player.stallTimer);
      parkFallback();
    } else if ((d.isPaused || ended) && player.started) {
      // Paused inside Spotify or the track ended.
      player.playing = false;
      player.wantPlay = false;
      clearTimeout(player.stallTimer);
    }
    render();
  }

  function loadTrack(s) {
    player.position = 0;
    player.duration = 0;
    player.started = false;
    player.playing = false;
    clearTimeout(player.stallTimer);
    if (!player.ctrl || !s) return;
    const uri = 'spotify:track:' + s.spotify;
    if (uri !== player.uri) {
      player.uri = uri;
      player.ready = false;
      player.ctrl.loadUri(uri);
    }
  }

  function play() {
    player.wantPlay = true;
    render();
    if (!player.ctrl) return; // the 'ready' listener starts playback once the embed exists
    if (!player.started) player.ctrl.play();
    else if (player.duration && player.position >= player.duration - 300) { player.ctrl.seek(0); player.ctrl.resume(); }
    else player.ctrl.resume();
    // Some browsers (mostly iOS) block starting playback inside the iframe.
    // If nothing happens, show the Spotify player (title masked) so the user can tap it directly.
    clearTimeout(player.stallTimer);
    player.stallTimer = setTimeout(() => {
      if (player.playing) return;
      player.wantPlay = false;
      showFallback();
      render();
    }, 6000);
  }

  function pause() {
    player.wantPlay = false;
    player.playing = false;
    clearTimeout(player.stallTimer);
    if (player.ctrl && player.started) player.ctrl.pause();
    render();
  }

  function togglePlay() {
    // "listening" survives the end of a track, so autoplay continues on the next card.
    player.listening = !player.wantPlay;
    if (player.wantPlay) pause(); else play();
  }

  function restart() {
    if (!player.ctrl) return;
    if (player.started) player.ctrl.seek(0);
    play();
  }

  function showFallback() { el.fallback.classList.remove('parked'); }
  function parkFallback() { el.fallback.classList.add('parked'); }

  // ---------- rendering ----------

  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function buildWave() {
    let d = 'M0 12';
    for (let x = 0; x <= 300; x += 2) d += ' L' + x + ' ' + (12 + 7 * Math.sin(x / 7)).toFixed(2);
    el.waveBase.setAttribute('d', d);
    el.waveFill.setAttribute('d', d);
  }

  function render() {
    const on = player.wantPlay;
    el.app.classList.toggle('playing', on && player.playing);
    el.iconPlay.hidden = on;
    el.iconPause.hidden = !on;
    el.spinner.hidden = !(on && !player.playing);
    el.play.setAttribute('aria-label', on ? 'Pause' : 'Abspielen');
    const frac = player.duration ? Math.min(1, player.position / player.duration) : 0;
    el.waveRect.setAttribute('width', (300 * frac).toFixed(1));
    el.tCur.textContent = fmt(player.position);
    el.tDur.textContent = fmt(player.duration);
  }

  function show() {
    const s = current();
    revealed = false;
    el.pos.textContent = Math.min(state.i + 1, state.deck.length);
    el.total.textContent = state.deck.length;
    el.prev.disabled = state.i === 0;

    el.coverImg.hidden = true;
    el.coverImg.removeAttribute('src');
    el.mystery.hidden = false;
    el.details.hidden = true;
    el.film.textContent = '? ? ?';
    el.sub.textContent = 'Hör genau hin …';
    el.reveal.textContent = 'Aufdecken';
    el.reveal.classList.remove('next');
    el.again.classList.toggle('on', !!s && state.again.includes(s.id));
    if (!s) return;

    el.kind.textContent = s.kind === 'S' ? 'Serie' : 'Film';
    el.year.textContent = s.year;
    el.orig.textContent = s.orig;
    el.artist.textContent = s.artist;
    el.composer.textContent = s.composer;
    el.composerRow.hidden = !s.composer;
    el.track.textContent = s.title;
    el.spLink.href = 'https://open.spotify.com/track/' + s.spotify;
    el.ytLink.href = s.youtube;
    el.ytLink.hidden = !s.youtube;

    const keepPlaying = state.autoplay && player.listening;
    if (!keepPlaying) pause(); // stop the old track before switching
    loadTrack(s);
    if (keepPlaying) play();
    else render();
  }

  function reveal() {
    const s = current();
    if (!s) return;
    revealed = true;
    el.film.textContent = s.film;
    el.sub.textContent = s.composer || s.artist;
    el.details.hidden = false;
    if (s.cover) {
      el.coverImg.src = s.cover;
      el.coverImg.hidden = false;
      el.mystery.hidden = true;
    }
    el.reveal.textContent = 'Nächste Karte';
    el.reveal.classList.add('next');
  }

  function next() {
    state.i++;
    if (state.i >= state.deck.length) newDeck();
    save();
    show();
  }

  function prev() {
    if (state.i === 0) return;
    state.i--;
    save();
    show();
  }

  // Heart: mark a card as "still hard" – it is put back into the deck a few cards later.
  function toggleAgain() {
    const s = current();
    if (!s) return;
    const at = state.again.indexOf(s.id);
    if (at >= 0) {
      state.again.splice(at, 1);
    } else {
      state.again.push(s.id);
      const later = Math.min(state.deck.length, state.i + 5 + Math.floor(Math.random() * 6));
      state.deck.splice(later, 0, s.id);
    }
    el.again.classList.toggle('on', at < 0);
    el.total.textContent = state.deck.length;
    save();
  }

  // ---------- list ----------

  function renderList() {
    const q = el.search.value.trim().toLowerCase();
    const items = SONGS
      .filter((s) => state.filter === 'all' || s.kind === state.filter)
      .filter((s) => !q || [s.film, s.orig, s.artist, s.title, s.composer, String(s.year)]
        .join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.year - b.year || a.film.localeCompare(b.film, 'de'));
    el.listCount.textContent = '(' + items.length + ')';
    el.list.innerHTML = '';
    for (const s of items) {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = s.cover;
      const text = document.createElement('div');
      const t = document.createElement('div'); t.className = 't'; t.textContent = s.film;
      const sub = document.createElement('div'); sub.className = 's';
      sub.textContent = (s.composer || s.artist) + ' · ' + s.title;
      text.append(t, sub);
      const y = document.createElement('span'); y.className = 'y'; y.textContent = s.year;
      li.append(img, text, y);
      li.addEventListener('click', () => {
        const at = state.deck.indexOf(s.id, state.i);
        if (at >= 0) state.deck.splice(at, 1);
        state.deck.splice(state.i, 0, s.id);
        save();
        show();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      el.list.appendChild(li);
    }
  }

  // ---------- events ----------

  el.play.addEventListener('click', togglePlay);
  el.restart.addEventListener('click', () => { player.listening = true; restart(); });
  el.next.addEventListener('click', next);
  el.prev.addEventListener('click', prev);
  el.again.addEventListener('click', toggleAgain);
  el.reveal.addEventListener('click', () => (revealed ? next() : reveal()));
  el.shuffle.addEventListener('click', () => { newDeck(); show(); });
  el.search.addEventListener('input', renderList);

  el.autoplay.checked = state.autoplay;
  el.autoplay.addEventListener('change', () => { state.autoplay = el.autoplay.checked; save(); });

  document.querySelectorAll('.seg button').forEach((b) => {
    b.classList.toggle('on', b.dataset.filter === state.filter);
    b.addEventListener('click', () => {
      if (state.filter === b.dataset.filter) return;
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
    else if (e.key === 'Enter') { e.preventDefault(); revealed ? next() : reveal(); }
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  });

  // ---------- start ----------

  const valid = new Set(pool());
  state.deck = (state.deck || []).filter((id) => valid.has(id));
  state.again = (state.again || []).filter((id) => byId.has(id));
  if (new Set(state.deck).size !== valid.size) newDeck();
  if (state.i >= state.deck.length) state.i = 0;
  buildWave();
  renderList();
  show();
})();
