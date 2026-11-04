// Drop this file into the tracker repo next to index.html.
// Usage in the tracker:
//   <div id="leaderboard"></div>
//   <script src="leaderboard.js"></script>
//   <script>YGOLeaderboard.mount(document.getElementById('leaderboard'));</script>
//
// It reads ./leaderboard.json from the tracker's own site (same HTTPS origin),
// which the Pi bot keeps updated through the GitHub API. No API key needed.
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function load() {
    // cache: 'no-store' plus a cache-buster so neither the browser nor GitHub's CDN serves a stale copy.
    const r = await fetch(`leaderboard.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function render(el, data) {
    const updated = new Date(data.updated);
    const rows = data.players.map((p) => {
      const g = p.wins + p.losses;
      return `<tr><td class="lb-rk">${p.rank}</td><td>${esc(p.name)}</td><td class="lb-n">${p.rating}</td>` +
             `<td class="lb-n">${p.points}</td><td class="lb-n">${p.wins}–${p.losses}</td><td class="lb-n">${g ? Math.round((p.wins / g) * 100) + '%' : '—'}</td></tr>`;
    }).join('');
    const recent = (data.recent || []).map((r) => `<li>${esc(r.summary)}</li>`).join('');
    el.innerHTML = `
      <style>
        .lb{font:14px/1.4 system-ui,sans-serif}
        .lb table{width:100%;border-collapse:collapse}
        .lb th,.lb td{padding:6px 4px;border-bottom:1px solid rgba(128,128,128,.25);text-align:left}
        .lb th{font-size:11px;text-transform:uppercase;opacity:.7}
        .lb .lb-n{text-align:right;font-variant-numeric:tabular-nums}
        .lb .lb-rk{font-weight:700;width:2em}
        .lb .lb-meta{opacity:.7;font-size:12px;margin:4px 0 10px}
        .lb ul{padding-left:18px;margin:6px 0}
        .lb li{margin:4px 0;font-size:13px}
      </style>
      <div class="lb">
        <div class="lb-meta">${esc(data.month)} · updated ${updated.toLocaleString()} · earning cap ${data.rules.cap}× per opponent / month</div>
        <table><thead><tr><th>#</th><th>Duelist</th><th class="lb-n">Rating</th><th class="lb-n">Points</th><th class="lb-n">W–L</th><th class="lb-n">Win %</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No duelists yet.</td></tr>'}</tbody></table>
        ${recent ? `<h4 style="margin:16px 0 4px">Recent results</h4><ul>${recent}</ul>` : ''}
      </div>`;
  }

  async function mount(el, { refreshMs = 60000 } = {}) {
    const tick = async () => {
      try { render(el, await load()); }
      catch (e) { if (!el.innerHTML) el.textContent = "Leaderboard isn't available right now."; console.warn('[leaderboard]', e); }
    };
    await tick();
    if (refreshMs) setInterval(tick, refreshMs);
  }

  window.YGOLeaderboard = { mount, load };
})();
