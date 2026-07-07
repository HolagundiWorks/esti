/**
 * ESE back-office console — a single self-contained page (inline CSS + vanilla
 * JS, no build step, no external assets) served by Fastify. Flat "Community"
 * look: Fog-Gray canvas, Pure-White square cards with a hairline edge, Coal-Black
 * ink and the Radiant-Orange accent. Talks to the /api/* JSON endpoints with the
 * session cookie. Client JS avoids backticks/${} so it nests inside this
 * template literal safely.
 */

const HEAD = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>ESE — Estimation Specification Engine</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    color-scheme: light;
    --canvas:#F2F4F7; --card:#FFFFFF; --ink:#141517; --muted:#5B6570;
    --line:rgba(20,21,23,.12); --accent:#FF4F18; --accent-h:#DB3E0F;
    --ok:#0E7C4A; --warn:#B25E00; --radius:8px;
    --font: "Urbanist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:var(--font); background:var(--canvas); color:var(--ink); }
  a { color:var(--muted); }
  h1,h2,h3 { font-weight:600; letter-spacing:-.01em; margin:0; }
  h1 { text-transform:uppercase; letter-spacing:.02em; } /* headings ALL CAPS */
  button { font-family:inherit; cursor:pointer; }
  input, select, textarea {
    font-family:inherit; font-size:.9rem; color:var(--ink); background:var(--card);
    border:1px solid var(--line); border-radius:var(--radius); padding:.55rem .7rem; width:100%;
  }
  input:focus, select:focus, textarea:focus { outline:2px solid var(--accent); outline-offset:-1px; }
  textarea { min-height:9rem; resize:vertical; font-family:ui-monospace,monospace; font-size:.8rem; }
  label { display:block; font-size:.72rem; font-weight:600; text-transform:uppercase;
    letter-spacing:.06em; color:var(--muted); margin:0 0 .3rem; }
  .field { margin-bottom:.9rem; }
  /* Glass buttons — white liquid-glass slab; hover floods orange-30% + orange
     label; pressed/active label turns orange. One family across the product. */
  /* Flat text buttons — no fill, no border, no box. CTA = orange label; ghost =
     ink; danger = red. On hover the label lifts + gets a bottom orange line. */
  .btn { border:none; border-radius:4px; color:var(--accent); text-transform:capitalize;
    background:transparent; box-shadow:none; padding:.5rem .75rem; font-weight:700; font-size:.85rem;
    transition:transform .13s ease,box-shadow .13s ease,color .13s ease; }
  .btn:hover { background:transparent; color:var(--accent-h); transform:translateY(-2px);
    box-shadow:inset 0 -2px 0 0 #ff4f18; }
  .btn:active { transform:none; color:var(--accent); box-shadow:inset 0 -2px 0 0 #ff4f18; }
  .btn--ghost { background:transparent; color:var(--ink); font-weight:600; }
  .btn--ghost:hover { background:transparent; color:var(--accent-h); box-shadow:inset 0 -2px 0 0 #ff4f18; }
  .btn--danger { background:transparent; color:#B00020; font-weight:600; }
  .btn--danger:hover { background:transparent; color:#B00020; transform:translateY(-2px);
    box-shadow:inset 0 -2px 0 0 #B00020; }
  .btn:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:var(--radius); }
  /* Popups (modal panes) — translucent liquid glass. */
  #pwmodal .card { background:rgba(255,255,255,.74); border:1px solid rgba(255,255,255,.6);
    backdrop-filter:blur(22px) saturate(1.7); -webkit-backdrop-filter:blur(22px) saturate(1.7);
    box-shadow:0 10px 34px rgba(20,21,23,.16), inset 0 1px 0 rgba(255,255,255,.7); }
  .accent-top { border-top:3px solid var(--accent); }
  .muted { color:var(--muted); }
  .row { display:flex; gap:.6rem; align-items:center; }
  .grow { flex:1 1 auto; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  th, td { text-align:left; padding:.55rem .6rem; border-bottom:1px solid var(--line); }
  th { font-size:.68rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  tr[data-clickable]:hover { background:#f6f8fa; cursor:pointer; }
  .tag { display:inline-block; font-size:.68rem; font-weight:600; letter-spacing:.04em;
    padding:.1rem .45rem; border:1px solid var(--line); border-radius:var(--radius); }
  .dot { display:inline-block; width:.5rem; height:.5rem; border-radius:50%; margin-right:.4rem; vertical-align:middle; }
  .alert { border:1px solid rgba(176,0,32,.4); background:rgba(176,0,32,.06); color:#7a0016;
    padding:.6rem .75rem; font-size:.85rem; margin-bottom:.9rem; border-radius:var(--radius); }
  .alert--ok { border-color:rgba(14,124,74,.4); background:rgba(14,124,74,.08); color:#0b5a35; }
  .hidden { display:none !important; }
  code { font-family:ui-monospace,monospace; font-size:.78rem; color:#114C5A; }
</style>
</head><body>`;

const FOOT = `</body></html>`;

// ── Login page ────────────────────────────────────────────────────────────────
export function loginPage(): string {
  return (
    HEAD +
    `<main style="min-height:100vh;display:grid;place-items:center;padding:1rem;">
  <form id="f" class="card accent-top" style="width:100%;max-width:22rem;padding:2rem;">
    <p style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 .1rem;">AORMS · Back office</p>
    <h1 style="font-size:1.35rem;margin-bottom:.15rem;">Estimation Specification Engine</h1>
    <p class="muted" style="font-size:.85rem;margin:0 0 1.4rem;">Sign in to the pack publisher.</p>
    <div id="err" class="alert hidden"></div>
    <div class="field"><label for="u">Username</label><input id="u" autocomplete="username" autofocus /></div>
    <div class="field"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password" /></div>
    <button class="btn" style="width:100%;" id="go" type="submit">Sign in</button>
  </form>
<script>
  var f=document.getElementById('f'), err=document.getElementById('err'), go=document.getElementById('go');
  f.addEventListener('submit', async function(e){
    e.preventDefault(); err.className='alert hidden'; go.disabled=true; go.textContent='Signing in…';
    try {
      var r = await fetch('/api/login', {method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({username:document.getElementById('u').value, password:document.getElementById('p').value})});
      if (!r.ok) { var j=await r.json().catch(function(){return {};}); throw new Error(j.error||'Invalid username or password.'); }
      window.location.href='/';
    } catch(ex) { err.textContent=ex.message; err.className='alert'; go.disabled=false; go.textContent='Sign in'; }
  });
</script>` +
    FOOT
  );
}

// ── Console page ────────────────────────────────────────────────────────────────
export function consolePage(): string {
  return HEAD + CONSOLE_BODY + FOOT;
}

const CONSOLE_BODY = `
<header class="card" style="border-top:none;border-left:none;border-right:none;position:sticky;top:0;z-index:5;">
  <div style="max-width:78rem;margin:0 auto;padding:.7rem 1.2rem;" class="row">
    <div class="grow">
      <span style="font-weight:700;letter-spacing:.02em;">AORMS · ESE</span>
      <span class="muted" style="font-size:.8rem;margin-left:.5rem;">Estimation Specification Engine</span>
    </div>
    <span id="who" class="muted" style="font-size:.85rem;margin-right:.8rem;"></span>
    <button class="btn btn--ghost" id="logout" style="padding:.35rem .7rem;">Log out</button>
  </div>
  <div style="max-width:78rem;margin:0 auto;padding:0 1.2rem;" class="row" id="tabs"></div>
</header>

<main style="max-width:78rem;margin:0 auto;padding:1.4rem 1.2rem;">
  <div id="msg"></div>
  <div id="view"></div>
</main>

<!-- change-password modal -->
<div id="pwmodal" class="hidden" style="position:fixed;inset:0;background:rgba(20,21,23,.45);display:grid;place-items:center;z-index:20;">
  <form id="pwform" class="card accent-top" style="width:100%;max-width:22rem;padding:1.6rem;">
    <h2 style="font-size:1.1rem;margin-bottom:.2rem;">Change password</h2>
    <p class="muted" style="font-size:.82rem;margin:0 0 1rem;" id="pwhint">Set a new password to continue.</p>
    <div id="pwerr" class="alert hidden"></div>
    <div class="field" id="pwcurrentwrap"><label>Current password</label><input id="pwcurrent" type="password" /></div>
    <div class="field"><label>New password</label><input id="pwnew" type="password" /></div>
    <div class="row"><button class="btn grow" type="submit">Update password</button>
      <button class="btn btn--ghost" type="button" id="pwcancel">Cancel</button></div>
  </form>
</div>

<script>
var S = { me:null, tab:'dashboard' };
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function el(id){ return document.getElementById(id); }
async function api(method, path, body){
  var opt = { method:method, headers:{} };
  if (body !== undefined){ opt.headers['content-type']='application/json'; opt.body=JSON.stringify(body); }
  var r = await fetch(path, opt);
  if (r.status===401){ window.location.href='/login'; throw new Error('unauthorized'); }
  var j = await r.json().catch(function(){ return {}; });
  if (!r.ok) throw new Error(j.error || ('HTTP '+r.status));
  return j;
}
function flash(text, ok){ var m=el('msg'); m.innerHTML='<div class="alert '+(ok?'alert--ok':'')+'">'+esc(text)+'</div>';
  setTimeout(function(){ if(el('msg')) el('msg').innerHTML=''; }, 4000); }

var STATUS = ['UPLOADED','CONVERTED','ANALYZED','REVIEWED','PUBLISHED'];
var STATUS_DOT = {UPLOADED:'#5B6570',CONVERTED:'#2563EB',ANALYZED:'#B25E00',REVIEWED:'#0E7C4A',PUBLISHED:'#FF4F18'};
var KINDS = ['DSR','DAR','SPEC','NBC','BYLAW'];

// ── Tabs ──────────────────────────────────────────────────────────
var TABS = [['dashboard','Dashboard'],['sources','Sources'],['packs','Packs'],['users','Users']];
function renderTabs(){
  el('tabs').innerHTML = TABS.map(function(t){
    var on = S.tab===t[0];
    return '<button data-tab="'+t[0]+'" style="border:none;background:none;padding:.7rem .1rem;margin-right:1.3rem;'+
      'font-weight:600;font-size:.9rem;border-bottom:2px solid '+(on?'var(--accent)':'transparent')+';'+
      'color:'+(on?'var(--ink)':'var(--muted)')+';cursor:pointer;">'+t[1]+'</button>';
  }).join('');
  Array.prototype.forEach.call(el('tabs').children, function(b){
    b.onclick=function(){ S.tab=b.getAttribute('data-tab'); renderTabs(); render(); }; });
}
function render(){
  if (S.tab==='dashboard') return renderDashboard();
  if (S.tab==='sources') return renderSources();
  if (S.tab==='packs') return renderPacks();
  if (S.tab==='users') return renderUsers();
}

// ── Dashboard ─────────────────────────────────────────────────────
async function renderDashboard(){
  el('view').innerHTML='<p class="muted">Loading…</p>';
  var d = await api('GET','/api/stats');
  function tile(n,label){ return '<div class="card accent-top" style="padding:1.1rem 1.2rem;flex:1 1 8rem;">'+
    '<div style="font-size:1.8rem;font-weight:700;">'+n+'</div><div class="muted" style="font-size:.8rem;">'+label+'</div></div>'; }
  var byStatus = STATUS.map(function(s){ return '<span class="tag" style="margin-right:.4rem;">'+
    '<span class="dot" style="background:'+STATUS_DOT[s]+'"></span>'+s+' '+(d.sourcesByStatus[s]||0)+'</span>'; }).join('');
  el('view').innerHTML =
    '<div class="row" style="gap:1rem;flex-wrap:wrap;align-items:stretch;margin-bottom:1.2rem;">'+
      tile(d.sources,'Sources')+tile(d.packs,'Published packs')+tile(d.users,'KB-team users')+'</div>'+
    '<div class="card" style="padding:1.1rem 1.2rem;"><h3 style="font-size:.95rem;margin-bottom:.7rem;">Sources by pipeline stage</h3>'+byStatus+'</div>';
}

// ── Sources ───────────────────────────────────────────────────────
async function renderSources(){
  el('view').innerHTML='<p class="muted">Loading…</p>';
  var list = await api('GET','/api/sources');
  var opts = KINDS.map(function(k){ return '<option>'+k+'</option>'; }).join('');
  var form = '<div class="card accent-top" style="padding:1.1rem 1.2rem;margin-bottom:1.2rem;">'+
    '<h3 style="font-size:.95rem;margin-bottom:.8rem;">Add a source</h3>'+
    '<div class="row" style="gap:.7rem;align-items:flex-end;flex-wrap:wrap;">'+
      '<div style="flex:0 0 8rem;"><label>Kind</label><select id="nk">'+opts+'</select></div>'+
      '<div style="flex:1 1 12rem;"><label>Authority</label><input id="na" placeholder="CPWD · KAR-PWD · NBC-2016" /></div>'+
      '<div style="flex:0 0 7rem;"><label>Year</label><input id="ny" type="number" value="2023" /></div>'+
      '<button class="btn" id="addsrc">Add source</button>'+
    '</div></div>';
  var rows = list.map(function(s){
    return '<tr data-clickable data-id="'+s.id+'">'+
      '<td><span class="tag">'+esc(s.kind)+'</span></td>'+
      '<td>'+esc(s.authority)+'</td><td>'+esc(s.year)+'</td>'+
      '<td><span class="dot" style="background:'+(STATUS_DOT[s.status]||'#5B6570')+'"></span>'+esc(s.status)+'</td>'+
      '<td class="muted">'+(s.hasMarkdown?'md ':'')+(s.hasExtracted?'json ':'')+(s.fileKey?'file':'')+'</td>'+
      '<td class="muted">'+esc((s.updatedAt||'').slice(0,10))+'</td></tr>';
  }).join('');
  el('view').innerHTML = form +
    '<div class="card"><table><thead><tr><th>Kind</th><th>Authority</th><th>Year</th><th>Status</th><th>Data</th><th>Updated</th></tr></thead>'+
    '<tbody>'+(rows||'<tr><td colspan="6" class="muted" style="padding:1rem;">No sources yet.</td></tr>')+'</tbody></table></div>';
  el('addsrc').onclick=async function(){
    try {
      await api('POST','/api/sources',{ kind:el('nk').value, authority:el('na').value.trim(), year:Number(el('ny').value) });
      flash('Source added.',true); renderSources();
    } catch(e){ flash(e.message); }
  };
  Array.prototype.forEach.call(el('view').querySelectorAll('tr[data-id]'), function(tr){
    tr.onclick=function(){ openSource(tr.getAttribute('data-id')); }; });
}
async function openSource(id){
  var s = await api('GET','/api/sources/'+id);
  var statusOpts = STATUS.map(function(x){ return '<option'+(x===s.status?' selected':'')+'>'+x+'</option>'; }).join('');
  el('view').innerHTML =
    '<button class="btn btn--ghost" id="back" style="margin-bottom:1rem;">← Back to sources</button>'+
    '<div class="card accent-top" style="padding:1.2rem;">'+
    '<div class="row" style="gap:.7rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:1rem;">'+
      '<div style="flex:0 0 8rem;"><label>Kind</label><input id="ekind" value="'+esc(s.kind)+'" /></div>'+
      '<div style="flex:1 1 12rem;"><label>Authority</label><input id="eauth" value="'+esc(s.authority)+'" /></div>'+
      '<div style="flex:0 0 7rem;"><label>Year</label><input id="eyear" type="number" value="'+esc(s.year)+'" /></div>'+
      '<div style="flex:0 0 11rem;"><label>Status</label><select id="estatus">'+statusOpts+'</select></div>'+
    '</div>'+
    '<div class="field"><label>Source file '+(s.fileKey?'· <a href="/api/sources/'+s.id+'/file">download current</a>':'')+'</label>'+
      '<input id="efile" type="file" /></div>'+
    '<div class="field"><label>Markdown (converted text)</label><textarea id="emd" placeholder="Paste the converted markdown…">'+esc(s.markdown||'')+'</textarea></div>'+
    '<div class="field"><label>Extracted (structured JSON)</label><textarea id="eex" placeholder="{ }">'+esc(s.extracted?JSON.stringify(s.extracted,null,2):'')+'</textarea></div>'+
    '<div class="row"><button class="btn" id="save">Save</button>'+
      '<button class="btn btn--ghost" id="upload">Upload file</button>'+
      '<span class="grow"></span><button class="btn btn--danger" id="del">Delete source</button></div>'+
    '</div>';
  el('back').onclick=renderSources;
  el('save').onclick=async function(){
    var ex=el('eex').value.trim(), parsed=null;
    if (ex){ try { parsed=JSON.parse(ex); } catch(e){ return flash('Extracted JSON is invalid: '+e.message); } }
    try {
      await api('PATCH','/api/sources/'+id,{ kind:el('ekind').value, authority:el('eauth').value, year:Number(el('eyear').value),
        status:el('estatus').value, markdown:el('emd').value, extracted:parsed });
      flash('Saved.',true);
    } catch(e){ flash(e.message); }
  };
  el('upload').onclick=async function(){
    var f=el('efile').files[0]; if(!f) return flash('Choose a file first.');
    var fd=new FormData(); fd.append('file', f);
    var r=await fetch('/api/sources/'+id+'/file',{method:'POST',body:fd});
    if(r.ok){ flash('File uploaded.',true); openSource(id); } else { flash('Upload failed.'); }
  };
  el('del').onclick=async function(){ if(!confirm('Delete this source?')) return;
    try { await api('DELETE','/api/sources/'+id); flash('Deleted.',true); renderSources(); } catch(e){ flash(e.message); } };
}

// ── Packs ─────────────────────────────────────────────────────────
async function renderPacks(){
  el('view').innerHTML='<p class="muted">Loading…</p>';
  var list = await api('GET','/api/packs');
  var reviewed = await api('GET','/api/sources');
  var revOpts = '<option value="">— none (paste JSON below) —</option>' +
    reviewed.filter(function(s){ return s.hasExtracted; }).map(function(s){
      return '<option value="'+s.id+'">'+esc(s.authority+' '+s.year+' ('+s.kind+', '+s.status+')')+'</option>'; }).join('');
  var form = '<div class="card accent-top" style="padding:1.1rem 1.2rem;margin-bottom:1.2rem;">'+
    '<h3 style="font-size:.95rem;margin-bottom:.8rem;">Publish a pack</h3>'+
    '<div class="row" style="gap:.7rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:.8rem;">'+
      '<div style="flex:0 0 12rem;"><label>Type</label><select id="pt"><option>RATE_LIBRARY</option><option>BYLAW_RULES</option></select></div>'+
      '<div style="flex:1 1 12rem;"><label>Edition (unique)</label><input id="ped" placeholder="CPWD-DSR-2023" /></div>'+
    '</div>'+
    '<div class="field"><label>Seed from a source (its extracted JSON)</label><select id="psrc">'+revOpts+'</select></div>'+
    '<div class="field"><label>Or paste the pack payload JSON</label><textarea id="ppl" placeholder="{ &quot;packType&quot;:&quot;RATE_LIBRARY&quot;, &quot;source&quot;:&quot;CPWD&quot;, &quot;year&quot;:2023, &quot;edition&quot;:&quot;CPWD-DSR-2023&quot;, &quot;rateItems&quot;:[] }"></textarea></div>'+
    '<button class="btn" id="pub">Validate &amp; publish</button>'+
    '<p class="muted" style="font-size:.78rem;margin:.6rem 0 0;">The payload is validated against the EsePack schema and a SHA-256 checksum is stamped before it is sealed. Editions are immutable.</p>'+
    '</div>';
  var rows = list.map(function(p){
    return '<tr><td><code>'+esc(p.edition)+'</code></td><td><span class="tag">'+esc(p.packType)+'</span></td>'+
      '<td class="muted"><code>'+esc((p.checksum||'').slice(0,12))+'…</code></td>'+
      '<td class="muted">'+esc((p.publishedAt||'').slice(0,10))+'</td>'+
      '<td class="row" style="gap:.4rem;"><a class="btn btn--ghost" style="padding:.3rem .6rem;" href="/api/packs/'+p.id+'/download">Download</a>'+
      '<button class="btn btn--danger" style="padding:.3rem .6rem;" data-del="'+p.id+'">Delete</button></td></tr>';
  }).join('');
  el('view').innerHTML = form +
    '<div class="card"><table><thead><tr><th>Edition</th><th>Type</th><th>Checksum</th><th>Published</th><th></th></tr></thead>'+
    '<tbody>'+(rows||'<tr><td colspan="5" class="muted" style="padding:1rem;">No packs published yet.</td></tr>')+'</tbody></table></div>';
  el('pub').onclick=async function(){
    var payload=null, txt=el('ppl').value.trim();
    if (txt){ try { payload=JSON.parse(txt); } catch(e){ return flash('Payload JSON is invalid: '+e.message); } }
    try {
      await api('POST','/api/packs',{ packType:el('pt').value, edition:el('ped').value.trim(), sourceId:el('psrc').value||undefined, payload:payload||undefined });
      flash('Pack published.',true); renderPacks();
    } catch(e){ flash(e.message); }
  };
  Array.prototype.forEach.call(el('view').querySelectorAll('[data-del]'), function(b){
    b.onclick=async function(){ if(!confirm('Delete pack '+b.getAttribute('data-del')+'?')) return;
      try { await api('DELETE','/api/packs/'+b.getAttribute('data-del')); flash('Deleted.',true); renderPacks(); } catch(e){ flash(e.message); } }; });
}

// ── Users ─────────────────────────────────────────────────────────
async function renderUsers(){
  el('view').innerHTML='<p class="muted">Loading…</p>';
  var list = await api('GET','/api/users');
  var form = '<div class="card accent-top" style="padding:1.1rem 1.2rem;margin-bottom:1.2rem;">'+
    '<h3 style="font-size:.95rem;margin-bottom:.8rem;">Add a KB-team user</h3>'+
    '<div class="row" style="gap:.7rem;align-items:flex-end;flex-wrap:wrap;">'+
      '<div style="flex:1 1 12rem;"><label>Username</label><input id="uu" /></div>'+
      '<div style="flex:1 1 12rem;"><label>Temp password</label><input id="up" type="text" /></div>'+
      '<button class="btn" id="adduser">Add user</button>'+
    '</div><p class="muted" style="font-size:.78rem;margin:.6rem 0 0;">New users must change their password on first sign-in.</p></div>';
  var rows = list.map(function(u){
    return '<tr><td>'+esc(u.username)+'</td><td><span class="tag">'+esc(u.role)+'</span></td>'+
      '<td class="muted">'+(u.mustChangePassword?'must change pw':'active')+'</td>'+
      '<td class="muted">'+esc((u.createdAt||'').slice(0,10))+'</td>'+
      '<td class="row" style="gap:.4rem;"><button class="btn btn--ghost" style="padding:.3rem .6rem;" data-reset="'+u.id+'">Reset pw</button>'+
      (u.id===S.me.id?'':'<button class="btn btn--danger" style="padding:.3rem .6rem;" data-del="'+u.id+'">Delete</button>')+'</td></tr>';
  }).join('');
  el('view').innerHTML = form +
    '<div class="card"><table><thead><tr><th>Username</th><th>Role</th><th>State</th><th>Created</th><th></th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table></div>';
  el('adduser').onclick=async function(){
    try { await api('POST','/api/users',{ username:el('uu').value.trim(), password:el('up').value });
      flash('User added.',true); renderUsers(); } catch(e){ flash(e.message); } };
  Array.prototype.forEach.call(el('view').querySelectorAll('[data-reset]'), function(b){
    b.onclick=async function(){ var pw=prompt('New temporary password:'); if(!pw) return;
      try { await api('POST','/api/users/'+b.getAttribute('data-reset')+'/reset',{ password:pw }); flash('Password reset.',true); }
      catch(e){ flash(e.message); } }; });
  Array.prototype.forEach.call(el('view').querySelectorAll('[data-del]'), function(b){
    b.onclick=async function(){ if(!confirm('Delete this user?')) return;
      try { await api('DELETE','/api/users/'+b.getAttribute('data-del')); flash('Deleted.',true); renderUsers(); } catch(e){ flash(e.message); } }; });
}

// ── Change password modal ─────────────────────────────────────────
function openPw(forced){
  el('pwmodal').className=''; el('pwerr').className='alert hidden';
  el('pwcurrent').value=''; el('pwnew').value='';
  el('pwcancel').style.display = forced ? 'none' : '';
  el('pwhint').textContent = forced ? 'Your account requires a new password before you continue.' : 'Set a new password.';
}
el('pwcancel').onclick=function(){ el('pwmodal').className='hidden'; };
el('pwform').addEventListener('submit', async function(e){
  e.preventDefault();
  try {
    await api('POST','/api/account/password',{ currentPassword:el('pwcurrent').value, newPassword:el('pwnew').value });
    el('pwmodal').className='hidden'; S.me.mustChangePassword=false; flash('Password updated.',true);
  } catch(ex){ el('pwerr').textContent=ex.message; el('pwerr').className='alert'; }
});

// ── Boot ──────────────────────────────────────────────────────────
el('logout').onclick=async function(){ try{ await api('POST','/api/logout'); }catch(e){} window.location.href='/login'; };
(async function(){
  try { S.me = await api('GET','/api/me'); } catch(e){ return; }
  el('who').textContent = S.me.username + ' · ' + S.me.role;
  renderTabs(); render();
  if (S.me.mustChangePassword) openPw(true);
})();
</script>`;
