const gfName = "حلا";

const TOTAL_PAGES = 604;

// Audio (page mp3)
const AUDIO_BASE = "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/PageMp3/";

// Page images
const IMG_BASE = "https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master/";

// Metadata (surah name + juz by page)
const META_API = (page) => `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`;

const el = (s) => document.querySelector(s);

const state = {
  page: 1,
  autoplay: false,
  audioReady: false,
};

function pad3(n){ return String(n).padStart(3,"0"); }
function clampPage(p){ return Math.max(1, Math.min(TOTAL_PAGES, p)); }

function audioUrl(page){ return `${AUDIO_BASE}Page${pad3(page)}.mp3`; }
function imgUrl(page){ return `${IMG_BASE}${pad3(page)}.png`; }

function saveLastPage(){ localStorage.setItem("hala_quran_last_page", String(state.page)); }
function loadLastPage(){
  const v = Number(localStorage.getItem("hala_quran_last_page"));
  if (Number.isFinite(v) && v >= 1 && v <= TOTAL_PAGES) state.page = v;
}

function saveAutoplay(){ localStorage.setItem("hala_quran_autoplay", state.autoplay ? "1" : "0"); }
function loadAutoplay(){
  state.autoplay = localStorage.getItem("hala_quran_autoplay") === "1";
  el("#autoplayBtn").textContent = `تلقائي: ${state.autoplay ? "تشغيل" : "إيقاف"}`;
}

function setHeaderText({ surahName=null, juz=null } = {}){
  const parts = [];
  if (surahName) parts.push(`سورة ${surahName}`);
  parts.push(`الصفحة ${state.page}`);
  if (juz) parts.push(`الجزء ${juz}`);
  el("#headerLine").textContent = parts.join(" — ");
}

async function loadMeta(page){
  try{
    const r = await fetch(META_API(page));
    if (!r.ok) throw new Error("meta fetch failed");
    const j = await r.json();

    // take first ayah on the page for surah + juz (page is within a surah start/end)
    const firstAyah = j?.data?.ayahs?.[0];
    const surahName = firstAyah?.surah?.name || null;         // Arabic surah name
    const juz = firstAyah?.juz ? String(firstAyah.juz) : null; // juz number

    setHeaderText({ surahName, juz });
  } catch {
    // fallback: just page
    setHeaderText({});
  }
}

function stopUI(){
  el("#playBtn").textContent = "▶";
}

function loadPage({ keepPlaying=false } = {}){
  // image
  el("#pageImg").src = imgUrl(state.page);

  // audio
  const audio = el("#audio");
  audio.src = audioUrl(state.page);
  state.audioReady = true;

  saveLastPage();

  // header (surah + page + juz)
  setHeaderText({});
  loadMeta(state.page);

  if (keepPlaying){
    audio.play().then(() => {
      el("#playBtn").textContent = "⏸";
    }).catch(() => stopUI());
  } else {
    stopUI();
  }
}

function playPause(){
  if (!state.audioReady) return;
  const audio = el("#audio");
  if (audio.paused){
    audio.play().then(() => el("#playBtn").textContent = "⏸")
      .catch(() => { stopUI(); alert("المتصفح منع التشغيل. اضغطي تشغيل مرة ثانية."); });
  } else {
    audio.pause();
    stopUI();
  }
}

function nextPage({ carryPlayback=false } = {}){
  if (state.page >= TOTAL_PAGES) return;
  const wasPlaying = carryPlayback && !el("#audio").paused;
  state.page++;
  loadPage({ keepPlaying: wasPlaying });
}

function prevPage(){
  if (state.page <= 1) return;
  state.page--;
  loadPage({ keepPlaying:false });
}

function toggleAutoplay(){
  state.autoplay = !state.autoplay;
  el("#autoplayBtn").textContent = `تلقائي: ${state.autoplay ? "تشغيل" : "إيقاف"}`;
  saveAutoplay();
}

function openReader(){
  // just ensures reader is on + cover hidden (desktop)
  const cover = el("#cover");
  if (cover) cover.style.display = "none";
  el("#reader").setAttribute("aria-hidden","false");
}

function bind(){
  el("#gfName").textContent = gfName;

  el("#openBookBtn").addEventListener("click", () => {
    openReader();
    loadPage({ keepPlaying:false });
  });

  el("#prevBtn").addEventListener("click", prevPage);
  el("#nextBtn").addEventListener("click", () => nextPage({ carryPlayback:true }));
  el("#playBtn").addEventListener("click", playPause);
  el("#autoplayBtn").addEventListener("click", toggleAutoplay);

  // swipe
  let sx=0, sy=0;
  el("#frontPage").addEventListener("touchstart", (e) => {
    const t=e.touches[0]; sx=t.clientX; sy=t.clientY;
  }, { passive:true });
  el("#frontPage").addEventListener("touchend", (e) => {
    const t=e.changedTouches[0];
    const dx=t.clientX - sx;
    const dy=t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 70){
      if (dx < 0) nextPage({ carryPlayback:false });
      else prevPage();
    }
  }, { passive:true });

  // keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") nextPage({ carryPlayback:false });
    if (e.key === "ArrowRight") prevPage();
  });

  // autoplay chain
  el("#audio").addEventListener("ended", () => {
    stopUI();
    if (state.autoplay && state.page < TOTAL_PAGES){
      state.page++;
      loadPage({ keepPlaying:true });
    }
  });
}

function init(){
  loadLastPage();
  loadAutoplay();
  bind();
  // If you want it to open directly to last page without pressing open:
  // openReader(); loadPage({ keepPlaying:false });
}

init();