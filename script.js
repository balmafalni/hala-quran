/***********************
 * Dua Page (local-only)
 ***********************/
const DUA_LS_KEY = "hala_duas_saved";

function getSavedDuas(){
  try{
    return JSON.parse(localStorage.getItem(DUA_LS_KEY)) || [];
  }catch(_){
    return [];
  }
}
function setSavedDuas(arr){
  localStorage.setItem(DUA_LS_KEY, JSON.stringify(arr));
}

const DUA_PRESETS = [
  `اللهم احفظ حلا بعينك التي لا تنام، واكتب لها الخير حيث كان.`,
  `اللهم اجعل القرآن ربيع قلب حلا، ونور صدرها، وجلاء حزنها، وذهاب همّها.`,
  `اللهم ارزق حلا طمأنينةً تسع الدنيا وما فيها.`,
  `اللهم اجبر خاطر حلا جبراً يليق بكرمك، وبدّل ضيقها فرجاً.`,
  `اللهم اشرح صدر حلا، ويسّر أمرها، وبارك لها في وقتها ورزقها.`,
  `اللهم اجعل حلا من أهل القرآن الذين هم أهلك وخاصتك.`,
  `اللهم ارزق حلا صحةً وعافيةً وسترًا ورضًا وحسنَ ختام.`,
  `اللهم اجعل أيام حلا بركةً، وخطواتها توفيقاً، وقلبها معلقاً بك.`
];

function $(id){ return document.getElementById(id); }

function renderDuaList(containerEl, items, opts){
  containerEl.innerHTML = "";
  if(!items.length){
    const empty = document.createElement("div");
    empty.className = "meta";
    empty.textContent = "لا يوجد شيء هنا بعد.";
    containerEl.appendChild(empty);
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
      }catch(_){
        showToast("تعذر النسخ");
      }
    };

    const pin = document.createElement("button");
    pin.className = "duaMini primary";
    pin.type = "button";
    pin.textContent = "تعيين كرسالة";
    pin.onclick = () => {
      // Put the dua into the cover subtitle area if you want (optional)
      // Here we display it as a toast and also store it.
      localStorage.setItem("hala_dua_featured", text);
      showToast("تم تعيين الدعاء");
      applyFeaturedDua();
    };

    btns.appendChild(copy);
    btns.appendChild(pin);

    if(opts?.deletable){
      const del = document.createElement("button");
      del.className = "duaMini";
      del.type = "button";
      del.textContent = "حذف";
      del.onclick = () => {
        const arr = getSavedDuas();
        const next = arr.filter((_, idx) => idx !== i);
        setSavedDuas(next);
        renderSavedDuas();
        showToast("تم الحذف");
      };
      btns.appendChild(del);
    }

    item.appendChild(t);
    item.appendChild(btns);
    containerEl.appendChild(item);
  });
}

function renderPresetDuas(){
  const elPresets = $("duaPresets");
  if(!elPresets) return;
  renderDuaList(elPresets, DUA_PRESETS, { deletable:false });
}

function renderSavedDuas(){
  const elSaved = $("duaSaved");
  if(!elSaved) return;
  const saved = getSavedDuas();
  renderDuaList(elSaved, saved, { deletable:true });
}

function applyFeaturedDua(){
  const featured = localStorage.getItem("hala_dua_featured");
  if(!featured) return;

  // Optional personalization: show featured dua on the cover (if you want)
  // You can add an element with id="coverDuaLine" under the cover title.
  // If you don't add it, we just show it as the header meta text.
  const coverDuaLine = $("coverDuaLine");
  if(coverDuaLine){
    coverDuaLine.textContent = featured;
  } else {
    // fallback: show it near the reader header meta if exists
    const header = document.getElementById("paneMeta");
    if(header) header.textContent = "✨ " + featured.slice(0, 70) + (featured.length > 70 ? "…" : "");
  }
}

function openDuaPage(){
  const duaPage = $("duaPage");
  if(!duaPage) return;
  duaPage.style.display = "";
  // scroll into view like a “page”
  duaPage.scrollIntoView({behavior:"smooth", block:"start"});
  showToast("صفحة الدعاء");
}

function closeDuaPage(){
  const duaPage = $("duaPage");
  if(!duaPage) return;
  duaPage.style.display = "none";
}

function wireDuaPage(){
  const duaBtn = $("duaBtn");
  const closeBtn = $("closeDuaBtn");
  const saveBtn = $("saveDuaBtn");
  const clearBtn = $("clearDuaBtn");
  const input = $("duaInput");

  if(duaBtn) duaBtn.addEventListener("click", openDuaPage);
  if(closeBtn) closeBtn.addEventListener("click", closeDuaPage);

  if(saveBtn && input){
    saveBtn.addEventListener("click", () => {
      const val = (input.value || "").trim();
      if(!val){
        showToast("اكتب/ي دعاء أولاً");
        return;
      }
      const saved = getSavedDuas();
      // avoid duplicates (simple)
      if(saved.includes(val)){
        showToast("موجود مسبقاً");
        return;
      }
      saved.unshift(val);
      setSavedDuas(saved);
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

/* Call this once after your existing boot() finishes */
wireDuaPage();