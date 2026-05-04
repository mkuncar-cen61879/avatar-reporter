#!/usr/bin/env node
/**
 * Reads all CSV files from /data, converts from Windows-1250 to UTF-8,
 * parses them, and generates a self-contained dashboard.html.
 *
 * Usage:  node build.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUT_FILE = path.join(__dirname, 'dashboard.html');

// ── Helpers ──────────────────────────────────────────────────

/** Windows-1250 → UTF-8 conversion table (0x80–0xFF) */
const WIN1250 = {
  0x80: 0x20AC, 0x82: 0x201A, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020,
  0x87: 0x2021, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x015A,
  0x8D: 0x0164, 0x8E: 0x017D, 0x8F: 0x0179, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x015B, 0x9D: 0x0165,
  0x9E: 0x017E, 0x9F: 0x017A, 0xA0: 0x00A0, 0xA1: 0x02C7, 0xA2: 0x02D8,
  0xA3: 0x0141, 0xA4: 0x00A4, 0xA5: 0x0104, 0xA6: 0x00A6, 0xA7: 0x00A7,
  0xA8: 0x00A8, 0xA9: 0x00A9, 0xAA: 0x015E, 0xAB: 0x00AB, 0xAC: 0x00AC,
  0xAD: 0x00AD, 0xAE: 0x00AE, 0xAF: 0x017B, 0xB0: 0x00B0, 0xB1: 0x00B1,
  0xB2: 0x02DB, 0xB3: 0x0142, 0xB4: 0x00B4, 0xB5: 0x00B5, 0xB6: 0x00B6,
  0xB7: 0x00B7, 0xB8: 0x00B8, 0xB9: 0x0105, 0xBA: 0x015F, 0xBB: 0x00BB,
  0xBC: 0x013D, 0xBD: 0x02DD, 0xBE: 0x013E, 0xBF: 0x017C, 0xC0: 0x0154,
  0xC1: 0x00C1, 0xC2: 0x00C2, 0xC3: 0x0102, 0xC4: 0x00C4, 0xC5: 0x0139,
  0xC6: 0x0106, 0xC7: 0x00C7, 0xC8: 0x010C, 0xC9: 0x00C9, 0xCA: 0x0118,
  0xCB: 0x00CB, 0xCC: 0x011A, 0xCD: 0x00CD, 0xCE: 0x00CE, 0xCF: 0x010E,
  0xD0: 0x0110, 0xD1: 0x0143, 0xD2: 0x0147, 0xD3: 0x00D3, 0xD4: 0x00D4,
  0xD5: 0x0150, 0xD6: 0x00D6, 0xD7: 0x00D7, 0xD8: 0x0158, 0xD9: 0x016E,
  0xDA: 0x00DA, 0xDB: 0x0170, 0xDC: 0x00DC, 0xDD: 0x00DD, 0xDE: 0x0162,
  0xDF: 0x00DF, 0xE0: 0x0155, 0xE1: 0x00E1, 0xE2: 0x00E2, 0xE3: 0x0103,
  0xE4: 0x00E4, 0xE5: 0x013A, 0xE6: 0x0107, 0xE7: 0x00E7, 0xE8: 0x010D,
  0xE9: 0x00E9, 0xEA: 0x0119, 0xEB: 0x00EB, 0xEC: 0x011B, 0xED: 0x00ED,
  0xEE: 0x00EE, 0xEF: 0x010F, 0xF0: 0x0111, 0xF1: 0x0144, 0xF2: 0x0148,
  0xF3: 0x00F3, 0xF4: 0x00F4, 0xF5: 0x0151, 0xF6: 0x00F6, 0xF7: 0x00F7,
  0xF8: 0x0159, 0xF9: 0x016F, 0xFA: 0x00FA, 0xFB: 0x0171, 0xFC: 0x00FC,
  0xFD: 0x00FD, 0xFE: 0x0163, 0xFF: 0x02D9,
};

function decodeWin1250(buf) {
  let out = '';
  for (const byte of buf) {
    if (byte < 0x80) { out += String.fromCharCode(byte); }
    else { out += String.fromCharCode(WIN1250[byte] || byte); }
  }
  return out;
}

/** Simple RFC 4180 CSV parser (handles quoted fields) */
function parseCSVRow(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      let val = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { val += '"'; i += 2; }
          else { i++; break; }
        } else { val += line[i]; i++; }
      }
      fields.push(val);
      if (i < line.length && line[i] === ',') i++; // skip comma
    } else {
      const next = line.indexOf(',', i);
      if (next === -1) { fields.push(line.substring(i)); break; }
      fields.push(line.substring(i, next));
      i = next + 1;
    }
  }
  return fields;
}

/** Check if filename looks like a date: YYYY-MM-DD */
function isDateFile(name) { return /^\d{4}-\d{2}-\d{2}$/.test(name); }

/** Extract date from filename — supports both formats */
function dateFromFilename(name) {
  if (isDateFile(name)) return name; // "2026-04-28"
  const m = name.match(/\((\d{2})-(\d{2})\)/);
  if (!m) return null;
  return `2026-${m[1]}-${m[2]}`;
}

// ── Main ─────────────────────────────────────────────────────

// Support both: date-named files (TSV/UTF-8) and *.csv (CSV/Win-1250)
const dataFiles = fs.readdirSync(DATA_DIR)
  .filter(f => isDateFile(f) || f.endsWith('.csv'))
  .sort();
console.log(`Found ${dataFiles.length} data files: ${dataFiles.join(', ')}`);

const allRows = [];

for (const file of dataFiles) {
  const date = dateFromFilename(file);
  const buf = fs.readFileSync(path.join(DATA_DIR, file));
  const isTSV = isDateFile(file);

  // Date-named files are UTF-8 TSV; CSV files are Win-1250 comma-separated
  const text = isTSV
    ? buf.toString('utf8')
    : decodeWin1250(buf);
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Find header row
  let headerIdx = lines.findIndex(l => l.startsWith('ID konverzace'));
  if (headerIdx === -1) { console.warn(`  ⚠ No header found in ${file}, skipping`); continue; }

  const headers = isTSV
    ? lines[headerIdx].split('\t')
    : parseCSVRow(lines[headerIdx]);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = isTSV
      ? lines[i].split('\t')
      : parseCSVRow(lines[i]);

    // Skip rows that are fully empty
    if (cols.every(c => !c.trim())) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (cols[idx] || '').trim(); });
    row._date = date;
    row._file = file;
    allRows.push(row);
  }

  console.log(`  ${file} → ${date}, ${allRows.filter(r => r._file === file).length} rows`);
}

console.log(`Total rows: ${allRows.length}`);

// Escape for safe embedding in JS template literal
const dataJSON = JSON.stringify(allRows, null, 0)
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/<\/script/gi, '<\\/script');

// ── HTML Template ────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AVATAR — Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
    <style>
        :root {
            --primary: #1a56db; --danger: #dc2626; --warning: #f59e0b;
            --success: #16a34a; --bg: #f3f4f6; --card: #fff;
            --text: #1f2937; --muted: #6b7280; --border: #e5e7eb;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }

        .header { background: linear-gradient(135deg, #1e3a8a 0%, #1a56db 100%); color: #fff; padding: 2rem 2rem 1.5rem; }
        .header h1 { font-size: 1.75rem; font-weight: 700; }
        .header p { color: rgba(255,255,255,.8); margin-top: .25rem; font-size: .95rem; }
        .container { max-width: 1360px; margin: 0 auto; padding: 1.5rem; }

        /* Date filter */
        .filter-bar { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
        .filter-btn {
            padding: .45rem 1rem; border-radius: 8px; border: 1px solid var(--border);
            background: var(--card); cursor: pointer; font-size: .85rem; font-weight: 500;
            transition: all .15s;
        }
        .filter-btn:hover { border-color: var(--primary); color: var(--primary); }
        .filter-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

        /* KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .kpi-card { background: var(--card); border-radius: 12px; padding: 1.15rem 1.4rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); border-left: 4px solid var(--primary); }
        .kpi-card.danger  { border-left-color: var(--danger); }
        .kpi-card.warning { border-left-color: var(--warning); }
        .kpi-card.success { border-left-color: var(--success); }
        .kpi-card.info    { border-left-color: #6366f1; }
        .kpi-card { cursor: pointer; transition: transform .1s, box-shadow .15s; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
        .kpi-card.selected { outline: 2px solid var(--primary); outline-offset: 2px; }
        .kpi-value { font-size: 2rem; font-weight: 700; }
        .kpi-label { font-size: .82rem; color: var(--muted); margin-top: .1rem; }
        .kpi-pct   { font-size: .85rem; color: var(--muted); font-weight: 600; }

        /* KPI Detail */
        .kpi-detail { background: var(--card); border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow-x: auto; margin-bottom: 1.5rem; display: none; }
        .kpi-detail.visible { display: block; }
        .kpi-detail h3 { font-size: .95rem; margin-bottom: .75rem; }
        .kpi-detail-close { float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--muted); padding: .2rem .5rem; }
        .kpi-detail-close:hover { color: var(--text); }

        /* Charts */
        .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px,1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
        .chart-card { background: var(--card); border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .chart-card h3 { font-size: .95rem; margin-bottom: .75rem; }
        .chart-card.full { grid-column: 1 / -1; }

        /* Table */
        .table-card { background: var(--card); border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow-x: auto; margin-bottom: 1.5rem; }
        .table-card h3 { font-size: .95rem; margin-bottom: .75rem; }
        table { width: 100%; border-collapse: collapse; font-size: .84rem; }
        th { background: #f9fafb; text-align: left; padding: .65rem .9rem; border-bottom: 2px solid var(--border); font-weight: 600; white-space: nowrap; }
        td { padding: .65rem .9rem; border-bottom: 1px solid var(--border); vertical-align: top; }
        tr:hover td { background: #f9fafb; }
        .badge { display: inline-block; padding: .12rem .55rem; border-radius: 999px; font-size: .72rem; font-weight: 600; }
        .badge-high   { background: #fee2e2; color: #991b1b; }
        .badge-medium { background: #fef3c7; color: #92400e; }
        .badge-low    { background: #dbeafe; color: #1e40af; }
        .badge-ok     { background: #dcfce7; color: #166534; }
        .badge-type   { background: #f3f4f6; color: #374151; }

        .footer { text-align: center; padding: 1.5rem; color: var(--muted); font-size: .8rem; }

        @media (max-width: 640px) {
            .chart-grid { grid-template-columns: 1fr; }
            .container { padding: 1rem; }
        }
    </style>
</head>
<body>

<div class="header">
    <div style="max-width:1360px;margin:0 auto;">
        <h1>AVATAR</h1>
        <p>Hodnocení produkčních konverzací &bull; Vygenerováno ${new Date().toLocaleDateString('cs-CZ')}</p>
    </div>
</div>

<div class="container">
    <div class="filter-bar" id="filterBar"></div>
    <div class="filter-bar" id="initiatorBar" style="margin-top:.25rem"></div>
    <div class="kpi-grid" id="kpiGrid"></div>
    <div class="kpi-detail" id="kpiDetail">
        <button class="kpi-detail-close" onclick="closeKPIDetail()">&times;</button>
        <h3 id="kpiDetailTitle"></h3>
        <table id="kpiDetailTable">
            <thead><tr>
                <th>Datum</th><th>ID</th><th>Shrnutí</th><th>Typ problému</th><th>Iniciátor</th>
            </tr></thead>
            <tbody></tbody>
        </table>
    </div>

    <div class="chart-grid">
        <div class="chart-card full">
            <h3>📈 Trend po dnech</h3>
            <div style="max-height:280px"><canvas id="chartTrend"></canvas></div>
        </div>
        <div class="chart-card">
            <h3>Rozložení podle typu problému</h3>
            <div style="max-height:320px"><canvas id="chartProblemType"></canvas></div>
        </div>

        <div class="chart-card">
            <h3>Doporučení</h3>
            <div id="recommendationsList" style="max-height:320px;overflow-y:auto"></div>
        </div>
        <div class="chart-card">
            <h3>Přepojení dle typu problému</h3>
            <div style="max-height:320px"><canvas id="chartHandoff"></canvas></div>
        </div>
    </div>

    <div class="table-card">
        <h3>🔴 Konverzace vyžadující pozornost</h3>
        <table id="attentionTable">
            <thead><tr>
                <th>Datum</th><th>ID</th><th>Typ problému</th><th>Dopad</th><th>Detail</th><th>Doporučení</th><th>Iniciátor</th>
            </tr></thead>
            <tbody></tbody>
        </table>
    </div>
</div>

<div class="footer">MTN Evaluátor Dashboard &copy; 2026</div>

<script>
// ── Embedded data ──
const ALL_DATA = ${dataJSON};

// ── Color palette ──
const C = {
    blue:'#3b82f6', red:'#ef4444', amber:'#f59e0b', green:'#22c55e',
    purple:'#8b5cf6', teal:'#14b8a6', pink:'#ec4899', slate:'#64748b',
    indigo:'#6366f1', orange:'#f97316', lime:'#84cc16', cyan:'#06b6d4',
};

const TYPE_COLORS = {
    'Bez problému': C.green,
    'Mini flow': C.red,
    'Platforma': C.purple,
    'KBase - chybí info': C.amber,
    'Handover': C.orange,
};
const IMPACT_COLORS = { 'High': C.red, 'Medium': C.amber, 'Low': C.blue };

// ── State ──
let selectedDate = 'all';
let selectedInitiator = 'all';
const dates = [...new Set(ALL_DATA.map(r => r._date))].sort();
const initiators = [...new Set(ALL_DATA.map(r => r['Iniciátor konverzace']).filter(Boolean))].sort();
let charts = {};

// ── Filter bar ──
const filterBar = document.getElementById('filterBar');
function renderFilters() {
    filterBar.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn' + (selectedDate === 'all' ? ' active' : '');
    allBtn.textContent = 'Všechny dny';
    allBtn.onclick = () => { selectedDate = 'all'; update(); };
    filterBar.appendChild(allBtn);

    for (const d of dates) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (selectedDate === d ? ' active' : '');
        const dateObj = new Date(d + 'T00:00:00');
        btn.textContent = dateObj.toLocaleDateString('cs-CZ', { day:'numeric', month:'short' });
        btn.onclick = () => { selectedDate = d; update(); };
        filterBar.appendChild(btn);
    }

    // Initiator filter
    const iBar = document.getElementById('initiatorBar');
    iBar.innerHTML = '';
    const allI = document.createElement('button');
    allI.className = 'filter-btn' + (selectedInitiator === 'all' ? ' active' : '');
    allI.textContent = 'Všichni iniciátoři';
    allI.onclick = () => { selectedInitiator = 'all'; update(); };
    iBar.appendChild(allI);
    for (const i of initiators) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (selectedInitiator === i ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => { selectedInitiator = i; update(); };
        iBar.appendChild(btn);
    }
}

function filteredData() {
    let d = selectedDate === 'all' ? ALL_DATA : ALL_DATA.filter(r => r._date === selectedDate);
    if (selectedInitiator !== 'all') d = d.filter(r => r['Iniciátor konverzace'] === selectedInitiator);
    return d;
}

// ── KPI ──
function renderKPI(data) {
    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = '';
    const total = data.length;
    const ok = data.filter(r => r['Typ problému'] === 'Bez problému').length;
    const problems = data.filter(r => r['Typ problému'] && r['Typ problému'] !== 'Bez problému' && r['Typ problému'] !== '').length;

    // Top problem type
    const problemRows = data.filter(r => r['Typ problému'] && r['Typ problému'] !== 'Bez problému' && r['Typ problému'] !== '');
    const problemTypeCounts = {};
    for (const r of problemRows) { const t = r['Typ problému']; problemTypeCounts[t] = (problemTypeCounts[t]||0)+1; }
    const topProblem = Object.entries(problemTypeCounts).sort((a,b) => b[1]-a[1])[0];
    const topProblemLabel = topProblem ? topProblem[0] : '—';
    const topProblemCount = topProblem ? topProblem[1] : 0;

    const handoff = data.filter(r => {
        const s = (r['Shrnutí konverzace'] || '').toLowerCase();
        return s.includes('přepojil na operátora') || s.includes('přepojil na online bankéře') || s.includes('přepojil klienta');
    }).length;
    const techErrors = data.filter(r => {
        const s = (r['Shrnutí konverzace'] || '' + r['Detail problému'] || '').toLowerCase();
        return s.includes('nenačetl') || s.includes('selhání') || s.includes('technickou chybu');
    }).length;

    // Filter functions for each KPI
    const kpiFilters = {
        'all': r => true,
        'ok': r => r['Typ problému'] === 'Bez problému',
        'problems': r => r['Typ problému'] && r['Typ problému'] !== 'Bez problému' && r['Typ problému'] !== '',
        'handoff': r => { const s = (r['Shrnutí konverzace']||'').toLowerCase(); return s.includes('přepojil na operátora') || s.includes('přepojil na online bankéře') || s.includes('přepojil klienta'); },
        'techErrors': r => { const s = (r['Shrnutí konverzace']||'' + r['Detail problému']||'').toLowerCase(); return s.includes('nenačetl') || s.includes('selhání') || s.includes('technickou chybu'); },
    };
    window._kpiFilters = kpiFilters;

    const kpis = [
        { v: total, l: 'Celkem konverzací', cls: '', key: 'all' },
        { v: ok, l: 'Bez problému', cls: 'success', pct: total ? Math.round(ok/total*100)+'%' : '', key: 'ok' },
        { v: problems, l: 'S problémem', cls: 'warning', pct: total ? Math.round(problems/total*100)+'%' : '', key: 'problems' },
        { v: handoff, l: 'Přepojení na operátora', cls: 'info', pct: total ? Math.round(handoff/total*100)+'%' : '', key: 'handoff' },
        { v: techErrors, l: 'Technické chyby', cls: 'danger', key: 'techErrors' },
    ];
    for (const k of kpis) {
        const card = document.createElement('div');
        card.className = 'kpi-card ' + k.cls;
        card.dataset.kpiKey = k.key;
        card.innerHTML = '<div class="kpi-value">' + k.v + '</div>'
            + (k.pct ? '<div class="kpi-pct">' + k.pct + '</div>' : '')
            + '<div class="kpi-label">' + k.l + '</div>';
        card.onclick = () => showKPIDetail(k.key, k.l, filteredData());
        grid.appendChild(card);
    }
}

let activeKPI = null;

function showKPIDetail(key, label, data) {
    // Toggle off if clicking same KPI
    if (activeKPI === key) { closeKPIDetail(); return; }
    activeKPI = key;

    // Highlight active card
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('selected'));
    const activeCard = document.querySelector('.kpi-card[data-kpi-key="' + key + '"]');
    if (activeCard) activeCard.classList.add('selected');

    const detail = document.getElementById('kpiDetail');
    detail.classList.add('visible');
    document.getElementById('kpiDetailTitle').textContent = label;

    const filterFn = window._kpiFilters[key] || (() => true);
    const rows = data.filter(filterFn);

    const tbody = document.querySelector('#kpiDetailTable tbody');
    tbody.innerHTML = '';
    for (const r of rows) {
        const tr = document.createElement('tr');
        const dateStr = r._date ? new Date(r._date+'T00:00:00').toLocaleDateString('cs-CZ', { day:'numeric', month:'short' }) : '—';
        tr.innerHTML =
            '<td>' + dateStr + '</td>' +
            '<td><code>' + (r['ID konverzace']||'—') + '</code></td>' +
            '<td>' + (r['Shrnutí konverzace']||'—') + '</td>' +
            '<td><span class="badge badge-type">' + (r['Typ problému']||'—') + '</span></td>' +
            '<td>' + (r['Iniciátor konverzace']||'—') + '</td>';
        tbody.appendChild(tr);
    }
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeKPIDetail() {
    activeKPI = null;
    document.getElementById('kpiDetail').classList.remove('visible');
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('selected'));
}

// ── Chart helpers ──
function countBy(arr, key) {
    return arr.reduce((a, r) => { const v = r[key] || '(prázdné)'; a[v] = (a[v]||0)+1; return a; }, {});
}

function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

function renderCharts(data) {
    // 1) Trend
    destroyChart('trend');
    const trendLabels = dates.map(d => {
        const dt = new Date(d+'T00:00:00');
        return dt.toLocaleDateString('cs-CZ', { day:'numeric', month:'short' });
    });
    const src = selectedInitiator === 'all' ? ALL_DATA : ALL_DATA.filter(r => r['Iniciátor konverzace'] === selectedInitiator);
    const totalPerDay = dates.map(d => src.filter(r => r._date === d).length);

    charts['trend'] = new Chart(document.getElementById('chartTrend'), {
        type: 'bar',
        data: {
            labels: trendLabels,
            datasets: [
                { label: 'Počet konverzací', data: totalPerDay, backgroundColor: C.blue, borderRadius: 6 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero:true, ticks: { stepSize:1 } } }
        }
    });

    // 2) Problem type doughnut
    destroyChart('problemType');
    const ptCounts = countBy(data, 'Typ problému');
    charts['problemType'] = new Chart(document.getElementById('chartProblemType'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(ptCounts),
            datasets: [{ data: Object.values(ptCounts),
                backgroundColor: Object.keys(ptCounts).map(k => TYPE_COLORS[k] || C.slate),
                borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive:true, maintainAspectRatio:true,
            plugins: { legend: { position:'bottom', labels: { padding:14, usePointStyle:true } } } }
    });



    // Recommendations list
    const recDiv = document.getElementById('recommendationsList');
    recDiv.innerHTML = '';
    const recs = data.filter(r => r['Doporučení'] && r['Doporučení'].trim());
    if (recs.length === 0) {
        recDiv.innerHTML = '<p style="color:var(--muted);font-size:.85rem;padding:.5rem">Žádná doporučení pro vybraný filtr.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.style.cssText = 'list-style:none;padding:0;margin:0;font-size:.84rem;';
        for (const r of recs) {
            const li = document.createElement('li');
            li.style.cssText = 'padding:.6rem .5rem;border-bottom:1px solid var(--border);';
            const typeColor = TYPE_COLORS[r['Typ problému']] || C.slate;
            li.innerHTML = '<span class="badge" style="background:' + typeColor + '22;color:' + typeColor + ';margin-bottom:.25rem;display:inline-block">' + (r['Typ problému']||'') + '</span> '
                + '<span style="color:var(--muted);font-size:.75rem">' + (r['ID konverzace']||'') + '</span>'
                + '<div style="margin-top:.2rem">' + r['Doporučení'] + '</div>';
            ul.appendChild(li);
        }
        recDiv.appendChild(ul);
    }

    // 5) Handoff by problem type
    destroyChart('handoff');
    const handoffRows = data.filter(r => {
        const s = (r['Shrnutí konverzace']||'').toLowerCase();
        return s.includes('přepojil na operátora') || s.includes('přepojil na online bankéře') || s.includes('přepojil klienta');
    });
    const handoffByType = {};
    for (const r of handoffRows) { const t = r['Typ problému'] || 'Nezadáno'; handoffByType[t] = (handoffByType[t]||0)+1; }
    charts['handoff'] = new Chart(document.getElementById('chartHandoff'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(handoffByType),
            datasets: [{ data: Object.values(handoffByType),
                backgroundColor: Object.keys(handoffByType).map(k => TYPE_COLORS[k] || C.slate),
                borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive:true, maintainAspectRatio:true,
            plugins: { legend: { position:'bottom', labels: { padding:14, usePointStyle:true } } } }
    });
}

// ── Table ──
function renderTable(data) {
    const tbody = document.querySelector('#attentionTable tbody');
    tbody.innerHTML = '';
    const rows = data.filter(r => r['Akce'] === 'Vyžaduje pozornost');
    for (const r of rows) {
        const tr = document.createElement('tr');
        const impClass = r['Dopad'] === 'High' ? 'badge-high' : r['Dopad'] === 'Medium' ? 'badge-medium' : r['Dopad'] === 'Low' ? 'badge-low' : 'badge-type';
        const dateStr = r._date ? new Date(r._date+'T00:00:00').toLocaleDateString('cs-CZ', { day:'numeric', month:'short' }) : '—';
        tr.innerHTML =
            '<td>' + dateStr + '</td>' +
            '<td><code>' + (r['ID konverzace']||'—') + '</code></td>' +
            '<td><span class="badge badge-type">' + (r['Typ problému']||'—') + '</span></td>' +
            '<td><span class="badge ' + impClass + '">' + (r['Dopad']||'—') + '</span></td>' +
            '<td>' + (r['Detail problému']||'—') + '</td>' +
            '<td>' + (r['Doporučení']||'—') + '</td>' +
            '<td>' + (r['Iniciátor konverzace']||'—') + '</td>';
        tbody.appendChild(tr);
    }
}

// ── Update all ──
function update() {
    renderFilters();
    const data = filteredData();
    renderKPI(data);
    renderCharts(data);
    renderTable(data);
    // Re-open KPI detail if one was active
    if (activeKPI) {
        const label = document.querySelector('.kpi-card[data-kpi-key="' + activeKPI + '"]');
        if (label) showKPIDetail(activeKPI, label.querySelector('.kpi-label').textContent, data);
        else closeKPIDetail();
    }
}

update();
<\/script>
</body>
</html>`;

fs.writeFileSync(OUT_FILE, html, 'utf8');
console.log(`\n✅ Dashboard written to ${OUT_FILE}`);
