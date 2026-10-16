// Participant clicker PWA: PIN -> name -> team -> live 1–5 button surface.
import { h, registerSW, vibrate } from '../shared/ui.js';
import { icon } from '../shared/icons.js';
import { T, PHASE, OPTION_COLORS, uid, cleanName, isLocalMode } from '../shared/protocol.js';
import { ClientLink } from '../shared/transport.js';

registerSW('./sw.js');

/* ---------------- persisted state (survives refresh) ---------------- */
// Real phones use localStorage. In local rehearsal mode several "phones" are tabs of one
// browser, so each tab keeps its own identity in sessionStorage (still survives a refresh).
const KEY = 'clicker-participant';
const STORAGE = (() => { try { return isLocalMode() ? sessionStorage : localStorage; } catch (e) { return null; } })();
const store = (() => {
  let s = {};
  try { s = JSON.parse(STORAGE?.getItem(KEY) || '{}'); } catch (e) { s = {}; }
  if (!s.pid) s.pid = 'p-' + uid(12);
  return s;
})();
const save = () => { try { STORAGE?.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } };
save();

const params = new URLSearchParams(location.search);
const urlPin = (params.get('pin') || '').replace(/\D/g, '').slice(0, 6);
if (urlPin && urlPin !== store.pin) { store.pin = urlPin; store.joined = false; save(); }
// keep the URL clean so a later "Add to Home Screen" doesn't bake in an old PIN
if (urlPin) history.replaceState(null, '', location.pathname + (isLocalMode() ? '?local=1' : ''));

const isStandalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;

/* ---------------- app state ---------------- */
let link = null;
let info = null;            // {projectName, teams, joined, me}
let state = null;           // last STATE
let rxAt = 0;
let pending = null;         // optimistic choice {slideId, choice}
let view = '';
let draftName = store.name || '';

const app = document.getElementById('app');
const dot = h('span.dot.connecting');
const meEl = h('div.p-me');
const head = h('header.p-head', dot, meEl, h('button.p-menu', { onclick: menu }, 'Leave'));
const banner = h('div');
const body = h('main.p-body');
app.append(head, banner, body);

/* ---------------- fullscreen / install helpers ---------------- */
function goFullscreen() {
  if (isStandalone || document.fullscreenElement) return;
  const el = document.documentElement;
  (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' })?.catch?.(() => {});
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; showInstallTip(); });
function showInstallTip() {
  if (isStandalone || store.tipDismissed) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!installEvt && !ios) return;
  banner.replaceChildren(h('div.banner',
    icon('phone'),
    ios ? h('span', 'For fullscreen: Share → “Add to Home Screen”') : h('span', 'Install as an app for fullscreen'),
    installEvt ? h('button.btn.sm.primary', { onclick: async () => { installEvt.prompt(); installEvt = null; banner.replaceChildren(); } }, 'Install') : null,
    h('button.x', { onclick: () => { store.tipDismissed = true; save(); banner.replaceChildren(); }, 'aria-label': 'Close' }, '✕'),
  ));
}
setTimeout(showInstallTip, 1500);

/* ---------------- connection ---------------- */
function connect(pin) {
  link?.close();
  link = null;
  info = null;
  state = null;
  link = new ClientLink({
    pin,
    backend: isLocalMode() ? 'local' : 'peer',
    meta: { role: 'participant', pid: store.pid },
    onStatus: (s) => { dot.className = 'dot ' + s; if (link) render(); },
    onMessage: onMsg,
  });
  render();
}

function onMsg(m) {
  switch (m.t) {
    case T.INFO:
      info = m;
      if (m.joined && m.me) { store.joined = true; store.name = m.me.name; store.team = m.me.team; save(); }
      else if (store.joined && store.name) join(store.name, store.team);       // host lost us (new session) — rejoin silently
      break;
    case T.STATE:
      state = m;
      rxAt = Date.now();
      if (pending && (!m.slide || m.slide.id !== pending.slideId || m.myChoice != null)) pending = null;
      break;
    case T.ACK:
      if (!m.ok && m.reason !== 'already') pending = null;
      if (state && state.slide?.id === m.slideId) state.myChoice = m.choice;
      if (m.ok) vibrate([10, 40, 20]);
      break;
    case T.KICK:
      leave();
      return;
    default: return;
  }
  render();
}

function join(name, team) {
  store.name = name;
  store.team = team ?? null;
  store.joined = true;
  save();
  link.send({ t: T.JOIN, pid: store.pid, name, team: team ?? null });
}

function answer(i) {
  if (!state?.slide || state.phase !== PHASE.OPEN || state.myChoice != null || pending) return;
  vibrate(25);
  pending = { slideId: state.slide.id, choice: i };
  link.send({ t: T.ANSWER, pid: store.pid, slideId: state.slide.id, choice: i });
  render();
}

function leave() {
  link?.close();
  link = null;
  Object.assign(store, { pin: null, joined: false });
  save();
  info = null;
  state = null;
  render();
}

function menu() {
  if (!store.pin) return;
  if (confirm('Leave the game? You can rejoin with the same code.')) leave();
}

/* ---------------- views ---------------- */
function render() {
  const team = info?.teams?.find((t) => t.id === store.team);
  meEl.replaceChildren(
    store.joined && store.name ? h('span', { dir: 'auto' }, store.name) : h('span', { dir: 'auto' }, info?.projectName || 'Clicker Show'),
    store.joined && team ? h('span.team-chip', { dir: 'auto', style: { '--c': team.color } }, team.name) : null,
  );
  head.querySelector('.p-menu').hidden = !store.pin;

  if (!store.pin) return show('pin', viewPin);
  if (!link) { connect(store.pin); return undefined; }
  if (link.status === 'nohost' && !info) return show('nohost', viewNoHost);
  if (!info) return show('connecting', viewConnecting);
  if (!store.joined) {
    if (!store.nameDone) return show('name', viewName);
    if (info.teams.length) return show('team', viewTeam);
  }
  return showPlay();
}

function show(name, fn) {
  if (view === name) return;
  view = name;
  body.replaceChildren(fn());
}

function viewPin() {
  const input = h('input.big-input.pin', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: 6, placeholder: '••••', autocomplete: 'off', 'aria-label': 'Game code' });
  const err = h('div.err');
  const go = () => {
    const pin = input.value.replace(/\D/g, '');
    if (pin.length < 4) { err.textContent = 'The code has 4 digits'; return; }
    goFullscreen();
    store.pin = pin; store.joined = false; save();
    view = '';
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  setTimeout(() => input.focus(), 50);
  return h('form.step', { onsubmit: (e) => { e.preventDefault(); go(); } },
    h('div.logo', '✦'),
    h('h1', 'Join the game'),
    h('p', 'Type the code shown on the screen'),
    input, err,
    h('button.btn.primary.go', { type: 'submit' }, 'Continue'),
  );
}

function viewConnecting() {
  return h('div.wait', h('div.pulse'), h('h2', 'Connecting…'), h('p', `Game code ${store.pin}`));
}

function viewNoHost() {
  return h('div.wait',
    h('div.big', '🔍'),
    h('h2', 'Game not found'),
    h('p', `No game is running with code ${store.pin} right now. Still trying…`),
    h('button.btn', { onclick: () => { leave(); } }, 'Enter a different code'),
  );
}

function viewName() {
  const input = h('input.big-input', { value: draftName, maxlength: 24, placeholder: 'Your name', dir: 'auto', autocomplete: 'nickname', enterkeyhint: 'next', 'aria-label': 'Name' });
  const err = h('div.err');
  const go = () => {
    const name = cleanName(input.value);
    if (!name) { err.textContent = 'Enter a name so you show up on the screen'; return; }
    goFullscreen();
    draftName = name;
    if (info.teams.length) { store.nameDone = true; store.name = name; save(); view = ''; render(); }
    else { join(name, null); view = ''; render(); }
  };
  setTimeout(() => input.focus(), 50);
  return h('form.step', { onsubmit: (e) => { e.preventDefault(); go(); } },
    h('div.logo', '✦'),
    h('h1', { dir: 'auto' }, info.projectName),
    h('p', 'What’s your name? It flies across the screen when you answer'),
    input, err,
    h('button.btn.primary.go', { type: 'submit' }, 'Continue'),
  );
}

function viewTeam() {
  return h('div.step',
    h('h1', 'Which team are you on?'),
    h('p', 'Hi ', h('span', { dir: 'auto' }, store.name), '!'),
    h('div.teams', info.teams.map((t) => h('button.team-btn', { dir: 'auto', style: { '--c': t.color }, onclick: () => { vibrate(20); join(store.name, t.id); store.nameDone = false; save(); view = ''; render(); } }, t.name))),
    h('button.btn.ghost', { onclick: () => { store.nameDone = false; save(); view = ''; render(); } }, 'Change name'),
  );
}

/** "Correct answer: 2. <answer>" with the host's answer text kept right-to-left. */
function answerLine(label, i, text) {
  return h('span', label + ' ', h('span', { dir: 'rtl' }, h('span.num', `${i + 1}.`), ' ', text || ''));
}

function wait(big, title, sub) {
  return h('div.wait', typeof big === 'string' ? h('div.big', big) : big, h('h2', title), sub ? h('p', sub) : null);
}

function showPlay() {
  const s = state;
  if (!s) return show('wait-state', () => wait(h('div.pulse'), 'You’re in!', 'Waiting for the host…'));
  const sl = s.slide;
  const key = `${s.phase}:${sl?.id || ''}:${s.myChoice}:${pending?.choice}:${s.correct}`;
  if (view === 'play:' + key) return undefined;
  view = 'play:' + key;

  if (s.phase === PHASE.LOBBY || !sl) {
    body.replaceChildren(wait(h('div.pulse'), 'You’re in!', 'Your name is on the screen. Waiting for the first question…'));
    return undefined;
  }
  if (s.phase === PHASE.END) {
    body.replaceChildren(wait('🎉', 'Thanks for playing!', 'The results are on the screen'));
    return undefined;
  }
  if (s.phase === PHASE.TYPING || s.phase === PHASE.READY) {
    body.replaceChildren(wait('👀', `Question ${sl.n}`, 'Look at the screen — the buttons open in a moment'));
    return undefined;
  }
  const chosen = s.myChoice ?? pending?.choice ?? null;
  if (s.phase === PHASE.REVEAL) {
    if (sl.type === 'quiz' && s.correct != null) {
      const ok = s.myChoice === s.correct;
      body.replaceChildren(wait(
        h('div.result-badge', { class: s.myChoice == null ? 'bad' : ok ? 'ok' : 'bad' }, icon(ok ? 'check' : 'x')),
        s.myChoice == null ? 'You didn’t answer in time' : ok ? 'Correct!' : 'Not this time',
        answerLine('Correct answer:', s.correct, sl.options[s.correct]),
      ));
      if (ok) vibrate([30, 60, 30, 60, 80]);
    } else {
      body.replaceChildren(wait('📊', 'The results are on the screen', chosen != null ? answerLine('You chose:', chosen, sl.options[chosen]) : ''));
    }
    return undefined;
  }

  // OPEN / PAUSED / CLOSED -> the clicker surface
  const open = s.phase === PHASE.OPEN && chosen == null;
  const timebar = h('div.timebar', h('i'));
  const pads = h('div.pads', { class: chosen != null || s.phase !== PHASE.OPEN ? 'locked' : '' },
    sl.options.map((o, i) => h('button.pad', {
      dir: 'rtl',   // number on the right, answer text right-to-left
      style: { '--c': OPTION_COLORS[i % OPTION_COLORS.length] },
      class: chosen === i ? 'picked' : '',
      disabled: !open,
      onpointerdown: (e) => { if (open) { e.preventDefault(); answer(i); } },
      onclick: () => answer(i),
    }, h('span.num', `${i + 1}`), h('span.lbl', o))));
  const foot = h('div.p-foot',
    s.phase === PHASE.PAUSED ? 'Timer paused…'
      : s.phase === PHASE.CLOSED ? (chosen != null ? `Voting closed · you chose ${chosen + 1}` : 'Voting closed')
        : chosen != null ? (s.myChoice != null ? 'Answer received! ✓' : 'Sending…') : sl.type === 'quiz' ? 'Quick! The fastest make the leaderboard' : 'Pick your answer');
  foot.classList.toggle('ok', s.myChoice != null && s.phase === PHASE.OPEN);
  body.replaceChildren(
    h('div.q-meta', h('span.pill', `Question ${sl.n}/${sl.total}`), h('span.pill', sl.type === 'quiz' ? 'Quiz' : 'Survey')),
    h('div.q-text', { dir: 'rtl' }, sl.question),
    s.remaining != null && s.timerTotal ? timebar : null,
    pads,
    foot,
  );
  updateTimer();
  return undefined;
}

function updateTimer() {
  const bar = body.querySelector('.timebar i');
  if (!bar || !state || state.remaining == null || !state.timerTotal) return;
  const left = state.phase === PHASE.OPEN ? Math.max(0, state.remaining - (Date.now() - rxAt)) : state.remaining;
  bar.style.width = `${(left / state.timerTotal) * 100}%`;
}
setInterval(updateTimer, 250);

// keep screen awake during the show
let wake = null;
async function grabWake() { try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* */ } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') grabWake(); });
document.addEventListener('pointerdown', grabWake, { once: true });

render();
