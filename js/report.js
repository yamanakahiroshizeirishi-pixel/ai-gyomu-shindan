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

/* =========================================================
   実際の仕上がりサンプル
   （外部のAIに投げる「指示文」ではなく、レポートの中だけで
     完結する「できあがりの実例」を業務ごとに生成する）
   ========================================================= */
const SAMPLE_GENERATORS = {
  gen: (t, ctx) => `<div class="sample-doc">
    <div class="sd-head">件名：${esc(t.name)}のご案内</div>
    <div class="sd-body">${esc(ctx.contactLabel)} 様<br><br>
    いつも大変お世話になっております。${esc(ctx.companyLabel)}でございます。<br>
    このたびは${esc(t.name)}に関しまして、下記の通りご案内申し上げます。<br><br>
    ■内容<br>
    ・対象：<span class="ph">〇〇</span><br>
    ・期日：<span class="ph">〇〇年〇〇月〇〇日</span><br>
    ・金額／条件：<span class="ph">〇〇</span><br><br>
    ご不明な点がございましたら、お気軽にお問い合わせください。<br>
    今後ともよろしくお願い申し上げます。<br><br>
    ────────────<br>${esc(ctx.companyLabel)}</div>
  </div>
  <div class="rp-note">※ 下線の<span class="ph">〇〇</span>部分だけ実際の内容に差し替えれば、そのまま送信できる状態です。ここまでは数秒でAIが作成します。</div>`,

  ocr: (t, ctx) => `<table class="rt sample-tbl">
    <tr><th style="width:120px">読み取り項目</th><th>AIが自動抽出した内容</th></tr>
    <tr><td>日付</td><td>2026/08/15</td></tr>
    <tr><td>取引先</td><td>株式会社サンプル${esc(ctx.industryShort)}</td></tr>
    <tr><td>金額</td><td>¥48,400</td></tr>
    <tr><td>摘要</td><td>${esc(t.name)}に関する費用</td></tr>
    <tr><td>推奨する仕訳科目</td><td><b>消耗品費</b>（AIが自動提案・要確認）</td></tr>
  </table>
  <div class="rp-note">※ 紙・PDFを1枚撮影・スキャンするだけで、この表がAIによって自動的に埋まります。人は科目欄だけ確認します。</div>`,

  bot: (t, ctx) => `<div class="sample-qa">
    <div class="qa-row"><div class="qa-q">Q. 営業時間・対応日を教えてください</div><div class="qa-a">A. 平日9:00〜18:00で承っております。土日祝はお休みをいただいております。</div></div>
    <div class="qa-row"><div class="qa-q">Q. ${esc(t.name)}について、概算でもよいので教えてほしい</div><div class="qa-a">A. 概算は本日中、正式なご案内は3営業日以内を目安にお送りします。詳しい内容が分かるものがあれば教えてください。</div></div>
    <div class="qa-row"><div class="qa-q">Q. 担当者につないでもらえますか？</div><div class="qa-a">A. かしこまりました。内容を担当へ引き継ぎ、本日中に折り返しご連絡いたします。</div></div>
  </div>
  <div class="rp-note">※ 過去の問い合わせ履歴をAIに読み込ませておくと、上記のような一次回答がその場で自動生成されます。人は送信前に一目確認するだけです。</div>`,

  flow: (t, ctx) => `<table class="rt sample-tbl">
    <tr><th>これまで転記していた項目</th><th style="width:120px">転記元</th><th style="width:120px">転記先</th><th style="width:140px">自動化後</th></tr>
    <tr><td>${esc(t.name)}の情報一式</td><td>受付フォーム／メール</td><td>基幹システム／台帳</td><td><b>自動反映（入力ゼロ）</b></td></tr>
    <tr><td>金額・件数の確認</td><td>担当者の目視</td><td>Excel転記</td><td><b>システムが自動突合</b></td></tr>
  </table>
  <div class="rp-note">※ 「同じ情報を2回入力している箇所」を1本つなぐだけで、この転記作業そのものが消えます。</div>`,

  data: (t, ctx) => `<table class="rt sample-tbl">
    <tr><th>指標</th><th class="num" style="width:100px">今月</th><th class="num" style="width:90px">前月比</th></tr>
    <tr><td>${esc(t.name)}に関する件数</td><td class="num">24件</td><td class="num" style="color:#0f8a7e;font-weight:700">+3件</td></tr>
    <tr><td>対応完了率</td><td class="num">92%</td><td class="num" style="color:#0f8a7e;font-weight:700">+5pt</td></tr>
    <tr><td>平均対応時間</td><td class="num">1.8時間</td><td class="num" style="color:#0f8a7e;font-weight:700">-0.4時間</td></tr>
  </table>
  <div class="rp-note">※ 各システムの数字を自動で集め、この形の一覧が毎朝・自動で更新される状態にします。</div>`,

  voice: (t, ctx) => `<div class="sample-voice">
    <div class="sv-lb">発言の抜粋（文字起こし）</div>
    <div class="sv-raw">「じゃあ${esc(t.name)}の件、次回までに一度まとめておきましょうか。金額は先方に再確認してからにして、対応は田中さんお願いします」</div>
    <div class="sv-arrow">▼ AIが自動要約</div>
    <div class="sv-out">
      <div><b>決定事項：</b>${esc(t.name)}について、次回までに内容をまとめる</div>
      <div><b>担当：</b>田中</div>
      <div><b>期限：</b>次回打ち合わせまで</div>
      <div><b>補足：</b>金額は先方への再確認後に確定</div>
    </div>
  </div>
  <div class="rp-note">※ 会議・電話を録音するだけで、この形の議事録がその場で自動生成されます。</div>`
};

function sampleArtifact(task, ctx) {
  const key = (aiTypesOf(task)[0] || AI_TYPES[0]).key;
  return (SAMPLE_GENERATORS[key] || SAMPLE_GENERATORS.gen)(task, ctx);
}

/* ---------- そのままコピーして他のAIに貼り付けられるプロンプト文 ---------- */
const PROMPT_GENERATORS = {
  gen: (t, ctx) => `「${t.name}」の文面を作成してください。\n・宛先：${ctx.contactLabel}\n・トーン：丁寧・簡潔なビジネス文書\n・含める内容：対象／期日／金額または条件\n過去に送った文面と同じ構成（挨拶→用件→結び）で、件名と本文を作ってください。`,
  ocr: (t, ctx) => `添付した書類（${t.name}に関する領収書・請求書など）から、日付・取引先・金額・摘要を読み取り、表形式で出力してください。あわせて想定される勘定科目も1つ提案してください。`,
  bot: (t, ctx) => `過去の問い合わせ履歴を参考に、「${t.name}」に関してお客様からよく来る質問への回答文を、丁寧語で3パターン作成してください。それぞれ2〜3文で簡潔にまとめてください。`,
  flow: (t, ctx) => `「${t.name}」について、システムAとシステムBで重複して入力している項目を洗い出してください。どちらを正のデータとし、もう一方へどう自動反映すべきか、表形式で整理してください。`,
  data: (t, ctx) => `「${t.name}」に関する数値データ（件数・金額など）を集計し、今月と先月を比較した一覧表を作成してください。増減が大きい項目には、考えられる理由のコメントを1行添えてください。`,
  voice: (t, ctx) => `以下は「${t.name}」に関する会議・打ち合わせの文字起こしです。決定事項・担当者・期限を抽出し、簡潔な議事録にまとめてください。\n\n[ここに文字起こしを貼り付け]`
};

function promptFor(task, ctx) {
  const key = (aiTypesOf(task)[0] || AI_TYPES[0]).key;
  return (PROMPT_GENERATORS[key] || PROMPT_GENERATORS.gen)(task, ctx);
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

/* ---------- 経営参謀からの提言（自動化に限らない経営全般の助言） ---------- */
function mgmtLabel(key, val) {
  const q = MGMT_QUESTIONS.find(x => x.key === key);
  const o = q && q.options.find(x => x.v === val);
  return o ? o.label : '';
}
function mgmtCard(qLabel, answerLabel, advice) {
  return `<div class="advcard">
    <div class="adv-h"><span class="adv-q">${esc(qLabel)}</span><span class="adv-a">${esc(answerLabel)}</span></div>
    <div class="adv-b">
      <div><b>診断：</b>${esc(advice.diag)}</div>
      <div><b>見るべき指標：</b>${esc(advice.watch)}</div>
      <div><b>次の一手：</b>${esc(advice.action)}</div>
    </div>
  </div>`;
}
function mgmtAdviceCards(mgmt) {
  return MGMT_QUESTIONS
    .filter(q => mgmt[q.key] && MGMT_ADVICE[q.key] && MGMT_ADVICE[q.key][mgmt[q.key]])
    .map(q => mgmtCard(q.label, mgmtLabel(q.key, mgmt[q.key]), MGMT_ADVICE[q.key][mgmt[q.key]]));
}

/* ---------- 「経営の状況」の回答から、相談したいことを自動で判断する ----------
   単純に1問だけ見るのではなく、5問すべての回答を深刻度でランキングし、
   気になる論点が複数あればまとめて、無ければ（総じて良好なら）前向きな相談に
   切り替える。各論点の「次の一手」（MGMT_ADVICE）を具体化させる質問文を組み立てる。 */
const MGMT_CONCERN_SEVERITY = {
  cashflow: { ok: 0, tight: 2, unknown: 2 },
  pricing: { confident: 0, unsure: 1, stale: 1 },
  hiring: { hire: 1, automate: 0, unknown: 2 },
  competition: { clear: 0, vague: 1, none: 2 },
  direction: { grow: 0, maintain: 0, succession: 1 }
};
/* ---------- 表紙の見出し：時間削減ではなく「経営者が望む方向への結論」を先頭に出す ---------- */
function coverHeadline(st, C) {
  const mgmt = st.mgmt || {};
  const answered = MGMT_QUESTIONS
    .map(q => ({ q, v: mgmt[q.key] }))
    .filter(x => x.v);
  if (answered.length) {
    const ranked = answered
      .map(x => ({ q: x.q, v: x.v, score: (MGMT_CONCERN_SEVERITY[x.q.key] || {})[x.v] || 0 }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const advice = MGMT_ADVICE[top.q.key][top.v];
    return advice.action;
  }
  const prio = C.sel.filter(t => t.priority);
  if (prio.length) {
    return `特に負担に感じているとお伺いした「${esc(prio[0].name)}」を中心に、優先順位をつけて着手すべき打ち手をご提案します。`;
  }
  return '経営全体を見渡し、今着手すべき打ち手を優先順位づけてご提案します。';
}

function autoConsultQuestion(st, C) {
  const mgmt = st.mgmt || {};
  const answered = MGMT_QUESTIONS
    .map(q => ({ q, v: mgmt[q.key] }))
    .filter(x => x.v);

  if (answered.length) {
    /* 5問すべてを深刻度でランキング（同点は質問の並び順を維持） */
    const ranked = answered
      .map(x => ({ q: x.q, v: x.v, score: (MGMT_CONCERN_SEVERITY[x.q.key] || {})[x.v] || 0 }))
      .sort((a, b) => b.score - a.score);
    const concerns = ranked.filter(x => x.score >= 1).slice(0, 2);

    if (concerns.length >= 2) {
      const [a, b] = concerns;
      const adviceA = MGMT_ADVICE[a.q.key][a.v], adviceB = MGMT_ADVICE[b.q.key][b.v];
      return `経営の状況として「${a.q.label}」（${mgmtLabel(a.q.key, a.v)}）と「${b.q.label}」（${mgmtLabel(b.q.key, b.v)}）の2点が特に気になっています。それぞれの次の一手（『${adviceA.action}』／『${adviceB.action}』）を踏まえ、当社としてどちらを先に着手すべきか、優先順位と具体的な進め方を教えてください。`;
    }
    if (concerns.length === 1) {
      const top = concerns[0];
      const advice = MGMT_ADVICE[top.q.key][top.v];
      return `特に「${top.q.label}」について、現状は${mgmtLabel(top.q.key, top.v)}という状況です。提言でいただいた『${advice.action}』を、当社の実情に当てはめて、具体的な実行手順（誰が・いつまでに・何をするか）まで落とし込んでください。`;
    }
    /* 5問すべてが良好な回答 → 課題解決ではなく、次の成長に向けた相談に切り替える */
    const dir = answered.find(x => x.q.key === 'direction') || answered[0];
    const advice = MGMT_ADVICE[dir.q.key][dir.v];
    return `経営の状況は総じて安定しているとお答えいただきました。「${dir.q.label}」（${mgmtLabel(dir.q.key, dir.v)}）という方針を踏まえ、提言でいただいた『${advice.action}』を実現するために、次に何から着手すべきか、具体的な進め方を教えてください。`;
  }

  const prio = C.sel.filter(t => t.priority);
  if (prio.length) {
    const names = prio.slice(0, 3).map(t => t.name).join('、');
    return `特に負担に感じている「${names}」の効率化を進めながら、経営全体として次に着手すべき打ち手を、優先順位をつけて具体的に教えてください。`;
  }
  return `上記の診断結果を踏まえて、経営全体として今いちばん優先すべき打ち手は何か、理由とあわせて教えてください。`;
}

/* ---------- この診断だけでは足りない場合に、他のAIへ相談を続けるためのプロンプト ---------- */
function advisorPromptText(st, C, indName) {
  const mgmt = st.mgmt || {};
  const mgmtLines = MGMT_QUESTIONS
    .filter(q => mgmt[q.key])
    .map(q => `・${q.label}→${mgmtLabel(q.key, mgmt[q.key])}`);
  const prio = C.sel.filter(t => t.priority);
  const prioLine = prio.length
    ? prio.slice(0, 5).map(t => t.name).join('、') + (prio.length > 5 ? ` ほか${prio.length - 5}件` : '')
    : 'とくに指定なし';

  return `あなたは中小企業の経営参謀（社長の右腕）です。以下はある会社の診断結果です。この内容を前提に、社長からの追加相談に具体的に答えてください。

【会社の状況】
業種：${indName}／従業員数：${st.company.emp}名

【経営の状況（ヒアリング回答）】
${mgmtLines.length ? mgmtLines.join('\n') : '・未回答'}

【診断結果】
削減時間：月${h1(C.savedM)}h（年間${h1(C.savedY)}h）／人件費削減：年間約${man(C.costY)}／売上インパクト：年間約${man(C.revenueY)}
特に負担に感じている業務：${prioLine}

【社長として、いま相談したいこと】
${autoConsultQuestion(st, C)}
※この内容は診断結果から自動で作成しています。実際の状況に合わせて書き換えてからAIに貼り付けてください。

上記を踏まえ、経営参謀として、根拠とあわせて具体的な打ち手を提案してください。`;
}

function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : v;
}

function pfoot(co) {
  /* ページ番号は最後に一括で差し替える */
  return `<div class="pfoot"><span>AI経営参謀 診断レポート ／ ${esc(co || '')}</span><span>__PN__ / __TT__</span></div>`;
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
  const ctx = {
    companyLabel: co.name || (indName + '事業者'),
    contactLabel: co.contact || 'ご担当者',
    industryShort: ind ? ind.name.replace(/・.*/, '') : ''
  };

  /* ---- P1 表紙：時間削減ではなく「経営者が望む方向への結論」を先頭に出す ---- */
  const headline = coverHeadline(st, C);
  pages.push(`
<div class="page rp-cover">
  <div class="cv-label">A I 経 営 参 謀 診 断</div>
  <h1>経営参謀 診断レポート</h1>
  <div class="cv-sub">— 経営者が望む方向へ、何をすべきかの提言 —</div>
  <div class="cv-line"></div>
  <div class="cv-co">${co.name ? esc(co.name) + ' 御中' : esc(indName) + ' 経営者 様'}</div>
  <div class="cv-to">${esc(co.contact || '')}</div>
  <div class="cv-direction">
    <div class="cvd-label">経営参謀としての結論</div>
    <div class="cvd-text">${esc(headline)}</div>
  </div>
  <div class="cv-ref">参考：あわせて業務の一部を自動化した場合、月${h1(C.savedM)}時間・年間${man(C.costY)}相当の余力を生み出せる見込みです（詳細は本編）。</div>
  <div class="cv-meta">
    業種：${esc(indName)}　／　従業員数：${esc(co.emp)}名<br>
    報告会実施日：${esc(dateStr || '　　年　　月　　日')}<br>
    診断実施：${esc(co.analyst || '')}
  </div>
</div>`);

  /* ---- 経営参謀からの提言（本編の先頭。時間削減より先に経営の方向性を扱う／最大2件・1ページ） ---- */
  const advCards = mgmtAdviceCards(st.mgmt || {}).slice(0, 2);
  if (advCards.length) {
    pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">1</span>経営参謀からの提言</div>
  <div class="rp-lead rp-accent">
    時間削減はあくまで手段です。まずお伺いした経営の状況をもとに、<b>経営者が望む方向へ進むための見立てと次の一手</b>をまとめました。
  </div>
  ${advCards.join('')}
  <div class="rp-note">※ ここでの助言は、いただいた回答にもとづく一般的な傾向です。数値の裏付けが必要な論点は、顧問税理士・専門家とあわせてご確認ください。</div>
  ${pfoot(co.name)}
</div>`);
  }

  /* ---- 現状の整理＋具体的な打ち手（1ページに集約） ---- */
  const issues = st.issues.items;
  const ROWS_MAX = 12;
  const rows = C.sel.slice(0, ROWS_MAX);
  const restCount = C.sel.length - rows.length;

  const tHead = `<thead><tr>
      <th class="ctr" style="width:30px">順位</th><th>業務</th><th style="width:70px">分類</th>
      <th class="num" style="width:56px">削減時間<br>(h/月)</th><th class="ctr" style="width:40px">難易度</th>
      <th class="num" style="width:74px">年間効果<br>(円)</th>
    </tr></thead>`;
  const tRow = t => `<tr>
        <td class="ctr"><b>${t.rank}</b></td>
        <td><b>${esc(t.name)}</b>${t.priority ? ' <span class="pill prio">重点</span>' : ''}</td>
        <td style="font-size:11px">${esc(t.cat)}</td>
        <td class="num" style="color:#0f8a7e;font-weight:700">▲${h1(t.saved)}</td>
        <td class="ctr"><span class="pill d${t.diff}">${DIFF_LABEL[t.diff]}</span></td>
        <td class="num">${Math.round(t.saved * 12 * st.calc.rate).toLocaleString('ja-JP')}</td>
      </tr>`;

  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">2</span>現状の整理と具体的な打ち手</div>
  <div class="rp-lead">
    ${esc(co.name || '貴社')}（${esc(indName)}・従業員${esc(co.emp)}名）について、<b>${C.sel.length}件</b>の業務を分析しました。
    経営上の課題：${issues.length ? issues.slice(0, 3).map(esc).join('、') : '—'}
    ${st.estimated ? '<span style="font-size:11.5px">（時間は業種標準値からの推計）</span>' : ''}
  </div>
  <div class="rp-h2">着手する順番（効果の大きさ×導入のしやすさ）</div>
  <table class="rt">
    ${tHead}
    <tbody>${rows.map(tRow).join('')}</tbody>
    <tfoot><tr>
      <td colspan="3">合計（${C.sel.length}業務${restCount > 0 ? `／上位${rows.length}件を表示` : ''}）</td>
      <td class="num">▲${h1(C.savedM)}</td>
      <td class="ctr">—</td>
      <td class="num">${Math.round(C.costY).toLocaleString('ja-JP')}</td>
    </tr></tfoot>
  </table>
  <div class="rp-note">
    前項の提言を実現する手段として、月間 <b>${h1(C.savedM)}時間</b> の余力を生み出せる見込みです。難易度は費用ではなく準備の手間で判定しています。
  </div>
  ${pfoot(co.name)}
</div>`);

  /* ---- 打ち手の具体化：AIの使い方（最重要1件のみ） ---- */
  const sheets = C.sel.slice(0, 1);
  sheets.forEach((t, i) => {
    const types = aiTypesOf(t).slice(0, 2);
    pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">3</span>打ち手の具体化：AIの使い方と仕上がりサンプル${i === 0 ? '' : '（続き）'}</div>
  <div class="aisheet">
    <div class="aisheet-h"><span class="ttl">${esc(t.name)}</span><span class="rank">優先度 ${t.rank}位 ／ 難易度 ${DIFF_LABEL[t.diff]}</span></div>
    <div class="aisheet-b">
      <div class="lb">■ 使うAI活用の型</div>
      <p><b>${types.map(x => esc(x.name)).join(' ＋ ')}</b></p>
      <div class="lb">■ AIをどう使うか</div>
      <p>${esc(t.how)}</p>
      <div class="lb">■ 実際の仕上がりサンプル（このレポートだけで完結します）</div>
      ${sampleArtifact(t, ctx)}
      <div class="lb">■ そのまま使えるプロンプト（お好みでChatGPT等に貼り付けてもお使いいただけます）</div>
      <div class="promptbox">${esc(promptFor(t, ctx)).replace(/\n/g, '<br>')}</div>
      <div class="lb">■ 最初の一歩（今週できること）</div>
      <p>${esc(types[0].first)}</p>
      <div class="effectbar">
        <div><div class="el">現状</div><div class="ev">${h1(t.cur)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">導入後</div><div class="ev">${h1(t.after)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">削減時間</div><div class="ev acc">▲${h1(t.saved)}<span style="font-size:10px">h/月</span></div></div>
        <div><div class="el">年間の効果</div><div class="ev acc">${man(t.saved * 12 * st.calc.rate)}</div></div>
      </div>
    </div>
  </div>
  ${pfoot(co.name)}
</div>`);
  });

  /* ---- 効果試算＋実行ロードマップ（1ページに集約） ---- */
  const phTitle = ['第1段階（1〜30日）', '第2段階（31〜60日）', '第3段階（61〜90日）'];
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">4</span>効果試算と実行ロードマップ</div>
  <div class="kpis">
    <div class="kpi"><div class="kl">月間の削減時間</div><div class="kv">${h1(C.savedM)}<small> 時間</small></div></div>
    <div class="kpi acc"><div class="kl">年間の人件費削減効果</div><div class="kv">${man(C.costY)}</div></div>
    <div class="kpi"><div class="kl">投資回収期間</div><div class="kv">約${C.payback ? (Math.round(C.payback * 10) / 10) : '—'}<small> か月</small></div></div>
    <div class="kpi acc"><div class="kl">年間売上インパクト</div><div class="kv">${man(C.revenueY)}</div></div>
  </div>
  <div class="rp-note" style="margin-bottom:10px">時間削減そのものが目的ではなく、参考の金額換算です（時間単価 ${yen(st.calc.rate)}）。年間の総合効果：約 ${man(C.totalY)}（コスト削減＋売上インパクト）。</div>
  <div class="rp-h2">実行ロードマップ（90日・効果が出やすい順に3段階）</div>
  ${C.phases.map((list, i) => `
  <div class="phase p${i + 1}">
    <div class="phase-h"><span>${phTitle[i]}</span><span>削減見込 ▲${h1(list.reduce((s, t) => s + t.saved, 0))} 時間/月</span></div>
    <div class="phase-b">
      ${list.length ? `<ul>${list.slice(0, 3).map(t => `<li><b>${esc(t.name)}</b>（▲${h1(t.saved)}h/月）／目安 ${DIFF_TERM[t.diff]}</li>`).join('')}${list.length > 3 ? `<li>ほか ${list.length - 3}業務</li>` : ''}</ul>`
        : '<div style="color:#5d6f80;font-size:12.4px;margin-top:4px">該当なし</div>'}
    </div>
  </div>`).join('')}
  ${pfoot(co.name)}
</div>`);

  /* ---- 留意点・次のアクション（1ページに集約） ---- */
  pages.push(`
<div class="page">
  <div class="rp-h"><span class="no">5</span>留意点と次のアクション</div>
  <div class="risk">
    <p style="margin-top:0"><b>1. 情報の取り扱い</b>：顧客情報・個人情報を生成AIに入力する場合は、学習に使われない設定を利用してください。</p>
    <p><b>2. AIの出力は必ず人が確認する</b>：特に金額・日付・固有名詞は人の目での確認を業務手順に組み込んでください。</p>
    <p style="margin-bottom:0"><b>3. 一度に全部やらない</b>：第1段階の1〜2業務に絞って成功体験をつくることを推奨します。</p>
  </div>
  <div class="rp-h2">次のアクション</div>
  <table class="rt">
    <tr><th class="ctr" style="width:40px">No</th><th style="width:220px">アクション</th><th style="width:110px">期限の目安</th><th>担当</th></tr>
    <tr><td class="ctr">1</td><td>推進担当者の決定</td><td>1週間以内</td><td>${esc(co.contact || '経営者')}</td></tr>
    <tr><td class="ctr">2</td><td>${esc(C.sel[0] ? C.sel[0].name : '最優先業務')}の手順の書き出し</td><td>2週間以内</td><td>担当部署</td></tr>
    <tr><td class="ctr">3</td><td>ツールの試用開始</td><td>3週間以内</td><td>推進担当者</td></tr>
    <tr><td class="ctr">4</td><td>第2段階の着手判断</td><td>2か月後</td><td>${esc(co.contact || '経営者')}</td></tr>
  </table>
  <div class="rp-note">本レポートは、ヒアリング内容と一般的な導入実績にもとづく試算です。ご不明な点はお気軽にお申し付けください。</div>
  <div style="text-align:right;margin-top:20px;font-size:13px;color:#5d6f80">
    ${esc(dateStr || '')}<br><b style="font-size:15px;color:#12314f">${esc(co.analyst || '')}</b>
  </div>
  ${pfoot(co.name)}
</div>

<div class="page">
  <div class="rp-h"><span class="no">6</span>この診断で足りないときは：AIに続けて相談する</div>
  <div class="rp-lead rp-accent">
    もっと踏み込んで相談したい、状況が変わったという場合は、下記をそのままコピーしてChatGPTやClaudeなど、お好きなAIに貼り付けてください。<b>この診断内容を前提にした状態から、続きの相談</b>ができます。
  </div>
  <div class="lb" style="font-size:11px;font-weight:700;color:#1d4b78;margin-bottom:2px">■ コピーして貼り付けるプロンプト</div>
  <div class="promptbox" style="font-size:10.8px;line-height:1.55">${esc(advisorPromptText(st, C, indName)).replace(/\n/g, '<br>')}</div>
  <div class="rp-note">※税務・法務など専門判断が必要な内容は、AIの回答をそのまま実行せず、顧問税理士・専門家にご確認ください。</div>
  ${pfoot(co.name)}
</div>`);

  /* ページ番号を振り直す
     ※ pages配列の1要素に複数の<div class="page">が入っていることがあるため、
       配列の添字ではなく実際のページ区切り（<div class="page">の直前）で分割し直してから採番する。 */
  const pageBlocks = pages.join('').split(/(?=<div class="page">)/).filter(s => s.trim());
  const total = pageBlocks.length;
  return pageBlocks
    .map((p, i) => p.replace('__PN__', String(i + 1)).replace('__TT__', String(total)))
    .join('');
}
