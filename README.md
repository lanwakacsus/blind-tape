# Blind Tape

A real-time trading game combined with a backtester, in a single HTML file.

The market runs on its own clock and you never see the next bar. Go long, short or flat while six rule-based bots race you on the same tape. After each round, the backtest lab shows how each bot traded, lets you tune them, sweep SMA parameters, and check settings out of sample on 100 fresh markets.

## Play

Open `blind-tape.html` in a browser. Everything is in that one file. The fonts load from Google Fonts.

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
