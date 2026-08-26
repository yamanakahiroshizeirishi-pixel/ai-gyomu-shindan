/* =========================================================
   診断レポート生成
   ========================================================= */

/* ---------- 表示ヘルパー ---------- */
const yen = n => '¥' + Math.round(n).toLocaleString('ja-JP');
const man = n => (Math.round(n / 1000) / 10).toLocaleString('ja-JP') + '万円';
const h1 = n => (Math.round(n * 10) / 10).toLocaleString('ja-JP');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DIFF_LABEL = { 1: '低', 2: '中', 3: '高' };
const DIFF_TERM = { 1: '2〜4週間', 2: '1〜2か月', 3: '2〜3か月' };

/* ---------- AI活用の型を判定 ---------- */
const AI_TYPES = [
  {
    key: 'gen', name: '生成AI（文章・資料の下書き）',
    kw: ['ChatGPT', 'Claude', '生成AI', 'Canva', '自動生成', '画像'],
    how: 'AIにたたき台を作らせ、人は確認と仕上げだけを行う型。作成時間の50〜70％が削減できます。',
    first: '過去に作成した資料を3件AIに読み込ませ、「同じ形式で新しい案を作って」と指示するところから始めます。'
  },
  {
    key: 'ocr', name: 'AI-OCR（紙・PDFの読み取り）',
    kw: ['OCR', 'スキャン', '撮影', '読取', '読み取り'],
    how: '紙・PDF・写真をAIが読み取りデータ化する型。入力作業が消え、60〜80％が削減できます。',
    first: '直近1か月分の帳票を10枚スキャンし、読み取り精度を実データで確認するところから始めます。'
  },
  {
    key: 'bot', name: 'AI自動応答（問い合わせの一次対応）',
    kw: ['チャットボット', '自動応答', 'IVR', 'LINE', 'RAG', '自動返信', '予約システム', 'ナレッジ'],
    how: '過去の回答履歴をAIに読ませ一次回答を自動化する型。対応時間の50〜70％が削減できます。',
    first: '直近3か月の問い合わせを分類し、上位10パターンの回答をAIに覚えさせるところから始めます。'
  },
  {
    key: 'flow', name: '業務フロー自動化（システム間連携）',
    kw: ['Make', 'Zapier', 'RPA', 'API', 'GAS', '連携', '一括', 'EDI', '自動リマインド', '日程調整', '電子契約'],
    how: 'システムをつなぎ、転記・コピペ・催促を人の手から外す型。70〜90％が削減できます。',
    first: '「同じ情報を2回以上入力している箇所」を洗い出し、1本だけ連携を作って効果を確認します。'
  },
  {
    key: 'data', name: 'データ集計の自動化・可視化',
    kw: ['Looker', 'BI', 'ダッシュボード', 'スプレッドシート', 'POS', '自動集計', '集計'],
    how: 'データを自動で集め、常に最新の数字が見える状態にする型。60〜80％が削減できます。',
    first: '毎月作っている集計表を1つ選び、データの取り込みだけを自動化するところから始めます。'
  },
  {
    key: 'voice', name: '音声AI（文字起こし・記録作成）',
    kw: ['音声', '文字起こし', 'Notta', 'Zoom AI', 'tl;dv', '録画', 'Scribe'],
    how: '話した内容をAIが文字にして要約する型。記録作業の70〜85％が削減できます。',
    first: '次の1回の会議・面談を録音し、AI要約の精度を実物で確認するところから始めます。'
  }
];

function aiTypesOf(task) {
  const hay = (task.tools || []).join(' ') + ' ' + (task.how || '');
  const hit = AI_TYPES.filter(t => t.kw.some(k => hay.includes(k)));
  return hit.length ? hit : [AI_TYPES[0]];
}

/* ---------- 計算 ---------- */
function calcAll(st) {
  const sel = st.tasks.filter(t => t.on).map(t => {
    const cur = Number(t.hours) || 0;
    const saved = cur * t.cut;
    return Object.assign({}, t, {
      cur, saved, after: cur - saved,
      /* 経営者が「無駄」と挙げた業務は優先度を引き上げる */
      score: (saved / t.diff) * (t.priority ? 2.5 : 1)
    });
  });
  sel.sort((a, b) => b.score - a.score);
  sel.forEach((t, i) => t.rank = i + 1);

  const c = st.calc;
  const curTotal = sel.reduce((s, t) => s + t.cur, 0);
  const savedM = sel.reduce((s, t) => s + t.saved, 0);
  const savedY = savedM * 12;
  const costY = savedY * c.rate;
  const person = savedY / 1800;

  const salesH = savedM * (c.ratio / 100);
  const dealsM = c.perdeal > 0 ? salesH / c.perdeal : 0;
  const closeM = dealsM * (c.close / 100);
  const revenueY = closeM * 12 * c.deal;

  const payback = costY > 0 ? (c.invest / (costY / 12)) : 0;

  const phases = [1, 2, 3].map(d => sel.filter(t => t.diff === d));

  return {
    sel, curTotal, savedM, savedY, costY, person,
    salesH, dealsM, closeM, revenueY, payback, phases,
    totalY: costY + revenueY
  };
}

/* ---------- SVG 横棒グラフ ---------- */
function svgBars(sel) {
  const top = sel.slice(0, 8);
  if (!top.length) return '';
  const max = Math.max.apply(null, top.map(t => t.cur));
  const rowH = 26, padL = 178, w = 620, h = top.length * rowH + 30;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  top.forEach((t, i) => {
    const y = i * rowH + 6;
    const bw = (w - padL - 60) * (t.cur / max);
    const sw = (w - padL - 60) * (t.saved / max);
    const nm = t.name.length > 16 ? t.name.slice(0, 15) + '…' : t.name;
    s += `<text class="lbl" x="${padL - 8}" y="${y + 13}" text-anchor="end">${esc(nm)}</text>`;
    s += `<rect class="bar2" x="${padL}" y="${y + 3}" width="${bw}" height="15" rx="2"/>`;
    s += `<rect class="bar" x="${padL}" y="${y + 3}" width="${sw}" height="15" rx="2"/>`;
    s += `<text class="lbl" x="${padL + bw + 6}" y="${y + 15}">▲${h1(t.saved)}h</text>`;
  });
  const by = top.length * rowH + 14;
  s += `<rect class="bar" x="${padL}" y="${by - 8}" width="11" height="11" rx="2"/>`;
  s += `<text class="lbl" x="${padL + 16}" y="${by + 1}">削減できる時間</text>`;
  s += `<rect class="bar2" x="${padL + 110}" y="${by - 8}" width="11" height="11" rx="2"/>`;
  s += `<text class="lbl" x="${padL + 126}" y="${by + 1}">現状の作業時間（月）</text>`;
  return s + '</svg>';
}

/* ---------- 効果×難易度マトリクス ---------- */
function svgMatrix(sel) {
  const top = sel.slice(0, 10);
  if (!top.length) return '';
  const w = 620, h = 300, l = 54, r = 20, tp = 18, b = 40;
  const maxS = Math.max.apply(null, top.map(t => t.saved)) || 1;
  const x = d => l + (d - 0.5) / 3 * (w - l - r);
  const y = v => h - b - (v / maxS) * (h - tp - b);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${l}" y="${tp}" width="${x(1.5) - l}" height="${h - tp - b}" fill="#eaf6f3"/>`;
  s += `<line class="axis" x1="${l}" y1="${h - b}" x2="${w - r}" y2="${h - b}"/>`;
  s += `<line class="axis" x1="${l}" y1="${tp}" x2="${l}" y2="${h - b}"/>`;
  ['低（すぐ着手できる）', '中', '高（準備が必要）'].forEach((t, i) => {
    s += `<text class="lbl" x="${x(i + 1)}" y="${h - b + 16}" text-anchor="middle">${t}</text>`;
  });
  s += `<text class="lbl" x="${(l + w) / 2}" y="${h - 6}" text-anchor="middle">導入難易度 →</text>`;
  s += `<text class="lbl" x="14" y="${(tp + h - b) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(tp + h - b) / 2})">削減時間（時間/月）→</text>`;
  s += `<text class="lbl" x="${l + 8}" y="${tp + 12}" fill="#0f8a7e">最優先ゾーン</text>`;
  top.forEach(t => {
    const cx = x(t.diff) + ((t.rank % 3) - 1) * 22, cy = y(t.saved);
    s += `<circle cx="${cx}" cy="${cy}" r="12" fill="#0f8a7e" opacity=".85"/>`;
    s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">${t.rank}</text>`;
  });
  return s + '</svg>';
}

/* ---------- 各種文言 ---------- */
function defaultAsis(t) {
  return ['「' + t.name + '」の依頼・作業が発生する',
    '担当者が必要な資料やデータを探し出す',
    '手作業で作成・入力・転記する',
    '上長が内容を確認し、修正のやり取りが発生する',
    '完成物を送付し、控えを保管する'];
}
function defaultTobe(t) {
  return ['発生（メール受信・フォーム送信など）をシステムが自動検知',
    'AIが必要な情報を自動で抽出・整形する',
    '所定のフォーマットへ自動反映し、ドラフトが完成する',
    '担当者は内容を確認して承認するだけ',
    '完了データが自動で保存・共有される'];
}

/* 重点業務の一覧表（経営者が「無駄」と挙げた業務） */
function prioTable(rows, total) {
  return `<table class="rt">
    <tr><th>業務</th><th style="width:82px">分類</th>
      <th class="num" style="width:66px">現状<br>(h/月)</th>
      <th class="num" style="width:76px">削減見込<br>(h/月)</th>
      <th class="ctr" style="width:46px">難易度</th>
      <th style="width:86px">着手の目安</th></tr>
    ${rows.map(t => `<tr>
      <td><b>${esc(t.name)}</b></td>
      <td style="font-size:11px">${esc(t.cat)}</td>
      <td class="num">${h1(t.cur)}</td>
      <td class="num" style="color:#0f8a7e;font-weight:700">▲${h1(t.saved)}</td>
      <td class="ctr"><span class="pill d${t.diff}">${DIFF_LABEL[t.diff]}</span></td>
      <td style="font-size:11px">${DIFF_TERM[t.diff]}</td>
    </tr>`).join('')}
    ${total ? `<tfoot><tr>
      <td colspan="2">合計（${total.n}業務）</td>
      <td class="num">${h1(total.cur)}</td>
      <td class="num">▲${h1(total.saved)}</td>
      <td class="ctr">—</td><td></td>
    </tr></tfoot>` : ''}
  </table>`;
}

function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : v;
}

function pfoot(co) {
  /* ページ番号は最後に一括で差し替える */
  return `<div class="pfoot"><span>AI業務自動化 診断レポート ／ ${esc(co || '')}</span><span>__PN__ / __TT__</span></div>`;
}

/* =========================================================
   本体
   ========================================================= */
function buildReport(st) {
  const C = calcAll(st);
  const co = st.company;
  const ind = INDUSTRIES.find(i => i.id === co.industry);
  const indName = ind ? ind.name : '—';
  const dateStr = fmtDate(co.date);
  const demo = C.sel.find(t => t.id === st.demo) || C.sel[0];
  const prio = C.sel.filter(t => t.priority);
  const pages = [];

  /* ---- P1 表紙 ---- */
  pages.push(`
<div class="page rp-cover">
  <div class="cv-label">A I 業 務 自 動 化 診 断</div>
  <h1>業務自動化 診断レポート</h1>
  <div class="cv-sub">— 削減できる業務の特定と、AI活用による改善仕様書 —</div>
  <div class="cv-line"></div>
  <div class="cv-co">${co.name ? esc(co.name) + ' 御中' : esc(indName) + ' 経営者 様'}</div>
  <div class="cv-to">${esc(co.contact || '')}</div>
  <div class="cv-hero">
    <div><div class="hl">削減できる業務時間</div><div class="hv">${h1(C.savedM)}</div><div class="hu">時間 / 月（年間 ${h1(C.savedY)} 時間）</div></div>
    <div><div class="hl">年間の人件費削減効果</div><div class="hv">${man(C.costY)}</div><div class="hu">時間単価 ${yen(st.calc.rate)} 換算</div></div>
    <div><div class="hl">見込まれる売上インパクト</div><div class="hv">${man(C.revenueY)}</div><div class="hu">年間（営業時間の増加による）</div></div>
  </div>
  <div class="cv-meta">
    業種：${esc(indName)}　／　従業員数：${esc(co.emp)}名<br>
    報告会実施日：${esc(dateStr || '　　年　　月　　日')}<br>
    診断実施：${esc(co.analyst || '')}
  </div>
</div>`);

  /* ---- P2 現状の整理 ---- */
  const issues = st.issues.items;
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">1</span>現状の整理</div>
  <div class="rp-lead">
    ${esc(co.name || '貴社')}の業務の現状を整理しました。
    今回の診断では <b>${C.sel.length}件</b> の業務を対象とし、月間 <b>${h1(C.curTotal)}時間</b> の作業を分析しています。
    ${st.estimated ? '<br><span style="font-size:12px">※ 作業時間は同業・同規模の標準値からの推計です。実態と異なる場合は本レポートの数値も併せて変動します。</span>' : ''}
  </div>

  <div class="rp-h2">会社概要・診断の前提</div>
  <table class="rt">
    <tr><th style="width:170px">項目</th><th>内容</th></tr>
    <tr><td>会社名</td><td>${esc(co.name || '—')}</td></tr>
    <tr><td>業種</td><td>${esc(indName)}${ind ? '（' + esc(ind.desc) + '）' : ''}</td></tr>
    <tr><td>従業員数</td><td>${esc(co.emp)}名</td></tr>
    <tr><td>想定される使用ツール</td><td>${st.env.tools.length ? st.env.tools.map(esc).join(' ／ ') : '—'}</td></tr>
    <tr><td>作業時間の把握方法</td><td>${st.estimated
      ? '業種・従業員規模にもとづく標準値からの推計'
      : 'ヒアリング結果にもとづく調整値'}</td></tr>
  </table>

  ${st.industryNote ? `<div class="rp-h2">この業種で一般的に起きていること</div>
  <div class="rp-lead rp-gold">${esc(st.industryNote)}</div>` : ''}

  ${pfoot(co.name)}
</div>

<div class="page">
  <div class="rp-h"><span class="no">1</span>現状の整理（課題と診断結果）</div>
  <div class="rp-h2">経営上の課題として挙がった点</div>
  ${issues.length ? `<ul style="margin:6px 0 0;padding-left:20px;font-size:13px">${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p style="font-size:13px">—</p>'}
  ${st.issues.free ? `<div class="rp-lead rp-gold" style="margin-top:14px"><b>ヒアリングでの補足</b><br>${esc(st.issues.free).replace(/\n/g, '<br>')}</div>` : ''}

  <div class="rp-h2">診断の結論</div>
  <div class="rp-lead rp-accent">
    今回洗い出した ${C.sel.length}件の業務のうち、AIとツールの組み合わせで
    <b>月間 ${h1(C.savedM)}時間（現状比 ${C.curTotal ? Math.round(C.savedM / C.curTotal * 100) : 0}％）</b> の削減が見込めます。
    これは年間 ${h1(C.savedY)}時間、正社員換算で <b>約${(Math.round(C.person * 10) / 10)}人分</b> の労働時間に相当します。
    特に「${esc(C.sel[0] ? C.sel[0].name : '—')}」は、${C.sel[0] && C.sel[0].priority
      ? '御社が負担に感じている業務であり、かつ削減効果も大きいため'
      : '効果が大きく着手しやすいため'}最優先での実施を推奨します。
  </div>
  ${pfoot(co.name)}
</div>`);

  /* ---- 経営者が挙げた重点業務（独立ページ・16行ごとに分割） ---- */
  if (prio.length) {
    const pTotal = {
      n: prio.length,
      cur: prio.reduce((s, t) => s + t.cur, 0),
      saved: prio.reduce((s, t) => s + t.saved, 0)
    };
    for (let i = 0; i < prio.length; i += 16) {
      const rows = prio.slice(i, i + 16);
      const last = i + 16 >= prio.length;
      pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">1</span>特に負担を感じているとお伺いした業務${i ? '（続き）' : ''}</div>
  ${i ? '' : `<div class="rp-lead rp-accent">
    ヒアリングで「特に時間の無駄を感じている」と挙げていただいた <b>${prio.length}件</b> の業務です。
    合計で月間 <b>${h1(pTotal.cur)}時間</b> を費やしており、自動化により <b>▲${h1(pTotal.saved)}時間/月</b>
    （年間 ${man(pTotal.saved * 12 * st.calc.rate)}）の削減が見込めます。<br>
    本レポートでは、これらの業務を優先順位の上位に配置し、実演デモの対象も原則ここから選定しています。
  </div>`}
  ${prioTable(rows, last ? pTotal : null)}
  ${i ? '' : `<div class="rp-note">
    ※ 「着手の目安」は導入完了までの想定期間です。難易度は必要な費用ではなく、準備の手間と社内調整の量で判定しています。
  </div>`}
  ${pfoot(co.name)}
</div>`);
    }
  }

  /* ---- 業務一覧（行数に応じてページを分割） ---- */
  const ROWS_FIRST = 12, ROWS_NEXT = 20;
  const chunks = [];
  for (let i = 0; i < C.sel.length;) {
    const n = chunks.length === 0 ? ROWS_FIRST : ROWS_NEXT;
    chunks.push(C.sel.slice(i, i + n));
    i += n;
  }
  if (!chunks.length) chunks.push([]);

  const tHead = `<thead><tr>
      <th class="ctr" style="width:34px">順位</th><th>業務</th><th style="width:82px">分類</th>
      <th class="num" style="width:58px">現状<br>(h/月)</th><th class="num" style="width:58px">削減後<br>(h/月)</th>
      <th class="num" style="width:66px">削減時間<br>(h/月)</th><th class="ctr" style="width:44px">難易度</th>
      <th class="num" style="width:80px">年間効果<br>(円)</th>
    </tr></thead>`;
  const tRow = t => `<tr>
        <td class="ctr"><b>${t.rank}</b></td>
        <td><b>${esc(t.name)}</b>${t.priority ? ' <span class="pill prio">重点</span>' : ''}</td>
        <td style="font-size:11px">${esc(t.cat)}</td>
        <td class="num">${h1(t.cur)}</td>
        <td class="num">${h1(t.after)}</td>
        <td class="num" style="color:#0f8a7e;font-weight:700">▲${h1(t.saved)}</td>
        <td class="ctr"><span class="pill d${t.diff}">${DIFF_LABEL[t.diff]}</span></td>
        <td class="num">${Math.round(t.saved * 12 * st.calc.rate).toLocaleString('ja-JP')}</td>
      </tr>`;

  chunks.forEach((rows, ci) => {
    const last = ci === chunks.length - 1;
    pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">2</span>自動化できる業務の一覧${ci ? '（続き）' : ''}</div>
  ${ci ? '' : `<div class="rp-lead">
    削減時間が大きく、かつ着手しやすい順に並べています。<br>
    <span style="font-size:12px">※「削減後」は自動化を導入した後に人が行う作業時間の想定です。ゼロにはならず、確認・判断の時間は残ります。</span>
  </div>`}
  <table class="rt">
    ${tHead}
    <tbody>${rows.map(tRow).join('')}</tbody>
    ${last ? `<tfoot><tr>
      <td colspan="3">合計（${C.sel.length}業務）</td>
      <td class="num">${h1(C.curTotal)}</td>
      <td class="num">${h1(C.curTotal - C.savedM)}</td>
      <td class="num">▲${h1(C.savedM)}</td>
      <td class="ctr">—</td>
      <td class="num">${Math.round(C.costY).toLocaleString('ja-JP')}</td>
    </tr></tfoot>` : ''}
  </table>
  ${pfoot(co.name)}
</div>`);
  });

  /* ---- 着手の順番（グラフ2種） ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">3</span>着手する順番の考え方</div>
  <div class="rp-lead">
    「効果の大きさ」と「導入のしやすさ」の2軸で整理しました。<b>効果が大きく、導入が容易なものから着手</b>することで、
    早い段階で社内に成功体験が生まれ、その後の取り組みが進みやすくなります。番号は前ページの順位です。
  </div>
  <div class="rp-h2">削減インパクトの大きい業務（上位8件）</div>
  ${svgBars(C.sel)}
  <div class="rp-h2">効果 × 導入難易度のマトリクス</div>
  ${svgMatrix(C.sel)}
  ${pfoot(co.name)}
</div>`);

  /* ---- 優先度の判定ルール＋段階の整理 ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">3</span>優先度の判定ルール</div>
  <table class="rt">
    <tr><th style="width:110px">優先度</th><th>該当する業務の特徴</th><th style="width:110px">着手の目安</th></tr>
    <tr><td><span class="pill d1">最優先</span></td><td>削減時間が大きく、既存ツールの設定変更や生成AIの利用ですぐ始められる業務</td><td>1〜30日目</td></tr>
    <tr><td><span class="pill d2">第2段階</span></td><td>ツール導入や業務ルールの整理が必要だが、効果が確実に見込める業務</td><td>31〜60日目</td></tr>
    <tr><td><span class="pill d3">第3段階</span></td><td>システム連携や社内合意が必要で、準備期間を要する業務</td><td>61〜90日目以降</td></tr>
  </table>
  <div class="rp-note">※ 難易度は「必要な費用」ではなく「準備の手間と社内調整の量」で判定しています。</div>

  <div class="rp-h2">段階ごとの内訳</div>
  <table class="rt">
    <tr><th style="width:110px">段階</th><th class="ctr" style="width:70px">業務数</th><th class="num" style="width:110px">削減時間(h/月)</th><th>対象業務</th></tr>
    ${C.phases.map((list, i) => `<tr>
      <td><span class="pill d${i + 1}">${['最優先', '第2段階', '第3段階'][i]}</span></td>
      <td class="ctr">${list.length}</td>
      <td class="num">▲${h1(list.reduce((s, t) => s + t.saved, 0))}</td>
      <td style="font-size:11.5px">${list.length ? list.slice(0, 6).map(t => esc(t.name)).join('、') + (list.length > 6 ? ` ほか${list.length - 6}件` : '') : '—'}</td>
    </tr>`).join('')}
  </table>

  <div class="rp-h2">次ページ以降の見方</div>
  <div class="rp-lead rp-accent">
    次ページからは <b>「どの業務を、AIをどう使って、どれだけ短縮できるのか」</b> を業務ごとに1枚ずつまとめています。<br>
    各シートは「使うAI活用の型 → AIをどう使うか → 使用するツール → 最初の一歩（今週できること） → 削減時間」の順に記載しており、
    社内での検討や担当者への指示にそのままお使いいただけます。
  </div>
  ${pfoot(co.name)}
</div>`);

  /* ---- P5〜 AI活用シート ---- */
  const sheets = C.sel.slice(0, 12);
  const perPage = 2;
  for (let i = 0; i < sheets.length; i += perPage) {
    const chunk = sheets.slice(i, i + perPage);
    pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">4</span>業務別：AIの使い方と削減時間${i === 0 ? '' : '（続き）'}</div>
  ${chunk.map(t => {
      const types = aiTypesOf(t).slice(0, 2);
      return `
  <div class="aisheet">
    <div class="aisheet-h"><span class="ttl">${esc(t.name)}</span><span class="rank">優先度 ${t.rank}位 ／ 難易度 ${DIFF_LABEL[t.diff]}</span></div>
    <div class="aisheet-b">
      <div class="lb">■ 使うAI活用の型</div>
      <p><b>${types.map(x => esc(x.name)).join(' ＋ ')}</b></p>
      <div class="lb">■ AIをどう使うか</div>
      <p>${esc(t.how)}</p>
      <p style="color:#5d6f80;font-size:12.2px">${esc(types[0].how)}</p>
      <div class="lb">■ 使用するツール（候補）</div>
      <p>${(t.tools || []).map(esc).join('　/　') || '—'}</p>
      <div class="lb">■ 最初の一歩（今週できること）</div>
      <p>${esc(types[0].first)}</p>
      <div class="effectbar">
        <div><div class="el">現状</div><div class="ev">${h1(t.cur)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">導入後</div><div class="ev">${h1(t.after)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">削減時間</div><div class="ev acc">▲${h1(t.saved)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">年間の効果</div><div class="ev acc">${man(t.saved * 12 * st.calc.rate)}</div></div>
      </div>
    </div>
  </div>`;
    }).join('')}
  ${pfoot(co.name)}
</div>`);
  }

  /* ---- 効果試算 ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">5</span>削減効果の試算</div>
  <div class="rp-lead">
    削減時間を金額に換算しました。時間単価は ${yen(st.calc.rate)}（給与・賞与・社会保険料を含む1時間あたりのコスト）で試算しています。
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kl">月間の削減時間</div><div class="kv">${h1(C.savedM)}<small> 時間</small></div></div>
    <div class="kpi"><div class="kl">年間の削減時間</div><div class="kv">${h1(C.savedY)}<small> 時間</small></div></div>
    <div class="kpi acc"><div class="kl">年間の人件費削減効果</div><div class="kv">${man(C.costY)}</div></div>
    <div class="kpi"><div class="kl">正社員換算</div><div class="kv">約${Math.round(C.person * 10) / 10}<small> 人分</small></div></div>
  </div>
  <table class="rt">
    <tr><th style="width:230px">計算項目</th><th class="num" style="width:130px">数値</th><th>計算式</th></tr>
    <tr><td>月間削減時間</td><td class="num">${h1(C.savedM)} 時間</td><td>各業務の削減時間の合計</td></tr>
    <tr><td>年間削減時間</td><td class="num">${h1(C.savedY)} 時間</td><td>${h1(C.savedM)} × 12か月</td></tr>
    <tr><td>時間単価</td><td class="num">${yen(st.calc.rate)}</td><td>人件費（社会保険料込）÷ 年間労働時間</td></tr>
    <tr><td><b>年間コスト削減額</b></td><td class="num"><b>${yen(C.costY)}</b></td><td>${h1(C.savedY)}時間 × ${yen(st.calc.rate)}</td></tr>
    <tr><td>正社員換算</td><td class="num">約${Math.round(C.person * 10) / 10} 人分</td><td>${h1(C.savedY)}時間 ÷ 1,800時間（年間労働時間）</td></tr>
  </table>

  <div class="rp-h2">投資回収の見通し</div>
  <table class="rt">
    <tr><th style="width:230px">項目</th><th class="num" style="width:130px">金額</th><th>備考</th></tr>
    <tr><td>想定初期投資</td><td class="num">${yen(st.calc.invest)}</td><td>ツール利用料・設定費用の想定</td></tr>
    <tr><td>月あたりの削減効果</td><td class="num">${yen(C.costY / 12)}</td><td>年間削減額 ÷ 12</td></tr>
    <tr><td><b>投資回収期間</b></td><td class="num"><b>約${C.payback ? (Math.round(C.payback * 10) / 10) : '—'} か月</b></td><td>初期投資 ÷ 月あたり削減効果</td></tr>
  </table>
  <div class="rp-note">※ 削減時間は業務を止めずに継続することが前提です。導入直後は習熟のため効果が7〜8割程度になる想定でご検討ください。</div>
  ${pfoot(co.name)}
</div>`);

  /* ---- 売上インパクト ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">6</span>生まれた時間による売上インパクト</div>
  <div class="rp-lead">
    自動化の効果は「コスト削減」だけではありません。空いた時間を営業・顧客対応に振り向けた場合の売上への影響を試算しました。
  </div>
  <table class="rt">
    <tr><th style="width:300px">試算項目</th><th class="num" style="width:120px">数値</th><th>前提</th></tr>
    <tr><td>月間で生まれる時間</td><td class="num">${h1(C.savedM)} 時間</td><td>診断結果の削減時間</td></tr>
    <tr><td>うち営業活動に充てる時間</td><td class="num">${h1(C.salesH)} 時間</td><td>削減時間の ${st.calc.ratio}％を充当</td></tr>
    <tr><td>増加する商談・見込み客対応数</td><td class="num">+${h1(C.dealsM)} 件/月</td><td>1件あたり ${st.calc.perdeal} 時間</td></tr>
    <tr><td>増加する成約数</td><td class="num">+${h1(C.closeM)} 件/月</td><td>成約率 ${st.calc.close}％</td></tr>
    <tr><td>年間の増加成約数</td><td class="num">+${h1(C.closeM * 12)} 件/年</td><td>月間成約数 × 12</td></tr>
    <tr><td><b>年間の売上インパクト</b></td><td class="num"><b>${yen(C.revenueY)}</b></td><td>年間成約数 × 平均取引額 ${yen(st.calc.deal)}</td></tr>
  </table>

  <div class="rp-h2">総合効果</div>
  <div class="kpis">
    <div class="kpi"><div class="kl">年間コスト削減</div><div class="kv">${man(C.costY)}</div></div>
    <div class="kpi"><div class="kl">年間売上インパクト</div><div class="kv">${man(C.revenueY)}</div></div>
  </div>
  <div class="rp-lead rp-accent" style="text-align:center;font-size:15px">
    <b>年間の総合効果：約 ${man(C.totalY)}</b>
  </div>
  <div class="rp-note">
    ※ 売上インパクトは「生まれた時間を営業活動に充当した場合」の試算であり、成果を保証するものではありません。
    残りの ${100 - st.calc.ratio}％は残業削減・品質向上・教育時間に充当する前提としています。
  </div>
  ${pfoot(co.name)}
</div>`);

  /* ---- ロードマップ ---- */
  const phTitle = ['第1段階（1〜30日）まず結果を出す', '第2段階（31〜60日）仕組みとして定着させる', '第3段階（61〜90日）連携して仕上げる'];
  const phDesc = [
    '設定変更と生成AIの活用ですぐ着手できる業務から始めます。1か月以内に効果を実感し、社内の理解を得ることが目的です。',
    'ツールの導入と業務ルールの整理を行います。担当者を決め、手順書をあわせて整備します。',
    'システム間の連携や全社展開を行います。ここまで来ると、日常業務の中で自動化が当たり前になります。'
  ];
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">7</span>実行ロードマップ（90日）</div>
  <div class="rp-lead">
    すべてを同時に進める必要はありません。<b>効果が出やすいものから順に、3段階</b>で進めることを推奨します。
  </div>
  ${C.phases.map((list, i) => `
  <div class="phase p${i + 1}">
    <div class="phase-h"><span>${phTitle[i]}</span><span>削減見込 ▲${h1(list.reduce((s, t) => s + t.saved, 0))} 時間/月</span></div>
    <div class="phase-b">
      <div>${phDesc[i]}</div>
      ${list.length ? `<ul>${list.slice(0, 5).map(t => `<li><b>${esc(t.name)}</b>（▲${h1(t.saved)}h/月）… ${esc((t.tools || [])[0] || '')}${(t.tools || [])[1] ? ' ほか' : ''}／目安 ${DIFF_TERM[t.diff]}</li>`).join('')}${list.length > 5 ? `<li>ほか ${list.length - 5}業務（前掲の一覧を参照）</li>` : ''}</ul>`
        : '<div style="color:#5d6f80;font-size:12.4px;margin-top:4px">該当なし</div>'}
    </div>
  </div>`).join('')}

  ${pfoot(co.name)}
</div>

<div class="page">
  <div class="rp-h"><span class="no">7</span>推進のためのチェックリスト</div>
  <div class="rp-lead">実行段階でつまずかないよう、進め方の要点をチェックリストにまとめました。</div>
  <ul class="checklist">
    <li>推進担当者を1名決める（兼任で構いません）</li>
    <li>第1段階の対象業務について、現状の手順を書き出す</li>
    <li>対象ツールの無料プランで試し、実データで精度を確認する</li>
    <li>月1回、削減できた時間を記録して効果を可視化する</li>
    <li>うまくいった手順を手順書に残し、他の社員へ展開する</li>
    <li>3か月後に対象業務を見直し、次の候補を追加する</li>
  </ul>
  ${pfoot(co.name)}
</div>`);

  /* ---- デモ仕様書 ---- */
  if (demo) {
    const dtypes = aiTypesOf(demo);
    pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">8</span>報告会で実演する自動化の仕様</div>
  <div class="rp-lead">
    今回の報告会では <b>「${esc(demo.name)}」</b> を対象に、実際に動く自動化をご覧いただきます。${demo.priority ? '（特に負担を感じているとお伺いした業務です）' : ''}
    ここに記載した内容が、そのまま社内での構築仕様書としてお使いいただけます。
  </div>

  <div class="rp-h2">現状の流れと、自動化後の流れ</div>
  <div class="flowbox">
    <div class="flowcol now">
      <h5>現状（As-Is）</h5>
      <ol>${(demo.asis || defaultAsis(demo)).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    </div>
    <div class="flowarrow">▶</div>
    <div class="flowcol aft">
      <h5>自動化後（To-Be）</h5>
      <ol>${(demo.tobe || defaultTobe(demo)).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    </div>
  </div>

  ${pfoot(co.name)}
</div>

<div class="page">
  <div class="rp-h"><span class="no">8</span>実演する自動化の仕様と導入手順</div>
  <div class="rp-h2">仕様の概要</div>
  <table class="rt">
    <tr><th style="width:150px">項目</th><th>内容</th></tr>
    <tr><td>対象業務</td><td>${esc(demo.name)}（${esc(demo.cat)}）</td></tr>
    <tr><td>AI活用の型</td><td>${dtypes.map(x => esc(x.name)).join(' ＋ ')}</td></tr>
    <tr><td>自動化の考え方</td><td>${esc(demo.how)}</td></tr>
    <tr><td>使用ツール</td><td>${(demo.tools || []).map(esc).join('　/　')}</td></tr>
    <tr><td>人が行う作業</td><td>内容の確認と承認、例外・判断が必要なケースの対応</td></tr>
    <tr><td>削減時間</td><td>月 ${h1(demo.cur)}時間 → ${h1(demo.after)}時間（<b>▲${h1(demo.saved)}時間/月</b>、年間 ▲${h1(demo.saved * 12)}時間）</td></tr>
    <tr><td>年間の効果額</td><td>${yen(demo.saved * 12 * st.calc.rate)}</td></tr>
    <tr><td>構築期間の目安</td><td>${DIFF_TERM[demo.diff]}</td></tr>
  </table>

  <div class="rp-h2">導入手順</div>
  <table class="rt">
    <tr><th class="ctr" style="width:40px">STEP</th><th style="width:180px">やること</th><th>内容</th></tr>
    <tr><td class="ctr">1</td><td>現状の手順の棚卸し</td><td>誰が・どの順番で・何分かけているかを書き出す（1〜2時間）</td></tr>
    <tr><td class="ctr">2</td><td>ツールの準備</td><td>${esc((demo.tools || [])[0] || 'ツール')} を無料プラン等で用意し、実データで動作を確認する</td></tr>
    <tr><td class="ctr">3</td><td>ルールとひな形の作成</td><td>AIへの指示文（プロンプト）と出力フォーマットを固定し、誰が使っても同じ結果になる状態にする</td></tr>
    <tr><td class="ctr">4</td><td>試験運用（2週間）</td><td>従来の方法と並行して運用し、精度と削減時間を実測する</td></tr>
    <tr><td class="ctr">5</td><td>本運用・手順書化</td><td>手順書を残し、担当者以外でも回せる状態にする</td></tr>
  </table>
  <div class="rp-note">※ 実演は${esc(demo.name)}を題材にしていますが、同じ仕組みは他の定型業務にも横展開できます。</div>
  ${pfoot(co.name)}
</div>`);
  }

  /* ---- 留意点・次のアクション ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">9</span>導入にあたっての留意点</div>
  <div class="risk">
    <p style="margin-top:0"><b>1. 情報の取り扱い</b><br>
    顧客情報・個人情報を生成AIに入力する場合は、学習に使われない設定（法人プラン等）を利用してください。社内で「入力してよい情報／いけない情報」のルールを先に決めることを推奨します。</p>
    <p><b>2. AIの出力は必ず人が確認する</b><br>
    AIは誤った内容をもっともらしく出力することがあります。特に金額・日付・固有名詞は人の目での確認を業務手順に組み込んでください。</p>
    <p><b>3. 効果が出るまでの期間</b><br>
    導入直後は習熟のため、想定の7〜8割程度の効果にとどまります。3か月継続して初めて本試算の水準に達する想定です。</p>
    <p><b>4. 「時間が空いたあと」を決めておく</b><br>
    削減した時間の使い道（営業・教育・残業削減）を先に決めておかないと、効果が数字として表れません。本レポートでは ${st.calc.ratio}％を営業活動に充てる前提としています。</p>
    <p style="margin-bottom:0"><b>5. 一度に全部やらない</b><br>
    同時に複数を進めると現場が混乱します。第1段階の1〜2業務に絞って成功体験をつくることを推奨します。</p>
  </div>

  ${pfoot(co.name)}
</div>

<div class="page">
  <div class="rp-h"><span class="no">10</span>次のアクション</div>
  <table class="rt">
    <tr><th class="ctr" style="width:40px">No</th><th style="width:200px">アクション</th><th style="width:110px">期限の目安</th><th>担当</th></tr>
    <tr><td class="ctr">1</td><td>推進担当者の決定</td><td>報告会から1週間以内</td><td>${esc(co.contact || '経営者')}</td></tr>
    <tr><td class="ctr">2</td><td>${esc(C.sel[0] ? C.sel[0].name : '最優先業務')}の手順の書き出し</td><td>2週間以内</td><td>担当部署</td></tr>
    <tr><td class="ctr">3</td><td>ツールの試用開始</td><td>3週間以内</td><td>推進担当者</td></tr>
    <tr><td class="ctr">4</td><td>効果測定（削減時間の記録）開始</td><td>1か月後</td><td>推進担当者</td></tr>
    <tr><td class="ctr">5</td><td>第2段階の対象業務の着手判断</td><td>2か月後</td><td>${esc(co.contact || '経営者')}</td></tr>
  </table>

  <div class="rp-lead" style="margin-top:24px">
    本レポートは、ヒアリング内容と一般的な導入実績にもとづく試算です。実際の削減時間は、対象業務の件数・データの整備状況・運用の定着度により変動します。<br>
    ご不明な点、実行段階でのご相談はお気軽にお申し付けください。
  </div>
  <div style="text-align:right;margin-top:34px;font-size:13px;color:#5d6f80">
    ${esc(dateStr || '')}<br><b style="font-size:15px;color:#12314f">${esc(co.analyst || '')}</b>
  </div>
  ${pfoot(co.name)}
</div>`);

  /* ページ番号を振り直す */
  const total = pages.length;
  return pages
    .map((p, i) => p.replace('__PN__', String(i + 1)).replace('__TT__', String(total)))
    .join('');
}
