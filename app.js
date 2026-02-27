// Quran "page-to-page" mini app with Yasser Ad-Dussary audio from EveryAyah:
// Base: https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/
// Files: SSSAAA.mp3 (SSS=surah 3 digits, AAA=ayah 3 digits). :contentReference[oaicite:2]{index=2}

const gfName = "حلا";

// Minimal surah dataset (starter). You can add more easily.
const SURAHS = [
  { no: 1, name: "الفاتحة", ayahs: 7 },
  { no: 2, name: "البقرة", ayahs: 286 },
  { no: 18, name: "الكهف", ayahs: 110 },
  { no: 36, name: "يس", ayahs: 83 },
  { no: 55, name: "الرحمن", ayahs: 78 },
  { no: 67, name: "الملك", ayahs: 30 },
  { no: 112, name: "الإخلاص", ayahs: 4 },
  { no: 113, name: "الفلق", ayahs: 5 },
  { no: 114, name: "الناس", ayahs: 6 },
];

// EveryAyah Yasser Ad-Dussary
const AUDIO_BASE = "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/"; // :contentReference[oaicite:3]{index=3}

const el = (s) => document.querySelector(s);

const state = {
  panel: "home",
  surah: 1,
  ayah: 1,
  audioReady: false,
  isPlaying: false,
  flip: false,
  pageIndex: 1, // visual page number
};

const panels = () => [...document.querySelectorAll(".panel")];

function setPanel(name) {
  state.panel = name;
  panels().forEach((p) => p.classList.toggle("active", p.dataset.panel === name));
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function audioFileName(surahNo, ayahNo) {
  return `${pad3(surahNo)}${pad3(ayahNo)}.mp3`;
}

function audioUrl(surahNo, ayahNo) {
  return `${AUDIO_BASE}${audioFileName(surahNo, ayahNo)}`;
}

function surahByNo(no) {
  return SURAHS.find((s) => s.no === no) || SURAHS[0];
}

function renderSurahSelect() {
  const sel = el("#surahSelect");
  sel.innerHTML = SURAHS.map((s) => `<option value="${s.no}">${s.no}. ${s.name}</option>`).join("");
  sel.value = String(state.surah);
}

function renderAyahSelect() {
  const s = surahByNo(state.surah);
  const sel = el("#ayahSelect");
  const opts = [];
  for (let i = 1; i <= s.ayahs; i++) opts.push(`<option value="${i}">${i}</option>`);
  sel.innerHTML = opts.join("");
  sel.value = String(state.ayah);
}

function setNowTitle() {
  const s = surahByNo(state.surah);
  el("#nowTitle").textContent = `${s.name} — آية ${state.ayah}`;
}

async function fetchAyahText(surahNo, ayahNo) {
  // Reliable public endpoint for Arabic text (no auth).
  // If it ever fails, we still keep the audio working.
  const url = `https://api.alquran.cloud/v1/ayah/${surahNo}:${ayahNo}/ar`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Text fetch failed");
  const j = await r.json();
  return j?.data?.text || "—";
}

async function loadAyah() {
  setNowTitle();

  // Text
  el("#ayahText").textContent = "…";
  try {
    const txt = await fetchAyahText(state.surah, state.ayah);
    el("#ayahText").textContent = txt;
  } catch {
    el("#ayahText").textContent = "تعذر تحميل نص الآية (لكن التلاوة تعمل).";
  }

  // Audio
  const audio = el("#audio");
  audio.src = audioUrl(state.surah, state.ayah); // :contentReference[oaicite:4]{index=4}
  state.audioReady = true;
}

function playPause() {
  const audio = el("#audio");
  const btn = el("#playBtn");

  if (!state.audioReady) return;

  if (audio.paused) {
    audio.play().then(() => {
      state.isPlaying = true;
      btn.textContent = "⏸";
    }).catch(() => {
      state.isPlaying = false;
      btn.textContent = "▶";
      alert("المتصفح منع التشغيل التلقائي. اضغطي تشغيل مرة أخرى.");
    });
  } else {
    audio.pause();
    state.isPlaying = false;
    btn.textContent = "▶";
  }
}

function stopPlaybackUI() {
  state.isPlaying = false;
  el("#playBtn").textContent = "▶";
}

function nextAyah() {
  const s = surahByNo(state.surah);
  if (state.ayah < s.ayahs) {
    state.ayah++;
  } else {
    // go to next surah if exists
    const idx = SURAHS.findIndex((x) => x.no === state.surah);
    if (idx >= 0 && idx < SURAHS.length - 1) {
      state.surah = SURAHS[idx + 1].no;
      state.ayah = 1;
      el("#surahSelect").value = String(state.surah);
      renderAyahSelect();
    }
  }
  stopPlaybackUI();
  loadAyah();
}

function prevAyah() {
  if (state.ayah > 1) {
    state.ayah--;
  } else {
    const idx = SURAHS.findIndex((x) => x.no === state.surah);
    if (idx > 0) {
      state.surah = SURAHS[idx - 1].no;
      const s = surahByNo(state.surah);
      state.ayah = s.ayahs;
      el("#surahSelect").value = String(state.surah);
      renderAyahSelect();
    }
  }
  stopPlaybackUI();
  loadAyah();
}

/** Page flip: we keep it simple: front shows panels; back is decorative during flip. */
function flipForward() {
  const sheet = el("#sheet");
  sheet.classList.add("flipped");
  state.flip = true;
  // after flip, we immediately reset (so it feels like paging)
  window.setTimeout(() => {
    sheet.classList.remove("flipped");
    state.flip = false;
    state.pageIndex++;
    el("#pageNumFront").textContent = String(state.pageIndex);
    el("#pageNumBack").textContent = String(state.pageIndex + 1);
  }, 540);
}

function flipBackward() {
  const sheet = el("#sheet");
  sheet.classList.add("flipped");
  state.flip = true;
  window.setTimeout(() => {
    sheet.classList.remove("flipped");
    state.flip = false;
    state.pageIndex = Math.max(1, state.pageIndex - 1);
    el("#pageNumFront").textContent = String(state.pageIndex);
    el("#pageNumBack").textContent = String(state.pageIndex + 1);
  }, 540);
}

// Map "page buttons" to meaningful navigation across panels
const FLOW = ["home", "surah", "dua"];

function goNextPanel() {
  const i = FLOW.indexOf(state.panel);
  const next = FLOW[Math.min(FLOW.length - 1, i + 1)];
  if (next !== state.panel) {
    setPanel(next);
    flipForward();
    if (next === "surah") loadAyah();
  }
}

function goPrevPanel() {
  const i = FLOW.indexOf(state.panel);
  const prev = FLOW[Math.max(0, i - 1)];
  if (prev !== state.panel) {
    setPanel(prev);
    flipBackward();
  }
}

function bindUI() {
  el("#gfName").textContent = gfName;

  el("#openBookBtn").addEventListener("click", () => {
    setPanel("surah");
    flipForward();
    loadAyah();
  });

  document.querySelectorAll("[data-go]").forEach((b) => {
    b.addEventListener("click", () => {
      const to = b.getAttribute("data-go");
      setPanel(to);
      flipForward();
      if (to === "surah") loadAyah();
    });
  });

  el("#nextBtn").addEventListener("click", goNextPanel);
  el("#prevBtn").addEventListener("click", goPrevPanel);

  el("#surahSelect").addEventListener("change", () => {
    state.surah = Number(el("#surahSelect").value);
    state.ayah = 1;
    renderAyahSelect();
    stopPlaybackUI();
    loadAyah();
  });

  el("#ayahSelect").addEventListener("change", () => {
    state.ayah = Number(el("#ayahSelect").value);
    stopPlaybackUI();
    loadAyah();
  });

  el("#playBtn").addEventListener("click", playPause);
  el("#nextAyahBtn").addEventListener("click", nextAyah);
  el("#prevAyahBtn").addEventListener("click", prevAyah);

  el("#audio").addEventListener("ended", () => {
    stopPlaybackUI();
  });

  // Keyboard paging
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") goPrevPanel(); // RTL feel
    if (e.key === "ArrowLeft") goNextPanel();
  });

  // Simple swipe (touch)
  let sx = 0, sy = 0;
  const area = el("#frontPage");
  area.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
  }, { passive:true });

  area.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 60) {
      if (dx > 0) goPrevPanel(); else goNextPanel();
    }
  }, { passive:true });
}

function init() {
  renderSurahSelect();
  renderAyahSelect();
  setPanel("home");

  // default selection
  el("#surahSelect").value = String(state.surah);
  el("#ayahSelect").value = String(state.ayah);

  bindUI();
}

init();