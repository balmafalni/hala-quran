const gfName = "حلا";

const TOTAL_PAGES = 604;

const AUDIO_BASE = "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/PageMp3/"; // Page001..Page604 :contentReference[oaicite:2]{index=2}
const IMG_BASE = "https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master/"; // 001.png..604.png :contentReference[oaicite:3]{index=3}

const el = (s) => document.querySelector(s);

const state = {
  page: 1,
  autoplay: false,
  audioReady: false,
  flipping: false,
};

function pad3(n){ return String(n).padStart(3,"0"); }

function audioUrl(page){
  return `${AUDIO_BASE}Page${pad3(page)}.mp3`;
}

function imgUrl(page){
  return `${IMG_BASE}${pad3(page)}.png`;
}

function clampPage(p){
  if (!Number.isFinite(p)) return 1;
  return Math.max(1, Math.min(TOTAL_PAGES, p));
}

function saveLastPage(){
  localStorage.setItem("hala_quran_last_page", String(state.page));
}

function loadLastPage(){
  const v = Number(localStorage.getItem("hala_quran_last_page"));
  if (Number.isFinite(v) && v >= 1 && v <= TOTAL_PAGES) state.page = v;
}

function setNowUI(){
  el("#gfName").textContent = gfName;
  el("#pageNumFront").textContent = String(state.page);
  el("#pageNumBack").textContent = String(Math.min(TOTAL_PAGES, state.page + 1));
  el("#nowTitle").textContent = `الصفحة ${state.page}`;
  el("#pageInput").value = "";
}

function stopUI(){
  el("#playBtn").textContent = "▶";
}

function loadPage({ keepPlaying=false } = {}){
  setNowUI();

  const img = el("#pageImg");
  img.src = imgUrl(state.page);

  const audio = el("#audio");
  audio.src = audioUrl(state.page);
  state.audioReady = true;

  saveLastPage();

  if (keepPlaying) {
    audio.play().then(() => {
      el("#playBtn").textContent = "⏸";
    }).catch(() => {
      stopUI();
    });
  } else {
    stopUI();
  }
}

function flip(){
  if (state.flipping) return;
  state.flipping = true;
  const sheet = el("#sheet");
  sheet.classList.add("flipped");
  setTimeout(() => {
    sheet.classList.remove("flipped");
    state.flipping = false;
  }, 520);
}

function nextPage({ autoplayCarry=false } = {}){
  if (state.page >= TOTAL_PAGES) return;
  const keepPlaying = autoplayCarry && !el("#audio").paused;
  state.page++;
  flip();
  loadPage({ keepPlaying });
}

function prevPage(){
  if (state.page <= 1) return;
  state.page--;
  flip();
  loadPage({ keepPlaying: false });
}

function playPause(){
  if (!state.audioReady) return;
  const audio = el("#audio");
  if (audio.paused){
    audio.play().then(() => {
      el("#playBtn").textContent = "⏸";
    }).catch(() => {
      stopUI();
      alert("المتصفح منع التشغيل. اضغطي تشغيل مرة ثانية.");
    });
  } else {
    audio.pause();
    stopUI();
  }
}

function toggleAutoplay(){
  state.autoplay = !state.autoplay;
  el("#autoplayBtn").textContent = `تشغيل تلقائي: ${state.autoplay ? "تشغيل" : "إيقاف"}`;
  localStorage.setItem("hala_quran_autoplay", state.autoplay ? "1" : "0");
}

function loadAutoplay(){
  state.autoplay = localStorage.getItem("hala_quran_autoplay") === "1";
  el("#autoplayBtn").textContent = `تشغيل تلقائي: ${state.autoplay ? "تشغيل" : "إيقاف"}`;
}

function goToPage(p){
  const n = clampPage(Number(String(p).replace(/[^\d]/g,"")));
  if (n === state.page) return;
  state.page = n;
  flip();
  loadPage({ keepPlaying:false });
}

function openDrawer(){
  el("#drawer").classList.add("open");
  el("#backdrop").classList.add("show");
  el("#drawer").setAttribute("aria-hidden","false");
  el("#backdrop").setAttribute("aria-hidden","false");
}

function closeDrawer(){
  el("#drawer").classList.remove("open");
  el("#backdrop").classList.remove("show");
  el("#drawer").setAttribute("aria-hidden","true");
  el("#backdrop").setAttribute("aria-hidden","true");
}

function buildThumbs(){
  const grid = el("#thumbGrid");
  if (grid.dataset.built === "1") return;
  grid.dataset.built = "1";

  const frag = document.createDocumentFragment();
  for (let p = 1; p <= TOTAL_PAGES; p++){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    btn.addEventListener("click", () => {
      closeDrawer();
      goToPage(p);
    });

    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = `Page ${p}`;
    img.src = imgUrl(p);

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = String(p);

    btn.appendChild(img);
    btn.appendChild(num);
    frag.appendChild(btn);
  }
  grid.appendChild(frag);
}

function bind(){
  el("#openBookBtn").addEventListener("click", () => {
    loadPage({ keepPlaying:false });
  });

  el("#prevBtn").addEventListener("click", prevPage);
  el("#nextBtn").addEventListener("click", () => nextPage({ autoplayCarry:true }));
  el("#playBtn").addEventListener("click", playPause);

  el("#autoplayBtn").addEventListener("click", toggleAutoplay);

  el("#goBtn").addEventListener("click", () => goToPage(el("#pageInput").value));
  el("#pageInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") goToPage(el("#pageInput").value);
  });

  el("#thumbsBtn").addEventListener("click", () => {
    buildThumbs();
    openDrawer();
  });
  el("#closeDrawerBtn").addEventListener("click", closeDrawer);
  el("#backdrop").addEventListener("click", closeDrawer);

  el("#bookmarkBtn").addEventListener("click", () => {
    saveLastPage();
    const b = el("#bookmarkBtn");
    b.textContent = "✅";
    setTimeout(() => (b.textContent = "🔖"), 700);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") nextPage({ autoplayCarry:false });
    if (e.key === "ArrowRight") prevPage();
    if (e.key === "Escape") closeDrawer();
  });

  let sx = 0, sy = 0;
  el("#frontPage").addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
  }, { passive:true });

  el("#frontPage").addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 70) {
      if (dx < 0) nextPage({ autoplayCarry:false });
      else prevPage();
    }
  }, { passive:true });

  el("#audio").addEventListener("ended", () => {
    stopUI();
    if (state.autoplay && state.page < TOTAL_PAGES) {
      nextPage({ autoplayCarry:false });
      const a = el("#audio");
      a.play().then(() => (el("#playBtn").textContent = "⏸")).catch(() => stopUI());
    }
  });
}

function init(){
  loadLastPage();
  loadAutoplay();
  bind();
  loadPage({ keepPlaying:false });
}

init();