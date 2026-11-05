// Duel ladder for the tracker. Reads ./leaderboard.json (written by the Discord bot through the GitHub API)
// from the tracker's own site, so no API key is needed.
//
//   YGOLeaderboard.mount(el)      draw the ladder into an element and keep it fresh
//   YGOLeaderboard.get()          last loaded data (or null)
//   YGOLeaderboard.find(name)     ladder entry for a name, ignoring dots/spaces/capitals (or null)
//   YGOLeaderboard.refresh()      load now; fires a "ygo-ladder" event on window when new data arrives
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let data = null, byName = {}, inflight = null;

  async function load() {
    // cache: 'no-store' plus a cache-buster so neither the browser nor GitHub's CDN serves a stale copy.
    const r = await fetch(`leaderboard.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function refresh() {
    if (inflight) return inflight;
    inflight = load().then((d) => {
      data = d; byName = {};
      (d.players || []).forEach((p) => { byName[norm(p.name)] = p; });
      try { window.dispatchEvent(new CustomEvent('ygo-ladder', { detail: d })); } catch (e) {}
      return d;
    }).finally(() => { inflight = null; });
    return inflight;
  }

  const TIER_COLORS = { Rookie: '#9aa3ad', Bronze: '#cd7f32', Silver: '#c0c7cf', Gold: '#e6b422', Platinum: '#5fd3c6', Legend: '#b07cff' };
  const tierBadge = (t) => (t ? `<span class="lb-tier" style="color:${TIER_COLORS[t] || 'var(--gold,#c9a227)'}">${esc(t)}</span>` : '');
  const link = (p) => (p.linked ? '<span class="lb-link" title="Linked to Discord">🔗</span>' : '');

  function render(el, d) {
    const updated = new Date(d.updated);
    const need = (d.rules && d.rules.placementGames) || 0;
    const ranked = d.players.filter((p) => p.ranked !== false);
    const unranked = d.players.filter((p) => p.ranked === false);
    const pctOf = (p) => { const g = p.wins + p.losses; return g ? Math.round((p.wins / g) * 100) + '%' : '—'; };
    const rows = ranked.map((p) =>
      `<tr><td class="lb-rk">${p.rank}</td><td>${esc(p.name)} ${link(p)}</td><td>${tierBadge(p.tier)}</td><td class="lb-n">${p.rating}</td>` +
      `<td class="lb-n">${p.points}</td><td class="lb-n">${p.wins}–${p.losses}</td><td class="lb-n">${pctOf(p)}</td></tr>`).join('');
    const placement = unranked.map((p) =>
      `<tr class="lb-unranked"><td class="lb-rk">—</td><td>${esc(p.name)} ${link(p)}</td><td><span class="lb-place">${p.wins + p.losses}/${need} games</span></td>` +
      `<td class="lb-n">${p.rating}</td><td class="lb-n">${p.points}</td><td class="lb-n">${p.wins}–${p.losses}</td><td class="lb-n">${pctOf(p)}</td></tr>`).join('');
    const recent = (d.recent || []).map((r) => `<li>${esc(r.summary)}</li>`).join('');
    const tiers = (d.tiers || []).map((t) => `${tierBadge(t.name)} ${t.min}+`).join(' · ');
    el.innerHTML = `
      <style>
        .lb{font:14px/1.4 system-ui,sans-serif}
        .lb table{width:100%;border-collapse:collapse}
        .lb th,.lb td{padding:6px 4px;border-bottom:1px solid rgba(128,128,128,.25);text-align:left}
        .lb th{font-size:11px;text-transform:uppercase;opacity:.7}
        .lb .lb-n{text-align:right;font-variant-numeric:tabular-nums}
        .lb .lb-rk{font-weight:700;width:2em}
        .lb .lb-meta{opacity:.7;font-size:12px;margin:4px 0 10px}
        .lb .lb-tier{font-weight:700;font-size:12px;letter-spacing:.5px}
        .lb .lb-link{font-size:11px;opacity:.85}
        .lb .lb-unranked td{opacity:.65}
        .lb .lb-place{font-size:11px}
        .lb .lb-sub td{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.6;padding-top:14px}
        .lb ul{padding-left:18px;margin:6px 0}
        .lb li{margin:4px 0;font-size:13px}
      </style>
      <div class="lb">
        <div class="lb-meta">${esc(d.month)} · updated ${updated.toLocaleString()} · earning cap ${d.rules.cap}× per opponent / month${need ? ` · ranked after ${need} games` : ''}</div>
        <table><thead><tr><th>#</th><th>Duelist</th><th>Tier</th><th class="lb-n">Rating</th><th class="lb-n">Points</th><th class="lb-n">W–L</th><th class="lb-n">Win %</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7">Nobody has finished placement yet.</td></tr>'}
        ${placement ? `<tr class="lb-sub"><td colspan="7">In placement</td></tr>${placement}` : ''}</tbody></table>
        ${tiers ? `<div class="lb-meta" style="margin-top:8px">Tiers: ${tiers} · 🔗 = linked to Discord</div>` : ''}
        ${recent ? `<h4 style="margin:16px 0 4px">Recent results</h4><ul>${recent}</ul>` : ''}
      </div>`;
  }

  async function mount(el, { refreshMs = 60000 } = {}) {
    const tick = async () => {
      try { render(el, await refresh()); }
      catch (e) { if (!el.innerHTML || data === null) el.textContent = "Leaderboard isn't available right now."; console.warn('[leaderboard]', e); }
    };
    if (data) render(el, data);
    await tick();
    if (refreshMs) setInterval(tick, refreshMs);
  }

  window.YGOLeaderboard = {
    mount, load, refresh, norm,
    get: () => data,
    find: (name) => byName[norm(name)] || null,
  };
  // Load once at startup (roster badges and name suggestions use it), then every 5 minutes.
  refresh().catch(() => {});
  setInterval(() => refresh().catch(() => {}), 5 * 60 * 1000);
})();
