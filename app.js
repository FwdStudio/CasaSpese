/* ═══════════════════════════════════════════
   CasaSpese v2 — CSV Import + Auto-categorise
═══════════════════════════════════════════ */

/* ── CATEGORIES ── */
const CATS = {
  income: [
    { id:'stipendio',  label:'💼 Stipendio',    color:'#4ade80' },
    { id:'freelance',  label:'💻 Freelance',    color:'#22d3ee' },
    { id:'rimborso',   label:'↩️ Rimborso',     color:'#34d399' },
    { id:'regalo',     label:'🎁 Regalo',       color:'#a78bfa' },
    { id:'pensione',   label:'🧓 Pensione',     color:'#60a5fa' },
    { id:'altro_in',   label:'📦 Altro entrata',color:'#94a3b8' },
  ],
  expense: [
    { id:'spesa',        label:'🛒 Spesa alim.',   color:'#f87171' },
    { id:'affitto',      label:'🏠 Affitto/Mutuo', color:'#fb923c' },
    { id:'utenze',       label:'💡 Utenze',        color:'#fbbf24' },
    { id:'trasporti',    label:'🚗 Trasporti',     color:'#60a5fa' },
    { id:'salute',       label:'🏥 Salute',        color:'#34d399' },
    { id:'ristoranti',   label:'🍕 Ristoranti',    color:'#f472b6' },
    { id:'abbonamenti',  label:'📱 Abbonamenti',   color:'#a78bfa' },
    { id:'svago',        label:'🎮 Svago',         color:'#fb7185' },
    { id:'vestiti',      label:'👗 Abbigliamento', color:'#e879f9' },
    { id:'istruzione',   label:'📚 Istruzione',    color:'#38bdf8' },
    { id:'casa',         label:'🪴 Casa/Arredo',   color:'#86efac' },
    { id:'banca',        label:'🏦 Commissioni',   color:'#94a3b8' },
    { id:'assicurazione',label:'🛡️ Assicuraz.',    color:'#c084fc' },
    { id:'viaggi',       label:'✈️ Viaggi',        color:'#67e8f9' },
    { id:'altro_ex',     label:'📦 Altro uscita',  color:'#64748b' },
  ]
};

/* ── AUTO-CATEGORISE RULES ──
   Each rule: { patterns (regex strings), type, cat }
*/
const CAT_RULES = [
  // income
  { p:['stipend','salario','paga ','retribuz'], t:'income', c:'stipendio' },
  { p:['pensione','inps','quota pensione'],     t:'income', c:'pensione' },
  { p:['rimborso','restituz'],                  t:'income', c:'rimborso' },
  { p:['bonifico a vostro','accredito','versamento','ricarica'],t:'income',c:'altro_in'},
  // expense — utilities
  { p:['enel','a2a','iren','hera','eni gas','italgas','sorgenia','edison','luce ','gas ','elettric','acqua ','tari','tassa rifiuti'], t:'expense', c:'utenze' },
  { p:['telecom','tim ','vodafone','iliad','windtre','fastweb','tiscali','internet','telefon'], t:'expense', c:'utenze' },
  // rent/mortgage
  { p:['affitto','mutuo','canone locaz'], t:'expense', c:'affitto' },
  // food
  { p:['esselunga','conad','coop ','lidl','aldi','carrefour','penny','pam ','iper','ipercoop','supermercato','sigma ','despar','dì per dì','md disc','eurospin','bennet'], t:'expense', c:'spesa' },
  // restaurants/food delivery
  { p:['bar ','caffe','caffè','ristorante','trattoria','pizzeria','osteria','mcdonald','burger king','kfc','subway','just eat','deliveroo','glovo','uber eat'], t:'expense', c:'ristoranti' },
  // transport
  { p:['atm ','atac','gtt ','gtт','ferrovie','trenitalia','italo treno','flixbus','ryanair','easyjet','wizz','alitalia','ita ','autobus','taxi','uber','bolt ','free now','telepass','autostrada','parkng','parking','parcheggio','benzina','ip ','q8','eni ','agip','total ','tamoil','carburante'], t:'expense', c:'trasporti' },
  // health
  { p:['farmacia','farmacie','parafarm','laboratorio','medic','dentista','oculista','fisioterapia','ospedale','asl ','azienda sanitaria','clinica'], t:'expense', c:'salute' },
  // subscriptions
  { p:['netflix','spotify','amazon prime','apple','google play','dazn','sky ','disney','microsoft','adobe','icloud','dropbox','linkedin premium','pagamento ricorrente'], t:'expense', c:'abbonamenti' },
  // entertainment/leisure
  { p:['cinema','teatro','museo','palestra','sport','libreria','amazon','zalando','shein','giochi','game','ticket','bigliett'], t:'expense', c:'svago' },
  // clothing
  { p:['zara','h&m','primark','benetton','calzedonia','intimissimi','oviesse','abbigliamento','scarpe'], t:'expense', c:'vestiti' },
  // bank fees
  { p:['commissione','spese banca','canone conto','bollo','imposta di bollo','prelievo','bancomat'], t:'expense', c:'banca' },
  // insurance
  { p:['assicuraz','polizza','generali','unipol','allianz','axa '], t:'expense', c:'assicurazione' },
  // home
  { p:['ikea','leroy','bricofer','brico ','castorama','fai da te','arredament','elettrodomest'], t:'expense', c:'casa' },
];

function autoCategory(desc, amount) {
  const d = desc.toLowerCase();
  for (const rule of CAT_RULES) {
    if (rule.p.some(p => d.includes(p))) {
      // honour forced type from amount sign if available
      return { type: rule.t, cat: rule.c };
    }
  }
  // fallback by sign
  return amount >= 0
    ? { type:'income', cat:'altro_in' }
    : { type:'expense', cat:'altro_ex' };
}

/* ── STORAGE ── */
function loadTxs()      { return JSON.parse(localStorage.getItem('cs_txs') || '[]'); }
function saveTxs(t)     { localStorage.setItem('cs_txs', JSON.stringify(t)); }
function loadSettings() { return JSON.parse(localStorage.getItem('cs_settings') || '{"balance":0,"budget":0,"name":""}'); }
function saveSettings2(s){ localStorage.setItem('cs_settings', JSON.stringify(s)); }

/* ── FORMAT ── */
const fmt     = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const fmtDate = iso => new Date(iso+'T00:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'short'});
const monthKey= iso => iso.slice(0,7);
const todayISO= ()  => new Date().toISOString().slice(0,10);
const thisMonth=()  => todayISO().slice(0,7);
function monthLabel(ym) {
  const [y,m]=ym.split('-');
  return new Date(+y,+m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});
}

/* ── STATE ── */
let historyMonth = thisMonth();
let statsMonth   = thisMonth();
let historyFilter= null;
let pendingImport= null; // rows ready to confirm
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

function toast(msg, ms=2500) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), ms);
}

/* ══════════════════════════════════════════
   CSV PARSING
══════════════════════════════════════════ */

/* Detect separator */
function detectSep(line) {
  const counts = {';':0, ',':0, '\t':0, '|':0};
  for (const c of line) if (counts[c]!==undefined) counts[c]++;
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}

/* Parse a CSV string into array-of-arrays */
function parseCSV(text, sep) {
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  return lines.map(line => {
    const cells = []; let cur=''; let inQ=false;
    for (let i=0;i<line.length;i++) {
      const ch=line[i];
      if (ch==='"'){ inQ=!inQ; continue; }
      if (ch===sep && !inQ){ cells.push(cur.trim()); cur=''; }
      else cur+=ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

/* Parse Italian date dd/mm/yyyy or yyyy-mm-dd */
function parseItalianDate(s) {
  if (!s) return null;
  s = s.trim().replace(/\./g,'/');
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [,d,m,y]=dmy;
    if (y.length===2) y='20'+y;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    let [,y,m,d]=ymd;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return null;
}

/* Parse Italian number: 1.234,56 → 1234.56 */
function parseItalianNum(s) {
  if (!s) return null;
  s = s.trim().replace(/\s/g,'');
  // remove thousands dot, replace comma decimal
  s = s.replace(/\./g,'').replace(',','.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/* ── BANK FORMAT DETECTORS ──
   Each returns {date, description, amount} or null
*/
const FORMATS = [
  {
    name: 'BCC / ICCREA',
    // Data;Valuta;Descrizione;Importo;Causale  OR  Data;Valuta;Descrizione;Dare;Avere;Causale
    detect: h => h.some(c=>/^data/i.test(c)) && h.some(c=>/valuta/i.test(c)) && h.some(c=>/descriz|causale/i.test(c)),
    parse(h,r) {
      const iDate = h.findIndex(c=>/^data/i.test(c));
      const iDesc = h.findIndex(c=>/descriz/i.test(c));
      const iAmt  = h.findIndex(c=>/^importo$/i.test(c));
      const iDare = h.findIndex(c=>/^dare$/i.test(c));
      const iAvere= h.findIndex(c=>/^avere$/i.test(c));
      const date  = parseItalianDate(r[iDate]);
      const description = r[iDesc]||'';
      let amount;
      if (iAmt>=0) amount = parseItalianNum(r[iAmt]);
      else if (iDare>=0 && iAvere>=0) {
        const d = parseItalianNum(r[iDare])||0;
        const a = parseItalianNum(r[iAvere])||0;
        amount = a - d; // credit positive, debit negative
      }
      return date && amount!==null ? {date,description,amount} : null;
    }
  },
  {
    name: 'UniCredit',
    detect: h => h.some(c=>/^data$/i.test(c)) && h.some(c=>/^euro$/i.test(c)||/^importo$/i.test(c)) && h.some(c=>/caus/i.test(c)),
    parse(h,r) {
      const iDate = h.findIndex(c=>/^data$/i.test(c));
      const iDesc = h.findIndex(c=>/descrizione/i.test(c));
      const iAmt  = h.findIndex(c=>/^euro$|^importo$/i.test(c));
      const date  = parseItalianDate(r[iDate]);
      const description = r[iDesc]||r[h.findIndex(c=>/descr/i.test(c))]||'';
      const amount= parseItalianNum(r[iAmt]);
      return date && amount!==null ? {date,description,amount} : null;
    }
  },
  {
    name: 'Intesa Sanpaolo',
    detect: h => h.some(c=>/data operaz/i.test(c)) && h.some(c=>/importo/i.test(c)),
    parse(h,r) {
      const iDate = h.findIndex(c=>/data operaz/i.test(c));
      const iDesc = h.findIndex(c=>/descrizione|causale/i.test(c));
      const iAmt  = h.findIndex(c=>/importo/i.test(c));
      const date  = parseItalianDate(r[iDate]);
      const description = r[iDesc]||'';
      const amount= parseItalianNum(r[iAmt]);
      return date && amount!==null ? {date,description,amount} : null;
    }
  },
  {
    name: 'Fineco',
    detect: h => h.some(c=>/^data$/i.test(c)) && h.some(c=>/^entrate$/i.test(c)) && h.some(c=>/^uscite$/i.test(c)),
    parse(h,r) {
      const iDate = h.findIndex(c=>/^data$/i.test(c));
      const iDesc = h.findIndex(c=>/descrizione|operazione/i.test(c));
      const iIn   = h.findIndex(c=>/^entrate$/i.test(c));
      const iOut  = h.findIndex(c=>/^uscite$/i.test(c));
      const date  = parseItalianDate(r[iDate]);
      const description = r[iDesc]||'';
      const inAmt = parseItalianNum(r[iIn])||0;
      const outAmt= parseItalianNum(r[iOut])||0;
      const amount= inAmt > 0 ? inAmt : -outAmt;
      return date && amount!==0 ? {date,description,amount} : null;
    }
  },
  {
    name: 'BancoBPM / Webank',
    detect: h => h.some(c=>/data contabile/i.test(c)) && h.some(c=>/importo/i.test(c)),
    parse(h,r) {
      const iDate = h.findIndex(c=>/data contabile/i.test(c));
      const iDesc = h.findIndex(c=>/descrizione|causale/i.test(c));
      const iAmt  = h.findIndex(c=>/importo/i.test(c));
      const date  = parseItalianDate(r[iDate]);
      const description = r[iDesc]||'';
      const amount= parseItalianNum(r[iAmt]);
      return date && amount!==null ? {date,description,amount} : null;
    }
  },
  {
    // Generic fallback: find first date col, first number col, first text col
    name: 'Generico (auto-rilevato)',
    detect: () => true,
    parse(h,r) {
      let date=null, amount=null, description='';
      for (let i=0;i<r.length;i++) {
        if (!date) date = parseItalianDate(r[i]);
        if (!description && r[i].length>5 && isNaN(parseItalianNum(r[i])) && !parseItalianDate(r[i])) description=r[i];
        if (amount===null) { const n=parseItalianNum(r[i]); if (n!==null && Math.abs(n)<1000000) amount=n; }
      }
      return date && amount!==null ? {date,description,amount} : null;
    }
  }
];

/* Find header row (skip bank preamble lines) */
function findHeaderRow(rows) {
  for (let i=0;i<Math.min(rows.length,15);i++) {
    const row = rows[i].map(c=>c.toLowerCase());
    if (row.some(c=>c.includes('data')) && row.some(c=>c.includes('import')||c.includes('euro')||c.includes('entrate')||c.includes('avere')))
      return i;
  }
  return 0;
}

/* Deduplicate against existing transactions */
function isDuplicate(tx, existing) {
  return existing.some(e =>
    e.date===tx.date &&
    Math.abs(e.amount - tx.amount) < 0.01 &&
    e.description.slice(0,20) === tx.description.slice(0,20)
  );
}

/* ── MAIN PARSE FUNCTION ── */
async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const firstLine = text.split(/\r?\n/)[0];
        const sep = detectSep(firstLine);
        const rows = parseCSV(text, sep);
        if (rows.length < 2) { reject('File troppo corto o vuoto'); return; }

        const headerIdx = findHeaderRow(rows);
        const headers   = rows[headerIdx].map(c=>c.toLowerCase().trim());
        const dataRows  = rows.slice(headerIdx+1).filter(r=>r.some(c=>c.trim()));

        // Detect format
        const fmt = FORMATS.find(f=>f.detect(headers)) || FORMATS[FORMATS.length-1];

        // Parse all rows
        const parsed = [];
        for (const row of dataRows) {
          const tx = fmt.parse(headers, row);
          if (tx && tx.date && tx.date > '2000-01-01') {
            const {type,cat} = autoCategory(tx.description, tx.amount);
            parsed.push({
              id: Date.now() + Math.random(),
              date: tx.date,
              description: tx.description.slice(0,120),
              amount: Math.abs(tx.amount),
              type: tx.amount >= 0 ? 'income' : 'expense',
              cat,
              note: '',
              source: 'csv'
            });
          }
        }

        // Override type with categoriser if sign ambiguous
        parsed.forEach(p => {
          const {type,cat} = autoCategory(p.description, p.type==='income'?1:-1);
          // Only override cat, keep type from amount sign
          p.cat = cat;
          // But if rule strongly says income on a positive amount, trust sign
        });

        resolve({ rows: parsed, format: fmt.name });
      } catch(err) { reject(err.toString()); }
    };
    reader.onerror = () => reject('Errore lettura file');
    reader.readAsText(file, 'UTF-8');
  });
}

/* ── DROP ZONE EVENTS ── */
function initDropZone() {
  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave',()=> zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
    input.value='';
  });
}

async function handleFile(file) {
  setProgress(true, 'Lettura file…', 10);
  try {
    setProgress(true, 'Rilevamento formato…', 30);
    await sleep(120);
    const { rows, format } = await parseFile(file);

    setProgress(true, `Categorizzazione ${rows.length} movimenti…`, 60);
    await sleep(200);

    const existing = loadTxs();
    let dupCount = 0;
    const newRows = rows.filter(r => {
      if (isDuplicate(r, existing)) { dupCount++; return false; }
      return true;
    });

    setProgress(true, 'Preparazione anteprima…', 90);
    await sleep(150);
    setProgress(false);

    pendingImport = newRows;
    showReview(newRows, dupCount, rows.length, format);

  } catch(err) {
    setProgress(false);
    toast('❌ Errore: ' + err);
  }
}

function setProgress(show, label='', pct=0) {
  const el = document.getElementById('import-progress');
  el.style.display = show ? 'block' : 'none';
  document.getElementById('progress-label').textContent = label;
  document.getElementById('progress-bar').style.width = pct+'%';
}

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

function showReview(newRows, dupCount, total, format) {
  document.getElementById('rev-new').textContent   = newRows.length;
  document.getElementById('rev-dup').textContent   = dupCount;
  document.getElementById('rev-total').textContent = total;
  document.getElementById('review-format').textContent = 'Formato rilevato: ' + format;

  // Show a sample of up to 12 rows for category review
  const mapSection = document.getElementById('cat-mapping-section');
  const mapList    = document.getElementById('cat-mapping-list');
  const sample = newRows.slice(0, 12);

  if (sample.length > 0) {
    mapSection.style.display = 'block';
    mapList.innerHTML = sample.map((tx,i) => {
      const catOptions = tx.type==='income'
        ? CATS.income.map(c=>`<option value="${c.id}" ${c.id===tx.cat?'selected':''}>${c.label}</option>`).join('')
        : CATS.expense.map(c=>`<option value="${c.id}" ${c.id===tx.cat?'selected':''}>${c.label}</option>`).join('');
      return `
        <div class="cat-map-item">
          <div>
            <div style="font-size:12px;font-weight:500;margin-bottom:2px">${fmtDate(tx.date)} · <span style="color:${tx.amount>0?'var(--accent)':'var(--danger)'}">${tx.type==='income'?'+':'-'}${fmt(tx.amount)}</span></div>
            <div class="cat-map-desc">${tx.description || '—'}</div>
          </div>
          <select class="cat-map-sel" onchange="updatePendingCat(${i}, this.value)">
            <optgroup label="Entrate">${CATS.income.map(c=>`<option value="income::${c.id}" ${tx.type==='income'&&c.id===tx.cat?'selected':''}>${c.label}</option>`).join('')}</optgroup>
            <optgroup label="Uscite">${CATS.expense.map(c=>`<option value="expense::${c.id}" ${tx.type==='expense'&&c.id===tx.cat?'selected':''}>${c.label}</option>`).join('')}</optgroup>
          </select>
        </div>`;
    }).join('');
  } else {
    mapSection.style.display = 'none';
  }

  document.getElementById('review-box').style.display = 'block';
  document.getElementById('drop-zone').style.display  = 'none';
}

function updatePendingCat(idx, val) {
  if (!pendingImport || !pendingImport[idx]) return;
  const [type,cat] = val.split('::');
  pendingImport[idx].type = type;
  pendingImport[idx].cat  = cat;
}

function confirmImport() {
  if (!pendingImport || !pendingImport.length) { toast('Nessuna transazione da importare'); return; }
  const existing = loadTxs();
  const merged   = [...existing, ...pendingImport];
  saveTxs(merged);
  toast(`✅ ${pendingImport.length} transazioni importate!`);
  resetImport();
  showPage('home');
}

function resetImport() {
  pendingImport = null;
  document.getElementById('review-box').style.display  = 'none';
  document.getElementById('drop-zone').style.display   = 'block';
  document.getElementById('import-progress').style.display = 'none';
}

/* ══════════════════════════════════════════
   HOME
══════════════════════════════════════════ */
function renderHome() {
  const txs = loadTxs();
  const settings = loadSettings();
  const m = thisMonth();
  const mTxs = txs.filter(t=>monthKey(t.date)===m);

  const income  = mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = (settings.balance||0) + txs.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount),0);
  const budget  = settings.budget||0;
  const remaining = budget>0 ? budget-expense : balance;

  const name = settings.name || '';
  document.getElementById('home-sub').textContent =
    (name ? `Ciao ${name} — ` : '') + new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});

  // Hero
  const heroEl = document.getElementById('hero-remaining');
  if (budget>0) {
    heroEl.textContent = fmt(remaining);
    heroEl.className = 'hero-amount'+(remaining<0?' negative':'');
    document.getElementById('hero-sub').textContent = `${fmt(expense)} spesi su ${fmt(budget)} di budget`;
  } else {
    heroEl.textContent = fmt(balance);
    heroEl.className = 'hero-amount';
    document.getElementById('hero-sub').textContent = 'Saldo conto corrente aggiornato';
  }

  // Bar
  if (budget>0) {
    const pct=Math.min((expense/budget)*100,100);
    const bar=document.getElementById('budget-bar');
    bar.style.width=pct+'%';
    bar.className='budget-bar-fill '+(pct<60?'bar-green':pct<85?'bar-yellow':'bar-red');
    document.getElementById('bar-spent-label').textContent=`Speso: ${fmt(expense)}`;
    document.getElementById('bar-budget-label').textContent=`Budget: ${fmt(budget)}`;
  }

  // Alert
  const alertEl=document.getElementById('budget-alert');
  if (budget>0) {
    const pct=(expense/budget)*100;
    if (pct>=100){ alertEl.style.display='flex'; alertEl.className='alert alert-red'; alertEl.innerHTML='⚠️ Hai superato il budget mensile!'; }
    else if (pct>=80){ alertEl.style.display='flex'; alertEl.className='alert alert-yellow'; alertEl.innerHTML=`🔔 Hai usato il ${Math.round(pct)}% del budget`; }
    else alertEl.style.display='none';
  } else alertEl.style.display='none';

  document.getElementById('stat-income').textContent  = fmt(income);
  document.getElementById('stat-expense').textContent = fmt(expense);
  document.getElementById('stat-balance').textContent = fmt(balance);
  document.getElementById('stat-count').textContent   = mTxs.length;

  const recent=[...txs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  renderTxList(document.getElementById('recent-list'), recent, false);
}

/* ══════════════════════════════════════════
   TX LIST
══════════════════════════════════════════ */
function getCat(type,id) {
  return (CATS[type]||[]).find(c=>c.id===id) || {label:id,color:'#94a3b8'};
}

function renderTxList(container, txs, showDel=true) {
  if (!txs.length) {
    container.innerHTML='<div class="empty"><div class="empty-icon">📂</div><div>Nessuna transazione</div></div>';
    return;
  }
  container.innerHTML = txs.map(t=>{
    const cat=getCat(t.type,t.cat);
    const sign=t.type==='income'?'+':'-';
    const col=t.type==='income'?'var(--accent)':'var(--danger)';
    return `<div class="tx-item">
      <div class="tx-icon" style="background:${cat.color}22">${cat.label.split(' ')[0]}</div>
      <div class="tx-info">
        <div class="tx-name">${t.description||t.desc||'—'}</div>
        <div class="tx-cat">${cat.label}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="tx-amount" style="color:${col}">${sign}${fmt(t.amount)}</div>
        <div class="tx-date">${fmtDate(t.date)}</div>
      </div>
      ${showDel?`<button class="tx-del" onclick="deleteTx(${JSON.stringify(t.id)})">✕</button>`:''}
    </div>`;
  }).join('');
}

function deleteTx(id) {
  if (!confirm('Eliminare questa transazione?')) return;
  saveTxs(loadTxs().filter(t=>t.id!==id));
  renderHistory(); renderHome();
}

/* ══════════════════════════════════════════
   HISTORY
══════════════════════════════════════════ */
function changeHistoryMonth(d) {
  const [y,m]=historyMonth.split('-').map(Number);
  const nd=new Date(y,m-1+d,1);
  historyMonth=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`;
  historyFilter=null; renderHistory();
}

function renderHistory() {
  document.getElementById('history-month-label').textContent=monthLabel(historyMonth);
  const txs=loadTxs().filter(t=>monthKey(t.date)===historyMonth);
  const usedCats=[...new Set(txs.map(t=>t.type+'::'+t.cat))];

  const filterEl=document.getElementById('cat-filter');
  filterEl.innerHTML=`<div class="cat-chip ${!historyFilter?'sel':''}" onclick="setHistoryFilter(null)">Tutte (${txs.length})</div>`+
    usedCats.map(ck=>{
      const [type,cid]=ck.split('::');
      const cat=getCat(type,cid);
      const cnt=txs.filter(t=>t.cat===cid).length;
      return `<div class="cat-chip ${historyFilter===cid?'sel':''}" onclick="setHistoryFilter('${cid}')">${cat.label} <span style="opacity:.6">${cnt}</span></div>`;
    }).join('');

  const filtered=historyFilter?txs.filter(t=>t.cat===historyFilter):txs;
  const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  const listEl=document.getElementById('history-list');

  if (!sorted.length){ listEl.innerHTML='<div class="card"><div class="empty"><div class="empty-icon">📂</div><div>Nessuna transazione</div></div></div>'; return; }

  const byDate={};
  sorted.forEach(t=>{(byDate[t.date]=byDate[t.date]||[]).push(t);});
  listEl.innerHTML=Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>`
    <div class="section-title" style="margin-top:12px">${fmtDate(date)}</div>
    <div class="card">${items.map(t=>{
      const cat=getCat(t.type,t.cat);
      const sign=t.type==='income'?'+':'-';
      const col=t.type==='income'?'var(--accent)':'var(--danger)';
      return `<div class="tx-item">
        <div class="tx-icon" style="background:${cat.color}22">${cat.label.split(' ')[0]}</div>
        <div class="tx-info"><div class="tx-name">${t.description||t.desc||'—'}</div><div class="tx-cat">${cat.label}</div></div>
        <div style="text-align:right;flex-shrink:0">
          <div class="tx-amount" style="color:${col}">${sign}${fmt(t.amount)}</div>
        </div>
        <button class="tx-del" onclick="deleteTx(${JSON.stringify(t.id)})">✕</button>
      </div>`;
    }).join('')}</div>`).join('');
}

function setHistoryFilter(cat){ historyFilter=cat; renderHistory(); }

/* ══════════════════════════════════════════
   STATISTICS
══════════════════════════════════════════ */
function changeStatsMonth(d) {
  const [y,m]=statsMonth.split('-').map(Number);
  const nd=new Date(y,m-1+d,1);
  statsMonth=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`;
  renderStats();
}

function renderStats() {
  document.getElementById('stats-month-label').textContent=monthLabel(statsMonth);
  const allTxs=loadTxs();
  const mTxs=allTxs.filter(t=>monthKey(t.date)===statsMonth);
  const expenses=mTxs.filter(t=>t.type==='expense');
  const incomes =mTxs.filter(t=>t.type==='income');
  const totExp=expenses.reduce((s,t)=>s+t.amount,0);
  const totInc=incomes.reduce((s,t)=>s+t.amount,0);
  const avgDay=totExp>0?(totExp/new Date(statsMonth.slice(0,4),statsMonth.slice(5),0).getDate()):0;

  // KPI
  document.getElementById('stats-kpi').innerHTML=`
    <div class="card card-sm"><div class="card-label">📤 Tot. uscite</div><div class="stat-num red">${fmt(totExp)}</div></div>
    <div class="card card-sm"><div class="card-label">📥 Tot. entrate</div><div class="stat-num green">${fmt(totInc)}</div></div>
    <div class="card card-sm"><div class="card-label">📆 Media/giorno</div><div class="stat-num yellow">${fmt(avgDay)}</div></div>
    <div class="card card-sm"><div class="card-label">🔢 Movimenti</div><div class="stat-num">${mTxs.length}</div></div>`;

  // Category donut
  const byCat={};
  expenses.forEach(t=>{byCat[t.cat]=(byCat[t.cat]||0)+t.amount;});
  const sortedCats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const catLabels=sortedCats.map(([id])=>getCat('expense',id).label);
  const catValues=sortedCats.map(([,v])=>v);
  const catColors=sortedCats.map(([id])=>getCat('expense',id).color);

  if (chartCat) chartCat.destroy();
  const ctx1=document.getElementById('chart-cat').getContext('2d');
  if (catValues.length) {
    chartCat=new Chart(ctx1,{
      type:'doughnut',
      data:{labels:catLabels,datasets:[{data:catValues,backgroundColor:catColors,borderWidth:2,borderColor:'#0b1118'}]},
      options:{
        plugins:{legend:{labels:{color:'#e8edf2',font:{family:'DM Sans',size:11},padding:12,boxWidth:11}}},
        cutout:'62%'
      }
    });
  } else {
    ctx1.clearRect(0,0,ctx1.canvas.width,ctx1.canvas.height);
    ctx1.fillStyle='#6b8090'; ctx1.font='13px DM Sans'; ctx1.textAlign='center';
    ctx1.fillText('Nessuna spesa in questo mese',ctx1.canvas.width/2,ctx1.canvas.height/2);
  }

  // Trend line (6 months)
  const months=[];
  for (let i=5;i>=0;i--){
    const [y,mo]=statsMonth.split('-').map(Number);
    const d=new Date(y,mo-1-i,1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const tInc=months.map(mo=>allTxs.filter(t=>monthKey(t.date)===mo&&t.type==='income').reduce((s,t)=>s+t.amount,0));
  const tExp=months.map(mo=>allTxs.filter(t=>monthKey(t.date)===mo&&t.type==='expense').reduce((s,t)=>s+t.amount,0));
  const tLbl=months.map(mo=>{const[,m3]=mo.split('-');return new Date(0,+m3-1).toLocaleString('it',{month:'short'});});

  if (chartTrend) chartTrend.destroy();
  const ctx2=document.getElementById('chart-trend').getContext('2d');
  chartTrend=new Chart(ctx2,{
    type:'line',
    data:{labels:tLbl,datasets:[
      {label:'Entrate',data:tInc,borderColor:'#4ade80',backgroundColor:'rgba(74,222,128,0.07)',tension:0.4,fill:true,pointBackgroundColor:'#4ade80',pointRadius:4},
      {label:'Spese',  data:tExp,borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.07)',tension:0.4,fill:true,pointBackgroundColor:'#f87171',pointRadius:4}
    ]},
    options:{
      plugins:{legend:{labels:{color:'#e8edf2',font:{family:'DM Sans',size:11},padding:12,boxWidth:11}}},
      scales:{
        x:{ticks:{color:'#6b8090',font:{family:'DM Sans'}},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#6b8090',font:{family:'DM Sans'},callback:v=>'€'+v},grid:{color:'rgba(255,255,255,0.04)'}}
      }
    }
  });

  // Category breakdown bars
  const total=catValues.reduce((s,v)=>s+v,0);
  const bkEl=document.getElementById('stats-breakdown');
  if (!sortedCats.length){ bkEl.innerHTML='<div class="empty" style="padding:16px 0"><div>Nessuna spesa</div></div>'; }
  else bkEl.innerHTML=sortedCats.map(([id,val])=>{
    const cat=getCat('expense',id);
    const pct=total>0?(val/total*100).toFixed(1):0;
    return `<div class="breakdown-item">
      <div class="breakdown-header"><span>${cat.label}</span><span style="color:${cat.color};font-weight:600">${fmt(val)} <span class="breakdown-pct">${pct}%</span></span></div>
      <div class="budget-bar-track"><div style="height:100%;width:${pct}%;background:${cat.color};border-radius:99px;transition:width 0.7s ease"></div></div>
    </div>`;
  }).join('');

  // Top merchants
  const merchantMap={};
  expenses.forEach(t=>{
    const key=(t.description||t.desc||'').slice(0,35).trim();
    if (key) merchantMap[key]=(merchantMap[key]||0)+t.amount;
  });
  const topM=Object.entries(merchantMap).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const topEl=document.getElementById('stats-top-merchants');
  const mList=document.getElementById('stats-merchants-list');
  if (topM.length>1){
    topEl.style.display='block';
    mList.innerHTML=topM.map(([name,val])=>`
      <div class="tx-item">
        <div class="tx-info"><div class="tx-name">${name}</div></div>
        <div class="tx-amount red">-${fmt(val)}</div>
      </div>`).join('');
  } else topEl.style.display='none';
}

/* ══════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════ */
function loadSettingsUI() {
  const s=loadSettings();
  document.getElementById('set-balance').value=s.balance||'';
  document.getElementById('set-budget').value=s.budget||'';
  document.getElementById('set-name').value=s.name||'';
  document.getElementById('set-count').textContent=loadTxs().length+' movimenti';
}

function saveSettings() {
  saveSettings2({
    balance:parseFloat(document.getElementById('set-balance').value)||0,
    budget: parseFloat(document.getElementById('set-budget').value)||0,
    name:   document.getElementById('set-name').value.trim()
  });
  toast('✅ Impostazioni salvate!');
  showPage('home');
}

/* ══════════════════════════════════════════
   EXPORT / RESET
══════════════════════════════════════════ */
function exportCSV() {
  const txs=loadTxs();
  if (!txs.length){ toast('Nessuna transazione da esportare'); return; }
  const rows=[['Data','Tipo','Descrizione','Categoria','Importo','Fonte']];
  [...txs].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    const cat=getCat(t.type,t.cat);
    rows.push([t.date,t.type==='income'?'Entrata':'Uscita',(t.description||t.desc||'').replace(/"/g,"'"),cat.label.replace(/[^\w\s]/g,''),t.amount.toFixed(2),t.source||'manuale']);
  });
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download=`casaspese_${todayISO()}.csv`;
  a.click();
}

function clearAll() {
  if (!confirm('⚠️ Eliminare TUTTE le transazioni?')) return;
  if (!confirm('Operazione irreversibile. Confermi?')) return;
  localStorage.removeItem('cs_txs');
  toast('✅ Dati eliminati');
  showPage('home');
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
// Load Chart.js then boot
const cs=document.createElement('script');
cs.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
cs.onload=()=>{ renderHome(); };
document.head.appendChild(cs);

initDropZone();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ══════════════════════════════════════════
   PDF PARSER — BCC Milano / RelaxBanking
══════════════════════════════════════════ */

function loadPdfJs() {
  return new Promise((resolve) => {
    if (window.pdfjsLib) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    document.head.appendChild(s);
  });
}

async function parsePDF(file) {
  await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const transactions = [];
  // Regex per riga BCC: data_contabile data_valuta? importo descrizione
  // Es: "28/05/2026 25/05/2026 -43,79 Operazione POS..."
  // oppure "28/05/2026 15.799,35 Saldo finale..."
  const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+(?:(\d{2}\/\d{2}\/\d{4})\s+)?(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+)$/;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Ricostruiamo le righe raggruppando per Y (stessa riga = stesso y arrotondato)
    const byY = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push(item.str);
    });

    // Ordiniamo per Y decrescente (top → bottom)
    const lines = Object.entries(byY)
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(' ').replace(/\s+/g, ' ').trim());

    // Alcune righe BCC sono spezzate su 2 righe: uniamo se la riga seguente
    // non inizia con una data
    const merged = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (merged.length && !line.match(/^\d{2}\/\d{2}\/\d{4}/) && merged[merged.length-1].match(/^\d{2}\/\d{2}\/\d{4}/)) {
        merged[merged.length-1] += ' ' + line;
      } else {
        merged.push(line);
      }
    }

    for (const line of merged) {
      const m = line.match(rowRe);
      if (!m) continue;
      const [, dateContabile, dateValuta, importoRaw, desc] = m;

      // Salta righe di saldo / intestazione
      if (/saldo (finale|iniziale|contabile|disponibile)/i.test(desc)) continue;
      if (/data contabile|data valuta|movimenti/i.test(desc)) continue;

      const amount = parseItalianNum(importoRaw);
      if (amount === null || amount === 0) continue;

      const date = parseItalianDate(dateValuta || dateContabile);
      if (!date) continue;

      // Pulizia descrizione: rimuovi numeri carta e codici lunghi
      const cleanDesc = desc
        .replace(/CARTA\s+\d+/gi, '')
        .replace(/\b\d{10,}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);

      const { type, cat } = autoCategory(cleanDesc, amount);

      transactions.push({
        id: Date.now() + Math.random(),
        date,
        description: cleanDesc,
        amount: Math.abs(amount),
        type: amount >= 0 ? 'income' : 'expense',
        cat,
        note: '',
        source: 'pdf-bcc'
      });
    }
  }

  return transactions;
}

/* ── Estendi handleFile per supportare PDF ── */
const _origHandleFile = handleFile;
window.handleFile = async function(file) {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    setProgress(true, 'Lettura PDF BCC…', 15);
    try {
      setProgress(true, 'Estrazione testo…', 35);
      await sleep(100);
      const rows = await parsePDF(file);
      setProgress(true, `Categorizzazione ${rows.length} movimenti…`, 65);
      await sleep(150);

      const existing = loadTxs();
      let dupCount = 0;
      const newRows = rows.filter(r => {
        if (isDuplicate(r, existing)) { dupCount++; return false; }
        return true;
      });

      setProgress(false);
      pendingImport = newRows;
      showReview(newRows, dupCount, rows.length, 'BCC Milano (PDF RelaxBanking)');
    } catch(err) {
      setProgress(false);
      toast('❌ Errore PDF: ' + err);
      console.error(err);
    }
  } else {
    return _origHandleFile(file);
  }
};
