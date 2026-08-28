/* =========================================================
   CANDICE — BACKSTAGE ADMIN
   All admin logic lives here. Nothing admin-related appears
   in the DOM until this script runs and injects it.

   Trigger: Ctrl / Cmd + Shift + K   or add #backstage to URL
   Default password: candice2026  (change inside → Settings)
   ========================================================= */
(function(){

const LS = {
  token:'candice_admin_token',
  session:'candice_admin_session',
  content:'candice_content',
  media:'candice_media',
  links:'candice_links',
  blocked:'candice_blocked_countries'
};

/* ---------- Country list ---------- */
const COUNTRIES = [
  ["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AS","American Samoa"],["AD","Andorra"],["AO","Angola"],["AI","Anguilla"],["AG","Antigua and Barbuda"],["AR","Argentina"],["AM","Armenia"],["AW","Aruba"],["AU","Australia"],["AT","Austria"],["AZ","Azerbaijan"],["BS","Bahamas"],["BH","Bahrain"],["BD","Bangladesh"],["BB","Barbados"],["BY","Belarus"],["BE","Belgium"],["BZ","Belize"],["BJ","Benin"],["BM","Bermuda"],["BT","Bhutan"],["BO","Bolivia"],["BA","Bosnia and Herzegovina"],["BW","Botswana"],["BR","Brazil"],["BN","Brunei"],["BG","Bulgaria"],["BF","Burkina Faso"],["BI","Burundi"],["KH","Cambodia"],["CM","Cameroon"],["CA","Canada"],["CV","Cape Verde"],["KY","Cayman Islands"],["CF","Central African Republic"],["TD","Chad"],["CL","Chile"],["CN","China"],["CO","Colombia"],["KM","Comoros"],["CG","Congo"],["CD","Congo (DRC)"],["CR","Costa Rica"],["CI","Côte d'Ivoire"],["HR","Croatia"],["CU","Cuba"],["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],["DJ","Djibouti"],["DM","Dominica"],["DO","Dominican Republic"],["EC","Ecuador"],["EG","Egypt"],["SV","El Salvador"],["GQ","Equatorial Guinea"],["ER","Eritrea"],["EE","Estonia"],["SZ","Eswatini"],["ET","Ethiopia"],["FJ","Fiji"],["FI","Finland"],["FR","France"],["GA","Gabon"],["GM","Gambia"],["GE","Georgia"],["DE","Germany"],["GH","Ghana"],["GI","Gibraltar"],["GR","Greece"],["GL","Greenland"],["GD","Grenada"],["GU","Guam"],["GT","Guatemala"],["GN","Guinea"],["GW","Guinea-Bissau"],["GY","Guyana"],["HT","Haiti"],["HN","Honduras"],["HK","Hong Kong"],["HU","Hungary"],["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IR","Iran"],["IQ","Iraq"],["IE","Ireland"],["IL","Israel"],["IT","Italy"],["JM","Jamaica"],["JP","Japan"],["JO","Jordan"],["KZ","Kazakhstan"],["KE","Kenya"],["KI","Kiribati"],["KP","North Korea"],["KR","South Korea"],["KW","Kuwait"],["KG","Kyrgyzstan"],["LA","Laos"],["LV","Latvia"],["LB","Lebanon"],["LS","Lesotho"],["LR","Liberia"],["LY","Libya"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],["MO","Macau"],["MG","Madagascar"],["MW","Malawi"],["MY","Malaysia"],["MV","Maldives"],["ML","Mali"],["MT","Malta"],["MH","Marshall Islands"],["MR","Mauritania"],["MU","Mauritius"],["MX","Mexico"],["FM","Micronesia"],["MD","Moldova"],["MC","Monaco"],["MN","Mongolia"],["ME","Montenegro"],["MA","Morocco"],["MZ","Mozambique"],["MM","Myanmar"],["NA","Namibia"],["NR","Nauru"],["NP","Nepal"],["NL","Netherlands"],["NZ","New Zealand"],["NI","Nicaragua"],["NE","Niger"],["NG","Nigeria"],["MK","North Macedonia"],["NO","Norway"],["OM","Oman"],["PK","Pakistan"],["PW","Palau"],["PS","Palestine"],["PA","Panama"],["PG","Papua New Guinea"],["PY","Paraguay"],["PE","Peru"],["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["PR","Puerto Rico"],["QA","Qatar"],["RO","Romania"],["RU","Russia"],["RW","Rwanda"],["WS","Samoa"],["SM","San Marino"],["SA","Saudi Arabia"],["SN","Senegal"],["RS","Serbia"],["SC","Seychelles"],["SL","Sierra Leone"],["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["SB","Solomon Islands"],["SO","Somalia"],["ZA","South Africa"],["SS","South Sudan"],["ES","Spain"],["LK","Sri Lanka"],["SD","Sudan"],["SR","Suriname"],["SE","Sweden"],["CH","Switzerland"],["SY","Syria"],["TW","Taiwan"],["TJ","Tajikistan"],["TZ","Tanzania"],["TH","Thailand"],["TL","Timor-Leste"],["TG","Togo"],["TO","Tonga"],["TT","Trinidad and Tobago"],["TN","Tunisia"],["TR","Turkey"],["TM","Turkmenistan"],["TV","Tuvalu"],["UG","Uganda"],["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States"],["UY","Uruguay"],["UZ","Uzbekistan"],["VU","Vanuatu"],["VA","Vatican City"],["VE","Venezuela"],["VN","Vietnam"],["YE","Yemen"],["ZM","Zambia"],["ZW","Zimbabwe"]
];

/* ---------- Editable selectors (text) ---------- */
const EDITABLE_SELECTORS = [
  '.hero h1 .line span','.hero p.lead',
  '.hero-meta-item .k','.hero-meta-item .v',
  '.eyebrow','.section-eyebrow','h2','h3','.lead',
  '.about-quote','.gift-quote','.card p','.card-num','.tag','.tile-label',
  '.location','.travel-row .place','.travel-row .dates',
  '.contact-label','.contact-handle',
  '.pay-card p','.pay-detail',
  '.faq summary h3','.faq p',
  '.privacy-note','.foot-brand','.foot-note'
];

/* ---------- Media slot selectors ---------- */
const MEDIA_SLOTS = [
  {sel:'.gallery-grid .tile', kind:'image'},
  {sel:'.video-frame', kind:'video'}
];

/* ---------- Editable link selectors ---------- */
const LINK_SELECTORS = ['.pay-btn','.contact-btn','.hero-social .hs-btn'];

/* =========================================================
   INJECT ADMIN HTML INTO DOM
   ========================================================= */
function injectAdminHTML(){
  const html = `
<div class="geo-block" id="geoBlock">
  <div class="geo-card">
    <div class="age-eyebrow" style="color:var(--crimson-hot)">ACCESS RESTRICTED</div>
    <h2>Not available <br>in your region.</h2>
    <p>Regrettably, this private experience isn't currently accessible from your location.
       Thank you for your understanding — discretion works both ways.</p>
    <div class="country" id="geoCountry">—</div>
  </div>
</div>

<div class="geo-blur-banner" id="geoBlurBanner" data-testid="geo-blur-banner">
  <span class="gbb-dot"></span>Some content is hidden for privacy in your region
</div>

<div class="admin-login" id="adminLogin" role="dialog" aria-modal="true">
  <div class="admin-login-card">
    <h3>Backstage.</h3>
    <p>Enter your password to edit the site.</p>
    <input type="password" class="admin-input" id="adminPassInput" placeholder="Password" autocomplete="off">
    <div class="admin-row">
      <button class="admin-btn ghost" id="btnAdminCancel">CANCEL</button>
      <button class="admin-btn" id="btnAdminEnter">ENTER</button>
    </div>
    <div class="admin-err" id="adminErr"></div>
  </div>
</div>

<aside class="admin-panel" id="adminPanel" aria-label="Admin panel">
  <div class="admin-head">
    <h4>Backstage · Candice</h4>
    <button class="admin-close" id="btnAdminClose" aria-label="Close">×</button>
  </div>

  <div class="admin-tabs">
    <button class="admin-tab active" data-tab="edit">EDIT</button>
    <button class="admin-tab" data-tab="requests">REQUESTS</button>
    <button class="admin-tab" data-tab="stats">STATS</button>
    <button class="admin-tab" data-tab="geo">COUNTRIES</button>
    <button class="admin-tab" data-tab="settings">SETTINGS</button>
  </div>

  <div class="admin-body">
    <div class="admin-section active" data-section="edit">
      <div class="admin-tip">Turn on edit mode, then click any text or media slot on the page to change it. Your edits save automatically to this browser.</div>
      <div class="edit-status" id="editStatus">
        <div class="sw"></div>
        <span>Edit mode</span>
        <small>OFF</small>
      </div>
      <div class="admin-label">Editable text</div>
      <div class="admin-tip">Headings, paragraphs, captions, contact handles, payment details, travel dates, tags.</div>
      <div class="admin-label">Editable media</div>
      <div class="admin-tip">Gallery tiles (photos) and the featured video slot. Uploads are stored in the cloud and visible to every visitor — or paste any URL.</div>
      <div class="admin-label">Editable links</div>
      <div class="admin-tip">With edit mode ON, click any contact, social or payment button to change where it points (Telegram, Wise, PayPal…).</div>
      <div class="admin-label">Reset</div>
      <button class="admin-action-btn danger" id="btnResetText">↺&nbsp;&nbsp;Restore original text</button>
      <button class="admin-action-btn danger" id="btnResetMedia" style="margin-top:8px">↺&nbsp;&nbsp;Remove all uploaded media</button>
    </div>

    <div class="admin-section" data-section="requests">
      <div class="blocked-count" id="reqCount">Loading…</div>
      <div class="req-list" id="reqList"></div>
      <div class="admin-tip" id="reqErr" style="display:none;color:var(--crimson-hot)">Couldn't load requests — backend unreachable.</div>
    </div>

    <div class="admin-section" data-section="stats">
      <div class="admin-tip">Distinct admirers per day — counted once per visitor per day. Your own backstage visits are never counted.</div>
      <div class="stats-grid">
        <div class="stat-box"><b id="statToday">—</b><span>Today</span></div>
        <div class="stat-box"><b id="statWeek">—</b><span>Last 7 days</span></div>
        <div class="stat-box"><b id="statAll">—</b><span>All time</span></div>
      </div>
      <div class="admin-label" style="margin-top:20px">Where they visit from</div>
      <div class="country-stats" id="countryStats"><div class="admin-tip">No country data yet.</div></div>
      <div class="admin-tip" id="statsErr" style="display:none;color:var(--crimson-hot)">Couldn't load stats — backend unreachable.</div>
    </div>

    <div class="admin-section" data-section="geo">
      <div class="admin-tip">Blocked visitors still see your site, but the escort / in-person details (location, travel dates, availability, the in-person options) are blurred out. Everything else stays readable. Detection uses their public IP.</div>
      <div class="blocked-count" id="blockedCount">0 countries blocked</div>
      <input type="text" class="country-search" id="countrySearch" placeholder="Search country…">
      <div class="country-list" id="countryList"></div>
      <button class="admin-btn" id="btnPreviewGeo" data-testid="preview-blocked-btn" style="margin-top:14px;width:100%">👁 Preview as blocked country</button>
      <div class="admin-tip warn" style="margin-top:12px">Tip: your own visits are exempt on this device while you're logged in to backstage. Use the preview button above to see exactly what a blocked visitor sees.</div>
    </div>

    <div class="admin-section" data-section="settings">
      <div class="admin-label">Change admin password</div>
      <input type="password" class="admin-input" id="newPass" placeholder="New password" autocomplete="new-password">
      <div class="admin-row">
        <button class="admin-btn" id="btnSavePass">SAVE PASSWORD</button>
      </div>
      <div class="admin-label" style="margin-top:24px">How to reopen this panel</div>
      <div class="admin-tip">Press <strong style="color:var(--champagne)">Ctrl / ⌘ + Shift + K</strong> anywhere on the site, or add <strong style="color:var(--champagne)">#backstage</strong> to the URL.</div>
      <div class="admin-label">Session</div>
      <button class="admin-action-btn" id="btnLogout">→&nbsp;&nbsp;Log out of backstage</button>
    </div>
  </div>

  <div class="admin-actions">
    <button class="admin-action-btn primary" id="btnExport">⬇&nbsp;&nbsp;Export as index.html (with edits baked in)</button>
  </div>
</aside>

<div class="media-picker" id="mediaPicker">
  <div class="media-picker-card">
    <h3 id="mediaPickerTitle">Change photo</h3>
    <p>Upload from this device, or paste a URL from anywhere on the web.</p>
    <div class="media-tabs">
      <button class="media-tab active" data-mtab="upload">UPLOAD</button>
      <button class="media-tab" data-mtab="url">URL</button>
    </div>
    <div id="mediaTabUpload">
      <label class="media-drop" id="mediaDrop">
        <span class="big">Drop file or click to browse</span>
        <span id="mediaDropHint">JPG · PNG · WEBP · GIF up to ~4 MB</span>
        <input type="file" id="mediaFile" accept="image/*">
      </label>
    </div>
    <div id="mediaTabUrl" style="display:none">
      <input type="text" class="admin-input" id="mediaUrl" placeholder="https://…">
      <div class="admin-tip" style="margin-top:12px">Tip: for video, paste a direct <strong>.mp4</strong> URL (YouTube/Vimeo embeds are not supported here).</div>
    </div>
    <div class="admin-row" style="margin-top:18px">
      <button class="admin-btn ghost" id="btnMediaCancel">CANCEL</button>
      <button class="admin-btn ghost" id="btnMediaRemove">REMOVE MEDIA</button>
      <button class="admin-btn" id="btnMediaSave">SAVE</button>
    </div>
  </div>
</div>

<div class="admin-toast" id="adminToast"></div>
`;
  document.body.insertAdjacentHTML('beforeend', html);
}

/* =========================================================
   TAG EDITABLE ELEMENTS
   ========================================================= */
let editableIdCounter = 0;
function tagEditable(){
  EDITABLE_SELECTORS.forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{
      if(el.closest('.admin-panel')||el.closest('.admin-login')||el.closest('.geo-block')||el.closest('.age-gate')||el.closest('.media-picker')) return;
      if(!el.dataset.edit) el.dataset.edit = 'e'+(++editableIdCounter);
    });
  });
}
let linkIdCounter = 0;
function tagLinks(){
  LINK_SELECTORS.forEach(sel=>{
    document.querySelectorAll(sel).forEach(el=>{
      if(!el.dataset.link) el.dataset.link = 'l'+(++linkIdCounter);
    });
  });
}
function loadLinks(){
  try{
    const raw = localStorage.getItem(LS.links);
    if(raw){
      const data = JSON.parse(raw);
      Object.keys(data).forEach(id=>{
        const el = document.querySelector('[data-link="'+id+'"]');
        if(el) el.setAttribute('href', data[id]);
      });
    }
  }catch(e){}
}
function saveLink(el, url){
  el.setAttribute('href', url);
  try{
    const data = JSON.parse(localStorage.getItem(LS.links)||'{}');
    data[el.dataset.link] = url;
    localStorage.setItem(LS.links, JSON.stringify(data));
    showToast('Link updated');
  }catch(e){showToast('Storage full')}
}
function handleLinkEditClick(e){
  if(!editMode) return;
  const link = e.target.closest('[data-link]');
  if(!link) return;
  e.preventDefault();
  e.stopPropagation();
  if(e.target.closest('[data-edit]')) return; // let text editing happen
  const current = link.getAttribute('href') || '';
  const url = prompt('Link URL for this button:', current);
  if(url && url.trim()) saveLink(link, url.trim());
}

let mediaIdCounter = 0;
function tagMedia(){
  MEDIA_SLOTS.forEach(({sel,kind})=>{
    document.querySelectorAll(sel).forEach(el=>{
      if(!el.dataset.media){
        el.dataset.media = kind;
        el.dataset.mid = 'm'+(++mediaIdCounter);
        const btn = document.createElement('button');
        btn.className='media-edit-btn';
        btn.type='button';
        btn.textContent = kind==='video' ? '▶ Change video' : '✎ Change photo';
        btn.addEventListener('click',(e)=>{
          e.preventDefault();e.stopPropagation();
          openMediaPicker(el);
        });
        el.appendChild(btn);
      }
    });
  });
}

/* =========================================================
   CONTENT PERSISTENCE
   ========================================================= */
function loadContent(){
  try{
    const raw = localStorage.getItem(LS.content);
    if(raw){
      const data = JSON.parse(raw);
      Object.keys(data).forEach(id=>{
        const el = document.querySelector('[data-edit="'+id+'"]');
        if(el) el.innerHTML = data[id];
      });
    }
  }catch(e){}
}
function saveContent(){
  const data = {};
  document.querySelectorAll('[data-edit]').forEach(el=>{
    data[el.dataset.edit] = el.innerHTML;
  });
  try{localStorage.setItem(LS.content, JSON.stringify(data));showToast('Saved');}catch(e){showToast('Storage full')}
}
function loadMedia(){
  try{
    const raw = localStorage.getItem(LS.media);
    if(raw){
      const data = JSON.parse(raw);
      Object.keys(data).forEach(mid=>applyMedia(mid, data[mid]));
    }
  }catch(e){}
}
function getMediaStore(){
  try{return JSON.parse(localStorage.getItem(LS.media)||'{}')}catch(e){return {}}
}
function setMediaStore(store){
  try{localStorage.setItem(LS.media, JSON.stringify(store));return true;}
  catch(e){showToast('File too large');return false;}
}
function applyMedia(mid, src){
  const el = document.querySelector('[data-mid="'+mid+'"]');
  if(!el || !src) return;
  el.querySelectorAll('.injected-media').forEach(n=>n.remove());
  const tag = el.dataset.media==='video' ? 'video' : 'img';
  const node = document.createElement(tag);
  node.className='injected-media';
  node.src = src;
  if(tag==='video'){
    node.muted = true; node.loop = true; node.autoplay = true; node.playsInline = true;
    node.setAttribute('preload','metadata');
  } else {
    node.alt='';
  }
  el.insertBefore(node, el.firstChild);
  el.classList.add('has-media');
}
function clearMedia(mid){
  const el = document.querySelector('[data-mid="'+mid+'"]');
  if(el){
    el.querySelectorAll('.injected-media').forEach(n=>n.remove());
    el.classList.remove('has-media');
  }
  const store = getMediaStore();
  delete store[mid];
  setMediaStore(store);
}

function resetContent(){
  if(!confirm('Restore all text to the original? Your edits will be lost.')) return;
  try{localStorage.removeItem(LS.content);localStorage.removeItem(LS.links)}catch(e){}
  location.reload();
}
function resetMedia(){
  if(!confirm('Remove every uploaded photo and video? Original placeholders will return.')) return;
  try{localStorage.removeItem(LS.media)}catch(e){}
  location.reload();
}

/* =========================================================
   TOAST
   ========================================================= */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('adminToast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}

/* =========================================================
   EDIT MODE
   ========================================================= */
let editMode = false;
function toggleEditMode(){
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  const st = document.getElementById('editStatus');
  st.classList.toggle('on', editMode);
  st.querySelector('small').textContent = editMode ? 'ON' : 'OFF';
  document.querySelectorAll('[data-edit]').forEach(el=>{
    el.contentEditable = editMode ? 'true' : 'false';
    if(editMode && !el._bound){
      el._bound = true;
      el.addEventListener('blur', saveContent);
      el.addEventListener('keydown', e=>{
        if(e.key==='Enter' && !e.shiftKey && el.tagName!=='P' && !el.classList.contains('lead') && !el.classList.contains('privacy-note')){
          e.preventDefault();el.blur();
        }
      });
    }
  });
}

/* =========================================================
   MEDIA PICKER
   ========================================================= */
let currentMediaTarget = null;
let currentMediaTab = 'upload';
function openMediaPicker(el){
  currentMediaTarget = el;
  const isVideo = el.dataset.media==='video';
  document.getElementById('mediaPickerTitle').textContent = isVideo ? 'Change video' : 'Change photo';
  document.getElementById('mediaFile').accept = isVideo ? 'video/*' : 'image/*';
  document.getElementById('mediaDropHint').textContent = isVideo
    ? 'MP4 · WEBM up to 200 MB — stored in the cloud'
    : 'JPG · PNG · WEBP · GIF up to 15 MB — stored in the cloud';
  document.getElementById('mediaUrl').value = '';
  document.getElementById('mediaFile').value = '';
  setMediaTab('upload');
  document.getElementById('mediaPicker').classList.add('show');
}
function closeMediaPicker(){
  document.getElementById('mediaPicker').classList.remove('show');
  currentMediaTarget = null;
}
function setMediaTab(name){
  currentMediaTab = name;
  document.querySelectorAll('.media-tab').forEach(b=>b.classList.toggle('active', b.dataset.mtab===name));
  document.getElementById('mediaTabUpload').style.display = name==='upload' ? 'block' : 'none';
  document.getElementById('mediaTabUrl').style.display = name==='url' ? 'block' : 'none';
}
/* ---------- Cloud upload (chunked, bypasses proxy limits) ---------- */
async function uploadToCloud(file, onProgress){
  const API = location.origin;
  const headers = {'Authorization': 'Bearer '+getToken()};
  const initR = await fetch(API+'/api/media/upload/init',{
    method:'POST',
    headers:Object.assign({'Content-Type':'application/json'}, headers),
    body:JSON.stringify({filename:file.name, content_type:file.type||'application/octet-stream'})
  });
  if(initR.status===401) throw new Error('Wrong upload password');
  if(!initR.ok) throw new Error('Upload init failed');
  const {upload_id} = await initR.json();
  const CHUNK = 1024*1024;
  const total = Math.max(1, Math.ceil(file.size/CHUNK));
  for(let i=0;i<total;i++){
    const fd = new FormData();
    fd.append('upload_id', upload_id);
    fd.append('index', i);
    fd.append('chunk', file.slice(i*CHUNK,(i+1)*CHUNK));
    const r = await fetch(API+'/api/media/upload/chunk',{method:'POST',headers,body:fd});
    if(!r.ok) throw new Error('Upload interrupted');
    if(onProgress) onProgress(Math.round(((i+1)/total)*100));
  }
  const doneR = await fetch(API+'/api/media/upload/complete',{
    method:'POST',
    headers:Object.assign({'Content-Type':'application/json'}, headers),
    body:JSON.stringify({upload_id, total_chunks: total})
  });
  if(!doneR.ok) throw new Error('Upload finalize failed');
  const d = await doneR.json();
  return API + d.url;
}
async function saveMediaFromPicker(){
  if(!currentMediaTarget) return;
  const mid = currentMediaTarget.dataset.mid;
  let src = null;
  if(currentMediaTab==='upload'){
    const f = document.getElementById('mediaFile').files[0];
    if(!f){ showToast('Pick a file first'); return; }
    const isVideo = currentMediaTarget.dataset.media==='video';
    const limitMB = isVideo ? 200 : 15;
    if(f.size > limitMB * 1024 * 1024){ showToast('File too large (>'+limitMB+' MB)'); return; }
    const hint = document.getElementById('mediaDropHint');
    const saveBtn = document.getElementById('btnMediaSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'UPLOADING…';
    try{
      src = await uploadToCloud(f, p=>{ hint.textContent = 'Uploading to cloud… '+p+'%'; });
    }catch(e){
      showToast(e.message||'Upload failed');
      saveBtn.disabled = false; saveBtn.textContent = 'SAVE';
      hint.textContent = 'Upload failed — try again';
      return;
    }
    saveBtn.disabled = false; saveBtn.textContent = 'SAVE';
  } else {
    src = document.getElementById('mediaUrl').value.trim();
    if(!src){ showToast('Paste a URL'); return; }
  }
  const store = getMediaStore();
  store[mid] = src;
  if(setMediaStore(store)){
    applyMedia(mid, src);
    showToast('Media saved');
    closeMediaPicker();
  }
}
function removeMediaFromPicker(){
  if(!currentMediaTarget) return;
  clearMedia(currentMediaTarget.dataset.mid);
  showToast('Media removed');
  closeMediaPicker();
}

/* =========================================================
   ADMIN LOGIN
   ========================================================= */
function getToken(){try{return sessionStorage.getItem(LS.token)||'';}catch(e){return '';}}
function authHeaders(extra){return Object.assign({'Authorization':'Bearer '+getToken()}, extra||{});}
function isLoggedIn(){return !!getToken();}
function openAdminLogin(){
  if(isLoggedIn()){openAdmin();return;}
  const modal = document.getElementById('adminLogin');
  modal.classList.add('show');
  setTimeout(()=>document.getElementById('adminPassInput').focus(),100);
}
function closeAdminLogin(){
  document.getElementById('adminLogin').classList.remove('show');
  document.getElementById('adminPassInput').value='';
  document.getElementById('adminErr').textContent='';
}
async function submitAdminLogin(){
  const v = document.getElementById('adminPassInput').value;
  const errEl = document.getElementById('adminErr');
  errEl.textContent = 'Checking…';
  try{
    const r = await fetch(location.origin+'/api/admin/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:v})
    });
    if(r.status===429){ errEl.textContent = 'Too many attempts. Wait 15 minutes.'; return; }
    if(!r.ok){ errEl.textContent = 'Wrong password.'; return; }
    const d = await r.json();
    try{sessionStorage.setItem(LS.token, d.token);}catch(e){}
    closeAdminLogin();
    openAdmin();
  }catch(e){
    errEl.textContent = 'Server unreachable. Try again.';
  }
}
function openAdmin(){
  document.getElementById('adminPanel').classList.add('show');
  renderCountryList();
  updateBlockedCount();
  syncBlockedFromServer();
}
function closeAdmin(){
  document.getElementById('adminPanel').classList.remove('show');
  if(editMode) toggleEditMode();
}
function logoutAdmin(){
  try{sessionStorage.removeItem(LS.token);}catch(e){}
  closeAdmin();
  showToast('Logged out');
}
function switchTab(name){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.toggle('active', s.dataset.section===name));
  if(name==='stats') loadStats();
  if(name==='requests') loadRequests();
  if(name==='geo') syncBlockedFromServer();
}
async function loadRequests(){
  const list = document.getElementById('reqList');
  const err = document.getElementById('reqErr');
  const cnt = document.getElementById('reqCount');
  err.style.display='none';
  try{
    const r = await fetch(location.origin+'/api/bookings',{headers:authHeaders()});
    if(!r.ok) throw new Error();
    const d = await r.json();
    cnt.textContent = d.items.length ? (d.new_count+' new · '+d.items.length+' total') : 'No requests yet';
    list.innerHTML = d.items.map(b=>{
      const when = new Date(b.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<div class="req-card '+(b.status==='new'?'unread':'')+'" data-id="'+b.id+'">'
        + '<div class="req-top"><span class="req-name">'+esc(b.name)+'</span><span class="req-time">'+when+'</span></div>'
        + '<div class="req-meta">'+esc(b.session_type)+(b.mode?' · '+esc(b.mode):'')+' · '+esc(b.channel)+' → <b>'+esc(b.handle)+'</b></div>'
        + (b.preferred?'<div class="req-meta">Prefers: '+esc(b.preferred)+'</div>':'')
        + '<div class="req-msg">'+esc(b.message)+'</div>'
        + '<div class="req-actions">'
        + (b.status==='new'?'<button class="req-btn done" data-act="done">✓ Mark handled</button>':'<span class="req-handled">Handled</span>')
        + '<button class="req-btn del" data-act="del">Delete</button>'
        + '</div></div>';
    }).join('');
    list.querySelectorAll('.req-btn').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.closest('.req-card').dataset.id;
        const act = btn.dataset.act;
        try{
          if(act==='del'){
            if(!confirm('Delete this request?')) return;
            await fetch(location.origin+'/api/bookings/'+id,{method:'DELETE',headers:authHeaders()});
          } else {
            await fetch(location.origin+'/api/bookings/'+id+'/status',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({status:'handled'})});
          }
          loadRequests();
        }catch(e){showToast('Action failed')}
      };
    });
  }catch(e){
    cnt.textContent='—';
    err.style.display='block';
  }
}
function esc(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function loadStats(){
  const err = document.getElementById('statsErr');
  err.style.display='none';
  try{
    const r = await fetch(location.origin+'/api/visits/stats',{headers:authHeaders()});
    if(r.status===401){
      err.textContent = "Couldn't load stats — password doesn't match the server. Re-set it in Settings.";
      err.style.display='block';
      return;
    }
    if(!r.ok) throw new Error();
    const d = await r.json();
    document.getElementById('statToday').textContent = d.today;
    document.getElementById('statWeek').textContent = d.week;
    document.getElementById('statAll').textContent = d.all_time;
    const cs = document.getElementById('countryStats');
    if(d.countries && d.countries.length){
      const max = d.countries[0].count;
      cs.innerHTML = d.countries.map(c=>{
        const name = (COUNTRIES.find(x=>x[0]===c.code)||[])[1] || c.code;
        const pct = Math.max(6, Math.round((c.count/max)*100));
        return '<div class="cstat-row"><span class="cstat-name">'+name+'</span>'
             + '<span class="cstat-bar"><i style="width:'+pct+'%"></i></span>'
             + '<span class="cstat-n">'+c.count+'</span></div>';
      }).join('');
    } else {
      cs.innerHTML = '<div class="admin-tip">No country data yet.</div>';
    }
  }catch(e){
    err.textContent = "Couldn't load stats — backend unreachable.";
    err.style.display='block';
  }
}
async function changePassword(){
  const v = document.getElementById('newPass').value.trim();
  if(v.length<4){showToast('Too short');return;}
  try{
    const r = await fetch(location.origin+'/api/admin/password',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({current:getPass(), new:v})
    });
    if(r.status===401){showToast('Backend rejected current password');return;}
    if(!r.ok){showToast('Server error — try again');return;}
    try{localStorage.setItem(LS.pass, v)}catch(e){}
    document.getElementById('newPass').value='';
    showToast('Password updated everywhere');
  }catch(e){
    // Do NOT save locally when the server can't confirm — that would desync
    // the browser password from the backend and break stats/bookings/uploads.
    showToast('Backend unreachable — password unchanged');
  }
}

/* =========================================================
   COUNTRY BLOCK
   ========================================================= */
function getBlocked(){try{return JSON.parse(localStorage.getItem(LS.blocked)||'[]')}catch(e){return []}}
function setBlocked(list){try{localStorage.setItem(LS.blocked, JSON.stringify(list))}catch(e){}}
async function syncBlockedFromServer(){
  try{
    const r = await fetch(location.origin+'/api/blocked-countries',{cache:'no-store'});
    if(r.ok){ const d = await r.json(); setBlocked(d.countries||[]); renderCountryList(); updateBlockedCount(); }
  }catch(e){}
}
async function toggleBlocked(code){
  const b = getBlocked();
  const i = b.indexOf(code);
  if(i>=0) b.splice(i,1); else b.push(code);
  setBlocked(b);
  renderCountryList();
  updateBlockedCount();
  try{
    const r = await fetch(location.origin+'/api/blocked-countries',{
      method:'POST',
      headers:authHeaders({'Content-Type':'application/json'}),
      body:JSON.stringify({countries:b})
    });
    if(r.status===401){ showToast('Not saved — password out of sync'); return; }
    if(!r.ok){ showToast('Not saved — server error'); return; }
    showToast(i>=0?'Unblocked — live for visitors':'Blocked — live for visitors');
  }catch(e){ showToast('Saved on this device only — backend offline'); }
}
function updateBlockedCount(){
  const n = getBlocked().length;
  const el = document.getElementById('blockedCount');
  if(el) el.textContent = n+' '+(n===1?'country':'countries')+' blocked';
}
function renderCountryList(){
  const searchEl = document.getElementById('countrySearch');
  const listEl = document.getElementById('countryList');
  if(!listEl) return;
  const q = (searchEl?searchEl.value:'').toLowerCase();
  const blocked = getBlocked();
  const list = COUNTRIES.filter(c=>c[1].toLowerCase().includes(q)||c[0].toLowerCase().includes(q));
  listEl.innerHTML = list.map(([code,name])=>{
    const isB = blocked.includes(code);
    return '<div class="country-row '+(isB?'blocked':'')+'" data-code="'+code+'">'
         + '<span>'+name+'</span>'
         + '<span class="code">'+(isB?'× BLOCKED':code)+'</span>'
         + '</div>';
  }).join('') || '<div style="padding:20px;color:var(--dim);text-align:center;font-size:12px">No matches</div>';
  listEl.querySelectorAll('.country-row').forEach(r=>{
    r.addEventListener('click',()=>toggleBlocked(r.dataset.code));
  });
}
async function enforceGeoBlock(){
  if(isLoggedIn()) return;
  let blocked = [];
  try{
    const r = await fetch(location.origin+'/api/blocked-countries',{cache:'no-store'});
    if(r.ok){ const d = await r.json(); blocked = d.countries||[]; }
    else blocked = getBlocked();
  }catch(e){ blocked = getBlocked(); }
  if(!blocked.length) return;
  try{
    const r = await fetch(location.origin+'/api/geo', {cache:'no-store'});
    const d = await r.json();
    const code = (d.country_code||'').toUpperCase();
    if(code && blocked.includes(code)){
      const name = (COUNTRIES.find(c=>c[0]===code)||[])[1] || code;
      const cEl = document.getElementById('geoCountry');
      if(cEl) cEl.textContent = name;
      restrictSensitive();
    }
  }catch(e){}
}

/* Apply country privacy: hide escort / in-person tells, remove in-person options */
function restrictSensitive(){
  document.body.classList.add('geo-blur');
  document.querySelectorAll('select option').forEach(opt=>{
    if(/in person/i.test(opt.textContent)) opt.remove();
  });
}
window.enforceGeoBlock = enforceGeoBlock;
window.restrictSensitive = restrictSensitive;

/* =========================================================
   EXPORT (bakes edits + media + blocklist + password into ONE file)
   ========================================================= */
async function exportSite(){
  // Snapshot base HTML (before admin injection). We take current index HTML
  // and strip the admin-injected nodes, then inline admin.css + admin.js.
  const clone = document.documentElement.cloneNode(true);
  ['adminPanel','adminLogin','adminToast','geoBlock','mediaPicker'].forEach(id=>{
    const n = clone.querySelector('#'+id);
    if(n) n.remove();
  });
  // Strip runtime helpers
  clone.querySelectorAll('.media-edit-btn').forEach(n=>n.remove());
  clone.querySelectorAll('[data-edit]').forEach(el=>{
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-edit');
  });
  clone.querySelectorAll('[data-media]').forEach(el=>{
    el.classList.remove('has-media');
    // keep data-media and data-mid so imported file rewires media
  });
  const body = clone.querySelector('body');
  if(body) body.className = '';

  // Fetch admin.css + admin.js and inline them
  let adminCss='', adminJs='';
  try{
    adminCss = await (await fetch('admin.css')).text();
    adminJs  = await (await fetch('admin.js')).text();
  }catch(e){}

  const head = clone.querySelector('head');
  const linkNode = head && head.querySelector('link[href="admin.css"]');
  if(linkNode) linkNode.remove();
  const scriptRef = clone.querySelector('script[src="admin.js"]');
  if(scriptRef) scriptRef.remove();

  if(head){
    const styleEl = clone.ownerDocument.createElement('style');
    styleEl.textContent = adminCss;
    head.appendChild(styleEl);
  }

  // Bake current state into a boot script (runs before admin.js so values pre-seed localStorage)
  const stateBoot = `
<script>
(function(){try{
  var K={pass:'candice_admin_pass',content:'candice_content',media:'candice_media',links:'candice_links',blocked:'candice_blocked_countries'};
  if(!localStorage.getItem(K.blocked)) localStorage.setItem(K.blocked, ${JSON.stringify(localStorage.getItem(LS.blocked)||'[]')});
  if(!localStorage.getItem(K.pass))    localStorage.setItem(K.pass,    ${JSON.stringify(getPass())});
  if(!localStorage.getItem(K.content)) localStorage.setItem(K.content, ${JSON.stringify(localStorage.getItem(LS.content)||'{}')});
  if(!localStorage.getItem(K.media))   localStorage.setItem(K.media,   ${JSON.stringify(localStorage.getItem(LS.media)||'{}')});
  if(!localStorage.getItem(K.links))   localStorage.setItem(K.links,   ${JSON.stringify(localStorage.getItem(LS.links)||'{}')});
}catch(e){}})();
<\/script>`;

  const inlineAdmin = `<script>${adminJs}<\/script>`;

  let html = '<!doctype html>\n' + clone.outerHTML;
  html = html.replace('</body>', stateBoot + inlineAdmin + '</body>');

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'index.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Exported index.html');
}

/* =========================================================
   BOOTSTRAP
   ========================================================= */
function bindHandlers(){
  document.getElementById('btnAdminCancel').onclick = closeAdminLogin;
  document.getElementById('btnAdminEnter').onclick  = submitAdminLogin;
  document.getElementById('btnAdminClose').onclick  = closeAdmin;
  document.getElementById('btnResetText').onclick   = resetContent;
  document.getElementById('btnResetMedia').onclick  = resetMedia;
  document.getElementById('btnSavePass').onclick    = changePassword;
  document.getElementById('btnLogout').onclick      = logoutAdmin;
  document.getElementById('btnExport').onclick      = exportSite;
  document.getElementById('editStatus').onclick     = toggleEditMode;
  document.getElementById('countrySearch').oninput  = renderCountryList;

  const pvBtn = document.getElementById('btnPreviewGeo');
  if(pvBtn) pvBtn.onclick = () => {
    const on = document.body.classList.toggle('geo-blur');
    pvBtn.textContent = on ? '✕ Exit preview' : '👁 Preview as blocked country';
    pvBtn.classList.toggle('active', on);
  };

  document.querySelectorAll('.admin-tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
  document.querySelectorAll('.media-tab').forEach(b=>b.onclick=()=>setMediaTab(b.dataset.mtab));

  document.getElementById('btnMediaCancel').onclick = closeMediaPicker;
  document.getElementById('btnMediaSave').onclick   = saveMediaFromPicker;
  document.getElementById('btnMediaRemove').onclick = removeMediaFromPicker;

  const drop = document.getElementById('mediaDrop');
  const file = document.getElementById('mediaFile');
  drop.addEventListener('click',(e)=>{if(e.target.tagName!=='INPUT'){file.click();}});
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragover');}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragover');}));
  drop.addEventListener('drop',e=>{
    const f = e.dataTransfer.files[0];
    if(f){file.files = e.dataTransfer.files;}
  });

  document.getElementById('adminPassInput').addEventListener('keydown',e=>{
    if(e.key==='Enter') submitAdminLogin();
    if(e.key==='Escape') closeAdminLogin();
  });
}

function init(){
  injectAdminHTML();
  bindHandlers();
  tagEditable();
  tagMedia();
  tagLinks();
  loadContent();
  loadMedia();
  loadLinks();
  enforceGeoBlock();
  document.addEventListener('click', handleLinkEditClick, true);

  // Keyboard trigger
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key==='K'||e.key==='k')){
      e.preventDefault();
      openAdminLogin();
    }
  });
  // URL hash trigger
  if(location.hash==='#backstage'){
    history.replaceState(null,'',location.pathname);
    setTimeout(openAdminLogin, 400);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
