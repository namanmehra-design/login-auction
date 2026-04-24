/* ════════════════════════════════════════════════════════════════════
   CRICKET DESIGN — UNIFIED APP LAYER (Auction)
   Single source of truth for the new UI. Reads live data from window.roomState
   (set by app.js) and re-renders the active screen. Wires every button to
   existing window.* handlers in app.js — no duplicated logic.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  const CD = window.CD = window.CD || {};
  const $ = (s, p) => (p || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  // attrEscape — safe for HTML attribute value when wrapped in double quotes.
  // Does NOT escape apostrophes, so strings like `Vinay and Anshul's 11` survive
  // a round-trip through `data-team="..."` -> element.dataset.team.
  const attrEscape = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ════════════════════════════════════════════════════════════════════
  // CANONICAL POINTS HELPERS — single source of truth for team totals.
  // Mirrors `computeMatchContribution` in app.js: snapshot-aware, XI×xiMult,
  // Bench×1, Reserves/not-in-snap ×0. Sum UNROUNDED, round once at the end.
  // ════════════════════════════════════════════════════════════════════
  const _cdCleanName = (n) => (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
  CD._teamContribBreakdown = (teamName) => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const rosterOwnerMap = {};
    Object.values(teams).forEach(tt => {
      const rostr = Array.isArray(tt.roster) ? tt.roster : (tt.roster ? Object.values(tt.roster) : []);
      rostr.forEach(p => {
        const fn = (p.name||p.n||'').toLowerCase().trim();
        rosterOwnerMap[fn] = tt.name;
        rosterOwnerMap[_cdCleanName(p.name||p.n||'')] = tt.name;
      });
    });
    let xi = 0, bench = 0;
    const playerPts = {};
    Object.values(matches).forEach(m => {
      if(!m || !m.players) return;
      const hasStoredSnaps = !!m.squadSnapshots;
      const snap = m.squadSnapshots ? m.squadSnapshots[teamName] : null;
      let xiSet = null, benchSet = null;
      if(snap){
        xiSet = new Set();
        benchSet = new Set();
        (snap.xi||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); xiSet.add(fn); xiSet.add(_cdCleanName(n)); });
        (snap.bench||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); benchSet.add(fn); benchSet.add(_cdCleanName(n)); });
      }
      Object.values(m.players).forEach(p => {
        const key = (p.name||'').toLowerCase().trim();
        const ckey = _cdCleanName(p.name||'');
        const owner = rosterOwnerMap[key] || rosterOwnerMap[ckey] || p.ownedBy || '';
        if(owner !== teamName) return;
        const raw = p.pts || 0;
        let contrib = 0, bucket = null;
        if(xiSet && (xiSet.has(key) || xiSet.has(ckey))){ contrib = raw * xiMult; bucket = 'xi'; }
        else if(benchSet && (benchSet.has(key) || benchSet.has(ckey))){ contrib = raw * 1; bucket = 'bench'; }
        else if(!hasStoredSnaps && owner){ contrib = raw * 1; bucket = 'bench'; }
        if(bucket === 'xi') xi += contrib;
        else if(bucket === 'bench') bench += contrib;
        if(bucket){ playerPts[ckey] = (playerPts[ckey] || 0) + contrib; }
      });
    });
    return { xi, bench, reserves: 0, total: xi + bench, playerPts };
  };
  CD._teamSeasonTotal = (teamName) => Math.round(CD._teamContribBreakdown(teamName).total);

  CD._teamMatchContribution = (teamName, matchId) => {
    const rs = window.roomState || {};
    const m = (rs.matches || {})[matchId];
    if(!m || !m.players) return 0;
    const teams = rs.teams || {};
    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const rosterOwnerMap = {};
    Object.values(teams).forEach(tt => {
      const rostr = Array.isArray(tt.roster) ? tt.roster : (tt.roster ? Object.values(tt.roster) : []);
      rostr.forEach(p => {
        const fn = (p.name||p.n||'').toLowerCase().trim();
        rosterOwnerMap[fn] = tt.name;
        rosterOwnerMap[_cdCleanName(p.name||p.n||'')] = tt.name;
      });
    });
    const hasStoredSnaps = !!m.squadSnapshots;
    const snap = m.squadSnapshots ? m.squadSnapshots[teamName] : null;
    let xiSet = null, benchSet = null;
    if(snap){
      xiSet = new Set();
      benchSet = new Set();
      (snap.xi||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); xiSet.add(fn); xiSet.add(_cdCleanName(n)); });
      (snap.bench||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); benchSet.add(fn); benchSet.add(_cdCleanName(n)); });
    }
    let sum = 0;
    Object.values(m.players).forEach(p => {
      const key = (p.name||'').toLowerCase().trim();
      const ckey = _cdCleanName(p.name||'');
      const owner = rosterOwnerMap[key] || rosterOwnerMap[ckey] || p.ownedBy || '';
      if(owner !== teamName) return;
      const raw = p.pts || 0;
      if(xiSet && (xiSet.has(key) || xiSet.has(ckey))) sum += raw * xiMult;
      else if(benchSet && (benchSet.has(key) || benchSet.has(ckey))) sum += raw;
      else if(!hasStoredSnaps && owner) sum += raw;
    });
    return Math.round(sum);
  };

  // ── TEAM COLORS ─────────────────────────────────────────────────
  const TEAM_COLORS = {
    CSK: ['#FFCC00','#0081E9'], MI: ['#004BA0','#F5C518'],
    KKR: ['#3A225D','#F5C518'], RCB: ['#EC1C24','#000000'],
    PBKS: ['#ED1B24','#DCDDDF'], GT: ['#1B2133','#B3A06D'],
    RR: ['#EA1A85','#004BA0'], SRH: ['#F7A721','#E2231A'],
    LSG: ['#002F6C','#FF6B1A'], DC: ['#004C93','#EF1B23']
  };
  const teamCode = (name) => {
    if(!name) return '';
    const s = String(name).toUpperCase();
    if(s.includes('CSK')||s.includes('CHENNAI')) return 'CSK';
    if(s.includes('MI')||s.includes('MUMBAI')) return 'MI';
    if(s.includes('KKR')||s.includes('KOLKATA')) return 'KKR';
    if(s.includes('RCB')||s.includes('BENGAL')||s.includes('BANGAL')) return 'RCB';
    if(s.includes('PBKS')||s.includes('PUNJAB')) return 'PBKS';
    if(s.includes('GT')||s.includes('GUJARAT')) return 'GT';
    if(s.includes('RR')||s.includes('RAJASTHAN')) return 'RR';
    if(s.includes('SRH')||s.includes('HYDER')) return 'SRH';
    if(s.includes('LSG')||s.includes('LUCKNOW')) return 'LSG';
    if(s.includes('DC')||s.includes('DELHI')) return 'DC';
    return '';
  };
  const initialsOf = (name) => {
    if(!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  };

  // Render a muted em-dash pill for missing team codes — consumer helper so
  // roster cards / pitch tiles / points-by-match rows degrade gracefully when
  // p.iplTeam / p.t / p.team is empty, unknown, or not in TEAM_COLORS.
  CD.TeamCodePill = (rawCode, styleExtra = '') => {
    const code = teamCode(rawCode) || '';
    if(code){
      return CD.Pill({ style: 'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;' + styleExtra, children: esc(code) });
    }
    // Missing: muted grey-on-dark em-dash
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:1px 6px;border-radius:9999px;font-size:8.5px;font-weight:600;white-space:nowrap;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);letter-spacing:0.06em;${styleExtra}">&mdash;</span>`;
  };

  // ── PRIMITIVES ──────────────────────────────────────────────────
  // Player avatar: IPL team logo background → Cricbuzz photo fades in
  // When team is missing/unknown, render a neutral grey circle with initials
  // (no team-color background) — never silently fall back to MI.
  CD.Avatar = ({ team, name, size = 40 } = {}) => {
    const codeRaw = teamCode(team) || teamCode(name);
    const code = codeRaw || '';
    const [c1, c2] = code ? (TEAM_COLORS[code] || ['#444','#222']) : ['#2a2d3a','#1a1c26'];
    const init = initialsOf(name);
    const uid = 'cdav_' + Math.random().toString(36).slice(2, 9);
    // Async-load Cricbuzz photo if helpers available
    if(name && typeof window.cbzPlayerImgId === 'function' && typeof window.cbzGetImg === 'function'){
      setTimeout(async () => {
        try {
          const imgId = window.cbzPlayerImgId(name);
          if(!imgId || imgId === 174146) return;
          const url = await window.cbzGetImg(imgId);
          if(!url) return;
          const el = document.getElementById(uid);
          if(el) el.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;animation:cd-fadein 0.3s ease;">`;
        } catch(e){ console.warn('CD.Avatar cbz photo:', e); }
      }, 0);
    }
    return `<div id="${uid}" style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:var(--display);font-weight:800;font-size:${Math.round(size*0.36)}px;letter-spacing:0.05em;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.2),0 2px 8px rgba(0,0,0,0.3);flex-shrink:0;overflow:hidden;position:relative;">${esc(init)}</div>`;
  };
  // Team logo chip (IPL logo in a small circle)
  CD.TeamLogo = ({ code, size = 28 } = {}) => {
    const c = teamCode(code) || (code || '').toUpperCase();
    const [c1, c2] = TEAM_COLORS[c] || ['#444','#222'];
    const uid = 'cdlogo_' + Math.random().toString(36).slice(2, 9);
    const meta = (window.IPL_TEAM_META || {})[c];
    if(meta && meta.logoImgId && typeof window.cbzGetImg === 'function'){
      setTimeout(async () => {
        try {
          const url = await window.cbzGetImg(meta.logoImgId);
          if(!url) return;
          const el = document.getElementById(uid);
          if(el) el.innerHTML = `<img src="${url}" alt="${c}" style="width:100%;height:100%;object-fit:contain;padding:15%;animation:cd-fadein 0.3s ease;">`;
        } catch(e){ console.warn('CD.TeamLogo cbz img:', e); }
      }, 0);
    }
    return `<div id="${uid}" style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:var(--display);font-weight:800;font-size:${Math.round(size*0.34)}px;letter-spacing:0.03em;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.2),0 2px 8px rgba(0,0,0,0.3);flex-shrink:0;overflow:hidden;position:relative;">${esc(c || '')}</div>`;
  };
  CD.TeamChip = ({ code, label } = {}) => {
    const c = teamCode(code || label) || (code || '').toUpperCase();
    const [c1, c2] = TEAM_COLORS[c] || ['#888','#555'];
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 5px;border-radius:9999px;font-family:var(--display);font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;background:linear-gradient(135deg,${c1}40,${c2}20);border:1px solid ${c1}60;color:var(--ink);"><span style="width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});box-shadow:inset 0 0 0 1px rgba(255,255,255,0.25);"></span>${esc(label || c)}</span>`;
  };
  CD.Pill = ({ tone = '', children = '', style = '' } = {}) => {
    const tones = {
      electric: 'background:rgba(46,91,255,0.18);border:1px solid rgba(46,91,255,0.4);color:#8EA9FF;',
      pink: 'background:rgba(255,45,135,0.18);border:1px solid rgba(255,45,135,0.4);color:#FF8FBA;',
      lime: 'background:rgba(182,255,60,0.16);border:1px solid rgba(182,255,60,0.4);color:#D1FF6E;',
      gold: 'background:rgba(255,200,61,0.16);border:1px solid rgba(255,200,61,0.4);color:#FFD97D;',
      red: 'background:rgba(255,59,59,0.16);border:1px solid rgba(255,59,59,0.4);color:#FF8080;'
    };
    const t = tones[tone] || 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--ink-2);';
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap;${t}${style}">${children}</span>`;
  };
  CD.LiveDot = () => `<span style="width:7px;height:7px;border-radius:50%;background:var(--pink);display:inline-block;animation:cd-pulse 1.6s infinite;"></span>`;
  CD.Stat = ({ val, lbl, accent } = {}) => `
    <div style="padding:14px 16px;border-radius:14px;background:var(--glass);border:1px solid var(--line);position:relative;overflow:hidden;">
      ${accent ? `<div style="position:absolute;top:0;left:12px;right:12px;height:2px;background:${accent};"></div>` : ''}
      <div style="font-family:var(--display);font-size:28px;font-weight:800;color:var(--ink);letter-spacing:-0.01em;line-height:1;">${val}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-top:6px;">${esc(lbl)}</div>
    </div>`;

  // ── ICON HELPERS ────────────────────────────────────────────────
  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    gavel: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17a4 4 0 0 0 4 0v-2.34M18 2H6v8a6 6 0 0 0 12 0V2z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    swap: '<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'
  };
  CD.Icon = (name, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  const I = CD.Icon;

  // ── BRAND MARK ──────────────────────────────────────────────────
  CD.Brand = (size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="url(#bg1)" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="url(#bg2)"/><defs><linearGradient id="bg1" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stop-color="#2E5BFF"/><stop offset="50%" stop-color="#FF2D87"/><stop offset="100%" stop-color="#B6FF3C"/></linearGradient><linearGradient id="bg2" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stop-color="#FF2D87"/><stop offset="100%" stop-color="#2E5BFF"/></linearGradient></defs></svg>`;

  // ── NAV CONFIG ─────────────────────────────────────────────────
  const NAV = [
    { id:'setup',    icon:'cog',    label:'Setup',   sub:'Room config' },
    { id:'auction',  icon:'gavel',  label:'Auction', sub:'Live · Ledger · Purses', live:true },
    { id:'squad',    icon:'user',   label:'Squad',   sub:'My Team · Trades' },
    { id:'league',   icon:'trophy', label:'League',  sub:'Ranks · Points' },
    { id:'players',  icon:'users',  label:'Players', sub:'Pool · Analytics' },
    { id:'matches',  icon:'cal',    label:'Matches', sub:'Data · Schedule' }
  ];
  const SUBTABS = {
    auction: [{id:'live', label:'Live block'}, {id:'purses', label:'Team purses'}, {id:'ledger', label:'Bid ledger'}],
    squad:   [{id:'myteam', label:'My team'}, {id:'ptsbymatch', label:'Points by match'}, {id:'trades', label:'Trades'}],
    league:  [{id:'leaderboard', label:'Leaderboard'}, {id:'points', label:'Points'}, {id:'weeks', label:'Teams of Week'}],
    players: [{id:'pool', label:'Pool'}, {id:'analytics', label:'Analytics'}],
    matches: [{id:'data', label:'Match data'}, {id:'schedule', label:'Schedule'}]
  };

  // ── STATE ───────────────────────────────────────────────────────
  CD.state = {
    view: 'auth',           // auth | dashboard | room | admin
    authPending: true,      // true until first onAuthStateChanged fires — show splash, not auth screen
    activeNav: 'auction',   // current top-nav
    activeSub: 'live',      // current sub-tab
    isMobile: window.innerWidth < 900,
    showCreate: false,
    cbzMatches: [],         // live ticker data
    editingSquad: false,    // My Team — edit mode on/off
    squadDraft: null,       // { xi: [names], bench: [names], reserves: [names] }
    squadSaving: false,     // Save-in-flight flag
    adminSub: 'scorecards', // Super Admin sub-tab
    rosterStale: false,     // Soft warning: a roster changed while super admin is mid-entry
    rosterStaleTeams: []    // Which teams changed (for the banner copy)
  };

  // Roster-change listener: release/replace flows dispatch _cdRosterChanged
  // with detail.team. If the super admin has the match-entry form visible,
  // show a soft warning banner + Resync control.
  if(!window._cdRosterChangeWired){
    window._cdRosterChangeWired = true;
    window.addEventListener('_cdRosterChanged', (ev) => {
      try {
        const form = document.getElementById('gscFormBody');
        if(!form || form.style.display === 'none') return;
        const team = ev?.detail?.team || '';
        CD.state.rosterStale = true;
        if(team && CD.state.rosterStaleTeams.indexOf(team) < 0) CD.state.rosterStaleTeams.push(team);
        CD._paintRosterStaleBanner();
      } catch(e){ console.warn('roster-change listener:', e); }
    });
  }

  // Inject / refresh the banner above gscFormBody.
  CD._paintRosterStaleBanner = () => {
    const form = document.getElementById('gscFormBody');
    if(!form) return;
    let banner = document.getElementById('cd-roster-stale-banner');
    if(!CD.state.rosterStale){
      if(banner) banner.remove();
      return;
    }
    const teams = CD.state.rosterStaleTeams.slice(-3);
    const teamList = teams.length ? ' (' + teams.map(t => String(t).replace(/</g,'&lt;')).join(', ') + ')' : '';
    const html = `<div id="cd-roster-stale-banner" style="margin-bottom:12px;padding:10px 14px;border-radius:10px;background:rgba(255,200,61,0.1);border:1px solid rgba(255,200,61,0.5);display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:160px;font-size:12px;color:#FFD97D;font-weight:600;">Roster changed${teamList} — snapshot may be stale. Click Resync to reload current squads.</div>
      <button onclick="CD.resyncRosterSnapshot()" style="padding:6px 14px;border-radius:9999px;background:linear-gradient(180deg,rgba(255,200,61,0.3),rgba(255,200,61,0.1));border:1px solid rgba(255,200,61,0.6);color:#FFE49A;font-weight:700;font-size:11px;cursor:pointer;letter-spacing:0.06em;">Resync</button>
    </div>`;
    if(banner) banner.outerHTML = html;
    else form.insertAdjacentHTML('afterbegin', html);
  };

  CD.resyncRosterSnapshot = () => {
    try {
      const rs = window.roomState || window.draftState || {};
      if(typeof window._cdRosterResyncHook === 'function') window._cdRosterResyncHook(rs);
      CD.state.rosterStale = false;
      CD.state.rosterStaleTeams = [];
      const b = document.getElementById('cd-roster-stale-banner');
      if(b) b.remove();
      window.showAlert?.('Roster snapshot resynced from live data.','ok');
    } catch(e){ console.warn('resyncRosterSnapshot:', e); }
  };

  window.addEventListener('resize', () => {
    const wasMobile = CD.state.isMobile;
    CD.state.isMobile = window.innerWidth < 900;
    if(wasMobile !== CD.state.isMobile) CD.scheduleRender();
  });

  // ── PAGE-LEVEL: TICKER ─────────────────────────────────────────
  CD.renderTicker = () => {
    const items = CD.state.cbzMatches.length ? CD.state.cbzMatches : [
      { teamA: 'IPL', teamB: '2026', score: 'Loading scores…', sep: false }
    ];
    const itemHtml = items.map(m => `
      <span style="display:inline-flex;align-items:center;gap:10px;font-family:var(--display);font-size:12px;font-weight:700;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.04em;">
        <span>${esc(m.teamA || '')}</span>
        ${m.score ? `<span style="color:var(--lime);font-family:var(--mono);font-weight:500;text-transform:none;letter-spacing:0;">${esc(m.score)}</span>` : ''}
        <span style="color:var(--mute);font-weight:500;">${esc(m.vs || (m.teamB ? 'vs' : ''))}</span>
        <span>${esc(m.teamB || '')}</span>
        ${m.status ? `<span style="color:var(--mute);font-size:10px;">· ${esc(m.status)}</span>` : ''}
      </span>
    `).join('<span style="width:6px;height:6px;border-radius:50%;background:var(--mute-2);margin:0 24px;"></span>');
    return `
      <div style="display:flex;align-items:center;height:36px;background:#07070C;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;position:relative;">
        <div style="flex-shrink:0;padding:0 22px 0 14px;height:100%;display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,var(--pink),var(--pink-2));color:#fff;font-family:var(--display);font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%);z-index:2;">${CD.LiveDot()} LIVE</div>
        <div class="cd-ticker-viewport" style="flex:1;overflow:hidden;position:relative;height:100%;">
          <div class="cd-ticker-track" style="display:flex;align-items:center;gap:48px;height:100%;animation:cd-ticker 50s linear infinite;white-space:nowrap;padding-left:24px;">
            ${itemHtml}${itemHtml}
          </div>
        </div>
      </div>`;
  };

  // Fetch live IPL scores for the ticker. Uses the flat-array helper which
  // returns only IPL-series matches; falls back to empty (keeps the
  // Loading… placeholder) if the API errors or no IPL match is live.
  CD.fetchTicker = async () => {
    try {
      const fetcher = window.cbzFetchIPLLive || window.cbzDFetchIPLLive;
      if(typeof fetcher !== 'function') { CD.state.cbzMatches = []; return; }
      const matches = await fetcher();
      if(!Array.isArray(matches) || !matches.length){
        CD.state.cbzMatches = [];
        CD.scheduleRender();
        return;
      }
      CD.state.cbzMatches = matches.slice(0, 8).map(m => {
        const mi = m.matchInfo || {};
        const ms = m.matchScore || {};
        const ta = mi.team1?.teamSName || mi.team1?.teamName || mi.team1?.teamsname || '';
        const tb = mi.team2?.teamSName || mi.team2?.teamName || mi.team2?.teamsname || '';
        // Prefer team2 inngs1 if the match is in the chase; otherwise team1's score
        const t1 = ms.team1Score?.inngs1 ? `${ms.team1Score.inngs1.runs}/${ms.team1Score.inngs1.wickets}` : '';
        const t2 = ms.team2Score?.inngs1 ? `${ms.team2Score.inngs1.runs}/${ms.team2Score.inngs1.wickets}` : '';
        const score = t1 && t2 ? `${t1} · ${t2}` : (t2 || t1 || '');
        return { teamA: ta, teamB: tb, vs: 'vs', score, status: mi.status || mi.state || '' };
      });
      CD.scheduleRender();
    } catch(e){
      console.error('CD ticker:', e);
      CD.state.cbzMatches = [];
    }
  };

  // ── AUTH SCREEN ─────────────────────────────────────────────────
  CD.renderAuth = () => {
    const isSignup = window._cdSignup || false;
    return `
      <div style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;overflow:hidden;">
        <div style="position:absolute;inset:-10%;background:radial-gradient(ellipse 60% 40% at 25% 30%,rgba(46,91,255,0.35),transparent 60%),radial-gradient(ellipse 50% 50% at 75% 70%,rgba(255,45,135,0.25),transparent 55%),radial-gradient(ellipse 70% 40% at 50% 95%,rgba(182,255,60,0.15),transparent 55%);filter:blur(40px);z-index:0;pointer-events:none;"></div>
        <div style="position:relative;z-index:2;width:100%;max-width:1100px;display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1.1fr 1fr'};gap:60px;align-items:center;">
          <div style="${CD.state.isMobile ? 'text-align:center;' : ''}">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;${CD.state.isMobile ? 'justify-content:center;' : ''}">
              ${CD.Brand(36)}
              <div>
                <div class="ed" style="font-size:24px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>
                <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-top:2px;">Fantasy · '26</div>
              </div>
            </div>
            <div class="ed" style="font-size:${CD.state.isMobile ? 56 : 88}px;line-height:0.95;letter-spacing:-0.03em;">
              Bid bold.
              <div class="ed-i" style="color:var(--pink);font-style:italic;font-weight:500;">Win bolder.</div>
            </div>
            <p style="margin-top:24px;font-size:16px;color:var(--ink-2);max-width:480px;line-height:1.6;${CD.state.isMobile ? 'margin-left:auto;margin-right:auto;' : ''}">
              Private fantasy auctions for your crew. Bid live, build squads, track points across the season — all with broadcast-grade scoring.
            </p>
            <div style="display:flex;gap:32px;margin-top:32px;${CD.state.isMobile ? 'justify-content:center;' : ''}">
              <div><div class="ed" style="font-size:42px;color:var(--lime);">220</div><div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Players</div></div>
              <div><div class="ed" style="font-size:42px;color:var(--electric);">74</div><div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Matches</div></div>
              <div><div class="ed" style="font-size:42px;color:var(--pink);">10</div><div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Teams</div></div>
            </div>
          </div>
          <div class="cd-glass-2" style="padding:36px 32px;border-radius:22px;background:var(--glass-2);backdrop-filter:blur(40px) saturate(1.6);-webkit-backdrop-filter:blur(40px) saturate(1.6);border:1px solid var(--line-2);box-shadow:var(--sh-2);">
            <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">${isSignup ? 'Create Account' : 'Sign In'}</div>
            <div class="ed" style="font-size:36px;margin-bottom:24px;">Welcome <span class="ed-i" style="color:var(--pink);">${isSignup ? 'aboard' : 'back'}</span></div>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Email</div>
                <input id="authEmail" type="email" placeholder="you@example.com" style="width:100%;padding:12px 16px;font-size:14px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" />
              </div>
              <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Password</div>
                <input id="authPassword" type="password" placeholder="••••••••" minlength="6" onkeydown="if(event.key==='Enter')window.handleAuth()" style="width:100%;padding:12px 16px;font-size:14px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" />
              </div>
              <button onclick="window.handleAuth()" style="width:100%;padding:14px 24px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 24px rgba(46,91,255,0.4),inset 0 1px 0 rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;gap:8px;">${isSignup ? 'Create account' : 'Sign in'} ${I('arrow', 16)}</button>
              <div style="text-align:center;font-size:11px;color:var(--mute);font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin:4px 0;">or</div>
              <button onclick="window.signInWithGoogle()" style="width:100%;padding:12px 24px;border-radius:9999px;background:var(--glass-2);color:var(--ink);border:1px solid var(--line-2);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"/></svg>
                Continue with Google
              </button>
              ${!isSignup ? `<button onclick="window.resetPassword()" style="background:transparent;border:none;color:var(--mute);font-size:12px;cursor:pointer;padding:4px;">Forgot password?</button>` : ''}
              <div style="text-align:center;color:var(--mute);font-size:12px;margin-top:8px;">
                ${isSignup ? 'Already have an account?' : 'New here?'}
                <a href="#" onclick="window._cdSignup=${!isSignup};window.toggleAuthMode();CD.render();return false;" style="color:var(--electric);text-decoration:none;font-weight:600;">${isSignup ? 'Sign in' : 'Create an account'}</a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  };

  // ── DASHBOARD ───────────────────────────────────────────────────
  CD.renderDashboard = () => {
    const u = window.user || {};
    const isSuperAdmin = u.email && (typeof window.isSuperAdminEmail === 'function' ? window.isSuperAdminEmail(u.email) : u.email.toLowerCase().trim() === 'namanmehra@gmail.com');
    return `
      <div style="position:relative;min-height:100vh;display:flex;flex-direction:column;">
        ${CD.renderTicker()}
        <header style="display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--line);">
          <div style="display:flex;align-items:center;gap:14px;">
            ${CD.Brand(32)}
            <div>
              <div class="ed" style="font-size:22px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Fantasy · '26</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            ${u.email ? `<div class="cd-glass" style="padding:6px 14px;border-radius:9999px;display:flex;align-items:center;gap:8px;background:var(--glass);border:1px solid var(--line);">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--electric),var(--pink));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">${esc((u.email[0] || '?').toUpperCase())}</div>
              <div style="font-size:12px;font-weight:600;">${esc(u.email.split('@')[0])}</div>
            </div>` : ''}
            ${isSuperAdmin ? `<button onclick="CD.openAdmin()" style="padding:8px 14px;border-radius:9999px;background:linear-gradient(180deg,rgba(255,200,61,0.2),rgba(255,200,61,0.1));color:#FFD97D;border:1px solid rgba(255,200,61,0.5);font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:0.04em;text-transform:uppercase;">★ Admin Console</button>` : ''}
            <button onclick="if(confirm('Log out?'))window.logoutUser()" style="padding:8px 14px;border-radius:9999px;background:rgba(255,59,59,0.15);color:#FF8080;border:1px solid rgba(255,59,59,0.35);font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">${I('logout',14)} Log out</button>
          </div>
        </header>
        <main style="padding:32px;max-width:1400px;margin:0 auto;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:16px;">
            <div>
              <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:6px;">Welcome back</div>
              <h1 class="ed" style="font-size:48px;line-height:1;letter-spacing:-0.03em;">My <span class="ed-i" style="color:var(--pink);">rooms</span></h1>
            </div>
            <button onclick="window._cdShowCreate=true;CD.render();" style="padding:12px 22px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 24px rgba(46,91,255,0.4);display:inline-flex;align-items:center;gap:8px;">${I('plus',14)} New room</button>
          </div>

          ${window._cdShowCreate ? CD.renderCreateRoomCard() : ''}

          <!-- My Rooms -->
          <section style="margin-bottom:32px;">
            <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:14px;">My Rooms</div>
            <div id="cd-my-rooms-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
              <div style="padding:20px;color:var(--mute);grid-column:1/-1;text-align:center;background:var(--glass);border:1px dashed var(--line-2);border-radius:14px;">Loading rooms…</div>
            </div>
          </section>

          <!-- Joined Rooms -->
          <section style="margin-bottom:32px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Joined Rooms</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input id="cdJoinRoomId" placeholder="Room ID or invite link" onkeydown="if(event.key==='Enter')CD.handleJoinRoom()" style="padding:8px 14px;width:240px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--sans);" />
                <button onclick="CD.handleJoinRoom()" style="padding:8px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Join</button>
              </div>
            </div>
            <div id="cd-joined-rooms-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
              <div style="padding:20px;color:var(--mute);grid-column:1/-1;text-align:center;background:var(--glass);border:1px dashed var(--line-2);border-radius:14px;">No joined rooms yet.</div>
            </div>
          </section>

        </main>
        <input id="cdJoinRoomHidden" type="hidden" />
      </div>`;
  };

  // ── ADMIN CONSOLE (Super Admin) ────────────────────────────────
  // Full CD rebuild in neon broadcast glass. Entry: dashboard header "Admin Console"
  // Wires every form in CD HTML while re-using the SAME DOM ids the classic
  // handlers in app.js read from (gsc*, saOs*, saMult*, saScorecardSelect,
  // cbz*, saRoomsList, etc.), so existing window.sa*/window.cbz*/
  // window.parseGlobalScorecard/window.saveGlobalScorecard handlers light up
  // unchanged.

  CD.openAdmin = () => {
    CD.state.view = 'admin';
    CD.state.adminSub = CD.state.adminSub || 'scorecards';
    CD.render();
    // Populate dynamic bits after DOM is in place
    setTimeout(() => {
      try { if(typeof window.renderSuperAdminPanel === 'function') window.renderSuperAdminPanel(); } catch(e){ console.warn('CD.openAdmin renderSuperAdminPanel:', e); }
      try { if(typeof window.refreshGlobalScorecardList === 'function') window.refreshGlobalScorecardList(); } catch(e){ console.warn('CD.openAdmin refreshGlobalScorecardList:', e); }
      try { if(typeof window.populateScorecardSelect === 'function') window.populateScorecardSelect(); } catch(e){ console.warn('CD.openAdmin populateScorecardSelect:', e); }
    }, 60);
  };
  CD.closeAdmin = () => {
    CD.state.view = 'dashboard';
    CD.render();
  };
  CD.setAdminSub = (sub) => {
    CD.state.adminSub = sub;
    CD.render();
    // Re-trigger data loads that depend on sub-tab DOM being present
    setTimeout(() => {
      try {
        if(sub === 'rooms'   && typeof window.renderSuperAdminPanel === 'function') window.renderSuperAdminPanel();
        if(sub === 'push'    && typeof window.populateScorecardSelect === 'function') window.populateScorecardSelect();
        if(sub === 'scorecards' && typeof window.refreshGlobalScorecardList === 'function') window.refreshGlobalScorecardList();
      } catch(e){ console.warn('CD.setAdminSub:', e); }
    }, 40);
  };

  // Cricbuzz Step 4 — switch to scorecards sub-tab first (so gsc* DOM ids exist),
  // then call the legacy populate which fills the form from cbzParsedScorecard.
  CD.sendCbzToScorecards = () => {
    // cbzParsedScorecard is module-scope in app.js and not exposed on window.
    // Use Step 4 visibility (only shown after a successful Fetch Scorecard)
    // as the signal that innings data is ready.
    const step4 = document.getElementById('cbzStep4');
    const step4Visible = step4 && step4.style.display !== 'none';
    if(!step4Visible) {
      const s = document.getElementById('cbzPushStatus');
      if(s) { s.textContent = 'Fetch a scorecard first.'; s.className = 'adm-status cbz-status fail'; }
      return;
    }
    CD.state.adminSub = 'scorecards';
    CD.render();
    setTimeout(() => {
      try {
        if(typeof window.cbzPushToRoom === 'function') window.cbzPushToRoom();
        const mainEl = document.querySelector('#cd-root main');
        if(mainEl) mainEl.scrollIntoView({behavior:'smooth', block:'start'});
      } catch(e){ console.warn('sendCbzToScorecards:', e); }
    }, 80);
  };

  CD.renderAdmin = () => {
    const sub = CD.state.adminSub || 'scorecards';
    const subs = [
      { id:'scorecards', label:'Scorecards',      hint:'Paste · parse · save'       },
      { id:'push',       label:'Push & Fan-out',  hint:'Send to every room'         },
      { id:'cricbuzz',   label:'Cricbuzz',        hint:'Live import'                },
      { id:'tools',      label:'Room Tools',      hint:'Overseas · XI multiplier'   },
      { id:'rooms',      label:'All Rooms',       hint:'View · delete'              }
    ];
    const tabBtn = (s) => {
      const active = s.id === sub;
      return `<button onclick="CD.setAdminSub('${s.id}')" style="padding:10px 18px;border-radius:9999px;border:1px solid ${active?'rgba(255,200,61,0.55)':'var(--line-2)'};background:${active?'linear-gradient(180deg,rgba(255,200,61,0.22),rgba(255,200,61,0.08))':'var(--glass)'};color:${active?'#FFE49A':'var(--ink-2)'};font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;flex-direction:column;align-items:flex-start;gap:2px;letter-spacing:0.04em;min-width:150px;">
        <span style="text-transform:uppercase;font-size:11px;">${s.label}</span>
        <span style="font-size:10px;font-weight:500;color:${active?'rgba(255,228,154,0.85)':'var(--mute)'};letter-spacing:0.02em;text-transform:none;">${s.hint}</span>
      </button>`;
    };

    let body = '';
    if(sub === 'scorecards') body = CD._renderAdminScorecards();
    else if(sub === 'push')  body = CD._renderAdminPush();
    else if(sub === 'cricbuzz') body = CD._renderAdminCricbuzz();
    else if(sub === 'tools') body = CD._renderAdminTools();
    else if(sub === 'rooms') body = CD._renderAdminRooms();

    return `
      <div style="position:relative;min-height:100vh;display:flex;flex-direction:column;">
        ${CD.renderTicker()}
        <header style="display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--line);">
          <div style="display:flex;align-items:center;gap:14px;">
            <button onclick="CD.closeAdmin()" style="padding:8px 14px;border-radius:9999px;background:var(--glass);color:var(--ink-2);border:1px solid var(--line-2);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">← Dashboard</button>
            ${CD.Brand(28)}
            <div>
              <div class="ed" style="font-size:22px;line-height:0.95;">Admin <span class="ed-i" style="color:var(--gold);">console</span></div>
              <div style="font-size:10px;color:var(--gold);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Super admin · platform wide</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">${esc(window.user?.email||'')}</span>
          </div>
        </header>

        <!-- Stats banner (populated by window.renderSuperAdminPanel) -->
        <div style="padding:20px 32px 0;max-width:1400px;margin:0 auto;width:100%;">
          <div id="saStatsRow" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:18px;">
            ${CD.Stat({val: '<span id="sa-total-users">—</span>', lbl:'Total Users',        accent:'var(--electric)'})}
            ${CD.Stat({val: '<span id="sa-total-auctions">—</span>', lbl:'Auction Rooms',   accent:'var(--pink)'})}
            ${CD.Stat({val: '<span id="sa-total-drafts">—</span>', lbl:'Draft Rooms',       accent:'var(--lime)'})}
            ${CD.Stat({val: '<span id="sa-total-matches">—</span>', lbl:'Global Scorecards',accent:'var(--gold)'})}
          </div>

          <!-- Sub-tab nav -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;padding:14px;border-radius:16px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(28px);border:1px solid var(--line-2);">
            ${subs.map(tabBtn).join('')}
          </div>
        </div>

        <main style="padding:0 32px 48px;max-width:1400px;margin:0 auto;width:100%;">
          ${body}
        </main>
      </div>

      <style>
        /* Admin-scoped glass overrides — forms live inside #cd-root.
           These give classic inputs/selects/buttons the neon-broadcast feel. */
        #cd-root .adm-card{padding:24px;border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px) saturate(1.5);-webkit-backdrop-filter:blur(32px) saturate(1.5);border:1px solid var(--line-2);box-shadow:var(--sh-1);margin-bottom:18px;}
        #cd-root .adm-card h3{font-family:var(--serif);font-weight:800;font-size:22px;margin:0 0 2px;letter-spacing:-0.01em;}
        #cd-root .adm-card .adm-sub{font-size:11px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:14px;}
        #cd-root .adm-lbl{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;}
        #cd-root .adm-inp, #cd-root .adm-sel, #cd-root .adm-ta{width:100%;padding:11px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:10px;outline:none;font-family:var(--sans);box-sizing:border-box;}
        #cd-root .adm-ta{font-family:var(--mono);resize:vertical;min-height:120px;}
        #cd-root .adm-inp:focus, #cd-root .adm-sel:focus, #cd-root .adm-ta:focus{border-color:rgba(255,200,61,0.6);box-shadow:0 0 0 3px rgba(255,200,61,0.15);}
        #cd-root .adm-btn{padding:10px 18px;border-radius:9999px;font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;border:none;letter-spacing:0.04em;display:inline-flex;align-items:center;gap:6px;}
        #cd-root .adm-btn-cta{background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;box-shadow:0 4px 16px rgba(46,91,255,0.35);}
        #cd-root .adm-btn-gold{background:linear-gradient(180deg,rgba(255,200,61,0.25),rgba(255,200,61,0.12));color:#FFE49A;border:1px solid rgba(255,200,61,0.5);}
        #cd-root .adm-btn-danger{background:rgba(255,59,59,0.18);color:#FF8B8B;border:1px solid rgba(255,59,59,0.45);}
        #cd-root .adm-btn-ghost{background:var(--glass);color:var(--ink-2);border:1px solid var(--line-2);}
        #cd-root .adm-btn-ai{background:linear-gradient(180deg,var(--pink-2),var(--pink));color:#fff;box-shadow:0 4px 16px rgba(255,45,135,0.35);}
        #cd-root .adm-row{display:flex;gap:10px;flex-wrap:wrap;align-items:end;}
        #cd-root .adm-row>*{flex:1 1 auto;}
        #cd-root .adm-row>.adm-sm{flex:0 0 140px;}
        #cd-root .adm-status{margin-top:10px;font-size:12px;color:var(--ink-2);min-height:18px;}
        #cd-root .adm-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        #cd-root .adm-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        @media (max-width:780px){#cd-root .adm-grid-2,#cd-root .adm-grid-3{grid-template-columns:1fr;}}
        #cd-root .adm-drop{border:2px dashed var(--line-2);border-radius:14px;padding:28px;text-align:center;cursor:pointer;background:var(--glass);transition:border-color .15s,background .15s;}
        #cd-root .adm-drop:hover{border-color:rgba(255,200,61,0.55);background:rgba(255,200,61,0.05);}
        #cd-root .adm-drop.drag{border-color:var(--electric);background:rgba(46,91,255,0.08);}
        #cd-root .thumb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
        #cd-root .thumb-row>*{width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid var(--line-2);}
        #cd-root .thumb-row img{width:100%;height:100%;object-fit:cover;}
        #cd-root .preview-box{margin-top:14px;padding:14px;border-radius:12px;background:rgba(46,91,255,0.06);border:1px solid rgba(46,91,255,0.25);}
        #cd-root table.adm-tbl{width:100%;border-collapse:collapse;font-size:13px;}
        #cd-root table.adm-tbl th{padding:10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line-2);}
        #cd-root table.adm-tbl td{padding:10px;border-bottom:1px solid var(--line);}
        #cd-root .match-pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:10px;}
        #cd-root .adm-info{padding:10px 14px;border-radius:10px;background:rgba(46,91,255,0.08);border:1px solid rgba(46,91,255,0.3);font-size:12px;color:var(--ink-2);margin:10px 0;}
        #cd-root .adm-warn{padding:10px 14px;border-radius:10px;background:rgba(255,59,59,0.10);border:1px solid rgba(255,59,59,0.35);font-size:12px;color:#FFB0B0;margin:10px 0;}
        #cd-root .adm-ok{color:var(--lime);} #cd-root .adm-err{color:#FF8B8B;}

        /* ── Cricbuzz match pills (glass broadcast cards) ───────────── */
        #cd-root .match-pill{position:relative;padding:16px 14px 14px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015));border:1px solid var(--line-2);cursor:pointer;transition:transform .15s ease,border-color .15s,box-shadow .15s,background .15s;display:flex;flex-direction:column;gap:6px;overflow:hidden;}
        #cd-root .match-pill:hover{transform:translateY(-2px);border-color:rgba(255,200,61,0.55);box-shadow:0 10px 28px rgba(0,0,0,0.35),0 0 0 1px rgba(255,200,61,0.15);background:linear-gradient(180deg,rgba(255,200,61,0.07),rgba(255,255,255,0.02));}
        #cd-root .match-pill.selected{border-color:var(--electric);box-shadow:0 0 0 2px rgba(46,91,255,0.35),0 12px 32px rgba(46,91,255,0.25);background:linear-gradient(180deg,rgba(46,91,255,0.12),rgba(46,91,255,0.03));}
        #cd-root .match-pill::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 60% at 50% -10%,rgba(255,255,255,0.08),transparent 60%);pointer-events:none;}
        #cd-root .match-pill .match-pill-teams{font-family:var(--display);font-weight:800;font-size:20px;letter-spacing:-0.01em;color:var(--ink);line-height:1.1;}
        #cd-root .match-pill .match-pill-meta{font-family:var(--mono);font-size:11px;color:var(--ink-2);letter-spacing:0.02em;}
        #cd-root .match-pill .match-pill-meta.text-truncate{font-family:var(--sans);font-size:10px;color:var(--mute);text-transform:uppercase;letter-spacing:0.14em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        #cd-root .match-pill .match-pill-live{position:absolute;top:10px;right:10px;padding:3px 9px;border-radius:9999px;background:linear-gradient(180deg,#ff3b5c,#c81d3b);color:#fff;font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;box-shadow:0 0 14px rgba(255,59,92,0.55),inset 0 0 0 1px rgba(255,255,255,0.18);animation:admPulse 1.6s ease-in-out infinite;}
        @keyframes admPulse{0%,100%{box-shadow:0 0 14px rgba(255,59,92,0.55),inset 0 0 0 1px rgba(255,255,255,0.18);}50%{box-shadow:0 0 22px rgba(255,59,92,0.9),inset 0 0 0 1px rgba(255,255,255,0.3);}}

        /* ── Saved-scorecard history rows (leaderboard tiles) ─────── */
        #cd-root .gsc-history-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;margin-bottom:10px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015));border:1px solid var(--line-2);flex-wrap:wrap;transition:border-color .15s,transform .15s;}
        #cd-root .gsc-history-row:hover{border-color:rgba(255,200,61,0.45);transform:translateY(-1px);}
        #cd-root .gsc-history-row>div:first-child{flex:1 1 320px;min-width:0;}
        #cd-root .gsc-history-label{font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-0.01em;color:var(--ink);line-height:1.15;margin-bottom:8px;}
        #cd-root .gsc-history-row .text-dim{font-size:12px;color:var(--ink-2);line-height:1.6;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;}
        #cd-root .gsc-history-row .text-dim strong{color:var(--ink);font-weight:700;}
        #cd-root .gsc-history-row .text-dim .gsc-chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-family:var(--sans);font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;}
        #cd-root .gsc-history-row .text-dim .gsc-chip.win{background:rgba(125,255,179,0.14);border:1px solid rgba(125,255,179,0.45);color:#A8FFD1;}
        #cd-root .gsc-history-row .text-dim .gsc-chip.motm{background:rgba(255,45,135,0.14);border:1px solid rgba(255,45,135,0.45);color:#FFB0D4;}
        #cd-root .gsc-history-row .text-dim .gsc-chip.count{background:var(--glass);border:1px solid var(--line-2);color:var(--ink-2);font-family:var(--mono);letter-spacing:0.06em;text-transform:none;}
        #cd-root .gsc-history-row .text-dim .gsc-chip.top{background:linear-gradient(180deg,rgba(255,200,61,0.22),rgba(255,200,61,0.08));border:1px solid rgba(255,200,61,0.55);color:#FFE49A;}
        #cd-root .gsc-history-row .btn-group{display:flex;gap:8px;flex-shrink:0;}
        #cd-root .gsc-history-row .btn{padding:9px 16px;border-radius:9999px;font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;border:none;letter-spacing:0.06em;text-transform:uppercase;}
        #cd-root .gsc-history-row .btn.btn-ghost{background:linear-gradient(180deg,rgba(255,200,61,0.25),rgba(255,200,61,0.12));color:#FFE49A;border:1px solid rgba(255,200,61,0.5);}
        #cd-root .gsc-history-row .btn.btn-danger{background:rgba(255,59,59,0.18);color:#FF8B8B;border:1px solid rgba(255,59,59,0.45);}
        #cd-root .gsc-history-row .btn-sm{padding:8px 14px;font-size:10.5px;}
        #cd-root #gscHistoryList .empty{padding:20px;text-align:center;color:var(--mute);font-size:12px;border:1px dashed var(--line-2);border-radius:14px;background:var(--glass);}

        /* ── All Rooms list (sa-room-card) ────────────────────────── */
        #cd-root .sa-section-hdr{font-family:var(--display);font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.18em;color:var(--mute);padding:14px 4px 8px;border-bottom:1px solid var(--line);margin:14px 0 10px;}
        #cd-root .sa-room-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;margin-bottom:10px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015));border:1px solid var(--line-2);flex-wrap:wrap;transition:border-color .15s,transform .15s;}
        #cd-root .sa-room-card:hover{border-color:rgba(46,91,255,0.45);transform:translateY(-1px);}
        #cd-root .sa-room-card .sa-room-main{flex:1 1 280px;min-width:0;}
        #cd-root .sa-room-card .sa-room-name{font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-0.01em;color:var(--ink);display:flex;align-items:center;gap:10px;flex-wrap:wrap;line-height:1.15;}
        #cd-root .sa-room-card .room-type-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-family:var(--sans);font-size:9.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;}
        #cd-root .sa-room-card .room-type-pill.auction{background:rgba(255,45,135,0.16);border:1px solid rgba(255,45,135,0.5);color:#FFB0D4;}
        #cd-root .sa-room-card .room-type-pill.draft{background:rgba(125,255,179,0.14);border:1px solid rgba(125,255,179,0.45);color:#A8FFD1;}
        #cd-root .sa-room-card .sa-room-meta{font-family:var(--sans);font-size:11.5px;color:var(--ink-2);margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;}
        #cd-root .sa-room-card .sa-room-meta .sa-meta-k{font-size:9px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--mute);margin-right:4px;}
        #cd-root .sa-room-card .sa-room-meta code,#cd-root .sa-room-card .code-pill{font-family:var(--mono);font-size:10.5px;padding:2px 8px;border-radius:6px;background:var(--glass);border:1px solid var(--line);color:var(--ink-2);letter-spacing:0.02em;}
        #cd-root .sa-room-card .sa-room-count{font-family:var(--mono);font-size:11px;padding:3px 9px;border-radius:9999px;background:var(--glass);border:1px solid var(--line-2);color:var(--ink-2);}
        #cd-root .sa-room-card .btn-group{display:flex;gap:8px;flex-shrink:0;}
        #cd-root .sa-room-card .btn{padding:9px 16px;border-radius:9999px;font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;border:none;letter-spacing:0.06em;text-transform:uppercase;}
        #cd-root .sa-room-card .btn.btn-ghost{background:var(--glass);color:var(--ink-2);border:1px solid var(--line-2);}
        #cd-root .sa-room-card .btn.btn-danger{background:rgba(255,59,59,0.18);color:#FF8B8B;border:1px solid rgba(255,59,59,0.45);}
        #cd-root .sa-room-card .btn-sm{padding:8px 14px;font-size:10.5px;}
        #cd-root #saRoomsList .empty{padding:18px;text-align:center;color:var(--mute);font-size:12px;border:1px dashed var(--line-2);border-radius:12px;background:var(--glass);margin-bottom:10px;}
        #cd-root #saRoomsList .empty.text-err{color:#FF8B8B;border-color:rgba(255,59,59,0.4);}

        /* ── Scorecard select option styling (native selects) ─────── */
        #cd-root select#saScorecardSelect,#cd-root select#saOsRoomSelect,#cd-root select#saMultRoomSelect{font-family:var(--sans);font-weight:600;}
      </style>
    `;
  };

  // Sub-tab: Scorecards (Gemini paste → parse → edit rows → save)
  CD._renderAdminScorecards = () => `
    <div class="adm-card">
      <h3>Global Scorecard Entry</h3>
      <div class="adm-sub">Paste screenshots or text · Gemini parses · save & fan-out</div>

      <div class="drop-zone adm-drop" id="gscDropZone" onclick="document.getElementById('gscFiles').click()"
           ondragover="event.preventDefault();this.classList.add('drag');"
           ondragleave="this.classList.remove('drag');"
           ondrop="event.preventDefault();this.classList.remove('drag');window.handleGscFiles&&window.handleGscFiles(event.dataTransfer.files);">
        <div style="font-family:var(--display);font-weight:800;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:var(--ink-2);">Drop scorecard images or click to upload</div>
        <div class="drop-zone-hint" id="gscDropHint" style="font-size:11px;color:var(--mute);margin-top:4px;">PNG · JPG · WEBP · up to 4 files</div>
      </div>
      <input type="file" id="gscFiles" accept="image/*" multiple style="display:none" onchange="window.handleGscFiles&&window.handleGscFiles(this.files)">
      <div id="gscThumbRow" class="thumb-row"></div>

      <div class="adm-row" style="margin-top:14px;">
        <div style="flex:1;">
          <label class="adm-lbl">Match label</label>
          <input type="text" id="gscMatchLabel" class="adm-inp parse-input" placeholder="e.g. CSK vs MI – Apr 6 (auto-filled)">
        </div>
        <button id="gscParseBtn" class="adm-btn adm-btn-ai" onclick="window.parseGlobalScorecard && window.parseGlobalScorecard()">★ Parse with Gemini</button>
      </div>
      <div class="adm-status ai-status" id="gscParseStatus"></div>

      <div id="gscFormBody" style="display:none;margin-top:18px;">
        <div class="adm-grid-3">
          <div><label class="adm-lbl">Winning IPL Team</label><input type="text" id="gscWinner" class="adm-inp" placeholder="e.g. CSK"></div>
          <div><label class="adm-lbl">Man of the Match</label><input type="text" id="gscMotm" class="adm-inp" placeholder="Player name"></div>
          <div><label class="adm-lbl">Result</label>
            <select id="gscResult" class="adm-sel">
              <option value="normal">Normal Result</option>
              <option value="noresult">No Result</option>
              <option value="superover">Super Over</option>
            </select>
          </div>
        </div>
        <div style="margin-top:18px;">
          <div class="adm-lbl" style="color:var(--electric);margin-bottom:8px;">Batting</div>
          <div id="gscBattingRows"></div>
        </div>
        <div style="margin-top:18px;">
          <div class="adm-lbl" style="color:var(--pink);margin-bottom:8px;">Bowling</div>
          <div id="gscBowlingRows"></div>
        </div>
        <div style="margin-top:18px;">
          <div class="adm-lbl" style="color:var(--lime);margin-bottom:8px;">Fielding</div>
          <div id="gscFieldingRows"></div>
        </div>
        <div id="gscPreviewBox" class="preview-box" style="display:none;">
          <div class="adm-lbl" style="color:var(--electric);">Preview</div>
          <div id="gscPreviewContent"></div>
        </div>
        <div class="adm-row" style="margin-top:14px;">
          <button class="adm-btn adm-btn-cta" onclick="window.saveGlobalScorecard && window.saveGlobalScorecard()">Save &amp; push to all rooms</button>
        </div>
        <div class="adm-status ai-status" id="gscSaveStatus"></div>
      </div>
    </div>

    <div class="adm-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;">Saved scorecards</h3>
          <div class="adm-sub">History · re-push or delete</div>
        </div>
        <button class="adm-btn adm-btn-ghost" onclick="window.cdResyncAllRooms && window.cdResyncAllRooms()" title="Re-fan-out every saved scorecard to every room you own or joined. Safe to retry after a network drop." style="font-size:11px;">↻ Resync all rooms</button>
      </div>
      <div id="gscResyncStatus" class="adm-status ai-status" style="margin-top:10px;display:none;"></div>
      <div id="gscHistoryList" style="margin-top:14px;"><div style="padding:20px;text-align:center;color:var(--mute);font-size:12px;">No matches saved yet.</div></div>
    </div>
  `;

  // Sub-tab: Push & Fan-out
  CD._renderAdminPush = () => `
    <div class="adm-card">
      <h3>Push Scorecard to <span style="color:var(--pink);font-style:italic;">every</span> room</h3>
      <div class="adm-sub">Affects all auctions and drafts on the platform</div>

      <div class="adm-warn">⚠ Pushes to <strong>every room on the entire platform</strong>. Use carefully.</div>

      <div style="margin-bottom:14px;">
        <label class="adm-lbl">Select a saved scorecard</label>
        <select id="saScorecardSelect" class="adm-sel" onchange="window.saOnScorecardSelect && window.saOnScorecardSelect()">
          <option value="">— Select a saved scorecard —</option>
        </select>
      </div>
      <div id="saMatchInfo" class="adm-info" style="display:none;"><span id="saMatchInfoText"></span></div>

      <div class="adm-row" style="margin-top:14px;">
        <button class="adm-btn adm-btn-cta" onclick="window.saPushToAll && window.saPushToAll()">Push to all rooms</button>
        <button class="adm-btn adm-btn-danger" onclick="window.saDeleteMatchFromAll && window.saDeleteMatchFromAll()">Delete from all rooms</button>
      </div>
      <div class="adm-status ai-status" id="saPushStatus"></div>
    </div>
  `;

  // Sub-tab: Cricbuzz 4-step wizard
  CD._renderAdminCricbuzz = () => `
    <div class="adm-card">
      <h3>Live Cricbuzz <span style="color:var(--pink);font-style:italic;">import</span></h3>
      <div class="adm-sub">Fetch live/recent IPL scorecards from Cricbuzz API</div>

      <div style="padding:16px;border-radius:12px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;">
        <div class="adm-lbl" style="color:var(--electric);margin-bottom:10px;">Step 1 — Select Match</div>
        <div class="adm-row">
          <button class="adm-btn adm-btn-cta" onclick="window.cbzFetchLive && window.cbzFetchLive()">⚡ Live</button>
          <button class="adm-btn adm-btn-ghost" onclick="window.cbzFetchRecent && window.cbzFetchRecent()">🕐 Recent</button>
          <button class="adm-btn adm-btn-ghost" onclick="window.cbzFetchUpcoming && window.cbzFetchUpcoming()">📅 Upcoming</button>
        </div>
        <div class="adm-status cbz-status" id="cbzMatchStatus">Click a button to load matches.</div>
        <div class="match-pick-grid" id="cbzMatchList"></div>
      </div>

      <div id="cbzStep2" style="display:none;padding:16px;border-radius:12px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;">
        <div class="adm-lbl" style="color:var(--pink);margin-bottom:10px;">Step 2 — Load Scorecard</div>
        <div class="adm-row">
          <div style="flex:1;">
            <div id="cbzSelectedMatchLabel" style="font-family:var(--display);font-weight:800;font-size:16px;">—</div>
            <div id="cbzSelectedMatchMeta" style="font-size:11px;color:var(--mute);margin-top:2px;"></div>
          </div>
          <button class="adm-btn adm-btn-gold" onclick="window.cbzFetchScorecard && window.cbzFetchScorecard()">Fetch Scorecard</button>
        </div>
        <div class="adm-status cbz-status" id="cbzScorecardStatus"></div>
      </div>

      <div id="cbzStep3" style="display:none;padding:16px;border-radius:12px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;">
        <div class="adm-lbl" style="color:var(--lime);margin-bottom:10px;">Step 3 — Preview Innings</div>
        <div id="cbzInningsButtons" style="display:none;margin-bottom:10px;"></div>
        <div id="cbzPreview" style="overflow-x:auto;"></div>
      </div>

      <div id="cbzStep4" style="display:none;padding:16px;border-radius:12px;background:var(--glass);border:1px solid var(--line);">
        <div class="adm-lbl" style="color:var(--gold);margin-bottom:10px;">Step 4 — Send to Scorecards Tab</div>
        <div style="font-size:12px;color:var(--ink-2);margin-bottom:12px;">Sends <strong style="color:var(--ink);">both innings combined</strong> to the Scorecards tab, ready for save &amp; fan-out.</div>
        <button class="adm-btn adm-btn-cta" onclick="CD.sendCbzToScorecards()">Send to Scorecards Tab →</button>
        <div class="adm-status cbz-status" id="cbzPushStatus"></div>
      </div>
    </div>
  `;

  // Sub-tab: Room Tools (Overseas limit, XI multiplier)
  CD._renderAdminTools = () => `
    <div class="adm-card">
      <h3>Overseas Player <span style="color:var(--electric);font-style:italic;">limit</span></h3>
      <div class="adm-sub">Per-room · live bidding rules</div>
      <div class="adm-row" style="margin-bottom:10px;">
        <div style="flex:1;">
          <label class="adm-lbl">Select Room</label>
          <select id="saOsRoomSelect" class="adm-sel"><option value="">— Click Load Rooms first —</option></select>
        </div>
        <div class="adm-sm">
          <label class="adm-lbl">Max Overseas</label>
          <input type="number" id="saOsLimit" class="adm-inp" min="1" max="15" value="8">
        </div>
      </div>
      <div class="adm-row">
        <button class="adm-btn adm-btn-ghost" onclick="window.saPopulateOsRooms && window.saPopulateOsRooms()">Load rooms</button>
        <button class="adm-btn adm-btn-cta" onclick="window.saSetOverseasLimit && window.saSetOverseasLimit()">Apply limit</button>
      </div>
      <div class="adm-status ai-status" id="saOsStatus"></div>
    </div>

    <div class="adm-card">
      <h3>XI Points <span style="color:var(--gold);font-style:italic;">multiplier</span></h3>
      <div class="adm-sub">Playing XI earns multiplied points · Bench = 1× · Reserves = 0</div>
      <div class="adm-row" style="margin-bottom:10px;">
        <div style="flex:1;">
          <label class="adm-lbl">Select Room</label>
          <select id="saMultRoomSelect" class="adm-sel"><option value="">— Click Load Rooms first —</option></select>
        </div>
        <div class="adm-sm">
          <label class="adm-lbl" title="Changing the multiplier re-applies retroactively across the season.">XI Multiplier <span style="color:var(--mute);font-weight:500;font-size:10px;cursor:help;" title="Changing the multiplier re-applies retroactively across the season.">(?)</span></label>
          <input type="number" id="saMultValue" class="adm-inp" min="0.5" max="5" step="0.1" value="1" title="Changing the multiplier re-applies retroactively across the season.">
        </div>
      </div>
      <div class="adm-row">
        <button class="adm-btn adm-btn-ghost" onclick="window.saPopulateMultRooms && window.saPopulateMultRooms()">Load rooms</button>
        <button class="adm-btn adm-btn-gold" onclick="window.saSetXIMultiplier && window.saSetXIMultiplier()">Apply multiplier</button>
      </div>
      <div class="adm-status ai-status" id="saMultStatus"></div>
    </div>
  `;

  // Sub-tab: All Rooms
  CD._renderAdminRooms = () => `
    <div class="adm-card">
      <h3>All rooms on <span style="color:var(--pink);font-style:italic;">platform</span></h3>
      <div class="adm-sub">View · delete · monitor</div>
      <div class="adm-row" style="margin-bottom:14px;">
        <button class="adm-btn adm-btn-ghost" onclick="window.renderSuperAdminPanel && window.renderSuperAdminPanel()">↻ Refresh</button>
      </div>
      <div id="saRoomsList"><div style="padding:20px;text-align:center;color:var(--mute);font-size:12px;">Loading…</div></div>
    </div>
  `;

  CD.renderCreateRoomCard = () => `
    <div class="cd-glass-2" style="padding:24px;margin-bottom:24px;border-radius:22px;background:var(--glass-2);backdrop-filter:blur(40px) saturate(1.6);border:1px solid var(--line-2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div class="ed" style="font-size:24px;">Create a new <span class="ed-i" style="color:var(--pink);">room</span></div>
        <button onclick="window._cdShowCreate=false;CD.render();" style="background:transparent;border:none;color:var(--mute);cursor:pointer;padding:4px;">${I('x',18)}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Room name</div><input id="cdNewRoomName" placeholder="Office League" style="width:100%;padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" /></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Budget (cr)</div><input id="cdNewRoomBudget" type="number" value="100" style="width:100%;padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" /></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Max teams</div><input id="cdNewRoomMaxTeams" type="number" value="7" style="width:100%;padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" /></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Players / team</div><input id="cdNewRoomMaxPlayers" type="number" value="21" style="width:100%;padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" /></div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);margin-bottom:6px;">Max overseas</div><input id="cdNewRoomMaxOverseas" type="number" value="8" style="width:100%;padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;outline:none;font-family:var(--sans);" /></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:18px;">
        <button onclick="CD.handleCreateRoom()" style="padding:10px 20px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;">Create room</button>
        <button onclick="window._cdShowCreate=false;CD.render();" style="padding:10px 20px;border-radius:9999px;background:transparent;color:var(--mute);border:1px solid var(--line);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>
      </div>
    </div>`;

  // ── ROOM SHELL ──────────────────────────────────────────────────
  CD.renderRoom = () => {
    const rs = window.roomState || {};
    const myTeam = window.myTeamName || '';
    const teams = rs.teams || {};
    const myT = teams[myTeam];
    const isAdmin = window.isAdmin || false;
    const roomName = rs.roomName || (window.roomId ? `Room ${window.roomId.substring(0,5).toUpperCase()}` : 'Room');
    const subs = SUBTABS[CD.state.activeNav] || [];
    const activeSub = CD.state.activeSub || (subs[0] && subs[0].id) || '';

    const sidebar = CD.state.isMobile ? '' : `
      <aside style="padding:24px 16px;border-right:1px solid var(--line);background:rgba(0,0,0,0.2);backdrop-filter:blur(12px);min-height:100vh;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;padding:0 6px;">
          ${CD.Brand(32)}
          <div>
            <div class="ed" style="font-size:20px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>
            <div style="font-size:9px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-top:2px;">Fantasy · '26</div>
          </div>
        </div>
        <button onclick="CD.goDashboard()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:transparent;border:1px solid var(--line);color:var(--mute);width:100%;cursor:pointer;font-family:var(--sans);font-size:12px;font-weight:600;margin-bottom:18px;">${I('back',14)} Dashboard</button>
        <div style="font-size:9px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;padding:0 10px 10px;">Navigate</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${NAV.map(n => `
            <div onclick="CD.go('${n.id}')" style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;${CD.state.activeNav === n.id ? 'background:rgba(255,255,255,0.1);color:var(--ink);box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);' : 'color:var(--mute);'}" onmouseover="if(!this.dataset.active)this.style.background='rgba(255,255,255,0.05)';" onmouseout="if('${CD.state.activeNav}'!=='${n.id}')this.style.background='transparent';">
              <div style="margin-top:2px;color:${CD.state.activeNav === n.id ? 'var(--ink)' : 'var(--mute)'};">${I(n.icon, 16)}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;color:${CD.state.activeNav === n.id ? 'var(--ink)' : 'var(--ink-2)'};">${n.label}${n.live ? CD.LiveDot() : ''}</div>
                <div style="font-size:10px;color:var(--mute);margin-top:1px;font-weight:400;">${n.sub}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${myT ? `
        <div class="cd-glass" style="margin-top:24px;padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line-2);">
          <div style="font-size:9px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">My Purse</div>
          <div style="font-family:var(--display);font-size:26px;font-weight:800;color:var(--lime);">₹${(myT.budget||0).toFixed(1)}<span style="font-size:14px;color:var(--mute);">cr</span></div>
          <div style="font-size:11px;color:var(--mute);margin-top:4px;">${(Array.isArray(myT.roster)?myT.roster.length:Object.keys(myT.roster||{}).length)} / ${rs.maxPlayers || rs.setup?.maxPlayers || 21} players</div>
        </div>
        ` : ''}
        <button onclick="if(confirm('Log out?'))window.logoutUser()" style="margin-top:16px;width:100%;padding:10px 12px;border-radius:8px;background:rgba(255,59,59,0.1);color:#FF8080;border:1px solid rgba(255,59,59,0.25);font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;justify-content:center;">${I('logout',14)} Log out</button>
      </aside>`;

    const subTabBar = subs.length > 1 ? `
      <div class="cd-subtab-bar" style="display:flex;gap:4px;padding:14px 32px 0;border-bottom:1px solid var(--line);overflow-x:auto;">
        ${subs.map(s => `
          <button ${activeSub === s.id ? 'data-sub-active="1"' : ''} onclick="CD.goSub('${s.id}')" style="padding:8px 14px;background:transparent;border:none;border-bottom:2px solid ${activeSub === s.id ? 'var(--pink)' : 'transparent'};color:${activeSub === s.id ? 'var(--ink)' : 'var(--mute)'};font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:0.08em;position:relative;">${s.label}</button>
        `).join('')}
      </div>
    ` : '';

    // On mobile the sidebar is hidden, so promote a compact "← Dashboard"
    // control into the room header. Shown on desktop too for consistency.
    const dashBackBtn = `<button onclick="CD.goDashboard()" aria-label="Back to dashboard" style="padding:8px 12px;border-radius:9999px;background:var(--glass);border:1px solid var(--line-2);color:var(--ink-2);font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0;">${I('back',13)}${CD.state.isMobile ? '' : ' Dashboard'}</button>`;

    const main = `
      <main style="display:flex;flex-direction:column;min-width:0;">
        ${CD.renderTicker()}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:${CD.state.isMobile ? '14px 16px 0' : '20px 32px 0'};border-bottom:1px solid var(--line);flex-wrap:wrap;gap:${CD.state.isMobile ? 8 : 12}px;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            ${CD.state.isMobile ? dashBackBtn : ''}
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
                <h1 class="ed" style="font-size:${CD.state.isMobile ? 26 : 36}px;letter-spacing:-0.03em;line-height:1;">${esc(NAV.find(n=>n.id===CD.state.activeNav)?.label || 'Room')}</h1>
                <div class="ed-i" style="font-size:${CD.state.isMobile ? 20 : 28}px;color:var(--mute);">${esc(activeSub)}</div>
              </div>
              <div style="font-size:${CD.state.isMobile ? 10 : 11}px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-top:${CD.state.isMobile ? 4 : 6}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(roomName)}${isAdmin ? ' · Admin' : myTeam ? ' · ' + esc(myTeam) : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:${CD.state.isMobile ? 6 : 10}px;align-items:center;flex-shrink:0;">
            ${!CD.state.isMobile ? dashBackBtn : ''}
            <button onclick="window.copyInviteLink()" style="padding:8px 14px;border-radius:9999px;background:var(--glass-2);border:1px solid var(--line-2);color:var(--ink);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">${I('copy',14)}${CD.state.isMobile ? '' : ' Invite'}</button>
          </div>
        </div>
        ${subTabBar}
        <div style="padding:${CD.state.isMobile ? '14px 16px 80px' : '20px 32px'};flex:1;" id="cd-tab-content" data-cd-nav="${CD.state.activeNav || ''}" data-cd-sub="${activeSub || ''}">
          ${CD.renderTabContent()}
        </div>
      </main>`;

    return `
      <div style="position:relative;min-height:100vh;display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '240px 1fr'};">${sidebar}${main}</div>
      ${CD.state.isMobile ? CD.renderMobileBottomNav() : ''}
    `;
  };

  CD.renderMobileBottomNav = () => `
    <div style="position:fixed;bottom:10px;left:10px;right:10px;z-index:100;padding:5px;border-radius:9999px;background:var(--glass-2);backdrop-filter:blur(40px) saturate(1.6);-webkit-backdrop-filter:blur(40px) saturate(1.6);border:1px solid var(--line-2);box-shadow:var(--sh-2);display:flex;gap:2px;overflow-x:auto;">
      ${NAV.map(n => `
        <div onclick="CD.go('${n.id}')" style="flex:1;min-width:54px;padding:7px 3px;display:flex;flex-direction:column;align-items:center;gap:2px;color:${CD.state.activeNav === n.id ? '#fff' : 'var(--mute)'};background:${CD.state.activeNav === n.id ? 'linear-gradient(180deg,var(--electric-2),var(--electric))' : 'transparent'};border-radius:9999px;cursor:pointer;position:relative;">
          ${I(n.icon, 14)}
          <div style="font-size:8.5px;font-weight:600;letter-spacing:0.04em;">${n.label}</div>
          ${n.live ? `<div style="position:absolute;top:5px;right:30%;width:5px;height:5px;border-radius:50%;background:var(--pink);"></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // ── TAB CONTENT DISPATCH ────────────────────────────────────────
  CD.renderTabContent = () => {
    const nav = CD.state.activeNav;
    const sub = CD.state.activeSub;
    try {
      if(nav === 'setup') return CD.renderSetup();
      if(nav === 'auction'){
        if(sub === 'purses') return CD.renderPurses();
        if(sub === 'ledger') return CD.renderLedger();
        return CD.renderAuctionLive();
      }
      if(nav === 'squad'){
        if(sub === 'trades') return CD.renderTrades();
        if(sub === 'ptsbymatch') return CD.renderPointsByMatch();
        return CD.renderMyTeam();
      }
      if(nav === 'league'){
        if(sub === 'points') return CD.renderPoints();
        if(sub === 'weeks') return CD.renderTeamsOfWeek();
        return CD.renderLeaderboard();
      }
      if(nav === 'players'){
        if(sub === 'analytics') return CD.renderAnalytics();
        return CD.renderPlayersPool();
      }
      if(nav === 'matches'){
        if(sub === 'schedule') return CD.renderSchedule();
        return CD.renderMatches();
      }
    } catch(e){
      console.error('CD tab error:', e);
      return `<div style="padding:24px;border-radius:14px;background:var(--glass);border:1px solid var(--line);color:var(--ink-2);">Error: ${esc(e.message)}</div>`;
    }
    return '';
  };

  // ── INDIVIDUAL TAB RENDERS ──────────────────────────────────────
  CD.renderSetup = () => {
    const rs = window.roomState || {};
    const setup = rs.setup || {};
    const teams = rs.teams || {};
    const members = rs.members ? Object.values(rs.members) : [];
    const isAdmin = window.isAdmin || false;
    const isStarted = setup.isStarted || false;
    const maxTeams = rs.maxTeams || setup.maxTeams || 7;
    const maxPlayers = rs.maxPlayers || setup.maxPlayers || 21;
    const maxOverseas = rs.maxOverseas || setup.maxOverseas || 8;
    const budget = rs.budget || setup.budget || 100;
    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const releaseLocked = !!rs.releaseLocked;
    const squadLocked = !!rs.squadLocked;
    const isSuper = window.user?.email && (typeof window.isSuperAdminEmail === 'function' ? window.isSuperAdminEmail(window.user.email) : window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com');
    const inviteUrl = window.location.origin + window.location.pathname + '?room=' + encodeURIComponent(window.roomId || '');
    const myRegistered = window.myTeamName && members.find(m => m.uid === window.user?.uid);

    return `
      <!-- Stats banner -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px;">
        ${CD.Stat({val: '₹' + budget, lbl: 'Budget (cr)', accent: 'var(--electric)'})}
        ${CD.Stat({val: maxTeams, lbl: 'Max Teams', accent: 'var(--pink)'})}
        ${CD.Stat({val: maxPlayers, lbl: 'Players / Team', accent: 'var(--lime)'})}
        ${CD.Stat({val: maxOverseas, lbl: 'Max Overseas', accent: 'var(--gold)'})}
        ${CD.Stat({val: xiMult + '×', lbl: 'XI Multiplier', accent: 'var(--gold)'})}
      </div>

      <!-- Status banner -->
      <div style="padding:20px 24px;border-radius:18px;background:${isStarted ? 'linear-gradient(135deg,rgba(182,255,60,0.12),rgba(46,91,255,0.08))' : 'var(--glass)'};border:1px solid ${isStarted?'rgba(182,255,60,0.3)':'var(--line-2)'};margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Auction status</div>
          <div class="ed" style="font-size:26px;margin-top:3px;">${isStarted ? '<span style="color:var(--lime);">Live</span>' : 'Not <span class="ed-i" style="color:var(--mute);">started</span>'}</div>
          ${isStarted ? `<div style="font-size:11px;color:var(--ink-2);margin-top:3px;">Auction is underway. Head to the Auction tab.</div>` : isAdmin ? `<div style="font-size:11px;color:var(--ink-2);margin-top:3px;">You're the admin. Click Start Auction when ${maxTeams} teams have joined.</div>` : `<div style="font-size:11px;color:var(--ink-2);margin-top:3px;">Waiting for the admin to start the auction.</div>`}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${isStarted ? CD.Pill({tone:'lime', children: CD.LiveDot() + ' LIVE'}) : ''}
          ${releaseLocked ? CD.Pill({tone:'red', children:'Release locked'}) : ''}
          ${squadLocked ? CD.Pill({tone:'pink', children:'Squad locked'}) : ''}
          ${isAdmin && !isStarted && members.length >= 2 ? `<button onclick="window.initializeAuctionData()" style="padding:10px 20px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 24px rgba(182,255,60,0.3);display:inline-flex;align-items:center;gap:6px;">${I('check',14)} Start Auction</button>` : ''}
        </div>
      </div>

      <!-- Invite link + team registration -->
      <div style="display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1fr 1fr'};gap:14px;margin-bottom:18px;">
        <div style="padding:18px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);">
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Invite teams</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
            <input value="${esc(inviteUrl)}" readonly onclick="this.select()" style="flex:1;padding:9px 12px;font-size:11px;color:var(--ink-2);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--mono);"/>
            <button onclick="window.copyInviteLink && window.copyInviteLink()" style="padding:9px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;">${I('copy',12)} Copy</button>
          </div>
          <div style="font-size:11px;color:var(--mute);">Share this link with anyone you want to invite. They'll land on the room and can register a team.</div>
        </div>
        <div style="padding:18px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);">
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Your registration</div>
          ${myRegistered ? `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              ${CD.Avatar({name: window.myTeamName, size:40})}
              <div>
                <div class="ed" style="font-size:20px;line-height:1;">${esc(window.myTeamName)}</div>
                <div style="font-size:11px;color:var(--mute);margin-top:2px;">Registered · ₹${(teams[window.myTeamName]?.budget || budget).toFixed(1)}cr purse</div>
              </div>
            </div>
          ` : `
            <div style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">You haven't registered a team yet. Pick a name to start bidding.</div>
            <button onclick="document.getElementById('teamNameModal')?.classList.add('open')" style="padding:10px 18px;border-radius:9999px;background:linear-gradient(180deg,var(--pink-2),var(--pink));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;">Register my team</button>
          `}
        </div>
      </div>

      ${(isSuper || isAdmin) ? `
      <!-- Admin controls (always visible to admin/super, regardless of registration) -->
      <div style="padding:16px 20px;border-radius:14px;background:var(--glass);border:1px solid var(--line-2);margin-bottom:18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <div style="font-size:10px;color:var(--gold);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-right:6px;">Admin controls</div>
        ${isSuper ? `<button onclick="window.toggleReleaseLock_A && window.toggleReleaseLock_A()" style="padding:8px 14px;border-radius:9999px;background:${releaseLocked?'rgba(255,59,59,0.18)':'var(--glass-2)'};border:1px solid ${releaseLocked?'rgba(255,59,59,0.4)':'var(--line-2)'};color:${releaseLocked?'var(--red)':'var(--ink-2)'};font-size:11px;font-weight:600;cursor:pointer;">${releaseLocked?'Unlock releases (allow)':'Lock releases (disallow)'}</button>` : ''}
        ${isAdmin ? `<button onclick="window.toggleSquadLock_A && window.toggleSquadLock_A()" style="padding:8px 14px;border-radius:9999px;background:${squadLocked?'rgba(255,45,135,0.18)':'var(--glass-2)'};border:1px solid ${squadLocked?'rgba(255,45,135,0.4)':'var(--line-2)'};color:${squadLocked?'var(--pink)':'var(--ink-2)'};font-size:11px;font-weight:600;cursor:pointer;">${squadLocked?'Unlock squads':'Lock squads'}</button>` : ''}
      </div>
      ` : ''}

      <!-- Members list -->
      <div style="padding:20px 24px;border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div class="ed" style="font-size:24px;">Members <span class="ed-i" style="color:var(--mute);font-size:18px;">${members.length} / ${maxTeams}</span></div>
          <div style="display:flex;gap:4px;">
            ${Array.from({length: maxTeams}).map((_, i) => `<div style="width:18px;height:4px;border-radius:2px;background:${i < members.length ? 'var(--lime)' : 'rgba(255,255,255,0.1)'};"></div>`).join('')}
          </div>
        </div>
        ${members.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${members.map(m => `
            <div style="padding:14px;border-radius:14px;background:${m.uid === window.user?.uid ? 'rgba(182,255,60,0.08)' : 'var(--glass)'};border:1px solid ${m.uid === window.user?.uid ? 'rgba(182,255,60,0.3)' : 'var(--line)'};display:flex;align-items:center;gap:10px;">
              ${CD.Avatar({name: m.teamName, size: 36})}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(m.teamName)}</div>
                <div style="font-size:11px;color:var(--mute);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(m.email || '—')}</div>
              </div>
              ${m.uid === window.user?.uid ? CD.Pill({tone:'lime', style:'font-size:9px;padding:2px 6px;', children:'YOU'}) : ''}
            </div>
          `).join('')}
          ${Array.from({length: Math.max(0, maxTeams - members.length)}).map(() => `
            <div style="padding:14px;border-radius:14px;background:rgba(255,255,255,0.02);border:1px dashed var(--line-2);display:flex;align-items:center;gap:10px;opacity:0.5;">
              <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;color:var(--mute);">${I('plus', 18)}</div>
              <div style="font-size:12px;color:var(--mute);">Open slot</div>
            </div>
          `).join('')}
        </div>` : `<div style="padding:30px;text-align:center;color:var(--mute);">No members yet — share the invite link above.</div>`}
      </div>
    `;
  };

  CD.renderAuctionLive = () => {
    const rs = window.roomState || {};
    const block = rs.currentBlock || {};
    const teams = rs.teams || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    const isAdmin = window.isAdmin || false;

    if(!block.active){
      return `
        <div class="cd-glass-2" style="padding:48px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);text-align:center;">
          <div style="margin:0 auto 18px;width:60px;height:60px;border-radius:50%;background:rgba(255,45,135,0.15);display:flex;align-items:center;justify-content:center;color:var(--pink);">${I('gavel',32)}</div>
          <div class="ed" style="font-size:36px;line-height:1;">No player <span class="ed-i" style="color:var(--pink);">on the block</span></div>
          <p style="margin-top:12px;color:var(--ink-2);font-size:14px;">${isAdmin ? 'Pull a player to start bidding.' : 'Waiting for the admin to pull a player…'}</p>
          ${isAdmin ? `
            <div style="display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap;">
              <button onclick="window.pullRandomPlayer()" style="padding:12px 22px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 6px 24px rgba(46,91,255,0.4);">${I('plus',14)} Pull Random Player</button>
              <select id="manualPlayerSelect" style="padding:10px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;">
                <option value="">-- Select player --</option>
                ${players.filter(p => p.status === 'available' || p.status === 'unsold').slice(0, 100).map(p => `<option value="${p.id}">${esc(p.name || p.n)} (${esc(p.iplTeam || p.t)})</option>`).join('')}
              </select>
              <button onclick="window.pullSpecificPlayer()" style="padding:12px 22px;border-radius:9999px;background:var(--glass-2);border:1px solid var(--line-2);color:var(--ink);font-weight:600;font-size:13px;cursor:pointer;">Pull Selected</button>
            </div>
          ` : ''}
        </div>
        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
          ${CD.Stat({val: players.filter(p=>p.status==='available').length, lbl:'Available', accent:'var(--lime)'})}
          ${CD.Stat({val: players.filter(p=>p.status==='sold').length, lbl:'Sold', accent:'var(--electric)'})}
          ${CD.Stat({val: players.filter(p=>p.status==='unsold').length, lbl:'Unsold', accent:'var(--gold)'})}
          ${CD.Stat({val: Object.keys(teams).length, lbl:'Teams', accent:'var(--pink)'})}
        </div>
      `;
    }

    // Active block
    const pid = String(block.playerId);
    const player = players.find(p => String(p.id) === pid) || {};
    const pName = player.name || player.n || 'Unknown';
    const pTeam = player.iplTeam || player.t || '';
    const pRole = player.role || player.r || '';
    const pIsOs = !!(player.isOverseas || player.o);
    const code = teamCode(pTeam);
    const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
    const curBid = (block.currentBid != null ? block.currentBid : (player.basePrice || 0));
    const leader = block.lastBidderTeam || '';
    const myTeam = window.myTeamName || '';
    const myT = teams[myTeam] || {};
    const niMap = block.notInterested || {};
    const allTeams = Object.values(teams);
    const amLeader = leader === myTeam;
    const amOut = !!niMap[myTeam];

    // Bid increments
    const incs = [];
    let inc = curBid < 3 ? 0.25 : curBid < 10 ? 0.5 : 1.0;
    let next = parseFloat((curBid + inc).toFixed(2));
    while(incs.length < 6){
      incs.push({ raise: parseFloat((next - curBid).toFixed(2)), amount: next });
      if(next < 3) inc = 0.25;
      else if(next < 10) inc = 0.5;
      else inc = 1.0;
      next = parseFloat((next + inc).toFixed(2));
    }

    const firstName = pName.split(' ')[0];
    const lastName = pName.split(' ').slice(1).join(' ');

    return `
      <div style="position:relative;border-radius:28px;overflow:hidden;background:radial-gradient(ellipse 80% 60% at 70% 20%,rgba(255,45,135,0.25),transparent 60%),radial-gradient(ellipse 90% 70% at 20% 80%,rgba(46,91,255,0.35),transparent 60%),linear-gradient(135deg,${c1}30,${c2}50);border:1px solid var(--line-2);box-shadow:var(--sh-2);padding:36px;min-height:380px;">
        <div style="position:absolute;top:-100px;left:30%;width:300px;height:600px;background:radial-gradient(ellipse at top,rgba(255,255,255,0.12),transparent 60%);transform:rotate(15deg);pointer-events:none;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;position:relative;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            ${CD.Pill({tone:'pink', children: CD.LiveDot() + ' ON THE BLOCK'})}
            ${pIsOs ? CD.Pill({tone:'gold', children:'★ OVERSEAS'}) : CD.Pill({children:'INDIAN'})}
            ${player.basePrice ? CD.Pill({children:'BASE ₹' + player.basePrice + 'cr'}) : ''}
          </div>
          ${isAdmin ? `<div style="display:flex;gap:6px;">
            <button onclick="window.markUnsold()" style="padding:8px 14px;border-radius:9999px;background:rgba(255,59,59,0.18);border:1px solid rgba(255,59,59,0.4);color:var(--red);font-size:12px;font-weight:600;cursor:pointer;">Unsold</button>
            <button onclick="window.sellPlayer()" style="padding:8px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-size:12px;font-weight:700;cursor:pointer;">SOLD</button>
          </div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1.4fr 1fr'};gap:32px;align-items:center;position:relative;">
          <div>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
              ${CD.Avatar({team: pTeam, name: pName, size: 64})}
              <div>
                ${CD.TeamChip({code: pTeam, label: pTeam})}
                <div style="font-size:11px;color:var(--ink-2);margin-top:6px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">${esc(pRole)}</div>
              </div>
            </div>
            <div class="ed" style="font-size:${CD.state.isMobile ? 48 : 76}px;line-height:0.85;">${esc(firstName)}</div>
            ${lastName ? `<div class="ed-i" style="font-size:${CD.state.isMobile ? 48 : 76}px;line-height:0.85;color:var(--pink);font-style:italic;font-weight:500;">${esc(lastName)}</div>` : ''}
          </div>
          <div style="text-align:${CD.state.isMobile ? 'left' : 'right'};">
            <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Current Bid</div>
            <div style="font-family:var(--display);font-size:${CD.state.isMobile ? 64 : 96}px;line-height:0.85;font-weight:800;background:linear-gradient(180deg,#fff,var(--lime));-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 30px rgba(182,255,60,0.3));">
              <span style="font-family:var(--serif);font-size:${CD.state.isMobile ? 32 : 44}px;vertical-align:top;margin-right:4px;color:#fff;-webkit-text-fill-color:#fff;">₹</span>${curBid.toFixed(2)}<span style="font-size:${CD.state.isMobile ? 24 : 32}px;color:var(--mute);-webkit-text-fill-color:var(--mute);">cr</span>
            </div>
            ${leader ? `<div style="display:flex;align-items:center;gap:8px;margin-top:14px;${CD.state.isMobile ? '' : 'justify-content:flex-end;'}">${CD.TeamChip({code: leader, label: leader})}<span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Leads</span></div>` : '<div style="font-size:11px;color:var(--mute);margin-top:10px;">No bids yet</div>'}
          </div>
        </div>
      </div>

      ${myTeam ? `
      <div style="display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1.6fr 1fr'};gap:20px;margin-top:20px;">
        <div class="cd-glass-2" style="padding:22px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">${amOut ? 'You opted out' : amLeader ? 'You are leading' : 'Place your bid'}</div>
            <div style="font-size:11px;color:var(--mute);">Purse left: <span style="color:var(--lime);font-weight:700;font-family:var(--mono);">₹${(myT.budget||0).toFixed(2)}cr</span></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(${CD.state.isMobile ? 3 : 6},1fr);gap:8px;">
            ${incs.map((b,i) => {
              const exceeds = b.amount > (myT.budget || 0);
              return `<button onclick="window.addBid(${b.raise})" ${exceeds || amOut ? 'disabled' : ''} style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:64px;padding:8px 4px;gap:2px;background:${exceeds || amOut ? 'rgba(255,255,255,0.04)' : 'var(--glass)'};border:1px solid ${exceeds || amOut ? 'var(--line)' : 'var(--line-2)'};border-radius:14px;cursor:${exceeds || amOut ? 'not-allowed' : 'pointer'};opacity:${exceeds || amOut ? 0.4 : 1};color:var(--ink);font-family:inherit;">
                <span style="font-size:9px;color:var(--mute);letter-spacing:0.1em;font-weight:700;">+${b.raise.toFixed(2)}</span>
                <span style="font-family:var(--display);font-size:18px;font-weight:800;color:${i === 0 ? 'var(--lime)' : 'var(--ink)'};">₹${b.amount.toFixed(2)}</span>
              </button>`;
            }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
            <button onclick="window.pressNotInterested()" ${amOut ? 'disabled' : ''} style="padding:12px;border-radius:9999px;background:rgba(255,59,59,0.18);border:1px solid rgba(255,59,59,0.4);color:var(--red);font-weight:600;font-size:13px;cursor:${amOut?'default':'pointer'};opacity:${amOut?0.6:1};">${amOut ? 'Already opted out' : 'Not interested'}</button>
            ${isAdmin ? `<button onclick="window.sellPlayer()" style="padding:12px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-weight:800;font-size:13px;cursor:pointer;">${I('check',14)} SOLD</button>` : `<div style="padding:12px;text-align:center;color:var(--mute);font-size:12px;">Admin will finalize</div>`}
          </div>
        </div>

        <div class="cd-glass-2" style="padding:20px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);">
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:12px;">Live Bidders · ${allTeams.length}</div>
          ${allTeams.map(t => {
            const isOut = !!niMap[t.name];
            const isLead = leader === t.name;
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);opacity:${isOut?0.4:1};">
              ${CD.Avatar({name: t.name, size: 28})}
              <div style="flex:1;font-size:13px;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.name)}</div>
              <div style="font-family:var(--mono);font-size:12px;color:${isOut?'var(--mute)':'var(--lime)'};">₹${(t.budget||0).toFixed(1)}cr</div>
              ${isLead ? CD.Pill({tone:'lime', style:'font-size:9px;padding:2px 6px;', children:'LEAD'}) : ''}
              ${isOut ? CD.Pill({style:'font-size:9px;padding:2px 6px;', children:'PASS'}) : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : `<div style="padding:24px;color:var(--mute);font-size:13px;text-align:center;background:var(--glass);border-radius:14px;border:1px solid var(--line);margin-top:14px;">Register your team to bid.</div>`}
    `;
  };

  CD.renderPurses = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const initial = rs.budget || rs.setup?.budget || 100;
    const isAdmin = window.isAdmin || false;
    const isSuper = window.user?.email && (typeof window.isSuperAdminEmail === 'function' ? window.isSuperAdminEmail(window.user.email) : window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com');
    const releaseLocked = !!rs.releaseLocked;
    const maxPlayers = rs.maxPlayers || rs.setup?.maxPlayers || 21;
    const arr = Object.values(teams);
    if(!arr.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div style="margin:0 auto 12px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--mute);">${I('users',24)}</div><div class="ed" style="font-size:20px;margin-bottom:4px;">No teams yet</div><div style="font-size:13px;color:var(--mute);">Teams will appear here once they join.</div></div>`;

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;">
        ${arr.map(t => {
          const code = teamCode(t.name);
          const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
          const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
          const spent = roster.reduce((s,p) => s + (p.soldPrice || 0), 0);
          const left = t.budget || 0;
          const pct = initial > 0 ? Math.min(100, (spent / initial) * 100) : 0;
          const overseas = roster.filter(p => p.isOverseas || p.o).length;
          const isMyTeam = t.name === window.myTeamName;
          return `
            <div style="border-radius:20px;overflow:hidden;border:1px solid var(--line-2);background:var(--glass);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:var(--sh-1);position:relative;${isMyTeam ? 'outline:2px solid var(--lime);outline-offset:-2px;' : ''}">
              <!-- Team color header -->
              <div style="padding:18px 18px 16px;background:linear-gradient(135deg,${c1}55,${c2}35);position:relative;border-bottom:1px solid var(--line);">
                <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:16px 16px;mask-image:radial-gradient(ellipse at top right,black 20%,transparent 70%);-webkit-mask-image:radial-gradient(ellipse at top right,black 20%,transparent 70%);pointer-events:none;"></div>
                <div style="display:flex;align-items:center;gap:12px;position:relative;">
                  ${CD.Avatar({name: t.name, size: 48})}
                  <div style="flex:1;min-width:0;">
                    <div class="ed" style="font-size:20px;line-height:1.05;font-weight:800;letter-spacing:-0.02em;">${esc(t.name)}</div>
                    <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                      ${CD.Pill({children: roster.length + ' / ' + maxPlayers + ' players'})}
                      ${overseas ? CD.Pill({tone:'gold', style:'font-size:10px;padding:2px 7px;', children: overseas + ' OS'}) : ''}
                      ${isMyTeam ? CD.Pill({tone:'lime', style:'font-size:10px;padding:2px 7px;', children:'YOU'}) : ''}
                    </div>
                  </div>
                </div>
              </div>
              <!-- Purse stats -->
              <div style="padding:16px 18px;border-bottom:1px solid var(--line);">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
                  <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Purse left</span>
                  <span style="font-family:var(--mono);font-size:11px;color:var(--mute);">of ₹${initial}cr</span>
                </div>
                <div style="font-family:var(--display);font-size:34px;font-weight:800;color:var(--lime);line-height:1;letter-spacing:-0.01em;">₹${left.toFixed(1)}<span style="font-size:16px;color:var(--mute);margin-left:2px;">cr</span></div>
                <div style="margin-top:12px;height:5px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--electric),var(--pink));border-radius:3px;box-shadow:0 0 8px rgba(46,91,255,0.4);"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mute);margin-top:6px;">
                  <span>Spent <span style="color:var(--ink-2);font-family:var(--mono);">₹${spent.toFixed(1)}cr</span></span>
                  <span>${pct.toFixed(0)}% used</span>
                </div>
              </div>
              <!-- Roster -->
              <div style="padding:14px 18px 18px;">
                <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                  <span>Roster</span>
                  ${roster.length === 0 ? '<span style="color:var(--mute-2);font-size:10px;font-weight:500;letter-spacing:0;text-transform:none;">empty</span>' : ''}
                </div>
                ${roster.length ? `
                <div style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;">
                  ${roster.slice().sort((a,b) => (b.soldPrice||0)-(a.soldPrice||0)).map((p, idx) => {
                    const pName = p.name || p.n || '';
                    const pCode = teamCode(p.iplTeam || p.t);
                    const isOs = !!(p.isOverseas || p.o);
                    const canRelease = (isAdmin || isMyTeam) && (!releaseLocked || isSuper);
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--line);">
                      ${CD.Avatar({team: p.iplTeam || p.t, name: pName, size: 28})}
                      <div style="flex:1;min-width:0;overflow:hidden;">
                        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(pName)}${isOs ? ' <span style="color:var(--gold);font-size:9px;">★</span>' : ''}</div>
                        <div style="font-size:10px;color:var(--mute);letter-spacing:0.04em;">${pCode ? esc(pCode) : '<span style="color:rgba(255,255,255,0.3);">—</span>'} · ${esc(p.role || p.r || '')}</div>
                      </div>
                      <div style="font-family:var(--mono);font-size:11px;color:var(--lime);font-weight:700;">₹${(p.soldPrice||0).toFixed(2)}</div>
                      ${canRelease ? `<button data-team="${esc(t.name)}" data-idx="${idx}" data-name="${esc(pName)}" data-price="${p.soldPrice||0}" onclick="CD.handleRelease(this)" title="Release player" style="padding:4px 6px;border-radius:8px;background:rgba(255,59,59,0.12);border:1px solid rgba(255,59,59,0.3);color:var(--red);font-size:9px;font-weight:600;cursor:pointer;">${I('x',10)}</button>` : ''}
                    </div>`;
                  }).join('')}
                </div>
                ` : `<div style="padding:16px 0;color:var(--mute);font-size:12px;text-align:center;">No players yet</div>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  CD.renderLedger = () => {
    const rs = window.roomState || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    const sold = players.filter(p => p.status === 'sold');
    const sortBy = window._cdLedgerSort || 'price-desc';
    const search = (window._cdLedgerSearch || '').toLowerCase().trim();
    const buyerFilter = window._cdLedgerBuyer || '';

    let filtered = sold.slice();
    if(search) filtered = filtered.filter(p => (p.name||p.n||'').toLowerCase().includes(search) || (p.soldTo||'').toLowerCase().includes(search));
    if(buyerFilter) filtered = filtered.filter(p => p.soldTo === buyerFilter);

    filtered.sort((a,b) => {
      if(sortBy === 'price-desc') return (b.soldPrice||0) - (a.soldPrice||0);
      if(sortBy === 'price-asc') return (a.soldPrice||0) - (b.soldPrice||0);
      if(sortBy === 'name') return (a.name||a.n||'').localeCompare(b.name||b.n||'');
      if(sortBy === 'team') return (a.iplTeam||a.t||'').localeCompare(b.iplTeam||b.t||'');
      return 0;
    });

    const totalSpend = sold.reduce((s,p) => s + (p.soldPrice || 0), 0);
    const avgPrice = sold.length ? totalSpend / sold.length : 0;
    const topSale = sold.length ? Math.max(...sold.map(p => p.soldPrice || 0)) : 0;
    const buyers = [...new Set(sold.map(p => p.soldTo).filter(Boolean))].sort();

    if(!sold.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div style="margin:0 auto 12px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--mute);">${I('gavel',24)}</div><div class="ed" style="font-size:22px;margin-bottom:4px;">No players sold <span class="ed-i" style="color:var(--pink);">yet</span></div><div style="font-size:13px;">Sold players will appear in this ledger once bidding starts.</div></div>`;

    return `
      <!-- Ledger stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:18px;">
        ${CD.Stat({val: sold.length, lbl:'Sold', accent:'var(--electric)'})}
        ${CD.Stat({val: '₹' + totalSpend.toFixed(1) + 'cr', lbl:'Total spend', accent:'var(--pink)'})}
        ${CD.Stat({val: '₹' + avgPrice.toFixed(2) + 'cr', lbl:'Avg price', accent:'var(--lime)'})}
        ${CD.Stat({val: '₹' + topSale.toFixed(1) + 'cr', lbl:'Top sale', accent:'var(--gold)'})}
      </div>

      <!-- Filter + search + CSV -->
      <div style="padding:12px 16px;border-radius:14px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <input id="cdLedgerSearch" placeholder="Search player or buyer…" value="${esc(search)}" oninput="window._cdLedgerSearch=this.value;clearTimeout(window._cdLedgerDb);window._cdLedgerDb=setTimeout(()=>{CD.render();document.getElementById('cdLedgerSearch')?.focus();},150);" style="flex:1;min-width:200px;padding:9px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--sans);" />
        <select onchange="window._cdLedgerBuyer=this.value;CD.render();" style="padding:9px 12px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;min-width:140px;">
          <option value=""${buyerFilter === '' ? ' selected' : ''}>All buyers</option>
          ${buyers.map(b => `<option value="${esc(b)}"${buyerFilter === b ? ' selected' : ''}>${esc(b)}</option>`).join('')}
        </select>
        <select onchange="window._cdLedgerSort=this.value;CD.render();" style="padding:9px 12px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;">
          <option value="price-desc"${sortBy==='price-desc'?' selected':''}>Price: high → low</option>
          <option value="price-asc"${sortBy==='price-asc'?' selected':''}>Price: low → high</option>
          <option value="name"${sortBy==='name'?' selected':''}>Name A-Z</option>
          <option value="team"${sortBy==='team'?' selected':''}>IPL Team</option>
        </select>
        <button onclick="CD.downloadLedgerCSV()" style="padding:9px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(182,255,60,0.25);">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>

      <!-- Ledger table -->
      <div style="border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);overflow:hidden;">
        <div style="padding:16px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);">
          <div class="ed" style="font-size:22px;">Bid <span class="ed-i" style="color:var(--mute);">ledger</span></div>
          <div style="font-size:11px;color:var(--mute);">${filtered.length}${filtered.length !== sold.length ? ' of ' + sold.length : ''} sold</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:rgba(0,0,0,0.2);">
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">#</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">IPL Team</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Role</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Base</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Bought by</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Price</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((p, i) => {
                const name = p.name || p.n || '';
                const isOs = !!(p.isOverseas || p.o);
                const markup = p.basePrice ? ((p.soldPrice||0) / p.basePrice) : 0;
                return `<tr style="border-top:1px solid var(--line);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:11px 14px;font-family:var(--display);font-size:15px;color:var(--mute);">${(i+1).toString().padStart(3,'0')}</td>
                  <td style="padding:11px 14px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${CD.Avatar({team: p.iplTeam || p.t, name, size: 30})}
                      <div>
                        <div style="font-weight:600;">${esc(name)}${isOs ? ' <span style="color:var(--gold);font-size:10px;">★</span>' : ''}</div>
                        ${markup > 1.1 ? `<div style="font-size:10px;color:var(--pink);font-family:var(--mono);">${markup.toFixed(1)}× base</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td style="padding:11px 14px;">${CD.TeamChip({code: p.iplTeam || p.t})}</td>
                  <td style="padding:11px 14px;color:var(--ink-2);font-size:12px;">${esc(p.role || p.r || '—')}</td>
                  <td style="padding:11px 14px;text-align:right;font-family:var(--mono);color:var(--mute);">₹${(p.basePrice||0).toFixed(2)}</td>
                  <td style="padding:11px 14px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      ${p.soldTo ? CD.Avatar({name: p.soldTo, size: 22}) : ''}
                      <span style="font-size:12px;">${esc(p.soldTo || '—')}</span>
                    </div>
                  </td>
                  <td style="padding:11px 14px;text-align:right;font-family:var(--display);font-size:18px;color:var(--lime);font-weight:800;">₹${(p.soldPrice||0).toFixed(1)}<span style="font-size:11px;color:var(--mute);margin-left:2px;">cr</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  CD.downloadLedgerCSV = () => {
    const rs = window.roomState || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    const sold = players.filter(p => p.status === 'sold').sort((a,b) => (b.soldPrice||0) - (a.soldPrice||0));
    if(!sold.length){ window.showAlert?.('No sold players yet.','err'); return; }
    const csvEscape = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [['#','Player','IPL Team','Role','Overseas','Base Price (Cr)','Sold Price (Cr)','Markup','Bought By']];
    sold.forEach((p, i) => {
      const name = p.name || p.n || '';
      const markup = p.basePrice ? ((p.soldPrice||0) / p.basePrice).toFixed(2) + 'x' : '—';
      rows.push([i+1, name, p.iplTeam||p.t||'', p.role||p.r||'', (p.isOverseas||p.o)?'Yes':'No', (p.basePrice||0).toFixed(2), (p.soldPrice||0).toFixed(2), markup, p.soldTo||'']);
    });
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bid-ledger.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(typeof window.showAlert === 'function') window.showAlert('Ledger CSV downloaded', 'ok');
  };

  // My Team — slick cricket pitch view with XI/Bench split + season points
  CD.renderMyTeam = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const myTeam = window.myTeamName || '';
    const t = teams[myTeam];
    if(!t) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">No team <span class="ed-i" style="color:var(--pink);">registered</span></div><div style="font-size:13px;">Register a team to start building your squad.</div></div>`;

    const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
    const spent = roster.reduce((s,p) => s + (p.soldPrice || 0), 0);
    const overseas = roster.filter(p => p.isOverseas || p.o).length;
    const releaseLocked = !!rs.releaseLocked;
    const squadLocked = !!rs.squadLocked;
    const isAdmin = !!window.isAdmin;
    const isSuper = window.user?.email && (typeof window.isSuperAdminEmail === 'function' ? window.isSuperAdminEmail(window.user.email) : window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com');
    const xiMult = parseFloat(rs.xiMultiplier) || 1;

    // If user is in edit mode, render the edit UI instead of the view UI.
    if(CD.state.editingSquad && CD.state.squadDraft){
      return CD._renderMyTeamEdit(t, roster, xiMult);
    }

    // Split roster into XI (first 11 or activeSquad) / Bench (next 5) / Reserves
    const activeSq = Array.isArray(t.activeSquad) ? t.activeSquad : null;
    const rosterNames = roster.map(p => p.name || p.n || '');
    let xiNames, benchNames;
    if(activeSq && activeSq.length) {
      xiNames = activeSq.slice(0, 11);
      benchNames = activeSq.slice(11, 16);
    } else {
      xiNames = rosterNames.slice(0, 11);
      benchNames = rosterNames.slice(11, 16);
    }
    const reserveNames = rosterNames.filter(n => !xiNames.includes(n) && !benchNames.includes(n));
    const canEdit = !squadLocked || isAdmin;

    // squadValid: XI must have 11 and roster must have 11+ to field a side.
    const squadValid = roster.length >= 11 && xiNames.length >= 11;
    const squadIncompleteBanner = (!squadValid && canEdit) ? `
      <div style="margin-bottom:${CD.state.isMobile ? 12 : 16}px;padding:${CD.state.isMobile ? '10px 12px' : '14px 18px'};border-radius:14px;background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.55);display:flex;align-items:center;gap:${CD.state.isMobile ? 8 : 14}px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <div style="font-family:var(--display);font-weight:800;font-size:${CD.state.isMobile ? 12 : 14}px;color:#FF8B8B;letter-spacing:0.02em;">Your XI is incomplete (${xiNames.length}/11)</div>
          <div style="font-size:${CD.state.isMobile ? 10.5 : 11.5}px;color:var(--ink-2);margin-top:3px;">Rebuild your squad to field a full Playing XI. Reserves stay out of scoring.</div>
        </div>
        <button onclick="CD.startEditSquad()" style="padding:${CD.state.isMobile ? '6px 12px' : '8px 16px'};border-radius:9999px;background:linear-gradient(180deg,rgba(255,80,80,0.9),rgba(220,40,40,0.9));color:#fff;border:1px solid rgba(255,120,120,0.55);font-weight:700;font-size:${CD.state.isMobile ? 10.5 : 12}px;cursor:pointer;letter-spacing:0.04em;">Rebuild squad →</button>
      </div>
    ` : '';

    const findP = (name) => roster.find(p => (p.name||p.n||'') === name) || null;
    const xiPlayers = xiNames.map(findP).filter(Boolean);
    const benchPlayers = benchNames.map(findP).filter(Boolean);
    const reservePlayers = reserveNames.map(findP).filter(Boolean);

    // Season points per player (aggregated from matches)
    const matches = rs.matches || {};
    const playerPts = {};
    const playerMc = {};
    Object.values(matches).forEach(m => {
      if(!m.players) return;
      Object.values(m.players).forEach(p => {
        const k = (p.name||'').toLowerCase().trim();
        if(!k) return;
        playerPts[k] = (playerPts[k] || 0) + (p.pts || 0);
        playerMc[k] = (playerMc[k] || 0) + 1;
      });
    });
    const ptsFor = (name) => Math.round(playerPts[(name||'').toLowerCase().trim()] || 0);
    const mcFor = (name) => playerMc[(name||'').toLowerCase().trim()] || 0;

    // Compute season totals for this team
    const xiTotal = xiPlayers.reduce((s,p) => s + ptsFor(p.name||p.n||'') * xiMult, 0);
    const benchTotal = benchPlayers.reduce((s,p) => s + ptsFor(p.name||p.n||''), 0);
    const seasonTotal = Math.round(xiTotal + benchTotal);

    // Group XI by role for pitch positioning (realistic field layout)
    const byRole = { wk: [], bat: [], ar: [], bowl: [] };
    xiPlayers.forEach(p => {
      const r = (p.role || p.r || '').toLowerCase();
      if(r.includes('wicket') || r.includes('keep')) byRole.wk.push(p);
      else if(r.includes('bowl')) byRole.bowl.push(p);
      else if(r.includes('all')) byRole.ar.push(p);
      else byRole.bat.push(p);
    });

    // Responsive pitch-player sizing — mobile gets smaller avatars and
    // tighter pills so 4-5 players in a row don't overlap or wrap ugly.
    const mob = !!CD.state.isMobile;
    const pp = {
      avatar: mob ? 36 : 48,
      minW:   mob ? 58 : 80,
      gap:    mob ? 3 : 5,
      name:   mob ? 9.5 : 11.5,
      nameMx: mob ? 64 : 94,
      pill:   mob ? 10.5 : 13,
      pillPx: mob ? 7 : 11,
      pillPy: mob ? 2 : 3,
      pillMin:mob ? 28 : 38,
      star:   mob ? 12 : 16,
      starFs: mob ? 8 : 10
    };
    const renderPitchPlayer = (p, pos) => {
      const name = p.name || p.n || '';
      const first = name.split(' ')[0];
      const last = name.split(' ').slice(1).join(' ');
      const displayName = last || first;
      const pts = ptsFor(name) * (pos === 'xi' ? xiMult : 1);
      const code = teamCode(p.iplTeam || p.t);
      const isOs = !!(p.isOverseas || p.o);
      const ptsColor = pts > 0 ? 'var(--lime)' : pts < 0 ? '#FFB4B4' : 'rgba(255,255,255,0.85)';
      const ptsBg = pts > 0
        ? 'linear-gradient(180deg,rgba(40,60,20,0.92),rgba(20,40,10,0.95))'
        : pts < 0 ? 'rgba(70,20,20,0.92)' : 'rgba(0,0,0,0.7)';
      const ptsBorder = pts > 0 ? 'rgba(182,255,60,0.65)' : pts < 0 ? 'rgba(255,120,120,0.45)' : 'rgba(255,255,255,0.3)';
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:${pp.gap}px;min-width:${pp.minW}px;cursor:pointer;position:relative;" onclick="window.showPlayerModal && window.showPlayerModal('${esc(name)}')">
          <div style="position:relative;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7));">
            ${CD.Avatar({team: p.iplTeam || p.t, name, size: pp.avatar})}
            ${isOs ? `<div style="position:absolute;top:-2px;right:-2px;width:${pp.star}px;height:${pp.star}px;border-radius:50%;background:var(--gold);color:#000;display:flex;align-items:center;justify-content:center;font-size:${pp.starFs}px;font-weight:800;box-shadow:0 0 0 2px #052918;">★</div>` : ''}
          </div>
          <div style="font-size:${pp.name}px;font-weight:700;color:#fff;text-align:center;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 10px rgba(0,0,0,0.7);max-width:${pp.nameMx}px;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.01em;line-height:1.1;">${esc(displayName)}</div>
          <div style="font-family:var(--display);font-size:${pp.pill}px;font-weight:800;padding:${pp.pillPy}px ${pp.pillPx}px;border-radius:9999px;background:${ptsBg};border:1px solid ${ptsBorder};color:${ptsColor};box-shadow:0 2px 6px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08);min-width:${pp.pillMin}px;text-align:center;line-height:1;">${pts >= 0 ? '+' : ''}${Math.round(pts)}</div>
        </div>
      `;
    };

    const roleRow = (players, gap = 40) => {
      if(!players.length) return '';
      return `<div style="display:flex;justify-content:center;gap:${gap}px;flex-wrap:wrap;">${players.map(p => renderPitchPlayer(p, 'xi')).join('')}</div>`;
    };

    // Mini stat tile for mobile — smaller font + tighter padding so
    // 3 fit per row on a 375px phone without collapsing to a single column.
    const miniStat = (val, lbl, accent) => `
      <div style="padding:8px 10px;border-radius:10px;background:var(--glass);border:1px solid var(--line);position:relative;overflow:hidden;">
        ${accent ? `<div style="position:absolute;top:0;left:8px;right:8px;height:2px;background:${accent};"></div>` : ''}
        <div style="font-family:var(--display);font-size:17px;font-weight:800;color:var(--ink);line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${val}</div>
        <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--mute);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(lbl)}</div>
      </div>`;

    return `
      ${squadIncompleteBanner}
      <!-- Stats banner -->
      <div style="display:grid;grid-template-columns:${mob ? 'repeat(3,1fr)' : 'repeat(auto-fit,minmax(160px,1fr))'};gap:${mob ? 7 : 14}px;margin-bottom:${mob ? 12 : 18}px;">
        ${mob ? miniStat(xiPlayers.length + '+' + benchPlayers.length, 'XI+Bench', 'var(--electric)') : CD.Stat({val: xiPlayers.length + '+' + benchPlayers.length, lbl: 'XI + Bench', accent:'var(--electric)'})}
        ${mob ? miniStat('₹' + (t.budget||0).toFixed(1), 'Purse', 'var(--lime)') : CD.Stat({val: '₹' + (t.budget||0).toFixed(1), lbl:'Purse left (cr)', accent:'var(--lime)'})}
        ${mob ? miniStat('₹' + spent.toFixed(1), 'Spent', 'var(--pink)') : CD.Stat({val: '₹' + spent.toFixed(1), lbl:'Total spent (cr)', accent:'var(--pink)'})}
        ${mob ? miniStat(overseas + '/' + (rs.maxOverseas || 8), 'Overseas', 'var(--gold)') : CD.Stat({val: overseas + '/' + (rs.maxOverseas || 8), lbl:'Overseas', accent:'var(--gold)'})}
        ${mob ? miniStat((seasonTotal>=0?'+':'') + seasonTotal, 'Pts', 'var(--lime)') : CD.Stat({val: (seasonTotal>=0?'+':'') + seasonTotal, lbl:'Season points', accent:'var(--lime)'})}
      </div>

      <!-- Hero: Team name + cricket pitch -->
      <div style="border-radius:${mob ? 16 : 22}px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:${mob ? 14 : 18}px;overflow:hidden;position:relative;">
        <!-- Team header -->
        <div style="padding:${mob ? '12px 14px' : '18px 22px'};display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);position:relative;z-index:2;flex-wrap:wrap;gap:${mob ? 6 : 10}px;">
          <div style="min-width:0;flex:1;">
            <div style="font-size:${mob ? 9 : 10}px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Playing XI${xiMult !== 1 ? ' · ' + xiMult + '×' : ''}</div>
            <div class="ed" style="font-size:${mob ? 22 : 32}px;line-height:1;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.name)}</div>
          </div>
          <div style="display:flex;gap:${mob ? 5 : 8}px;align-items:center;flex-wrap:wrap;flex-shrink:0;">
            ${releaseLocked && !isSuper ? CD.Pill({tone:'red', style: mob?'font-size:9px;padding:2px 7px;':'', children: mob ? 'Locked' : 'Releases locked'}) : ''}
            ${isSuper ? `<button onclick="window.toggleReleaseLock_A && window.toggleReleaseLock_A()" title="${releaseLocked?'Currently LOCKED — click to allow releases':'Currently UNLOCKED — click to disallow releases'}" style="padding:${mob?'4px 9px':'6px 12px'};border-radius:9999px;background:${releaseLocked?'rgba(255,59,59,0.18)':'linear-gradient(180deg,rgba(255,200,61,0.22),rgba(255,200,61,0.08))'};border:1px solid ${releaseLocked?'rgba(255,59,59,0.45)':'rgba(255,200,61,0.55)'};color:${releaseLocked?'#FF8B8B':'#FFE49A'};font-family:var(--sans);font-size:${mob?9:10.5}px;font-weight:800;cursor:pointer;letter-spacing:0.12em;text-transform:uppercase;">${releaseLocked?(mob?'🔒':'🔒 Releases locked'):(mob?'🔓':'🔓 Releases open')}</button>` : ''}
            ${squadLocked && !isAdmin ? CD.Pill({tone:'pink', style: mob?'font-size:9px;padding:2px 7px;':'', children:'Squad locked'}) : ''}
            ${CD.Pill({tone:'lime', style: mob?'font-size:9.5px;padding:2px 8px;':'', children: CD.LiveDot() + ' XI ' + (xiTotal>=0?'+':'') + Math.round(xiTotal)})}
            ${canEdit && roster.length > 0 ? `<button onclick="CD.startEditSquad()" style="padding:${mob ? '6px 10px' : '8px 14px'};border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-size:${mob ? 10.5 : 12}px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 4px 16px rgba(46,91,255,0.35);">${I('edit',mob ? 10 : 12)} ${mob ? 'Edit' : 'Edit squad'}</button>` : ''}
          </div>
        </div>

        <!-- Cricket pitch — role-sorted rows (WK → BAT → AR → BOWL) -->
        <div style="position:relative;min-height:${mob ? 600 : 680}px;background:
          radial-gradient(ellipse 80% 100% at 50% 50%, #0d6638 0%, #052918 65%, #0A0B12 100%),
          #052918;
          overflow:visible;">

          <!-- Field ring (boundary) -->
          <div style="position:absolute;inset:${mob ? 14 : 22}px;border-radius:50%;border:${mob?1:2}px dashed rgba(255,255,255,0.18);pointer-events:none;"></div>
          <!-- Inner circle (30-yard) -->
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${mob ? 82 : 74}%;height:${mob ? 74 : 80}%;border-radius:50%;border:1px solid rgba(255,255,255,0.10);pointer-events:none;"></div>

          <!-- Players organized in 4 horizontal role rows -->
          ${xiPlayers.length === 0 ? '' : (() => {
            const rowLabel = (txt, color) => `<div style="font-size:${mob?8.5:10}px;color:${color};letter-spacing:0.16em;text-transform:uppercase;font-weight:800;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.9);margin-bottom:${mob?4:6}px;">${txt}</div>`;
            const roleRow2 = (label, color, players) => {
              if(!players.length) return '';
              return `<div style="position:relative;z-index:3;">
                ${rowLabel(label, color)}
                <div style="display:flex;justify-content:center;gap:${mob?10:28}px;flex-wrap:wrap;align-items:flex-start;padding:0 ${mob?6:18}px;">
                  ${players.map(p => renderPitchPlayer(p, 'xi')).join('')}
                </div>
              </div>`;
            };
            return `
              <div style="position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:${mob?14:20}px;padding:${mob?'28px 6px 36px':'38px 22px 48px'};min-height:${mob?600:680}px;box-sizing:border-box;">
                ${roleRow2('Wicketkeeper', 'rgba(255,215,125,0.92)', byRole.wk)}
                ${roleRow2('Batsmen',      'rgba(120,180,255,0.95)', byRole.bat)}
                ${roleRow2('All-rounders', 'rgba(182,255,60,0.92)',  byRole.ar)}
                ${roleRow2('Bowlers',      'rgba(255,120,180,0.95)', byRole.bowl)}
              </div>
            `;
          })()}

          ${xiPlayers.length === 0 ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4;"><div style="padding:24px 36px;border-radius:16px;background:rgba(0,0,0,0.65);backdrop-filter:blur(16px);text-align:center;border:1px solid rgba(255,255,255,0.14);"><div class="ed" style="font-size:28px;color:#fff;">Empty <span class="ed-i" style="color:var(--pink);">pitch</span></div><div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:6px;">Bid on players to build your XI.</div></div></div>` : ''}
        </div>
      </div>

      <!-- Bench -->
      ${benchPlayers.length ? `
      <div style="border-radius:18px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);margin-bottom:16px;overflow:hidden;">
        <div style="padding:14px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
          <div class="ed" style="font-size:20px;">Bench <span class="ed-i" style="color:var(--mute);font-size:16px;">1×</span></div>
          <span style="font-family:var(--display);font-weight:800;color:${benchTotal>0?'var(--lime)':'var(--mute)'};">${benchTotal>=0?'+':''}${Math.round(benchTotal)} pts</span>
        </div>
        <div style="padding:14px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
          ${benchPlayers.map((p, idx) => CD._renderRosterCard(p, 'bench', t.name, xiPlayers.length + idx, releaseLocked, isSuper, ptsFor, mcFor)).join('')}
        </div>
      </div>` : ''}

      <!-- Reserves -->
      ${reservePlayers.length ? `
      <div style="border-radius:18px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);margin-bottom:16px;overflow:hidden;">
        <div style="padding:14px 20px;border-bottom:1px solid var(--line);">
          <div class="ed" style="font-size:20px;">Reserves <span class="ed-i" style="color:var(--mute);font-size:16px;">0×</span></div>
        </div>
        <div style="padding:14px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">
          ${reservePlayers.map((p, idx) => CD._renderRosterCard(p, 'reserve', t.name, xiPlayers.length + benchPlayers.length + idx, releaseLocked, isSuper, ptsFor, mcFor)).join('')}
        </div>
      </div>` : ''}
    `;
  };

  // Helper for roster cards in bench/reserve — includes small role/OS pills
  CD._renderRosterCard = (p, section, teamName, idx, releaseLocked, isSuper, ptsFor, mcFor) => {
    const name = p.name || p.n || '';
    const code = teamCode(p.iplTeam || p.t);
    const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
    const isOs = !!(p.isOverseas || p.o);
    const pts = ptsFor(name);
    const mc = mcFor(name);
    const role = p.role || p.r || '';
    const roleShort = role.toLowerCase().includes('bowl') ? 'BOWL' : role.toLowerCase().includes('wicket') || role.toLowerCase().includes('keep') ? 'WK' : role.toLowerCase().includes('all') ? 'AR' : 'BAT';
    const roleTone = roleShort==='BOWL'?'pink':roleShort==='WK'?'gold':roleShort==='AR'?'lime':'electric';
    return `<div style="padding:10px;border-radius:12px;background:linear-gradient(135deg,${c1}20,${c2}10);border:1px solid var(--line);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${CD.Avatar({team: p.iplTeam || p.t, name, size: 34})}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:12.5px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(name)}</div>
          <div style="display:flex;gap:3px;align-items:center;margin-top:3px;flex-wrap:wrap;">
            ${CD.TeamCodePill(p.iplTeam || p.t)}
            ${CD.Pill({tone:roleTone, style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: roleShort})}
            ${isOs ? CD.Pill({tone:'gold', style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: '★ OS'}) : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap;">
        <span style="font-family:var(--mono);color:var(--mute);">₹${(p.soldPrice||0).toFixed(2)}</span>
        <span style="font-family:var(--display);font-weight:800;color:${pts>0?'var(--lime)':pts<0?'var(--red)':'var(--mute)'};">${pts>=0?'+':''}${pts}${mc?' <span style="color:var(--mute);font-weight:500;font-size:10px;">· '+mc+'m</span>':''}</span>
        <div style="display:flex;gap:5px;margin-left:auto;">
          ${isSuper ? `<button onclick="window.saReplacePlayerA && window.saReplacePlayerA('${esc(teamName)}','${esc(name)}',${isOs?'true':'false'},${(p.soldPrice||0)})" style="padding:3px 8px;border-radius:9999px;background:rgba(255,200,61,0.12);border:1px solid rgba(255,200,61,0.45);color:#FFD97D;font-size:10px;font-weight:600;cursor:pointer;">Replace</button>` : ''}
          ${(!releaseLocked || isSuper) ? `<button data-team="${esc(teamName)}" data-idx="${idx}" data-name="${esc(name)}" data-price="${p.soldPrice||0}" onclick="CD.handleRelease(this)" style="padding:3px 8px;border-radius:9999px;background:rgba(255,59,59,0.12);border:1px solid rgba(255,59,59,0.3);color:var(--red);font-size:10px;font-weight:600;cursor:pointer;">Release</button>` : ''}
        </div>
      </div>
    </div>`;
  };

  // ── SUPER ADMIN · Replace player overlay (auction) ─────────────
  CD.openReplaceA = (teamName, oldName, wasOverseas, price) => {
    CD._replaceA = { teamName, oldName, wasOverseas:!!wasOverseas, price:+price||0, filter:'All' };
    CD._renderReplaceAOverlay();
  };
  CD.closeReplaceA = () => {
    CD._replaceA = null;
    const el = document.getElementById('cd-replace-a-overlay');
    if(el) el.remove();
  };
  CD.setReplaceAFilter = (role) => {
    if(!CD._replaceA) return;
    CD._replaceA.filter = role;
    CD._renderReplaceAOverlay();
  };
  CD.confirmReplaceA = (newId, newName) => {
    const ctx = CD._replaceA;
    if(!ctx) return;
    if(!confirm(`Replace ${ctx.oldName} with ${newName}?\n\n• ${newName} joins ${ctx.teamName} at ₹${ctx.price.toFixed(2)} Cr (same price — budget unchanged)\n• ${ctx.oldName} returns to the unsold pool\n• All match points already earned by ${ctx.oldName} stay with ${ctx.teamName}`)) return;
    if(typeof window.saExecuteReplaceA !== 'function'){
      window.showAlert?.('Replace handler not available.');
      return;
    }
    window.saExecuteReplaceA(ctx.teamName, ctx.oldName, newId)
      .then(() => { CD.closeReplaceA(); })
      .catch(e => window.showAlert?.('Replace failed: ' + (e.message||e), 'err'));
  };
  CD._renderReplaceAOverlay = () => {
    const ctx = CD._replaceA;
    if(!ctx) return;
    const rs = window.roomState || {};
    const players = rs.players ? Object.values(rs.players) : [];
    let avail = players.filter(p => !(p.status==='sold' || p.soldTo));
    const roleSet = new Set();
    players.forEach(p => { if(p.role) roleSet.add(p.role); });
    const roles = ['All', ...Array.from(roleSet).sort()];
    if(ctx.filter !== 'All') avail = avail.filter(p => (p.role||'') === ctx.filter);
    // Sort: highest base price / alphabetical
    avail.sort((a,b) => String(a.name||'').localeCompare(String(b.name||'')));
    const existing = document.getElementById('cd-replace-a-overlay');
    if(existing) existing.remove();
    const rowBtn = (r) => `<button onclick="CD.setReplaceAFilter('${r.replace(/'/g,"\\'")}')" style="padding:6px 12px;border-radius:9999px;background:${ctx.filter===r?'linear-gradient(180deg,rgba(255,200,61,0.25),rgba(255,200,61,0.1))':'var(--glass)'};color:${ctx.filter===r?'#FFE49A':'var(--ink-2)'};border:1px solid ${ctx.filter===r?'rgba(255,200,61,0.55)':'var(--line-2)'};font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.04em;">${r}</button>`;
    const playerBtn = (p) => {
      const pname = p.name || p.n || '';
      const code = p.iplTeam || p.t || '';
      const role = p.role || '';
      const isOs = !!p.isOverseas;
      return `<button onclick="CD.confirmReplaceA('${String(p.id).replace(/'/g,"\\'")}','${pname.replace(/'/g,"\\'")}')" style="display:flex;gap:10px;align-items:center;width:100%;padding:10px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line);margin-bottom:6px;cursor:pointer;text-align:left;transition:border-color .15s, background .15s;" onmouseover="this.style.borderColor='rgba(255,200,61,0.5)';this.style.background='rgba(255,200,61,0.06)'" onmouseout="this.style.borderColor='var(--line)';this.style.background='var(--glass)'">
        ${CD.Avatar({team: code, name: pname, size: 32})}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pname}${isOs ? ' <span style="color:var(--gold);font-size:10px;">★</span>' : ''}</div>
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.04em;">${code || '—'} · ${role || '—'}</div>
        </div>
        <span style="font-family:var(--sans);font-size:10px;color:var(--electric);font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Pick</span>
      </button>`;
    };
    const html = `<div id="cd-replace-a-overlay" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.74);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)CD.closeReplaceA()">
      <div style="background:var(--glass-2,rgba(22,24,38,0.92));backdrop-filter:blur(32px) saturate(1.5);-webkit-backdrop-filter:blur(32px) saturate(1.5);border:1px solid var(--line-2);border-radius:22px;max-width:680px;width:100%;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--sh-2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
          <div style="flex:1;min-width:0;">
            <div class="ed" style="font-size:24px;line-height:1;">Replace <span class="ed-i" style="color:var(--gold);">player</span></div>
            <div style="font-size:10px;color:var(--gold);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-top:6px;">${ctx.oldName} · ${ctx.teamName} · ₹${ctx.price.toFixed(2)} Cr</div>
            <div style="font-size:11px;color:var(--mute);margin-top:8px;line-height:1.5;">Price stays ₹${ctx.price.toFixed(2)} Cr. Points history preserved.</div>
          </div>
          <button onclick="CD.closeReplaceA()" style="background:var(--glass);border:1px solid var(--line-2);color:var(--mute);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;flex-shrink:0;">×</button>
        </div>
        <div style="padding:12px 24px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line);">
          ${roles.map(rowBtn).join('')}
        </div>
        <div style="flex:1;overflow-y:auto;padding:14px 20px;">
          ${avail.length===0 ? '<div style="padding:40px;text-align:center;color:var(--mute);font-size:13px;">No available players match this filter.</div>' : avail.slice(0,250).map(playerBtn).join('')}
          ${avail.length>250 ? '<div style="padding:12px;text-align:center;color:var(--mute);font-size:11px;">Showing first 250. Use the role filter to narrow.</div>' : ''}
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  };

  // ───────────────────────────────────────────────────────────────
  // MY TEAM — Edit squad mode (click-to-move between XI/Bench/Reserves)
  // ───────────────────────────────────────────────────────────────
  CD.startEditSquad = () => {
    const rs = window.roomState || {};
    const myTeam = window.myTeamName || '';
    const t = rs.teams?.[myTeam];
    if(!t){ window.showAlert?.('No team registered.'); return; }
    if(rs.squadLocked && !window.isAdmin){
      window.showAlert?.('Squad changes are locked by admin.');
      return;
    }
    const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
    const allNames = roster.map(p => p.name || p.n || '').filter(Boolean);
    const activeSq = Array.isArray(t.activeSquad) ? t.activeSquad : null;
    // Seed draft from activeSquad if present, otherwise from roster order.
    const xi = (activeSq && activeSq.length
      ? activeSq.slice(0, 11)
      : allNames.slice(0, Math.min(11, allNames.length))
    ).filter(n => allNames.indexOf(n) >= 0);
    const bench = (activeSq && activeSq.length
      ? activeSq.slice(11, 16)
      : allNames.slice(11, 16)
    ).filter(n => allNames.indexOf(n) >= 0 && xi.indexOf(n) < 0);
    const assigned = new Set(xi.concat(bench));
    const reserves = allNames.filter(n => !assigned.has(n));
    CD.state.squadDraft = { xi, bench, reserves };
    CD.state.editingSquad = true;
    CD.render();
  };

  CD.cancelEditSquad = () => {
    CD.state.editingSquad = false;
    CD.state.squadDraft = null;
    CD.render();
  };

  // Delegated click handler — reads data attrs so player names with
  // apostrophes don't break the inline onclick string context.
  CD.squadMoveFromEl = (el) => {
    if(!el) return;
    const name = el.getAttribute('data-name');
    const dest = el.getAttribute('data-dest');
    if(name && dest) CD.squadMove(name, dest);
  };

  // Move a player to a destination section in the working draft.
  // Respects target-size caps: tapping "XI" when XI is full (11) shows
  // a shake-flash; user has to drop someone first.
  CD.squadMove = (name, dest) => {
    const d = CD.state.squadDraft;
    if(!d) return;
    const XI_MAX = 11, BENCH_MAX = 5;
    const current = d.xi.includes(name) ? 'xi' : d.bench.includes(name) ? 'bench' : 'reserves';
    if(current === dest) return;
    if(dest === 'xi' && d.xi.length >= XI_MAX){
      CD._flashSection('xi');
      return;
    }
    if(dest === 'bench' && d.bench.length >= BENCH_MAX){
      CD._flashSection('bench');
      return;
    }
    // Remove from current
    d.xi = d.xi.filter(n => n !== name);
    d.bench = d.bench.filter(n => n !== name);
    d.reserves = d.reserves.filter(n => n !== name);
    // Add to destination (append to keep user ordering stable)
    if(dest === 'xi') d.xi.push(name);
    else if(dest === 'bench') d.bench.push(name);
    else d.reserves.push(name);
    CD.render();
  };

  // Flash a section banner red when at-capacity
  CD._flashSection = (which) => {
    const el = document.getElementById('cd-squad-cap-' + which);
    if(!el) return;
    el.style.animation = 'none';
    // Force reflow so the animation restarts
    void el.offsetWidth;
    el.style.animation = 'cd-shake 0.4s';
  };

  CD.saveEditSquad = async () => {
    if(!CD.state.squadDraft) return;
    if(CD.state.squadSaving) return;
    if(typeof window.saveSquadCD !== 'function'){
      window.showAlert?.('Save not available — reload the page.');
      return;
    }
    CD.state.squadSaving = true;
    CD.render();
    const { xi, bench } = CD.state.squadDraft;
    const result = await window.saveSquadCD(xi, bench);
    CD.state.squadSaving = false;
    if(result?.ok){
      CD.state.editingSquad = false;
      CD.state.squadDraft = null;
      window.showAlert?.('Squad saved!', 'ok');
    } else {
      window.showAlert?.('Save failed: ' + (result?.error || 'Unknown error'));
    }
    CD.render();
  };

  CD._renderMyTeamEdit = (t, roster, xiMult) => {
    const d = CD.state.squadDraft;
    const saving = !!CD.state.squadSaving;
    const validate = typeof window.validateSquadCD === 'function'
      ? window.validateSquadCD(d.xi, d.bench)
      : { ok: true, errors: [] };
    const XI_MAX = Math.min(11, roster.length);
    const BENCH_MAX = roster.length > 11 ? Math.min(5, roster.length - 11) : 0;

    const findP = (name) => roster.find(p => (p.name || p.n || '') === name) || null;

    // Role/OS helpers for the live counter chips
    const roleOf = (p) => {
      const r = (p.role || p.r || '').toLowerCase();
      if(r.includes('wicket') || r.includes('keep')) return 'WK';
      if(r.includes('bowl')) return 'BOWL';
      if(r.includes('all')) return 'AR';
      return 'BAT';
    };
    const xiByRole = { WK:0, BAT:0, AR:0, BOWL:0 };
    d.xi.forEach(n => { const p = findP(n); if(p) xiByRole[roleOf(p)]++; });
    const xiOs = d.xi.filter(n => { const p = findP(n); return p && (p.isOverseas || p.o); }).length;
    const benchOs = d.bench.filter(n => { const p = findP(n); return p && (p.isOverseas || p.o); }).length;
    const totalOs = xiOs + benchOs;

    const counterChip = (label, count, max, tone) => {
      const ok = count === max || (max === 0 && count >= 0);
      return `<div style="padding:8px 14px;border-radius:9999px;background:${ok ? 'rgba(182,255,60,0.16)' : 'rgba(255,255,255,0.06)'};border:1px solid ${ok ? 'rgba(182,255,60,0.4)' : 'var(--line)'};display:inline-flex;align-items:center;gap:8px;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${ok ? 'var(--lime)' : 'var(--mute)'};">${label}</span>
        <span style="font-family:var(--display);font-size:15px;font-weight:800;color:${ok ? 'var(--lime)' : 'var(--ink)'};">${count}${max ? '/' + max : ''}</span>
      </div>`;
    };

    const renderEditableCard = (name) => {
      const p = findP(name);
      if(!p) return '';
      const code = teamCode(p.iplTeam || p.t);
      const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
      const isOs = !!(p.isOverseas || p.o);
      const rShort = roleOf(p);
      const rTone = rShort === 'BOWL' ? 'pink' : rShort === 'WK' ? 'gold' : rShort === 'AR' ? 'lime' : 'electric';
      const current = d.xi.includes(name) ? 'xi' : d.bench.includes(name) ? 'bench' : 'reserves';
      const btn = (dest, label) => {
        const active = current === dest;
        const disabled = dest === 'bench' && BENCH_MAX === 0;
        const bg = active
          ? (dest === 'xi' ? 'linear-gradient(180deg,var(--electric-2),var(--electric))'
             : dest === 'bench' ? 'linear-gradient(180deg,var(--lime-2,var(--lime)),var(--lime))'
             : 'var(--glass-2,rgba(255,255,255,0.1))')
          : 'rgba(255,255,255,0.04)';
        const color = active
          ? (dest === 'bench' ? '#000' : dest === 'xi' ? '#fff' : 'var(--ink-2)')
          : (disabled ? 'rgba(255,255,255,0.2)' : 'var(--mute)');
        const border = active
          ? (dest === 'xi' ? 'rgba(46,91,255,0.6)' : dest === 'bench' ? 'rgba(182,255,60,0.6)' : 'var(--line-2)')
          : 'var(--line)';
        return `<button data-name="${esc(name)}" data-dest="${dest}" onclick="CD.squadMoveFromEl(this)" ${disabled ? 'disabled' : ''} style="flex:1;padding:6px 0;border-radius:9999px;background:${bg};border:1px solid ${border};color:${color};font-size:10.5px;font-weight:700;cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? 0.45 : 1};letter-spacing:0.04em;">${label}</button>`;
      };

      return `<div style="padding:12px;border-radius:14px;background:linear-gradient(135deg,${c1}22,${c2}10);border:1px solid var(--line);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          ${CD.Avatar({team: p.iplTeam || p.t, name, size: 38})}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:13px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(name)}</div>
            <div style="display:flex;gap:3px;align-items:center;margin-top:3px;flex-wrap:wrap;">
              ${CD.TeamCodePill(p.iplTeam || p.t)}
              ${CD.Pill({tone: rTone, style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: rShort})}
              ${isOs ? CD.Pill({tone:'gold', style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: '★ OS'}) : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          ${btn('xi','XI')}
          ${btn('bench','Bench')}
          ${btn('reserves','Reserve')}
        </div>
      </div>`;
    };

    const section = (title, names, badge, capId, maxCap) => {
      const count = names.length;
      const full = maxCap > 0 && count >= maxCap;
      return `
        <div id="cd-squad-cap-${capId}" style="border-radius:18px;background:var(--glass);border:1px solid ${full ? 'rgba(182,255,60,0.35)' : 'var(--line)'};backdrop-filter:blur(20px);margin-bottom:16px;overflow:hidden;">
          <div style="padding:12px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="ed" style="font-size:20px;">${title}</div>
              ${badge}
            </div>
            <div style="font-family:var(--display);font-weight:800;font-size:15px;color:${full ? 'var(--lime)' : 'var(--mute)'};">${count}${maxCap ? '/' + maxCap : ''}</div>
          </div>
          <div style="padding:14px 18px;">
            ${names.length
              ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">${names.map(renderEditableCard).join('')}</div>`
              : `<div style="padding:18px;text-align:center;font-size:12px;color:var(--mute);border:1px dashed var(--line-2);border-radius:12px;">Empty — move players here by tapping the section button on any card.</div>`}
          </div>
        </div>
      `;
    };

    const xiMultBadge = xiMult !== 1 ? CD.Pill({tone:'gold', children: xiMult + '× multiplier'}) : '';
    const benchMultBadge = CD.Pill({style:'font-size:10px;', children:'1× multiplier'});
    const resBadge = CD.Pill({style:'font-size:10px;', children:'0× · no points'});

    const xiOk = d.xi.length === XI_MAX;
    const benchOk = (BENCH_MAX === 0) || (d.bench.length === BENCH_MAX);

    const errs = validate.errors || [];

    return `
      <!-- Sticky edit header -->
      <div style="position:sticky;top:0;z-index:20;padding:14px 16px;border-radius:16px;background:var(--glass-2,rgba(22,24,38,0.92));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:16px;box-shadow:0 10px 40px rgba(0,0,0,0.4);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <div style="font-size:10px;color:var(--pink);letter-spacing:0.2em;text-transform:uppercase;font-weight:800;">Edit squad</div>
            <div class="ed" style="font-size:24px;margin-top:2px;">${esc(t.name)}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="CD.cancelEditSquad()" ${saving ? 'disabled' : ''} style="padding:9px 16px;border-radius:9999px;background:transparent;border:1px solid var(--line-2);color:var(--ink-2);font-size:12px;font-weight:600;cursor:${saving ? 'not-allowed' : 'pointer'};opacity:${saving ? 0.5 : 1};">Cancel</button>
            <button onclick="CD.saveEditSquad()" ${saving || !validate.ok ? 'disabled' : ''} style="padding:9px 18px;border-radius:9999px;background:${validate.ok ? 'linear-gradient(180deg,var(--lime-2,var(--lime)),var(--lime))' : 'rgba(255,255,255,0.08)'};border:none;color:${validate.ok ? '#000' : 'var(--mute)'};font-size:12px;font-weight:800;cursor:${(saving || !validate.ok) ? 'not-allowed' : 'pointer'};display:inline-flex;align-items:center;gap:6px;opacity:${saving ? 0.7 : 1};">${I('save',12)} ${saving ? 'Saving…' : 'Save squad'}</button>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${counterChip('XI', d.xi.length, XI_MAX, 'electric')}
          ${BENCH_MAX ? counterChip('Bench', d.bench.length, BENCH_MAX, 'lime') : ''}
          ${counterChip('Reserves', d.reserves.length, 0, 'mute')}
          ${counterChip('OS', totalOs, 6, 'gold')}
          ${xiByRole.WK ? CD.Pill({tone:'gold', children: 'WK ' + xiByRole.WK}) : CD.Pill({tone:'red', children:'Need WK'})}
          ${xiByRole.BOWL + xiByRole.AR >= 5 ? CD.Pill({tone:'lime', children: 'BOWL+AR ' + (xiByRole.BOWL + xiByRole.AR)}) : CD.Pill({tone:'red', children:'Need 5+ BOWL/AR'})}
        </div>
        ${errs.length ? `
          <div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(255,59,59,0.1);border:1px solid rgba(255,59,59,0.3);font-size:12px;color:#FF8080;">
            <strong style="font-weight:800;letter-spacing:0.08em;text-transform:uppercase;font-size:10px;">Needs fixing</strong><br/>
            ${errs.map(e => '• ' + esc(e)).join('<br/>')}
          </div>
        ` : `<div style="margin-top:10px;padding:8px 14px;border-radius:10px;background:rgba(182,255,60,0.08);border:1px solid rgba(182,255,60,0.25);font-size:12px;color:var(--lime);">${I('check',12)} Squad is valid — tap Save to lock it in.</div>`}
        <div style="margin-top:8px;font-size:11px;color:var(--mute);">Tap <strong style="color:var(--ink-2);">XI / Bench / Reserve</strong> on any card to move the player.</div>
      </div>

      ${section('Playing XI', d.xi, xiMultBadge, 'xi', XI_MAX)}
      ${BENCH_MAX ? section('Bench', d.bench, benchMultBadge, 'bench', BENCH_MAX) : ''}
      ${section('Reserves', d.reserves, resBadge, 'reserves', 0)}
    `;
  };

  // NEW: Player Points by Match — table showing every player's points for every match incl. multiplier
  CD.renderPointsByMatch = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const myTeam = window.myTeamName || '';
    const t = teams[myTeam];
    if(!t) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;">Register your team first to see your players' points by match.</div>`;
    const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
    const matches = rs.matches || {};
    const matchIds = Object.keys(matches).sort((a,b) => (matches[a].timestamp||0) - (matches[b].timestamp||0));
    const xiMult = parseFloat(rs.xiMultiplier) || 1;

    if(!matchIds.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">No matches <span class="ed-i" style="color:var(--pink);">yet</span></div><div style="font-size:13px;">Points per match will appear here after scorecards are submitted.</div></div>`;
    if(!roster.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;">You have no players on your roster yet.</div>`;

    const scope = window._cdPbmScope || 'my'; // 'my' | 'all'

    // Determine which teams to show
    const teamsToShow = scope === 'my' ? [t] : Object.values(teams);

    const renderTeamBlock = (tt) => {
      const rostr = Array.isArray(tt.roster) ? tt.roster : (tt.roster ? Object.values(tt.roster) : []);
      if(!rostr.length) return '';
      const activeSq = Array.isArray(tt.activeSquad) ? tt.activeSquad : null;
      const xiFallback = new Set((activeSq ? activeSq.slice(0,11) : rostr.slice(0,11).map(p => p.name||p.n||'')));
      const benchFallback = new Set((activeSq ? activeSq.slice(11,16) : rostr.slice(11,16).map(p => p.name||p.n||'')));

      const rows = rostr.map(p => {
        const name = p.name || p.n || '';
        const isXI = xiFallback.has(name);
        const perMatch = {};
        let totalUnrounded = 0;
        matchIds.forEach(mid => {
          const m = matches[mid];
          const snap = m.squadSnapshots ? m.squadSnapshots[tt.name] : null;
          const hasStoredSnaps = !!m.squadSnapshots;
          const nameL = name.toLowerCase().trim();
          const nameC = _cdCleanName(name);
          let xiSet, benchSet;
          if(snap){
            xiSet = new Set(); benchSet = new Set();
            (snap.xi||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); xiSet.add(fn); xiSet.add(_cdCleanName(n)); });
            (snap.bench||[]).forEach(n => { const fn=(n||'').toLowerCase().trim(); benchSet.add(fn); benchSet.add(_cdCleanName(n)); });
          } else if(!hasStoredSnaps){
            xiSet = new Set(); benchSet = new Set();
            xiFallback.forEach(n => { xiSet.add((n||'').toLowerCase().trim()); xiSet.add(_cdCleanName(n)); });
            benchFallback.forEach(n => { benchSet.add((n||'').toLowerCase().trim()); benchSet.add(_cdCleanName(n)); });
          } else { xiSet = new Set(); benchSet = new Set(); }
          const rec = m.players ? Object.values(m.players).find(pp => (pp.name||'').toLowerCase().trim() === nameL) : null;
          if(!rec){ perMatch[mid] = null; return; }
          const raw = rec.pts || 0;
          let mult = 0;
          if(xiSet.has(nameL) || xiSet.has(nameC)) mult = xiMult;
          else if(benchSet.has(nameL) || benchSet.has(nameC)) mult = 1;
          if(mult === 0){ perMatch[mid] = null; return; }
          const contrib = raw * mult;
          perMatch[mid] = { val: Math.round(contrib), mult, raw };
          totalUnrounded += contrib;
        });
        const total = Math.round(totalUnrounded);
        return { p, name, perMatch, total, isXI };
      }).sort((a,b) => b.total - a.total);

      // Team header total — canonical helper so leaderboard == all-squads == here.
      const teamTotal = CD._teamSeasonTotal(tt.name);

      return `
        <div style="border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);overflow:hidden;margin-bottom:18px;">
          <div style="padding:18px 22px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${CD.Avatar({name: tt.name, size: 40})}
              <div>
                <div class="ed" style="font-size:22px;line-height:1;">${esc(tt.name)}</div>
                <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-top:3px;">${rows.length} players · ${matchIds.length} matches</div>
              </div>
            </div>
            <div style="font-family:var(--display);font-weight:800;font-size:28px;color:${teamTotal>0?'var(--lime)':teamTotal<0?'var(--red)':'var(--mute)'};">${teamTotal>=0?'+':''}${teamTotal}</div>
          </div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:rgba(0,0,0,0.25);">
                  <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);position:sticky;left:0;background:rgba(10,12,18,0.95);z-index:2;">Player</th>
                  <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--mute);">Role</th>
                  ${matchIds.map((mid, i) => {
                    const label = matches[mid].label || mid;
                    const short = label.length > 10 ? 'M' + (i+1) : label;
                    return `<th title="${esc(label)}" style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--mute);min-width:52px;">${esc(short)}</th>`;
                  }).join('')}
                  <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);background:rgba(0,0,0,0.3);">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(({p, name, perMatch, total, isXI}) => `
                  <tr style="border-top:1px solid var(--line);">
                    <td style="padding:10px 14px;position:sticky;left:0;background:${isXI?'rgba(46,91,255,0.06)':'var(--glass,rgba(18,20,30,0.55))'};backdrop-filter:blur(16px);z-index:1;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        ${CD.Avatar({team: p.iplTeam || p.t, name, size: 24})}
                        <div>
                          <div style="font-weight:600;font-size:12px;">${esc(name)}</div>
                          <div style="font-size:9.5px;color:var(--mute);">${esc(teamCode(p.iplTeam||p.t))}${(p.isOverseas||p.o)?' · OS':''}${isXI?' · <span style="color:var(--electric);">XI</span>':' · Bench'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding:10px 8px;text-align:center;font-size:10.5px;color:var(--ink-2);">${esc((p.role||p.r||'').split('-')[0].slice(0,4))}</td>
                    ${matchIds.map(mid => {
                      const cell = perMatch[mid];
                      if(cell == null) return `<td style="padding:10px 8px;text-align:center;color:var(--mute-2);font-family:var(--mono);">—</td>`;
                      const color = cell.val > 0 ? 'var(--lime)' : cell.val < 0 ? 'var(--red)' : 'var(--mute)';
                      const multBadge = cell.mult > 1 ? `<span style="font-size:8px;color:var(--gold);margin-left:2px;">${cell.mult}×</span>` : '';
                      return `<td title="${cell.raw} × ${cell.mult} = ${cell.val}" style="padding:10px 8px;text-align:center;font-family:var(--mono);font-weight:700;color:${color};">${cell.val>=0?'+':''}${cell.val}${multBadge}</td>`;
                    }).join('')}
                    <td style="padding:10px 14px;text-align:right;font-family:var(--display);font-weight:800;font-size:16px;color:${total>0?'var(--lime)':total<0?'var(--red)':'var(--mute)'};background:rgba(0,0,0,0.2);">${total>=0?'+':''}${total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    return `
      <!-- Scope toggle + CSV -->
      <div style="padding:12px 16px;border-radius:14px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-right:4px;">Showing</div>
        <div style="display:flex;gap:4px;">
          <button onclick="window._cdPbmScope='my';CD.render();" style="padding:7px 14px;border-radius:9999px;background:${scope==='my'?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${scope==='my'?'transparent':'var(--line)'};color:${scope==='my'?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;cursor:pointer;">My team</button>
          <button onclick="window._cdPbmScope='all';CD.render();" style="padding:7px 14px;border-radius:9999px;background:${scope==='all'?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${scope==='all'?'transparent':'var(--line)'};color:${scope==='all'?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;cursor:pointer;">All teams</button>
        </div>
        <div style="flex:1"></div>
        <div style="font-size:11px;color:var(--mute);">XI multiplier: <span style="color:var(--gold);font-weight:700;">${xiMult}×</span> · Bench 1× · Reserves 0×</div>
        <button onclick="CD.downloadPointsByMatchCSV()" style="padding:7px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>

      ${teamsToShow.map(renderTeamBlock).join('')}
    `;
  };

  CD.downloadPointsByMatchCSV = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const matches = rs.matches || {};
    const matchIds = Object.keys(matches).sort((a,b) => (matches[a].timestamp||0) - (matches[b].timestamp||0));
    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const scope = window._cdPbmScope || 'my';
    const myTeam = window.myTeamName || '';
    const teamsToShow = scope === 'my' && teams[myTeam] ? [teams[myTeam]] : Object.values(teams);
    if(!teamsToShow.length || !matchIds.length){ window.showAlert?.('No data.','err'); return; }

    const csvEscape = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const header = ['Team','Player','IPL Team','Role','Section'];
    matchIds.forEach(mid => header.push(matches[mid].label || mid));
    header.push('Total');
    const rows = [header];

    teamsToShow.forEach(tt => {
      const rostr = Array.isArray(tt.roster) ? tt.roster : (tt.roster ? Object.values(tt.roster) : []);
      const activeSq = Array.isArray(tt.activeSquad) ? tt.activeSquad : null;
      const xiSet = new Set((activeSq ? activeSq.slice(0,11) : rostr.slice(0,11).map(p => p.name||p.n||'')));
      rostr.forEach(p => {
        const name = p.name || p.n || '';
        const isXI = xiSet.has(name);
        const row = [tt.name, name, p.iplTeam || p.t || '', p.role || p.r || '', isXI ? 'XI' : 'Bench'];
        let total = 0;
        matchIds.forEach(mid => {
          const m = matches[mid];
          const snap = m.squadSnapshots?.[tt.name];
          const xiThisMatch = snap ? new Set((snap.xi || []).map(n => n.toLowerCase().trim())) : xiSet;
          const rec = m.players ? Object.values(m.players).find(pp => (pp.name||'').toLowerCase().trim() === name.toLowerCase().trim()) : null;
          if(!rec){ row.push(''); return; }
          const raw = rec.pts || 0;
          const isSnapXI = snap ? xiThisMatch.has(name.toLowerCase().trim()) : isXI;
          const mult = isSnapXI ? xiMult : 1;
          const val = Math.round(raw * mult);
          row.push(val);
          total += val;
        });
        row.push(total);
        rows.push(row);
      });
    });
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'points-by-match.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    if(typeof window.showAlert === 'function') window.showAlert('Points-by-match CSV downloaded','ok');
  };

  // Helper: compute per-team points. `pts` uses CD._teamSeasonTotal so the leaderboard
  // header can NEVER diverge from the All-Squads subtotals / Points-by-Match team header.
  CD._computeLeaderboard = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const stored = rs.leaderboardTotals || {};
    return Object.values(teams).map(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      const st = stored[t.name] || {};
      return {
        name: t.name,
        code: teamCode(t.name),
        pts: CD._teamSeasonTotal(t.name),
        topPlayer: st.topPlayer || '—',
        topPts: Math.round(st.topPts || 0),
        playerCount: st.playerCount || 0,
        roster,
        rosterSize: roster.length,
        budget: t.budget || 0,
        spent: roster.reduce((s,p) => s + (p.soldPrice || 0), 0),
        overseas: roster.filter(p => p.isOverseas || p.o).length,
        squadValid: t.squadValid !== false,
        activeSquad: t.activeSquad || null
      };
    }).sort((a,b) => b.pts - a.pts);
  };

  CD.renderLeaderboard = () => {
    const rs = window.roomState || {};
    const arr = CD._computeLeaderboard();
    if(!arr.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:20px;margin-bottom:4px;">No teams yet</div><div style="font-size:13px;">Teams will appear here once they join.</div></div>`;

    const myTeam = window.myTeamName || '';
    const podium = arr.slice(0, 3);
    const rest = arr.slice(3);
    const matches = rs.matches || {};
    const matchCount = Object.keys(matches).length;
    const podColors = [
      {bg:'rgba(255,200,61,0.28)', text:'#FFD97D', glow:'rgba(255,200,61,0.6)'},
      {bg:'rgba(192,204,220,0.22)', text:'#DEE4EE', glow:'rgba(192,204,220,0.5)'},
      {bg:'rgba(205,127,50,0.22)', text:'#E0945E', glow:'rgba(205,127,50,0.5)'}
    ];
    const expandedTeam = window._cdLbExpanded || '';

    return `
      <!-- Season stats banner -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
        ${CD.Stat({val: arr.length, lbl:'Teams', accent:'var(--electric)'})}
        ${CD.Stat({val: matchCount, lbl:'Matches', accent:'var(--pink)'})}
        ${CD.Stat({val: arr[0] ? ((arr[0].pts>=0?'+':'') + arr[0].pts) : '0', lbl:'Top Score', accent:'var(--lime)'})}
        ${CD.Stat({val: arr.filter(t => t.squadValid).length + '/' + arr.length, lbl:'Valid squads', accent:'var(--gold)'})}
      </div>

      <!-- Podium -->
      <div style="padding:32px;border-radius:22px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(40px) saturate(1.6);-webkit-backdrop-filter:blur(40px) saturate(1.6);border:1px solid var(--line-2);margin-bottom:20px;position:relative;overflow:hidden;box-shadow:var(--sh-2);">
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:24px 24px;mask-image:radial-gradient(ellipse at center,black 30%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse at center,black 30%,transparent 80%);pointer-events:none;"></div>
        <div style="text-align:center;margin-bottom:24px;position:relative;">
          <div style="font-size:11px;color:var(--mute);letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Season Standings</div>
          <h2 class="ed" style="font-size:${CD.state.isMobile ? 36 : 52}px;line-height:1;margin-top:6px;letter-spacing:-0.03em;">The <span class="ed-i" style="color:var(--gold);font-style:italic;font-weight:500;">podium</span></h2>
        </div>
        <div style="display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1fr 1.2fr 1fr'};gap:16px;align-items:end;position:relative;">
          ${(CD.state.isMobile ? [0,1,2] : [1,0,2]).map(i => {
            const t = podium[i]; if(!t) return '<div></div>';
            const c = podColors[i];
            const h = i === 0 ? 220 : i === 1 ? 160 : 120;
            const crown = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            const rankNum = i + 1;
            return `
              <div style="text-align:center;">
                <div style="font-size:${i===0?44:36}px;margin-bottom:8px;filter:drop-shadow(0 0 16px ${c.glow});">${crown}</div>
                ${CD.Avatar({name: t.name, size: i === 0 ? 92 : 72})}
                <div style="font-size:10px;color:${c.text};letter-spacing:0.2em;text-transform:uppercase;font-weight:700;margin-top:10px;">Rank ${rankNum}</div>
                <div class="ed" style="font-size:${i===0?24:18}px;margin-top:4px;">${esc(t.name)}</div>
                <div style="font-size:11px;color:var(--mute);margin-top:3px;">${esc(t.topPlayer)} · ${t.topPts>0?'+':''}${t.topPts} top</div>
                <div style="margin-top:10px;display:inline-block;padding:6px 14px;border-radius:9999px;background:${c.bg};border:1px solid ${c.text}40;color:${c.text};font-family:var(--display);font-weight:800;font-size:${i===0?16:14}px;">${t.pts >= 0 ? '+' : ''}${t.pts}</div>
                ${!CD.state.isMobile ? `<div style="margin-top:14px;height:${h}px;background:linear-gradient(180deg,${c.bg},transparent);border-top-left-radius:14px;border-top-right-radius:14px;border:1px solid ${c.text}30;border-bottom:none;display:flex;align-items:start;justify-content:center;padding-top:18px;"><div style="font-family:var(--serif);font-style:italic;font-weight:800;font-size:${i===0?110:80}px;color:${c.text}cc;line-height:1;filter:drop-shadow(0 0 20px ${c.glow});">${rankNum}</div></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${rest.length ? `
      <!-- Rest of the league -->
      <div style="padding:20px;border-radius:18px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(24px);margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Rest of the league</div>
          <div style="font-size:11px;color:var(--mute);">${rest.length} teams</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Rank</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Team</th>
                <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Squad</th>
                <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Top player</th>
                <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Points</th>
              </tr>
            </thead>
            <tbody>
              ${rest.map((t, i) => `<tr style="border-bottom:1px solid var(--line);${t.name === myTeam ? 'background:rgba(182,255,60,0.04);' : ''}">
                <td style="padding:10px 12px;font-family:var(--display);font-size:18px;color:var(--mute);">${(i+4).toString().padStart(2,'0')}</td>
                <td style="padding:10px 12px;">
                  <div style="display:flex;align-items:center;gap:10px;">${CD.Avatar({name: t.name, size: 28})}<div><div style="font-weight:600;">${esc(t.name)}${t.name === myTeam ? ' <span style="color:var(--lime);font-size:9px;">YOU</span>' : ''}</div><div style="font-size:10px;color:var(--mute);">${t.rosterSize} players</div></div></div>
                </td>
                <td style="padding:10px 12px;text-align:right;color:var(--ink-2);">${t.rosterSize}/${rs.maxPlayers || 21}</td>
                <td style="padding:10px 12px;text-align:right;font-size:12px;color:var(--ink-2);">${esc(t.topPlayer)}<br><span style="color:var(--mute);font-size:11px;">${t.topPts>0?'+':''}${t.topPts}</span></td>
                <td style="padding:10px 12px;text-align:right;font-family:var(--display);font-size:20px;color:var(--ink);font-weight:800;">${t.pts >= 0 ? '+' : ''}${t.pts}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- ALL SQUADS — expandable cards below podium -->
      <div style="padding:20px;border-radius:18px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(24px);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div class="ed" style="font-size:22px;">All <span class="ed-i" style="color:var(--mute);">squads</span></div>
          <div style="font-size:11px;color:var(--mute);">Click to expand</div>
        </div>
        <div class="cd-league-list" style="display:flex;flex-direction:column;gap:10px;">
          ${arr.map((t, rankIdx) => {
            const isExpanded = expandedTeam === t.name;
            const code = teamCode(t.name);
            const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
            const rank = rankIdx + 1;
            return `
              <div style="border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid var(--line);overflow:hidden;">
                <div data-team="${attrEscape(t.name)}" onclick="CD.toggleSquadExpand(this.dataset.team)" style="padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
                  <div style="font-family:var(--display);font-size:22px;color:${rank<=3?'var(--gold)':'var(--mute)'};font-weight:800;min-width:36px;">${rank.toString().padStart(2,'0')}</div>
                  ${CD.Avatar({name: t.name, size: 40})}
                  <div style="flex:1;min-width:0;">
                    <div class="ed" style="font-size:20px;line-height:1;">${esc(t.name)}${t.name === myTeam ? ' <span style="color:var(--lime);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;">you</span>' : ''}</div>
                    <div style="font-size:11px;color:var(--mute);margin-top:3px;">${t.rosterSize} players · ${t.overseas} OS · ₹${t.spent.toFixed(1)}cr spent</div>
                  </div>
                  <div style="font-family:var(--display);font-size:28px;font-weight:800;color:var(--ink);text-align:right;">${t.pts >= 0 ? '+' : ''}${t.pts}<div style="font-size:9px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-top:-2px;">points</div></div>
                  <div style="color:var(--mute);transform:${isExpanded ? 'rotate(180deg)' : 'none'};transition:transform 0.2s;">▼</div>
                </div>
                ${isExpanded ? CD._renderTeamRoster(t, c1, c2) : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  // Helper — render a team's roster split into XI / Bench / Reserves with season points.
  // Subtotals come from CD._teamContribBreakdown (single source of truth); they sum to
  // CD._teamSeasonTotal(t.name), which is also what the leaderboard header shows.
  // Previous version summed by p.ownedBy only and ignored per-match XI/Bench snapshots,
  // which is why subtotals could disagree with the leaderboard header by several points.
  CD._renderTeamRoster = (t, c1, c2) => {
    if(!t.roster.length) return `<div style="padding:14px 18px;color:var(--mute);font-size:12px;border-top:1px solid var(--line);">Empty roster</div>`;
    const rs = window.roomState || {};
    const xiMult = parseFloat(rs.xiMultiplier) || 1;

    // Canonical breakdown — unrounded subtotals + per-player unrounded contribution.
    const brk = CD._teamContribBreakdown(t.name);
    const playerPts = brk.playerPts; // cleanKey -> unrounded (multiplier baked in)

    // Split by activeSquad: first 11 = XI, next 5 = Bench, rest = Reserves
    const activeSq = Array.isArray(t.activeSquad) ? t.activeSquad : null;
    const rosterNames = t.roster.map(p => p.name || p.n || '');
    let xiNames, benchNames;
    if(activeSq && activeSq.length) {
      xiNames = activeSq.slice(0, 11);
      benchNames = activeSq.slice(11, 16);
    } else {
      xiNames = rosterNames.slice(0, 11);
      benchNames = rosterNames.slice(11, 16);
    }
    const reserveNames = rosterNames.filter(n => !xiNames.includes(n) && !benchNames.includes(n));
    const findP = (name) => t.roster.find(p => (p.name||p.n||'') === name) || null;
    const xi = xiNames.map(findP).filter(Boolean);
    const bench = benchNames.map(findP).filter(Boolean);
    const reserves = reserveNames.map(findP).filter(Boolean);

    // Subtotals from canonical breakdown — single round per bucket, NOT per-player.
    const xiTotal = Math.round(brk.xi);
    const benchTotal = Math.round(brk.bench);
    // Reserves never contribute under the canonical rule (0× multiplier).
    const reservesTotal = 0;
    // Per-player chip values (player-level stat; already has multiplier baked in).
    const ptsFor = (p) => Math.round(playerPts[_cdCleanName(p.name||p.n||'')] || 0);

    const renderSection = (label, players, mult, totalPts, sectionColor) => {
      if(!players.length) return '';
      const multBadge = mult === 0
        ? CD.Pill({tone:'red', style:'font-size:9px;padding:2px 7px;', children:'0× (no scoring)'})
        : mult === 1
          ? CD.Pill({style:'font-size:9px;padding:2px 7px;', children:'1× points'})
          : CD.Pill({tone:'gold', style:'font-size:9px;padding:2px 7px;', children: mult + '× multiplier'});
      return `
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:10px;color:${sectionColor};letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">${label} · ${players.length}</span>
              ${multBadge}
            </div>
            <span style="font-family:var(--display);font-weight:800;color:${totalPts>0?'var(--lime)':totalPts<0?'var(--red)':'var(--mute)'};font-size:16px;">${totalPts>=0?'+':''}${totalPts} <span style="font-size:9px;color:var(--mute);font-weight:500;letter-spacing:0.1em;text-transform:uppercase;">pts</span></span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;">
            ${players.map(p => {
              const pName = p.name || p.n || '';
              const val = ptsFor(p); // already includes multiplier for XI/Bench; 0 for Reserves
              const isOs = !!(p.isOverseas || p.o);
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--line);">
                ${CD.Avatar({team: p.iplTeam || p.t, name: pName, size: 24})}
                <div style="flex:1;min-width:0;overflow:hidden;">
                  <div style="font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(pName)}${isOs ? ' <span style="color:var(--gold);font-size:9px;">★</span>' : ''}</div>
                  <div style="font-size:10px;color:var(--mute);">${esc(teamCode(p.iplTeam||p.t))} · ${esc((p.role||p.r||'').split('-')[0].slice(0,3))}</div>
                </div>
                <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:${val>0?'var(--lime)':val<0?'var(--red)':'var(--mute)'};">${val>=0?'+':''}${val}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    };

    return `
      <div style="padding:16px 18px 18px;border-top:1px solid var(--line);background:linear-gradient(180deg,${c1}10,transparent);">
        ${renderSection('Playing XI', xi, xiMult, xiTotal, 'var(--electric)')}
        ${renderSection('Bench', bench, 1, benchTotal, 'var(--ink-2)')}
        ${reserves.length ? renderSection('Reserves', reserves, 0, reservesTotal, 'var(--mute)') : ''}
      </div>
    `;
  };

  CD.toggleSquadExpand = (name) => {
    window._cdLbExpanded = (window._cdLbExpanded === name ? '' : name);
    CD.render();
  };

  // Download Teams of the Week as CSV (every team's XI + Bench + points)
  CD.downloadTeamsOfWeekCSV = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const matchIds = Object.keys(matches).sort((a,b) => (matches[a].timestamp || 0) - (matches[b].timestamp || 0));
    if(!matchIds.length){ window.showAlert?.('No matches yet.','err'); return; }
    const selectedMid = window._cdWeekMid || matchIds[matchIds.length - 1];
    const xiMult = parseFloat(rs.xiMultiplier) || 1;

    // Decide scope: single match or all matches
    const targetMids = selectedMid === '__all__' ? matchIds : [selectedMid];
    const rows = [['Match','Team','Section','Rank','Player','IPL Team','Role','Raw Points','Multiplier','Match Points']];

    targetMids.forEach(mid => {
      const m = matches[mid] || {};
      const label = m.label || mid;
      const snaps = m.squadSnapshots || {};
      const playerPts = {};
      if(m.players){
        Object.values(m.players).forEach(p => {
          const k = (p.name || '').toLowerCase().trim();
          playerPts[k] = { pts: p.pts || 0, name: p.name };
        });
      }
      Object.values(teams).forEach(t => {
        const snap = snaps[t.name] || {};
        let xi = snap.xi || [];
        let bench = snap.bench || [];
        if(!xi.length){
          const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
          const names = roster.map(p => p.name || p.n || '');
          xi = names.slice(0, 11);
          bench = names.slice(11, 16);
        }
        const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
        const getMeta = (n) => roster.find(rp => (rp.name||rp.n||'').toLowerCase().trim() === (n||'').toLowerCase().trim()) || {};
        const getPts = (n) => {
          const key = (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
          return (playerPts[key] || playerPts[(n||'').toLowerCase().trim()] || {pts:0}).pts || 0;
        };
        xi.forEach((n, i) => {
          const meta = getMeta(n);
          const raw = getPts(n);
          rows.push([label, t.name, 'XI', i+1, n, meta.iplTeam || meta.t || '', meta.role || meta.r || '', raw.toFixed(2), xiMult, Math.round(raw * xiMult)]);
        });
        bench.forEach((n, i) => {
          const meta = getMeta(n);
          const raw = getPts(n);
          rows.push([label, t.name, 'Bench', i+1, n, meta.iplTeam || meta.t || '', meta.role || meta.r || '', raw.toFixed(2), 1, Math.round(raw)]);
        });
      });
    });

    // CSV build: escape every field
    const csvEscape = (v) => {
      const s = String(v == null ? '' : v);
      if(s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const scope = selectedMid === '__all__' ? 'season' : (matches[selectedMid]?.label || selectedMid).replace(/[^a-z0-9]/gi, '_');
    const filename = `teams-of-week_${scope}.csv`;

    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(typeof window.showAlert === 'function') window.showAlert('CSV downloaded: ' + filename, 'ok');
  };

  // Teams of the Week — every team's XI + Bench + points per selected match
  CD.renderTeamsOfWeek = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const matchIds = Object.keys(matches).sort((a,b) => (matches[b].timestamp || 0) - (matches[a].timestamp || 0));

    if(!matchIds.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">No matches <span class="ed-i" style="color:var(--pink);">yet</span></div><div style="font-size:13px;color:var(--mute);">Once matches are played, every team's Playing XI, Bench and points for that matchday will appear here.</div></div>`;

    const selectedMid = window._cdWeekMid || matchIds[0];
    const isAllMatches = selectedMid === '__all__';
    const selectedMatch = isAllMatches ? { label: 'Full Season', winner: '', motm: '' } : (matches[selectedMid] || {});

    // Build per-player points. For 'All', sum across all matches. For single, just that match.
    const playerPts = {};
    const sourceMatches = isAllMatches ? Object.values(matches) : [selectedMatch];
    sourceMatches.forEach(m => {
      if(!m || !m.players) return;
      Object.values(m.players).forEach(p => {
        const k = (p.name || '').toLowerCase().trim();
        if(!playerPts[k]) playerPts[k] = { pts: 0, name: p.name, breakdown: p.breakdown || '' };
        playerPts[k].pts += (p.pts || 0);
      });
    });

    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const matchSnaps = !isAllMatches ? (selectedMatch.squadSnapshots || {}) : {};

    // Build each team's XI + Bench for this match (or current squad if season view)
    const teamBlocks = Object.values(teams).map(t => {
      const snap = matchSnaps[t.name] || {};
      let xi = snap.xi || [];
      let bench = snap.bench || [];
      // Fallback: use activeSquad or first 11 of roster as XI, next 5 as bench
      if(!xi.length){
        const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
        const names = Array.isArray(t.activeSquad) && t.activeSquad.length ? t.activeSquad : roster.map(p => p.name || p.n || '');
        xi = names.slice(0, 11);
        bench = names.slice(11, 16);
      }
      // Compute points
      let xiPts = 0, benchPts = 0;
      xi.forEach(n => {
        const key = (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
        const rec = playerPts[key] || playerPts[(n||'').toLowerCase().trim()];
        if(rec) xiPts += (rec.pts || 0) * xiMult;
      });
      bench.forEach(n => {
        const key = (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
        const rec = playerPts[key] || playerPts[(n||'').toLowerCase().trim()];
        if(rec) benchPts += (rec.pts || 0);
      });
      return {
        name: t.name,
        code: teamCode(t.name),
        xi, bench,
        xiPts: Math.round(xiPts),
        benchPts: Math.round(benchPts),
        total: Math.round(xiPts + benchPts),
        roster: t.roster || []
      };
    }).sort((a,b) => b.total - a.total);

    return `
      <!-- Match selector + CSV download -->
      <div style="padding:14px 18px;border-radius:14px;background:var(--glass);border:1px solid var(--line);margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Matchday</div>
          <div class="ed" style="font-size:22px;margin-top:2px;">${esc(selectedMatch.label || 'Match')}${selectedMatch.winner ? ` <span class="ed-i" style="font-size:16px;color:var(--lime);">· ${esc(selectedMatch.winner)} won</span>` : ''}</div>
          ${selectedMatch.motm ? `<div style="font-size:11px;color:var(--mute);margin-top:3px;">MOTM: <strong style="color:var(--gold);">${esc(selectedMatch.motm)}</strong></div>` : ''}
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <select onchange="window._cdWeekMid=this.value;CD.render();" style="padding:10px 14px;font-family:var(--sans);font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:8px;min-width:220px;">
            <option value="__all__"${selectedMid === '__all__' ? ' selected' : ''}>All matches (season)</option>
            ${matchIds.map(mid => `<option value="${esc(mid)}"${mid === selectedMid ? ' selected' : ''}>${esc(matches[mid].label || mid)}</option>`).join('')}
          </select>
          <button onclick="CD.downloadTeamsOfWeekCSV()" title="Download this matchday's XI + Bench as CSV" style="padding:10px 16px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 20px rgba(182,255,60,0.3);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download CSV
          </button>
        </div>
      </div>

      <!-- Team cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;">
        ${teamBlocks.map((t, rank) => {
          const [c1, c2] = TEAM_COLORS[t.code] || ['#444','#222'];
          const isMy = t.name === window.myTeamName;
          return `
          <div style="border-radius:18px;overflow:hidden;border:1px solid var(--line-2);background:var(--glass);backdrop-filter:blur(24px);${isMy ? 'outline:2px solid var(--lime);outline-offset:-2px;' : ''}">
            <!-- Card header -->
            <div style="padding:16px 18px;background:linear-gradient(135deg,${c1}45,${c2}25);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;">
              <div style="font-family:var(--display);font-size:28px;color:var(--ink);font-weight:800;opacity:0.7;min-width:32px;">#${rank+1}</div>
              ${CD.Avatar({name: t.name, size: 42})}
              <div style="flex:1;min-width:0;">
                <div class="ed" style="font-size:20px;">${esc(t.name)}${isMy ? ' <span style="color:var(--lime);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;">you</span>' : ''}</div>
                <div style="font-size:11px;color:var(--mute);margin-top:2px;">XI ${t.xi.length} · Bench ${t.bench.length}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--display);font-size:28px;font-weight:800;color:${t.total>0?'var(--lime)':t.total<0?'var(--red)':'var(--mute)'};line-height:1;">${t.total>=0?'+':''}${t.total}</div>
                <div style="font-size:9px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-top:1px;">matchday</div>
              </div>
            </div>

            <!-- Playing XI -->
            <div style="padding:14px 18px;">
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;">
                <span>Playing XI${xiMult !== 1 ? ' <span style="color:var(--gold);">· ' + xiMult + '×</span>' : ''}</span>
                <span style="color:var(--lime);font-family:var(--mono);">${t.xiPts >= 0 ? '+' : ''}${t.xiPts}</span>
              </div>
              ${t.xi.length ? `
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${t.xi.map(n => {
                  const key = (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
                  const rec = playerPts[key] || playerPts[(n||'').toLowerCase().trim()] || {pts:0};
                  const rawP = rec.pts || 0;
                  const displayed = Math.round(rawP * xiMult);
                  const rosterPlayer = t.roster.find(rp => (rp.name||rp.n||'').toLowerCase().trim() === (n||'').toLowerCase().trim()) || {};
                  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,0.02);">
                    ${CD.Avatar({team: rosterPlayer.iplTeam || rosterPlayer.t, name: n, size: 22})}
                    <div style="flex:1;min-width:0;overflow:hidden;">
                      <div style="font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(n)}</div>
                    </div>
                    <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:${displayed>0?'var(--lime)':displayed<0?'var(--red)':'var(--mute)'};min-width:40px;text-align:right;">${displayed>=0?'+':''}${displayed}</div>
                  </div>`;
                }).join('')}
              </div>
              ` : '<div style="padding:10px;color:var(--mute);font-size:12px;text-align:center;">No XI set</div>'}
            </div>

            <!-- Bench -->
            ${t.bench.length ? `
            <div style="padding:14px 18px;border-top:1px solid var(--line);background:rgba(0,0,0,0.15);">
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;">
                <span>Bench · 1×</span>
                <span style="color:var(--ink-2);font-family:var(--mono);">${t.benchPts >= 0 ? '+' : ''}${t.benchPts}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${t.bench.map(n => {
                  const key = (n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
                  const rec = playerPts[key] || playerPts[(n||'').toLowerCase().trim()] || {pts:0};
                  const p = rec.pts || 0;
                  const rosterPlayer = t.roster.find(rp => (rp.name||rp.n||'').toLowerCase().trim() === (n||'').toLowerCase().trim()) || {};
                  return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;opacity:0.85;">
                    ${CD.Avatar({team: rosterPlayer.iplTeam || rosterPlayer.t, name: n, size: 20})}
                    <div style="flex:1;min-width:0;overflow:hidden;">
                      <div style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink-2);">${esc(n)}</div>
                    </div>
                    <div style="font-family:var(--mono);font-size:10.5px;font-weight:700;color:${p>0?'var(--lime)':p<0?'var(--red)':'var(--mute)'};min-width:36px;text-align:right;">${p>=0?'+':''}${Math.round(p)}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>` : ''}
          </div>
          `;
        }).join('')}
      </div>
    `;
  };

  CD.renderPoints = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const matchKeys = Object.keys(matches).sort((a,b) => (matches[a].timestamp||0) - (matches[b].timestamp||0));
    if(!matchKeys.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">No match data <span class="ed-i" style="color:var(--pink);">yet</span></div><div style="font-size:13px;">Match scorecards will populate this leaderboard once submitted.</div></div>`;

    // Build owner map (lowercase player name → team name)
    const ownerMap = {};
    Object.values(teams).forEach(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      roster.forEach(p => { ownerMap[(p.name || p.n || '').toLowerCase().trim()] = t.name; });
    });

    // Aggregate per-player points + per-match breakdown
    const totals = {};
    matchKeys.forEach(mid => {
      const m = matches[mid];
      if(!m.players) return;
      Object.values(m.players).forEach(p => {
        const k = (p.name || '').toLowerCase().trim();
        if(!k) return;
        if(!totals[k]) totals[k] = { name: p.name, pts: 0, mc: 0, perMatch: {}, iplTeam: '', role: '' };
        totals[k].pts += (p.pts || 0);
        totals[k].mc++;
        totals[k].perMatch[mid] = p.pts || 0;
      });
    });
    // Enrich with roster info (IPL team, role)
    Object.values(teams).forEach(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      roster.forEach(p => {
        const k = (p.name || p.n || '').toLowerCase().trim();
        if(totals[k]){
          totals[k].iplTeam = p.iplTeam || p.t || totals[k].iplTeam;
          totals[k].role = p.role || p.r || totals[k].role;
        }
      });
    });

    const filter = window._cdPointsFilter || 'all';
    const search = (window._cdPointsSearch || '').toLowerCase().trim();
    let sorted = Object.values(totals).sort((a,b) => b.pts - a.pts);
    if(filter === 'owned') sorted = sorted.filter(p => ownerMap[p.name.toLowerCase().trim()]);
    if(filter === 'unowned') sorted = sorted.filter(p => !ownerMap[p.name.toLowerCase().trim()]);
    if(filter && ['Batter','Bowler','Wicketkeeper','All-rounder'].includes(filter)) {
      sorted = sorted.filter(p => (p.role || '').toLowerCase().includes(filter.toLowerCase().split('-')[0]));
    }
    if(search) sorted = sorted.filter(p => p.name.toLowerCase().includes(search));

    return `
      <!-- Filter bar -->
      <div style="padding:12px 16px;border-radius:14px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <input id="cdPointsSearch" placeholder="Search players…" value="${esc(search)}" oninput="window._cdPointsSearch=this.value;clearTimeout(window._cdPointsSearchDb);window._cdPointsSearchDb=setTimeout(()=>{CD.render();document.getElementById('cdPointsSearch')?.focus();},150);" style="flex:1;min-width:180px;padding:9px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--sans);" />
        ${[['all','All'],['owned','Owned'],['unowned','Unowned'],['Batter','Batters'],['Bowler','Bowlers'],['All-rounder','AR'],['Wicketkeeper','WK']].map(([k,l]) => `
          <button onclick="window._cdPointsFilter='${k}';CD.render();" style="padding:7px 13px;border-radius:9999px;background:${filter===k?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${filter===k?'transparent':'var(--line)'};color:${filter===k?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;">${l}</button>
        `).join('')}
        <span style="font-size:11px;color:var(--mute);margin-left:auto;">${sorted.length} players</span>
      </div>

      <!-- Table -->
      <div style="border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);overflow:hidden;">
        <div style="padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);">
          <div class="ed" style="font-size:22px;">Top <span class="ed-i" style="color:var(--mute);">scorers</span></div>
          <div style="font-size:11px;color:var(--mute);">${matchKeys.length} matches · ${Object.keys(totals).length} players</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:rgba(0,0,0,0.2);">
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">#</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">IPL</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Role</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Owner</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Inns</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Avg</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.slice(0, 100).map((p,i) => {
                const avg = p.mc > 0 ? (p.pts / p.mc).toFixed(1) : '0';
                const owner = ownerMap[p.name.toLowerCase().trim()] || '';
                return `<tr style="border-top:1px solid var(--line);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:11px 14px;font-family:var(--display);font-size:16px;color:var(--mute);">${(i+1).toString().padStart(2,'0')}</td>
                  <td style="padding:11px 14px;">
                    <div style="display:flex;align-items:center;gap:10px;">${CD.Avatar({team: p.iplTeam, name: p.name, size: 28})}<span style="font-weight:600;">${esc(p.name)}</span></div>
                  </td>
                  <td style="padding:11px 14px;">${p.iplTeam ? CD.TeamChip({code: p.iplTeam}) : '<span style="color:var(--mute);">—</span>'}</td>
                  <td style="padding:11px 14px;color:var(--ink-2);font-size:12px;">${esc(p.role || '—')}</td>
                  <td style="padding:11px 14px;color:${owner?'var(--ink-2)':'var(--mute)'};font-size:12px;">${esc(owner || 'Unowned')}</td>
                  <td style="padding:11px 14px;text-align:right;color:var(--ink-2);">${p.mc}</td>
                  <td style="padding:11px 14px;text-align:right;color:var(--mute);font-family:var(--mono);">${avg}</td>
                  <td style="padding:11px 14px;text-align:right;font-family:var(--display);font-size:18px;font-weight:800;color:${p.pts>0?'var(--lime)':p.pts<0?'var(--red)':'var(--mute)'};">${p.pts >= 0 ? '+' : ''}${Math.round(p.pts)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${sorted.length > 100 ? `<div style="padding:14px;text-align:center;color:var(--mute);font-size:12px;border-top:1px solid var(--line);">Showing first 100 · ${sorted.length - 100} more</div>` : ''}
      </div>
    `;
  };

  CD.renderPlayersPool = () => {
    const rs = window.roomState || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    if(!players.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">Player pool <span class="ed-i" style="color:var(--mute);">empty</span></div><div style="font-size:13px;">Ask the admin to initialize the auction.</div></div>`;

    const search = (window._cdPoolSearch || '').toLowerCase().trim();
    const statusF = window._cdPoolStatus || 'all';
    const roleF = window._cdPoolRole || '';
    const teamF = window._cdPoolTeam || '';
    const originF = window._cdPoolOrigin || '';
    const advOpen = window._cdPoolAdvanced || false;

    let filtered = players.slice();
    if(search) filtered = filtered.filter(p => (p.name||p.n||'').toLowerCase().includes(search) || (p.iplTeam||p.t||'').toLowerCase().includes(search));
    if(statusF !== 'all') filtered = filtered.filter(p => p.status === statusF);
    if(roleF) filtered = filtered.filter(p => (p.role||p.r||'').toLowerCase().includes(roleF.toLowerCase().split('-')[0]));
    if(teamF) filtered = filtered.filter(p => (p.iplTeam||p.t||'') === teamF);
    if(originF === 'Indian') filtered = filtered.filter(p => !(p.isOverseas||p.o));
    else if(originF === 'Overseas') filtered = filtered.filter(p => !!(p.isOverseas||p.o));
    filtered.sort((a,b) => (a.name||a.n||'').localeCompare(b.name||b.n||''));

    const teams = [...new Set(players.map(p => p.iplTeam||p.t).filter(Boolean))].sort();
    const activeFilters = (statusF !== 'all' ? 1 : 0) + (roleF ? 1 : 0) + (teamF ? 1 : 0) + (originF ? 1 : 0);

    return `
      <!-- Sticky filter header -->
      <div style="position:sticky;top:0;z-index:10;background:var(--bg,#07070C);padding:12px 0;margin:0 0 14px;">
        <div style="padding:10px 14px;border-radius:14px;background:var(--glass-2,rgba(22,24,38,0.8));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--line-2);display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:var(--sh-1);">
          <input id="cdPoolSearch" placeholder="Search player or IPL team…" value="${esc(search)}" oninput="window._cdPoolSearch=this.value;clearTimeout(window._cdPoolDb);window._cdPoolDb=setTimeout(()=>{CD.render();document.getElementById('cdPoolSearch')?.focus();},150);" style="flex:1;min-width:200px;padding:9px 16px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--sans);" />

          <!-- Status pills -->
          <div style="display:flex;gap:4px;">
            ${[['all','All'],['available','Available'],['sold','Sold'],['unsold','Unsold']].map(([k,l]) => `
              <button onclick="window._cdPoolStatus='${k}';CD.render();" style="padding:7px 13px;border-radius:9999px;background:${statusF===k?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${statusF===k?'transparent':'var(--line)'};color:${statusF===k?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;">${l}</button>
            `).join('')}
          </div>

          <button onclick="window._cdPoolAdvanced=${!advOpen};CD.render();" style="padding:7px 13px;border-radius:9999px;background:${activeFilters?'rgba(46,91,255,0.18)':'var(--glass)'};border:1px solid ${activeFilters?'rgba(46,91,255,0.4)':'var(--line)'};color:${activeFilters?'#8EA9FF':'var(--ink-2)'};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            ${I('cog',12)} Advanced${activeFilters ? ' · ' + activeFilters : ''}
          </button>

          ${(activeFilters || search) ? `<button onclick="window._cdPoolStatus='all';window._cdPoolRole='';window._cdPoolTeam='';window._cdPoolOrigin='';window._cdPoolSearch='';CD.render();" style="padding:7px 11px;border-radius:9999px;background:transparent;border:1px solid var(--line);color:var(--red);font-size:11px;font-weight:600;cursor:pointer;">Clear</button>` : ''}
          <span style="font-size:11px;color:var(--mute);margin-left:auto;white-space:nowrap;">${filtered.length} of ${players.length}</span>
        </div>

        ${advOpen ? `
        <div style="margin-top:8px;padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(16px);display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Role</span>
            <select onchange="window._cdPoolRole=this.value;CD.render();" style="padding:7px 11px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;">
              <option value=""${!roleF?' selected':''}>All roles</option>
              <option value="Batter"${roleF==='Batter'?' selected':''}>Batter</option>
              <option value="Bowler"${roleF==='Bowler'?' selected':''}>Bowler</option>
              <option value="All-rounder"${roleF==='All-rounder'?' selected':''}>All-rounder</option>
              <option value="Wicketkeeper"${roleF==='Wicketkeeper'?' selected':''}>Wicketkeeper</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">IPL team</span>
            <select onchange="window._cdPoolTeam=this.value;CD.render();" style="padding:7px 11px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;">
              <option value=""${!teamF?' selected':''}>All teams</option>
              ${teams.map(t => `<option value="${esc(t)}"${teamF===t?' selected':''}>${esc(t)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Origin</span>
            <select onchange="window._cdPoolOrigin=this.value;CD.render();" style="padding:7px 11px;font-size:12px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;">
              <option value=""${!originF?' selected':''}>All</option>
              <option value="Indian"${originF==='Indian'?' selected':''}>Indian</option>
              <option value="Overseas"${originF==='Overseas'?' selected':''}>Overseas</option>
            </select>
          </div>
          <button onclick="CD.downloadPoolCSV()" style="margin-left:auto;padding:7px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>` : ''}
      </div>

      <!-- Player table -->
      <div style="border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);overflow:hidden;">
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:rgba(0,0,0,0.2);">
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Team</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Role</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Type</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Base</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Status</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Sold for</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Buyer</th>
              </tr>
            </thead>
            <tbody class="cd-pool-tbody">
              ${filtered.slice(0, 150).map(p => {
                const name = p.name || p.n || '';
                const status = p.status || 'available';
                const tone = status === 'sold' ? 'lime' : status === 'unsold' ? 'red' : 'electric';
                const isOs = !!(p.isOverseas||p.o);
                return `<tr style="border-top:1px solid var(--line);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding:11px 14px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${CD.Avatar({team: p.iplTeam || p.t, name, size: 28})}
                      <span style="font-weight:600;">${esc(name)}</span>
                    </div>
                  </td>
                  <td style="padding:11px 14px;">${CD.TeamChip({code: p.iplTeam || p.t})}</td>
                  <td style="padding:11px 14px;color:var(--ink-2);font-size:12px;">${esc(p.role || p.r || '')}</td>
                  <td style="padding:11px 14px;">${isOs ? CD.Pill({tone:'gold', style:'font-size:9px;padding:2px 7px;', children:'★ OS'}) : CD.Pill({style:'font-size:9px;padding:2px 7px;', children:'IND'})}</td>
                  <td style="padding:11px 14px;text-align:right;font-family:var(--mono);color:var(--mute);">₹${(p.basePrice||0).toFixed(2)}</td>
                  <td style="padding:11px 14px;">${CD.Pill({tone, style:'font-size:9px;padding:2px 7px;', children: status.toUpperCase()})}</td>
                  <td style="padding:11px 14px;text-align:right;font-family:var(--mono);color:${status==='sold'?'var(--lime)':'var(--mute)'};font-weight:${status==='sold'?700:400};">${p.soldPrice ? '₹'+p.soldPrice.toFixed(2) : '—'}</td>
                  <td style="padding:11px 14px;color:var(--ink-2);font-size:12px;">${esc(p.soldTo || '—')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${filtered.length > 150 ? `<div style="padding:14px;text-align:center;color:var(--mute);font-size:12px;border-top:1px solid var(--line);">Showing first 150 · ${filtered.length - 150} more — narrow filters to see</div>` : ''}
      </div>
    `;
  };

  CD.downloadPoolCSV = () => {
    const rs = window.roomState || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    if(!players.length){ window.showAlert?.('No players to export.','err'); return; }
    const csvEscape = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [['Player','IPL Team','Role','Overseas','Base (Cr)','Status','Sold For (Cr)','Buyer']];
    players.slice().sort((a,b) => (a.name||a.n||'').localeCompare(b.name||b.n||'')).forEach(p => {
      rows.push([p.name||p.n||'', p.iplTeam||p.t||'', p.role||p.r||'', (p.isOverseas||p.o)?'Yes':'No', (p.basePrice||0).toFixed(2), p.status||'available', p.soldPrice ? p.soldPrice.toFixed(2) : '', p.soldTo||'']);
    });
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'player-pool.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    if(typeof window.showAlert === 'function') window.showAlert('Pool CSV downloaded','ok');
  };

  // Analytics — category sidebar + stat tables
  CD.renderAnalytics = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const matchKeys = Object.keys(matches);
    if(!matchKeys.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;margin-bottom:6px;">Analytics <span class="ed-i" style="color:var(--electric);">awaiting data</span></div><div style="font-size:13px;">Detailed player analytics will appear once matches are played.</div></div>`;

    // Build per-player aggregate stats from breakdown strings
    const ownerMap = {};
    Object.values(teams).forEach(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      roster.forEach(p => { ownerMap[(p.name||p.n||'').toLowerCase().trim()] = { team: t.name, price: p.soldPrice || 0, iplTeam: p.iplTeam || p.t || '', role: p.role || p.r || '', isOs: !!(p.isOverseas || p.o) }; });
    });
    const agg = {};
    Object.values(matches).forEach(m => {
      if(!m.players) return;
      Object.values(m.players).forEach(p => {
        const k = (p.name||'').toLowerCase().trim();
        if(!k) return;
        if(!agg[k]) agg[k] = { name: p.name, pts:0, mc:0, runs:0, balls:0, fours:0, sixes:0, hs:0, h50:0, h100:0, wkts:0, overs:0, runsConc:0, c5w:0, c3w:0, catches:0, stumps:0, runouts:0, inns:0, bowlInns:0 };
        const s = agg[k]; s.pts += (p.pts || 0); s.mc++;
        const bd = p.breakdown || '';
        const batM = bd.match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x×]4)?(?:\s+(\d+)[x×]6)?/);
        if(batM){ const r=+batM[1]; s.runs+=r; s.balls+=+batM[2]; s.fours+=+(batM[3]||0); s.sixes+=+(batM[4]||0); s.inns++; if(r>s.hs)s.hs=r; if(r>=100)s.h100++; else if(r>=50)s.h50++; }
        const bowM = bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
        if(bowM){
          const w = +bowM[1], ov = +bowM[2];
          s.wkts += w; s.overs += ov; s.bowlInns++;
          let runsFromBd = bowM[3] ? +bowM[3] : null;
          if(runsFromBd === null){
            const ecoM = bd.match(/eco:([\d.]+)/);
            if(ecoM && +ecoM[1] > 0 && ov > 0) runsFromBd = Math.round(+ecoM[1] * ov);
          }
          s.runsConc += (runsFromBd || 0);
          if(w >= 5) s.c5w++;
          if(w >= 3) s.c3w++;
        }
        const fldM = bd.match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
        if(fldM){ s.catches+=+fldM[1]; s.stumps+=+fldM[2]; s.runouts+=+fldM[3]; }
      });
    });
    // Enrich
    Object.entries(agg).forEach(([k,v]) => { const o = ownerMap[k] || {}; v.owner = o.team || ''; v.iplTeam = o.iplTeam || ''; v.role = o.role || ''; v.price = o.price || 0; });

    const all = Object.values(agg);
    const cat = window._cdAnCat || 'points';
    const sub = window._cdAnSub || 'overall';
    const search = (window._cdAnSearch || '').toLowerCase().trim();
    const ownerF = window._cdAnOwner || 'all';

    const CATS = {
      points: { label:'⭐ Points', subs: {
        overall: { label:'Overall', sort:(a,b)=>b.pts-a.pts, cols:['Player','Owner','Inns','Runs','Wkts','Pts'], row:p=>[p.name,p.owner||'—',p.mc,p.runs,p.wkts,p.pts], fmt:[null,null,null,null,null,v=>`<span style="color:${v>0?'var(--lime)':v<0?'var(--red)':'var(--mute)'};font-family:var(--display);font-weight:800;">${v>=0?'+':''}${Math.round(v)}</span>`] },
        batters: { label:'Top Batters', filter:p=>/batter|keep/i.test(p.role), sort:(a,b)=>b.pts-a.pts, cols:['Player','Owner','Runs','4s','6s','Pts'], row:p=>[p.name,p.owner||'—',p.runs,p.fours,p.sixes,p.pts], fmt:[null,null,null,null,null,v=>`<span style="color:${v>0?'var(--lime)':'var(--mute)'};font-family:var(--display);font-weight:800;">${v>=0?'+':''}${Math.round(v)}</span>`] },
        bowlers: { label:'Top Bowlers', filter:p=>/bowl|all/i.test(p.role), sort:(a,b)=>b.pts-a.pts, cols:['Player','Owner','Wkts','Overs','Eco','Pts'], row:p=>[p.name,p.owner||'—',p.wkts,p.overs.toFixed(1),p.overs?(p.runsConc/p.overs).toFixed(2):'—',p.pts], fmt:[null,null,null,null,null,v=>`<span style="color:${v>0?'var(--lime)':'var(--mute)'};font-family:var(--display);font-weight:800;">${v>=0?'+':''}${Math.round(v)}</span>`] },
        value: { label:'Best Value', filter:p=>p.price>0 && p.pts>0, sort:(a,b)=>(b.pts/b.price)-(a.pts/a.price), cols:['Player','Owner','Pts','Price','Pts/Cr'], row:p=>[p.name,p.owner||'—',p.pts,'₹'+p.price.toFixed(1)+'cr',p.price?(p.pts/p.price).toFixed(1):'—'] }
      }},
      batting: { label:'🏏 Batting', subs: {
        runs: { label:'Most Runs', filter:p=>p.runs>0, sort:(a,b)=>b.runs-a.runs, cols:['Player','Owner','Runs','Balls','SR','HS'], row:p=>[p.name,p.owner||'—',p.runs,p.balls,p.balls?((p.runs/p.balls)*100).toFixed(1):'—',p.hs] },
        hs: { label:'Highest Score', filter:p=>p.hs>0, sort:(a,b)=>b.hs-a.hs, cols:['Player','Owner','HS','Runs','Inns'], row:p=>[p.name,p.owner||'—',p.hs,p.runs,p.inns] },
        sr: { label:'Best Strike Rate', filter:p=>p.balls>=30, sort:(a,b)=>(b.runs/b.balls)-(a.runs/a.balls), cols:['Player','Owner','SR','Runs','Balls'], row:p=>[p.name,p.owner||'—',((p.runs/p.balls)*100).toFixed(1),p.runs,p.balls] },
        h100: { label:'Centuries', filter:p=>p.h100>0, sort:(a,b)=>b.h100-a.h100, cols:['Player','Owner','100s','Runs','HS'], row:p=>[p.name,p.owner||'—',p.h100,p.runs,p.hs] },
        h50: { label:'Fifties', filter:p=>p.h50>0, sort:(a,b)=>b.h50-a.h50, cols:['Player','Owner','50s','Runs','Inns'], row:p=>[p.name,p.owner||'—',p.h50,p.runs,p.inns] },
        sixes: { label:'Most Sixes', filter:p=>p.sixes>0, sort:(a,b)=>b.sixes-a.sixes, cols:['Player','Owner','6s','Runs','Balls'], row:p=>[p.name,p.owner||'—',p.sixes,p.runs,p.balls] },
        fours: { label:'Most Fours', filter:p=>p.fours>0, sort:(a,b)=>b.fours-a.fours, cols:['Player','Owner','4s','Runs','Inns'], row:p=>[p.name,p.owner||'—',p.fours,p.runs,p.inns] }
      }},
      bowling: { label:'🎯 Bowling', subs: {
        wkts: { label:'Most Wickets', filter:p=>p.wkts>0, sort:(a,b)=>b.wkts-a.wkts, cols:['Player','Owner','Wkts','Overs','5W'], row:p=>[p.name,p.owner||'—',p.wkts,p.overs.toFixed(1),p.c5w] },
        eco: { label:'Best Economy (≥6 ov)', filter:p=>p.overs>=6, sort:(a,b)=>(a.runsConc/a.overs)-(b.runsConc/b.overs), cols:['Player','Owner','Eco','Wkts','Overs'], row:p=>[p.name,p.owner||'—',(p.runsConc/p.overs).toFixed(2),p.wkts,p.overs.toFixed(1)] },
        c5w: { label:'5-Wkt Hauls', filter:p=>p.c5w>0, sort:(a,b)=>b.c5w-a.c5w, cols:['Player','Owner','5W','Wkts','Overs'], row:p=>[p.name,p.owner||'—',p.c5w,p.wkts,p.overs.toFixed(1)] },
        c3w: { label:'3-Wkt Hauls', filter:p=>p.c3w>0, sort:(a,b)=>b.c3w-a.c3w, cols:['Player','Owner','3W','Wkts','Overs'], row:p=>[p.name,p.owner||'—',p.c3w,p.wkts,p.overs.toFixed(1)] }
      }},
      fielding: { label:'🧤 Fielding', subs: {
        dism: { label:'Most Dismissals', filter:p=>(p.catches+p.stumps+p.runouts)>0, sort:(a,b)=>(b.catches+b.stumps+b.runouts)-(a.catches+a.stumps+a.runouts), cols:['Player','Owner','Dis','C','St','RO'], row:p=>[p.name,p.owner||'—',p.catches+p.stumps+p.runouts,p.catches,p.stumps,p.runouts] },
        catches: { label:'Most Catches', filter:p=>p.catches>0, sort:(a,b)=>b.catches-a.catches, cols:['Player','Owner','Catches','Pts'], row:p=>[p.name,p.owner||'—',p.catches,p.pts] },
        runouts: { label:'Most Run-outs', filter:p=>p.runouts>0, sort:(a,b)=>b.runouts-a.runouts, cols:['Player','Owner','RO','Pts'], row:p=>[p.name,p.owner||'—',p.runouts,p.pts] }
      }}
    };

    const activeCat = CATS[cat] || CATS.points;
    const subKeys = Object.keys(activeCat.subs);
    const activeSub = activeCat.subs[sub] || activeCat.subs[subKeys[0]];
    let rows = all.slice();
    if(activeSub.filter) rows = rows.filter(activeSub.filter);
    if(search) rows = rows.filter(p => p.name.toLowerCase().includes(search));
    if(ownerF === 'owned') rows = rows.filter(p => p.owner);
    else if(ownerF === 'unowned') rows = rows.filter(p => !p.owner);
    if(activeSub.sort) rows.sort(activeSub.sort);

    const sidebarW = CD.state.isMobile ? '100%' : '220px';
    return `
      <div style="display:${CD.state.isMobile ? 'block' : 'grid'};grid-template-columns:${sidebarW} 1fr;gap:16px;">
        <!-- Sidebar -->
        <aside style="padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);${CD.state.isMobile ? 'margin-bottom:14px;' : 'position:sticky;top:12px;align-self:start;'}">
          ${Object.entries(CATS).map(([ck, cv]) => `
            <div style="margin-bottom:10px;">
              <button onclick="window._cdAnCat='${ck}';window._cdAnSub='';CD.render();" style="width:100%;padding:10px 12px;border-radius:10px;background:${cat===ck?'rgba(46,91,255,0.18)':'transparent'};border:1px solid ${cat===ck?'rgba(46,91,255,0.4)':'transparent'};color:${cat===ck?'#fff':'var(--ink-2)'};font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;text-align:left;">${cv.label}</button>
              ${cat===ck ? `<div style="margin-top:4px;display:flex;flex-direction:column;gap:2px;padding-left:8px;">
                ${Object.entries(cv.subs).map(([sk, sv]) => `<button onclick="window._cdAnSub='${sk}';CD.render();" style="padding:6px 10px;border-radius:8px;background:${sub===sk?'rgba(255,255,255,0.06)':'transparent'};border:none;color:${sub===sk?'var(--ink)':'var(--mute)'};font-size:12px;cursor:pointer;text-align:left;">${sv.label}</button>`).join('')}
              </div>` : ''}
            </div>
          `).join('')}
        </aside>

        <!-- Main -->
        <div>
          <div style="padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <input id="cdAnSearch" placeholder="Search players…" value="${esc(search)}" oninput="window._cdAnSearch=this.value;clearTimeout(window._cdAnDb);window._cdAnDb=setTimeout(()=>{CD.render();document.getElementById('cdAnSearch')?.focus();},150);" style="flex:1;min-width:180px;padding:9px 14px;font-size:13px;color:var(--ink);background:var(--glass);border:1px solid var(--line-2);border-radius:9999px;outline:none;font-family:var(--sans);" />
            <div style="display:flex;gap:4px;">
              ${[['all','All'],['owned','Owned'],['unowned','Unowned']].map(([k,l]) => `<button onclick="window._cdAnOwner='${k}';CD.render();" style="padding:7px 12px;border-radius:9999px;background:${ownerF===k?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${ownerF===k?'transparent':'var(--line)'};color:${ownerF===k?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;cursor:pointer;">${l}</button>`).join('')}
            </div>
          </div>
          <div style="border-radius:14px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(24px);border:1px solid var(--line-2);overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
              <div class="ed" style="font-size:20px;">${activeSub.label}</div>
              <div style="font-size:11px;color:var(--mute);">${rows.length} players</div>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:rgba(0,0,0,0.2);"><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">#</th>${activeSub.cols.map((c,i) => `<th style="padding:10px 14px;text-align:${i>=2?'right':'left'};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">${c}</th>`).join('')}</tr></thead>
                <tbody class="cd-analytics-tbody">
                  ${rows.slice(0, 50).map((p, i) => {
                    const rowVals = activeSub.row(p);
                    return `<tr style="border-top:1px solid var(--line);" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                      <td style="padding:11px 14px;font-family:var(--display);font-size:15px;color:var(--mute);">${(i+1).toString().padStart(2,'0')}</td>
                      ${rowVals.map((v, j) => {
                        const fmt = (activeSub.fmt && activeSub.fmt[j]) ? activeSub.fmt[j](v) : null;
                        if(j === 0) return `<td style="padding:11px 14px;"><div style="display:flex;align-items:center;gap:10px;">${CD.Avatar({team:p.iplTeam, name:v, size:26})}<span style="font-weight:600;">${esc(v)}</span></div></td>`;
                        const align = j >= 2 ? 'right' : 'left';
                        return `<td style="padding:11px 14px;text-align:${align};color:var(--ink-2);${j>=2?'font-family:var(--mono);':''}">${fmt != null ? fmt : esc(String(v))}</td>`;
                      }).join('')}
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
              ${rows.length === 0 ? `<div style="padding:30px;text-align:center;color:var(--mute);font-size:12px;">No data matches this filter.</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Match Data — master-detail layout (list left, tables right)
  CD.renderMatches = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const teams = rs.teams || {};
    const isAdmin = window.isAdmin || false;
    const list = Object.entries(matches).sort((a,b) => (b[1].timestamp||0) - (a[1].timestamp||0));

    if(!list.length) return `
      <div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);">
        <div style="margin:0 auto 12px;width:48px;height:48px;border-radius:50%;background:rgba(46,91,255,0.15);display:flex;align-items:center;justify-content:center;color:var(--electric);">${I('cal',24)}</div>
        <div class="ed" style="font-size:22px;margin-bottom:4px;">No matches <span class="ed-i" style="color:var(--pink);">recorded</span></div>
        <div style="font-size:13px;">${isAdmin ? 'Submit a scorecard from the Points tab to populate this view.' : 'Match scorecards will appear here once submitted.'}</div>
      </div>`;

    const selected = window._cdMatchId || list[0][0];
    const selectedMatch = matches[selected] || list[0][1];
    const selectedTab = window._cdMatchTab || 'batting';

    const parseBd = (bd) => bd || '';
    const getMatchPlayers = (m) => m.players ? Object.values(m.players) : [];

    // Classify players by what they did
    const players = getMatchPlayers(selectedMatch);
    const batters = players.filter(p => /Bat/.test(p.breakdown || '')).sort((a,b) => (b.pts||0) - (a.pts||0));
    const bowlers = players.filter(p => /Bowl/.test(p.breakdown || '')).sort((a,b) => (b.pts||0) - (a.pts||0));
    const fielders = players.filter(p => /Field/.test(p.breakdown || '')).sort((a,b) => (b.pts||0) - (a.pts||0));

    const ownerMap = {};
    Object.values(teams).forEach(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      roster.forEach(p => { ownerMap[(p.name||p.n||'').toLowerCase().trim()] = t.name; });
    });

    return `
      <div style="display:${CD.state.isMobile ? 'block' : 'grid'};grid-template-columns:320px 1fr;gap:16px;">
        <!-- Match list (left) -->
        <aside style="padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(20px);${CD.state.isMobile ? 'margin-bottom:14px;' : 'max-height:calc(100vh - 200px);overflow-y:auto;'}">
          <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Matches · ${list.length}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${list.map(([id, m]) => {
              const active = id === selected;
              const pc = m.players ? Object.keys(m.players).length : 0;
              return `<div onclick="window._cdMatchId='${esc(id)}';CD.render();" style="padding:12px;border-radius:10px;background:${active?'rgba(46,91,255,0.18)':'rgba(255,255,255,0.02)'};border:1px solid ${active?'rgba(46,91,255,0.4)':'var(--line)'};cursor:pointer;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
                  <div class="ed" style="font-size:15px;line-height:1.1;">${esc(m.label || id)}</div>
                  ${m.winner ? CD.Pill({tone:'lime', style:'font-size:9px;padding:2px 7px;', children: esc(m.winner)}) : ''}
                </div>
                <div style="font-size:10px;color:var(--mute);">${m.motm ? 'MOTM: ' + esc(m.motm) + ' · ' : ''}${pc} scores</div>
              </div>`;
            }).join('')}
          </div>
        </aside>

        <!-- Match detail (right) -->
        <section>
          <!-- Hero -->
          <div style="padding:20px 24px;border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:14px;position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:radial-gradient(ellipse 60% 40% at 20% 20%,rgba(46,91,255,0.15),transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(255,45,135,0.12),transparent 60%);pointer-events:none;"></div>
            <div style="position:relative;">
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Match</div>
              <h2 class="ed" style="font-size:32px;line-height:1.05;margin-top:2px;">${esc(selectedMatch.label || '')}</h2>
              <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
                ${selectedMatch.winner ? CD.Pill({tone:'lime', children:'Winner · ' + esc(selectedMatch.winner)}) : CD.Pill({children:'No result'})}
                ${selectedMatch.motm ? CD.Pill({tone:'gold', children:'MOTM · ' + esc(selectedMatch.motm)}) : ''}
                ${CD.Pill({children: players.length + ' scores'})}
              </div>
              ${isAdmin ? `<button onclick="window.switchTab && window.switchTab('matches');setTimeout(()=>{var b=document.querySelector('[onclick*=\\'deleteMatch\\'][onclick*=\\'${esc(selected)}\\']');if(b)b.click();}, 100);" style="margin-top:12px;padding:7px 14px;border-radius:9999px;background:rgba(255,59,59,0.15);border:1px solid rgba(255,59,59,0.4);color:var(--red);font-size:11px;font-weight:600;cursor:pointer;">Delete match</button>` : ''}
            </div>
          </div>

          <!-- Tabs -->
          <div style="display:flex;gap:4px;padding:4px;border-radius:9999px;background:var(--glass);border:1px solid var(--line);margin-bottom:14px;width:fit-content;">
            ${[['batting','Batting',batters.length],['bowling','Bowling',bowlers.length],['fielding','Fielding',fielders.length]].map(([k,l,n]) => `
              <button onclick="window._cdMatchTab='${k}';CD.render();" style="padding:7px 14px;border-radius:9999px;background:${selectedTab===k?'linear-gradient(180deg,var(--pink-2),var(--pink))':'transparent'};border:none;color:${selectedTab===k?'#fff':'var(--mute)'};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">${l} · ${n}</button>
            `).join('')}
          </div>

          <!-- Stat table -->
          <div style="border-radius:14px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(24px);border:1px solid var(--line-2);overflow:hidden;">
            ${selectedTab === 'batting' ? CD._matchBattingTable(batters, ownerMap) :
              selectedTab === 'bowling' ? CD._matchBowlingTable(bowlers, ownerMap) :
              CD._matchFieldingTable(fielders, ownerMap)}
          </div>
        </section>
      </div>
    `;
  };

  CD._matchBattingTable = (batters, ownerMap) => {
    if(!batters.length) return `<div style="padding:40px;text-align:center;color:var(--mute);">No batting performances recorded.</div>`;
    return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:rgba(0,0,0,0.2);">
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Owner</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">R</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">B</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">4s</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">6s</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">SR</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Pts</th>
      </tr></thead><tbody>
      ${batters.map(p => {
        const m = (p.breakdown||'').match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x×]4)?(?:\s+(\d+)[x×]6)?/);
        const r = m?+m[1]:0, b = m?+m[2]:0, f = m?(+(m[3]||0)):0, s = m?(+(m[4]||0)):0;
        const sr = b>0 ? ((r/b)*100).toFixed(1) : '—';
        const owner = ownerMap[(p.name||'').toLowerCase().trim()] || '';
        return `<tr style="border-top:1px solid var(--line);">
          <td style="padding:10px 14px;"><div style="display:flex;align-items:center;gap:8px;">${CD.Avatar({name:p.name,size:24})}<span style="font-weight:600;">${esc(p.name)}</span>${p.duck?' <span style="color:var(--red);font-size:10px;font-weight:700;">DUCK</span>':''}</div></td>
          <td style="padding:10px 14px;color:${owner?'var(--ink-2)':'var(--mute)'};font-size:12px;">${esc(owner||'—')}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:700;">${r}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--mute);">${b}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);">${f}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);">${s}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--ink-2);">${sr}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--display);font-size:17px;font-weight:800;color:${(p.pts||0)>0?'var(--lime)':(p.pts||0)<0?'var(--red)':'var(--mute)'};">${(p.pts||0)>=0?'+':''}${Math.round(p.pts||0)}</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`;
  };
  CD._matchBowlingTable = (bowlers, ownerMap) => {
    if(!bowlers.length) return `<div style="padding:40px;text-align:center;color:var(--mute);">No bowling performances recorded.</div>`;
    return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:rgba(0,0,0,0.2);">
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Owner</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Ov</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">R</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">W</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Eco</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Pts</th>
      </tr></thead><tbody>
      ${bowlers.map(p => {
        const bd = p.breakdown || '';
        const m = bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
        const w = m ? +m[1] : 0;
        const ov = m ? +m[2] : 0;
        // Runs conceded: prefer explicit "Nr" in the breakdown; otherwise
        // derive from "eco:X" × overs so global-scorecard entries
        // (Bowl(2w 4ov eco:5.00)) don't collapse to 0.
        let r = m && m[3] !== undefined ? +m[3] : null;
        const ecoM = bd.match(/eco:([\d.]+)/);
        const ecoRaw = ecoM ? +ecoM[1] : null;
        if(r === null){
          r = (ecoRaw != null && ov > 0) ? Math.round(ecoRaw * ov) : 0;
        }
        // Economy display: prefer the stored eco value verbatim,
        // otherwise compute from runs/overs.
        let eco;
        if(ecoRaw != null && ecoRaw > 0) eco = ecoRaw.toFixed(2);
        else if(ov > 0 && r > 0) eco = (r / ov).toFixed(2);
        else eco = '—';
        const owner = ownerMap[(p.name||'').toLowerCase().trim()] || '';
        return `<tr style="border-top:1px solid var(--line);">
          <td style="padding:10px 14px;"><div style="display:flex;align-items:center;gap:8px;">${CD.Avatar({name:p.name,size:24})}<span style="font-weight:600;">${esc(p.name)}</span></div></td>
          <td style="padding:10px 14px;color:${owner?'var(--ink-2)':'var(--mute)'};font-size:12px;">${esc(owner||'—')}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);">${ov.toFixed(1)}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--mute);">${r}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:700;">${w}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);color:var(--ink-2);">${eco}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--display);font-size:17px;font-weight:800;color:${(p.pts||0)>0?'var(--lime)':(p.pts||0)<0?'var(--red)':'var(--mute)'};">${(p.pts||0)>=0?'+':''}${Math.round(p.pts||0)}</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`;
  };
  CD._matchFieldingTable = (fielders, ownerMap) => {
    if(!fielders.length) return `<div style="padding:40px;text-align:center;color:var(--mute);">No fielding contributions recorded.</div>`;
    return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:rgba(0,0,0,0.2);">
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Owner</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">C</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">St</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">RO</th>
        <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Pts</th>
      </tr></thead><tbody>
      ${fielders.map(p => {
        const m = (p.breakdown||'').match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
        const c = m?+m[1]:0, s = m?+m[2]:0, ro = m?+m[3]:0;
        const owner = ownerMap[(p.name||'').toLowerCase().trim()] || '';
        return `<tr style="border-top:1px solid var(--line);">
          <td style="padding:10px 14px;"><div style="display:flex;align-items:center;gap:8px;">${CD.Avatar({name:p.name,size:24})}<span style="font-weight:600;">${esc(p.name)}</span></div></td>
          <td style="padding:10px 14px;color:${owner?'var(--ink-2)':'var(--mute)'};font-size:12px;">${esc(owner||'—')}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:${c>0?700:400};">${c}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:${s>0?700:400};">${s}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--mono);font-weight:${ro>0?700:400};">${ro}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--display);font-size:17px;font-weight:800;color:${(p.pts||0)>0?'var(--lime)':'var(--mute)'};">${(p.pts||0)>=0?'+':''}${Math.round(p.pts||0)}</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`;
  };

  // Schedule — IPL 2026 70-match fixture list (+ trade windows after every 10 matches)
  CD.renderSchedule = () => {
    const schedule = window.IPL_SCHEDULE || [];
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const TRADE_WINDOWS = [10, 20, 30, 40, 50, 60];
    if(!schedule.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;">Schedule loading…</div></div>`;

    // Today's date (Apr 23, 2026 format)
    const today = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const todayStr = (String(today.getDate()).padStart(2,'0')) + ' ' + months[today.getMonth()];

    // Group by date
    const byDate = {};
    schedule.forEach(m => { if(!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });

    // --- Build played-match lookup keyed by schedule sr ---
    // Strategy: teams play each other twice in a season, so a simple
    // team-pair key collides. Prefer an explicit match number extracted
    // from the label ("Match 11", "#11", "M11", " 11 "), otherwise assign
    // played matches to schedule slots in chronological order.
    const resultBySr = {};
    const allPlayed = Object.values(matches).slice().sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
    const unmatched = [];

    // Phase 1: extract sr from explicit match-number markers
    // (don't grab bare numbers — labels often include dates like "24 Apr")
    allPlayed.forEach(pl => {
      const lab = (pl.label || '').trim();
      let sr = null;
      const marked = lab.match(/(?:match\s*#?|\bmatch\s+no\.?\s*|#)\s*(\d{1,3})\b/i)
                 || lab.match(/\bm\s*(\d{1,3})\b/i);
      if(marked) sr = parseInt(marked[1], 10);
      if(sr !== null && sr >= 1 && sr <= schedule.length && !resultBySr[sr]){
        resultBySr[sr] = pl;
      } else {
        unmatched.push(pl);
      }
    });

    // Phase 2: assign remaining by team-pair to earliest open slot
    unmatched.forEach(pl => {
      const lab = (pl.label || '').toUpperCase();
      const pair = lab.match(/([A-Z]{2,4})\s*VS?\s*([A-Z]{2,4})/);
      if(!pair) return;
      const t1 = pair[1], t2 = pair[2];
      for(let i = 0; i < schedule.length; i++){
        const s = schedule[i];
        if(resultBySr[s.sr]) continue;
        const sm1 = (s.t1||'').toUpperCase(), sm2 = (s.t2||'').toUpperCase();
        if((sm1 === t1 && sm2 === t2) || (sm1 === t2 && sm2 === t1)){
          resultBySr[s.sr] = pl;
          break;
        }
      }
    });

    const parseDateForSort = (dStr) => {
      const [day, mon] = dStr.split(' ');
      const monIdx = months.indexOf(mon);
      return (monIdx * 100) + (+day);
    };

    const sortedDates = Object.keys(byDate).sort((a,b) => parseDateForSort(a) - parseDateForSort(b));

    // Trade window banner (reusable)
    const tradeBanner = (wIdx, prevSr, nextSr) => `
      <div style="position:relative;padding:16px 22px;border-radius:14px;background:linear-gradient(135deg,rgba(255,199,0,0.14),rgba(46,91,255,0.10));border:1px dashed rgba(255,199,0,0.45);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="width:34px;height:34px;border-radius:9999px;background:linear-gradient(135deg,var(--gold),#ff9f1c);display:flex;align-items:center;justify-content:center;color:#111;font-weight:900;font-family:var(--display);font-size:14px;">W${wIdx}</div>
          <div>
            <div style="font-size:10px;color:var(--gold);letter-spacing:0.2em;text-transform:uppercase;font-weight:800;">Change & Trade Window ${wIdx}</div>
            <div style="font-size:13px;color:var(--ink);font-weight:600;margin-top:2px;">Between Match #${prevSr} and Match #${nextSr}</div>
            <div style="font-size:11px;color:var(--mute);margin-top:3px;">Teams may trade players and adjust squads during this window.</div>
          </div>
        </div>
        ${CD.Pill({tone:'gold', children:'TRADE OPEN'})}
      </div>
    `;

    return `
      <div style="padding:16px 20px;border-radius:14px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:18px;">
        <div style="font-size:10px;color:var(--mute);letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">IPL 2026</div>
        <h2 class="ed" style="font-size:32px;margin-top:2px;">Season <span class="ed-i" style="color:var(--gold);">schedule</span></h2>
        <div style="font-size:12px;color:var(--mute);margin-top:6px;">${schedule.length} matches · 10 teams · ${TRADE_WINDOWS.length} trade windows</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        ${sortedDates.map(d => {
          const isToday = d === todayStr;
          const dayMatches = byDate[d].slice().sort((a,b) => a.sr - b.sr);
          // Does a trade window fall *within* this day (same day has both match N and N+1)?
          const innerWindowSrs = dayMatches
            .map(m => m.sr)
            .filter(sr => TRADE_WINDOWS.includes(sr) && dayMatches.some(x => x.sr === sr + 1));
          // Does a trade window fall *after* this day (last match of day is N, N+1 is next day)?
          const outerWindowSrs = dayMatches
            .map(m => m.sr)
            .filter(sr => TRADE_WINDOWS.includes(sr) && !dayMatches.some(x => x.sr === sr + 1));

          const dayCard = `
            <div style="border-radius:14px;background:${isToday?'linear-gradient(135deg,rgba(255,45,135,0.12),rgba(46,91,255,0.10))':'var(--glass)'};border:1px solid ${isToday?'rgba(255,45,135,0.35)':'var(--line)'};backdrop-filter:blur(20px);overflow:hidden;">
              <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="font-family:var(--display);font-size:20px;font-weight:800;color:${isToday?'var(--pink)':'var(--ink)'};letter-spacing:0.02em;">${esc(d)}</div>
                  ${isToday ? CD.Pill({tone:'pink', children: CD.LiveDot() + ' TODAY'}) : ''}
                </div>
                <div style="font-size:11px;color:var(--mute);">${dayMatches.length} match${dayMatches.length>1?'es':''}</div>
              </div>
              <div style="padding:12px 18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">
                ${dayMatches.map(m => {
                  const result = resultBySr[m.sr];
                  const isNoResult = result && (result.result === 'noresult');
                  const [c1a, c2a] = TEAM_COLORS[m.t1] || ['#444','#222'];
                  const [c1b, c2b] = TEAM_COLORS[m.t2] || ['#444','#222'];
                  let statusPill = '';
                  if(result){
                    if(isNoResult){
                      statusPill = CD.Pill({style:'font-size:9px;padding:2px 7px;background:rgba(255,255,255,0.08);color:var(--mute);border-color:var(--line-2);', children:'No Result'});
                    } else if(result.winner){
                      statusPill = CD.Pill({tone:'lime', style:'font-size:9px;padding:2px 7px;', children:'W: ' + esc(result.winner)});
                    } else {
                      statusPill = CD.Pill({style:'font-size:9px;padding:2px 7px;', children:'Completed'});
                    }
                  }
                  const innerBanner = innerWindowSrs.includes(m.sr) ? `
                    <div style="grid-column:1/-1;margin:6px 0;">
                      ${tradeBanner(TRADE_WINDOWS.indexOf(m.sr)+1, m.sr, m.sr+1)}
                    </div>
                  ` : '';
                  return `<div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid var(--line);">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <div style="display:flex;align-items:center;gap:6px;">
                        <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,${c1a},${c2a});box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15);"></div>
                        <span style="font-family:var(--display);font-weight:800;font-size:13px;">${esc(m.t1)}</span>
                      </div>
                      <span style="font-size:10px;color:var(--mute);font-style:italic;">vs</span>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-family:var(--display);font-weight:800;font-size:13px;">${esc(m.t2)}</span>
                        <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,${c1b},${c2b});box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15);"></div>
                      </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--mute);margin-top:6px;">
                      <span>Match ${m.sr}</span>
                      <span>${esc(m.time||'')} · ${esc(m.city||'')}</span>
                    </div>
                    ${statusPill ? `<div style="margin-top:6px;font-size:10px;">${statusPill}</div>` : ''}
                  </div>${innerBanner}`;
                }).join('')}
              </div>
            </div>
          `;

          const afterBanners = outerWindowSrs.map(sr => tradeBanner(TRADE_WINDOWS.indexOf(sr)+1, sr, sr+1)).join('');
          return dayCard + afterBanners;
        }).join('')}
      </div>
    `;
  };

  CD.renderTrades = () => {
    const rs = window.roomState || {};
    const trades = rs.trades ? Object.entries(rs.trades).map(([id, t]) => ({id, ...t})) : [];
    const myTeam = window.myTeamName || '';
    const teams = rs.teams || {};

    // Separate pending / completed for current user
    const received = trades.filter(t => t.to === myTeam && t.status === 'pending');
    const sentP = trades.filter(t => t.from === myTeam && t.status === 'pending');
    const history = trades.filter(t => t.status === 'accepted' || t.status === 'rejected' || t.status === 'cancelled');

    const renderTradeCard = (t, kind) => {
      const fromRoster = teams[t.from]?.roster || [];
      const toRoster = teams[t.to]?.roster || [];
      const sendNames = t.sending || [];
      const recvNames = t.receiving || [];
      const cSend = teamCode(t.from);
      const cRecv = teamCode(t.to);
      const [c1a, c2a] = TEAM_COLORS[cSend] || ['#444','#222'];
      const [c1b, c2b] = TEAM_COLORS[cRecv] || ['#444','#222'];
      const statusTone = t.status === 'accepted' ? 'lime' : t.status === 'rejected' || t.status === 'cancelled' ? 'red' : 'electric';
      const when = t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '';
      return `
        <div style="border-radius:16px;background:var(--glass);border:1px solid var(--line);overflow:hidden;backdrop-filter:blur(20px);">
          <div style="padding:14px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:6px;">${CD.Avatar({name: t.from, size: 28})}<span style="font-weight:600;font-size:13px;">${esc(t.from)}</span></div>
              <span style="color:var(--mute);font-style:italic;font-family:var(--serif);">⇌</span>
              <div style="display:flex;align-items:center;gap:6px;">${CD.Avatar({name: t.to, size: 28})}<span style="font-weight:600;font-size:13px;">${esc(t.to)}</span></div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              ${CD.Pill({tone: statusTone, children: (t.status||'pending').toUpperCase()})}
              ${when ? `<span style="font-size:10px;color:var(--mute);">${esc(when)}</span>` : ''}
            </div>
          </div>
          <div style="padding:14px 18px;display:grid;grid-template-columns:${CD.state.isMobile ? '1fr' : '1fr 40px 1fr'};gap:12px;align-items:center;">
            <div>
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">${esc(t.from)} sends</div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${sendNames.length ? sendNames.map(n => `<div style="padding:6px 8px;border-radius:10px;background:linear-gradient(135deg,${c1a}25,${c2a}10);border:1px solid var(--line);display:flex;align-items:center;gap:8px;">${CD.Avatar({name: n, size: 22})}<span style="font-size:12px;font-weight:600;">${esc(n)}</span></div>`).join('') : `<div style="color:var(--mute);font-size:12px;padding:6px;">Nothing</div>`}
              </div>
            </div>
            <div style="text-align:center;color:var(--mute);font-size:24px;${CD.state.isMobile ? 'display:none;' : ''}">→</div>
            <div>
              <div style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">${esc(t.to)} sends</div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${recvNames.length ? recvNames.map(n => `<div style="padding:6px 8px;border-radius:10px;background:linear-gradient(135deg,${c1b}25,${c2b}10);border:1px solid var(--line);display:flex;align-items:center;gap:8px;">${CD.Avatar({name: n, size: 22})}<span style="font-size:12px;font-weight:600;">${esc(n)}</span></div>`).join('') : `<div style="color:var(--mute);font-size:12px;padding:6px;">Nothing</div>`}
              </div>
            </div>
          </div>
          ${kind === 'received' ? `
            <div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;">
              <button onclick="window.acceptTrade && window.acceptTrade('${esc(t.id)}')" style="padding:9px 16px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-size:12px;font-weight:700;cursor:pointer;">${I('check',12)} Accept</button>
              <button onclick="window.rejectTrade && window.rejectTrade('${esc(t.id)}')" style="padding:9px 16px;border-radius:9999px;background:rgba(255,59,59,0.15);color:var(--red);border:1px solid rgba(255,59,59,0.4);font-size:12px;font-weight:600;cursor:pointer;">${I('x',12)} Reject</button>
            </div>
          ` : ''}
          ${kind === 'sentP' ? `
            <div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;">
              <button onclick="window.cancelTrade && window.cancelTrade('${esc(t.id)}')" style="padding:9px 16px;border-radius:9999px;background:var(--glass);border:1px solid var(--line);color:var(--mute);font-size:12px;font-weight:600;cursor:pointer;">Cancel proposal</button>
            </div>
          ` : ''}
        </div>
      `;
    };

    if(!myTeam) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;">Register your team first to propose trades.</div>`;

    return `
      <!-- New trade proposer -->
      <div style="padding:20px;border-radius:18px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
          <div class="ed" style="font-size:24px;">Propose a <span class="ed-i" style="color:var(--pink);">trade</span></div>
          <button onclick="window.switchTab && window.switchTab('trades');setTimeout(()=>{document.getElementById('trades-tab')?.scrollIntoView({behavior:'smooth'});},200);" style="padding:8px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--pink-2),var(--pink));color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">${I('swap',12)} Open proposer</button>
        </div>
        <div style="font-size:13px;color:var(--ink-2);line-height:1.5;">
          The full trade proposer (multi-player, partner selector) is in the classic Trades tab. Click "Open proposer" above to compose a trade.
        </div>
      </div>

      <!-- Received (pending) -->
      ${received.length ? `
      <section style="margin-bottom:18px;">
        <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px;">${CD.LiveDot()} Pending · Awaiting your response · ${received.length}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">${received.map(t => renderTradeCard(t, 'received')).join('')}</div>
      </section>` : ''}

      <!-- Sent pending -->
      ${sentP.length ? `
      <section style="margin-bottom:18px;">
        <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Sent · Awaiting reply · ${sentP.length}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">${sentP.map(t => renderTradeCard(t, 'sentP')).join('')}</div>
      </section>` : ''}

      <!-- History -->
      ${history.length ? `
      <section>
        <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:10px;">History · ${history.length}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">${history.slice(0, 12).map(t => renderTradeCard(t, 'history')).join('')}</div>
      </section>` : ''}

      ${!received.length && !sentP.length && !history.length ? `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;"><div class="ed" style="font-size:22px;margin-bottom:6px;">No trades <span class="ed-i" style="color:var(--pink);">yet</span></div><div style="font-size:13px;">Propose a trade via the Open proposer button above.</div></div>` : ''}
    `;
  };

  // ── DATA-ATTRIBUTE HANDLERS (avoid string interpolation in onclick) ──
  CD.handleRelease = (btn) => {
    if(typeof window.openReleaseModal !== 'function') return;
    window.openReleaseModal(
      btn.getAttribute('data-team'),
      parseInt(btn.getAttribute('data-idx'), 10),
      btn.getAttribute('data-name'),
      parseFloat(btn.getAttribute('data-price')) || 0
    );
  };
  CD.handleRoomClick = (el) => {
    const rid = el.getAttribute('data-rid');
    if(rid) {
      window.location.search = '?room=' + encodeURIComponent(rid);
    }
  };
  CD.goDashboard = () => {
    if(window.location.search) {
      window.location.search = '';
    } else {
      CD.state.view = 'dashboard';
      CD.render();
    }
  };
  CD.handleCreateRoom = () => {
    // Read CD form values, populate the (real) classic UI form, then call createNewRoom
    const map = [
      ['cdNewRoomName', 'newRoomName'],
      ['cdNewRoomBudget', 'newRoomBudget'],
      ['cdNewRoomMaxTeams', 'newRoomMaxTeams'],
      ['cdNewRoomMaxPlayers', 'newRoomMaxPlayers'],
      ['cdNewRoomMaxOverseas', 'newRoomMaxOverseas']
    ];
    map.forEach(([cdId, classicId]) => {
      const cd = document.getElementById(cdId);
      const cl = document.getElementById(classicId);
      if(cd && cl) cl.value = cd.value;
    });
    if(typeof window.createNewRoom === 'function') window.createNewRoom();
    window._cdShowCreate = false;
    CD.render();
  };
  CD.handleJoinRoom = () => {
    const cd = document.getElementById('cdJoinRoomId');
    const cl = document.getElementById('joinRoomCode');
    if(cd && cl) cl.value = cd.value;
    if(typeof window.initiateJoinRoom === 'function') window.initiateJoinRoom();
  };

  // ── NAVIGATION ──────────────────────────────────────────────────
  CD.go = (navId) => {
    CD.state.activeNav = navId;
    const subs = SUBTABS[navId] || [];
    CD.state.activeSub = subs[0] ? subs[0].id : null;
    // Map to legacy switchTab so app.js's render functions still get called (data is shared)
    const legacyMap = {
      setup:'setup', auction:'auction', squad:'myteam',
      league:'leaderboard', players:'players-season', matches:'matches'
    };
    if(typeof window.switchTab === 'function') try { window.switchTab(legacyMap[navId] || navId); } catch(e){ console.warn('CD nav switchTab:', e); }
    // League (leaderboard/points) and Squad (points by match) read stored
    // match data; force one fresh pull so recent pushes are reflected.
    if(navId === 'league' || navId === 'squad'){
      try{ typeof window._cdForceRoomRefresh === 'function' && window._cdForceRoomRefresh(); }catch(_){}
    }
    CD.render();
  };
  CD.goSub = (subId) => {
    CD.state.activeSub = subId;
    const legacyMap = {
      live:'auction', purses:'teams', ledger:'roster',
      myteam:'myteam', trades:'trades',
      leaderboard:'leaderboard', points:'points',
      pool:'players-season', analytics:'analytics',
      data:'matches', schedule:'schedule'
    };
    if(typeof window.switchTab === 'function') try { window.switchTab(legacyMap[subId] || subId); } catch(e){ console.warn('CD sub switchTab:', e); }
    // When entering a points/leaderboard-facing sub-tab, force one fresh
    // Firebase read so any scorecard push that slipped past the listener
    // (tab throttling, network hiccup) still gets reflected immediately.
    if(subId === 'leaderboard' || subId === 'points' || subId === 'weeks' || subId === 'ptsbymatch'){
      try{ typeof window._cdForceRoomRefresh === 'function' && window._cdForceRoomRefresh(); }catch(_){}
    }
    CD.render();
  };

  // ── FORM-EDIT GUARD ────────────────────────────────────────────
  // User's core complaint: auto-refresh wipes form inputs mid-entry
  // (especially Admin > Scorecards batting/bowling/fielding rows).
  // Track when the user is actively typing in any CD form so that
  // automatic re-renders (Firebase snapshot storms, poll-diff, ticker
  // updates) defer until the user pauses typing.
  //
  // Grace window is a generous 4 seconds — scorecard entry involves
  // click-tab-type-tab-click patterns where focus leaves briefly.
  CD._userEditingUntil = 0;
  CD._markUserEditing = () => { CD._userEditingUntil = Date.now() + 4000; };
  // The scorecard form is populated with dynamically-appended row DOMs
  // (window.addGscBattingRow / addGscBowlingRow / addGscFieldingRow).
  // Those rows live inside #gscBattingRows / #gscBowlingRows /
  // #gscFieldingRows containers. An innerHTML wipe of #cd-root destroys
  // every row — and the static template does NOT re-populate them —
  // so _captureFormState cannot restore them. Only prevention works.
  CD._isScorecardFormActive = () => {
    try {
      const form = document.getElementById('gscFormBody');
      if(!form) return false;
      if(form.style.display === 'none') return false;
      const bRows = document.getElementById('gscBattingRows');
      const bwRows = document.getElementById('gscBowlingRows');
      const fRows = document.getElementById('gscFieldingRows');
      const hasRows = !!(
        (bRows && bRows.children.length > 0) ||
        (bwRows && bwRows.children.length > 0) ||
        (fRows && fRows.children.length > 0)
      );
      return hasRows;
    } catch(e){ return false; }
  };
  CD._isUserEditing = () => {
    // Path A: recent input event — grace window still open
    if(Date.now() < CD._userEditingUntil) return true;
    // Path B: focus currently inside a cd-root input
    const ae = document.activeElement;
    if(ae){
      const tag = ae.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'){
        const root = document.getElementById('cd-root');
        if(root && root.contains(ae)) return true;
      }
    }
    return false;
  };
  // Harder guard for destructive renders: used by CD.render to decide
  // whether to BLOCK a render entirely (not just defer). Triggers when
  // the scorecard form has rows on screen — because restoring state
  // after a wipe is impossible for dynamically-appended row DOMs.
  CD._shouldBlockRender = () => {
    if(CD.state.view !== 'admin') return false;
    if(CD.state.adminSub !== 'scorecards') return false;
    if(!CD._isScorecardFormActive()) return false;
    return true;
  };
  CD._wireEditGuard = () => {
    if(CD._editGuardWired) return;
    const root = document.getElementById('cd-root');
    if(!root) return;
    CD._editGuardWired = true;
    const evts = ['input','keydown','keyup','change','paste','cut','focusin','select'];
    evts.forEach(ev => root.addEventListener(ev, CD._markUserEditing, true));
    // Document-level fallback for native controls that swallow events.
    document.addEventListener('keydown', CD._markUserEditing, true);
  };

  // ── FORM-STATE PRESERVATION ────────────────────────────────────
  // Even with the guard, some legitimate state changes (tab switch,
  // auth change) must force a render mid-edit. Capture form values
  // before the innerHTML wipe and restore them afterwards.
  CD._captureFormState = () => {
    try {
      const root = document.getElementById('cd-root');
      if(!root) return null;
      const snap = { fields: {}, activeId: '', selStart: 0, selEnd: 0 };
      const sel = 'input[id^="gsc"], textarea[id^="gsc"], select[id^="gsc"], input[id^="cd"], textarea[id^="cd"], select[id^="cd"]';
      root.querySelectorAll(sel).forEach(el => {
        if(!el.id) return;
        if(el.type === 'checkbox' || el.type === 'radio') snap.fields[el.id] = { checked: el.checked };
        else snap.fields[el.id] = { value: el.value };
      });
      const ae = document.activeElement;
      if(ae && ae.id && root.contains(ae)){
        snap.activeId = ae.id;
        try {
          if('selectionStart' in ae){ snap.selStart = ae.selectionStart || 0; snap.selEnd = ae.selectionEnd || 0; }
        } catch(e){ /* input type does not support selection */ }
      }
      return snap;
    } catch(e){ return null; }
  };
  CD._restoreFormState = (snap) => {
    if(!snap) return;
    try {
      const root = document.getElementById('cd-root');
      if(!root) return;
      Object.keys(snap.fields).forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        const v = snap.fields[id];
        if('checked' in v) el.checked = v.checked;
        else if(el.value !== v.value) el.value = v.value;
      });
      if(snap.activeId){
        const ae = document.getElementById(snap.activeId);
        if(ae && typeof ae.focus === 'function'){
          ae.focus();
          try {
            if('setSelectionRange' in ae) ae.setSelectionRange(snap.selStart, snap.selEnd);
          } catch(e){ /* input type does not support selection */ }
        }
      }
    } catch(e){ console.warn('CD restore form state:', e); }
  };

  // ── MAIN RENDER ────────────────────────────────────────────────
  // Debounced render: coalesces bursts of state changes into a single render.
  // Uses a short setTimeout (collects close-together changes), then hands off
  // to requestAnimationFrame so the actual DOM write lands on the next frame
  // — this keeps the UI thread free during Firebase snapshot storms.
  let _renderTimer = null;
  let _renderRaf = null;
  let _deferredRenderTimer = null;
  CD.scheduleRender = () => {
    // If the admin scorecard form is active (has rows visible), block
    // absolutely — don't even schedule. The auto-refreshers that call
    // scheduleRender (room-data poll, ticker, resize) have no business
    // destroying the scorecard form.
    if(CD._shouldBlockRender()){
      return;
    }
    // Previously deferred renders while ANY input was focused. That broke
    // search/filter debounced renders (analytics search, players pool
    // filter) because their own CD.render() call was deferred indefinitely.
    // Form state across legitimate renders is preserved by
    // _captureFormState / _restoreFormState, so dropping the guard is safe.
    if(_renderTimer) clearTimeout(_renderTimer);
    _renderTimer = setTimeout(() => {
      _renderTimer = null;
      if(_renderRaf) cancelAnimationFrame(_renderRaf);
      _renderRaf = requestAnimationFrame(() => {
        _renderRaf = null;
        // Final guard before DOM write — a lot can happen between
        // setTimeout scheduling and the rAF callback.
        if(CD._shouldBlockRender()) return;
        try { CD.render(); } catch(e){ console.error('CD render:', e); }
      });
    }, 60);
  };
  // Splash shown while auth is still resolving on initial page load.
  // Prevents the login screen from flashing for users who are already signed in.
  CD.renderSplash = () => `
    <div class="cd-splash" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;background:var(--bg,#06060a);z-index:9999;">
      <div class="cd-splash-logo" style="display:flex;align-items:center;gap:12px;">
        ${CD.Brand ? CD.Brand(40) : ''}
        <div class="ed" style="font-size:28px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>
      </div>
      <div style="font-size:10px;color:var(--mute);letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Loading…</div>
    </div>`;
  let _lastRenderedView = null;
  let _lastRenderedSub = null;
  // Room-nav / sub tracker for conditional sub-tab transitions (CSS-only).
  // These only trigger a sub-enter class when the user actively switches tabs —
  // passive re-renders (Firebase syncs, resize) do not re-animate.
  let _lastRoomNav = null;
  let _lastRoomSub = null;
  CD.render = () => {
    const r = document.getElementById('cd-root');
    if(!r) return;
    // HARD GUARD: scorecard form rows are dynamically-appended DOM —
    // an innerHTML wipe destroys them and the static template does NOT
    // recreate them. Only safe time to render while a scorecard form is
    // live is when the user EXPLICITLY switches tab/view.
    const sub = CD.state.adminSub;
    const isOnScorecards = (CD.state.view === 'admin' && sub === 'scorecards');
    const subChanged = sub !== _lastRenderedSub;
    const viewChanged = _lastRenderedView !== CD.state.view;
    const isNavTransition = viewChanged || subChanged || CD.state.authPending;
    if(!isNavTransition && isOnScorecards && CD._isScorecardFormActive()){
      return;
    }
    // Previously deferred renders when user was typing in any input.
    // Removed — broke search/filter UX (analytics search couldn't apply
    // its filter because the debounced CD.render() was deferred).
    // _captureFormState / _restoreFormState still handle input preservation.
    // Capture form state (values + focus + selection) before the wipe.
    const _formSnap = CD._captureFormState();
    let html = '';
    let viewKey = CD.state.view;
    if(CD.state.authPending){ html = CD.renderSplash(); viewKey = 'splash'; }
    else if(CD.state.view === 'auth') html = CD.renderAuth();
    else if(CD.state.view === 'dashboard') html = CD.renderDashboard();
    else if(CD.state.view === 'room') html = CD.renderRoom();
    else if(CD.state.view === 'admin') html = CD.renderAdmin();
    // Page-level fade when the top-level view changes
    const viewChangedFromRender = _lastRenderedView !== viewKey;
    const _prevView = _lastRenderedView;
    const _prevAdminSub = _lastRenderedSub;
    _lastRenderedView = viewKey;
    _lastRenderedSub = CD.state.adminSub;
    // Per-view specialised enter class (drives the tasteful transition for each surface).
    // Only applied when the view actually changed so in-place re-renders don't re-animate.
    let _viewCls = 'cd-view';
    if(viewChangedFromRender){
      _viewCls += ' cd-view-enter';
      if(viewKey === 'room')            _viewCls += ' cd-enter-room';
      else if(viewKey === 'dashboard')  _viewCls += (_prevView === 'room') ? ' cd-enter-dashboard-back' : ' cd-enter-dashboard';
      else if(viewKey === 'admin')      _viewCls += ' cd-enter-admin';
      else if(viewKey === 'auth')       _viewCls += ' cd-enter-auth';
      else if(viewKey === 'splash')     _viewCls += ' cd-enter-splash';
    } else if(viewKey === 'admin' && _prevAdminSub !== CD.state.adminSub){
      // Admin sub-tab switch — quick professional fade only.
      _viewCls += ' cd-enter-admin-sub';
    }
    r.innerHTML = `<div class="${_viewCls}">${html}</div>`;
    // Tasteful per-sub-tab transition: only mark `.cd-sub-enter` on the
    // tab-content wrapper when the user actively switched nav/sub — this
    // keeps passive re-renders quiet. Uses rAF so the class lands after
    // the browser commits the innerHTML, letting the animation fire fresh.
    const _curNav = CD.state.activeNav;
    const _curSub = CD.state.activeSub;
    const _subOrNavChanged = (viewKey === 'room') && (viewChangedFromRender || _curNav !== _lastRoomNav || _curSub !== _lastRoomSub);
    _lastRoomNav = _curNav;
    _lastRoomSub = _curSub;
    if(_subOrNavChanged){
      try {
        requestAnimationFrame(() => {
          const tc = document.getElementById('cd-tab-content');
          if(tc) tc.classList.add('cd-sub-enter');
        });
      } catch(e){ /* rAF unavailable — silently skip, baseline fade still runs */ }
    }
    // Restore captured form state (values + focus + selection).
    CD._restoreFormState(_formSnap);
    // (Re-)wire the delegate listeners; cheap no-op if already wired.
    CD._wireEditGuard();
    if(!CD.state.authPending && CD.state.view === 'dashboard') CD.injectRoomCards();
    try { CD._paintRosterStaleBanner && CD._paintRosterStaleBanner(); } catch(e){ console.warn('paintRosterStaleBanner:', e); }
  };

  // Direct-DOM updater for the admin stats banner. Call this instead
  // of a full re-render when only stats need refreshing. Safe while
  // scorecard form is open — never touches #gscFormBody.
  CD._updateAdminStatsOnly = (stats) => {
    try {
      if(!stats || typeof stats !== 'object') return;
      const set = (id, v) => {
        const el = document.getElementById(id);
        if(el && v != null) el.textContent = String(v);
      };
      set('sa-total-users',    stats.totalUsers);
      set('sa-total-auctions', stats.totalAuctions);
      set('sa-total-drafts',   stats.totalDrafts);
      set('sa-total-matches',  stats.totalMatches);
    } catch(e){ console.warn('CD._updateAdminStatsOnly:', e); }
  };

  // ── ROOM CARDS INJECTION ───────────────────────────────────────
  CD.injectRoomCards = () => {
    const u = window.user;
    if(!u || !u.uid || typeof window.firebase === 'undefined') {
      // Try via CDN-loaded firebase global from app.js (it uses Firebase v12 modular)
      // Fallback: scrape data from existing classic UI's containers if they exist
      const myList = document.getElementById('cd-my-rooms-grid');
      const joinedList = document.getElementById('cd-joined-rooms-grid');
      const classicMy = document.getElementById('roomListContainer');
      const classicJoined = document.getElementById('joinedRoomListContainer');
      if(classicMy && myList){ /* parse rcHTML output */
        const links = classicMy.querySelectorAll('.rc-card, [data-room-id]');
        if(links.length === 0 && classicMy.textContent.trim()){
          // The classic UI populates this — let's just observe
        }
      }
    }
  };

  // ── HOOK INTO APP.JS LIFECYCLE ─────────────────────────────────
  CD.hook = () => {
    // Override window.* helpers (these ARE on window, so override works)
    const _origLoadRoom = window.loadRoom;
    if(typeof _origLoadRoom === 'function'){
      window.loadRoom = function(rid){ try { _origLoadRoom(rid); } catch(e){ console.warn('loadRoom bridge:', e); } CD.state.view = 'room'; CD.state.activeNav = 'auction'; CD.state.activeSub = 'live'; setTimeout(CD.render, 100); };
    }
    const _origBack = window.backToDashboard;
    if(typeof _origBack === 'function'){
      window.backToDashboard = function(){ try { _origBack(); } catch(e){ console.warn('backToDashboard bridge:', e); } CD.state.view = 'dashboard'; CD.render(); };
    }

    // CRITICAL: detect login/logout by polling window.user (showAuth/showApp are module-scoped, can't override)
    // After auth resolves, the auth-poll SELF-CANCELS and re-subscribes on a
    // slower 1s cadence (no more 200ms loops running forever).
    let lastUserUid = null;
    let lastRoomId = null;
    let _authResolved = false;
    let _fastPoll = null;
    let _slowPoll = null;
    // Fallback: after 1500ms always clear pending so we never stall forever
    // if Firebase fails to init (e.g. offline). This is the worst-case splash time.
    setTimeout(() => {
      if(!_authResolved){
        _authResolved = true;
        if(CD.state.authPending){ CD.state.authPending = false; CD.render(); }
      }
    }, 1500);
    const pollTick = () => {
      try {
        const u = window.user;
        const uid = u && u.uid;
        const rid = window.roomId;
        if(!_authResolved){
          if(uid || window._cdAuthReady){
            _authResolved = true;
            if(CD.state.authPending){ CD.state.authPending = false; CD.render(); }
          }
        }
        // Downshift to 1s polling once auth is resolved — post-login
        // user/room transitions are rare; 200ms is wasted CPU.
        if(_authResolved && _fastPoll && !_slowPoll){
          clearInterval(_fastPoll); _fastPoll = null;
          _slowPoll = setInterval(pollTick, 1000);
        }
        if(uid !== lastUserUid){
          lastUserUid = uid;
          if(_authResolved && CD.state.authPending){ CD.state.authPending = false; }
          if(uid){
            if(rid){
              CD.state.view = 'room';
              if(!CD.state.activeNav || (CD.state.activeNav === 'auction' && CD.state.activeSub == null)){
                CD.state.activeNav = 'auction';
                CD.state.activeSub = 'live';
              }
            } else {
              CD.state.view = 'dashboard';
            }
          } else {
            CD.state.view = 'auth';
            window._cdSignup = false;
          }
          CD.render();
          return;
        }
        if(rid !== lastRoomId){
          lastRoomId = rid;
          if(uid){
            if(rid){ CD.state.view = 'room'; CD.state.activeNav = 'auction'; CD.state.activeSub = 'live'; }
            else { CD.state.view = 'dashboard'; }
            CD.render();
          }
        }
      } catch(e){ console.error('CD auth poll:', e); }
    };
    _fastPoll = setInterval(pollTick, 200);

    // Poll for room data changes. Debounced via scheduleRender (which now
    // has a rAF + edit-guard wrapper).
    //
    // The matches-fingerprint (mh) is critical: scorecard re-pushes overwrite
    // an existing match in place, so the count doesn't change but contents
    // do. We hash (mid + label + timestamp + player count) per match so any
    // push — new, overwrite, or edit — flips the diff key. Also include the
    // sum of leaderboardTotals so a recalc-only write triggers a re-render.
    let lastKey = '';
    setInterval(() => {
      try {
        if(CD.state.view !== 'room') return;
        const rs = window.roomState; if(!rs) return;
        const matches = rs.matches || {};
        const _mids = Object.keys(matches);
        let mtSig = '';
        for(let i=0;i<_mids.length;i++){
          const m = matches[_mids[i]] || {};
          mtSig += _mids[i] + ':' + (m.label||'') + ':' + (m.timestamp||0) + ':' + (m.players?Object.keys(m.players).length:0) + '|';
        }
        let mh = 2166136261;
        for(let i=0;i<mtSig.length;i++){ mh ^= mtSig.charCodeAt(i); mh = (mh + ((mh<<1)+(mh<<4)+(mh<<7)+(mh<<8)+(mh<<24)))>>>0; }
        const lbSum = rs.leaderboardTotals ? Object.values(rs.leaderboardTotals).reduce((s,v)=>s+((v&&v.pts)||0),0) : 0;
        const key = JSON.stringify({
          bid: rs.currentBlock?.currentBid,
          ldr: rs.currentBlock?.lastBidderTeam,
          pid: rs.currentBlock?.playerId,
          act: rs.currentBlock?.active,
          tn: Object.keys(rs.teams||{}).length,
          ni: Object.keys(rs.currentBlock?.notInterested||{}).length,
          mt: _mids.length,
          mh: mh,
          lb: Math.round(lbSum*100),
          ps: Object.values(rs.players||{}).filter(p=>p.status==='sold').length,
          rl: rs.releaseLocked
        });
        if(key !== lastKey){ lastKey = key; CD.scheduleRender(); }
      } catch(e){ console.warn('CD poll-diff:', e); }
    }, 400);

    // Listen for room list updates (fired by app.js when Firebase data loads)
    let _lastGridKey = '';
    const updateRoomGrids = () => {
      try {
        const myGrid = document.getElementById('cd-my-rooms-grid');
        const joinedGrid = document.getElementById('cd-joined-rooms-grid');
        // If the grids don't exist (we're not on dashboard), nothing to do.
        if(!myGrid && !joinedGrid) return;
        const myRooms = window.userAuctionRooms || [];
        const joinedRooms = window.userJoinedRooms || [];
        // Self-healing: if the grid is visible AND we have no rooms data yet
        // AND user is logged in, ALWAYS poke the Firebase bridge directly.
        // Fires immediately on every tick where data is missing — no wait.
        if(!window.userAuctionRooms && window.user && window.user.uid){
          if(typeof window.cdForceLoadRooms === 'function' && !window._cdForceLoadInFlight){
            window._cdForceLoadInFlight = true;
            window.cdForceLoadRooms().finally(() => {
              setTimeout(() => { window._cdForceLoadInFlight = false; }, 800);
            });
          }
        }
        // Diff-guard: only rewrite when the room-list actually changed OR the
        // grid DOM was recreated (e.g. user navigated back to dashboard).
        // Detecting DOM recreation: check if the grid still contains the
        // "Loading rooms…" placeholder — that only exists on a fresh mount.
        const gridKey = myRooms.map(r=>r.id+':'+(r.name||'')+':'+(r.budget||'')+':'+(r.maxTeams||'')+':'+(r.maxPlayers||'')).join('|')
          + '##' + joinedRooms.map(r=>r.id+':'+(r.name||'')+':'+(r.budget||'')+':'+(r.maxTeams||'')+':'+(r.maxPlayers||'')).join('|');
        const gridIsFresh = myGrid && /Loading rooms/i.test(myGrid.textContent || '');
        if(!gridIsFresh && gridKey === _lastGridKey) return;
        _lastGridKey = gridKey;
        const buildCards = (rooms, isOwner) => {
          if(!rooms.length) return '<div style="padding:20px;color:var(--mute);grid-column:1/-1;text-align:center;background:var(--glass);border:1px dashed var(--line-2);border-radius:14px;">' + (isOwner ? 'No rooms yet — create one above.' : 'No joined rooms yet.') + '</div>';
          return rooms.map(r => {
            return `<div data-rid="${esc(r.id)}" onclick="CD.handleRoomClick(this)" style="padding:20px;border-radius:14px;background:var(--glass);border:1px solid var(--line-2);cursor:pointer;transition:all 0.2s;backdrop-filter:blur(20px);" onmouseover="this.style.borderColor='var(--electric)';this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--line-2)';this.style.transform='translateY(0)';">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px;">
                <div class="ed" style="font-size:20px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.name)}</div>
                ${isOwner ? '<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:9999px;background:rgba(255,200,61,0.16);border:1px solid rgba(255,200,61,0.4);color:#FFD97D;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;flex-shrink:0;">Owner</span>' : '<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:9999px;background:rgba(46,91,255,0.18);border:1px solid rgba(46,91,255,0.4);color:#8EA9FF;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;flex-shrink:0;">Joined</span>'}
              </div>
              <div style="font-size:11px;color:var(--mute);">${r.budget ? '₹' + r.budget + ' Cr' : ''}${r.maxTeams ? ' · ' + r.maxTeams + ' teams' : ''}${r.maxPlayers ? ' · ' + r.maxPlayers + ' players' : ''}</div>
              <div style="font-size:11px;color:var(--electric);margin-top:8px;">Tap to enter →</div>
            </div>`;
          }).join('');
        };
        if(myGrid) myGrid.innerHTML = buildCards(myRooms, true);
        if(joinedGrid) joinedGrid.innerHTML = buildCards(joinedRooms, false);
      } catch(e){ console.error('CD updateRoomGrids:', e); }
    };
    window.addEventListener('cd-rooms-update', updateRoomGrids);
    // Also poll every 800ms as a backup, in case the event was missed
    setInterval(updateRoomGrids, 800);
    // Initial call immediately — no setTimeout delay
    updateRoomGrids();
    // Fire cdForceLoadRooms as soon as possible — poll for user up to 5s.
    // If onAuthStateChanged hasn't fired yet, wait for it instead of giving up.
    (() => {
      let tries = 0;
      const tick = () => {
        if(window.user?.uid && typeof window.cdForceLoadRooms === 'function'){
          window.cdForceLoadRooms();
          return;
        }
        tries++;
        if(tries < 50) setTimeout(tick, 100); // up to 5s
      };
      tick();
    })();
    // Proper button-based fallback after 4s (not 1.5s — was too aggressive).
    // Uses a real <button> with onclick — no javascript:void href that Chrome
    // treats as "dangerous" scheme. Only fires if grid is still on Loading…
    // AND cdForceLoadRooms hasn't already populated data.
    setTimeout(() => {
      try {
        const myGrid = document.getElementById('cd-my-rooms-grid');
        const hasRooms = (window.userAuctionRooms || []).length > 0;
        if(myGrid && /Loading rooms/i.test(myGrid.textContent) && !hasRooms){
          console.warn('[CD] rooms stuck after 4s — showing retry button');
          myGrid.innerHTML = '<div style="padding:20px;color:var(--mute);grid-column:1/-1;text-align:center;background:var(--glass);border:1px dashed var(--line-2);border-radius:14px;">Couldn\'t load rooms — <button type="button" onclick="window.cdForceLoadRooms && window.cdForceLoadRooms()" style="background:none;border:none;color:var(--electric);text-decoration:underline;cursor:pointer;padding:0;font:inherit;">tap to retry</button></div>';
          if(typeof window.cdForceLoadRooms === 'function') window.cdForceLoadRooms();
        }
      } catch(e){ console.warn('rooms-fallback:', e); }
    }, 4000);
  };

  // ── BOOT ───────────────────────────────────────────────────────
  function init(){
    // Pre-detect initial state to avoid auth flicker if user already logged in
    if(window.user && window.user.uid){
      CD.state.view = window.roomId ? 'room' : 'dashboard';
      if(CD.state.view === 'room'){ CD.state.activeNav = 'auction'; CD.state.activeSub = 'live'; }
      // User already hydrated — no need for splash
      CD.state.authPending = false;
    } else if(window.location.search.includes('room=') || window.location.search.includes('draft=')){
      // URL has ?room= — likely going to a room after auth restores; show splash, not auth screen
      CD.state.view = 'auth';
      CD.state.authPending = true;
    }
    CD.hook();
    CD.fetchTicker();
    CD.render();
    // Re-fetch ticker every 2 minutes
    setInterval(CD.fetchTicker, 120000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Helper: copy invite link override (more reliable, properly URL-encoded)
  if(!window.copyInviteLink){
    window.copyInviteLink = function(){
      const url = window.location.origin + window.location.pathname + '?room=' + encodeURIComponent(window.roomId || '');
      navigator.clipboard?.writeText(url);
      window.showAlert?.('Invite link copied!','ok');
    };
  }
})();

/* Animations — tab-specialised transitions. CSS-only, scoped to #cd-root. */
(function(){
  const css = `
    /* ── Legacy / shared keyframes ─────────────────────────────── */
    @keyframes cd-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,45,135,0.7); } 70% { box-shadow: 0 0 0 8px rgba(255,45,135,0); } }
    @keyframes cd-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes cd-fadein { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes cd-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes cd-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-6px);} 40%{transform:translateX(6px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(4px);} }
    @keyframes cd-splash-pulse { 0%,100%{opacity:0.55;transform:scale(1);} 50%{opacity:1;transform:scale(1.04);} }
    .cd-splash-logo { animation: cd-splash-pulse 1.2s ease-in-out infinite; will-change: opacity, transform; }

    /* ── View-level transitions ────────────────────────────────── */
    @keyframes cd-view-in { 0%{opacity:0;} 100%{opacity:1;} }
    /* Dashboard → Room: "stepping into the stadium" */
    @keyframes cd-enter-room {
      0%   { opacity: 0; transform: scale(0.97) translateY(8px); }
      60%  { opacity: 1; }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    /* Auth → Dashboard: "doors opening" with blur unblur */
    @keyframes cd-enter-dashboard {
      0%   { opacity: 0; transform: translateY(-6px) scale(1.01); filter: blur(6px); }
      55%  { filter: blur(0); }
      100% { opacity: 1; transform: none; filter: blur(0); }
    }
    /* Room → Dashboard: faster reverse */
    @keyframes cd-enter-dashboard-back {
      0%   { opacity: 0; transform: scale(1.02); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes cd-enter-admin { 0%{opacity:0;} 100%{opacity:1;} }
    @keyframes cd-enter-auth  { 0%{opacity:0;transform:translateY(6px);} 100%{opacity:1;transform:translateY(0);} }

    .cd-view { will-change: opacity, transform, filter; }
    .cd-view-enter                { animation: cd-view-in          180ms ease-out both; }
    /* Variant classes — these override .cd-view-enter via the combined-class selectors below. */
    .cd-enter-room                { animation: cd-enter-room       220ms cubic-bezier(0.34, 1.28, 0.64, 1) both; transform-origin: center 40%; }
    .cd-enter-dashboard           { animation: cd-enter-dashboard  260ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    .cd-enter-dashboard-back      { animation: cd-enter-dashboard-back 180ms cubic-bezier(0.4, 0, 0.2, 1) both; }
    .cd-enter-admin               { animation: cd-enter-admin      140ms ease-out both; }
    .cd-enter-admin-sub           { animation: cd-enter-admin      140ms ease-out both; }
    .cd-enter-auth                { animation: cd-enter-auth       220ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    /* Explicit override when the generic class is also present. */
    .cd-view-enter.cd-enter-room            { animation: cd-enter-room            220ms cubic-bezier(0.34, 1.28, 0.64, 1) both; }
    .cd-view-enter.cd-enter-dashboard       { animation: cd-enter-dashboard       260ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    .cd-view-enter.cd-enter-dashboard-back  { animation: cd-enter-dashboard-back  180ms cubic-bezier(0.4, 0, 0.2, 1) both; }
    .cd-view-enter.cd-enter-admin           { animation: cd-enter-admin           140ms ease-out both; }
    .cd-view-enter.cd-enter-auth            { animation: cd-enter-auth            220ms cubic-bezier(0.22, 1, 0.36, 1) both; }

    /* ── Sub-tab transitions (scoped to #cd-tab-content) ───────── */
    @keyframes cd-sub-in          { 0%{opacity:0;transform:translateY(4px);} 100%{opacity:1;transform:translateY(0);} }
    @keyframes cd-sub-slide-right { 0%{opacity:0;transform:translateX(22px);} 100%{opacity:1;transform:translateX(0);} }
    @keyframes cd-sub-slide-left  { 0%{opacity:0;transform:translateX(-22px);} 100%{opacity:1;transform:translateX(0);} }
    @keyframes cd-sub-fade-rise   { 0%{opacity:0;transform:translateY(8px) scale(0.995);} 100%{opacity:1;transform:translateY(0) scale(1);} }
    @keyframes cd-sub-flip {
      0%   { opacity: 0; transform: perspective(1000px) rotateX(-8deg) translateY(6px); }
      100% { opacity: 1; transform: perspective(1000px) rotateX(0) translateY(0); }
    }

    /* Default: restrained fade on every render (matches prior behavior). */
    #cd-root #cd-tab-content                                                 { animation: cd-sub-in 140ms ease-out both; will-change: opacity, transform; transform-origin: top center; }
    /* Variant sub-tab transitions ONLY fire on actual sub/nav switches — gated by .cd-sub-enter. */
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="setup"]                            { animation: cd-sub-in 140ms ease-out both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="auction"]                          { animation: cd-sub-fade-rise 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="squad"]                            { animation: cd-sub-slide-right 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"]                           { animation: cd-sub-in 180ms ease-out both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"]      { animation: cd-sub-in 180ms ease-out both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] { animation: cd-sub-slide-left 200ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="matches"]                          { animation: cd-sub-flip 240ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: top center; }

    /* ── Stagger / waterfall keyframes & targets ────────────────── */
    @keyframes cd-stagger-fade  { 0%{opacity:0;transform:translateY(6px);} 100%{opacity:1;transform:translateY(0);} }
    @keyframes cd-stagger-scale { 0%{opacity:0;transform:scale(0.95);} 100%{opacity:1;transform:scale(1);} }
    @keyframes cd-stagger-left  { 0%{opacity:0;transform:translateX(-12px);} 100%{opacity:1;transform:translateX(0);} }

    /* League → Leaderboard: waterfall team rows. 20ms per row, capped ~400ms.
       Only fires on actual nav/sub change (gated by .cd-sub-enter). */
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div {
      animation: cd-stagger-fade 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(1)  { animation-delay:   0ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(2)  { animation-delay:  20ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(3)  { animation-delay:  40ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(4)  { animation-delay:  60ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(5)  { animation-delay:  80ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(6)  { animation-delay: 100ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(7)  { animation-delay: 120ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(8)  { animation-delay: 140ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(9)  { animation-delay: 160ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(10) { animation-delay: 180ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="league"] .cd-league-list > div:nth-child(n+11) { animation-delay: 200ms; }

    /* Players → Pool: grid/table items fade+scale, 8ms per row, cap ~320ms.
       Gated so the stagger only plays on an actual Pool tab switch, not on every re-render. */
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr {
      animation: cd-stagger-scale 200ms cubic-bezier(0.22, 1, 0.36, 1) both;
      transform-origin: center left;
    }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(1)  { animation-delay:   0ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(2)  { animation-delay:   8ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(3)  { animation-delay:  16ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(4)  { animation-delay:  24ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(5)  { animation-delay:  32ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(6)  { animation-delay:  40ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(7)  { animation-delay:  48ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(8)  { animation-delay:  56ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(9)  { animation-delay:  64ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(10) { animation-delay:  72ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(11) { animation-delay:  80ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(12) { animation-delay:  88ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(13) { animation-delay:  96ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(14) { animation-delay: 104ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(15) { animation-delay: 112ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(16) { animation-delay: 120ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(17) { animation-delay: 128ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(18) { animation-delay: 136ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(19) { animation-delay: 144ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(20) { animation-delay: 152ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(n+21) { animation-delay: 200ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(n+31) { animation-delay: 260ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr:nth-child(n+41) { animation-delay: 320ms; }

    /* Players → Analytics: rows slide in from the left with stagger (on tab switch only). */
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr {
      animation: cd-stagger-left 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(1)  { animation-delay:   0ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(2)  { animation-delay:  14ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(3)  { animation-delay:  28ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(4)  { animation-delay:  42ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(5)  { animation-delay:  56ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(6)  { animation-delay:  70ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(7)  { animation-delay:  84ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(8)  { animation-delay:  98ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(9)  { animation-delay: 112ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(10) { animation-delay: 126ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(n+11) { animation-delay: 140ms; }
    #cd-root #cd-tab-content.cd-sub-enter[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr:nth-child(n+21) { animation-delay: 220ms; }

    /* ── Pill / sub-tab underline indicator ─────────────────────── */
    @keyframes cd-subtab-underline {
      0%   { transform: scaleX(0); opacity: 0.55; }
      100% { transform: scaleX(1); opacity: 1; }
    }
    #cd-root .cd-subtab-bar { position: relative; }
    #cd-root .cd-subtab-bar button { transition: color 160ms ease-out; }
    #cd-root .cd-subtab-bar button[data-sub-active="1"]::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: -1px;
      height: 2px;
      background: linear-gradient(90deg, var(--pink, #ff2d87), var(--electric, #2e5bff));
      transform-origin: left center;
      animation: cd-subtab-underline 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
      pointer-events: none;
      border-radius: 2px;
    }

    /* ── Modal transitions (backdrop + box) ─────────────────────── */
    @keyframes cd-modal-in {
      0%   { opacity: 0; transform: scale(0.94) translateY(8px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes cd-modal-backdrop-in { 0%{opacity:0;} 100%{opacity:1;} }
    .cd-modal-enter { animation: cd-modal-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both; }
    .modal-bg.open, .modal-bg.active { animation: cd-modal-backdrop-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both; }
    .modal-bg.open > .modal,
    .modal-bg.active > .modal {
      animation: cd-modal-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
      will-change: transform, opacity;
    }

    /* ── Room card 3D tilt hover (dashboard) ────────────────────── */
    #cd-root #cd-my-rooms-grid .rc,
    #cd-root #cd-joined-rooms-grid .rc {
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease-out, border-color 200ms ease-out;
      transform-style: preserve-3d;
      will-change: transform;
    }
    #cd-root #cd-my-rooms-grid .rc:hover,
    #cd-root #cd-joined-rooms-grid .rc:hover {
      transform: perspective(800px) rotateX(4deg) translateY(-3px);
    }

    /* ── Ticker edge fade-mask ──────────────────────────────────── */
    #cd-root .cd-ticker-viewport {
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 48px), transparent 100%);
              mask-image: linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 48px), transparent 100%);
    }

    /* Keep legacy helpers around for callers elsewhere. */
    .cd-sub-enter  { animation: cd-sub-in 140ms ease-out both; }

    /* ── Reduced-motion: collapse every motion to a single-frame fade ── */
    @media (prefers-reduced-motion: reduce) {
      .cd-splash-logo,
      .cd-view-enter, .cd-sub-enter, .cd-modal-enter,
      .cd-enter-room, .cd-enter-dashboard, .cd-enter-dashboard-back,
      .cd-enter-admin, .cd-enter-admin-sub, .cd-enter-auth, .cd-enter-splash,
      #cd-root #cd-tab-content,
      #cd-root #cd-tab-content[data-cd-nav="setup"],
      #cd-root #cd-tab-content[data-cd-nav="auction"],
      #cd-root #cd-tab-content[data-cd-nav="squad"],
      #cd-root #cd-tab-content[data-cd-nav="league"],
      #cd-root #cd-tab-content[data-cd-nav="matches"],
      #cd-root #cd-tab-content[data-cd-nav="players"][data-cd-sub="pool"],
      #cd-root #cd-tab-content[data-cd-nav="players"][data-cd-sub="analytics"],
      #cd-root #cd-tab-content[data-cd-nav="league"] .cd-league-list > div,
      #cd-root #cd-tab-content[data-cd-nav="players"][data-cd-sub="pool"] tbody.cd-pool-tbody > tr,
      #cd-root #cd-tab-content[data-cd-nav="players"][data-cd-sub="analytics"] tbody.cd-analytics-tbody > tr,
      #cd-root .cd-subtab-bar button[data-sub-active="1"]::after,
      .modal-bg.open, .modal-bg.active,
      .modal-bg.open > .modal, .modal-bg.active > .modal {
        animation: cd-view-in 1ms linear both !important;
      }
      #cd-root #cd-my-rooms-grid .rc,
      #cd-root #cd-joined-rooms-grid .rc { transition: none !important; }
      #cd-root #cd-my-rooms-grid .rc:hover,
      #cd-root #cd-joined-rooms-grid .rc:hover { transform: none !important; }
    }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
