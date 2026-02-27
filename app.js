// app.js
// Quran.com API (chapters + Uthmani verses)
const API_BASE = "https://api.quran.com/api/v4";

// EveryAyah streaming (Yasser Al-Dussary 128kbps)
const EVERYAYAH_BASE = "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/";

// Helpers
const el = (id) => document.getElementById(id);

function pad3(n){ return String(n).padStart(3, "0"); }
function verseMp3Url(chapterNumber, verseNumber){
  return EVERYAYAH_BASE + pad3(chapterNumber) + pad3(verseNumber) + ".mp3";
}

const toastEl = el("toast");
let toastTimer = null;
function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function fmtTime(s){
  if(!isFinite(s)) return "00:00";
  const m = Math.floor(s/60);
  const r = Math.floor(s%60);
  return String(m).padStart(2,"0")+":"+String(r).padStart(2,"0");
}

// State
let chapters = [];
let currentChapter = null;
let verses = [];
let currentIndex = -1;
let isLoop = false;

const audio = el("audio");
const surahListEl = el("surahList");
const ayahsEl = el("ayahs");
const paneMeta = el("paneMeta");
const surahHeader = el("surahHeader");

const nowLine1 = el("nowLine1");
const nowLine2 = el("nowLine2");
const playBtn = el("playBtn");
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const loopBtn = el("loopBtn");
const seek = el("seek");
const timeEl = el("time");

const q = el("q");
const resumeBtn = el("resumeBtn");

// Cover
function setCover(open){
  const cover = el("cover");
  if(!cover) return;
  cover.style.opacity = open ? "0" : "1";
  cover.style.pointerEvents = open ? "none" : "auto";
  if(open) showToast("تم فتح المصحف");
}

function saveLastPosition(){
  if(!currentChapter || currentIndex < 0) return;
  const payload = {
    chapter: currentChapter.id,
    index: currentIndex,
    verseNumber: verses[currentIndex]?.verse_number || null,
    ts: Date.now()
  };
  localStorage.setItem("hala_mushaf_last", JSON.stringify(payload));
}

function readLastPosition(){
  try{
    const raw = localStorage.getItem("hala_mushaf_last");
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

function updateTimeUI(){
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  timeEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
  if(dur > 0){
    seek.value = Math.floor((cur/dur)*1000);
  }
}

function setNowPlayingText(){
  if(!currentChapter || currentIndex < 0){
    nowLine1.textContent = "جاهز";
    nowLine2.textContent = "—";
    return;
  }
  const v = verses[currentIndex];
  nowLine1.textContent = `سورة ${currentChapter.name_arabic}`;
  nowLine2.textContent = `آية ${v.verse_number}`;
}

function setPlayButtonState(){
  playBtn.textContent = audio.paused ? "تشغيل" : "إيقاف";
}

function markPlaying(){
  document.querySelectorAll(".ayah").forEach(a => a.classList.remove("playing"));
  const active = document.querySelector(`.ayah[data-idx="${currentIndex}"]`);
  if(active) active.classList.add("playing");

  document.querySelectorAll(".row").forEach(r => r.classList.remove("active"));
  const row = document.querySelector(`.row[data-id="${currentChapter?.id}"]`);
  if(row) row.classList.add("active");
}

// API
async function fetchChapters(){
  const res = await fetch(`${API_BASE}/chapters?language=ar`);
  if(!res.ok) throw new Error("فشل تحميل السور");
  const data = await res.json();
  chapters = data.chapters || [];
  paneMeta.textContent = `${chapters.length} سورة`;
}

async function fetchUthmaniVerses(chapterNumber){
  const res = await fetch(`${API_BASE}/quran/verses/uthmani?chapter_number=${chapterNumber}`);
  if(!res.ok) throw new Error("فشل تحميل الآيات");
  const data = await res.json();
  const v = data.verses || [];
  return v.map(x => ({
    verse_key: x.verse_key,
    text: x.text_uthmani,
    verse_number: x.verse_number ?? parseInt(String(x.verse_key).split(":")[1],10)
  }));
}

// Render
function renderChapters(list){
  surahListEl.innerHTML = "";
  list.forEach(ch => {
    const div = document.createElement("div");
    div.className = "row";
    div.dataset.id = ch.id;

    div.innerHTML = `
      <div class="right">
        <div class="nameAr">${ch.name_arabic}</div>
        <div class="sub">${ch.revelation_place === "makkah" ? "مكية" : "مدنية"} • ${ch.verses_count} آية</div>
      </div>
      <div class="badge">${ch.id}</div>
    `;
    div.addEventListener("click", () => loadChapter(ch.id));
    surahListEl.appendChild(div);
  });
}

function renderVerses(){
  ayahsEl.innerHTML = "";
  verses.forEach((v, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "ayah";
    wrap.dataset.idx = idx;

    wrap.innerHTML = `
      <div class="ayahText">${v.text}</div>
      <div class="ayahTools">
        <button class="mini primary" type="button">تشغيل</button>
        <button class="mini" type="button">حفظ</button>
      </div>
    `;

    const playOne = wrap.querySelector(".mini.primary");
    const saveBtn = wrap.querySelectorAll(".mini")[1];

    playOne.addEventListener("click", () => playIndex(idx));
    saveBtn.addEventListener("click", () => {
      currentIndex = idx;
      saveLastPosition();
      showToast("تم الحفظ");
      markPlaying();
      setNowPlayingText();
    });

    ayahsEl.appendChild(wrap);
  });
}

// Load + play
async function loadChapter(chapterId){
  setCover(true);

  currentChapter = chapters.find(c => c.id === Number(chapterId));
  if(!currentChapter) return;

  surahHeader.textContent = `سورة ${currentChapter.name_arabic} • ${currentChapter.verses_count} آية`;
  paneMeta.textContent = "تحميل الآيات...";

  try{
    verses = await fetchUthmaniVerses(currentChapter.id);
    paneMeta.textContent = `${chapters.length} سورة • محمّل`;
    renderVerses();

    currentIndex = 0;
    markPlaying();
    setNowPlayingText();
    saveLastPosition();
  }catch{
    paneMeta.textContent = "حدث خطأ في التحميل";
    showToast("تعذر تحميل السورة");
  }
}

function playIndex(idx){
  if(!currentChapter) return;

  currentIndex = idx;
  const v = verses[currentIndex];
  const url = verseMp3Url(currentChapter.id, v.verse_number);

  audio.src = url;
  audio.play().catch(()=>{});
  setPlayButtonState();
  markPlaying();
  setNowPlayingText();
  saveLastPosition();
}

function playNext(){
  if(!currentChapter || verses.length === 0) return;

  const next = currentIndex + 1;
  if(next >= verses.length){
    if(isLoop){
      playIndex(0);
    } else {
      audio.pause();
      setPlayButtonState();
      showToast("انتهت السورة");
    }
    return;
  }
  playIndex(next);
}

function playPrev(){
  if(!currentChapter || verses.length === 0) return;
  playIndex(Math.max(0, currentIndex - 1));
}

function togglePlay(){
  if(!audio.src){
    if(currentChapter && verses.length){
      playIndex(Math.max(0, currentIndex));
    } else {
      showToast("اختر سورة أولاً");
    }
    return;
  }
  if(audio.paused) audio.play().catch(()=>{});
  else audio.pause();
  setPlayButtonState();
}

function resumeLast(){
  const last = readLastPosition();
  if(!last){
    showToast("لا يوجد موضع محفوظ");
    return;
  }
  const ch = Number(last.chapter);
  const idx = Number(last.index);
  loadChapter(ch).then(() => {
    currentIndex = Math.min(Math.max(0, idx), verses.length - 1);
    markPlaying();
    setNowPlayingText();
    showToast("تم الرجوع لآخر موضع");
  });
}

function randomAyah(){
  if(!chapters.length) return;
  setCover(true);
  const ch = chapters[Math.floor(Math.random()*chapters.length)];
  loadChapter(ch.id).then(() => {
    const r = Math.floor(Math.random()*verses.length);
    currentIndex = r;
    markPlaying();
    setNowPlayingText();
    saveLastPosition();
    showToast("تم اختيار آية عشوائية");
    const node = document.querySelector(`.ayah[data-idx="${currentIndex}"]`);
    if(node) node.scrollIntoView({behavior:"smooth", block:"center"});
  });
}

// Wire Quran UI
el("openCoverBtn").addEventListener("click", () => setCover(true));
el("openBtn2").addEventListener("click", () => setCover(true));
el("randomBtn").addEventListener("click", randomAyah);

resumeBtn.addEventListener("click", resumeLast);

playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

loopBtn.addEventListener("click", () => {
  isLoop = !isLoop;
  loopBtn.textContent = `تكرار: ${isLoop ? "نعم" : "لا"}`;
});

audio.addEventListener("ended", playNext);
audio.addEventListener("timeupdate", updateTimeUI);
audio.addEventListener("play", setPlayButtonState);
audio.addEventListener("pause", setPlayButtonState);
audio.addEventListener("loadedmetadata", updateTimeUI);

seek.addEventListener("input", () => {
  if(!audio.duration) return;
  audio.currentTime = (Number(seek.value)/1000) * audio.duration;
});

q.addEventListener("input", () => {
  const s = q.value.trim();
  if(!s) return renderChapters(chapters);
  renderChapters(chapters.filter(c => (c.name_arabic || "").includes(s)));
});

// =====================
// Dua Page (local-only)
// =====================
const DUA_LS_KEY = "hala_duas_saved";

const DUA_PRESETS = [
  "اللهم احفظ حلا بعينك التي لا تنام، واكتب لها الخير حيث كان.",
  "اللهم اجعل القرآن ربيع قلب حلا، ونور صدرها، وجلاء حزنها، وذهاب همّها.",
  "اللهم ارزق حلا طمأنينةً تسع الدنيا وما فيها.",
  "اللهم اجبر خاطر حلا جبراً يليق بكرمك، وبدّل ضيقها فرجاً.",
  "اللهم اشرح صدر حلا، ويسّر أمرها، وبارك لها في وقتها ورزقها.",
  "اللهم اجعل حلا من أهل القرآن الذين هم أهلك وخاصتك.",
  "اللهم ارزق حلا صحةً وعافيةً وسترًا ورضًا وحسنَ ختام.",
  "اللهم اجعل أيام حلا بركةً، وخطواتها توفيقاً، وقلبها معلقاً بك."
];

function getSavedDuas(){
  try{ return JSON.parse(localStorage.getItem(DUA_LS_KEY)) || []; }
  catch{ return []; }
}
function setSavedDuas(arr){
  localStorage.setItem(DUA_LS_KEY, JSON.stringify(arr));
}

function applyFeaturedDua(){
  const featured = localStorage.getItem("hala_dua_featured");
  const line = el("coverDuaLine");
  if(line) line.textContent = featured ? featured : "";
}

function renderDuaList(container, items, { deletable } = {}){
  if(!container) return;
  container.innerHTML = "";

  if(!items.length){
    const empty = document.createElement("div");
    empty.className = "meta";
    empty.textContent = "لا يوجد شيء هنا بعد.";
    container.appendChild(empty);
    return;
  }

  items.forEach((text, i) => {
    const item = document.createElement("div");
    item.className = "duaItem";

    const t = document.createElement("div");
    t.className = "duaText";
    t.textContent = text;

    const btns = document.createElement("div");
    btns.className = "duaBtns";

    const copy = document.createElement("button");
    copy.className = "duaMini";
    copy.type = "button";
    copy.textContent = "نسخ";
    copy.onclick = async () => {
      try{
        await navigator.clipboard.writeText(text);
        showToast("تم النسخ");
      }catch{
        showToast("تعذر النسخ");
      }
    };

    const pin = document.createElement("button");
    pin.className = "duaMini primary";
    pin.type = "button";
    pin.textContent = "تعيين كرسالة";
    pin.onclick = () => {
      localStorage.setItem("hala_dua_featured", text);
      applyFeaturedDua();
      showToast("تم تعيين الدعاء");
    };

    btns.appendChild(copy);
    btns.appendChild(pin);

    if(deletable){
      const del = document.createElement("button");
      del.className = "duaMini";
      del.type = "button";
      del.textContent = "حذف";
      del.onclick = () => {
        const arr = getSavedDuas();
        arr.splice(i, 1);
        setSavedDuas(arr);
        renderSavedDuas();
        showToast("تم الحذف");
      };
      btns.appendChild(del);
    }

    item.appendChild(t);
    item.appendChild(btns);
    container.appendChild(item);
  });
}

function renderPresetDuas(){
  renderDuaList(el("duaPresets"), DUA_PRESETS, { deletable:false });
}
function renderSavedDuas(){
  renderDuaList(el("duaSaved"), getSavedDuas(), { deletable:true });
}

function openDuaPage(){
  const page = el("duaPage");
  if(!page) return;
  page.style.display = "";
  page.scrollIntoView({behavior:"smooth", block:"start"});
  showToast("صفحة الدعاء");
}
function closeDuaPage(){
  const page = el("duaPage");
  if(!page) return;
  page.style.display = "none";
}

function wireDuaPage(){
  const duaBtn = el("duaBtn");
  const closeBtn = el("closeDuaBtn");
  const saveBtn = el("saveDuaBtn");
  const clearBtn = el("clearDuaBtn");
  const input = el("duaInput");

  if(duaBtn) duaBtn.addEventListener("click", openDuaPage);
  if(closeBtn) closeBtn.addEventListener("click", closeDuaPage);

  if(saveBtn && input){
    saveBtn.addEventListener("click", () => {
      const val = (input.value || "").trim();
      if(!val) return showToast("اكتبي دعاء أولاً");
      const arr = getSavedDuas();
      if(arr.includes(val)) return showToast("موجود مسبقاً");
      arr.unshift(val);
      setSavedDuas(arr);
      input.value = "";
      renderSavedDuas();
      showToast("تم الحفظ");
    });
  }

  if(clearBtn && input){
    clearBtn.addEventListener("click", () => {
      input.value = "";
      showToast("تم المسح");
    });
  }

  renderPresetDuas();
  renderSavedDuas();
  applyFeaturedDua();
}

// Boot
(async function boot(){
  try{
    await fetchChapters();
    renderChapters(chapters);
    paneMeta.textContent = `${chapters.length} سورة`;
    if(readLastPosition()?.chapter) showToast("يمكنك المتابعة من آخر موضع");
  }catch{
    paneMeta.textContent = "تعذر تحميل السور";
    showToast("افحص اتصال الإنترنت");
  } finally {
    wireDuaPage();
  }
})();