/* =========================================================
   業務自動化診断アプリ  —  画面ロジック
   入力は「業種」と「従業員数」の2問のみ。
   残りは業種別パラメータ（INDUSTRY_DEFAULTS）から自動推計する。
   ========================================================= */

const STEP_NAMES = ['事業内容', '従業員数', '無駄と感じる業務', '報告書'];
const CATS = ['営業', '顧客対応', '経理・財務', '人事・労務', '社内管理', '現場業務'];
const LS_KEY = 'shindan_state_v3';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- 初期状態 ---------- */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function newState() {
  return {
    step: 1,
    company: { name: '', contact: '', emp: 0, industry: '', date: todayStr(), analyst: '' },
    tasks: [],
    env: { tools: [], literacy: '一般的な業務ソフトは使える', data: 'Excel等のファイルが各所に分散', ai: '使っていない', owner: '社内に担当者を置ける' },
    issues: { items: [], free: '' },
    calc: { rate: 3000, ratio: 30, perdeal: 3, close: 25, deal: 300000, invest: 500000 },
    demo: '',
    estimated: true   /* 作業時間が自動推計のままか */
  };
}
let st = newState();

/* ---------- 保存・復元 ---------- */
function save(silent) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(st));
    if (!silent) toast('入力内容を保存しました');
  } catch (e) { if (!silent) alert('保存できませんでした：' + e.message); }
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { toast('保存された内容がありません'); return; }
    st = Object.assign(newState(), JSON.parse(raw));
    fillForm(); renderAll(); goto(st.step || 1);
    toast('保存内容を読み込みました');
  } catch (e) { alert('読み込みに失敗しました：' + e.message); }
}
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:78px;left:50%;transform:translateX(-50%);background:#12314f;color:#fff;padding:9px 22px;border-radius:22px;font-size:13px;z-index:99;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:.3s;';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = '0', 1900);
}

/* =========================================================
   自動推計
   ========================================================= */
function empFactor() {
  const e = Number(st.company.emp) || 10;
  return Math.min(3, Math.max(0.5, 0.6 + e * 0.04));
}

/* 業種と従業員数から、対象業務・作業時間・試算前提・課題をまとめて推計する */
function autoEstimate(keepEdits) {
  const ind = st.company.industry;
  if (!ind) return;
  const D = INDUSTRY_DEFAULTS[ind] || INDUSTRY_DEFAULTS.other;
  const f = empFactor();

  /* --- 対象業務と作業時間 --- */
  const prev = {};
  st.tasks.forEach(t => prev[t.id] = t);
  const custom = keepEdits ? st.tasks.filter(t => t.custom) : [];
  const industryTasks = INDUSTRY_TASKS[ind] || [];
  const base = industryTasks.concat(COMMON_TASKS);

  st.tasks = base.map(t => {
    const p = keepEdits ? prev[t.id] : null;
    const isIndustry = industryTasks.some(x => x.id === t.id);
    const auto = isIndustry || D.commons.indexOf(t.id) >= 0;
    return Object.assign({}, t, {
      hours: p && p.edited ? p.hours : Math.round(t.hours * f * 2) / 2,
      on: p ? p.on : auto,
      edited: p ? !!p.edited : false,
      priority: p ? !!p.priority : false
    });
  }).concat(custom);

  /* --- 効果試算の前提 --- */
  if (!keepEdits || !st.calcEdited) {
    st.calc = {
      rate: D.rate, ratio: 30, perdeal: D.perdeal,
      close: D.close, deal: D.deal, invest: 500000
    };
  }

  /* --- 環境・課題 --- */
  if (!keepEdits || !st.envEdited) st.env.tools = D.tools.slice();
  if (!keepEdits || !st.issueEdited) st.issues.items = D.issues.slice();
  st.industryNote = D.note;

  /* --- 実演する業務は最も効果の高いものを自動選択 --- */
  const C = calcAll(st);
  if (C.sel.length && !C.sel.some(t => t.id === st.demo)) st.demo = C.sel[0].id;
  if (!keepEdits) st.estimated = true;
}

/* =========================================================
   ステップ
   ========================================================= */
function buildStepNav() {
  $('#stepnav').innerHTML = STEP_NAMES.map((n, i) =>
    `<button data-go="${i + 1}">${i + 1}. ${n}</button>`).join('');
  $('#stepnav').onclick = e => { const b = e.target.closest('[data-go]'); if (b) goto(+b.dataset.go); };
}
function goto(n) {
  n = Math.max(1, Math.min(STEP_NAMES.length, n));
  if (n >= 2 && !st.company.industry) { toast('先に事業内容を選んでください'); n = 1; }
  if (n >= 3 && !st.company.emp) { toast('従業員数を選んでください'); n = 2; }
  st.step = n;
  $$('.step').forEach(s => s.classList.toggle('on', +s.dataset.step === n));
  $$('#stepnav button').forEach((b, i) => {
    b.classList.toggle('on', i + 1 === n);
    b.classList.toggle('done', i + 1 < n);
  });
  $('#progressBar').style.width = (n / STEP_NAMES.length * 100) + '%';
  $('#btnPrev').disabled = n === 1;
  $('#btnNext').style.visibility = n === STEP_NAMES.length ? 'hidden' : 'visible';
  if (n === 3) renderWaste();
  if (n === 4) { renderTasks(); renderDemoPick(); renderReport(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  save(true);
}

/* ---------- 業種カード ---------- */
function renderIndustries() {
  $('#industryCards').innerHTML = INDUSTRIES.map(i =>
    `<div class="icard ${st.company.industry === i.id ? 'on' : ''}" data-ind="${i.id}">
       <div class="ic">${i.icon}</div><div class="nm">${i.name}</div><div class="ds">${i.desc}</div>
     </div>`).join('');
  $('#industryCards').onclick = e => {
    const c = e.target.closest('[data-ind]'); if (!c) return;
    st.company.industry = c.dataset.ind;
    st.calcEdited = st.envEdited = st.issueEdited = false;
    if (!st.company.emp) st.company.emp = 8;
    autoEstimate(false);
    renderIndustries(); renderAll();
    goto(2);
  };
}

/* ---------- 従業員数 ---------- */
function renderSizes() {
  $('#sizeBtns').innerHTML = SIZE_OPTIONS.map(s =>
    `<button class="sizebtn ${st.company.emp === s.emp ? 'on' : ''}" data-emp="${s.emp}">${s.label}</button>`).join('');
  $('#sizeBtns').onclick = e => {
    const b = e.target.closest('[data-emp]'); if (!b) return;
    st.company.emp = Number(b.dataset.emp);
    autoEstimate(true);
    renderSizes();
    goto(3);
  };
}

/* ---------- 無駄と感じている業務の選択（業種別） ---------- */
function isIndustryTask(id) {
  return (INDUSTRY_TASKS[st.company.industry] || []).some(x => x.id === id);
}
function renderWaste() {
  const box = $('#wasteGrid'); if (!box) return;
  const ind = INDUSTRIES.find(i => i.id === st.company.industry);
  const lead = $('#wasteLead');
  if (lead) {
    lead.innerHTML = ind
      ? `<b>${ind.name}</b>でよくある業務を並べています。`
      : '先に事業内容を選んでください。';
  }
  if (!st.tasks.length) { box.innerHTML = ''; updateWasteSummary(); return; }

  const byCut = (a, b) => (b.hours * b.cut) - (a.hours * a.cut);
  const own = st.tasks.filter(t => isIndustryTask(t.id) || t.custom).sort(byCut);
  const common = st.tasks.filter(t => !isIndustryTask(t.id) && !t.custom).sort(byCut);

  const btn = t => `
    <button class="wastebtn ${t.priority ? 'on' : ''}" data-waste="${t.id}">
      <span class="wb-check">${t.priority ? '✓' : ''}</span>
      <span class="wb-name">${t.name}</span>
      <span class="wb-cat">${t.cat}</span>
    </button>`;

  box.innerHTML =
    (own.length ? `<div class="wastesec">
       <div class="wastesec-h">${ind ? ind.name : ''}ならではの業務</div>
       <div class="wastesec-b">${own.map(btn).join('')}</div></div>` : '') +
    (common.length ? `<div class="wastesec">
       <div class="wastesec-h sub">どの業種にも共通する業務</div>
       <div class="wastesec-b">${common.map(btn).join('')}</div></div>` : '');

  box.onclick = e => {
    const b = e.target.closest('[data-waste]'); if (!b) return;
    const t = st.tasks.find(x => x.id === b.dataset.waste);
    t.priority = !t.priority;
    if (t.priority) t.on = true;          /* 選ばれた業務は必ず対象に含める */
    st.demo = '';                          /* 実演業務を選び直す */
    renderWaste(); save(true);
  };
  updateWasteSummary();
}
function updateWasteSummary() {
  const n = st.tasks.filter(t => t.priority).length;
  const el = $('#wasteSummary'); if (!el) return;
  el.textContent = n ? `${n}件を重点業務として選択中` : '未選択（選ばなくても作成できます）';
}

/* ---------- 業務リスト ---------- */
function renderTasks() {
  const box = $('#taskList');
  if (!box) return;
  if (!st.company.industry) { box.innerHTML = ''; return; }
  const byCat = {};
  st.tasks.forEach(t => (byCat[t.cat] = byCat[t.cat] || []).push(t));
  const order = CATS.filter(c => byCat[c]).concat(Object.keys(byCat).filter(c => CATS.indexOf(c) < 0));
  box.innerHTML = order.map(cat => `
    <div class="catblock">
      <div class="cathead">${cat}</div>
      ${byCat[cat].map(t => `
      <div class="trow ${t.on ? 'on' : ''}" data-row="${t.id}">
        <input type="checkbox" data-chk="${t.id}" ${t.on ? 'checked' : ''}>
        <div>
          <div class="tname" data-lbl="${t.id}">${t.name}${t.priority ? ' <span class="prio-mark">重点</span>' : ''}${t.custom ? ' <span style="font-size:10px;color:#b8860b">［追加］</span>' : ''}</div>
          <div class="thow">${t.how || ''}</div>
        </div>
        <div class="thours"><input type="number" min="0" step="0.5" data-hrs="${t.id}" value="${t.hours}"> 時間/月</div>
        <div class="tcut">削減率 ${Math.round(t.cut * 100)}%<b>▲${h1(t.hours * t.cut)}h</b></div>
        <div class="tdiff d${t.diff}">難易度 ${DIFF_LABEL[t.diff]}</div>
      </div>`).join('')}
    </div>`).join('');
  updateSummary();
}
function updateSummary() {
  const on = st.tasks.filter(t => t.on);
  const saved = on.reduce((s, t) => s + (Number(t.hours) || 0) * t.cut, 0);
  const el = $('#taskSummary');
  if (el) el.textContent = `選択 ${on.length}件 ／ 削減見込 ▲${h1(saved)} 時間/月（年間 ▲${h1(saved * 12)} 時間）`;
  const badge = $('#estBadge');
  if (badge) {
    badge.textContent = st.estimated ? '現在：業種・規模からの自動推計値' : '現在：手入力で調整済み';
    badge.className = 'est-badge ' + (st.estimated ? 'auto' : 'manual');
  }
}
function bindTaskList() {
  const box = $('#taskList');
  box.addEventListener('change', e => {
    const c = e.target.dataset.chk; if (!c) return;
    const t = st.tasks.find(x => x.id === c);
    t.on = e.target.checked;
    e.target.closest('.trow').classList.toggle('on', t.on);
    refresh();
  });
  box.addEventListener('input', e => {
    const hid = e.target.dataset.hrs; if (!hid) return;
    const t = st.tasks.find(x => x.id === hid);
    t.hours = Math.max(0, Number(e.target.value) || 0);
    t.edited = true; st.estimated = false;
    e.target.closest('.trow').querySelector('.tcut').innerHTML =
      `削減率 ${Math.round(t.cut * 100)}%<b>▲${h1(t.hours * t.cut)}h</b>`;
    refresh();
  });
  box.addEventListener('click', e => {
    const l = e.target.dataset.lbl; if (!l) return;
    const cb = box.querySelector(`[data-chk="${l}"]`);
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/* 調整後に画面と報告書を更新する */
function refresh() {
  updateSummary();
  renderDemoPick();
  renderReport();
  save(true);
}

/* ---------- チップ ---------- */
function renderChips(sel, list, arr, onChange) {
  const box = $(sel); if (!box) return;
  box.innerHTML = list.map(x =>
    `<div class="chip ${arr.indexOf(x) >= 0 ? 'on' : ''}" data-v="${x}">${x}</div>`).join('');
  box.onclick = e => {
    const c = e.target.closest('[data-v]'); if (!c) return;
    const v = c.dataset.v, i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
    c.classList.toggle('on');
    if (onChange) onChange();
    refresh();
  };
}

/* ---------- 実演する業務 ---------- */
function renderDemoPick() {
  const box = $('#demoPick'); if (!box) return;
  const C = calcAll(st);
  if (!C.sel.length) { box.innerHTML = '<div class="rp-lead">対象業務が選択されていません。</div>'; return; }
  if (!st.demo || !C.sel.some(t => t.id === st.demo)) st.demo = C.sel[0].id;
  box.innerHTML = C.sel.map(t => `
    <div class="dcard ${st.demo === t.id ? 'on' : ''}" data-demo="${t.id}">
      <div class="dn">${t.rank}位　${t.name}</div>
      <div class="dm">${(t.tools || []).slice(0, 2).join(' / ')}</div>
      <div class="dh">▲${h1(t.saved)} 時間/月　（難易度 ${DIFF_LABEL[t.diff]}）</div>
    </div>`).join('');
  box.onclick = e => {
    const c = e.target.closest('[data-demo]'); if (!c) return;
    st.demo = c.dataset.demo;
    renderDemoPick(); renderReport(); save(true);
  };
}

/* ---------- レポート ---------- */
function renderReport() {
  const C = calcAll(st);
  if (C.sel.length && !C.sel.some(t => t.id === st.demo)) st.demo = C.sel[0].id;
  const html = '<div class="report">' + buildReport(st) + '</div>';
  $('#reportPreview').innerHTML = html;
  $('#reportPrint').innerHTML = html;

  const ind = INDUSTRIES.find(i => i.id === st.company.industry);
  $('#autoSummary').innerHTML = ind
    ? `<b>${ind.name}・従業員${st.company.emp}名</b>の一般的な業務内容から、
       <b>${C.sel.length}件の業務</b>で <b>月${h1(C.savedM)}時間</b>（年間 ${man(C.costY)}）の削減余地を推計しました。
       印刷ダイアログで「PDFとして保存」を選ぶとPDFになります。`
    : '';
}

/* ファイル名に使えない文字を除去する */
function safeFilename(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '').trim() || '無題';
}

/* HTML単体で書き出す。
   ローカルでindex.htmlを開いている場合は通常のダウンロードで保存する。
   共有リンク（Artifact）上で開いている場合はビューアーの保存確認を経由する。 */
async function downloadHTML() {
  const title = safeFilename(`AI業務自動化診断レポート_${st.company.name || (INDUSTRIES.find(i => i.id === st.company.industry) || {}).name || '無題'}`);
  const filename = title + '.html';
  const doc = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{margin:0;background:#8b97a3;padding:20px 0;}
@media print{body{background:#fff;padding:0;}}
${REPORT_CSS}
</style></head>
<body><div class="report standalone">${buildReport(st)}</div></body></html>`;

  if (window.claude && window.claude.use) {
    /* 共有リンクとして開かれている場合：ダウンロード機能をビューアーに要求する */
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        try {
          await downloads.save({ filename, data: doc });
          toast('HTMLを保存しました');
        } catch (e) {
          if (!e || e.code !== 'declined') toast('保存できませんでした。「印刷 / PDFで保存」をお試しください');
        }
        return;
      }
    } catch (e) { /* フォールスルーして下の案内を出す */ }
    toast('この環境では保存できません。「印刷 / PDFで保存」をお試しください');
    return;
  }

  /* ローカルでindex.htmlを直接開いている場合：通常のダウンロード */
  const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('HTMLを書き出しました');
}

/* ---------- フォーム ---------- */
const FIELD_MAP = [
  ['#f_company', 'company', 'name'], ['#f_contact', 'company', 'contact'],
  ['#f_date', 'company', 'date'], ['#f_analyst', 'company', 'analyst'],
  ['#f_issuefree', 'issues', 'free'],
  ['#f_rate', 'calc', 'rate'], ['#f_ratio', 'calc', 'ratio'],
  ['#f_perdeal', 'calc', 'perdeal'], ['#f_close', 'calc', 'close'],
  ['#f_deal', 'calc', 'deal'], ['#f_invest', 'calc', 'invest']
];
function fillForm() {
  FIELD_MAP.forEach(([sel, grp, key]) => { const el = $(sel); if (el) el.value = st[grp][key]; });
}
function bindForm() {
  FIELD_MAP.forEach(([sel, grp, key]) => {
    const el = $(sel); if (!el) return;
    el.addEventListener('input', () => {
      st[grp][key] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      if (grp === 'calc') st.calcEdited = true;
      if (grp === 'issues') st.issueEdited = true;
      if (st.step === 4) refresh(); else save(true);
    });
  });
}

/* ---------- 業務の追加 ---------- */
function bindAdd() {
  $('#add_cat').innerHTML = CATS.map(c => `<option>${c}</option>`).join('');
  $('#btnAddTask').onclick = () => {
    const name = $('#add_name').value.trim();
    const hours = Number($('#add_hours').value) || 0;
    if (!name) { alert('業務名を入力してください'); return; }
    const diff = Number($('#add_diff').value);
    st.tasks.push({
      id: 'x' + Date.now(), name, cat: $('#add_cat').value, hours,
      cut: [0, .7, .6, .5][diff], diff, custom: true, on: true, edited: true,
      tools: ['ChatGPT', 'Make / Zapier'],
      how: 'ヒアリングで追加した業務です。作業手順を分解し、定型部分をAI・自動化に置き換えます。'
    });
    st.estimated = false;
    $('#add_name').value = ''; $('#add_hours').value = '';
    renderTasks(); refresh(); toast('業務を追加しました');
  };
}

/* ---------- 調整パネル ---------- */
function bindTune() {
  $('#tuneToggle').onclick = () => {
    const b = $('#tuneBody');
    b.hidden = !b.hidden;
    $('#tuneToggle').classList.toggle('open', !b.hidden);
  };
  $('#tuneTabs').onclick = e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('#tuneTabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.tabpane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
  };
}

/* ---------- 全体描画 ---------- */
function renderAll() {
  renderIndustries();
  renderSizes();
  renderWaste();
  renderTasks();
  renderChips('#toolChips', TOOL_OPTIONS, st.env.tools, () => st.envEdited = true);
  renderChips('#issueChips', ISSUE_OPTIONS, st.issues.items, () => st.issueEdited = true);
  fillForm();
}

/* ---------- 起動 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  buildStepNav();
  bindForm(); bindAdd(); bindTaskList(); bindTune();

  const saved = localStorage.getItem(LS_KEY);
  if (saved) { try { st = Object.assign(newState(), JSON.parse(saved)); } catch (e) { } }
  renderAll();
  goto(st.step || 1);

  $('#btnNext').onclick = () => goto(st.step + 1);
  $('#btnPrev').onclick = () => goto(st.step - 1);
  $('#btnSave').onclick = () => save();
  $('#btnSave2').onclick = () => save();
  $('#btnLoad').onclick = load;
  $('#btnReset').onclick = () => {
    if (!confirm('入力内容をすべて消去して最初からやり直します。よろしいですか？')) return;
    localStorage.removeItem(LS_KEY); st = newState();
    renderAll(); goto(1);
  };
  $('#btnWasteClear').onclick = () => { st.tasks.forEach(t => t.priority = false); st.demo = ''; renderWaste(); save(true); };
  $('#btnCheckAll').onclick = () => { st.tasks.forEach(t => t.on = true); renderTasks(); refresh(); };
  $('#btnUncheckAll').onclick = () => { st.tasks.forEach(t => t.on = false); renderTasks(); refresh(); };
  $('#btnReEstimate').onclick = () => {
    st.calcEdited = st.envEdited = st.issueEdited = false;
    autoEstimate(false);
    renderAll(); refresh(); toast('推計値に戻しました');
  };
  $('#btnPrint').onclick = () => { renderReport(); setTimeout(() => window.print(), 60); };
  $('#btnDownload').onclick = downloadHTML;
});
