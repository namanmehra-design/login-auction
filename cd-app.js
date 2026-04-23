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
  CD.Avatar = ({ team, name, size = 40 } = {}) => {
    const code = teamCode(team) || teamCode(name) || 'MI';
    const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
    const init = initialsOf(name);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:inline-flex;align-items:center;justify-content:center;color:#fff;font-family:var(--display);font-weight:800;font-size:${Math.round(size*0.36)}px;letter-spacing:0.05em;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.2),0 2px 8px rgba(0,0,0,0.3);flex-shrink:0;">${esc(init)}</div>`;
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
    squad:   [{id:'myteam', label:'My team'}, {id:'trades', label:'Trades'}],
    league:  [{id:'leaderboard', label:'Leaderboard'}, {id:'points', label:'Points'}],
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
      // Map nav+sub → legacy classic tab ID — every tab embeds for full feature parity
      const map = {
        'setup:setup':         'setup',
        'auction:live':        'auction',
        'auction:purses':      'teams',
        'auction:ledger':      'roster',
        'squad:myteam':        'myteam',
        'squad:trades':        'trades',
        'league:leaderboard':  'leaderboard',
        'league:points':       'points',
        'players:pool':        'players-season',
        'players:analytics':   'analytics',
        'matches:data':        'matches',
        'matches:schedule':    'schedule'
      };
      const legacyId = map[`${nav}:${sub || ''}`] || (nav === 'setup' ? 'setup' : nav === 'auction' ? 'auction' : nav === 'squad' ? 'myteam' : nav === 'league' ? 'leaderboard' : nav === 'players' ? 'players-season' : nav === 'matches' ? 'matches' : 'setup');
      requestAnimationFrame(() => CD.embedClassicTab(legacyId));
      return `<div id="cd-classic-host" style="min-height:280px;"><div style="padding:40px;text-align:center;color:var(--mute);font-size:13px;">Loading…</div></div>`;
    } catch(e){
      console.error('CD tab error:', e);
      return `<div style="padding:24px;border-radius:14px;background:var(--glass);border:1px solid var(--line);color:var(--ink-2);">Error loading: ${esc(e.message)}</div>`;
    }
  };

  // ── EMBED CLASSIC TAB CONTENT INTO CD SHELL ────────────────────
  // Moves the classic tab div into #cd-classic-host so all classic features
  // (search, filters, modals, Cricbuzz photos, scorecard upload) work.
  // Previously-mounted tabs are stashed off-screen so app.js's switchTab can still find them.
  CD.embedClassicTab = (legacyId) => {
    if(!legacyId) return;
    // Ensure stash exists
    let stash = document.getElementById('cd-tab-stash');
    if(!stash){
      stash = document.createElement('div');
      stash.id = 'cd-tab-stash';
      stash.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none;';
      document.body.appendChild(stash);
    }
    // Trigger app.js to render this tab (calls renderXxx if needed)
    if(typeof window.switchTab === 'function'){
      try { window.switchTab(legacyId); } catch(e){ console.error('switchTab:', e); }
    }
    // Move previously-mounted tabs back to stash to free up the host
    const host = document.getElementById('cd-classic-host');
    if(!host){ setTimeout(() => CD.embedClassicTab(legacyId), 100); return; }
    Array.from(host.querySelectorAll('[id$="-tab"]')).forEach(el => {
      stash.appendChild(el);
    });
    host.innerHTML = '';
    const tabEl = document.getElementById(legacyId + '-tab');
    if(tabEl){
      // Reset display + visibility (switchTab uses display:none)
      tabEl.style.display = 'block';
      tabEl.style.visibility = 'visible';
      tabEl.style.position = 'static';
      tabEl.style.left = 'auto';
      tabEl.style.top = 'auto';
      tabEl.style.width = '100%';
      tabEl.style.height = 'auto';
      tabEl.style.pointerEvents = 'auto';
      tabEl.style.opacity = '1';
      host.appendChild(tabEl);
    } else {
      host.innerHTML = '<div style="padding:30px;text-align:center;color:var(--mute);">Tab content not yet loaded. Try clicking again in a moment.</div>';
    }
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
    const arr = Object.values(teams);
    if(!arr.length) return `<div class="cd-glass" style="padding:24px;border-radius:14px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;">No teams have joined yet.</div>`;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
        ${arr.map(t => {
          const code = teamCode(t.name);
          const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
          const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
          const spent = roster.reduce((s,p) => s + (p.soldPrice || 0), 0);
          const left = t.budget || 0;
          const pct = initial > 0 ? Math.min(100, (spent / initial) * 100) : 0;
          return `
            <div class="cd-glass" style="border-radius:18px;overflow:hidden;border:1px solid var(--line-2);background:var(--glass);">
              <div style="padding:18px;background:linear-gradient(135deg,${c1}50,${c2}30);position:relative;">
                <div style="display:flex;align-items:center;gap:12px;">
                  ${CD.Avatar({name: t.name, size: 48})}
                  <div style="flex:1;min-width:0;">
                    <div class="ed" style="font-size:22px;line-height:1;">${esc(t.name)}</div>
                    <div style="font-size:10px;color:var(--ink-2);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;margin-top:4px;">${roster.length} players</div>
                  </div>
                </div>
              </div>
              <div style="padding:18px;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
                  <span style="font-size:10px;color:var(--mute);letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Purse left</span>
                  <span style="font-family:var(--mono);font-size:11px;color:var(--mute);">of ₹${initial}cr</span>
                </div>
                <div style="font-family:var(--display);font-size:36px;font-weight:800;color:var(--lime);line-height:1;">₹${left.toFixed(1)}<span style="font-size:18px;color:var(--mute);">cr</span></div>
                <div style="margin-top:14px;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--electric),var(--pink));border-radius:3px;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mute);margin-top:6px;">
                  <span>Spent ₹${spent.toFixed(1)}cr</span>
                  <span>${pct.toFixed(0)}% used</span>
                </div>
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
    const sold = players.filter(p => p.status === 'sold').sort((a,b) => (b.soldPrice||0) - (a.soldPrice||0));
    if(!sold.length) return `<div class="cd-glass" style="padding:30px;border-radius:14px;background:var(--glass);border:1px solid var(--line);color:var(--mute);text-align:center;">No players sold yet.</div>`;
    return `
      <div class="cd-glass-2" style="border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);overflow:hidden;">
        <div style="padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
          <div class="ed" style="font-size:24px;">Bid <span class="ed-i" style="color:var(--mute);">ledger</span></div>
          <div style="font-size:12px;color:var(--mute);">${sold.length} sold</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:rgba(0,0,0,0.2);">
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">IPL Team</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Role</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Bought by</th>
                <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Price</th>
              </tr>
            </thead>
            <tbody>
              ${sold.map(p => {
                const name = p.name || p.n || '';
                return `<tr style="border-top:1px solid var(--line);">
                  <td style="padding:12px 14px;display:flex;align-items:center;gap:10px;">${CD.Avatar({team: p.iplTeam || p.t, name, size: 32})}<div><div style="font-weight:600;">${esc(name)}</div>${(p.isOverseas || p.o) ? `<div style="font-size:10px;color:var(--gold);">OVERSEAS</div>` : ''}</div></td>
                  <td style="padding:12px 14px;">${CD.TeamChip({code: p.iplTeam || p.t})}</td>
                  <td style="padding:12px 14px;color:var(--ink-2);">${esc(p.role || p.r || '')}</td>
                  <td style="padding:12px 14px;">${esc(p.soldTo || '—')}</td>
                  <td style="padding:12px 14px;text-align:right;font-family:var(--mono);color:var(--lime);font-weight:700;">₹${(p.soldPrice||0).toFixed(2)}cr</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  CD.renderMyTeam = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const myTeam = window.myTeamName || '';
    const t = teams[myTeam];
    if(!t) return `<div class="cd-glass" style="padding:30px;border-radius:14px;color:var(--mute);text-align:center;">You haven't registered a team yet.</div>`;
    const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
    const spent = roster.reduce((s,p) => s + (p.soldPrice || 0), 0);
    const overseas = roster.filter(p => p.isOverseas || p.o).length;
    const releaseLocked = !!rs.releaseLocked;
    const isSuper = window.user?.email && window.user.email.toLowerCase().trim() === 'namanmehra@gmail.com';
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
        ${CD.Stat({val: roster.length, lbl: 'Squad size', accent: 'var(--electric)'})}
        ${CD.Stat({val: '₹' + (t.budget||0).toFixed(1) + 'cr', lbl: 'Purse left', accent: 'var(--lime)'})}
        ${CD.Stat({val: '₹' + spent.toFixed(1) + 'cr', lbl: 'Total spent', accent: 'var(--pink)'})}
        ${CD.Stat({val: overseas + ' / ' + (rs.maxOverseas || 8), lbl: 'Overseas', accent: 'var(--gold)'})}
      </div>
      <div class="cd-glass-2" style="padding:24px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div class="ed" style="font-size:28px;">${esc(t.name)}</div>
          ${releaseLocked ? CD.Pill({tone:'red', children:'Releases locked'}) : ''}
        </div>
        ${roster.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${roster.map((p, idx) => {
            const name = p.name || p.n || '';
            const code = teamCode(p.iplTeam || p.t);
            const [c1, c2] = TEAM_COLORS[code] || ['#444','#222'];
            const isOs = !!(p.isOverseas || p.o);
            return `<div style="padding:12px;border-radius:14px;background:linear-gradient(135deg,${c1}25,${c2}10);border:1px solid var(--line);position:relative;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                ${CD.Avatar({team: p.iplTeam || p.t, name, size: 36})}
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:13px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(name)}</div>
                  <div style="font-size:10px;color:var(--mute);letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${esc(p.role || p.r || '')}${isOs ? ' · OS' : ''}</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
                <span style="font-family:var(--mono);color:var(--lime);">₹${(p.soldPrice||0).toFixed(2)}cr</span>
                ${(!releaseLocked || isSuper) ? `<button data-team="${esc(t.name)}" data-idx="${idx}" data-name="${esc(name)}" data-price="${p.soldPrice||0}" onclick="CD.handleRelease(this)" style="padding:4px 10px;border-radius:9999px;background:rgba(255,59,59,0.18);border:1px solid rgba(255,59,59,0.4);color:var(--red);font-size:10px;font-weight:600;cursor:pointer;">Release</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        ` : `<div style="padding:30px;text-align:center;color:var(--mute);">No players yet — bid in the auction!</div>`}
      </div>
    `;
  };

  CD.renderLeaderboard = () => {
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const stored = rs.leaderboardTotals || {};
    const arr = Object.values(teams).map(t => ({
      name: t.name,
      pts: Math.round((stored[t.name]?.pts) || 0),
      roster: Array.isArray(t.roster) ? t.roster.length : Object.keys(t.roster||{}).length,
      budget: t.budget || 0
    })).sort((a,b) => b.pts - a.pts);
    if(!arr.length) return `<div class="cd-glass" style="padding:30px;border-radius:14px;color:var(--mute);text-align:center;">No teams yet.</div>`;
    const podium = arr.slice(0, 3);
    const rest = arr.slice(3);
    const podColors = [{bg:'rgba(255,200,61,0.3)', text:'var(--gold)'}, {bg:'rgba(176,196,222,0.25)', text:'#D8DCE8'}, {bg:'rgba(205,127,50,0.25)', text:'#E0945E'}];
    return `
      <div class="cd-glass-2" style="padding:32px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);margin-bottom:20px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:24px 24px;mask-image:radial-gradient(ellipse at center,black 30%,transparent 80%);pointer-events:none;"></div>
        <div style="text-align:center;margin-bottom:24px;position:relative;">
          <div style="font-size:11px;color:var(--mute);letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Season Standings</div>
          <h2 class="ed" style="font-size:48px;line-height:1;margin-top:6px;">The <span class="ed-i" style="color:var(--gold);">podium</span></h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:16px;align-items:end;position:relative;${CD.state.isMobile ? 'grid-template-columns:1fr;' : ''}">
          ${(CD.state.isMobile ? [0,1,2] : [1,0,2]).map(i => {
            const t = podium[i]; if(!t) return '<div></div>';
            const c = podColors[i];
            const h = i === 0 ? 220 : i === 1 ? 160 : 120;
            const crown = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            const rankNum = i + 1; // ALWAYS show real rank: 1, 2, 3
            return `
              <div style="text-align:center;">
                <div style="font-size:${i===0?44:36}px;margin-bottom:8px;filter:drop-shadow(0 0 16px ${c.text});">${crown}</div>
                ${CD.Avatar({name: t.name, size: i === 0 ? 92 : 72})}
                <div style="font-size:10px;color:${c.text};letter-spacing:0.2em;text-transform:uppercase;font-weight:700;margin-top:10px;">Rank ${rankNum}</div>
                <div class="ed" style="font-size:${i===0?24:18}px;margin-top:4px;">${esc(t.name)}</div>
                <div style="margin-top:8px;display:inline-block;padding:6px 14px;border-radius:9999px;background:${c.bg};border:1px solid ${c.text}40;color:${c.text};font-family:var(--display);font-weight:800;font-size:${i===0?16:14}px;">${t.pts >= 0 ? '+' : ''}${t.pts}</div>
                ${!CD.state.isMobile ? `<div style="margin-top:14px;height:${h}px;background:linear-gradient(180deg,${c.bg},transparent);border-top-left-radius:14px;border-top-right-radius:14px;border:1px solid ${c.text}30;border-bottom:none;display:flex;align-items:start;justify-content:center;padding-top:18px;"><div style="font-family:var(--serif);font-style:italic;font-weight:800;font-size:${i===0?110:80}px;color:${c.text}cc;line-height:1;filter:drop-shadow(0 0 20px ${c.text});">${rankNum}</div></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ${rest.length ? `
      <div class="cd-glass" style="padding:20px;border-radius:14px;background:var(--glass);border:1px solid var(--line);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:11px;color:var(--mute);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Rest of the league</div>
          <div style="font-size:11px;color:var(--mute);">${rest.length} teams</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr><th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Rank</th><th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Team</th><th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Squad</th><th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Purse</th><th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);border-bottom:1px solid var(--line);">Points</th></tr>
          </thead>
          <tbody>
            ${rest.map((t, i) => `<tr style="border-bottom:1px solid var(--line);"><td style="padding:10px 12px;font-family:var(--display);font-size:18px;color:var(--mute);">${(i+4).toString().padStart(2,'0')}</td><td style="padding:10px 12px;display:flex;align-items:center;gap:10px;">${CD.Avatar({name: t.name, size: 28})}<span style="font-weight:600;">${esc(t.name)}</span></td><td style="padding:10px 12px;text-align:right;color:var(--ink-2);">${t.roster}</td><td style="padding:10px 12px;text-align:right;color:var(--lime);font-family:var(--mono);">₹${t.budget.toFixed(1)}</td><td style="padding:10px 12px;text-align:right;font-family:var(--display);font-size:18px;color:var(--ink);font-weight:800;">${t.pts >= 0 ? '+' : ''}${t.pts}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
  };

  CD.renderPoints = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    if(!Object.keys(matches).length) return `<div class="cd-glass" style="padding:30px;border-radius:14px;color:var(--mute);text-align:center;">No match data yet.</div>`;
    // Aggregate per-player points
    const totals = {};
    Object.values(matches).forEach(m => {
      if(!m.players) return;
      Object.values(m.players).forEach(p => {
        const k = (p.name||'').toLowerCase();
        if(!totals[k]) totals[k] = {name: p.name, pts: 0, mc: 0};
        totals[k].pts += (p.pts || 0);
        totals[k].mc++;
      });
    });
    const sorted = Object.values(totals).sort((a,b) => b.pts - a.pts).slice(0, 50);
    return `
      <div class="cd-glass-2" style="border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);overflow:hidden;">
        <div style="padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
          <div class="ed" style="font-size:24px;">Top <span class="ed-i" style="color:var(--mute);">scorers</span></div>
          <div style="font-size:12px;color:var(--mute);">${Object.keys(matches).length} matches · ${Object.keys(totals).length} players</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:rgba(0,0,0,0.2);"><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">#</th><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th><th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Matches</th><th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Points</th></tr></thead>
            <tbody>
              ${sorted.map((p,i) => `<tr style="border-top:1px solid var(--line);"><td style="padding:12px 14px;font-family:var(--display);font-size:16px;color:var(--mute);">${(i+1).toString().padStart(2,'0')}</td><td style="padding:12px 14px;font-weight:600;">${esc(p.name)}</td><td style="padding:12px 14px;text-align:right;color:var(--ink-2);">${p.mc}</td><td style="padding:12px 14px;text-align:right;font-family:var(--display);font-weight:800;color:${p.pts>=0?'var(--lime)':'var(--red)'};">${p.pts >= 0 ? '+' : ''}${p.pts}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  CD.renderPlayersPool = () => {
    const rs = window.roomState || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    if(!players.length) return `<div class="cd-glass" style="padding:30px;border-radius:14px;color:var(--mute);text-align:center;">Auction not initialized yet.</div>`;
    const filter = window._cdPlayerFilter || 'all';
    let filtered = players;
    if(filter === 'available') filtered = players.filter(p => p.status === 'available');
    else if(filter === 'sold') filtered = players.filter(p => p.status === 'sold');
    else if(filter === 'unsold') filtered = players.filter(p => p.status === 'unsold');
    return `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        ${[['all','All'],['available','Available'],['sold','Sold'],['unsold','Unsold']].map(([k,l]) => `
          <button onclick="window._cdPlayerFilter='${k}';CD.render();" style="padding:6px 14px;border-radius:9999px;background:${filter===k?'linear-gradient(180deg,var(--electric-2),var(--electric))':'var(--glass)'};border:1px solid ${filter===k?'transparent':'var(--line)'};color:${filter===k?'#fff':'var(--ink-2)'};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">${l}</button>
        `).join('')}
        <div style="flex:1"></div>
        <div style="font-size:11px;color:var(--mute);align-self:center;">${filtered.length} players</div>
      </div>
      <div class="cd-glass-2" style="border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);overflow:hidden;">
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:rgba(0,0,0,0.2);"><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Player</th><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Team</th><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Role</th><th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Base</th><th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Status</th><th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--mute);">Sold for</th></tr></thead>
            <tbody>
              ${filtered.slice(0, 100).map(p => {
                const name = p.name || p.n || '';
                const status = p.status || 'available';
                const tone = status === 'sold' ? 'lime' : status === 'unsold' ? 'red' : 'electric';
                return `<tr style="border-top:1px solid var(--line);">
                  <td style="padding:12px 14px;display:flex;align-items:center;gap:10px;">${CD.Avatar({team: p.iplTeam || p.t, name, size: 28})}<span style="font-weight:600;">${esc(name)}${(p.isOverseas||p.o) ? ` <span style="font-size:9px;color:var(--gold);">★</span>` : ''}</span></td>
                  <td style="padding:12px 14px;">${CD.TeamChip({code: p.iplTeam || p.t})}</td>
                  <td style="padding:12px 14px;color:var(--ink-2);">${esc(p.role || p.r || '')}</td>
                  <td style="padding:12px 14px;text-align:right;font-family:var(--mono);color:var(--mute);">₹${(p.basePrice||0).toFixed(2)}cr</td>
                  <td style="padding:12px 14px;">${CD.Pill({tone, children: status.toUpperCase()})}</td>
                  <td style="padding:12px 14px;text-align:right;font-family:var(--mono);color:${status==='sold'?'var(--lime)':'var(--mute)'};font-weight:${status==='sold'?700:400};">${p.soldPrice ? '₹'+p.soldPrice.toFixed(2)+'cr' : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${filtered.length > 100 ? `<div style="text-align:center;color:var(--mute);font-size:12px;padding:14px;">Showing first 100 · ${filtered.length - 100} more not shown</div>` : ''}
    `;
  };

  CD.renderAnalytics = () => {
    return `<div class="cd-glass-2" style="padding:32px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);text-align:center;">
      <div style="margin:0 auto 12px;width:56px;height:56px;border-radius:50%;background:rgba(46,91,255,0.15);display:flex;align-items:center;justify-content:center;color:var(--electric);">${I('chart',28)}</div>
      <div class="ed" style="font-size:32px;">Player <span class="ed-i" style="color:var(--electric);">analytics</span></div>
      <p style="margin-top:8px;color:var(--ink-2);">Detailed batting, bowling, fielding and value analytics.</p>
      <button onclick="window.switchTab('analytics');setTimeout(function(){var el=document.getElementById('analytics-tab');if(el){el.scrollIntoView();window._cdShowClassic=true;CD.render();}}, 100);" style="margin-top:14px;padding:10px 22px;border-radius:9999px;background:linear-gradient(180deg,var(--electric-2),var(--electric));color:#fff;border:none;font-weight:600;font-size:13px;cursor:pointer;">Open analytics dashboard</button>
    </div>`;
  };

  CD.renderMatches = () => {
    const rs = window.roomState || {};
    const matches = rs.matches || {};
    const list = Object.entries(matches).sort((a,b) => (b[1].timestamp||0) - (a[1].timestamp||0));
    if(!list.length) return `<div class="cd-glass" style="padding:30px;border-radius:14px;color:var(--mute);text-align:center;">No matches recorded yet.</div>`;
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">
        ${list.map(([id, m]) => {
          const playerCount = m.players ? Object.keys(m.players).length : 0;
          return `<div class="cd-glass" style="padding:18px;border-radius:14px;background:var(--glass);border:1px solid var(--line);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <div class="ed" style="font-size:18px;">${esc(m.label || id)}</div>
              ${m.winner ? CD.Pill({tone:'lime', children: 'W: ' + esc(m.winner)}) : CD.Pill({children:'No result'})}
            </div>
            <div style="font-size:12px;color:var(--ink-2);">MOTM: <strong>${esc(m.motm || '—')}</strong></div>
            <div style="font-size:11px;color:var(--mute);margin-top:6px;">${playerCount} player scores</div>
          </div>`;
        }).join('')}
      </div>
    `;
  };

  CD.renderSchedule = () => {
    return `<div class="cd-glass-2" style="padding:32px;border-radius:22px;background:var(--glass-2);border:1px solid var(--line-2);text-align:center;">
      <div style="margin:0 auto 12px;width:56px;height:56px;border-radius:50%;background:rgba(255,200,61,0.15);display:flex;align-items:center;justify-content:center;color:var(--gold);">${I('cal',28)}</div>
      <div class="ed" style="font-size:32px;">IPL <span class="ed-i" style="color:var(--gold);">schedule</span></div>
      <p style="margin-top:8px;color:var(--ink-2);">View upcoming and completed IPL fixtures.</p>
    </div>`;
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
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
