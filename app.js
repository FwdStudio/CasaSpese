/* ═══════════════════════════════════════════
   Budgetly v3 — AI Categorisation + PDF/CSV
═══════════════════════════════════════════ */

/* ── CATEGORIES ── */
const CATS = {
  income: [
    { id:'stipendio',  label:'💼 Stipendio',     color:'#16a34a' },
    { id:'freelance',  label:'💻 Freelance',     color:'#0891b2' },
    { id:'rimborso',   label:'↩️ Rimborso',      color:'#059669' },
    { id:'regalo',     label:'🎁 Regalo',        color:'#7c3aed' },
    { id:'pensione',   label:'🧓 Pensione',      color:'#2563eb' },
    { id:'inps',       label:'🏛️ INPS/Assegni',  color:'#0284c7' },
    { id:'altro_in',   label:'📦 Altra entrata', color:'#64748b' },
  ],
  expense: [
    { id:'spesa',        label:'🛒 Spesa alim.',   color:'#dc2626' },
    { id:'affitto',      label:'🏠 Affitto/Mutuo', color:'#ea580c' },
    { id:'utenze',       label:'💡 Utenze',        color:'#ca8a04' },
    { id:'trasporti',    label:'🚗 Trasporti',     color:'#2563eb' },
    { id:'salute',       label:'🏥 Salute',        color:'#059669' },
    { id:'ristoranti',   label:'🍕 Ristoranti',    color:'#db2777' },
    { id:'abbonamenti',  label:'📱 Abbonamenti',   color:'#7c3aed' },
    { id:'svago',        label:'🎮 Svago',         color:'#e11d48' },
    { id:'vestiti',      label:'👗 Abbigliamento', color:'#a21caf' },
    { id:'istruzione',   label:'📚 Istruzione',    color:'#0369a1' },
    { id:'casa',         label:'🪴 Casa/Arredo',   color:'#15803d' },
    { id:'banca',        label:'🏦 Commissioni',   color:'#475569' },
    { id:'assicurazione',label:'🛡️ Assicuraz.',    color:'#6d28d9' },
    { id:'viaggi',       label:'✈️ Viaggi',        color:'#0891b2' },
    { id:'satispay',     label:'💳 Satispay',      color:'#dc2626' },
    { id:'paypal',       label:'🅿️ PayPal',        color:'#1d4ed8' },
    { id:'condominio',   label:'🏢 Condominio',    color:'#92400e' },
    { id:'altro_ex',     label:'📦 Altra uscita',  color:'#64748b' },
  ]
};

/* ── FALLBACK RULES (usate solo se AI non disponibile) ── */
const CAT_RULES = [
  // income — molto specifici, mai "ricarica"
  { p:['emolumenti','stipend','salario','retribuz'], t:'income', c:'stipendio' },
  { p:['pensione'],                                  t:'income', c:'pensione' },
  { p:['inps'],                                      t:'income', c:'inps' },
  { p:['rimborso'],                                  t:'income', c:'rimborso' },
  // expense — Satispay sempre uscita
  { p:['satispay','ricarica dell\'app satispay','sdd commerciale.*satispay'], t:'expense', c:'satispay' },
  { p:['paypal'],                                    t:'expense', c:'paypal' },
  { p:['condominio','mav '],                         t:'expense', c:'condominio' },
  { p:['fastweb','tim ','vodafone','iliad','windtre','telecom','sky ','dazn'], t:'expense', c:'abbonamenti' },
  { p:['netflix','spotify','amazon prime','apple','google play','disney','microsoft','adobe','icloud'], t:'expense', c:'abbonamenti' },
  { p:['enel','a2a','iren','hera','eni gas','italgas','sorgenia','yada energia','luce ','gas ','elettric','acqua ','tari'], t:'expense', c:'utenze' },
  { p:['affitto','mutuo','canone locaz'],             t:'expense', c:'affitto' },
  { p:['esselunga','conad','coop ','lidl','aldi','carrefour','penny','pam ','iper','supermercato','sigma ','despar','eurospin','bennet','supermi','md ','tigota'], t:'expense', c:'spesa' },
  { p:['mcdonald','burger king','kfc','subway','pizzeria','ristorante','trattoria','osteria','sushi','poke','bar ','caffe','caffè','just eat','deliveroo','glovo','fumo e brace'], t:'expense', c:'ristoranti' },
  { p:['trenitalia','italo','flixbus','ryanair','easyjet','wizz','taxi','uber','telepass','autostrada','parking','parcheggio','benzina','q8','agip','total ','tamoil','eni 0','totalerg','stazione'], t:'expense', c:'trasporti' },
  { p:['farmacia','farmacie','parafarm','laboratorio','medic','dentista','oculista','fisioterapia','ospedale','asl ','clinica','arcaplanet'], t:'expense', c:'salute' },
  { p:['commissioni','spese banca','canone conto','bollo','canone per utilizzo','interessi e competenze','spese prod'], t:'expense', c:'banca' },
  { p:['generali','unipol','allianz','axa ','verisure','assicuraz','polizza'], t:'expense', c:'assicurazione' },
  { p:['ikea','leroy','bricofer','brico ','castorama','arredament','elettrodomest'], t:'expense', c:'casa' },
  { p:['zara','h&m','primark','benetton','calzedonia','intimissimi','oviesse','ovs ','kik tessili'], t:'expense', c:'vestiti' },
  { p:['prelevamento','bancomat del'],               t:'expense', c:'altro_ex' },
  { p:['bonifico tramite'],                          t:'expense', c:'altro_ex' },
];

function autoCategory(desc, amount) {
  const d = (desc||'').toLowerCase();
  // Satispay è sempre uscita — check prioritario
  if (d.includes('satispay')) return { type:'expense', cat:'satispay' };
  if (d.includes('paypal'))   return { type:'expense', cat:'paypal' };
  if (d.includes('condominio')) return { type:'expense', cat:'condominio' };

  for (const rule of CAT_RULES) {
    if (rule.p.some(p => d.includes(p))) {
      return { type: rule.t, cat: rule.c };
    }
  }
  // fallback rigoroso dal segno dell'importo
  return amount >= 0
    ? { type:'income',  cat:'altro_in' }
    : { type:'expense', cat:'altro_ex' };
}

/* ── STORAGE ── */
function loadTxs()       { return JSON.parse(localStorage.getItem('budgetly_txs') || '[]'); }
function saveTxs(t)      { localStorage.setItem('budgetly_txs', JSON.stringify(t)); }
function loadSettings()  { return JSON.parse(localStorage.getItem('budgetly_settings') || '{"balance":0,"budget":0,"name":"","apiKey":""}'); }
function saveSettings2(s){ localStorage.setItem('budgetly_settings', JSON.stringify(s)); }

/* ── FORMAT ── */
const fmt      = n  => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const fmtDate  = iso=> new Date(iso+'T00:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'short'});
const monthKey = iso=> iso.slice(0,7);
const todayISO = ()  => new Date().toISOString().slice(0,10);
const thisMonth= ()  => todayISO().slice(0,7);
function monthLabel(ym) {
  const [y,m]=ym.split('-');
  return new Date(+y,+m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});
}

/* ── STATE ── */
let historyMonth  = thisMonth();
let statsMonth    = thisMonth();
let historyFilter = null;
let pendingImport = null;
let chartCat=null, chartTrend=null;

/* ── NAVIGATION ── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if (name==='home')     renderHome();
  if (name==='history')  renderHistory();
  if (name==='stats')    renderStats();
  if (name==='settings') loadSettingsUI();
}

function toast(msg, ms=2800) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),ms);
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ══════════════════════════════════════════
   AI CATEGORISATION via Claude API
══════════════════════════════════════════ */
async function aiCategorise(transactions) {
  const settings = loadSettings();
  const key = settings.apiKey || '';
  if (!key) return; // skip se no key

  const expCats = CATS.expense.map(c=>c.id).join(', ');
  const incCats = CATS.income.map(c=>c.id).join(', ');

  // Batch: max 60 tx per chiamata per restare sotto token limit
  const BATCH = 60;
  for (let i=0; i<transactions.length; i+=BATCH) {
    const batch = transactions.slice(i, i+BATCH);
    const lines = batch.map((t,idx)=>
      `${idx}: [${t.type==='income'?'ENTRATA':'USCITA'} ${fmt(t.amount)}] ${t.description}`
    ).join('\n');

    const prompt = `Sei un esperto di finanza personale italiana. Categorizza ogni transazione bancaria.

Categorie USCITA disponibili: ${expCats}
Categorie ENTRATA disponibili: ${incCats}

Regole importanti:
- "Satispay" o "ricarica app" = sempre satispay (uscita)
- "PayPal" = sempre paypal (uscita)  
- "Condominio" o "MAV" = condominio (uscita)
- "INPS", "assegno unico" = inps (entrata)
- "Emolumenti", "stipendi" = stipendio (entrata)
- Usa il tipo (ENTRATA/USCITA) indicato, non cambiarlo
- Se non sei sicuro usa altro_in o altro_ex

Transazioni:
${lines}

Rispondi SOLO con JSON array, niente altro:
[{"i":0,"cat":"nome_categoria"},{"i":1,"cat":"nome_categoria"},...]`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role:'user', content: prompt }]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).map(c=>c.text||'').join('');
      const clean = text.replace(/```json|```/g,'').trim();
      const cats = JSON.parse(clean);
      cats.forEach(({i, cat}) => {
        if (batch[i]) batch[i].cat = cat;
      });
    } catch(e) {
      console.warn('AI categorisation failed for batch', e);
    }
  }
}

/* ══════════════════════════════════════════
   CSV PARSING
══════════════════════════════════════════ */
function detectSep(line) {
  const counts={';':0,',':0,'\t':0,'|':0};
  for(const c of line) if(counts[c]!==undefined) counts[c]++;
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}

function parseCSV(text,sep) {
  return text.split(/\r?\n/).filter(l=>l.trim()).map(line=>{
    const cells=[]; let cur=''; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){inQ=!inQ;continue;}
      if(ch===sep&&!inQ){cells.push(cur.trim());cur='';}
      else cur+=ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

function parseItalianDate(s){
  if(!s) return null;
  s=s.trim().replace(/\./g,'/');
  const dmy=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(dmy){let[,d,m,y]=dmy;if(y.length===2)y='20'+y;return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
  const ymd=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(ymd){let[,y,m,d]=ymd;return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
  return null;
}

function parseItalianNum(s){
  if(!s) return null;
  s=s.trim().replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  const n=parseFloat(s);
  return isNaN(n)?null:n;
}

function findHeaderRow(rows){
  for(let i=0;i<Math.min(rows.length,15);i++){
    const row=rows[i].map(c=>c.toLowerCase());
    if(row.some(c=>c.includes('data'))&&row.some(c=>c.includes('import')||c.includes('euro')||c.includes('entrate')||c.includes('avere')))
      return i;
  }
  return 0;
}

const FORMATS=[
  {name:'BCC / ICCREA',
   detect:h=>h.some(c=>/^data/i.test(c))&&h.some(c=>/valuta/i.test(c))&&h.some(c=>/descriz|causale/i.test(c)),
   parse(h,r){
     const iDate=h.findIndex(c=>/^data/i.test(c));
     const iDesc=h.findIndex(c=>/descriz/i.test(c));
     const iAmt =h.findIndex(c=>/^importo$/i.test(c));
     const iDare=h.findIndex(c=>/^dare$/i.test(c));
     const iAvere=h.findIndex(c=>/^avere$/i.test(c));
     const date=parseItalianDate(r[iDate]);
     const description=r[iDesc]||'';
     let amount;
     if(iAmt>=0) amount=parseItalianNum(r[iAmt]);
     else if(iDare>=0&&iAvere>=0){const d=parseItalianNum(r[iDare])||0;const a=parseItalianNum(r[iAvere])||0;amount=a-d;}
     return date&&amount!=null?{date,description,amount}:null;
   }},
  {name:'UniCredit',
   detect:h=>h.some(c=>/^data$/i.test(c))&&h.some(c=>/^euro$|^importo$/i.test(c))&&h.some(c=>/caus/i.test(c)),
   parse(h,r){
     const iDate=h.findIndex(c=>/^data$/i.test(c));
     const iDesc=h.findIndex(c=>/descrizione/i.test(c));
     const iAmt=h.findIndex(c=>/^euro$|^importo$/i.test(c));
     return parseItalianDate(r[iDate])&&parseItalianNum(r[iAmt])!=null?{date:parseItalianDate(r[iDate]),description:r[iDesc]||'',amount:parseItalianNum(r[iAmt])}:null;
   }},
  {name:'Intesa Sanpaolo',
   detect:h=>h.some(c=>/data operaz/i.test(c))&&h.some(c=>/importo/i.test(c)),
   parse(h,r){
     const iDate=h.findIndex(c=>/data operaz/i.test(c));
     const iDesc=h.findIndex(c=>/descrizione|causale/i.test(c));
     const iAmt=h.findIndex(c=>/importo/i.test(c));
     return parseItalianDate(r[iDate])&&parseItalianNum(r[iAmt])!=null?{date:parseItalianDate(r[iDate]),description:r[iDesc]||'',amount:parseItalianNum(r[iAmt])}:null;
   }},
  {name:'Fineco',
   detect:h=>h.some(c=>/^data$/i.test(c))&&h.some(c=>/^entrate$/i.test(c))&&h.some(c=>/^uscite$/i.test(c)),
   parse(h,r){
     const iDate=h.findIndex(c=>/^data$/i.test(c));
     const iDesc=h.findIndex(c=>/descrizione|operazione/i.test(c));
     const iIn=h.findIndex(c=>/^entrate$/i.test(c));
     const iOut=h.findIndex(c=>/^uscite$/i.test(c));
     const date=parseItalianDate(r[iDate]);
     const inAmt=parseItalianNum(r[iIn])||0;
     const outAmt=parseItalianNum(r[iOut])||0;
     const amount=inAmt>0?inAmt:-outAmt;
     return date&&amount!==0?{date,description:r[iDesc]||'',amount}:null;
   }},
  {name:'Generico',detect:()=>true,
   parse(h,r){
     let date=null,amount=null,description='';
     for(let i=0;i<r.length;i++){
       if(!date) date=parseItalianDate(r[i]);
       if(!description&&r[i].length>5&&isNaN(parseItalianNum(r[i]))&&!parseItalianDate(r[i])) description=r[i];
       if(amount===null){const n=parseItalianNum(r[i]);if(n!==null&&Math.abs(n)<1000000)amount=n;}
     }
     return date&&amount!==null?{date,description,amount}:null;
   }}
];

function isDuplicate(tx,existing){
  return existing.some(e=>e.date===tx.date&&Math.abs(e.amount-tx.amount)<0.01&&(e.description||e.desc||'').slice(0,15)===(tx.description||'').slice(0,15));
}

async function parseFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const text=e.target.result;
        const firstLine=text.split(/\r?\n/)[0];
        const sep=detectSep(firstLine);
        const rows=parseCSV(text,sep);
        if(rows.length<2){reject('File troppo corto');return;}
        const headerIdx=findHeaderRow(rows);
        const headers=rows[headerIdx].map(c=>c.toLowerCase().trim());
        const dataRows=rows.slice(headerIdx+1).filter(r=>r.some(c=>c.trim()));
        const fmt2=FORMATS.find(f=>f.detect(headers))||FORMATS[FORMATS.length-1];
        const parsed=[];
        for(const row of dataRows){
          const tx=fmt2.parse(headers,row);
          if(tx&&tx.date&&tx.date>'2000-01-01'){
            const {type,cat}=autoCategory(tx.description,tx.amount);
            parsed.push({id:Date.now()+Math.random(),date:tx.date,description:tx.description.slice(0,120),amount:Math.abs(tx.amount),type:tx.amount>=0?'income':'expense',cat,note:'',source:'csv'});
          }
        }
        // Fix cat with sign-aware autoCategory
        parsed.forEach(p=>{const r=autoCategory(p.description,p.type==='income'?1:-1);p.cat=r.cat;});
        resolve({rows:parsed,format:fmt2.name});
      }catch(err){reject(err.toString());}
    };
    reader.onerror=()=>reject('Errore lettura file');
    reader.readAsText(file,'UTF-8');
  });
}

/* ── DROP ZONE ── */
function initDropZone(){
  const zone=document.getElementById('drop-zone');
  const input=document.getElementById('file-input');
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)handleFile(f);});
  input.addEventListener('change',()=>{if(input.files[0])handleFile(input.files[0]);input.value='';});
}

async function handleFile(file){
  if(file.name.toLowerCase().endsWith('.pdf')){
    await handlePDF(file); return;
  }
  setProgress(true,'Lettura file…',10);
  try{
    setProgress(true,'Rilevamento formato…',30); await sleep(120);
    const{rows,format}=await parseFile(file);
    setProgress(true,`Categorizzazione ${rows.length} movimenti…`,55); await sleep(150);

    // AI categorisation
    const settings=loadSettings();
    if(settings.apiKey){
      setProgress(true,'🤖 AI sta categorizzando…',70);
      await aiCategorise(rows);
    }

    setProgress(true,'Controllo duplicati…',90); await sleep(100);
    const existing=loadTxs();
    let dupCount=0;
    const newRows=rows.filter(r=>{if(isDuplicate(r,existing)){dupCount++;return false;}return true;});
    setProgress(false);
    pendingImport=newRows;
    showReview(newRows,dupCount,rows.length,format);
  }catch(err){setProgress(false);toast('❌ Errore: '+err);}
}

function setProgress(show,label='',pct=0){
  const el=document.getElementById('import-progress');
  el.style.display=show?'block':'none';
  document.getElementById('progress-label').textContent=label;
  document.getElementById('progress-bar').style.width=pct+'%';
}

function showReview(newRows,dupCount,total,format){
  document.getElementById('rev-new').textContent=newRows.length;
  document.getElementById('rev-dup').textContent=dupCount;
  document.getElementById('rev-total').textContent=total;
  document.getElementById('review-format').textContent='Formato: '+format;
  const mapSection=document.getElementById('cat-mapping-section');
  const mapList=document.getElementById('cat-mapping-list');
  const sample=newRows.slice(0,15);
  if(sample.length>0){
    mapSection.style.display='block';
    mapList.innerHTML=sample.map((tx,i)=>`
      <div class="cat-map-item">
        <div>
          <div style="font-size:12px;font-weight:500;margin-bottom:2px">${fmtDate(tx.date)} · <span style="color:${tx.type==='income'?'var(--accent)':'var(--danger)'}">${tx.type==='income'?'+':'-'}${fmt(tx.amount)}</span></div>
          <div class="cat-map-desc">${tx.description||'—'}</div>
        </div>
        <select class="cat-map-sel" onchange="updatePendingCat(${i},this.value)">
          <optgroup label="Entrate">${CATS.income.map(c=>`<option value="income::${c.id}" ${tx.type==='income'&&c.id===tx.cat?'selected':''}>${c.label}</option>`).join('')}</optgroup>
          <optgroup label="Uscite">${CATS.expense.map(c=>`<option value="expense::${c.id}" ${tx.type==='expense'&&c.id===tx.cat?'selected':''}>${c.label}</option>`).join('')}</optgroup>
        </select>
      </div>`).join('');
  }else mapSection.style.display='none';
  document.getElementById('review-box').style.display='block';
  document.getElementById('drop-zone').style.display='none';
}

function updatePendingCat(idx,val){
  if(!pendingImport||!pendingImport[idx])return;
  const[type,cat]=val.split('::');
  pendingImport[idx].type=type;pendingImport[idx].cat=cat;
}

function confirmImport(){
  if(!pendingImport||!pendingImport.length){toast('Nessuna transazione');return;}
  const existing=loadTxs();
  saveTxs([...existing,...pendingImport]);
  toast(`✅ ${pendingImport.length} transazioni importate!`);
  resetImport(); showPage('home');
}

function resetImport(){
  pendingImport=null;
  document.getElementById('review-box').style.display='none';
  document.getElementById('drop-zone').style.display='block';
  document.getElementById('import-progress').style.display='none';
}

/* ══════════════════════════════════════════
   PDF PARSER — BCC Milano / RelaxBanking
══════════════════════════════════════════ */
function loadPdfJs(){
  return new Promise(resolve=>{
    if(window.pdfjsLib){resolve();return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve();};
    document.head.appendChild(s);
  });
}

async function parsePDF(file){
  await loadPdfJs();
  const ab=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:ab}).promise;
  const transactions=[];
  const rowRe=/^(\d{2}\/\d{2}\/\d{4})\s+(?:(\d{2}\/\d{2}\/\d{4})\s+)?(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+)$/;

  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const content=await page.getTextContent();
    const byY={};
    content.items.forEach(item=>{
      const y=Math.round(item.transform[5]);
      if(!byY[y])byY[y]=[];
      byY[y].push(item.str);
    });
    const lines=Object.entries(byY).sort((a,b)=>b[0]-a[0]).map(([,parts])=>parts.join(' ').replace(/\s+/g,' ').trim());
    const merged=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(merged.length&&!line.match(/^\d{2}\/\d{2}\/\d{4}/)&&merged[merged.length-1].match(/^\d{2}\/\d{2}\/\d{4}/))
        merged[merged.length-1]+=' '+line;
      else merged.push(line);
    }
    for(const line of merged){
      const m=line.match(rowRe);
      if(!m)continue;
      const[,dateC,dateV,importoRaw,desc]=m;
      if(/saldo (finale|iniziale|contabile|disponibile)/i.test(desc))continue;
      if(/data contabile|data valuta|movimenti/i.test(desc))continue;
      const amount=parseItalianNum(importoRaw);
      if(amount===null||amount===0)continue;
      const date=parseItalianDate(dateV||dateC);
      if(!date)continue;
      const cleanDesc=desc.replace(/CARTA\s+\d+/gi,'').replace(/\b\d{10,}\b/g,'').replace(/\s+/g,' ').trim().slice(0,120);
      const{type,cat}=autoCategory(cleanDesc,amount);
      transactions.push({id:Date.now()+Math.random(),date,description:cleanDesc,amount:Math.abs(amount),type:amount>=0?'income':'expense',cat,note:'',source:'pdf-bcc'});
    }
  }
  return transactions;
}

async function handlePDF(file){
  setProgress(true,'Lettura PDF BCC…',15);
  try{
    setProgress(true,'Estrazione testo…',35);await sleep(100);
    const rows=await parsePDF(file);
    setProgress(true,`Categorizzazione ${rows.length} movimenti…`,60);await sleep(150);
    const settings=loadSettings();
    if(settings.apiKey){
      setProgress(true,'🤖 AI categorizza…',75);
      await aiCategorise(rows);
    }
    const existing=loadTxs();
    let dupCount=0;
    const newRows=rows.filter(r=>{if(isDuplicate(r,existing)){dupCount++;return false;}return true;});
    setProgress(false);
    pendingImport=newRows;
    showReview(newRows,dupCount,rows.length,'BCC Milano (PDF RelaxBanking)');
  }catch(err){setProgress(false);toast('❌ Errore PDF: '+err);console.error(err);}
}

/* ══════════════════════════════════════════
   HOME
══════════════════════════════════════════ */
function renderHome(){
  const txs=loadTxs();const settings=loadSettings();const m=thisMonth();
  const mTxs=txs.filter(t=>monthKey(t.date)===m);
  const income=mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance=(settings.balance||0)+txs.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount),0);
  const budget=settings.budget||0;
  const remaining=budget>0?budget-expense:balance;
  const name=settings.name||'';
  document.getElementById('home-sub').textContent=(name?`Ciao ${name} — `:'')+new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  const heroEl=document.getElementById('hero-remaining');
  if(budget>0){heroEl.textContent=fmt(remaining);heroEl.className='hero-amount'+(remaining<0?' negative':'');document.getElementById('hero-sub').textContent=`${fmt(expense)} spesi su ${fmt(budget)} di budget`;}
  else{heroEl.textContent=fmt(balance);heroEl.className='hero-amount';document.getElementById('hero-sub').textContent='Saldo conto corrente';}
  if(budget>0){
    const pct=Math.min((expense/budget)*100,100);
    const bar=document.getElementById('budget-bar');
    bar.style.width=pct+'%';
    bar.className='budget-bar-fill '+(pct<60?'bar-green':pct<85?'bar-yellow':'bar-red');
    document.getElementById('bar-spent-label').textContent=`Speso: ${fmt(expense)}`;
    document.getElementById('bar-budget-label').textContent=`Budget: ${fmt(budget)}`;
  }
  const alertEl=document.getElementById('budget-alert');
  if(budget>0){const pct=(expense/budget)*100;if(pct>=100){alertEl.style.display='flex';alertEl.className='alert alert-red';alertEl.innerHTML='⚠️ Hai superato il budget mensile!';}else if(pct>=80){alertEl.style.display='flex';alertEl.className='alert alert-yellow';alertEl.innerHTML=`🔔 Hai usato il ${Math.round(pct)}% del budget`;}else alertEl.style.display='none';}else alertEl.style.display='none';
  document.getElementById('stat-income').textContent=fmt(income);
  document.getElementById('stat-expense').textContent=fmt(expense);
  document.getElementById('stat-balance').textContent=fmt(balance);
  document.getElementById('stat-count').textContent=mTxs.length;
  const recent=[...txs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  renderTxList(document.getElementById('recent-list'),recent,false);
}

/* ══════════════════════════════════════════
   TX LIST
══════════════════════════════════════════ */
function getCat(type,id){return(CATS[type]||[]).find(c=>c.id===id)||{label:id,color:'#64748b'};}

function catSelectHTML(t) {
  const incOpts = CATS.income.map(c=>`<option value="income::${c.id}" ${t.type==='income'&&c.id===t.cat?'selected':''}>${c.label}</option>`).join('');
  const expOpts = CATS.expense.map(c=>`<option value="expense::${c.id}" ${t.type==='expense'&&c.id===t.cat?'selected':''}>${c.label}</option>`).join('');
  return `<select class="cat-inline-sel" onchange="changeCat(${JSON.stringify(t.id)},this.value)">
    <optgroup label="Entrate">${incOpts}</optgroup>
    <optgroup label="Uscite">${expOpts}</optgroup>
  </select>`;
}

function renderTxList(container,txs,showDel=true){
  if(!txs.length){container.innerHTML='<div class="empty"><div class="empty-icon">📂</div><div>Nessuna transazione</div></div>';return;}
  container.innerHTML=txs.map(t=>{
    const cat=getCat(t.type,t.cat);
    const sign=t.type==='income'?'+':'-';
    const col=t.type==='income'?'var(--accent)':'var(--danger)';
    return `<div class="tx-item">
      <div class="tx-icon" style="background:${cat.color}18">${cat.label.split(' ')[0]}</div>
      <div class="tx-info">
        <div class="tx-name">${t.description||t.desc||'—'}</div>
        <div class="tx-cat-wrap">${catSelectHTML(t)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="tx-amount" style="color:${col}">${sign}${fmt(t.amount)}</div>
        <div class="tx-date">${fmtDate(t.date)}</div>
      </div>
      ${showDel?`<button class="tx-del" onclick="deleteTx(${JSON.stringify(t.id)})">✕</button>`:''}
    </div>`;
  }).join('');
}

function deleteTx(id){if(!confirm('Eliminare questa transazione?'))return;saveTxs(loadTxs().filter(t=>t.id!==id));renderHistory();renderHome();}

function changeCat(id,val){
  const[type,cat]=val.split('::');
  const txs=loadTxs();
  const idx=txs.findIndex(t=>t.id===id);
  if(idx<0)return;
  txs[idx].type=type;txs[idx].cat=cat;
  saveTxs(txs);
  // aggiorna solo l'icona e il colore senza re-render completo
  const icon=document.querySelector(`[data-txid="${id}"] .tx-icon`);
  const amtEl=document.querySelector(`[data-txid="${id}"] .tx-amount`);
  const cat2=getCat(type,cat);
  if(icon){icon.style.background=cat2.color+'18';icon.textContent=cat2.label.split(' ')[0];}
  if(amtEl){amtEl.style.color=type==='income'?'var(--accent)':'var(--danger)';}
  renderHome();
}

/* ══════════════════════════════════════════
   HISTORY
══════════════════════════════════════════ */
function changeHistoryMonth(d){const[y,m]=historyMonth.split('-').map(Number);const nd=new Date(y,m-1+d,1);historyMonth=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`;historyFilter=null;renderHistory();}

function renderHistory(){
  document.getElementById('history-month-label').textContent=monthLabel(historyMonth);
  const txs=loadTxs().filter(t=>monthKey(t.date)===historyMonth);
  const usedCats=[...new Set(txs.map(t=>t.type+'::'+t.cat))];
  const filterEl=document.getElementById('cat-filter');
  filterEl.innerHTML=`<div class="cat-chip ${!historyFilter?'sel':''}" onclick="setHistoryFilter(null)">Tutte (${txs.length})</div>`+
    usedCats.map(ck=>{const[type,cid]=ck.split('::');const cat=getCat(type,cid);const cnt=txs.filter(t=>t.cat===cid).length;return`<div class="cat-chip ${historyFilter===cid?'sel':''}" onclick="setHistoryFilter('${cid}')">${cat.label} <span style="opacity:.5">${cnt}</span></div>`;}).join('');
  const filtered=historyFilter?txs.filter(t=>t.cat===historyFilter):txs;
  const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  const listEl=document.getElementById('history-list');
  if(!sorted.length){listEl.innerHTML='<div class="card"><div class="empty"><div class="empty-icon">📂</div><div>Nessuna transazione</div></div></div>';return;}
  const byDate={};sorted.forEach(t=>{(byDate[t.date]=byDate[t.date]||[]).push(t);});
  listEl.innerHTML=Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>`
    <div class="section-title" style="margin-top:12px">${fmtDate(date)}</div>
    <div class="card">${items.map(t=>{const cat=getCat(t.type,t.cat);const sign=t.type==='income'?'+':'-';const col=t.type==='income'?'var(--accent)':'var(--danger)';return`<div class="tx-item" data-txid="${t.id}"><div class="tx-icon" style="background:${cat.color}18">${cat.label.split(' ')[0]}</div><div class="tx-info"><div class="tx-name">${t.description||t.desc||'—'}</div><div class="tx-cat-wrap">${catSelectHTML(t)}</div></div><div style="text-align:right;flex-shrink:0"><div class="tx-amount" style="color:${col}">${sign}${fmt(t.amount)}</div></div><button class="tx-del" onclick="deleteTx(${JSON.stringify(t.id)})">✕</button></div>`;}).join('')}</div>`).join('');
}

function setHistoryFilter(cat){historyFilter=cat;renderHistory();}

/* ══════════════════════════════════════════
   STATISTICS
══════════════════════════════════════════ */
function changeStatsMonth(d){const[y,m]=statsMonth.split('-').map(Number);const nd=new Date(y,m-1+d,1);statsMonth=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`;renderStats();}

function renderStats(){
  document.getElementById('stats-month-label').textContent=monthLabel(statsMonth);
  const allTxs=loadTxs();const mTxs=allTxs.filter(t=>monthKey(t.date)===statsMonth);
  const expenses=mTxs.filter(t=>t.type==='expense');const incomes=mTxs.filter(t=>t.type==='income');
  const totExp=expenses.reduce((s,t)=>s+t.amount,0);const totInc=incomes.reduce((s,t)=>s+t.amount,0);
  const daysInMonth=new Date(statsMonth.slice(0,4),statsMonth.slice(5),0).getDate();
  const avgDay=totExp>0?(totExp/daysInMonth):0;
  document.getElementById('stats-kpi').innerHTML=`
    <div class="card card-sm"><div class="card-label">📤 Tot. uscite</div><div class="stat-num red">${fmt(totExp)}</div></div>
    <div class="card card-sm"><div class="card-label">📥 Tot. entrate</div><div class="stat-num green">${fmt(totInc)}</div></div>
    <div class="card card-sm"><div class="card-label">📆 Media/giorno</div><div class="stat-num yellow">${fmt(avgDay)}</div></div>
    <div class="card card-sm"><div class="card-label">🔢 Movimenti</div><div class="stat-num">${mTxs.length}</div></div>`;
  const byCat={};expenses.forEach(t=>{byCat[t.cat]=(byCat[t.cat]||0)+t.amount;});
  const sortedCats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const catLabels=sortedCats.map(([id])=>getCat('expense',id).label);
  const catValues=sortedCats.map(([,v])=>v);
  const catColors=sortedCats.map(([id])=>getCat('expense',id).color);
  if(chartCat)chartCat.destroy();
  const ctx1=document.getElementById('chart-cat').getContext('2d');
  if(catValues.length){chartCat=new Chart(ctx1,{type:'doughnut',data:{labels:catLabels,datasets:[{data:catValues,backgroundColor:catColors,borderWidth:2,borderColor:'#ffffff'}]},options:{plugins:{legend:{labels:{color:'#1e293b',font:{family:'DM Sans',size:11},padding:12,boxWidth:11}}},cutout:'62%'}});}
  else{ctx1.clearRect(0,0,ctx1.canvas.width,ctx1.canvas.height);}
  const months=[];for(let i=5;i>=0;i--){const[y,mo]=statsMonth.split('-').map(Number);const d=new Date(y,mo-1-i,1);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
  const tInc=months.map(mo=>allTxs.filter(t=>monthKey(t.date)===mo&&t.type==='income').reduce((s,t)=>s+t.amount,0));
  const tExp=months.map(mo=>allTxs.filter(t=>monthKey(t.date)===mo&&t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const tLbl=months.map(mo=>{const[,m3]=mo.split('-');return new Date(0,+m3-1).toLocaleString('it',{month:'short'});});
  if(chartTrend)chartTrend.destroy();
  const ctx2=document.getElementById('chart-trend').getContext('2d');
  chartTrend=new Chart(ctx2,{type:'line',data:{labels:tLbl,datasets:[{label:'Entrate',data:tInc,borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.07)',tension:0.4,fill:true,pointBackgroundColor:'#16a34a',pointRadius:4},{label:'Spese',data:tExp,borderColor:'#dc2626',backgroundColor:'rgba(220,38,38,0.07)',tension:0.4,fill:true,pointBackgroundColor:'#dc2626',pointRadius:4}]},options:{plugins:{legend:{labels:{color:'#1e293b',font:{family:'DM Sans',size:11},padding:12,boxWidth:11}}},scales:{x:{ticks:{color:'#64748b',font:{family:'DM Sans'}},grid:{color:'rgba(0,0,0,0.05)'}},y:{ticks:{color:'#64748b',font:{family:'DM Sans'},callback:v=>'€'+v},grid:{color:'rgba(0,0,0,0.05)'}}}}});
  const total=catValues.reduce((s,v)=>s+v,0);
  const bkEl=document.getElementById('stats-breakdown');
  if(!sortedCats.length)bkEl.innerHTML='<div class="empty" style="padding:16px 0"><div>Nessuna spesa</div></div>';
  else bkEl.innerHTML=sortedCats.map(([id,val])=>{const cat=getCat('expense',id);const pct=total>0?(val/total*100).toFixed(1):0;return`<div class="breakdown-item"><div class="breakdown-header"><span>${cat.label}</span><span style="color:${cat.color};font-weight:600">${fmt(val)} <span class="breakdown-pct">${pct}%</span></span></div><div class="budget-bar-track"><div style="height:100%;width:${pct}%;background:${cat.color};border-radius:99px;transition:width 0.7s ease"></div></div></div>`;}).join('');
  const merchantMap={};expenses.forEach(t=>{const key=(t.description||t.desc||'').slice(0,35).trim();if(key)merchantMap[key]=(merchantMap[key]||0)+t.amount;});
  const topM=Object.entries(merchantMap).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const topEl=document.getElementById('stats-top-merchants');const mList=document.getElementById('stats-merchants-list');
  if(topM.length>1){topEl.style.display='block';mList.innerHTML=topM.map(([name,val])=>`<div class="tx-item"><div class="tx-info"><div class="tx-name">${name}</div></div><div class="tx-amount red">-${fmt(val)}</div></div>`).join('');}else topEl.style.display='none';
}

/* ══════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════ */
function loadSettingsUI(){
  const s=loadSettings();
  document.getElementById('set-balance').value=s.balance||'';
  document.getElementById('set-budget').value=s.budget||'';
  document.getElementById('set-name').value=s.name||'';
  document.getElementById('set-apikey').value=s.apiKey||'';
  document.getElementById('set-count').textContent=loadTxs().length+' movimenti';
}

function saveSettings(){
  saveSettings2({
    balance:parseFloat(document.getElementById('set-balance').value)||0,
    budget: parseFloat(document.getElementById('set-budget').value)||0,
    name:   document.getElementById('set-name').value.trim(),
    apiKey: document.getElementById('set-apikey').value.trim()
  });
  toast('✅ Impostazioni salvate!');showPage('home');
}

function exportCSV(){
  const txs=loadTxs();
  if(!txs.length){toast('Nessuna transazione');return;}
  const rows=[['Data','Tipo','Descrizione','Categoria','Importo','Fonte']];
  [...txs].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    const cat=getCat(t.type,t.cat);
    rows.push([t.date,t.type==='income'?'Entrata':'Uscita',(t.description||t.desc||'').replace(/"/g,"'"),cat.label.replace(/[^\w\s]/g,''),t.amount.toFixed(2),t.source||'manuale']);
  });
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);a.download=`budgetly_${todayISO()}.csv`;a.click();
}

function clearAll(){
  if(!confirm('⚠️ Eliminare TUTTE le transazioni?'))return;
  if(!confirm('Operazione irreversibile. Confermi?'))return;
  localStorage.removeItem('budgetly_txs');toast('✅ Dati eliminati');showPage('home');
}

/* ── INIT ── */
const cs=document.createElement('script');
cs.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
cs.onload=()=>renderHome();
document.head.appendChild(cs);
initDropZone();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
