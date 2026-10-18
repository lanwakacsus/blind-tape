# Blind Tape

A real-time trading game combined with a backtester. The source is TypeScript; the build bundles it into a single HTML file.

The market runs on its own clock and you never see the next bar. Go long, short or flat while six rule-based bots race you on the same tape. After each round, the backtest lab shows how each bot traded, lets you tune them, sweep SMA parameters, and check settings out of sample on 100 fresh markets.

## Play

Build it (see below) and open `dist/blind-tape.html` in a browser. Everything is in that one file; the fonts are the ones already on your system.

| Key | Action |
| --- | --- |
| `↑` / `L` | Go long |
| `↓` / `S` | Go short |
| `Space` / `F` | Go flat |
| hold `→` | Fast-forward |
| `P` / `Esc` | Pause |
| `M` | Mute |
| `1` `2` `3` | Position size: 25%, 50%, 100% |
| `X` | Cycle the stop-loss: off, 2%, 5%, 10% |
| `T` | Cycle the profit target: off, 3%, 6%, 10% |

## Modes

- **Season**: five markets, each faster and more volatile than the last. Earn stars for finishing in profit, beating buy & hold, and finishing first. One star unlocks the next market.
- **Daily challenge**: the same market for everyone each day (seeded from the UTC date), with one ranked run. The shared leaderboard only works when the page runs as a claude.ai artifact; opened locally, results are kept in your browser.
- **Tape archive**: replay any of the daily tapes from launch to the last one logged, as practice.
- **Hidden tape**: from the backtest lab, freeze your tuned bot settings and trade a fresh market the bots have never seen.
- **Your own CSV**: load prices with `date, open, high, low, close` columns, or a single close column.

## Trading

You choose how big a position is (25%, 50% or 100% of equity) and whether a stop-loss or a profit target closes it for you. Every trade costs 0.10%, the same as the bots pay.

**Stop and target.** Before you trade, choose a stop-loss and a profit target. When a trade loses the stop amount, or makes the target amount, it closes at the market. With both on, the controls show your reward against your risk and the win rate you would need just to break even: a 2 : 1 target to stop means you can be wrong two times in three. A trade's stop is its unit of risk, so the review reports results in R.

**Indicators.** Toggle moving averages (20 and 50), Bollinger bands (20, 2), volume, RSI (14) and ATR (14) on the live chart. Every value uses only closed bars. Volume is synthetic: it rises with big moves and gaps and runs high in a crash.

**Market rules.** The harder season markets restrict you: a cap on trades, a locked stop-loss, or a smaller maximum size.

**Review.** After each round you get a risk grade (drawdown and Sharpe, not just return) and a trade review: win rate, average win and loss, payoff ratio, expectancy, profit factor, fees paid, how far each trade went for and against you, and a few notes on what the numbers say. The journal keeps every finished round and looks for habits across them.

## Elsewhere

The title page links to more than the game: the backtest lab results are in the debrief, and there are pages for testing claims made about the game against its own engine, your journal, the tape archive, and the notes and quotes that came with the project.

## The bots

| Name | Strategy |
| --- | --- |
| INDEX | Buy & hold |
| CROSS | SMA crossover |
| MOMO | Momentum |
| BREAK | Donchian breakout |
| SNAP | RSI mean reversion |
| BANDS | Bollinger mean reversion |

Each bot decides at the daily close using only past bars and pays 0.10% per trade, the same cost you pay on a market order. A seventh racer, M., trades the same tape; it is not counted in your place or stars.

## Markets

Markets are synthetic: a random walk that switches between regimes (grind-up, selloff, chop, melt-up, crash), with volatility clustering and occasional gaps.

## Development

Needs Node 20.19 or newer.

```bash
npm install
npm run dev        # Vite dev server with hot reload
npm test           # Vitest: engine and game logic, plus a smoke test that loads the real page in jsdom and plays a round
npm run build      # type-check, then write dist/blind-tape.html
npm run preview    # serve the built file
```

`npm run build` inlines all JavaScript and CSS into `dist/blind-tape.html` (via `vite-plugin-singlefile`), so the result can be published as a single claude.ai artifact.

### Hosting on Vercel

`vercel.json` builds the project and serves `blind-tape.html` for every path; the app answers unknown paths with its own 404 pages (try `/#/bar151`). Import the repo at vercel.com/new, or run `npx vercel` in this folder. The shared daily board only works on claude.ai; elsewhere, daily results are kept in each player's browser.

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
