/* ---------- Report core: pure functions (no DOM) ---------- */
const NAVY = '1F3864';
const num = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[%,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const pct = v => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toFixed(2) + '%';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const idKey = v => String(v ?? '').replace(/\D/g, '');
const normName = n => String(n || '').toLowerCase().replace(/[^a-z]/g, '');
const shortName = n => String(n || '').replace(/…/g, '').replace(/[-–—]\s*\d*\s*$/, '').replace(/^(md|mst)\.?\s+/i, '').replace(/\s+/g, ' ').trim();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3 = MONTHS.map(m => m.slice(0, 3));

/** Reason text for the "Low Performing" column. th = % below which a metric is flagged. */
function lowText(m, th = 50) {
  const seg = [];
  const eu = m.eu || 0;
  if (eu === 0) seg.push('no end user visits'); else if (eu === 1) seg.push('only 1 end user visit');
  const lead = []; let noLc = false, noLv = false;
  if (!m.lcA) noLc = true; else if (m.lcA < th) lead.push('lead creation ' + pct(m.lcA));
  if (!m.lvA) noLv = true; else if (m.lvA < th) lead.push('lead visit ' + pct(m.lvA));
  if (lead.length) seg.push(lead.join(', '));
  if (noLc) seg.push('no lead creation');
  if (noLv) seg.push('no lead visits');
  const zero = [], low = [];
  [['conversion', m.convA], ['active carpenter', m.carpA]].forEach(([k, v]) => {
    if (!v) zero.push(k); else if (v < th) low.push(k + ' ' + pct(v));
  });
  if (low.length) seg.push(low.join(', '));
  if (zero.length) seg.push(zero.join(' and ') + ' 0%');
  return cap(seg.join('; '));
}

/** Turn what Claude read from one screenshot into report rows. */
function normalizeRows(arr) {
  return (Array.isArray(arr) ? arr : []).filter(r => r && (r.id || r.name)).map(r => ({
    id: String(r.id ?? '').trim(),
    name: String(r.name ?? '').trim(),
    loc: String(r.location ?? r.loc ?? '').trim(),
    ach: num(r.overall), kpi: num(r.kpi),
    m: {
      eu: num(r.endUserVisit), lcA: num(r.leadCreationAch), lvA: num(r.leadVisitAch), lvN: num(r.leadVisited),
      convA: num(r.convAch), carpA: num(r.carpAch)
    }
  }));
}

/** Join current-month rows with previous-month rows (by user id, then by name). */
function buildRows(cur, prev, th) {
  const byId = new Map(), byName = new Map();
  prev.forEach(p => { if (idKey(p.id)) byId.set(idKey(p.id), p); byName.set(normName(p.name), p); });
  const seen = new Set();
  const rows = [];
  cur.forEach(c => {
    const k = idKey(c.id) || normName(c.name);
    if (seen.has(k)) return; seen.add(k);
    const p = byId.get(idKey(c.id)) || byName.get(normName(c.name));
    rows.push({
      id: idKey(c.id) || c.id, name: c.name, loc: c.loc, ach: c.ach,
      kpi: c.kpi != null ? Math.round(c.kpi) : (c.ach == null ? null : Math.round(c.ach / 2)),
      pach: p ? p.ach : null, pkpi: p && p.kpi != null ? Math.round(p.kpi) : null,
      m: c.m, low: lowText(c.m, th), lowEdited: false, emp: '', asmfb: DEFAULT_ASM_FB
    });
  });
  return sortRows(rows);
}
const DEFAULT_ASM_FB = 'Focus on weak points, monitor closely and Need Dashboard';
const sortRows = rows => rows.slice().sort((a, b) => (b.ach ?? -1) - (a.ach ?? -1));

/** Names used in the summary: short, and with territory when two people share one. */
function labeller(rows) {
  const count = {};
  rows.forEach(r => { const s = shortName(r.name); count[s] = (count[s] || 0) + 1; });
  return r => { const s = shortName(r.name); return count[s] > 1 && r.loc ? `${s} of ${r.loc}` : s; };
}
const joinList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

/** Summary line + four bullets, written the way the Rajshahi report words them. */
function buildSummary(rows, prevLabel) {
  const L = labeller(rows);
  const have = rows.filter(r => r.ach != null);
  const n = rows.length;
  const prevRows = rows.filter(r => r.pach != null);
  const kpis = rows.map(r => r.kpi).filter(v => v != null);
  const pk = rows.map(r => r.pkpi).filter(v => v != null);
  const rng = a => a.length ? `${Math.min(...a)}–${Math.max(...a)}` : null;
  let line = `Summary: ${n} executive${n === 1 ? '' : 's'} reviewed`;
  const a = avg(have.map(r => r.ach));
  if (a != null) {
    line += `  •  Average overall achievement ${pct(a)}`;
    const pa = avg(prevRows.map(r => r.pach));
    if (pa != null) line += ` (${prevLabel} ${pct(pa)})`;
  }
  if (rng(kpis)) line += `  •  Current KPI range ${rng(kpis)}`;
  if (rng(pk)) line += `  •  ${prevLabel} KPI range ${rng(pk)}`;

  const bullets = [];
  if (have.length) {
    const s = have.slice().sort((x, y) => y.ach - x.ach);
    const top = s[0];
    let t = `Highest achievement is ${pct(top.ach)} (${L(top)}${top.kpi != null ? ', KPI ' + top.kpi : ''})`;
    if (top.kpi != null) t += ` and no one is above KPI ${top.kpi}`;
    t += '.';
    if (s.length > 2) {
      const lo = s.slice(-2).reverse();
      t += ` Lowest are ${L(lo[0])} (${pct(lo[0].ach)}) and ${L(lo[1])} (${pct(lo[1].ach)})`;
      t += (lo[0].kpi != null && lo[0].kpi === lo[1].kpi) ? `, both at KPI ${lo[0].kpi}.` : '.';
    }
    bullets.push(['Overall: ', t]);
  }
  if (prevRows.length) {
    const diffs = prevRows.map(r => ({ r, d: r.pach - r.ach })).filter(x => x.r.ach != null);
    const below = diffs.filter(x => x.d > 0);
    let t;
    if (below.length === diffs.length) t = `Every executive is ${diffs.every(x => x.d > 10) ? 'well ' : ''}below ${prevLabel}.`;
    else { const up = diffs.length - below.length; t = `${up} of ${diffs.length} executive${diffs.length === 1 ? ' is' : 's are'} at or above ${prevLabel}; ${below.length} ${below.length === 1 ? 'is' : 'are'} below.`; }
    const useKpi = below.length > 0 && below.every(x => x.r.kpi != null && x.r.pkpi != null);
    const falls = below.sort((x, y) => useKpi ? (y.r.pkpi - y.r.kpi) - (x.r.pkpi - x.r.kpi) : y.d - x.d).slice(0, 3);
    if (falls.length) {
      t += ` The biggest ${useKpi ? 'KPI ' : ''}falls are ` + joinList(falls.map(x =>
        `${L(x.r)} (${useKpi ? `${x.r.pkpi} to ${x.r.kpi}` : `${x.r.pach.toFixed(1)}% to ${x.r.ach.toFixed(1)}%`})`)) + '.';
    }
    bullets.push([`Vs ${prevLabel}: `, t]);
  }
  const lc = rows.filter(r => r.m && r.m.lcA > 0).sort((x, y) => y.m.lcA - x.m.lcA);
  const lvAll = rows.filter(r => r.m);
  const lvNone = lvAll.filter(r => !r.m.lvA);
  const lvLow = lvAll.filter(r => r.m.lvA > 0).sort((x, y) => x.m.lvA - y.m.lvA);
  if (lc.length || lvAll.length) {
    let t = '';
    if (lc.length) t += `Lead creation is best for ${joinList(lc.slice(0, 2).map(r => `${L(r)} (${pct(r.m.lcA)})`))}.`;
    if (lvLow.length || lvNone.length) {
      t += ' ';
      if (lvLow.length) t += `Lead visit is weakest for ${L(lvLow[0])} (${pct(lvLow[0].m.lvA)})` + (lvNone.length ? ', and ' : '.');
      if (lvNone.length) t += `${joinList(lvNone.map(L))} logged no lead visits.`;
    }
    if (t.trim()) bullets.push(['Leads: ', t.trim()]);
  }
  const withEu = rows.filter(r => r.m && r.m.eu > 0);
  if (rows.some(r => r.m)) {
    const total = withEu.reduce((s, r) => s + r.m.eu, 0);
    const none = rows.filter(r => r.m && !(r.m.eu > 0));
    let t = `${total} visit${total === 1 ? ' was' : 's were'} logged by ${withEu.length} executive${withEu.length === 1 ? '' : 's'}`;
    if (none.length) t += none.length <= 6 ? `; ${joinList(none.map(L))} logged none.` : `; ${none.length} executives logged none.`;
    else t += '.';
    bullets.push(['End user visit: ', t]);
  }
  return { line, bullets };
}

/** Month-aware labels: an early-month meeting reviews last month, an end-of-month one reviews this month. */
function periodLabels(dateStr, win) {
  const [y, m] = dateStr.split('-').map(Number);
  const cur = win === 'start' ? (m + 10) % 12 : m - 1;
  const prev = (cur + 11) % 12;
  return { cur: MONTHS[cur], prev: MONTHS[prev] };
}
function fmtLongDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MON3[m - 1]} ${y}`;
}

/* ---------- DOCX writer (matches the Rajshahi Improvement Meeting Report) ---------- */
const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const rpr = (o = {}) => `<w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>${o.b ? '<w:b/><w:bCs/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/></w:rPr>`;
const run = (t, o) => `<w:r>${rpr(o)}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (runs, ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${runs}</w:p>`;
const COLS = [650, 2200, 1500, 950, 650, 1000, 800, 2700, 2500, 1888];
const BORDER = ['top', 'left', 'bottom', 'right'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`).join('');
function cell(i, text, o = {}) {
  const sz = o.sz || 17;
  const body = String(text ?? '').split('\n').map(line =>
    para(run(line, { b: o.b, color: o.color, sz }), o.jc ? `<w:jc w:val="${o.jc}"/>` : '')).join('');
  return `<w:tc><w:tcPr><w:tcW w:w="${COLS[i]}" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders>${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ''}<w:tcMar><w:top w:w="25" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="25" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${body}</w:tc>`;
}
const kpiFill = k => k == null ? undefined : k >= 5 ? 'FFF2CC' : k >= 2 ? 'FCE4D6' : 'F4B6B6';
const HEAD = ['ID', 'Name', 'Territory', 'Overall Ach.', 'KPI', null, null, 'Low Performing', 'Employee Feedback', 'ASM Feedback'];

function buildDocumentXml(d) {
  const prev = d.prevLabel.replace(/\.$/, '');
  const prevShort = prev.length > 5 ? prev.slice(0, 4) + '.' : prev;
  HEAD[5] = `${prevShort} Overall Ach.`; HEAD[6] = `${prevShort} KPI`;
  const { line, bullets } = buildSummary(d.rows, prev);
  let x = '';
  x += para(run('Improvement Meeting', { b: 1, color: NAVY, sz: 36 }));
  x += para(run('Performance Overview', { color: '595959', sz: 24 }));
  const meta = `   |   ${d.asm ? 'ASM: ' + d.asm + '   |   ' : ''}Date: ${fmtLongDate(d.date)} (${d.win === 'start' ? 'start of month' : 'end of month'})   |   Executive / Sr. Executive Performance Review`;
  x += para(run('Area: ', { b: 1, sz: 22 }) + run(d.area, { b: 1, sz: 22 }) + run(meta, { sz: 22 }),
    `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${NAVY}"/></w:pBdr><w:spacing w:after="80"/>`);
  x += para(run(line, { b: 1, color: NAVY, sz: 19 }), '<w:spacing w:after="80"/>');
  bullets.forEach(([k, t]) => {
    x += para(run(k, { b: 1, sz: 18 }) + run(t, { sz: 18 }),
      '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="40"/>');
  });
  x += para(run('Executive / Sr. Executive Performance Review (ranked by overall achievement)', { b: 1, color: NAVY, sz: 19 }), '<w:spacing w:before="100" w:after="60"/>');

  let t = `<w:tbl><w:tblPr><w:tblW w:w="${COLS.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="10" w:type="dxa"/><w:right w:w="10" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${COLS.map(c => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`;
  t += `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${HEAD.map((h, i) => cell(i, h, { fill: NAVY, b: 1, color: 'FFFFFF', jc: 'center' })).join('')}</w:tr>`;
  sortRows(d.rows).forEach(r => {
    const kp = r.kpi == null ? '' : String(r.kpi);
    t += `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="560"/></w:trPr>`
      + cell(0, r.id, { jc: 'center' }) + cell(1, r.name) + cell(2, r.loc)
      + cell(3, r.ach == null ? '' : pct(r.ach), { b: 1, jc: 'center' })
      + cell(4, kp, { b: 1, jc: 'center', fill: kpiFill(r.kpi) })
      + cell(5, r.pach == null ? '' : pct(r.pach), { jc: 'center', fill: 'EDEDED' })
      + cell(6, r.pkpi == null ? '' : String(r.pkpi), { b: 1, jc: 'center', fill: 'EDEDED' })
      + cell(7, r.low, { sz: 15 }) + cell(8, r.emp, { sz: 15 }) + cell(9, r.asmfb, { sz: 15 }) + '</w:tr>';
  });
  t += '</w:tbl>';
  x += t;
  if (d.notes && d.notes.length) {
    x += para(run('Meeting notes', { b: 1, color: NAVY, sz: 19 }), '<w:spacing w:before="160" w:after="60"/>');
    d.notes.forEach(n => {
      x += para(run(n.date ? fmtLongDate(n.date) + ': ' : '', { b: 1, sz: 18 }) + run(n.text, { sz: 18 }),
        '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="40"/>');
    });
  } else {
    x += para('');
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${x}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="500" w:right="1000" w:bottom="400" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

async function buildDocx(JSZipLib, d) {
  const z = new JSZipLib();
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>');
  z.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/></w:pPr></w:style></w:styles>`);
  z.file('word/numbering.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="500" w:hanging="250"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  z.file('word/document.xml', buildDocumentXml(d));
  return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
