// Vanilla JS conversion of scenes-desktop.jsx + scenes-mobile.jsx
// Every scene is a function on window.CD that takes a `data` object
// and returns an HTML string. Primitives (PlayerAvatar, TeamChip, Pill,
// Stat, Sparkline, RoleIcon, BrandMark, Icon, LiveDot, Ticker, initialsOf)
// are assumed to live on window.CD and to return HTML strings as well.

window.CD = window.CD || {};

(function () {
  const CD = window.CD;

  // ─── Default mock data (parallels primitives.jsx) ───────
  const TEAMS = CD.TEAMS || [
    { code: 'CSK',  name: 'Chennai Super Kings',         c1: '#FFCC00', c2: '#0081E9' },
    { code: 'MI',   name: 'Mumbai Indians',              c1: '#004BA0', c2: '#F5C518' },
    { code: 'KKR',  name: 'Kolkata Knight Riders',       c1: '#3A225D', c2: '#F5C518' },
    { code: 'RCB',  name: 'Royal Challengers Bengaluru', c1: '#EC1C24', c2: '#000000' },
    { code: 'PBKS', name: 'Punjab Kings',                c1: '#ED1B24', c2: '#DCDDDF' },
    { code: 'GT',   name: 'Gujarat Titans',              c1: '#1B2133', c2: '#B3A06D' },
    { code: 'RR',   name: 'Rajasthan Royals',            c1: '#EA1A85', c2: '#004BA0' },
    { code: 'SRH',  name: 'Sunrisers Hyderabad',         c1: '#F7A721', c2: '#E2231A' },
    { code: 'LSG',  name: 'Lucknow Super Giants',        c1: '#002F6C', c2: '#FF6B1A' },
    { code: 'DC',   name: 'Delhi Capitals',              c1: '#004C93', c2: '#EF1B23' },
  ];

  const PLAYERS = CD.PLAYERS || [
    { name: 'Virat Kohli',     team: 'RCB',  role: 'BAT',  origin: 'IN', base: 2.0, sold: 21.0,  cap: true,  form: [72, 45, 88, 102, 33] },
    { name: 'Jasprit Bumrah',  team: 'MI',   role: 'BOWL', origin: 'IN', base: 2.0, sold: 18.5,  cap: true,  form: [3, 4, 2, 1, 3] },
    { name: 'MS Dhoni',        team: 'CSK',  role: 'WK',   origin: 'IN', base: 2.0, sold: 24.0,  cap: true,  form: [18, 28, 40, 12, 37] },
    { name: 'Travis Head',     team: 'SRH',  role: 'BAT',  origin: 'OS', base: 2.0, sold: 6.8,   cap: false, form: [89, 55, 102, 33, 67] },
    { name: 'Andre Russell',   team: 'KKR',  role: 'AR',   origin: 'OS', base: 2.0, sold: 12.0,  cap: true,  form: [42, 28, 65, 19, 38] },
    { name: 'Rashid Khan',     team: 'GT',   role: 'BOWL', origin: 'OS', base: 2.0, sold: 15.0,  cap: false, form: [2, 3, 1, 4, 2] },
    { name: 'Shubman Gill',    team: 'GT',   role: 'BAT',  origin: 'IN', base: 2.0, sold: 11.0,  cap: false, form: [56, 78, 42, 99, 23] },
    { name: 'Hardik Pandya',   team: 'MI',   role: 'AR',   origin: 'IN', base: 2.0, sold: 16.35, cap: true,  form: [34, 45, 22, 56, 41] },
    { name: 'Sanju Samson',    team: 'RR',   role: 'WK',   origin: 'IN', base: 2.0, sold: 14.0,  cap: true,  form: [44, 72, 38, 55, 29] },
    { name: 'Pat Cummins',     team: 'SRH',  role: 'BOWL', origin: 'OS', base: 2.0, sold: 20.5,  cap: false, form: [2, 1, 3, 2, 4] },
    { name: 'Nicholas Pooran', team: 'LSG',  role: 'WK',   origin: 'OS', base: 2.0, sold: 16.0,  cap: false, form: [67, 22, 88, 45, 54] },
    { name: 'Shreyas Iyer',    team: 'PBKS', role: 'BAT',  origin: 'IN', base: 2.0, sold: 26.75, cap: true,  form: [48, 62, 35, 41, 77] },
  ];

  const MY_SQUAD = CD.MY_SQUAD || [PLAYERS[0], PLAYERS[2], PLAYERS[4], PLAYERS[7], PLAYERS[5], PLAYERS[10]];

  const LEADERBOARD = CD.LEADERBOARD || [
    { team: 'Stadium Kings',   owner: 'priya.k',  pts: 1842, players: 17, purse: 3.2, delta: '+124' },
    { team: 'Sixers United',   owner: 'arjun.m',  pts: 1789, players: 18, purse: 1.5, delta: '+98'  },
    { team: 'Boundary Riders', owner: 'neha.r',   pts: 1654, players: 16, purse: 5.8, delta: '+142' },
    { team: 'Yorker Squad',    owner: 'vikram.s', pts: 1501, players: 18, purse: 2.0, delta: '+67'  },
    { team: 'Power Players',   owner: 'sara.j',   pts: 1489, players: 17, purse: 4.4, delta: '+88'  },
    { team: 'Wicket Warriors', owner: 'rohit.p',  pts: 1402, players: 17, purse: 3.0, delta: '+55'  },
  ];

  const MATCHES = CD.MATCHES || [
    { id: 1, a: 'CSK', b: 'MI',   aScore: '182/6', bScore: '178/8', status: 'CSK won by 4 runs',    date: 'Apr 12', venue: 'Chepauk',     time: '19:30' },
    { id: 2, a: 'RCB', b: 'KKR',  aScore: '204/3', bScore: '206/4', status: 'KKR won by 6 wickets', date: 'Apr 13', venue: 'Eden Gardens',time: '19:30' },
    { id: 3, a: 'GT',  b: 'SRH',  aScore: '-',     bScore: '-',     status: 'Live · 12.4 ov',       date: 'Apr 14', venue: 'Ahmedabad',   time: '19:30', live: true },
    { id: 4, a: 'RR',  b: 'PBKS', aScore: null,    bScore: null,    status: '7:30 PM',              date: 'Apr 15', venue: 'Jaipur',      time: '19:30', upcoming: true },
    { id: 5, a: 'LSG', b: 'DC',   aScore: null,    bScore: null,    status: '3:30 PM',              date: 'Apr 16', venue: 'Lucknow',     time: '15:30', upcoming: true },
  ];

  // Expose data so callers can override / introspect
  CD.TEAMS = TEAMS;
  CD.PLAYERS = PLAYERS;
  CD.MY_SQUAD = MY_SQUAD;
  CD.LEADERBOARD = LEADERBOARD;
  CD.MATCHES = MATCHES;

  // ─── Tiny helpers ───────────────────────────────────────
  const initialsOf = CD.initialsOf || function (name) {
    return String(name || '').split(' ').map(s => s[0] || '').join('').slice(0, 2);
  };
  const teamByCode = (code) => TEAMS.find(t => t.code === code) || TEAMS[0];

  // Stub primitives — only used if window.CD.* primitive is missing,
  // so the scenes still render something coherent.
  const Pill = (CD.Pill) || function (opts) {
    opts = opts || {};
    const tone = opts.tone || '';
    const style = opts.style || '';
    return `<span class="pill ${tone ? 'pill-' + tone : ''}" style="${style}">${opts.children || ''}</span>`;
  };
  const LiveDot = (CD.LiveDot) || function () { return `<span class="live-dot"></span>`; };
  const TeamChip = (CD.TeamChip) || function (opts) {
    opts = opts || {};
    const t = teamByCode(opts.code);
    const label = opts.label || t.code;
    return `<span class="team-chip" style="--c1:${t.c1};--c2:${t.c2};">${label}</span>`;
  };
  const PlayerAvatar = (CD.PlayerAvatar) || function (opts) {
    opts = opts || {};
    const t = teamByCode(opts.code);
    const size = opts.size || 40;
    const initials = opts.initials || '';
    return `<div class="player-avatar" style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg, ${t.c1}, ${t.c2});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:var(--display);font-size:${Math.max(10, size * 0.32)}px;">${initials}</div>`;
  };
  const Stat = (CD.Stat) || function (opts) {
    opts = opts || {};
    const accent = opts.accent || 'var(--ink)';
    return `<div class="stat" style="${opts.style || ''}"><div class="dsp" style="font-size:28px;color:${accent};">${opts.val}</div><div class="cap">${opts.lbl}</div></div>`;
  };
  const Sparkline = (CD.Sparkline) || function (opts) {
    opts = opts || {};
    const data = opts.data || [];
    const w = opts.w || 80, h = opts.h || 24;
    const color = opts.color || 'var(--lime)';
    if (!data.length) return `<svg width="${w}" height="${h}"></svg>`;
    const max = Math.max.apply(null, data), min = Math.min.apply(null, data);
    const range = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return `<svg width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  };
  const RoleIcon = (CD.RoleIcon) || function (opts) {
    opts = opts || {};
    const map = { BAT: '🏏', BOWL: '🎯', AR: '⚡', WK: '🧤' };
    return `<span class="role-icon">${map[opts.role] || '•'}</span>`;
  };
  const BrandMark = (CD.BrandMark) || function (opts) {
    opts = opts || {};
    const size = opts.size || 28;
    return `<div class="brand-mark" style="width:${size}px;height:${size}px;border-radius:8px;background:linear-gradient(135deg,var(--electric),var(--pink));display:inline-block;"></div>`;
  };
  const Icon = (CD.Icon) || function (opts) {
    opts = opts || {};
    const size = opts.size || 16;
    const map = {
      home: '⌂', gavel: '⚖', user: '◯', users: '◎', trophy: '♔', cal: '▤',
      bell: '◐', search: '⌕', plus: '+', arrow: '→', back: '←', check: '✓',
      x: '✕', chart: '▥', swap: '⇄',
    };
    return `<span class="icon" style="font-size:${size}px;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;${opts.style || ''}">${map[opts.name] || '•'}</span>`;
  };
  const Ticker = (CD.Ticker) || function () {
    return `<div class="ticker" style="padding:8px 16px;border-bottom:1px solid var(--line);font-size:11px;color:var(--mute);font-family:var(--mono);">CSK 182/6 · MI 178/8 — CSK won · RCB 204/3 · KKR 206/4 — KKR won · GT 142/4 (12.4) — LIVE · RR vs PBKS — 19:30</div>`;
  };

  // Re-export the helpers in case a caller wants the same fallbacks
  CD.initialsOf = initialsOf;
  CD.Pill = Pill; CD.LiveDot = LiveDot; CD.TeamChip = TeamChip;
  CD.PlayerAvatar = PlayerAvatar; CD.Stat = Stat; CD.Sparkline = Sparkline;
  CD.RoleIcon = RoleIcon; CD.BrandMark = BrandMark; CD.Icon = Icon; CD.Ticker = Ticker;

  // ─── DESKTOP SHELL ─────────────────────────────────────
  CD.DesktopShell = function (data) {
    data = data || {};
    const children = data.children || '';
    const title = data.title || '';
    const subtitle = data.subtitle || '';
    const active = data.active || 'home';
    const rightSlot = data.rightSlot || '';
    const hideTicker = !!data.hideTicker;

    const NAV = [
      { id: 'home',    icon: 'home',   label: 'Rooms',   sub: 'Leagues & setup' },
      { id: 'auction', icon: 'gavel',  label: 'Auction', sub: 'Live · Ledger · Purses' },
      { id: 'myteam',  icon: 'user',   label: 'Squad',   sub: 'XI · Bench · Trades' },
      { id: 'leader',  icon: 'trophy', label: 'League',  sub: 'Ranks · Points · History' },
      { id: 'players', icon: 'users',  label: 'Players', sub: 'Pool · Stats · Form' },
      { id: 'matches', icon: 'cal',    label: 'Matches', sub: 'Schedule · Scorecards' },
    ];
    const SUBNAV = {
      auction: ['Live block', 'Bid ledger', 'Team purses'],
      myteam:  ['Playing XI', 'Bench', 'Trades'],
      leader:  ['Leaderboard', 'Gameweek points', 'History'],
      players: ['Pool', 'Analytics', 'Shortlists'],
      matches: ['Live & results', 'Schedule'],
      home:    ['All rooms', 'Invites'],
    };
    const activeSub = SUBNAV[active] || [];
    const parent = (active === 'purses' || active === 'ledger') ? 'auction'
                 : (active === 'points') ? 'leader'
                 : active;

    return `
      <div style="position:relative;width:100%;min-height:900px;overflow:hidden;background:var(--bg);color:var(--ink);">
        <div class="bcst-bg"></div>
        <div style="position:relative;z-index:1;display:grid;grid-template-columns:240px 1fr;min-height:900px;">
          <aside style="padding:24px 16px;border-right:1px solid var(--line);background:rgba(0,0,0,0.15);backdrop-filter:blur(12px);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;padding:0 6px;">
              ${BrandMark({ size: 32 })}
              <div>
                <div class="ed" style="font-size:20px;line-height:0.95;">Crick<span class="ed-i" style="color:var(--pink);">et</span></div>
                <div class="cap" style="font-size:9px;margin-top:2px;">Fantasy · '26</div>
              </div>
            </div>
            <div class="cap" style="padding:0 10px 10px;">Navigate</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              ${NAV.map(n => `
                <div class="side-item ${parent === n.id ? 'active' : ''}" style="align-items:flex-start;padding:10px 12px;">
                  ${Icon({ name: n.icon, size: 16, style: 'margin-top:2px;' })}
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-weight:600;">${n.label}</span>
                      ${n.id === 'auction' ? LiveDot() : ''}
                    </div>
                    <div style="font-size:10px;color:var(--mute);margin-top:1px;font-weight:400;">${n.sub}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top:24px;" class="glass">
              <div style="padding:14px;">
                <div class="cap" style="margin-bottom:8px;">My Purse</div>
                <div class="dsp" style="font-size:26px;color:var(--lime);">₹14.5<span style="font-size:14px;color:var(--mute);">cr</span></div>
                <div style="font-size:11px;color:var(--mute);margin-top:4px;">17 / 20 players</div>
              </div>
            </div>
          </aside>

          <main style="display:flex;flex-direction:column;min-width:0;">
            ${!hideTicker ? Ticker() : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 32px 0;border-bottom:1px solid var(--line);">
              <div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <h1 class="ed" style="font-size:36px;">${title}</h1>
                  ${subtitle ? `<div class="ed-i" style="font-size:28px;color:var(--mute);">${subtitle}</div>` : ''}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                ${rightSlot}
                <div class="glass" style="padding:6px 12px;display:flex;align-items:center;gap:8px;border-radius:var(--r-pill);">
                  ${PlayerAvatar({ code: 'MI', size: 28, initials: 'RS' })}
                  <div style="font-size:12px;">
                    <div style="font-weight:600;">Rohan S.</div>
                    <div style="color:var(--mute);font-size:10px;">Stadium Kings</div>
                  </div>
                </div>
                <button class="btn btn-ghost" style="padding:10px;">${Icon({ name: 'bell', size: 16 })}</button>
              </div>
            </div>
            ${activeSub.length > 0 ? `
              <div style="display:flex;gap:4px;padding:14px 32px 0;border-bottom:1px solid var(--line);">
                ${activeSub.map((s, i) => {
                  const isActive = i === 0
                    || (active === 'ledger' && s === 'Bid ledger')
                    || (active === 'purses' && s === 'Team purses')
                    || (active === 'points' && s === 'Gameweek points');
                  return `<div style="padding:10px 16px;font-size:12px;font-weight:600;color:${isActive ? 'var(--ink)' : 'var(--mute)'};border-bottom:${isActive ? '2px solid var(--electric)' : '2px solid transparent'};cursor:pointer;letter-spacing:0.02em;margin-bottom:-1px;">${s}</div>`;
                }).join('')}
              </div>
            ` : ''}
            <div style="padding:28px 32px 60px;flex:1;">
              ${children}
            </div>
          </main>
        </div>
      </div>
    `;
  };

  // ─── DESKTOP AUCTION LIVE ──────────────────────────────
  CD.DesktopAuctionLive = function (data) {
    data = data || {};
    const p = data.player || PLAYERS[0];
    const team = teamByCode(p.team);
    const currentBid = data.currentBid != null ? data.currentBid : 14.5;
    const timer = data.timer || '00:14';
    const leader = data.leader || 'KKR';
    const increments = data.increments || ['14.75', '15.00', '15.50', '16.00', '17.00', '18.00'];
    const bidders = data.bidders || [
      { t: 'KKR', team: 'Stadium Kings',   purse: 22.5, lead: true },
      { t: 'MI',  team: 'Sixers United',   purse: 18.0 },
      { t: 'CSK', team: 'Boundary Riders', purse: 28.8 },
      { t: 'GT',  team: 'Yorker Squad',    purse: 15.2, out: true },
      { t: 'RR',  team: 'Power Players',   purse: 12.0, out: true },
      { t: 'RCB', team: 'Wicket Warriors', purse: 8.5,  out: true },
    ];

    const firstName = p.name.split(' ')[0];
    const lastName = p.name.split(' ').slice(1).join(' ') || '';

    const inner = `
      <div style="position:relative;border-radius:var(--r-xl);overflow:hidden;background:radial-gradient(ellipse 80% 60% at 70% 20%, rgba(255,45,135,0.25), transparent 60%), radial-gradient(ellipse 90% 70% at 20% 80%, rgba(46,91,255,0.35), transparent 60%), linear-gradient(135deg, ${team.c1}20, ${team.c2}40);border:1px solid var(--line-2);box-shadow:var(--sh-2);padding:36px;min-height:440px;">
        <div style="position:absolute;top:-120px;left:30%;width:300px;height:600px;background:radial-gradient(ellipse at top, rgba(255,255,255,0.15), transparent 60%);transform:rotate(15deg);pointer-events:none;"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;position:relative;">
          <div style="display:flex;gap:10px;align-items:center;">
            ${Pill({ tone: 'pink', children: LiveDot() + ' ON THE BLOCK' })}
            ${Pill({ tone: 'gold', children: '★ CAPPED' })}
            ${Pill({ children: 'OVERSEAS · IN' })}
          </div>
          <div style="text-align:right;">
            <div class="cap">Time Remaining</div>
            <div class="dsp mono" style="font-size:36px;color:var(--lime);">${timer}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:center;position:relative;">
          <div>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
              ${PlayerAvatar({ code: p.team, size: 64, initials: initialsOf(p.name) })}
              <div>
                ${TeamChip({ code: p.team, label: `${p.team} · Royal Challengers` })}
                <div class="cap" style="margin-top:8px;color:var(--ink-2);">#18 · Batter · Right-hand</div>
              </div>
            </div>
            <div class="ed" style="font-size:86px;line-height:0.85;">
              ${firstName}
              <div class="ed-i" style="font-style:italic;font-weight:500;font-size:86px;color:var(--pink);">${lastName}</div>
            </div>
            <div style="display:flex;gap:20px;margin-top:24px;">
              <div><div class="cap">Matches</div><div class="dsp" style="font-size:24px;">237</div></div>
              <div><div class="cap">Runs</div><div class="dsp" style="font-size:24px;color:var(--lime);">7,263</div></div>
              <div><div class="cap">Avg</div><div class="dsp" style="font-size:24px;">38.6</div></div>
              <div><div class="cap">SR</div><div class="dsp" style="font-size:24px;">131.9</div></div>
              <div><div class="cap">Form</div>${Sparkline({ data: p.form || [], w: 80, h: 28 })}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="cap">Current Bid</div>
            <div class="dsp" style="font-size:110px;line-height:0.85;background:linear-gradient(180deg, #fff, var(--lime));-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 40px rgba(182,255,60,0.3));">
              <span style="font-family:var(--serif);font-size:52px;vertical-align:top;margin-right:4px;color:#fff;-webkit-text-fill-color:#fff;">₹</span>${currentBid}<span style="font-size:36px;color:var(--mute);-webkit-text-fill-color:var(--mute);">cr</span>
            </div>
            <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px;">
              ${TeamChip({ code: leader })}
              <span class="cap" style="letter-spacing:0.14em;">Leads</span>
            </div>
            <div style="font-size:12px;color:var(--mute);margin-top:6px;">Base ₹2.0cr · Previous ₹14.0cr (Stadium Kings)</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px;margin-top:20px;">
        <div class="glass-2" style="padding:24px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div class="cap">Bid Increments</div>
            <div style="font-size:12px;color:var(--mute);">Tap to raise · next ₹ +0.25cr</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:10px;">
            ${increments.map((v, i) => `
              <button class="btn" style="flex-direction:column;min-height:72px;padding:10px 6px;gap:2px;" onclick="window.CD_onBid && window.CD_onBid('${v}')">
                <span class="cap" style="font-size:9px;">+${(parseFloat(v) - currentBid).toFixed(2)}</span>
                <span class="dsp" style="font-size:22px;color:${i === 0 ? 'var(--lime)' : 'var(--ink)'};">₹${v}</span>
              </button>
            `).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
            <button class="btn btn-lime btn-lg" onclick="window.CD_onSold && window.CD_onSold()">${Icon({ name: 'check', size: 16 })} SOLD</button>
            <button class="btn btn-lg" style="background:rgba(255,59,59,0.18);border-color:rgba(255,59,59,0.4);color:var(--red);" onclick="window.CD_onPass && window.CD_onPass()">${Icon({ name: 'x', size: 16 })} Pass / Unsold</button>
          </div>
        </div>

        <div class="glass-2" style="padding:20px;">
          <div class="cap" style="margin-bottom:12px;">Live Bidders · ${bidders.length}</div>
          ${bidders.map(b => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);opacity:${b.out ? 0.4 : 1};">
              ${TeamChip({ code: b.t })}
              <div style="flex:1;font-size:13px;font-weight:500;">${b.team}</div>
              <div style="font-family:var(--mono);font-size:12px;color:${b.out ? 'var(--mute)' : 'var(--lime)'};">₹${b.purse}cr</div>
              ${b.lead ? Pill({ tone: 'lime', style: 'font-size:9px;padding:2px 6px;', children: 'LEAD' }) : ''}
              ${b.out ? Pill({ style: 'font-size:9px;padding:2px 6px;', children: 'PASS' }) : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    return CD.DesktopShell({
      active: 'auction',
      title: 'Live',
      subtitle: 'auction',
      rightSlot: `<div style="display:flex;align-items:center;gap:8px;">${Pill({ tone: 'pink', children: LiveDot() + ' ROUND 4 · MARQUEE' })}${Pill({ tone: 'lime', children: '◆ 38 OF 220' })}</div>`,
      children: inner,
    });
  };

  // ─── DESKTOP ROOMS / DASHBOARD ─────────────────────────
  CD.DesktopRooms = function (data) {
    data = data || {};
    const rooms = data.rooms || [
      { name: 'Office League',  members: 6, max: 6, status: 'AUCTION LIVE',  tone: 'pink',     live: true },
      { name: 'College Crew',   members: 4, max: 6, status: 'WAITING',       tone: 'gold' },
      { name: 'Family Fantasy', members: 8, max: 8, status: 'SEASON · WK 3', tone: 'lime' },
      { name: 'Sunday Gang',    members: 5, max: 6, status: 'SETUP',         tone: 'electric' },
      { name: 'Neighbours',     members: 3, max: 4, status: 'WAITING',       tone: 'gold' },
      { name: 'Cousins XI',     members: 6, max: 6, status: 'SEASON · WK 2', tone: 'lime' },
    ];

    const inner = `
      <div class="glass-2" style="padding:28px;margin-bottom:24px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;right:0;bottom:0;width:50%;background:radial-gradient(ellipse at right, rgba(255,45,135,0.2), transparent 60%);pointer-events:none;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;position:relative;">
          <div>
            ${Pill({ tone: 'pink', children: LiveDot() + ' LIVE · ROUND 4 ACTIVE' })}
            <div class="ed" style="font-size:42px;margin-top:12px;">Office <span class="ed-i" style="color:var(--electric);">League</span></div>
            <div style="font-size:13px;color:var(--mute);margin-top:6px;">6 teams · 220 players in pool · ₹100cr purse · Marquee round</div>
          </div>
          <button class="btn btn-pink btn-lg" onclick="window.CD_enterAuction && window.CD_enterAuction()">Enter Auction ${Icon({ name: 'arrow', size: 14 })}</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:14px;margin-top:24px;">
          ${Stat({ val: '220', lbl: 'Players', accent: 'var(--electric)' })}
          ${Stat({ val: '38',  lbl: 'Sold',    accent: 'var(--lime)' })}
          ${Stat({ val: '4',   lbl: 'Unsold',  accent: 'var(--pink)' })}
          ${Stat({ val: '6/6', lbl: 'Teams Joined', accent: 'var(--gold)' })}
          ${Stat({ val: '₹412cr', lbl: 'Total Spent' })}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
        <div class="ed" style="font-size:24px;">Active rooms</div>
        <div style="display:flex;gap:8px;">
          ${Pill({ children: '4 Hosted' })}
          ${Pill({ tone: 'electric', children: '3 Joined' })}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:14px;">
        ${rooms.map((r, i) => `
          <div class="glass" style="padding:20px;cursor:pointer;" onclick="window.CD_openRoom && window.CD_openRoom('${r.name}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
              <div>
                <div class="ed" style="font-size:22px;line-height:1;">${r.name}</div>
                <div style="font-size:11px;color:var(--mute);margin-top:4px;">#ID-AB${1000 + i}</div>
              </div>
              ${Pill({ tone: r.tone, children: (r.live ? LiveDot() + ' ' : '') + r.status })}
            </div>
            <div style="display:flex;gap:-8px;margin-bottom:14px;">
              ${TEAMS.slice(0, r.members).map((t, j) => `
                <div style="margin-left:${j === 0 ? 0 : -8}px;border:2px solid var(--bg-2);border-radius:50%;">
                  ${PlayerAvatar({ code: t.code, size: 26, initials: t.code.slice(0, 2) })}
                </div>
              `).join('')}
              <div style="display:flex;align-items:center;margin-left:8px;font-size:11px;color:var(--mute);">${r.members}/${r.max}</div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mute);">
              <span>Round 4 · Marquee</span>
              <span style="color:var(--ink);">→</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return CD.DesktopShell({
      active: 'home',
      title: 'My',
      subtitle: 'rooms',
      rightSlot: `<button class="btn btn-primary" onclick="window.CD_newRoom && window.CD_newRoom()">${Icon({ name: 'plus', size: 14 })} New Room</button>`,
      children: inner,
    });
  };

  // ─── DESKTOP LEADERBOARD ───────────────────────────────
  CD.DesktopLeaderboard = function (data) {
    data = data || {};
    const lb = data.leaderboard || LEADERBOARD;
    const podiumDef = [
      { rank: 2, color: '#D0D0D8', glow: 'rgba(208,208,216,0.5)', height: 160, label: 'RUNNER-UP' },
      { rank: 1, color: '#FFC83D', glow: 'rgba(255,200,61,0.6)',  height: 220, label: 'CHAMPION' },
      { rank: 3, color: '#CD7F32', glow: 'rgba(205,127,50,0.5)',  height: 120, label: 'THIRD' },
    ];

    const inner = `
      <div style="position:relative;padding:20px 20px 0;background:radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,200,61,0.18), transparent 65%), radial-gradient(ellipse 60% 80% at 50% 100%, rgba(46,91,255,0.12), transparent 70%);border-radius:var(--r-lg);border:1px solid var(--line-2);margin-bottom:24px;overflow:hidden;">
        <div class="scorecard-grid" style="position:absolute;inset:0;opacity:0.15;pointer-events:none;"></div>
        <div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:400px;height:200px;background:radial-gradient(ellipse at top, rgba(255,200,61,0.25), transparent 70%);pointer-events:none;"></div>

        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:16px;position:relative;">
          ${Pill({ tone: 'gold', children: '🏆 SEASON STANDINGS · WK 8' })}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:20px;align-items:end;padding:20px 40px 0;position:relative;">
          ${podiumDef.map(pos => {
            const t = lb[pos.rank - 1] || {};
            const team = TEAMS[pos.rank - 1] || TEAMS[0];
            return `
              <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="text-align:center;margin-bottom:16px;position:relative;">
                  ${pos.rank === 1 ? `<div style="font-size:36px;margin-bottom:4px;filter:drop-shadow(0 0 20px ${pos.glow});">👑</div>` : ''}
                  <div style="width:${pos.rank === 1 ? 92 : 72}px;height:${pos.rank === 1 ? 92 : 72}px;border-radius:50%;background:linear-gradient(135deg, ${team.c1}, ${team.c2});border:3px solid ${pos.color};box-shadow:0 0 0 4px rgba(0,0,0,0.5), 0 0 40px ${pos.glow}, inset 0 2px 8px rgba(255,255,255,0.2);margin:0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${pos.rank === 1 ? 30 : 22}px;font-family:var(--display);letter-spacing:0.04em;">${team.code.slice(0, 2)}</div>
                  <div class="cap" style="color:${pos.color};margin-top:12px;font-size:${pos.rank === 1 ? 10 : 9}px;">${pos.label}</div>
                  <div class="ed" style="font-size:${pos.rank === 1 ? 26 : 20}px;margin-top:4px;color:#fff;">${t.team || ''}</div>
                  <div style="font-size:11px;color:var(--mute);margin-top:2px;">@${t.owner || ''}</div>
                  <div style="margin-top:10px;display:inline-flex;align-items:baseline;gap:6px;padding:6px 14px;border-radius:var(--r-pill);background:linear-gradient(135deg, ${pos.color}, color-mix(in srgb, ${pos.color} 60%, #000));color:#000;font-weight:800;box-shadow:0 4px 16px ${pos.glow};">
                    <span class="dsp" style="font-size:${pos.rank === 1 ? 28 : 22}px;">${t.pts || 0}</span>
                    <span style="font-size:11px;opacity:0.7;">pts</span>
                  </div>
                  <div style="font-size:11px;color:var(--lime);margin-top:6px;font-weight:700;">${t.delta || ''} this week</div>
                </div>
                <div style="width:100%;height:${pos.height}px;position:relative;transform-style:preserve-3d;perspective:800px;">
                  <div style="position:absolute;inset:0;background:linear-gradient(180deg, color-mix(in srgb, ${pos.color} 30%, #1a1f2e) 0%, color-mix(in srgb, ${pos.color} 15%, #0a0e14) 100%);border:1px solid ${pos.color};border-bottom:none;border-radius:8px 8px 0 0;box-shadow:inset 0 0 40px rgba(0,0,0,0.4), 0 0 30px ${pos.glow};display:flex;align-items:center;justify-content:center;">
                    <div style="font-family:var(--serif);font-style:italic;font-weight:800;font-size:${pos.rank === 1 ? 140 : 110}px;color:${pos.color};opacity:0.9;line-height:1;text-shadow:0 0 40px ${pos.glow}, 0 4px 8px rgba(0,0,0,0.6);">${pos.rank}</div>
                    <div style="position:absolute;top:0;left:0;right:0;height:40%;background:linear-gradient(180deg, rgba(255,255,255,0.12), transparent);pointer-events:none;border-radius:8px 8px 0 0;"></div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="glass-2" style="overflow:hidden;">
        <div style="padding:14px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
          <div class="cap">Rest of the league</div>
          <div style="font-size:11px;color:var(--mute);">${lb.length - 3} teams</div>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:50px;">Rank</th>
              <th>Team</th>
              <th>Squad</th>
              <th>Purse Left</th>
              <th>This Week</th>
              <th style="text-align:right;">Points</th>
            </tr>
          </thead>
          <tbody>
            ${lb.slice(3).map((t, i) => `
              <tr>
                <td style="font-family:var(--display);font-size:18px;font-weight:800;color:var(--mute);">${String(i + 4).padStart(2, '0')}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    ${PlayerAvatar({ code: (TEAMS[i + 3] && TEAMS[i + 3].code) || 'MI', size: 32, initials: t.team.slice(0, 2) })}
                    <div>
                      <div style="font-weight:700;color:var(--ink);">${t.team}</div>
                      <div style="font-size:11px;color:var(--mute);">@${t.owner}</div>
                    </div>
                  </div>
                </td>
                <td>${t.players} players</td>
                <td><span class="mono" style="color:var(--lime);">₹${t.purse}cr</span></td>
                <td>${Pill({ tone: 'lime', children: t.delta })}</td>
                <td style="text-align:right;"><span class="dsp" style="font-size:20px;">${t.pts}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    return CD.DesktopShell({
      active: 'leader',
      title: 'Leader',
      subtitle: 'board',
      rightSlot: `<div style="display:flex;gap:8px;">${Pill({ children: 'Gameweek 8' })}<button class="btn btn-sm">${Icon({ name: 'chart', size: 12 })} Trend</button></div>`,
      children: inner,
    });
  };

  // ─── DESKTOP PLAYERS (Ledger) ──────────────────────────
  CD.DesktopPlayers = function (data) {
    data = data || {};
    const players = data.players || PLAYERS;
    const buyers = ['MI', 'KKR', 'CSK', 'RCB', 'PBKS', 'GT', 'RR', 'SRH'];

    const inner = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        ${['All Roles', 'Batter', 'Bowler', 'All-rounder', 'Keeper'].map((f, i) => Pill({ tone: i === 0 ? 'electric' : '', children: f })).join('')}
        <div style="flex:1;"></div>
        ${['Available', 'Sold', 'Unsold'].map((f, i) => Pill({ tone: ['lime', 'pink', 'gold'][i], children: '● ' + f + ' · ' + [182, 38, 4][i] })).join('')}
      </div>
      <div class="glass-2" style="overflow:hidden;">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Player</th>
              <th>IPL Team</th>
              <th>Role</th>
              <th>Type</th>
              <th>Base</th>
              <th>Status</th>
              <th>Sold</th>
              <th>Buyer</th>
            </tr>
          </thead>
          <tbody>
            ${players.map((p, i) => {
              const isSold = i < 8;
              const isUnsold = i === 10;
              return `
                <tr>
                  <td class="mono" style="color:var(--mute);">${String(i + 1).padStart(3, '0')}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${PlayerAvatar({ code: p.team, size: 28, initials: initialsOf(p.name) })}
                      <div>
                        <div style="font-weight:600;color:var(--ink);">${p.name}</div>
                        ${p.cap ? `<div style="font-size:10px;color:var(--gold);">★ CAPPED</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>${TeamChip({ code: p.team })}</td>
                  <td><div style="display:flex;gap:5px;align-items:center;color:var(--ink-2);">${RoleIcon({ role: p.role })} ${p.role}</div></td>
                  <td>${Pill({ tone: p.origin === 'OS' ? 'electric' : '', children: p.origin })}</td>
                  <td class="mono">₹${p.base}cr</td>
                  <td>${isSold ? Pill({ tone: 'lime', children: 'SOLD' }) : isUnsold ? Pill({ tone: 'red', children: 'UNSOLD' }) : Pill({ tone: 'gold', children: 'AVAILABLE' })}</td>
                  <td class="mono" style="color:${isSold ? 'var(--lime)' : 'var(--mute)'};">${isSold ? '₹' + p.sold + 'cr' : '—'}</td>
                  <td>${isSold ? TeamChip({ code: buyers[i % 8] }) : '<span style="color:var(--mute);">—</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    return CD.DesktopShell({
      active: 'ledger',
      title: 'Player',
      subtitle: 'ledger',
      rightSlot: `
        <div style="display:flex;gap:8px;">
          <div class="glass" style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--r-pill);">
            ${Icon({ name: 'search', size: 14 })}
            <input class="inp" style="border:none;background:transparent;padding:0;font-size:13px;width:160px;" placeholder="Search player or team..." />
          </div>
          <button class="btn btn-sm">↓ CSV</button>
        </div>
      `,
      children: inner,
    });
  };

  // ─── DESKTOP PURSES ────────────────────────────────────
  CD.DesktopPurses = function (data) {
    data = data || {};
    const lb = data.leaderboard || LEADERBOARD;

    const inner = `
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;">
        ${lb.map((t, i) => {
          const team = TEAMS[i] || TEAMS[0];
          const spent = 100 - t.purse;
          return `
            <div class="glass-2" style="padding:0;overflow:hidden;position:relative;">
              <div style="height:86px;background:linear-gradient(135deg, ${team.c1}, ${team.c2});position:relative;overflow:hidden;">
                <div class="scorecard-grid" style="position:absolute;inset:0;opacity:0.25;"></div>
                <div style="position:absolute;bottom:-20px;left:20px;display:flex;align-items:flex-end;gap:12px;">
                  ${PlayerAvatar({ code: team.code, size: 52, initials: team.code.slice(0, 2) })}
                </div>
                <div style="position:absolute;top:14px;right:16px;">
                  ${Pill({ style: 'background:rgba(0,0,0,0.35);border-color:rgba(255,255,255,0.2);color:#fff;', children: t.players + ' pl' })}
                </div>
              </div>
              <div style="padding:32px 20px 20px;">
                <div class="ed" style="font-size:22px;">${t.team}</div>
                <div style="font-size:12px;color:var(--mute);margin-top:2px;">@${t.owner}</div>
                <div style="margin-top:18px;">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
                    <div class="cap">Purse</div>
                    <div style="font-size:11px;color:var(--mute);">₹${spent.toFixed(1)}cr spent</div>
                  </div>
                  <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;">
                    <div style="width:${spent}%;height:100%;background:linear-gradient(90deg, ${team.c1}, ${team.c2});box-shadow:0 0 10px ${team.c1}80;"></div>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-top:16px;">
                  <div><div class="dsp" style="font-size:22px;color:var(--lime);">₹${t.purse}</div><div class="cap" style="font-size:9px;">Left</div></div>
                  <div><div class="dsp" style="font-size:22px;">${t.players}</div><div class="cap" style="font-size:9px;">Picked</div></div>
                  <div><div class="dsp" style="font-size:22px;color:var(--pink);">${6 - i}</div><div class="cap" style="font-size:9px;">Overseas</div></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    return CD.DesktopShell({
      active: 'purses',
      title: 'Team',
      subtitle: 'purses',
      rightSlot: Pill({ children: '6 / 6 REGISTERED' }),
      children: inner,
    });
  };

  // ─── DESKTOP MY TEAM (3D pitch) ────────────────────────
  CD.DesktopMyTeam = function (data) {
    data = data || {};
    const XI = data.xi || [
      { x: 50, y: 50, role: 'WK',   name: 'MS Dhoni',      team: 'CSK', cap: 'C',  pts: 124 },
      { x: 36, y: 44, role: 'BAT',  name: 'Virat Kohli',   team: 'RCB', cap: 'VC', pts:  89 },
      { x: 64, y: 44, role: 'BAT',  name: 'Sanju Samson',  team: 'RR',              pts:  62 },
      { x: 22, y: 32, role: 'BAT',  name: 'Shubman Gill',  team: 'GT',              pts:  78 },
      { x: 78, y: 32, role: 'AR',   name: 'Hardik Pandya', team: 'MI',              pts:  54 },
      { x: 50, y: 20, role: 'BAT',  name: 'T. Head',       team: 'SRH',             pts:  71 },
      { x: 86, y: 58, role: 'AR',   name: 'A. Russell',    team: 'KKR',             pts:  48 },
      { x: 14, y: 58, role: 'BAT',  name: 'S. Iyer',       team: 'PBKS',            pts:  42 },
      { x: 30, y: 76, role: 'BOWL', name: 'J. Bumrah',     team: 'MI',              pts:  66 },
      { x: 50, y: 84, role: 'BOWL', name: 'R. Khan',       team: 'GT',              pts:  58 },
      { x: 70, y: 76, role: 'BOWL', name: 'P. Cummins',    team: 'SRH',             pts:  44 },
    ];
    const totalPts = XI.reduce((a, b) => a + (b.pts || 0), 0);
    const bench = data.bench || MY_SQUAD;

    const inner = `
      <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div class="ed" style="font-size:24px;">Playing XI <span class="ed-i" style="color:var(--mute);">eleven</span></div>
            <div style="display:flex;gap:8px;align-items:center;">
              ${Pill({ tone: 'gold', children: '★ C · 2x' })}
              ${Pill({ tone: 'electric', children: 'VC · 1.5x' })}
              ${Pill({ children: '5/5 OS' })}
            </div>
          </div>

          <div style="position:relative;aspect-ratio:16/10;border-radius:var(--r-lg);overflow:hidden;perspective:1400px;background:linear-gradient(180deg, #0a1d0f 0%, #08140a 100%);box-shadow:var(--sh-2), inset 0 0 80px rgba(0,0,0,0.5);border:1px solid var(--line-2);margin-bottom:20px;">
            <div style="position:absolute;top:0;left:0;right:0;height:12%;background:linear-gradient(180deg, rgba(46,91,255,0.15), transparent);pointer-events:none;"></div>

            <div style="position:absolute;inset:0;transform:rotateX(42deg) scale(1.05) translateY(6%);transform-origin:50% 60%;transform-style:preserve-3d;">
              <div style="position:absolute;inset:8% 2% 2%;border-radius:50%;background:repeating-conic-gradient(from 0deg at 50% 50%, #1d5a2b 0deg 10deg, #1a4f26 10deg 20deg), radial-gradient(ellipse at 50% 40%, #2d7a3d 0%, #1a4f26 60%, #0d3318 100%);background-blend-mode:multiply;box-shadow:inset 0 0 120px rgba(0,0,0,0.6), 0 20px 60px rgba(0,0,0,0.6);"></div>
              <div style="position:absolute;inset:8% 2% 2%;border-radius:50%;border:3px solid rgba(255,255,255,0.85);box-shadow:0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.2);"></div>
              <div style="position:absolute;top:30%;left:22%;right:22%;bottom:18%;border-radius:50%;border:1.5px dashed rgba(255,255,255,0.4);"></div>
              <div style="position:absolute;top:46%;left:44%;width:12%;height:22%;background:linear-gradient(180deg, #c9b283 0%, #b8a072 50%, #a68d5e 100%);border:1.5px solid rgba(255,255,255,0.7);box-shadow:0 2px 6px rgba(0,0,0,0.4);">
                <div style="position:absolute;top:14%;left:0;right:0;height:2px;background:#fff;"></div>
                <div style="position:absolute;bottom:14%;left:0;right:0;height:2px;background:#fff;"></div>
                <div style="position:absolute;top:14%;left:50%;transform:translateX(-50%);width:14px;height:3px;background:#e8e8d8;"></div>
                <div style="position:absolute;bottom:14%;left:50%;transform:translateX(-50%);width:14px;height:3px;background:#e8e8d8;"></div>
              </div>
              <div style="position:absolute;inset:8% 2% 2%;border-radius:50%;background:radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.12), transparent 60%);pointer-events:none;"></div>
            </div>

            ${XI.map((p) => {
              const team = teamByCode(p.team);
              const ringBorder = p.cap === 'C' ? '2.5px solid var(--gold)' : p.cap === 'VC' ? '2.5px solid var(--electric)' : '2px solid rgba(255,255,255,0.25)';
              const capGlow = p.cap === 'C' ? ', 0 0 20px rgba(255,200,61,0.5)' : p.cap === 'VC' ? ', 0 0 20px rgba(46,91,255,0.5)' : '';
              return `
                <div style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%, -50%);text-align:center;z-index:${Math.floor(p.y)};">
                  <div style="position:absolute;left:50%;top:100%;transform:translate(-50%, -2px);width:38px;height:8px;background:radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%);filter:blur(2px);pointer-events:none;"></div>
                  <div style="position:relative;display:inline-block;">
                    <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg, ${team.c1}, ${team.c2});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;border:${ringBorder};box-shadow:0 4px 12px rgba(0,0,0,0.5), 0 0 0 3px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.25)${capGlow};font-family:var(--display);letter-spacing:0.02em;">${initialsOf(p.name)}</div>
                    ${p.cap ? `
                      <div style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:${p.cap === 'C' ? 'var(--gold)' : 'var(--electric)'};color:${p.cap === 'C' ? '#000' : '#fff'};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #08140a;box-shadow:0 2px 6px rgba(0,0,0,0.5);">${p.cap}</div>
                    ` : ''}
                    <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);font-size:7px;font-family:var(--display);letter-spacing:0.08em;background:${team.c1};color:#fff;padding:1px 5px;border-radius:3px;border:1px solid rgba(0,0,0,0.3);">${p.role}</div>
                  </div>
                  <div style="font-size:10px;color:#fff;font-weight:700;margin-top:10px;text-shadow:0 1px 4px rgba(0,0,0,0.9);white-space:nowrap;font-family:var(--display);letter-spacing:0.04em;">${p.name.split(' ').slice(-1)[0].toUpperCase()}</div>
                  <div style="margin-top:3px;display:inline-flex;align-items:center;gap:3px;background:${p.pts >= 80 ? 'linear-gradient(180deg, var(--lime), #9ae02e)' : 'rgba(0,0,0,0.7)'};color:${p.pts >= 80 ? '#08140a' : 'var(--lime)'};padding:2px 7px;border-radius:10px;font-size:11px;font-weight:800;font-family:var(--display);box-shadow:${p.pts >= 80 ? '0 0 12px rgba(182,255,60,0.5)' : '0 1px 3px rgba(0,0,0,0.5)'};border:${p.pts >= 80 ? 'none' : '1px solid rgba(182,255,60,0.3)'};">
                    ${p.cap === 'C' ? '<span>★</span>' : ''}
                    ${p.pts}
                    ${p.cap === 'C' ? '<span style="font-size:8px;opacity:0.7;">×2</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}

            <div style="position:absolute;top:16px;left:16px;display:flex;gap:8px;z-index:100;">
              ${Pill({ tone: 'lime', children: '● XI LIVE' })}
              ${Pill({ children: 'GW 8' })}
            </div>
            <div style="position:absolute;top:16px;right:16px;z-index:100;padding:8px 14px;border-radius:var(--r);background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(8px);">
              <div class="cap" style="font-size:8px;color:rgba(255,255,255,0.6);">Live total</div>
              <div class="dsp" style="font-size:22px;color:var(--lime);line-height:1;">${totalPts}</div>
            </div>
          </div>

          <div class="glass-2" style="padding:14px;margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-sm">${Icon({ name: 'swap', size: 13 })} Swap positions</button>
            <button class="btn btn-sm" style="color:var(--gold);">★ Change captain</button>
            <button class="btn btn-sm" style="color:var(--electric);">◆ Change vice-captain</button>
            <button class="btn btn-sm">↓ Move to bench</button>
            <button class="btn btn-sm">↑ Promote from bench</button>
            <div style="flex:1;"></div>
            <button class="btn btn-sm">${Icon({ name: 'swap', size: 13 })} Auto-optimize</button>
          </div>

          <div class="ed" style="font-size:24px;margin-bottom:12px;">Bench <span class="ed-i" style="color:var(--mute);">& reserves</span></div>
          <div class="glass-2" style="padding:0;overflow:hidden;">
            ${bench.slice(0, 6).map((p, i) => `
              <div style="display:grid;grid-template-columns:40px 1fr 100px 80px 70px 120px;align-items:center;gap:14px;padding:12px 20px;border-bottom:${i < 5 ? '1px solid var(--line)' : 'none'};">
                ${PlayerAvatar({ code: p.team, size: 36, initials: initialsOf(p.name) })}
                <div>
                  <div style="font-weight:600;">${p.name}</div>
                  <div style="font-size:11px;color:var(--mute);display:flex;gap:8px;align-items:center;">
                    ${TeamChip({ code: p.team })}
                    <span>·</span>
                    <span>${p.role}</span>
                  </div>
                </div>
                ${Sparkline({ data: p.form || [], w: 80, h: 20 })}
                <div class="mono" style="text-align:right;color:var(--mute);">₹${p.sold}cr</div>
                <div class="dsp" style="font-size:20px;text-align:right;color:var(--lime);">${Math.floor(30 + Math.random() * 50)}</div>
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                  <button class="btn btn-sm" style="padding:6px 10px;font-size:11px;" title="Promote to XI">↑ XI</button>
                  <button class="btn btn-sm" style="padding:6px 10px;font-size:11px;color:var(--gold);" title="Make captain">★</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="glass-2" style="padding:20px;margin-bottom:16px;">
            <div class="cap">Team Snapshot</div>
            <div class="ed" style="font-size:28px;margin-top:6px;">Stadium Kings</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px;">
              ${Stat({ val: '1,842', lbl: 'Total points', accent: 'var(--electric)' })}
              ${Stat({ val: '#1', lbl: 'Rank', accent: 'var(--gold)' })}
              ${Stat({ val: '₹3.2cr', lbl: 'Purse left', accent: 'var(--lime)' })}
              ${Stat({ val: '17', lbl: 'Squad size' })}
              ${Stat({ val: '5/8', lbl: 'Overseas', accent: 'var(--pink)' })}
              ${Stat({ val: '+124', lbl: 'This week', accent: 'var(--lime)' })}
            </div>
          </div>
          <div class="glass-2" style="padding:20px;">
            <div class="cap" style="margin-bottom:12px;">Captain multipliers</div>
            <div style="display:flex;gap:12px;align-items:center;padding:14px;border-radius:var(--r);background:linear-gradient(135deg, rgba(255,200,61,0.18), rgba(255,200,61,0.04));border:1px solid rgba(255,200,61,0.3);margin-bottom:10px;">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--gold);color:#000;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 0 20px rgba(255,200,61,0.5);">C</div>
              ${PlayerAvatar({ code: 'CSK', size: 36, initials: 'MS' })}
              <div style="flex:1;">
                <div style="font-weight:700;">MS Dhoni</div>
                <div style="font-size:11px;color:var(--gold);">Captain · 2× multiplier</div>
              </div>
              <div class="dsp" style="font-size:24px;color:var(--gold);">248</div>
            </div>
            <div style="display:flex;gap:12px;align-items:center;padding:14px;border-radius:var(--r);background:linear-gradient(135deg, rgba(46,91,255,0.18), rgba(46,91,255,0.04));border:1px solid rgba(46,91,255,0.3);">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--electric);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">VC</div>
              ${PlayerAvatar({ code: 'RCB', size: 36, initials: 'VK' })}
              <div style="flex:1;">
                <div style="font-weight:700;">Virat Kohli</div>
                <div style="font-size:11px;color:var(--electric);">Vice-captain · 1.5× multiplier</div>
              </div>
              <div class="dsp" style="font-size:24px;color:var(--electric);">134</div>
            </div>
          </div>
        </div>
      </div>
    `;

    return CD.DesktopShell({
      active: 'myteam',
      title: 'My',
      subtitle: 'squad',
      rightSlot: `<div style="display:flex;gap:8px;">${Pill({ tone: 'lime', children: 'XI LOCKED' })}<button class="btn btn-primary btn-sm">Save Lineup</button></div>`,
      children: inner,
    });
  };

  // ─── DESKTOP MATCHES ───────────────────────────────────
  CD.DesktopMatches = function (data) {
    data = data || {};
    const matches = data.matches || MATCHES;
    const teamA = TEAMS[5] || TEAMS[0];
    const teamB = TEAMS[7] || TEAMS[1];

    const inner = `
      <div class="glass-2" style="padding:0;margin-bottom:20px;overflow:hidden;position:relative;">
        <div style="padding:28px 32px;background:radial-gradient(ellipse 60% 80% at 15% 50%, ${teamA.c1}30, transparent 60%), radial-gradient(ellipse 60% 80% at 85% 50%, ${teamB.c1}30, transparent 60%);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">
            ${Pill({ tone: 'pink', children: LiveDot() + ' LIVE · 2ND INNINGS · OVER 12.4' })}
            <div style="font-size:12px;color:var(--mute);">Narendra Modi Stadium · Ahmedabad</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:40px;">
            <div style="text-align:center;">
              ${PlayerAvatar({ code: 'GT', size: 72, initials: 'GT' })}
              <div class="ed" style="font-size:32px;margin-top:10px;">Gujarat</div>
              <div class="dsp mono" style="font-size:44px;color:var(--lime);margin-top:6px;">142/4</div>
              <div style="font-size:12px;color:var(--mute);">12.4 ov · RR 11.2</div>
            </div>
            <div style="text-align:center;">
              <div class="ed-i" style="font-size:36px;color:var(--mute);">vs</div>
              <div class="cap" style="margin-top:6px;">Target</div>
              <div class="dsp" style="font-size:28px;">181</div>
              <div style="font-size:11px;color:var(--pink);margin-top:4px;">39 runs · 44 balls</div>
            </div>
            <div style="text-align:center;">
              ${PlayerAvatar({ code: 'SRH', size: 72, initials: 'SRH' })}
              <div class="ed" style="font-size:32px;margin-top:10px;">Hyderabad</div>
              <div class="dsp mono" style="font-size:44px;color:var(--mute);margin-top:6px;">180/7</div>
              <div style="font-size:12px;color:var(--mute);">20 ov · RR 9.0</div>
            </div>
          </div>
        </div>
        <div style="padding:16px 32px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.15);">
          <div style="display:flex;gap:24px;">
            <div><div class="cap">Striker</div><div style="font-weight:600;margin-top:2px;">Shubman Gill <span style="color:var(--lime);">58*</span> <span style="color:var(--mute);font-size:11px;">(34)</span></div></div>
            <div><div class="cap">Non-striker</div><div style="font-weight:600;margin-top:2px;">D. Miller <span style="color:var(--lime);">23*</span> <span style="color:var(--mute);font-size:11px;">(18)</span></div></div>
            <div><div class="cap">Bowling</div><div style="font-weight:600;margin-top:2px;">P. Cummins <span style="color:var(--mute);font-size:11px;">2/28 (3)</span></div></div>
          </div>
          <button class="btn btn-pink btn-sm">Open scorecard ${Icon({ name: 'arrow', size: 12 })}</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        ${matches.map(m => `
          <div class="glass" style="padding:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
              <div style="font-size:11px;color:var(--mute);">${m.date} · ${m.venue} · ${m.time}</div>
              ${m.live
                ? Pill({ tone: 'pink', children: LiveDot() + ' LIVE' })
                : m.upcoming
                  ? Pill({ tone: 'gold', children: 'UPCOMING' })
                  : Pill({ tone: 'lime', children: 'RESULT' })}
            </div>
            <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;">
              <div style="text-align:right;display:flex;justify-content:flex-end;align-items:center;gap:10px;">
                <div>
                  <div class="ed" style="font-size:18px;">${m.a}</div>
                  ${m.aScore && m.aScore !== '-' ? `<div class="mono" style="font-size:14px;color:var(--lime);margin-top:2px;">${m.aScore}</div>` : ''}
                </div>
                ${PlayerAvatar({ code: m.a, size: 36, initials: m.a.slice(0, 2) })}
              </div>
              <div class="ed-i" style="font-size:20px;color:var(--mute);">vs</div>
              <div style="display:flex;align-items:center;gap:10px;">
                ${PlayerAvatar({ code: m.b, size: 36, initials: m.b.slice(0, 2) })}
                <div>
                  <div class="ed" style="font-size:18px;">${m.b}</div>
                  ${m.bScore && m.bScore !== '-' ? `<div class="mono" style="font-size:14px;color:var(--mute);margin-top:2px;">${m.bScore}</div>` : ''}
                </div>
              </div>
            </div>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:${m.live ? 'var(--pink)' : 'var(--ink-2)'};font-weight:500;">
              ${m.status}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return CD.DesktopShell({
      active: 'matches',
      title: 'Matches',
      subtitle: '& scorecards',
      rightSlot: Pill({ tone: 'pink', children: LiveDot() + ' 1 LIVE · 2 TODAY' }),
      children: inner,
    });
  };

  // ─── DESKTOP AUTH ──────────────────────────────────────
  CD.DesktopAuth = function (data) {
    data = data || {};
    const email = data.email || 'rohan@stadiumkings.in';

    return `
      <div style="position:relative;width:100%;min-height:900px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg);">
        <div class="bcst-bg"></div>
        <div style="position:absolute;top:0;left:0;right:0;z-index:2;">${Ticker()}</div>

        <div style="position:relative;z-index:1;display:grid;grid-template-columns:1fr 440px;gap:60px;max-width:1100px;width:100%;padding:60px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:40px;">
              ${BrandMark({ size: 44 })}
              <div class="dsp" style="font-size:22px;letter-spacing:0.12em;">CRICKET · FANTASY</div>
            </div>
            <div class="cap" style="margin-bottom:18px;">Season 2026 · Private league</div>
            <h1 class="ed" style="font-size:104px;line-height:0.88;margin-bottom:16px;">
              Bid bold.
              <div class="ed-i" style="color:var(--pink);font-size:104px;">Win bolder.</div>
            </h1>
            <p style="font-size:18px;color:var(--ink-2);max-width:500px;line-height:1.5;margin-bottom:32px;">
              Private fantasy auctions for your crew. Bid live. Build squads. Track points across the season — all with broadcast-grade scoring.
            </p>
            <div style="display:flex;gap:20px;margin-top:40px;">
              <div><div class="dsp" style="font-size:40px;color:var(--lime);">220</div><div class="cap">Players</div></div>
              <div><div class="dsp" style="font-size:40px;color:var(--electric);">74</div><div class="cap">Matches</div></div>
              <div><div class="dsp" style="font-size:40px;color:var(--pink);">10</div><div class="cap">Teams</div></div>
            </div>
          </div>

          <div class="glass-2" style="padding:36px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg, var(--electric), var(--pink), var(--lime));"></div>
            <div class="cap">Sign in</div>
            <div class="ed" style="font-size:36px;margin-top:6px;margin-bottom:24px;">Welcome <span class="ed-i" style="color:var(--electric);">back</span></div>
            <div style="margin-bottom:16px;">
              <div class="lbl">Email</div>
              <input class="inp" id="cd-auth-email" value="${email}" />
            </div>
            <div style="margin-bottom:20px;">
              <div class="lbl">Password</div>
              <input class="inp" id="cd-auth-pass" type="password" value="••••••••••" />
            </div>
            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="window.CD_signIn && window.CD_signIn()">Sign in ${Icon({ name: 'arrow', size: 14 })}</button>
            <div style="display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--mute);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">
              <div style="flex:1;height:1px;background:var(--line);"></div> or <div style="flex:1;height:1px;background:var(--line);"></div>
            </div>
            <button class="btn btn-lg" style="width:100%;background:#fff;color:#111;" onclick="window.CD_googleSignIn && window.CD_googleSignIn()">
              <span style="font-size:14px;">G</span> Continue with Google
            </button>
            <div style="text-align:center;margin-top:24px;font-size:12px;color:var(--mute);">
              New here? <span style="color:var(--electric);font-weight:600;cursor:pointer;" onclick="window.CD_createAccount && window.CD_createAccount()">Create an account</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // ─── DESKTOP POINTS / SCORECARD ENTRY ──────────────────
  CD.DesktopPoints = function (data) {
    data = data || {};
    const recents = data.recents || [
      { match: 'CSK vs MI',  date: 'Apr 12', winner: 'CSK', motm: 'R. Jadeja',
        top: [['R. Jadeja', 'CSK', 124], ['S. Gaikwad', 'CSK', 87], ['R. Sharma', 'MI', 58]] },
      { match: 'RCB vs KKR', date: 'Apr 13', winner: 'KKR', motm: 'A. Russell',
        top: [['A. Russell', 'KKR', 112], ['V. Kohli', 'RCB', 89], ['S. Iyer', 'KKR', 76]] },
    ];

    const inner = `
      <div class="glass-2" style="padding:24px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div class="cap">Scorecard entry · Gemini AI</div>
            <div class="ed" style="font-size:26px;margin-top:4px;">Drop screenshots. <span class="ed-i" style="color:var(--pink);">We parse.</span></div>
          </div>
          ${Pill({ tone: 'electric', children: '✦ Firebase AI' })}
        </div>
        <div style="border:1.5px dashed var(--line-3);border-radius:var(--r);padding:40px;text-align:center;background:rgba(46,91,255,0.04);">
          <div style="font-size:32px;margin-bottom:8px;">◉</div>
          <div style="font-weight:600;margin-bottom:4px;">Click or drag 1–4 scorecard screenshots</div>
          <div style="font-size:12px;color:var(--mute);">PNG · JPG · WEBP · up to 4 files</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <input class="inp" placeholder="Match label · e.g. CSK vs MI · Apr 12" style="flex:1;" />
          <button class="btn btn-pink" onclick="window.CD_parseScorecard && window.CD_parseScorecard()">✦ Parse with Gemini</button>
        </div>
      </div>

      <div class="ed" style="font-size:24px;margin-bottom:12px;">Recent <span class="ed-i" style="color:var(--mute);">fixtures</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
        ${recents.map(m => `
          <div class="glass" style="padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div class="ed" style="font-size:22px;">${m.match}</div>
              <div style="font-size:11px;color:var(--mute);">${m.date}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
              ${Pill({ tone: 'lime', children: 'WIN · ' + m.winner })}
              ${Pill({ tone: 'gold', children: '★ MOTM · ' + m.motm })}
            </div>
            <div class="cap" style="margin-bottom:8px;">Top scorers</div>
            ${m.top.map((p, j) => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:${j < m.top.length - 1 ? '1px solid var(--line)' : 'none'};">
                <div style="display:flex;align-items:center;gap:10px;">
                  ${TeamChip({ code: p[1] })}
                  <span style="font-weight:500;">${p[0]}</span>
                </div>
                <div class="dsp" style="font-size:18px;color:var(--lime);">${p[2]}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;

    return CD.DesktopShell({
      active: 'points',
      title: 'Points',
      subtitle: 'scorecard',
      rightSlot: `<div style="display:flex;gap:8px;">${Pill({ tone: 'electric', children: 'GW 8' })}<button class="btn btn-primary btn-sm">${Icon({ name: 'plus', size: 12 })} Enter Match</button></div>`,
      children: inner,
    });
  };

  // ═══════════════════════════════════════════════════════
  //                       MOBILE
  // ═══════════════════════════════════════════════════════

  CD.MobileShell = function (data) {
    data = data || {};
    const children = data.children || '';
    const title = data.title || '';
    const hideTab = !!data.hideTab;
    const active = data.active || 'home';
    const subTabs = data.subTabs || null;
    const activeSub = data.activeSub || null;

    const TABS = [
      { id: 'home',    icon: 'home',   label: 'Home' },
      { id: 'auction', icon: 'gavel',  label: 'Auction', live: true },
      { id: 'myteam',  icon: 'user',   label: 'Squad' },
      { id: 'league',  icon: 'trophy', label: 'League' },
    ];

    return `
      <div style="position:relative;width:100%;height:100%;background:var(--bg);color:var(--ink);overflow:hidden;display:flex;flex-direction:column;">
        <div class="bcst-bg"></div>
        <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;min-height:0;">
          ${title ? `
            <div style="padding:14px 20px 10px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);flex-shrink:0;">
              <div style="display:flex;align-items:center;gap:8px;">
                ${BrandMark({ size: 22 })}
                <div class="dsp" style="font-size:15px;letter-spacing:0.08em;">${title}</div>
              </div>
              <div style="display:flex;gap:8px;">
                ${Icon({ name: 'search', size: 18 })}
                ${Icon({ name: 'bell', size: 18 })}
              </div>
            </div>
          ` : ''}
          ${subTabs ? `
            <div style="padding:10px 14px 6px;flex-shrink:0;border-bottom:1px solid var(--line);">
              <div style="display:flex;gap:4px;padding:4px;border-radius:var(--r-pill);background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--line);">
                ${subTabs.map(st => {
                  const sel = activeSub === st.id;
                  return `<div style="flex:1;text-align:center;padding:7px 4px;font-size:10px;font-family:var(--display);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-radius:var(--r-pill);color:${sel ? '#fff' : 'var(--mute)'};background:${sel ? 'linear-gradient(180deg, var(--electric-2), var(--electric))' : 'transparent'};box-shadow:${sel ? '0 2px 10px rgba(46,91,255,0.4)' : 'none'};">${st.label}</div>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
          <div style="flex:1;overflow:auto;padding:14px 16px 14px;min-height:0;">${children}</div>
          ${!hideTab ? `
            <div style="padding:8px 14px 14px;flex-shrink:0;background:linear-gradient(to top, var(--bg), transparent);">
              <div class="glass-2" style="display:flex;padding:6px;border-radius:var(--r-pill);">
                ${TABS.map(t => {
                  const sel = active === t.id;
                  return `
                    <div style="flex:1;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;color:${sel ? '#fff' : 'var(--mute)'};background:${sel ? 'linear-gradient(180deg, var(--electric-2), var(--electric))' : 'transparent'};border-radius:var(--r-pill);position:relative;box-shadow:${sel ? '0 4px 14px rgba(46,91,255,0.45)' : 'none'};">
                      ${Icon({ name: t.icon, size: 16 })}
                      <div style="font-size:9px;font-weight:600;">${t.label}</div>
                      ${t.live ? '<div style="position:absolute;top:6px;right:30%;width:6px;height:6px;border-radius:50%;background:var(--pink);"></div>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  CD.MobileAuction = function (data) {
    data = data || {};
    const p = data.player || PLAYERS[0];
    const team = teamByCode(p.team);
    const currentBid = data.currentBid != null ? data.currentBid : 14.5;
    const timer = data.timer || '00:14';
    const increments = data.increments || ['14.75', '15.00', '15.50', '16.00', '17.00', '18.00'];
    const firstName = p.name.split(' ')[0];
    const lastName = p.name.split(' ').slice(1).join(' ') || '';

    const inner = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${Icon({ name: 'back', size: 18 })}
          <div>
            <div class="dsp" style="font-size:13px;letter-spacing:0.08em;">OFFICE LEAGUE</div>
            <div style="font-size:10px;color:var(--mute);">Round 4 · Marquee</div>
          </div>
        </div>
        ${Pill({ tone: 'pink', children: LiveDot() + ' LIVE' })}
      </div>

      <div class="glass-2" style="padding:20px;overflow:hidden;position:relative;background:linear-gradient(135deg, ${team.c1}25, ${team.c2}45), radial-gradient(ellipse at top right, rgba(255,45,135,0.25), transparent 60%);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          ${Pill({ tone: 'gold', children: '★ CAPPED' })}
          <div style="text-align:right;">
            <div class="cap" style="font-size:8px;">Timer</div>
            <div class="dsp mono" style="font-size:22px;color:var(--lime);">${timer}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          ${PlayerAvatar({ code: p.team, size: 52, initials: initialsOf(p.name) })}
          <div>
            ${TeamChip({ code: p.team })}
            <div class="cap" style="font-size:9px;margin-top:4px;">#18 · Batter</div>
          </div>
        </div>
        <div class="ed" style="font-size:46px;line-height:0.88;">${firstName}</div>
        <div class="ed-i" style="font-size:46px;color:var(--pink);line-height:0.88;">${lastName}</div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);">
          <div class="cap" style="font-size:9px;">Current Bid</div>
          <div class="dsp" style="font-size:58px;line-height:0.9;background:linear-gradient(180deg, #fff, var(--lime));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            <span style="font-size:28px;color:#fff;-webkit-text-fill-color:#fff;margin-right:2px;">₹</span>${currentBid}<span style="font-size:20px;color:var(--mute);-webkit-text-fill-color:var(--mute);">cr</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
            ${TeamChip({ code: 'KKR' })}
            <span class="cap" style="font-size:9px;">Leads</span>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-top:14px;">
        ${increments.map((v, i) => `
          <button class="btn" style="flex-direction:column;min-height:58px;padding:6px 2px;" onclick="window.CD_onBid && window.CD_onBid('${v}')">
            <span class="cap" style="font-size:8px;">+₹${(parseFloat(v) - currentBid).toFixed(2)}</span>
            <span class="dsp" style="font-size:16px;color:${i === 0 ? 'var(--lime)' : 'var(--ink)'};">₹${v}</span>
          </button>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <button class="btn btn-lime" onclick="window.CD_onSold && window.CD_onSold()">SOLD ✓</button>
        <button class="btn" style="background:rgba(255,59,59,0.18);border-color:rgba(255,59,59,0.4);color:var(--red);" onclick="window.CD_onPass && window.CD_onPass()">Pass</button>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px;" onclick="window.CD_notInterested && window.CD_notInterested()">Not interested</button>
    `;

    return CD.MobileShell({ active: 'auction', hideTab: true, children: inner });
  };

  CD.MobileHome = function (data) {
    data = data || {};
    const rooms = data.rooms || [
      { name: 'Office League',  status: 'LIVE',    tone: 'pink' },
      { name: 'Family Fantasy', status: 'WK 3',    tone: 'lime' },
      { name: 'College Crew',   status: 'WAITING', tone: 'gold' },
    ];

    const inner = `
      <div class="glass-2" style="padding:18px;margin-bottom:14px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at right, rgba(255,45,135,0.25), transparent 60%);pointer-events:none;"></div>
        ${Pill({ tone: 'pink', style: 'position:relative;', children: LiveDot() + ' AUCTION LIVE' })}
        <div class="ed" style="font-size:30px;margin-top:10px;position:relative;">Office <span class="ed-i" style="color:var(--electric);">League</span></div>
        <div style="font-size:11px;color:var(--mute);margin-top:4px;position:relative;">Round 4 · 38 of 220 sold</div>
        <button class="btn btn-pink" style="width:100%;margin-top:14px;position:relative;" onclick="window.CD_enterAuction && window.CD_enterAuction()">Enter Auction ${Icon({ name: 'arrow', size: 12 })}</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        ${Stat({ val: '#1', lbl: 'Rank', accent: 'var(--gold)' })}
        ${Stat({ val: '1,842', lbl: 'Points', accent: 'var(--electric)' })}
      </div>
      <div class="cap" style="margin-bottom:8px;">Your rooms</div>
      ${rooms.map((r, i) => {
        const t = TEAMS[i] || TEAMS[0];
        return `
          <div class="glass" style="padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;" onclick="window.CD_openRoom && window.CD_openRoom('${r.name}')">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, ${t.c1}, ${t.c2});"></div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:14px;">${r.name}</div>
              <div style="font-size:10px;color:var(--mute);">#ID-${1000 + i}</div>
            </div>
            ${Pill({ tone: r.tone, children: r.status })}
          </div>
        `;
      }).join('')}
    `;

    return CD.MobileShell({ title: 'CRICKET', active: 'home', children: inner });
  };

  // Sub-tab list reused by mobile league screens
  const LEAGUE_SUBTABS = [
    { id: 'ranks',   label: 'Ranks' },
    { id: 'points',  label: 'Points' },
    { id: 'matches', label: 'Matches' },
  ];
  CD.LEAGUE_SUBTABS = LEAGUE_SUBTABS;

  CD.MobileLeaderboard = function (data) {
    data = data || {};
    const lb = data.leaderboard || LEADERBOARD;

    const inner = `
      <div class="glass-2" style="padding:18px;margin-bottom:14px;background:linear-gradient(135deg, rgba(255,200,61,0.2), rgba(255,45,135,0.1));position:relative;overflow:hidden;">
        <div style="position:absolute;top:-10px;right:-10px;font-family:var(--serif);font-size:110px;font-weight:800;color:var(--gold);opacity:0.15;line-height:0.8;">1</div>
        <div class="cap" style="color:var(--gold);">★ Champion</div>
        <div class="ed" style="font-size:26px;margin-top:6px;">${(lb[0] && lb[0].team) || 'Stadium Kings'}</div>
        <div style="font-size:11px;color:var(--mute);">@${(lb[0] && lb[0].owner) || 'priya.k'}</div>
        <div class="dsp" style="font-size:38px;margin-top:10px;">${(lb[0] && lb[0].pts) || '1,842'} <span style="font-size:13px;color:var(--lime);">${(lb[0] && lb[0].delta) || '+124'}</span></div>
      </div>
      ${lb.slice(1).map((t, i) => {
        const team = TEAMS[i + 1] || TEAMS[0];
        return `
          <div class="glass" style="padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <div class="dsp" style="font-size:18px;color:var(--mute);width:24px;">${String(i + 2).padStart(2, '0')}</div>
            ${PlayerAvatar({ code: team.code, size: 30, initials: t.team.slice(0, 2) })}
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;">${t.team}</div>
              <div style="font-size:10px;color:var(--mute);">@${t.owner} · ${t.players} pl</div>
            </div>
            <div style="text-align:right;">
              <div class="dsp" style="font-size:18px;">${t.pts}</div>
              <div style="font-size:10px;color:var(--lime);">${t.delta}</div>
            </div>
          </div>
        `;
      }).join('')}
    `;

    return CD.MobileShell({ title: 'LEAGUE', active: 'league', subTabs: LEAGUE_SUBTABS, activeSub: 'ranks', children: inner });
  };
  // Alias used by the prompt's MobileLeague request
  CD.MobileLeague = CD.MobileLeaderboard;

  CD.MobileSquad = function (data) {
    data = data || {};
    const squad = data.squad || MY_SQUAD;

    const inner = `
      <div class="glass-2" style="padding:16px;margin-bottom:14px;">
        <div class="cap">Stadium Kings</div>
        <div class="ed" style="font-size:24px;margin-top:4px;">Playing XI <span class="ed-i" style="color:var(--mute);">locked</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;">
          <div><div class="dsp" style="font-size:20px;color:var(--lime);">17</div><div class="cap" style="font-size:8px;">Squad</div></div>
          <div><div class="dsp" style="font-size:20px;color:var(--pink);">5/8</div><div class="cap" style="font-size:8px;">Overseas</div></div>
          <div><div class="dsp" style="font-size:20px;color:var(--gold);">₹3.2</div><div class="cap" style="font-size:8px;">Purse</div></div>
        </div>
      </div>
      ${squad.map((p, i) => `
        <div class="glass" style="padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
          ${PlayerAvatar({ code: p.team, size: 36, initials: initialsOf(p.name) })}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}${i === 0 ? '<span style="color:var(--gold);margin-left:6px;font-size:10px;">C</span>' : ''}</div>
            <div style="font-size:10px;color:var(--mute);display:flex;gap:4px;align-items:center;">${TeamChip({ code: p.team })} · ${p.role}</div>
          </div>
          <div style="text-align:right;">
            <div class="dsp" style="font-size:16px;color:var(--lime);">${Math.floor(Math.random() * 140 + 40)}</div>
            <div style="font-size:9px;color:var(--mute);">₹${p.sold}cr</div>
          </div>
        </div>
      `).join('')}
    `;

    return CD.MobileShell({ title: 'SQUAD', active: 'myteam', children: inner });
  };
  // Alias from the JSX original
  CD.MobileMyTeam = CD.MobileSquad;

  CD.MobileMatches = function (data) {
    data = data || {};
    const matches = data.matches || MATCHES;
    const teamA = TEAMS[5] || TEAMS[0];
    const teamB = TEAMS[7] || TEAMS[1];

    const inner = `
      <div class="glass-2" style="padding:16px;margin-bottom:14px;background:radial-gradient(ellipse at left, ${teamA.c1}30, transparent 60%), radial-gradient(ellipse at right, ${teamB.c1}30, transparent 60%);">
        ${Pill({ tone: 'pink', children: LiveDot() + ' LIVE · OVER 12.4' })}
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:14px;">
          <div style="text-align:center;">
            ${PlayerAvatar({ code: 'GT', size: 40, initials: 'GT' })}
            <div class="ed" style="font-size:16px;margin-top:4px;">GT</div>
            <div class="dsp mono" style="font-size:22px;color:var(--lime);">142/4</div>
            <div style="font-size:9px;color:var(--mute);">12.4 ov</div>
          </div>
          <div class="ed-i" style="font-size:18px;color:var(--mute);">vs</div>
          <div style="text-align:center;">
            ${PlayerAvatar({ code: 'SRH', size: 40, initials: 'SRH' })}
            <div class="ed" style="font-size:16px;margin-top:4px;">SRH</div>
            <div class="dsp mono" style="font-size:22px;color:var(--mute);">180/7</div>
            <div style="font-size:9px;color:var(--mute);">20 ov</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--pink);text-align:center;margin-top:12px;font-weight:500;">GT need 39 from 44 balls</div>
      </div>
      ${matches.slice(0, 4).map(m => `
        <div class="glass" style="padding:12px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:10px;color:var(--mute);">${m.date} · ${m.time}</div>
            ${m.live ? Pill({ tone: 'pink', children: LiveDot() + 'LIVE' })
              : m.upcoming ? Pill({ tone: 'gold', children: 'SOON' })
              : Pill({ tone: 'lime', children: 'DONE' })}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${PlayerAvatar({ code: m.a, size: 28, initials: m.a.slice(0, 2) })}
              <div>
                <div class="ed" style="font-size:15px;">${m.a}</div>
                ${m.aScore && m.aScore !== '-' ? `<div class="mono" style="font-size:11px;color:var(--lime);">${m.aScore}</div>` : ''}
              </div>
            </div>
            <div class="ed-i" style="font-size:14px;color:var(--mute);">vs</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="text-align:right;">
                <div class="ed" style="font-size:15px;">${m.b}</div>
                ${m.bScore && m.bScore !== '-' ? `<div class="mono" style="font-size:11px;color:var(--mute);">${m.bScore}</div>` : ''}
              </div>
              ${PlayerAvatar({ code: m.b, size: 28, initials: m.b.slice(0, 2) })}
            </div>
          </div>
          <div style="font-size:10px;color:${m.live ? 'var(--pink)' : 'var(--ink-2)'};margin-top:8px;text-align:center;">${m.status}</div>
        </div>
      `).join('')}
    `;

    return CD.MobileShell({ title: 'LEAGUE', active: 'league', subTabs: LEAGUE_SUBTABS, activeSub: 'matches', children: inner });
  };

})();
