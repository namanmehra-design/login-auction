/* ════════════════════════════════════════════════════════════════════
   CD BRIDGE — connects new design (CD.* scenes) to existing app state
   This is loaded AFTER cd-primitives.js, cd-scenes.js and app.js.
   It re-renders the active scene whenever roomState changes.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  const CD = window.CD = window.CD || {};
  const root = () => document.getElementById('cd-root');

  // ── Active state ────────────────────────────────────────────────
  CD.state = {
    view: 'dashboard',  // 'auth' | 'dashboard' | 'room'
    activeCat: 'auction',  // for room view: auction | squad | league | players | matches | setup
    activeSub: null,
    isMobile: window.innerWidth < 768
  };
  window.addEventListener('resize', () => {
    const wasMobile = CD.state.isMobile;
    CD.state.isMobile = window.innerWidth < 768;
    if(wasMobile !== CD.state.isMobile) CD.render();
  });

  // ── Helpers: map app state to CD scene data ─────────────────────
  function teamCodeFromName(teamName){
    if(!teamName) return 'MI';
    const s = teamName.toLowerCase();
    if(s.includes('csk') || s.includes('chennai')) return 'CSK';
    if(s.includes('mi') || s.includes('mumbai')) return 'MI';
    if(s.includes('kkr') || s.includes('kolkata')) return 'KKR';
    if(s.includes('rcb') || s.includes('bangalore') || s.includes('bengaluru')) return 'RCB';
    if(s.includes('pbks') || s.includes('punjab')) return 'PBKS';
    if(s.includes('gt') || s.includes('gujarat')) return 'GT';
    if(s.includes('rr') || s.includes('rajasthan')) return 'RR';
    if(s.includes('srh') || s.includes('hyderabad')) return 'SRH';
    if(s.includes('lsg') || s.includes('lucknow')) return 'LSG';
    if(s.includes('dc') || s.includes('delhi')) return 'DC';
    return 'MI';
  }

  CD.getRoomData = function(){
    const rs = window.roomState || {};
    const teams = rs.teams || {};
    const myTeam = window.myTeamName || '';
    const block = rs.currentBlock || {};
    const players = rs.players ? (Array.isArray(rs.players) ? rs.players : Object.values(rs.players)) : [];
    return { rs, teams, myTeam, block, players };
  };

  // ── AUCTION JUMBOTRON DATA ──────────────────────────────────────
  CD.buildAuctionData = function(){
    const { rs, teams, block, players } = CD.getRoomData();
    if(!block || !block.active){
      return null; // Will fall through to "no active block" state
    }
    const pid = String(block.playerId);
    const player = players.find(p => String(p.id) === pid) || {};
    const teamCode = teamCodeFromName(player.iplTeam || player.t || 'MI');
    const playerName = player.name || player.n || 'Unknown';
    const teamLabel = teamCodeFromName(block.lastBidderTeam || '');
    const allTeams = Object.values(teams);
    const bidders = allTeams.map(t => {
      const niMap = block.notInterested || {};
      const isOut = !!niMap[t.name];
      const isLead = block.lastBidderTeam === t.name;
      return {
        t: teamCodeFromName(t.name),
        team: t.name,
        purse: parseFloat((t.budget || 0).toFixed(2)),
        lead: isLead,
        out: isOut
      };
    });
    const curBid = parseFloat((block.currentBid || player.basePrice || 0).toFixed(2));
    const incs = [];
    let inc = 0.25;
    let next = curBid + inc;
    while(incs.length < 6){
      incs.push(next.toFixed(2));
      if(next < 3) inc = 0.25;
      else if(next < 10) inc = 0.5;
      else inc = 1.0;
      next = parseFloat((next + inc).toFixed(2));
    }
    return {
      player: { team: teamCode, name: playerName, form: [38,42,67,82,90,75,88] },
      currentBid: curBid,
      timer: '00:00',
      leader: teamLabel,
      increments: incs,
      bidders: bidders.slice(0, 8)
    };
  };

  // ── LEADERBOARD DATA ────────────────────────────────────────────
  CD.buildLeaderboardData = function(){
    const { rs, teams } = CD.getRoomData();
    const matches = rs.matches || {};
    const stored = rs.leaderboardTotals || {};
    const teamArr = Object.values(teams).map(t => {
      const st = stored[t.name] || {};
      return {
        team: t.name,
        code: teamCodeFromName(t.name),
        pts: Math.round(st.pts || 0),
        delta: 0,
        squad: (Array.isArray(t.roster) ? t.roster.length : (t.roster ? Object.keys(t.roster).length : 0)),
        purse: parseFloat((t.budget || 0).toFixed(2))
      };
    }).sort((a,b) => b.pts - a.pts);
    return { teams: teamArr };
  };

  // ── PLAYERS / LEDGER DATA ───────────────────────────────────────
  CD.buildPlayersData = function(){
    const { rs, players, teams } = CD.getRoomData();
    const ownerMap = {};
    Object.values(teams).forEach(t => {
      const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
      roster.forEach(p => { ownerMap[(p.name || p.n || '').toLowerCase()] = t.name; });
    });
    const rows = players.slice(0, 50).map(p => ({
      name: p.name || p.n || '',
      team: teamCodeFromName(p.iplTeam || p.t || ''),
      role: p.role || p.r || 'Batter',
      base: p.basePrice || 0,
      sold: p.soldPrice || null,
      buyer: p.soldTo || null,
      status: p.status || 'available',
      isOverseas: !!(p.isOverseas || p.o)
    }));
    return { rows };
  };

  // ── PURSES DATA ─────────────────────────────────────────────────
  CD.buildPursesData = function(){
    const { teams } = CD.getRoomData();
    const initialBudget = (window.roomState && window.roomState.setup && window.roomState.setup.budget) || 100;
    return {
      teams: Object.values(teams).map(t => {
        const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
        const spent = roster.reduce((s,p) => s + (p.soldPrice || 0), 0);
        return {
          name: t.name,
          code: teamCodeFromName(t.name),
          budget: parseFloat((t.budget || 0).toFixed(2)),
          spent: parseFloat(spent.toFixed(2)),
          initial: initialBudget,
          players: roster.length
        };
      })
    };
  };

  // ── MY TEAM / SQUAD DATA ────────────────────────────────────────
  CD.buildMyTeamData = function(){
    const { teams, myTeam } = CD.getRoomData();
    if(!myTeam || !teams[myTeam]) return null;
    const t = teams[myTeam];
    const roster = Array.isArray(t.roster) ? t.roster : (t.roster ? Object.values(t.roster) : []);
    return {
      teamName: t.name,
      budget: parseFloat((t.budget || 0).toFixed(2)),
      players: roster.map(p => ({
        name: p.name || p.n || '',
        team: teamCodeFromName(p.iplTeam || p.t || ''),
        role: p.role || p.r || 'Batter',
        soldPrice: p.soldPrice || 0,
        isOverseas: !!(p.isOverseas || p.o)
      }))
    };
  };

  // ── MATCHES DATA ────────────────────────────────────────────────
  CD.buildMatchesData = function(){
    const { rs } = CD.getRoomData();
    const matches = rs.matches || {};
    const list = Object.entries(matches).sort((a,b) => (b[1].timestamp || 0) - (a[1].timestamp || 0)).slice(0, 12);
    return {
      matches: list.map(([id, m]) => ({
        id, label: m.label || id, winner: m.winner || '--', motm: m.motm || '--',
        timestamp: m.timestamp || 0
      }))
    };
  };

  // ── ROOMS / DASHBOARD DATA ──────────────────────────────────────
  CD.buildRoomsData = function(myRooms, joinedRooms){
    return {
      myRooms: myRooms || [],
      joinedRooms: joinedRooms || []
    };
  };

  // ── EVENT HANDLERS (called by scene buttons) ────────────────────
  window.CD_onBid = function(amount){
    if(typeof window.addBid !== 'function') return;
    const cur = (window.roomState && window.roomState.currentBlock && window.roomState.currentBlock.currentBid) || 0;
    const inc = parseFloat(amount) - cur;
    if(inc > 0) window.addBid(inc);
  };
  window.CD_onSold = function(){ if(typeof window.sellPlayer === 'function') window.sellPlayer(); };
  window.CD_onPass = function(){ if(typeof window.markUnsold === 'function') window.markUnsold(); };
  window.CD_notInterested = function(){ if(typeof window.markNotInterested === 'function') window.markNotInterested(); };
  window.CD_signIn = function(){
    const e = document.getElementById('cdAuthEmail'); const p = document.getElementById('cdAuthPass');
    if(typeof window.loginUser === 'function' && e && p) window.loginUser(e.value, p.value);
  };
  window.CD_googleSignIn = function(){ if(typeof window.googleLogin === 'function') window.googleLogin(); };
  window.CD_createAccount = function(){
    if(typeof window.toggleAuthMode === 'function') window.toggleAuthMode();
  };
  window.CD_enterAuction = function(rid){ if(typeof window.loadRoom === 'function') window.loadRoom(rid); };
  window.CD_openRoom = function(rid){ if(typeof window.loadRoom === 'function') window.loadRoom(rid); };
  window.CD_newRoom = function(){
    const m = document.getElementById('createRoomModal');
    if(m) m.classList.add('open');
  };

  // Tab navigation (top categories)
  window.CD_onNav = function(cat){
    CD.state.activeCat = cat;
    CD.state.activeSub = null;
    // Map to legacy switchTab
    const map = {
      setup: 'setup', auction: 'auction', squad: 'myteam',
      league: 'leaderboard', players: 'players-season', matches: 'matches'
    };
    if(typeof window.switchTab === 'function' && map[cat]) window.switchTab(map[cat]);
    CD.render();
  };
  window.CD_onSubTab = function(sub){
    CD.state.activeSub = sub;
    if(typeof window.switchTab === 'function') window.switchTab(sub);
    CD.render();
  };

  // ── MAIN RENDER ─────────────────────────────────────────────────
  CD.render = function(){
    const r = root();
    if(!r) return;
    const view = CD.state.view;
    const isMobile = CD.state.isMobile;
    let html = '';

    if(view === 'auth'){
      html = isMobile ? CD.MobileShell({title:'CRICKET · 26', hideTab:true, children: authBody()}) : CD.DesktopAuth({});
      r.innerHTML = html;
      return;
    }
    if(view === 'dashboard'){
      // Dashboard uses CD.DesktopRooms with live data injected via helpers
      const roomsData = window._cdDashRooms || { rooms: [] };
      try {
        html = isMobile ? CD.MobileHome({}) : CD.DesktopRooms(roomsData);
      } catch(e){ console.error('CD render dashboard:', e); html = '<div class="glass" style="padding:24px;color:var(--ink);">Loading dashboard…</div>'; }
      r.innerHTML = html;
      // Inject room cards into the dashboard
      injectRoomCards();
      return;
    }
    if(view === 'room'){
      const cat = CD.state.activeCat;
      try {
        if(isMobile){
          if(cat === 'auction') html = CD.MobileAuction(CD.buildAuctionData() || {});
          else if(cat === 'squad') html = CD.MobileSquad(CD.buildMyTeamData() || {});
          else if(cat === 'league') html = CD.MobileLeague(CD.buildLeaderboardData());
          else if(cat === 'matches') html = CD.MobileMatches(CD.buildMatchesData());
          else html = CD.MobileHome({});
        } else {
          if(cat === 'auction') html = CD.DesktopAuctionLive(CD.buildAuctionData() || {});
          else if(cat === 'squad') html = CD.DesktopMyTeam(CD.buildMyTeamData() || {});
          else if(cat === 'league') html = CD.DesktopLeaderboard(CD.buildLeaderboardData());
          else if(cat === 'players') html = CD.DesktopPlayers(CD.buildPlayersData());
          else if(cat === 'matches') html = CD.DesktopMatches(CD.buildMatchesData());
          else if(cat === 'setup') html = CD.DesktopRooms({});
          else html = CD.DesktopAuctionLive(CD.buildAuctionData() || {});
        }
      } catch(e){
        console.error('CD render room ' + cat + ':', e);
        html = '<div class="glass" style="padding:24px;color:var(--ink);">Loading…</div>';
      }
      r.innerHTML = html;
    }
  };

  function authBody(){
    return `
      <div style="padding:40px 20px;text-align:center;color:var(--ink);">
        <div class="ed" style="font-size:36px;margin-bottom:12px;">Welcome <span class="ed-i" style="color:var(--pink);">back</span></div>
        <input id="cdAuthEmail" class="inp" type="email" placeholder="Email" style="margin-bottom:10px;" />
        <input id="cdAuthPass" class="inp" type="password" placeholder="Password" style="margin-bottom:14px;" />
        <button class="btn btn-primary btn-lg" style="width:100%;margin-bottom:10px;" onclick="window.CD_signIn()">Sign in</button>
        <button class="btn btn-lg" style="width:100%;margin-bottom:10px;" onclick="window.CD_googleSignIn()">Continue with Google</button>
        <div style="color:var(--mute);font-size:12px;">New here? <a href="#" onclick="window.CD_createAccount();return false;" style="color:var(--electric);">Create an account</a></div>
      </div>
    `;
  }

  function injectRoomCards(){
    // Find room list containers in the new design and populate from window._cdDashRooms
    const data = window._cdDashRooms || { myRooms: [], joinedRooms: [] };
    const all = [...(data.myRooms || []), ...(data.joinedRooms || [])];
    const grid = document.querySelector('#cd-root .rooms-grid, #cd-root [data-rooms-grid]');
    if(!grid) return;
    if(all.length === 0){
      grid.innerHTML = '<div class="glass" style="padding:24px;color:var(--mute);grid-column:1/-1;text-align:center;">No rooms yet. Create one to get started.</div>';
      return;
    }
    grid.innerHTML = all.map(r => `
      <div class="glass" style="padding:20px;cursor:pointer;" onclick="window.CD_openRoom('${r.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div class="ed" style="font-size:20px;">${(r.name||'Room').replace(/[<>"']/g,'')}</div>
          ${r.isOwner ? '<span class="pill pill-gold">OWNER</span>' : '<span class="pill">JOINED</span>'}
        </div>
        <div class="cap">${r.budget||100} cr · ${r.maxTeams||7} teams · ${r.maxPlayers||21} players</div>
      </div>
    `).join('');
  }

  // ── HOOK INTO EXISTING APP STATE CHANGES ────────────────────────
  // We monkey-patch loadRoom and showAuth/showApp to set view, and listen to roomState changes.
  CD.hookInto = function(){
    const _origShowAuth = window.showAuth;
    window.showAuth = function(){
      if(typeof _origShowAuth === 'function') _origShowAuth();
      CD.state.view = 'auth';
      CD.render();
    };
    const _origShowApp = window.showApp;
    window.showApp = function(){
      if(typeof _origShowApp === 'function') _origShowApp();
      CD.state.view = 'dashboard';
      CD.render();
    };
    const _origLoadRoom = window.loadRoom;
    if(typeof _origLoadRoom === 'function'){
      window.loadRoom = function(rid){
        const ret = _origLoadRoom(rid);
        CD.state.view = 'room';
        CD.state.activeCat = 'auction';
        setTimeout(CD.render, 100);
        return ret;
      };
    }
    const _origLoadDash = window.loadDash;
    if(typeof _origLoadDash === 'function'){
      window.loadDash = function(){
        const ret = _origLoadDash();
        CD.state.view = 'dashboard';
        CD.render();
        return ret;
      };
    }
    // Re-render on every roomState update — debounced
    let _renderTimer = null;
    const _scheduleRender = () => {
      if(_renderTimer) clearTimeout(_renderTimer);
      _renderTimer = setTimeout(() => { try { CD.render(); } catch(e){ console.error(e); } }, 200);
    };
    // Polling fallback — every 500ms check if state changed
    let lastRsKey = '';
    setInterval(() => {
      try {
        const rs = window.roomState;
        if(!rs) return;
        const key = (rs.currentBlock?.currentBid || 0) + '|' + (rs.currentBlock?.lastBidderTeam || '') + '|' + (rs.currentBlock?.playerId || '') + '|' + Object.keys(rs.teams || {}).length;
        if(key !== lastRsKey){
          lastRsKey = key;
          if(CD.state.view === 'room') _scheduleRender();
        }
      } catch(e){}
    }, 500);
  };

  // ── BOOT ───────────────────────────────────────────────────────
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { CD.hookInto(); CD.render(); });
  } else {
    CD.hookInto(); CD.render();
  }
})();
