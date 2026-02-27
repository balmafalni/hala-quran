const API_BASE = "https://api.quran.com/api/v4";
const EVERYAYAH_BASE = "https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/";
const el = (id) => document.getElementById(id);

const pages = () => Array.from(document.querySelectorAll(".page"));
function showPage(name){
  pages().forEach(p => p.classList.toggle("active", p.dataset.page === name));
}

function pad3(n){ return String(n).padStart(3,"0"); }
function mp3Url(surah, ayah){ return `${EVERYAYAH_BASE}${pad3(surah)}${pad3(ayah)}.mp3`; }

const toastEl = el("toast");
let toastTimer = null;
function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toastEl.classList.remove("show"), 900);
}

const audio = el("audio");
const seek = el("seek");
const timeEl = el("time");
const now1 = el("now1");
const now2 = el("now2");

const playBtn = el("playBtn");
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const loopBtn = el("loopBtn");

const q = el("q");
const statusEl = el("status");
const surahListEl = el("surahList");
const ayahsEl = el("ayahs");
const surahHeader = el("surahHeader");

const coverDuaLine = el("coverDuaLine");

let chapters = [];
let verses = [];
let currentSurah = null;
let idx = -1;
let loop = false;

function fmt(s){
  if(!isFinite(s)) return "00:00";
  const m = Math.floor(s/60), r = Math.floor(s%60);
  return String(m).padStart(2,"0")+":"+String(r).padStart(2,"0");
}

function updateTime(){
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  if(timeEl) timeEl.textContent = `${fmt(cur)} / ${fmt(dur)}`;
  if(dur > 0 && seek) seek.value = Math.floor((cur/dur)*1000);
}

function setNow(){
  if(!now1 || !now2) return;
  if(!currentSurah || idx < 0){ now1.textContent="—"; now2.textContent="—"; return; }
  now1.textContent = `سورة ${currentSurah.name_arabic}`;
  now2.textContent = `آية ${verses[idx].verse_number}`;
}

function setPlayLabel(){
  if(!playBtn) return;
  playBtn.textContent = audio.paused ? "تشغيل" : "إيقاف";
}

function savePos(){
  if(!currentSurah || idx < 0) return;
  localStorage.setItem("hala_last", JSON.stringify({ s: currentSurah.id, i: idx }));
}

function loadPos(){
  try{ return JSON.parse(localStorage.getItem("hala_last")); }catch{ return null; }
}

function mark(){
  document.querySelectorAll(".row").forEach(x=>x.classList.remove("active"));
  const r = document.querySelector(`.row[data-id="${currentSurah?.id}"]`);
  if(r) r.classList.add("active");

  document.querySelectorAll(".ayah").forEach(x=>x.classList.remove("playing"));
  const a = document.querySelector(`.ayah[data-idx="${idx}"]`);
  if(a) a.classList.add("playing");
}

async function getChapters(){
  const res = await fetch(`${API_BASE}/chapters?language=ar`);
  if(!res.ok) throw 0;
  const data = await res.json();
  chapters = data.chapters || [];
  if(statusEl) statusEl.textContent = `${chapters.length} سورة`;
}

async function getVerses(chapterNumber){
  const res = await fetch(`${API_BASE}/quran/verses/uthmani?chapter_number=${chapterNumber}`);
  if(!res.ok) throw 0;
  const data = await res.json();
  const v = data.verses || [];
  return v.map(x => ({
    verse_key: x.verse_key,
    text: x.text_uthmani,
    verse_number: x.verse_number ?? parseInt(String(x.verse_key).split(":")[1],10)
  }));
}

function renderChapters(list){
  surahListEl.innerHTML = "";
  list.forEach(ch=>{
    const d = document.createElement("div");
    d.className = "row";
    d.dataset.id = ch.id;
    d.innerHTML = `
      <div>
        <div class="n">${ch.name_arabic}</div>
        <div class="s">${ch.revelation_place === "makkah" ? "مكية" : "مدنية"} • ${ch.verses_count} آية</div>
      </div>
      <div class="b">${ch.id}</div>
    `;
    d.addEventListener("click", ()=>loadSurah(ch.id));
    surahListEl.appendChild(d);
  });
}

function renderVerses(){
  ayahsEl.innerHTML = "";
  verses.forEach((v,i)=>{
    const d = document.createElement("div");
    d.className = "ayah";
    d.dataset.idx = i;
    d.innerHTML = `
      <div class="ayahText">${v.text}</div>
      <div class="ayahBtns">
        <button class="btn primary" type="button" data-act="play">تشغيل</button>
        <button class="btn ghost" type="button" data-act="save">حفظ</button>
      </div>
    `;
    d.querySelector('[data-act="play"]').addEventListener("click", ()=>playAt(i));
    d.querySelector('[data-act="save"]').addEventListener("click", ()=>{
      idx = i; savePos(); setNow(); mark(); toast("تم");
    });
    ayahsEl.appendChild(d);
  });
}

async function loadSurah(id){
  currentSurah = chapters.find(c=>c.id===Number(id));
  if(!currentSurah) return;
  if(surahHeader) surahHeader.textContent = `سورة ${currentSurah.name_arabic}`;
  if(statusEl) statusEl.textContent = "تحميل...";
  try{
    verses = await getVerses(currentSurah.id);
    if(statusEl) statusEl.textContent = `${chapters.length} سورة`;
    renderVerses();
    idx = 0;
    savePos();
    setNow();
    mark();
  }catch{
    if(statusEl) statusEl.textContent = "خطأ";
  }
}

function playAt(i){
  if(!currentSurah) return;
  idx = i;
  audio.src = mp3Url(currentSurah.id, verses[idx].verse_number);
  audio.play().catch(()=>{});
  setPlayLabel();
  setNow();
  mark();
  savePos();
}

function next(){
  if(!currentSurah || !verses.length) return;
  const n = idx + 1;
  if(n >= verses.length){
    if(loop) return playAt(0);
    audio.pause();
    setPlayLabel();
    return;
  }
  playAt(n);
}

function prev(){
  if(!currentSurah || !verses.length) return;
  playAt(Math.max(0, idx - 1));
}

function toggle(){
  if(!audio.src){
    if(currentSurah && verses.length) return playAt(Math.max(0, idx));
    return;
  }
  if(audio.paused) audio.play().catch(()=>{});
  else audio.pause();
  setPlayLabel();
}

const DUA_KEY = "hala_duas";
const DUA_FEATURED = "hala_dua_featured";
const DUA_PRESETS = [
  "اللهم احفظ حلا بعينك التي لا تنام.",
  "اللهم اجعل القرآن ربيع قلب حلا.",
  "اللهم ارزق حلا طمأنينةً وبركةً.",
  "اللهم اجبر خاطر حلا جبراً جميلاً.",
  "اللهم يسّر أمر حلا وبارك لها."
];

function getSavedDuas(){ try{ return JSON.parse(localStorage.getItem(DUA_KEY)) || []; }catch{ return []; } }
function setSavedDuas(arr){ localStorage.setItem(DUA_KEY, JSON.stringify(arr)); }
function applyFeatured(){ if(coverDuaLine) coverDuaLine.textContent = localStorage.getItem(DUA_FEATURED) || ""; }

function renderDuaList(container, items, deletable){
  container.innerHTML = "";
  items.forEach((text, i)=>{
    const d = document.createElement("div");
    d.className = "duaItem";
    d.innerHTML = `
      <div class="duaText">${text}</div>
      <div class="duaBtns">
        <button class="btn primary" type="button" data-act="pin">تعيين</button>
        <button class="btn ghost" type="button" data-act="copy">نسخ</button>
        ${deletable ? `<button class="btn ghost" type="button" data-act="del">حذف</button>` : ``}
      </div>
    `;
    d.querySelector('[data-act="pin"]').addEventListener("click", ()=>{
      localStorage.setItem(DUA_FEATURED, text);
      applyFeatured();
      toast("تم");
    });
    d.querySelector('[data-act="copy"]').addEventListener("click", async ()=>{
      try{ await navigator.clipboard.writeText(text); toast("تم"); }catch{ toast("—"); }
    });
    if(deletable){
      d.querySelector('[data-act="del"]').addEventListener("click", ()=>{
        const arr = getSavedDuas();
        arr.splice(i,1);
        setSavedDuas(arr);
        renderSaved();
        toast("تم");
      });
    }
    container.appendChild(d);
  });
}

function renderPresets(){ renderDuaList(el("duaPresets"), DUA_PRESETS, false); }
function renderSaved(){ renderDuaList(el("duaSaved"), getSavedDuas(), true); }

function wireDua(){
  const input = el("duaInput");
  el("saveDuaBtn").addEventListener("click", ()=>{
    const v = (input.value || "").trim();
    if(!v) return;
    const arr = getSavedDuas();
    if(arr.includes(v)) return;
    arr.unshift(v);
    setSavedDuas(arr);
    input.value = "";
    renderSaved();
    toast("تم");
  });
  el("clearDuaBtn").addEventListener("click", ()=>{ input.value=""; });
  renderPresets();
  renderSaved();
  applyFeatured();
}

function wirePages(){
  el("goRead").addEventListener("click", ()=>showPage("read"));
  el("goDua").addEventListener("click", ()=>showPage("dua"));
  el("toCover1").addEventListener("click", ()=>showPage("cover"));
  el("toDua1").addEventListener("click", ()=>showPage("dua"));
  el("toRead2").addEventListener("click", ()=>showPage("read"));
  el("toCover2").addEventListener("click", ()=>showPage("cover"));
}

function wirePlayer(){
  playBtn.addEventListener("click", toggle);
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  loopBtn.addEventListener("click", ()=>{ loop = !loop; loopBtn.textContent = `تكرار: ${loop ? "نعم" : "لا"}`; });
  audio.addEventListener("ended", next);
  audio.addEventListener("timeupdate", updateTime);
  audio.addEventListener("play", setPlayLabel);
  audio.addEventListener("pause", setPlayLabel);
  audio.addEventListener("loadedmetadata", updateTime);
  seek.addEventListener("input", ()=>{
    if(!audio.duration) return;
    audio.currentTime = (Number(seek.value)/1000) * audio.duration;
  });
}

function wireSearch(){
  q.addEventListener("input", ()=>{
    const s = q.value.trim();
    if(!s) return renderChapters(chapters);
    renderChapters(chapters.filter(c => (c.name_arabic || "").includes(s)));
  });
}

function wireResume(){
  el("resumeBtn").addEventListener("click", ()=>{
    const last = loadPos();
    if(!last) return;
    loadSurah(last.s).then(()=>{
      idx = Math.min(Math.max(0, Number(last.i)), verses.length-1);
      setNow();
      mark();
      toast("تم");
    });
  });
}

async function boot(){
  showPage("cover");
  wirePages();
  wirePlayer();
  wireSearch();
  wireResume();
  wireDua();
  try{
    await getChapters();
    renderChapters(chapters);
    const last = loadPos();
    if(last?.s) await loadSurah(last.s);
    if(last?.i != null){
      idx = Math.min(Math.max(0, Number(last.i)), verses.length-1);
      setNow();
      mark();
    }
  }catch{
    if(statusEl) statusEl.textContent = "خطأ";
  }
}

document.addEventListener("DOMContentLoaded", boot);