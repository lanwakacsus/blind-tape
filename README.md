# Blind Tape

A real-time trading game combined with a backtester. The source is TypeScript; the build bundles it into a single HTML file.

The market runs on its own clock and you never see the next bar. Go long, short or flat while six rule-based bots race you on the same tape. After each round, the backtest lab shows how each bot traded, lets you tune them, sweep SMA parameters, and check settings out of sample on 100 fresh markets.

## Play

Build it (see below) and open `dist/blind-tape.html` in a browser. Everything is in that one file except the fonts, which load from Google Fonts.

| Key | Action |
| --- | --- |
| `↑` / `L` | Go long |
| `↓` / `S` | Go short |
| `Space` / `F` | Go flat |
| hold `→` | Fast-forward |
| `P` / `Esc` | Pause |
| `M` | Mute |

## Modes

- **Season**: five markets, each faster and more volatile than the last. Earn stars for finishing in profit, beating buy & hold, and finishing first. One star unlocks the next market.
- **Daily challenge**: the same market for everyone each day (seeded from the UTC date), with one ranked run. The shared leaderboard only works when the page runs as a claude.ai artifact; opened locally, results are kept in your browser.
- **Your own CSV**: load prices with `date, open, high, low, close` columns, or a single close column.

## The bots

| Name | Strategy |
| --- | --- |
| INDEX | Buy & hold |
| CROSS | SMA crossover |
| MOMO | Momentum |
| BREAK | Donchian breakout |
| SNAP | RSI mean reversion |
| BANDS | Bollinger mean reversion |

Each bot decides at the daily close using only past bars and pays 0.10% per trade, the same cost you pay.

## Markets

Markets are synthetic: a random walk that switches between regimes (grind-up, selloff, chop, melt-up, crash), with volatility clustering and occasional gaps.

## Development

Needs Node 20.19 or newer.

```bash
npm install
npm run dev        # Vite dev server with hot reload
npm test           # Vitest unit tests for the engine and DOM helpers
npm run build      # type-check, then write dist/blind-tape.html
npm run preview    # serve the built file
```

`npm run build` inlines all JavaScript and CSS into `dist/blind-tape.html` (via `vite-plugin-singlefile`), so the result can be published as a single claude.ai artifact.

### Layout

| Folder | What's there |
| --- | --- |
| `src/engine/` | Pure maths, no DOM: market generator and CSV import (`market.ts`), indicators and bots (`strategies.ts`), backtester and stats (`backtest.ts`), parameter sweep and out-of-sample runs (`research.ts`) |
| `src/game/` | Round state and clock, intrabar price path, positions and fees (`round.ts`), scoring and stars (`scoring.ts`), saved progress (`save.ts`), sound |
| `src/render/` | Canvas drawing: shared grid, candle and marker helpers (`canvas.ts`), live tape, debrief charts, title background |
| `src/ui/` | Screens (title, play, debrief, lab, daily panels), input handling and the `h()` DOM helper |
| `src/daily/` | Daily challenge: dates, share text, and the claude.ai `db`/`user` leaderboard code |
| `test/` | Vitest suites |

`test/fixtures/legacy-engine.json` holds outputs of the original single-file build (commit `814c300`). The tests check that the engine still reproduces them exactly, so the daily tape for a given date is the same on old and new builds.
