/* =========================================================
   レポート専用スタイル
   （画面プレビュー・印刷・単体HTML書き出しで共通利用するため
     CSSファイルではなくJS定数として保持しています）
   ========================================================= */
const REPORT_CSS = `
.report{background:#fff;color:#1c2b39;font-size:13.6px;line-height:1.8;
  font-family:"Yu Gothic UI","Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif;}
.report *{box-sizing:border-box;}
.report h1,.report h2,.report h3,.report h4,.report h5{margin:0;font-weight:700;}
.page{position:relative;}
#reportPreview .page,.standalone .page{
  width:190mm;margin:0 auto 18px;padding:16mm 15mm 12mm;background:#fff;
  box-shadow:0 3px 14px rgba(0,0,0,.28);border-radius:2px;min-height:277mm;
  display:flex;flex-direction:column;
}
.rp-cover{text-align:center;padding-top:26mm !important;}
.rp-cover .cv-label{letter-spacing:.5em;color:#0f8a7e;font-size:12px;font-weight:700;}
.rp-cover h1{font-size:30px;color:#12314f;margin:14px 0 6px;letter-spacing:.04em;}
.rp-cover .cv-sub{font-size:14px;color:#5d6f80;}
.rp-cover .cv-line{width:70px;height:3px;background:#0f8a7e;margin:22px auto;}
.rp-cover .cv-co{font-size:23px;font-weight:700;color:#12314f;margin-top:34px;}
.rp-cover .cv-to{font-size:14px;color:#5d6f80;margin-top:4px;}
.rp-cover .cv-meta{margin-top:44px;font-size:13px;color:#5d6f80;line-height:2;}
.cv-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:34px;}
.cv-hero>div{border:1px solid #dbe3ea;border-radius:8px;padding:14px 6px;background:#f7fafb;}
.cv-hero .hl{font-size:11px;color:#5d6f80;}
.cv-hero .hv{font-size:24px;font-weight:700;color:#0f8a7e;line-height:1.3;}
.cv-hero .hu{font-size:11px;color:#5d6f80;}

.cv-direction{margin-top:32px;padding:18px 22px;border:1px solid #9fd5cd;background:#eaf6f3;border-radius:10px;text-align:left;}
.cv-direction .cvd-label{font-size:11px;font-weight:700;color:#0f8a7e;letter-spacing:.1em;}
.cv-direction .cvd-text{font-size:14.5px;color:#12314f;line-height:1.7;margin-top:6px;}
.cv-ref{margin-top:14px;font-size:11.5px;color:#5d6f80;}

.rp-h{font-size:19px;color:#12314f;border-bottom:2.5px solid #0f8a7e;padding-bottom:6px;margin-bottom:16px;display:flex;align-items:baseline;gap:10px;}
.rp-h .no{background:#0f8a7e;color:#fff;font-size:12px;padding:2px 10px;border-radius:4px;}
.rp-h2{font-size:15.5px;color:#12314f;margin:20px 0 8px;padding-left:10px;border-left:4px solid #1d4b78;}
.rp-lead{background:#f5f8fa;border-left:4px solid #0f8a7e;padding:12px 16px;margin-bottom:16px;font-size:13.4px;}
.rp-note{font-size:11.5px;color:#5d6f80;margin-top:6px;}
.rp-accent{background:#e6f4f2;border-left-color:#0f8a7e;}
.rp-gold{background:#fdfaf1;border-left-color:#b8860b;}

table.rt{width:100%;border-collapse:collapse;font-size:12.4px;margin-bottom:8px;}
table.rt th{background:#12314f;color:#fff;padding:7px 8px;text-align:left;font-weight:700;border:1px solid #12314f;}
table.rt td{border:1px solid #dbe3ea;padding:6px 8px;vertical-align:middle;}
table.rt tbody tr:nth-child(even) td{background:#f8fafc;}
table.rt td.num,table.rt th.num{text-align:right;}
table.rt td.ctr,table.rt th.ctr{text-align:center;}
table.rt tfoot td{background:#e6f4f2 !important;font-weight:700;color:#12314f;}
.pill{display:inline-block;font-size:10.5px;padding:2px 8px;border-radius:10px;font-weight:700;}
.d1{background:#e4f5ec;color:#1e7a4d;}
.d2{background:#fff3d9;color:#9a6b06;}
.d3{background:#fde5e2;color:#b03a2a;}
.pill.prio{background:#0f8a7e;color:#fff;}

.kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:14px 0;}
.kpi{border:1px solid #dbe3ea;border-radius:8px;padding:14px 16px;background:#f9fbfc;}
.kpi .kl{font-size:11.5px;color:#5d6f80;}
.kpi .kv{font-size:25px;font-weight:700;color:#12314f;line-height:1.35;}
.kpi .kv small{font-size:13px;font-weight:700;}
.kpi.acc{background:#e6f4f2;border-color:#9fd5cd;}
.kpi.acc .kv{color:#0f8a7e;}

.flowbox{display:grid;grid-template-columns:1fr 34px 1fr;gap:10px;margin:12px 0;}
.flowcol{border:1px solid #dbe3ea;border-radius:8px;padding:12px 14px;}
.flowcol.now{background:#fdf6f5;border-color:#e8c2bb;}
.flowcol.aft{background:#f2faf8;border-color:#9fd5cd;}
.flowcol h5{font-size:12.5px;margin:0 0 8px;}
.flowcol.now h5{color:#b03a2a;}
.flowcol.aft h5{color:#0f8a7e;}
.flowcol ol{margin:0;padding-left:18px;font-size:12.2px;line-height:1.7;}
.flowcol li{margin-bottom:3px;}
.flowarrow{display:flex;align-items:center;justify-content:center;font-size:22px;color:#0f8a7e;font-weight:700;}

.aisheet{border:1px solid #dbe3ea;border-radius:9px;margin-bottom:10px;overflow:hidden;break-inside:avoid;}
.aisheet-h{background:#12314f;color:#fff;padding:6px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;}
.aisheet-h .ttl{font-weight:700;font-size:14px;}
.aisheet-h .rank{background:#0f8a7e;border-radius:4px;font-size:11px;padding:1px 9px;font-weight:700;white-space:nowrap;}
.aisheet-b{padding:7px 14px;line-height:1.5;}
.aisheet-b .lb{font-size:11px;font-weight:700;color:#1d4b78;margin-top:5px;}
.aisheet-b .lb:first-child{margin-top:0;}
.aisheet-b p{margin:2px 0 0;font-size:12px;}
.effectbar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;background:#f7fafb;border-radius:6px;padding:7px 10px;}
.effectbar>div{text-align:center;}
.effectbar .el{font-size:10.5px;color:#5d6f80;}
.effectbar .ev{font-size:16px;font-weight:700;color:#12314f;}
.effectbar .ev.acc{color:#0f8a7e;}

/* ---- 実際の仕上がりサンプル ---- */
.sample-doc{border:1.5px dashed #9fd5cd;background:#fbfdfd;border-radius:7px;padding:6px 12px;margin-top:2px;font-size:11.6px;}
.sd-head{font-weight:700;color:#12314f;border-bottom:1px solid #dbe3ea;padding-bottom:4px;margin-bottom:5px;}
.sd-body{line-height:1.6;color:#1c2b39;}
.ph{background:#fff3d9;color:#9a6b06;font-weight:700;padding:0 4px;border-radius:3px;}
.sample-tbl{margin-top:3px;}
.sample-tbl th,.sample-tbl td{padding:4px 8px;}
.sample-qa{margin-top:3px;}
.qa-row{border:1px solid #dbe3ea;border-radius:7px;padding:5px 10px;margin-bottom:4px;background:#fbfcfd;}
.qa-q{font-weight:700;color:#12314f;font-size:11.8px;}
.qa-a{font-size:11.6px;color:#3a4a58;margin-top:2px;}
.sample-voice{border:1.5px dashed #9fd5cd;background:#fbfdfd;border-radius:7px;padding:8px 12px;margin-top:3px;}
.sv-lb{font-size:10px;color:#8fa0af;font-weight:700;}
.sv-raw{font-size:11.6px;color:#5d6f80;font-style:italic;margin-top:2px;padding-left:7px;border-left:3px solid #dbe3ea;}
.sv-arrow{text-align:center;color:#0f8a7e;font-weight:700;font-size:10.5px;margin:5px 0;}
.sv-out{background:#e6f4f2;border-radius:6px;padding:6px 10px;font-size:11.8px;line-height:1.65;}
.sv-out b{color:#12314f;}
.promptbox{background:#12314f;color:#dfe9f0;border-radius:7px;padding:8px 12px;margin-top:3px;font-family:"Consolas","SF Mono",Menlo,monospace;font-size:11px;line-height:1.55;white-space:normal;}

/* ---- 経営参謀からの提言 ---- */
.advcard{border:1px solid #dbe3ea;border-radius:9px;margin-bottom:12px;overflow:hidden;break-inside:avoid;}
.adv-h{background:#1d4b78;color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;}
.adv-q{font-weight:700;font-size:13.5px;}
.adv-a{background:#0f8a7e;border-radius:4px;font-size:11.5px;padding:2px 10px;font-weight:700;white-space:nowrap;}
.adv-b{padding:11px 14px;font-size:12.6px;line-height:1.85;}
.adv-b b{color:#12314f;}
.adv-b>div{margin-bottom:5px;}
.adv-b>div:last-child{margin-bottom:0;}

.phase{border:1px solid #dbe3ea;border-radius:9px;margin-bottom:12px;overflow:hidden;break-inside:avoid;}
.phase-h{padding:8px 14px;color:#fff;display:flex;justify-content:space-between;font-weight:700;font-size:13.5px;gap:10px;}
.p1 .phase-h{background:#1e7a4d;}
.p2 .phase-h{background:#b8860b;}
.p3 .phase-h{background:#1d4b78;}
.phase-b{padding:11px 15px;font-size:12.6px;}
.phase-b ul{margin:5px 0 0;padding-left:18px;}

.checklist{list-style:none;padding:0;margin:0;font-size:12.8px;}
.checklist li{padding:7px 0 7px 26px;border-bottom:1px dashed #dbe3ea;position:relative;}
.checklist li:before{content:"☐";position:absolute;left:4px;top:6px;color:#0f8a7e;font-size:15px;}

.risk{border:1px solid #e8d5a8;background:#fdfaf1;border-radius:8px;padding:12px 16px;font-size:12.6px;}
.risk b{color:#8a6508;}

.pfoot{margin-top:auto;padding-top:6px;border-top:1px solid #dbe3ea;display:flex;justify-content:space-between;font-size:10px;color:#8fa0af;}

.report svg .axis{stroke:#c9d4de;stroke-width:1;}
.report svg .lbl{font-size:9px;fill:#5d6f80;}
.report svg .bar{fill:#0f8a7e;}
.report svg .bar2{fill:#c9dde2;}

@media print{
  @page{size:A4;margin:13mm 12mm 12mm;}
  html,body{background:#fff !important;}
  .no-print{display:none !important;}
  .print-only{display:block !important;}
  .page{page-break-after:always;width:auto !important;min-height:0 !important;
        box-shadow:none !important;margin:0 !important;padding:0 0 14mm !important;border-radius:0;}
  .page:last-child{page-break-after:auto;}
  .pfoot{margin-top:auto;padding-top:4mm;}
  .aisheet,.phase,table.rt,.flowbox,.kpi{break-inside:avoid;}
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
}
@media(max-width:820px){
  #reportPreview .page{width:100%;padding:18px;min-height:0;}
  .cv-hero,.kpis,.effectbar{grid-template-columns:1fr 1fr;}
  .flowbox{grid-template-columns:1fr;}
  .flowarrow{transform:rotate(90deg);}
}
`;

/* 画面へ適用 */
(function () {
  const s = document.createElement('style');
  s.id = 'reportStyle';
  s.textContent = REPORT_CSS;
  document.head.appendChild(s);
})();
