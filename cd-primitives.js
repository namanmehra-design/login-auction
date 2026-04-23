// Vanilla JS conversion of the React JSX primitives + shared shells.
// Every component returns an HTML string. Components are attached to window.CD.
//
// Source files:
//   project/primitives.jsx     -> mock data + primitives (Ticker, Pill, Icon, etc.)
//   project/scenes-desktop.jsx -> DesktopShell
//   project/scenes-mobile.jsx  -> MobileShell + LEAGUE_SUBTABS
//
// Event handlers in JSX are emitted as `onclick="window.<fn>(...)"` placeholders
// so they can be wired up later.

(function () {
  'use strict';

  window.CD = window.CD || {};
  const CD = window.CD;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  // Build a CSS string from a React-style object. camelCase -> kebab-case.
  // Numeric values for known length props get `px` appended (parity with React).
  const UNITLESS = new Set([
    'opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow',
    'flexShrink', 'order', 'gridColumn', 'gridRow', 'columns', 'fillOpacity',
    'strokeOpacity', 'strokeWidth',
  ]);
  function cssKey(k) {
    if (k.startsWith('--')) return k;
    if (k.startsWith('Webkit')) return '-webkit-' + k.slice(6).replace(/([A-Z])/g, '-$1').toLowerCase();
    if (k.startsWith('ms') && k[2] && k[2] === k[2].toUpperCase()) return '-ms-' + k.slice(2).replace(/([A-Z])/g, '-$1').toLowerCase();
    return k.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
  function styleStr(obj) {
    if (!obj) return '';
    const parts = [];
    for (const k in obj) {
      let v = obj[k];
      if (v === null || v === undefined || v === false) continue;
      if (typeof v === 'number' && !UNITLESS.has(k) && v !== 0) v = v + 'px';
      parts.push(cssKey(k) + ':' + v);
    }
    return parts.join(';');
  }
  function styleAttr(obj) {
    const s = styleStr(obj);
    return s ? ` style="${esc(s)}"` : '';
  }
  function cls(...names) {
    return names.filter(Boolean).join(' ');
  }
  CD._esc = esc;
  CD._style = styleStr;

  // ─── MOCK DATA ────────────────────────────────────────────────────────────
  CD.TEAMS = [
    { code: 'CSK',  name: 'Chennai Super Kings',          c1: '#FFCC00', c2: '#0081E9' },
    { code: 'MI',   name: 'Mumbai Indians',               c1: '#004BA0', c2: '#F5C518' },
    { code: 'KKR',  name: 'Kolkata Knight Riders',        c1: '#3A225D', c2: '#F5C518' },
    { code: 'RCB',  name: 'Royal Challengers Bengaluru',  c1: '#EC1C24', c2: '#000000' },
    { code: 'PBKS', name: 'Punjab Kings',                 c1: '#ED1B24', c2: '#DCDDDF' },
    { code: 'GT',   name: 'Gujarat Titans',               c1: '#1B2133', c2: '#B3A06D' },
    { code: 'RR',   name: 'Rajasthan Royals',             c1: '#EA1A85', c2: '#004BA0' },
    { code: 'SRH',  name: 'Sunrisers Hyderabad',          c1: '#F7A721', c2: '#E2231A' },
    { code: 'LSG',  name: 'Lucknow Super Giants',         c1: '#002F6C', c2: '#FF6B1A' },
    { code: 'DC',   name: 'Delhi Capitals',               c1: '#004C93', c2: '#EF1B23' },
  ];

  CD.PLAYERS = [
    { name: 'Virat Kohli',     team: 'RCB',  role: 'BAT',  origin: 'IN', base: 2.0, sold: 21.0,  cap: true,  form: [72,45,88,102,33] },
    { name: 'Jasprit Bumrah',  team: 'MI',   role: 'BOWL', origin: 'IN', base: 2.0, sold: 18.5,  cap: true,  form: [3,4,2,1,3] },
    { name: 'MS Dhoni',        team: 'CSK',  role: 'WK',   origin: 'IN', base: 2.0, sold: 24.0,  cap: true,  form: [18,28,40,12,37] },
    { name: 'Travis Head',     team: 'SRH',  role: 'BAT',  origin: 'OS', base: 2.0, sold: 6.8,   cap: false, form: [89,55,102,33,67] },
    { name: 'Andre Russell',   team: 'KKR',  role: 'AR',   origin: 'OS', base: 2.0, sold: 12.0,  cap: true,  form: [42,28,65,19,38] },
    { name: 'Rashid Khan',     team: 'GT',   role: 'BOWL', origin: 'OS', base: 2.0, sold: 15.0,  cap: false, form: [2,3,1,4,2] },
    { name: 'Shubman Gill',    team: 'GT',   role: 'BAT',  origin: 'IN', base: 2.0, sold: 11.0,  cap: false, form: [56,78,42,99,23] },
    { name: 'Hardik Pandya',   team: 'MI',   role: 'AR',   origin: 'IN', base: 2.0, sold: 16.35, cap: true,  form: [34,45,22,56,41] },
    { name: 'Sanju Samson',    team: 'RR',   role: 'WK',   origin: 'IN', base: 2.0, sold: 14.0,  cap: true,  form: [44,72,38,55,29] },
    { name: 'Pat Cummins',     team: 'SRH',  role: 'BOWL', origin: 'OS', base: 2.0, sold: 20.5,  cap: false, form: [2,1,3,2,4] },
    { name: 'Nicholas Pooran', team: 'LSG',  role: 'WK',   origin: 'OS', base: 2.0, sold: 16.0,  cap: false, form: [67,22,88,45,54] },
    { name: 'Shreyas Iyer',    team: 'PBKS', role: 'BAT',  origin: 'IN', base: 2.0, sold: 26.75, cap: true,  form: [48,62,35,41,77] },
  ];

  CD.MY_SQUAD = [CD.PLAYERS[0], CD.PLAYERS[2], CD.PLAYERS[4], CD.PLAYERS[7], CD.PLAYERS[5], CD.PLAYERS[10]];

  CD.LEADERBOARD = [
    { team: 'Stadium Kings',   owner: 'priya.k',  pts: 1842, players: 17, purse: 3.2, delta: '+124' },
    { team: 'Sixers United',   owner: 'arjun.m',  pts: 1789, players: 18, purse: 1.5, delta: '+98'  },
    { team: 'Boundary Riders', owner: 'neha.r',   pts: 1654, players: 16, purse: 5.8, delta: '+142' },
    { team: 'Yorker Squad',    owner: 'vikram.s', pts: 1501, players: 18, purse: 2.0, delta: '+67'  },
    { team: 'Power Players',   owner: 'sara.j',   pts: 1489, players: 17, purse: 4.4, delta: '+88'  },
    { team: 'Wicket Warriors', owner: 'rohit.p',  pts: 1402, players: 17, purse: 3.0, delta: '+55'  },
  ];

  CD.MATCHES = [
    { id: 1, a: 'CSK', b: 'MI',   aScore: '182/6', bScore: '178/8', status: 'CSK won by 4 runs',    date: 'Apr 12', venue: 'Chepauk',      time: '19:30' },
    { id: 2, a: 'RCB', b: 'KKR',  aScore: '204/3', bScore: '206/4', status: 'KKR won by 6 wickets', date: 'Apr 13', venue: 'Eden Gardens', time: '19:30' },
    { id: 3, a: 'GT',  b: 'SRH',  aScore: '-',     bScore: '-',     status: 'Live · 12.4 ov',       date: 'Apr 14', venue: 'Ahmedabad',    time: '19:30', live: true },
    { id: 4, a: 'RR',  b: 'PBKS', aScore: null,    bScore: null,    status: '7:30 PM',              date: 'Apr 15', venue: 'Jaipur',       time: '19:30', upcoming: true },
    { id: 5, a: 'LSG', b: 'DC',   aScore: null,    bScore: null,    status: '3:30 PM',              date: 'Apr 16', venue: 'Lucknow',      time: '15:30', upcoming: true },
  ];

  CD.LEAGUE_SUBTABS = [
    { id: 'ranks',   label: 'Ranks' },
    { id: 'points',  label: 'Points' },
    { id: 'matches', label: 'Matches' },
  ];

  // ─── Tiny utilities ───────────────────────────────────────────────────────
  CD.initialsOf = function (name) {
    return name.split(' ').map(s => s[0]).join('').slice(0, 2);
  };

  // ─── Primitives ───────────────────────────────────────────────────────────

  CD.LiveDot = function () {
    return `<span class="live-dot"></span>`;
  };

  CD.TeamChip = function ({ code, label } = {}) {
    const lbl = label != null ? label : code;
    return `<span class="${esc(cls('team-chip', code && code.toLowerCase()))}">`
         + `<span class="dot"></span>${esc(lbl)}</span>`;
  };

  CD.Pill = function ({ tone = '', children = '', style } = {}) {
    return `<span class="${esc(cls('pill', tone && 'pill-' + tone))}"${styleAttr(style)}>${children}</span>`;
  };

  CD.Stat = function ({ val, lbl, accent, style } = {}) {
    const accentBar = accent
      ? `<div style="position:absolute;top:0;left:12px;right:12px;height:2px;background:${esc(accent)};border-radius:0 0 2px 2px;"></div>`
      : '';
    return `<div class="stat"${styleAttr(style)}>${accentBar}`
         + `<div class="stat-val">${esc(val)}</div>`
         + `<div class="stat-lbl">${esc(lbl)}</div></div>`;
  };

  // ─── SVG icon paths ───────────────────────────────────────────────────────
  const ROLE_PATHS = {
    BAT:  '<path d="M3 21l6-6m3-3l-3 3m3-3l6-6a2 2 0 10-3-3l-6 6m3 3a6 6 0 01-6 6" />',
    BOWL: '<circle cx="12" cy="12" r="4" /><path d="M12 8v-3M12 16v3M8 12h-3M16 12h3" />',
    AR:   '<path d="M3 21l9-18 9 18-9-6z" />',
    WK:   '<path d="M3 10l9-6 9 6v4a9 9 0 01-18 0z" /><circle cx="12" cy="13" r="2" />',
  };

  CD.RoleIcon = function ({ role, size = 16 } = {}) {
    const inner = ROLE_PATHS[role] || ROLE_PATHS.BAT;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  };

  CD.BallMark = function ({ size = 24, color = 'var(--pink)' } = {}) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">`
         + `<circle cx="12" cy="12" r="10" fill="${esc(color)}" opacity="0.9" />`
         + `<path d="M4 10c3-1 13-1 16 0M4 14c3 1 13 1 16 0" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-dasharray="2 2" opacity="0.7" />`
         + `</svg>`;
  };

  CD.BrandMark = function ({ size = 28 } = {}) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none">`
         + `<defs><linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">`
         + `<stop offset="0%" stop-color="#2E5BFF" />`
         + `<stop offset="100%" stop-color="#FF2D87" />`
         + `</linearGradient></defs>`
         + `<path d="M28 8.5A14 14 0 1 0 28 31.5" stroke="url(#bm-g)" stroke-width="4" stroke-linecap="round" fill="none" />`
         + `<circle cx="30" cy="20" r="3.5" fill="#B6FF3C" />`
         + `</svg>`;
  };

  CD.PlayerAvatar = function ({ code, size = 40, initials = '' } = {}) {
    const team = CD.TEAMS.find(t => t.code === code) || CD.TEAMS[0];
    const style = {
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${team.c1}, ${team.c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--display)', fontWeight: 800,
      fontSize: (size * 0.38) + 'px', color: '#fff',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.2)',
      letterSpacing: '0.04em', flexShrink: 0,
    };
    return `<div${styleAttr(style)}>${esc(initials)}</div>`;
  };

  CD.Sparkline = function ({ data, w = 80, h = 24, color = 'var(--lime)' } = {}) {
    if (!data || !data.length) return '';
    const max = Math.max.apply(null, data);
    const min = Math.min.apply(null, data);
    const range = (max - min) || 1;
    const coords = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d - min) / range) * (h - 4) - 2;
      return [x, y];
    });
    const pts = coords.map(([x, y]) => `${x},${y}`).join(' ');
    const dots = coords.map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="1.5" fill="${esc(color)}" />`
    ).join('');
    return `<svg width="${w}" height="${h}" style="display:block">`
         + `<polyline points="${pts}" fill="none" stroke="${esc(color)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />`
         + dots + `</svg>`;
  };

  // ─── Icon library (raw SVG inner contents) ────────────────────────────────
  const ICON_PATHS = {
    home:  '<rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />',
    gavel: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />',
    coins: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />',
    list:  '<line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />',
    star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />',
    user:  '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />',
    trophy:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />',
    users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" />',
    chart: '<line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />',
    cal:   '<rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />',
    clock: '<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />',
    swap:  '<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />',
    cog:   '<circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41" />',
    plus:  '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />',
    search:'<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />',
    bell:  '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />',
    menu:  '<line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />',
    arrow: '<line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />',
    back:  '<line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />',
    sun:   '<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />',
    moon:  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />',
    check: '<polyline points="20 6 9 17 4 12" />',
    x:     '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
    copy:  '<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />',
    ball:  '<circle cx="12" cy="12" r="9" /><path d="M3 10c3-1 15-1 18 0M3 14c3 1 15 1 18 0" stroke-dasharray="2 2" />',
    chevron: '<polyline points="6 9 12 15 18 9" />',
    spark: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" />',
  };
  CD._ICON_PATHS = ICON_PATHS;

  CD.Icon = function ({ name, size = 16, style } = {}) {
    const inner = ICON_PATHS[name] || ICON_PATHS.home;
    const sty = style ? styleAttr(style) : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${sty}>${inner}</svg>`;
  };

  // ─── Ticker ───────────────────────────────────────────────────────────────
  CD.Ticker = function ({ items } = {}) {
    const base = items || [
      { a: 'CSK', b: 'MI',   score: 'CSK 182/6 · MI 178/8',  status: 'CSK won by 4' },
      { a: 'RCB', b: 'KKR',  score: 'RCB 204/3 · KKR 206/4', status: 'KKR won' },
      { a: 'GT',  b: 'SRH',  score: 'GT 142/4 (12.4)',       status: 'LIVE', live: true },
      { a: 'RR',  b: 'PBKS', score: '19:30 IST',             status: 'TODAY' },
      { a: 'LSG', b: 'DC',   score: '15:30 IST',             status: 'TOMORROW' },
      { a: 'MI',  b: 'GT',   score: '19:30 IST',             status: 'APR 17' },
    ];
    const doubled = base.concat(base);
    const items_html = doubled.map(t =>
      `<div class="ticker-item">`
      + `<span>${esc(t.a)}</span>`
      + `<span class="vs">vs</span>`
      + `<span>${esc(t.b)}</span>`
      + `<span class="sep"></span>`
      + `<span class="score">${esc(t.score)}</span>`
      + (t.live ? `<span style="color:var(--pink)">● LIVE</span>` : '')
      + `<span class="sep"></span>`
      + `</div>`
    ).join('');
    return `<div class="ticker">`
         + `<div class="ticker-label"><span class="live-dot"></span>LIVE</div>`
         + `<div class="ticker-scroll"><div class="ticker-track">${items_html}</div></div>`
         + `</div>`;
  };

  // ─── MobileShell ──────────────────────────────────────────────────────────
  CD.MOBILE_TABS = [
    { id: 'home',    icon: 'home',   label: 'Home' },
    { id: 'auction', icon: 'gavel',  label: 'Auction', live: true },
    { id: 'myteam',  icon: 'user',   label: 'Squad' },
    { id: 'league',  icon: 'trophy', label: 'League' },
  ];

  CD.MobileShell = function ({ children = '', title, hideTab, active = 'home', subTabs, activeSub } = {}) {
    const headerBar = title ? (
      `<div style="padding:14px 20px 10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);flex-shrink:0;">`
      + `<div style="display:flex;align-items:center;gap:8px;">`
        + CD.BrandMark({ size: 22 })
        + `<div class="dsp" style="font-size:15px;letter-spacing:0.08em;">${esc(title)}</div>`
      + `</div>`
      + `<div style="display:flex;gap:8px;">`
        + CD.Icon({ name: 'search', size: 18 })
        + CD.Icon({ name: 'bell',   size: 18 })
      + `</div>`
      + `</div>`
    ) : '';

    const subTabsBar = subTabs ? (
      `<div style="padding:10px 14px 6px;flex-shrink:0;border-bottom:1px solid var(--line);">`
      + `<div style="display:flex;gap:4px;padding:4px;border-radius:var(--r-pill);background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--line);">`
        + subTabs.map(st => {
            const isActive = activeSub === st.id;
            const style = {
              flex: 1, textAlign: 'center', padding: '7px 4px',
              fontSize: 10, fontFamily: 'var(--display)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              borderRadius: 'var(--r-pill)',
              color: isActive ? '#fff' : 'var(--mute)',
              background: isActive ? 'linear-gradient(180deg, var(--electric-2), var(--electric))' : 'transparent',
              boxShadow: isActive ? '0 2px 10px rgba(46,91,255,0.4)' : 'none',
            };
            return `<div onclick="window.CD_onSubTab && window.CD_onSubTab('${esc(st.id)}')"${styleAttr(style)}>${esc(st.label)}</div>`;
          }).join('')
      + `</div></div>`
    ) : '';

    const bottomNav = !hideTab ? (
      `<div style="padding:8px 14px 14px;flex-shrink:0;background:linear-gradient(to top, var(--bg), transparent);">`
      + `<div class="glass-2" style="display:flex;padding:6px;border-radius:var(--r-pill);">`
        + CD.MOBILE_TABS.map(t => {
            const isActive = active === t.id;
            const style = {
              flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
              color: isActive ? '#fff' : 'var(--mute)',
              background: isActive ? 'linear-gradient(180deg, var(--electric-2), var(--electric))' : 'transparent',
              borderRadius: 'var(--r-pill)', position: 'relative',
              boxShadow: isActive ? '0 4px 14px rgba(46,91,255,0.45)' : 'none',
            };
            const dot = t.live ? `<div style="position:absolute;top:6px;right:30%;width:6px;height:6px;border-radius:50%;background:var(--pink);"></div>` : '';
            return `<div onclick="window.CD_onTab && window.CD_onTab('${esc(t.id)}')"${styleAttr(style)}>`
                 + CD.Icon({ name: t.icon, size: 16 })
                 + `<div style="font-size:9px;font-weight:600;">${esc(t.label)}</div>`
                 + dot
                 + `</div>`;
          }).join('')
      + `</div></div>`
    ) : '';

    return `<div style="position:relative;width:100%;height:100%;background:var(--bg);color:var(--ink);overflow:hidden;display:flex;flex-direction:column;">`
         + `<div class="bcst-bg"></div>`
         + `<div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;min-height:0;">`
           + headerBar
           + subTabsBar
           + `<div style="flex:1;overflow:auto;padding:14px 16px 14px;min-height:0;">${children}</div>`
           + bottomNav
         + `</div></div>`;
  };

  // Convenience wrapper for a stand-alone bottom nav (the "BottomNav" shell).
  CD.BottomNav = function ({ active = 'home' } = {}) {
    return `<div style="padding:8px 14px 14px;flex-shrink:0;background:linear-gradient(to top, var(--bg), transparent);">`
         + `<div class="glass-2" style="display:flex;padding:6px;border-radius:var(--r-pill);">`
         + CD.MOBILE_TABS.map(t => {
             const isActive = active === t.id;
             const style = {
               flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column',
               alignItems: 'center', gap: 2,
               color: isActive ? '#fff' : 'var(--mute)',
               background: isActive ? 'linear-gradient(180deg, var(--electric-2), var(--electric))' : 'transparent',
               borderRadius: 'var(--r-pill)', position: 'relative',
               boxShadow: isActive ? '0 4px 14px rgba(46,91,255,0.45)' : 'none',
             };
             const dot = t.live ? `<div style="position:absolute;top:6px;right:30%;width:6px;height:6px;border-radius:50%;background:var(--pink);"></div>` : '';
             return `<div onclick="window.CD_onTab && window.CD_onTab('${esc(t.id)}')"${styleAttr(style)}>`
                  + CD.Icon({ name: t.icon, size: 16 })
                  + `<div style="font-size:9px;font-weight:600;">${esc(t.label)}</div>`
                  + dot
                  + `</div>`;
           }).join('')
         + `</div></div>`;
  };

  // ─── DesktopShell ─────────────────────────────────────────────────────────
  CD.DESKTOP_NAV = [
    { id: 'home',    icon: 'home',   label: 'Rooms',   sub: 'Leagues & setup' },
    { id: 'auction', icon: 'gavel',  label: 'Auction', sub: 'Live · Ledger · Purses' },
    { id: 'myteam',  icon: 'user',   label: 'Squad',   sub: 'XI · Bench · Trades' },
    { id: 'leader',  icon: 'trophy', label: 'League',  sub: 'Ranks · Points · History' },
    { id: 'players', icon: 'users',  label: 'Players', sub: 'Pool · Stats · Form' },
    { id: 'matches', icon: 'cal',    label: 'Matches', sub: 'Schedule · Scorecards' },
  ];
  CD.DESKTOP_SUBNAV = {
    auction: ['Live block', 'Bid ledger', 'Team purses'],
    myteam:  ['Playing XI', 'Bench', 'Trades'],
    leader:  ['Leaderboard', 'Gameweek points', 'History'],
    players: ['Pool', 'Analytics', 'Shortlists'],
    matches: ['Live & results', 'Schedule'],
    home:    ['All rooms', 'Invites'],
  };

  CD.DesktopSidebar = function ({ active = 'home' } = {}) {
    const parent = active === 'purses' || active === 'ledger' ? 'auction'
                 : active === 'points' ? 'leader'
                 : active;
    const items = CD.DESKTOP_NAV.map(n => {
      const liveDot = n.id === 'auction' ? CD.LiveDot() : '';
      return `<div class="${esc(cls('side-item', parent === n.id && 'active'))}" style="align-items:flex-start;padding:10px 12px;" onclick="window.CD_onNav && window.CD_onNav('${esc(n.id)}')">`
           + CD.Icon({ name: n.icon, size: 16, style: { marginTop: 2 } })
           + `<div style="flex:1;min-width:0;">`
             + `<div style="display:flex;align-items:center;gap:6px;">`
               + `<span style="font-weight:600;">${esc(n.label)}</span>${liveDot}`
             + `</div>`
             + `<div style="font-size:10px;color:var(--mute);margin-top:1px;font-weight:400;">${esc(n.sub)}</div>`
           + `</div>`
           + `</div>`;
    }).join('');
    return `<aside style="padding:24px 16px;border-right:1px solid var(--line);background:rgba(0,0,0,0.15);backdrop-filter:blur(12px);">`
         + `<div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;padding:0 6px;">`
           + CD.BrandMark({ size: 32 })
           + `<div>`
             + `<div class="ed" style="font-size:20px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>`
             + `<div class="cap" style="font-size:9px;margin-top:2px;">Fantasy · '26</div>`
           + `</div>`
         + `</div>`
         + `<div class="cap" style="padding:0 10px 10px;">Navigate</div>`
         + `<div style="display:flex;flex-direction:column;gap:4px;">${items}</div>`
         + `<div style="margin-top:24px;" class="glass">`
           + `<div style="padding:14px;">`
             + `<div class="cap" style="margin-bottom:8px;">My Purse</div>`
             + `<div class="dsp" style="font-size:26px;color:var(--lime);">₹14.5<span style="font-size:14px;color:var(--mute);">cr</span></div>`
             + `<div style="font-size:11px;color:var(--mute);margin-top:4px;">17 / 20 players</div>`
           + `</div>`
         + `</div>`
         + `</aside>`;
  };

  CD.DesktopShell = function ({ children = '', title, subtitle, active = 'home', rightSlot = '', hideTicker = false } = {}) {
    const subnav = CD.DESKTOP_SUBNAV[active] || [];
    const subnavHtml = subnav.length ? (
      `<div style="display:flex;gap:4px;padding:14px 32px 0;border-bottom:1px solid var(--line);">`
      + subnav.map((s, i) => {
          const isActive = i === 0
            || (active === 'ledger' && s === 'Bid ledger')
            || (active === 'purses' && s === 'Team purses')
            || (active === 'points' && s === 'Gameweek points');
          const style = {
            padding: '10px 16px', fontSize: 12, fontWeight: 600,
            color: isActive ? 'var(--ink)' : 'var(--mute)',
            borderBottom: isActive ? '2px solid var(--electric)' : '2px solid transparent',
            cursor: 'pointer', letterSpacing: '0.02em', marginBottom: -1,
          };
          return `<div${styleAttr(style)}>${esc(s)}</div>`;
        }).join('')
      + `</div>`
    ) : '';

    const subtitleHtml = subtitle
      ? `<div class="ed-i" style="font-size:28px;color:var(--mute);">${esc(subtitle)}</div>`
      : '';

    return `<div style="position:relative;width:100%;min-height:900px;overflow:hidden;background:var(--bg);color:var(--ink);">`
         + `<div class="bcst-bg"></div>`
         + `<div style="position:relative;z-index:1;display:grid;grid-template-columns:240px 1fr;min-height:900px;">`
           + CD.DesktopSidebar({ active })
           + `<main style="display:flex;flex-direction:column;min-width:0;">`
             + (hideTicker ? '' : CD.Ticker({}))
             + `<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 32px 0;border-bottom:1px solid var(--line);">`
               + `<div><div style="display:flex;align-items:center;gap:10px;">`
                 + `<h1 class="ed" style="font-size:36px;">${esc(title)}</h1>`
                 + subtitleHtml
               + `</div></div>`
               + `<div style="display:flex;align-items:center;gap:10px;">`
                 + rightSlot
                 + `<div class="glass" style="padding:6px 12px;display:flex;align-items:center;gap:8px;border-radius:var(--r-pill);">`
                   + CD.PlayerAvatar({ code: 'MI', size: 28, initials: 'RS' })
                   + `<div style="font-size:12px;">`
                     + `<div style="font-weight:600;">Rohan S.</div>`
                     + `<div style="color:var(--mute);font-size:10px;">Stadium Kings</div>`
                   + `</div>`
                 + `</div>`
                 + `<button class="btn btn-ghost" style="padding:10px;">${CD.Icon({ name: 'bell', size: 16 })}</button>`
               + `</div>`
             + `</div>`
             + subnavHtml
             + `<div style="padding:28px 32px 60px;flex:1;">${children}</div>`
           + `</main>`
         + `</div></div>`;
  };

  // ─── Back-compat globals (mirror the original window.* exports) ───────────
  // Original primitives.jsx attached these directly to window. Keep that for
  // any legacy callers, but they all live on window.CD too.
  Object.assign(window, {
    TEAMS: CD.TEAMS, PLAYERS: CD.PLAYERS, MY_SQUAD: CD.MY_SQUAD,
    LEADERBOARD: CD.LEADERBOARD, MATCHES: CD.MATCHES,
    Ticker: CD.Ticker, TeamChip: CD.TeamChip, Pill: CD.Pill, LiveDot: CD.LiveDot,
    Stat: CD.Stat, RoleIcon: CD.RoleIcon, BallMark: CD.BallMark, BrandMark: CD.BrandMark,
    PlayerAvatar: CD.PlayerAvatar, initialsOf: CD.initialsOf,
    Sparkline: CD.Sparkline, Icon: CD.Icon,
    MobileShell: CD.MobileShell, BottomNav: CD.BottomNav,
    DesktopShell: CD.DesktopShell, DesktopSidebar: CD.DesktopSidebar,
  });
})();
