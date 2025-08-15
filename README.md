# ECAV Registration Change Monitor

Minimal toolkit for detecting when the ECAV (or any) page content changes (e.g. inscriptions opening).

## Files
| File | Purpose |
|------|---------|
| `monitor.html` | Main monitoring dashboard (hash + diff detection) |
| `mock-ecav.html` | Simulation site with buttons to open / close registration |
| `proxy-server.js` | CORS bypass proxy for external HTTPS pages |
| `web-server.js` | Local static server (serves everything on :8080) |
| `test-website.html` | Simple generic test page |

## Quick Start (Local Mock)
1. PowerShell in project folder:
   ```powershell
   node web-server.js
   ```
2. Open http://localhost:8080/monitor.html
3. URL: http://localhost:8080/mock-ecav.html (pre-fill or paste)
4. Interval: 3000 (≥1000)
5. Click Start Monitoring
6. In a new tab open the mock site (button on page) and click “✅ Ouvrir les inscriptions” ⇒ Alert.

If you do NOT see an alert after clicking buttons on the mock page: the current monitor compares downloaded HTML only. The mock page’s buttons modify the DOM client‑side (JavaScript) without changing the underlying HTML file, so repeated fetches still return the original source. To force detectable differences use server-generated variants:

- Closed (default): http://localhost:8080/mock-ecav.html
- Open (server variant): http://localhost:8080/mock-ecav.html?open=1
- Warning variant: http://localhost:8080/mock-ecav.html?warning=1

Test by changing the monitored URL between these variants or configure two monitors in different tabs. (Extending to full rendered DOM would require a headless browser or server-side prerender.)

## Monitoring Real ECAV Page
1. In another terminal start the proxy:
   ```powershell
   node proxy-server.js
   ```
2. In the monitor set URL to: https://www.unige.ch/droit/ecav/examen-final/inscription
3. Interval: 30000–60000 ms (be polite)
4. Start; keep tab + proxy running.

## How Detection Works
Each fetch (with cache‑buster) → normalize (optional stripping) → SHA-256 hash. When the hash changes and size delta ≥ Min Change Size → alert (sound + desktop notification) and show:
- Old vs new size
- Hashes
- First diff snippet (context window)

## Tuning / Noise Reduction
- Increase Min Change Size if page contains small dynamic tokens.
- You can add patterns to `IGNORED_PATTERNS` array in `monitor.html` to strip volatile fragments (timestamps, counters).

## Troubleshooting
| Issue | Fix |
|-------|-----|
| No external fetch | Start proxy-server.js |
| No sound | Click Test Alert first (unlock audio), check tab not muted |
| Many false alerts | Raise Min Change Size, add ignore patterns |
| Nothing detected | Confirm URL, watch console/network, ensure interval ≥1000 |

## Respect Servers
Do not set sub-second intervals for third‑party sites. 30–60s is adequate for registration openings.

## License
Add a license file (MIT recommended) if you publish.
