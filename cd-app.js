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

  // ── PRIMITIVES ──────────────────────────────────────────────────
  // Player avatar: IPL team logo background → Cricbuzz photo fades in
  CD.Avatar = ({ team, name, size = 40 } = {}) => {
    const code = teamCode(team) || teamCode(name) || 'MI';
    const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
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
        } catch(e){}
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
        } catch(e){}
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
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>'
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
    view: 'auth',           // auth | dashboard | room
    activeNav: 'auction',   // current top-nav
    activeSub: 'live',      // current sub-tab
    isMobile: window.innerWidth < 900,
    showCreate: false,
    cbzMatches: []          // live ticker data
  };
  window.addEventListener('resize', () => {
    const wasMobile = CD.state.isMobile;
    CD.state.isMobile = window.innerWidth < 900;
    if(wasMobile !== CD.state.isMobile) CD.render();
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
        <div style="flex:1;overflow:hidden;position:relative;height:100%;">
          <div style="display:flex;align-items:center;gap:48px;height:100%;animation:cd-ticker 50s linear infinite;white-space:nowrap;padding-left:24px;">
            ${itemHtml}${itemHtml}
          </div>
        </div>
      </div>`;
  };

  // Fetch live scores once
  CD.fetchTicker = async () => {
    try {
      // Try the existing Cricbuzz integration if available
      if(typeof window.cbzFetchLive === 'function'){
        try {
          const matches = await window.cbzFetchLive();
          if(matches && matches.length) {
            CD.state.cbzMatches = matches.slice(0, 6).map(m => {
              const mi = m.matchInfo || m;
              const ts = (m.matchScore && m.matchScore.team1Score) || (m.matchScore && m.matchScore.team2Score);
              const ta = mi.team1?.teamSName || mi.team1?.teamName || '';
              const tb = mi.team2?.teamSName || mi.team2?.teamName || '';
              const sc = m.matchScore && m.matchScore.team2Score && m.matchScore.team2Score.inngs1
                ? `${m.matchScore.team2Score.inngs1.runs}/${m.matchScore.team2Score.inngs1.wickets}` : '';
              return { teamA: ta, teamB: tb, vs: 'vs', score: sc, status: mi.status || '' };
            });
            CD.scheduleRender();
            return;
          }
        } catch(e){ /* fallthrough */ }
      }
      // Fallback: empty
      CD.state.cbzMatches = [];
    } catch(e){ console.error('CD ticker:', e); }
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
    const isSuperAdmin = u.email && u.email.toLowerCase().trim() === 'namanmehra@gmail.com';
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

          ${isSuperAdmin ? `
          <section>
            <div style="font-size:11px;color:var(--gold);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:14px;">Super Admin</div>
            <div class="cd-glass" style="padding:24px;border-radius:14px;background:var(--glass);border:1px solid var(--line-2);">
              <div style="font-family:var(--serif);font-size:24px;font-weight:800;margin-bottom:8px;">Global Scorecard Push</div>
              <p style="font-size:13px;color:var(--ink-2);margin-bottom:16px;">Push match scorecards to all rooms in one click. Use the classic super-admin panel for now.</p>
              <button onclick="alert('Super Admin tools available in classic view. Contact admin to migrate.');" style="padding:10px 18px;border-radius:9999px;background:rgba(255,200,61,0.16);border:1px solid rgba(255,200,61,0.4);color:#FFD97D;font-size:13px;font-weight:600;cursor:pointer;">Open Super Admin</button>
            </div>
          </section>
          ` : ''}
        </main>
        <input id="cdJoinRoomHidden" type="hidden" />
      </div>`;
  };

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
      <div style="display:flex;gap:4px;padding:14px 32px 0;border-bottom:1px solid var(--line);overflow-x:auto;">
        ${subs.map(s => `
          <button onclick="CD.goSub('${s.id}')" style="padding:8px 14px;background:transparent;border:none;border-bottom:2px solid ${activeSub === s.id ? 'var(--pink)' : 'transparent'};color:${activeSub === s.id ? 'var(--ink)' : 'var(--mute)'};font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:0.08em;">${s.label}</button>
        `).join('')}
      </div>
    ` : '';

    const main = `
      <main style="display:flex;flex-direction:column;min-width:0;">
        ${CD.renderTicker()}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 32px 0;border-bottom:1px solid var(--line);flex-wrap:wrap;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h1 class="ed" style="font-size:36px;letter-spacing:-0.03em;line-height:1;">${esc(NAV.find(n=>n.id===CD.state.activeNav)?.label || 'Room')}</h1>
              <div class="ed-i" style="font-size:28px;color:var(--mute);">${esc(activeSub)}</div>
            </div>
            <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-top:6px;">${esc(roomName)}${isAdmin ? ' · Admin' : myTeam ? ' · ' + esc(myTeam) : ''}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button onclick="window.copyInviteLink()" style="padding:8px 14px;border-radius:9999px;background:var(--glass-2);border:1px solid var(--line-2);color:var(--ink);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">${I('copy',14)} Invite</button>
          </div>
        </div>
        ${subTabBar}
        <div style="padding:20px 32px;flex:1;" id="cd-tab-content">
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
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:24px;">
        ${CD.Stat({val: rs.budget || setup.budget || 100, lbl: 'Budget (cr)', accent: 'var(--electric)'})}
        ${CD.Stat({val: maxTeams, lbl: 'Max Teams', accent: 'var(--pink)'})}
        ${CD.Stat({val: rs.maxPlayers || setup.maxPlayers || 21, lbl: 'Players / Team', accent: 'var(--lime)'})}
        ${CD.Stat({val: rs.maxOverseas || setup.maxOverseas || 8, lbl: 'Max Overseas', accent: 'var(--gold)'})}
      </div>
      <div class="cd-glass-2" style="padding:24px;border-radius:22px;background:var(--glass-2);backdrop-filter:blur(40px) saturate(1.6);border:1px solid var(--line-2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div class="ed" style="font-size:28px;">Members <span class="ed-i" style="color:var(--mute);">${members.length} / ${maxTeams}</span></div>
          ${isAdmin && !isStarted ? `<button onclick="window.initializeAuctionData()" style="padding:10px 20px;border-radius:9999px;background:linear-gradient(180deg,var(--lime-2),var(--lime));color:#000;border:none;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 6px 24px rgba(182,255,60,0.3);">${I('check',14)} Start Auction</button>` : isStarted ? CD.Pill({tone:'lime', children: CD.LiveDot() + ' AUCTION LIVE'}) : ''}
        </div>
        ${members.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${members.map(m => `
            <div class="cd-glass" style="padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);display:flex;align-items:center;gap:10px;">
              ${CD.Avatar({name: m.teamName, size: 36})}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;">${esc(m.teamName)}</div>
                <div style="font-size:11px;color:var(--mute);">${esc(m.email || '—')}</div>
              </div>
              ${m.uid === window.user?.uid ? CD.Pill({tone:'lime', children:'YOU'}) : ''}
            </div>
          `).join('')}
        </div>` : `<div style="padding:30px;text-align:center;color:var(--mute);">No members yet — share the invite link to bring teams in.</div>`}
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
    const isSuper = window.user?.email && window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com';
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
                        <div style="font-size:10px;color:var(--mute);letter-spacing:0.04em;">${esc(pCode)} · ${esc(p.role || p.r || '')}</div>
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
    const isSuper = window.user?.email && window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com';
    const xiMult = parseFloat(rs.xiMultiplier) || 1;

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

    const renderPitchPlayer = (p, pos) => {
      const name = p.name || p.n || '';
      const first = name.split(' ')[0];
      const last = name.split(' ').slice(1).join(' ');
      const pts = ptsFor(name) * (pos === 'xi' ? xiMult : 1);
      const code = teamCode(p.iplTeam || p.t);
      const isOs = !!(p.isOverseas || p.o);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:70px;cursor:pointer;" onclick="window.showPlayerModal && window.showPlayerModal('${esc(name)}')">
          <div style="position:relative;">
            ${CD.Avatar({team: p.iplTeam || p.t, name, size: 46})}
            ${isOs ? '<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:var(--gold);color:#000;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;box-shadow:0 0 0 2px var(--bg-1,#0C0D14);">★</div>' : ''}
          </div>
          <div style="font-size:10px;font-weight:700;color:#fff;text-align:center;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.8);max-width:80px;overflow:hidden;text-overflow:ellipsis;">${esc(last || first)}</div>
          <div style="font-family:var(--display);font-size:11px;font-weight:800;padding:1px 6px;border-radius:9999px;background:${pts>0?'rgba(182,255,60,0.3)':'rgba(255,255,255,0.15)'};border:1px solid ${pts>0?'rgba(182,255,60,0.5)':'rgba(255,255,255,0.2)'};color:${pts>0?'var(--lime)':pts<0?'var(--red)':'#fff'};">${pts>=0?'+':''}${Math.round(pts)}</div>
        </div>
      `;
    };

    const roleRow = (players, gap = 40) => {
      if(!players.length) return '';
      return `<div style="display:flex;justify-content:center;gap:${gap}px;flex-wrap:wrap;">${players.map(p => renderPitchPlayer(p, 'xi')).join('')}</div>`;
    };

    return `
      <!-- Stats banner -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px;">
        ${CD.Stat({val: xiPlayers.length + '+' + benchPlayers.length, lbl: 'XI + Bench', accent:'var(--electric)'})}
        ${CD.Stat({val: '₹' + (t.budget||0).toFixed(1), lbl:'Purse left (cr)', accent:'var(--lime)'})}
        ${CD.Stat({val: '₹' + spent.toFixed(1), lbl:'Total spent (cr)', accent:'var(--pink)'})}
        ${CD.Stat({val: overseas + '/' + (rs.maxOverseas || 8), lbl:'Overseas', accent:'var(--gold)'})}
        ${CD.Stat({val: (seasonTotal>=0?'+':'') + seasonTotal, lbl:'Season points', accent:'var(--lime)'})}
      </div>

      <!-- Hero: Team name + cricket pitch -->
      <div style="border-radius:22px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:18px;overflow:hidden;position:relative;">
        <!-- Team header -->
        <div style="padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);position:relative;z-index:2;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:10px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Playing XI${xiMult !== 1 ? ' · ' + xiMult + '× multiplier' : ''}</div>
            <div class="ed" style="font-size:32px;line-height:1;margin-top:3px;">${esc(t.name)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${releaseLocked && !isSuper ? CD.Pill({tone:'red', children:'Releases locked'}) : ''}
            ${CD.Pill({tone:'lime', children: CD.LiveDot() + ' XI ' + (xiTotal>=0?'+':'') + Math.round(xiTotal)})}
          </div>
        </div>

        <!-- Cricket pitch visualization -->
        <div style="position:relative;min-height:${CD.state.isMobile ? 460 : 540}px;background:
          radial-gradient(ellipse 80% 100% at 50% 50%, #0d6638 0%, #052918 65%, #0A0B12 100%),
          #052918;
          overflow:hidden;">

          <!-- Field ring (boundary) -->
          <div style="position:absolute;inset:22px;border-radius:50%;border:2px dashed rgba(255,255,255,0.18);pointer-events:none;"></div>
          <!-- Inner circle (30-yard) -->
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:55%;height:46%;border-radius:50%;border:1px solid rgba(255,255,255,0.14);pointer-events:none;"></div>
          <!-- Pitch strip (brown) -->
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${CD.state.isMobile ? '14%' : '9%'};height:${CD.state.isMobile ? '22%' : '28%'};background:linear-gradient(180deg,#c9a56d,#8c6a3a);border-radius:2px;pointer-events:none;box-shadow:0 0 24px rgba(201,165,109,0.4);"></div>
          <!-- Crease marks -->
          <div style="position:absolute;left:50%;top:calc(50% - ${CD.state.isMobile ? 50 : 72}px);transform:translateX(-50%);width:${CD.state.isMobile ? 40 : 54}px;height:2px;background:#fff;"></div>
          <div style="position:absolute;left:50%;top:calc(50% + ${CD.state.isMobile ? 50 : 72}px);transform:translateX(-50%);width:${CD.state.isMobile ? 40 : 54}px;height:2px;background:#fff;"></div>
          <!-- Stumps -->
          <div style="position:absolute;left:50%;top:calc(50% - ${CD.state.isMobile ? 54 : 78}px);transform:translateX(-50%);display:flex;gap:2px;">
            ${[0,1,2].map(() => '<div style="width:2px;height:9px;background:#fff;"></div>').join('')}
          </div>
          <div style="position:absolute;left:50%;top:calc(50% + ${CD.state.isMobile ? 45 : 69}px);transform:translateX(-50%);display:flex;gap:2px;">
            ${[0,1,2].map(() => '<div style="width:2px;height:9px;background:#fff;"></div>').join('')}
          </div>

          <!-- Players positioned by role -->
          <!-- Bowlers (top-center & scattered deep) -->
          <div style="position:absolute;top:${CD.state.isMobile ? 30 : 40}px;left:0;right:0;display:flex;justify-content:center;gap:32px;flex-wrap:wrap;padding:0 20px;z-index:3;">
            ${byRole.bowl.map(p => renderPitchPlayer(p, 'xi')).join('')}
          </div>

          <!-- All-rounders (mid, left+right of pitch) -->
          <div style="position:absolute;top:50%;left:${CD.state.isMobile ? '8%' : '15%'};transform:translateY(-50%);display:flex;flex-direction:column;gap:16px;z-index:3;">
            ${byRole.ar.slice(0, Math.ceil(byRole.ar.length/2)).map(p => renderPitchPlayer(p, 'xi')).join('')}
          </div>
          <div style="position:absolute;top:50%;right:${CD.state.isMobile ? '8%' : '15%'};transform:translateY(-50%);display:flex;flex-direction:column;gap:16px;z-index:3;">
            ${byRole.ar.slice(Math.ceil(byRole.ar.length/2)).map(p => renderPitchPlayer(p, 'xi')).join('')}
          </div>

          <!-- Wicketkeeper (behind stumps, top of pitch) -->
          <div style="position:absolute;top:calc(50% - ${CD.state.isMobile ? 130 : 160}px);left:50%;transform:translateX(-50%);z-index:3;">
            ${byRole.wk.map(p => renderPitchPlayer(p, 'xi')).join('')}
          </div>

          <!-- Batters (bottom, near crease) -->
          <div style="position:absolute;bottom:${CD.state.isMobile ? 30 : 40}px;left:0;right:0;display:flex;justify-content:center;gap:24px;flex-wrap:wrap;padding:0 20px;z-index:3;">
            ${byRole.bat.map(p => renderPitchPlayer(p, 'xi')).join('')}
          </div>

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
            ${CD.Pill({style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: esc(code)})}
            ${CD.Pill({tone:roleTone, style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: roleShort})}
            ${isOs ? CD.Pill({tone:'gold', style:'font-size:8.5px;padding:1px 6px;letter-spacing:0.06em;', children: '★ OS'}) : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:11px;">
        <span style="font-family:var(--mono);color:var(--mute);">₹${(p.soldPrice||0).toFixed(2)}</span>
        <span style="font-family:var(--display);font-weight:800;color:${pts>0?'var(--lime)':pts<0?'var(--red)':'var(--mute)'};">${pts>=0?'+':''}${pts}${mc?' <span style="color:var(--mute);font-weight:500;font-size:10px;">· '+mc+'m</span>':''}</span>
        ${(!releaseLocked || isSuper) ? `<button data-team="${esc(teamName)}" data-idx="${idx}" data-name="${esc(name)}" data-price="${p.soldPrice||0}" onclick="CD.handleRelease(this)" style="padding:3px 8px;border-radius:9999px;background:rgba(255,59,59,0.12);border:1px solid rgba(255,59,59,0.3);color:var(--red);font-size:10px;font-weight:600;cursor:pointer;">Release</button>` : ''}
      </div>
    </div>`;
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
      const xiSet = new Set((activeSq ? activeSq.slice(0,11) : rostr.slice(0,11).map(p => p.name||p.n||'')));

      let teamTotal = 0;
      const rows = rostr.map(p => {
        const name = p.name || p.n || '';
        const isXI = xiSet.has(name);
        const perMatch = {};
        let total = 0;
        matchIds.forEach(mid => {
          const m = matches[mid];
          const snap = m.squadSnapshots?.[tt.name];
          let xiThisMatch = xiSet;
          if(snap){ xiThisMatch = new Set((snap.xi || []).map(n => n.toLowerCase().trim())); }
          const rec = m.players ? Object.values(m.players).find(pp => (pp.name||'').toLowerCase().trim() === name.toLowerCase().trim()) : null;
          if(!rec){ perMatch[mid] = null; return; }
          const raw = rec.pts || 0;
          const isSnapXI = snap ? xiThisMatch.has(name.toLowerCase().trim()) : isXI;
          const mult = isSnapXI ? xiMult : 1;
          const val = Math.round(raw * mult);
          perMatch[mid] = { val, mult, raw };
          total += val;
        });
        teamTotal += total;
        return { p, name, perMatch, total, isXI };
      }).sort((a,b) => b.total - a.total);

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
            <div style="font-family:var(--display);font-weight:800;font-size:28px;color:${teamTotal>0?'var(--lime)':teamTotal<0?'var(--red)':'var(--mute)'};">${teamTotal>=0?'+':''}${Math.round(teamTotal)}</div>
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

  // Helper: compute per-team points from stored leaderboardTotals, per-team roster, per-team points details
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
        pts: Math.round(st.pts || 0),
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
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${arr.map((t, rankIdx) => {
            const isExpanded = expandedTeam === t.name;
            const code = teamCode(t.name);
            const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
            const rank = rankIdx + 1;
            return `
              <div style="border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid var(--line);overflow:hidden;">
                <div onclick="CD.toggleSquadExpand('${esc(t.name)}')" style="padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
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

  // Helper — render a team's roster split into XI / Bench / Reserves with season points
  CD._renderTeamRoster = (t, c1, c2) => {
    if(!t.roster.length) return `<div style="padding:14px 18px;color:var(--mute);font-size:12px;border-top:1px solid var(--line);">Empty roster</div>`;
    const rs = window.roomState || {};
    const xiMult = parseFloat(rs.xiMultiplier) || 1;
    const matches = rs.matches || {};
    const playerPts = {};
    Object.values(matches).forEach(m => {
      if(!m.players) return;
      Object.values(m.players).forEach(p => {
        if(p.ownedBy !== t.name) return;
        const key = (p.name||'').toLowerCase().trim();
        playerPts[key] = (playerPts[key] || 0) + (p.pts || 0);
      });
    });

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

    const xiTotal = xi.reduce((s,p) => s + Math.round((playerPts[(p.name||p.n||'').toLowerCase().trim()] || 0) * xiMult), 0);
    const benchTotal = bench.reduce((s,p) => s + Math.round(playerPts[(p.name||p.n||'').toLowerCase().trim()] || 0), 0);

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
              const raw = Math.round(playerPts[pName.toLowerCase().trim()] || 0);
              const val = Math.round(raw * mult);
              const isOs = !!(p.isOverseas || p.o);
              const showMultExpr = mult !== 1 && raw !== 0;
              return `<div title="${raw} raw × ${mult}× = ${val}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--line);">
                ${CD.Avatar({team: p.iplTeam || p.t, name: pName, size: 24})}
                <div style="flex:1;min-width:0;overflow:hidden;">
                  <div style="font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(pName)}${isOs ? ' <span style="color:var(--gold);font-size:9px;">★</span>' : ''}</div>
                  <div style="font-size:10px;color:var(--mute);">${esc(teamCode(p.iplTeam||p.t))} · ${esc((p.role||p.r||'').split('-')[0].slice(0,3))}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${val>0?'var(--lime)':val<0?'var(--red)':'var(--mute)'};">${val>=0?'+':''}${val}</div>
                  ${showMultExpr ? `<div style="font-size:9px;color:var(--mute);font-family:var(--mono);">${raw}×${mult}</div>` : ''}
                </div>
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
        ${reserves.length ? renderSection('Reserves', reserves, 0, 0, 'var(--mute)') : ''}
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
            <tbody>
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
        if(bowM){ const w=+bowM[1]; s.wkts+=w; s.overs+=+bowM[2]; s.runsConc+=+(bowM[3]||0); s.bowlInns++; if(w>=5)s.c5w++; if(w>=3)s.c3w++; }
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
                <tbody>
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
        const m = (p.breakdown||'').match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
        const w = m?+m[1]:0, ov = m?+m[2]:0, r = m?(+(m[3]||0)):0;
        const eco = ov>0 ? (r/ov).toFixed(2) : '—';
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

  // Schedule — IPL 2026 70-match fixture list
  CD.renderSchedule = () => {
    const schedule = window.IPL_SCHEDULE || [];
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    if(!schedule.length) return `<div style="padding:40px;border-radius:18px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;backdrop-filter:blur(20px);"><div class="ed" style="font-size:22px;">Schedule loading…</div></div>`;

    // Today's date (Apr 23, 2026 format)
    const today = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const todayStr = (String(today.getDate()).padStart(2,'0')) + ' ' + months[today.getMonth()];

    // Group by date
    const byDate = {};
    schedule.forEach(m => { if(!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });

    // Build played-match lookup (fuzzy match label)
    const played = {};
    Object.values(matches).forEach(m => {
      const lab = (m.label||'').toLowerCase();
      // Extract team pairs like "csk vs mi"
      const match = lab.match(/([A-Z]{2,4})\s*vs?\s*([A-Z]{2,4})/i);
      if(match) played[(match[1]+':'+match[2]).toUpperCase()] = m;
    });

    const parseDateForSort = (dStr) => {
      const [day, mon] = dStr.split(' ');
      const monIdx = months.indexOf(mon);
      return (monIdx * 100) + (+day);
    };

    const sortedDates = Object.keys(byDate).sort((a,b) => parseDateForSort(a) - parseDateForSort(b));

    return `
      <div style="padding:16px 20px;border-radius:14px;background:var(--glass-2,rgba(22,24,38,0.72));backdrop-filter:blur(32px);border:1px solid var(--line-2);margin-bottom:18px;">
        <div style="font-size:10px;color:var(--mute);letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">IPL 2026</div>
        <h2 class="ed" style="font-size:32px;margin-top:2px;">Season <span class="ed-i" style="color:var(--gold);">schedule</span></h2>
        <div style="font-size:12px;color:var(--mute);margin-top:6px;">${schedule.length} matches · 10 teams</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        ${sortedDates.map(d => {
          const isToday = d === todayStr;
          const dayMatches = byDate[d];
          return `
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
                  const playedKey = (m.t1+':'+m.t2).toUpperCase();
                  const playedKey2 = (m.t2+':'+m.t1).toUpperCase();
                  const result = played[playedKey] || played[playedKey2];
                  const [c1a, c2a] = TEAM_COLORS[m.t1] || ['#444','#222'];
                  const [c1b, c2b] = TEAM_COLORS[m.t2] || ['#444','#222'];
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
                    ${result ? `<div style="margin-top:6px;font-size:10px;">${CD.Pill({tone:'lime', style:'font-size:9px;padding:2px 7px;', children:'W: ' + esc(result.winner||'?')})}</div>` : ''}
                  </div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  CD.renderTrades = () => {
    const rs = window.roomState || {};
    const trades = rs.trades ? Object.values(rs.trades) : [];
    return `
      <div class="cd-glass-2" style="padding:24px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div class="ed" style="font-size:24px;">Trade <span class="ed-i" style="color:var(--mute);">proposals</span></div>
          <button onclick="window.switchTab('trades');" style="padding:8px 14px;border-radius:9999px;background:linear-gradient(180deg,var(--pink-2),var(--pink));color:#fff;border:none;font-weight:600;font-size:12px;cursor:pointer;">${I('plus',12)} New trade</button>
        </div>
        ${trades.length ? `
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${trades.slice(0, 12).map(t => `<div style="padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <div style="font-size:13px;font-weight:600;">${esc(t.from || '?')} → ${esc(t.to || '?')}</div>
              ${CD.Pill({tone: t.status === 'accepted' ? 'lime' : t.status === 'rejected' ? 'red' : 'electric', children: (t.status || 'pending').toUpperCase()})}
            </div>`).join('')}
          </div>
        ` : `<div style="padding:30px;text-align:center;color:var(--mute);">No trades yet.</div>`}
      </div>
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
    if(typeof window.switchTab === 'function') try { window.switchTab(legacyMap[navId] || navId); } catch(e){}
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
    if(typeof window.switchTab === 'function') try { window.switchTab(legacyMap[subId] || subId); } catch(e){}
    CD.render();
  };

  // ── MAIN RENDER ────────────────────────────────────────────────
  let _renderTimer = null;
  CD.scheduleRender = () => {
    if(_renderTimer) clearTimeout(_renderTimer);
    _renderTimer = setTimeout(() => { try { CD.render(); } catch(e){ console.error('CD render:', e); } }, 100);
  };
  CD.render = () => {
    const r = document.getElementById('cd-root');
    if(!r) return;
    let html = '';
    if(CD.state.view === 'auth') html = CD.renderAuth();
    else if(CD.state.view === 'dashboard') html = CD.renderDashboard();
    else if(CD.state.view === 'room') html = CD.renderRoom();
    r.innerHTML = html;
    if(CD.state.view === 'dashboard') CD.injectRoomCards();
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
      window.loadRoom = function(rid){ try { _origLoadRoom(rid); } catch(e){} CD.state.view = 'room'; CD.state.activeNav = 'auction'; CD.state.activeSub = 'live'; setTimeout(CD.render, 100); };
    }
    const _origBack = window.backToDashboard;
    if(typeof _origBack === 'function'){
      window.backToDashboard = function(){ try { _origBack(); } catch(e){} CD.state.view = 'dashboard'; CD.render(); };
    }

    // CRITICAL: detect login/logout by polling window.user (showAuth/showApp are module-scoped, can't override)
    let lastUserUid = null;
    let lastRoomId = null;
    setInterval(() => {
      try {
        const u = window.user;
        const uid = u && u.uid;
        const rid = window.roomId;
        if(uid !== lastUserUid){
          lastUserUid = uid;
          if(uid){
            // Logged in
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
            // Logged out
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
    }, 200);

    // Poll for room data changes
    let lastKey = '';
    setInterval(() => {
      try {
        if(CD.state.view !== 'room') return;
        const rs = window.roomState; if(!rs) return;
        const key = JSON.stringify({
          bid: rs.currentBlock?.currentBid,
          ldr: rs.currentBlock?.lastBidderTeam,
          pid: rs.currentBlock?.playerId,
          act: rs.currentBlock?.active,
          tn: Object.keys(rs.teams||{}).length,
          ni: Object.keys(rs.currentBlock?.notInterested||{}).length,
          mt: Object.keys(rs.matches||{}).length,
          ps: Object.values(rs.players||{}).filter(p=>p.status==='sold').length,
          rl: rs.releaseLocked
        });
        if(key !== lastKey){ lastKey = key; CD.scheduleRender(); }
      } catch(e){}
    }, 400);

    // Listen for room list updates (fired by app.js when Firebase data loads)
    const updateRoomGrids = () => {
      try {
        if(CD.state.view !== 'dashboard') return;
        const myRooms = window.userAuctionRooms || [];
        const joinedRooms = window.userJoinedRooms || [];
        const myGrid = document.getElementById('cd-my-rooms-grid');
        const joinedGrid = document.getElementById('cd-joined-rooms-grid');
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
    // Initial call after a moment, to catch already-loaded data
    setTimeout(updateRoomGrids, 200);
  };

  // ── BOOT ───────────────────────────────────────────────────────
  function init(){
    // Pre-detect initial state to avoid auth flicker if user already logged in
    if(window.user && window.user.uid){
      CD.state.view = window.roomId ? 'room' : 'dashboard';
      if(CD.state.view === 'room'){ CD.state.activeNav = 'auction'; CD.state.activeSub = 'live'; }
    } else if(window.location.search.includes('room=')){
      // URL has ?room= — likely going to a room after auth restores
      CD.state.view = 'auth';
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

/* Animations */
(function(){
  const css = `
    @keyframes cd-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,45,135,0.7); } 70% { box-shadow: 0 0 0 8px rgba(255,45,135,0); } }
    @keyframes cd-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes cd-fadein { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes cd-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
