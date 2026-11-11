# Y.U.G.I.O.H. — Life Point Tracker PWA

## What this is
A feature-rich Yu-Gi-Oh! life point tracker Progressive Web App. Single-file architecture (`index.html`, ~13K lines). Deployed via GitHub Pages at https://bishopkngslayer.github.io/ygo-tracker/

## Owner
BishopKngSlayer (Bishop). Sole developer. Iterates rapidly, tests live after each deploy.

## Architecture — READ THIS FIRST
- **Single-file is intentional and must be maintained.** All HTML, CSS, and JS live in `index.html`.
- Supporting files: `leaderboard.js` (client-side ladder renderer exposing `window.YGOLeaderboard`), `leaderboard.json` (ladder data, written by the Discord wager bot via GitHub API), `card-data.json`, `manifest.json`, `service-worker.js`, icons.
- Persistence: IndexedDB for collections/decks, localStorage for settings/roster/sounds (~28 keys, `yugioh_` prefix).
- Firebase Realtime DB (`yugiandohub-default-rtdb.firebaseio.com`) for multiplayer sync.
- Anthropic API for card scanning (AI rulings removed).
- YGOPRODeck API for card data.

## Critical gotchas (costly to relearn)
- `tutorialOverlay` init MUST stay wrapped in `DOMContentLoaded` — synchronous execution before the overlay exists crashes voice control.
- `_fbApplying` guard MUST be set before any `render()` call inside Firebase sync listeners to prevent loops.
- When reordering players, ALL per-player arrays must be reindexed: `panelState`, `cardCollapsed`, `cardRotations`, `biggestHit`, `sparkHistory`, `counterTokens`, `phaseEffects`, `dmgTypeState`, `lpOverTime`, `lastTurnRemaining`, `chainCount`, `chainDebt`. Missing any causes subtle corruption.
- Voice control only works on GitHub Pages, not in iframes (microphone sandbox restrictions).
- `race` field must be stored in `_deckList` entries for monster types to display correctly.
- PWA `start_url` must be `"./"` not `"/"` for iOS/iPad compatibility.
- LP font sizes scale dynamically via `--lp-font-size` CSS variable set in `render()`. Current values: `{1:'22vw', 2:'13vw', 3:'7vw', 4:'5.2vw', 5:'4.2vw', 6:'3.5vw'}`.

## JS validation
After any edit, always verify JS parses clean:
```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
let ok = true;
(m||[]).forEach((block,i) => {
  const js = block.replace(/<\/?script[^>]*>/g,'');
  if (js.trim().length < 10) return;
  try { new Function(js); }
  catch(e) { console.log('Block',i,'ERROR:',e.message); ok = false; }
});
if(ok) console.log('ALL JS BLOCKS PARSE CLEAN');
"
```

## Git workflow
- Push directly to `main` — GitHub Pages deploys automatically.
- Use descriptive commit messages (not "Add files via upload").
- If push is rejected (remote ahead), `git pull --rebase origin main` then push.

## Related projects (same owner)
- **ygo-tiktok-bot** — TikTok LIVE chat bot (Node.js, on Mac Studio)
- **ygo-wager-ledger** — Discord wager/ladder bot (Node.js, discord.js, SQLite, on Mac Studio). Publishes `leaderboard.json` to this repo.

## Partnership
GamerXpress Accessories — affiliate link `gmxpressaccessory.com/discount/BISHOP`, code `BISHOP`, 15% off orders over $15. Integrated into the app (promo modal, toast on new game).
