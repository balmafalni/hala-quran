// ===== Quran full-page system (604 pages) =====

const gfName = "حلا";

// EveryAyah Page recitation (Yasser Ad-Dussary)
const PAGE_AUDIO_BASE =
  "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/PageMp3/";

const TOTAL_PAGES = 604;

const el = (s) => document.querySelector(s);

const state = {
  panel: "home",
  page: 1,
  audioReady: false,
  isPlaying: false,
};

// ===== Utilities =====
function pad3(n) {
  return String(n).padStart(3, "0");
}

function pageAudioUrl(page) {
  return `${PAGE_AUDIO_BASE}page${pad3(page)}.mp3`;
}

// ===== Load page =====
function loadPage() {
  el("#nowTitle").textContent = `الصفحة ${state.page}`;
  el("#ayahText").textContent = `﴿ صفحة ${state.page} من القرآن الكريم ﴾`;

  const audio = el("#audio");
  audio.src = pageAudioUrl(state.page);

  el("#pageNumFront").textContent = state.page;
  el("#pageNumBack").textContent = state.page + 1;

  state.audioReady = true;
}

// ===== Playback =====
function playPause() {
  const audio = el("#audio");
  const btn = el("#playBtn");

  if (!state.audioReady) return;

  if (audio.paused) {
    audio.play().then(() => {
      btn.textContent = "⏸";
      state.isPlaying = true;
    });
  } else {
    audio.pause();
    btn.textContent = "▶";
    state.isPlaying = false;
  }
}

// ===== Page Navigation =====
function nextPage() {
  if (state.page < TOTAL_PAGES) {
    state.page++;
    flipForward();
    loadPage();
  }
}

function prevPage() {
  if (state.page > 1) {
    state.page--;
    flipBackward();
    loadPage();
  }
}

// ===== Page flip animation =====
function flipForward() {
  const sheet = el("#sheet");
  sheet.classList.add("flipped");
  setTimeout(() => sheet.classList.remove("flipped"), 520);
}

function flipBackward() {
  const sheet = el("#sheet");
  sheet.classList.add("flipped");
  setTimeout(() => sheet.classList.remove("flipped"), 520);
}

// ===== Panels =====
function setPanel(name) {
  state.panel = name;
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.toggle("active", p.dataset.panel === name));
}

// ===== UI Bind =====
function bindUI() {
  el("#gfName").textContent = gfName;

  el("#openBookBtn").addEventListener("click", () => {
    setPanel("surah");
    loadPage();
  });

  el("#playBtn").addEventListener("click", playPause);
  el("#nextAyahBtn").addEventListener("click", nextPage);
  el("#prevAyahBtn").addEventListener("click", prevPage);

  el("#nextBtn").addEventListener("click", nextPage);
  el("#prevBtn").addEventListener("click", prevPage);

  // keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") nextPage();
    if (e.key === "ArrowRight") prevPage();
  });

  // swipe
  let sx = 0;
  const area = el("#frontPage");

  area.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX;
  });

  area.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (dx > 50) prevPage();
    if (dx < -50) nextPage();
  });
}

// ===== Init =====
function init() {
  setPanel("home");
  bindUI();
}

init();