/* The quotes the author kept. He started with trading lines, drifted into things that sit
 * badly, and ended on the one still on the front page. Real quotes carry their real source,
 * with "attributed to" where the attribution is folklore; the rest he never sourced. Pure. */

export interface Quote {
  /** ISO date he saved it. */
  day: string;
  text: string;
  source: string;
}

/** Oldest first. */
export const QUOTES: Quote[] = [
  { day: '2010-08-03', text: 'Be fearful when others are greedy, and greedy when others are fearful.', source: 'Warren Buffett' },
  { day: '2010-08-17', text: "The four most dangerous words in investing are: this time it's different.", source: 'Sir John Templeton' },
  { day: '2010-09-01', text: 'Cut your losses short and let your profits run.', source: 'attributed to David Ricardo' },
  { day: '2010-09-22', text: 'In the short run, the market is a voting machine. In the long run, it is a weighing machine.', source: 'Benjamin Graham' },
  {
    day: '2010-10-12',
    text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
    source: 'George Soros',
  },
  { day: '2010-11-02', text: 'The stock market is a device for transferring money from the impatient to the patient.', source: 'attributed to Warren Buffett' },
  { day: '2010-11-23', text: 'Markets can remain irrational longer than you can remain solvent.', source: 'attributed to John Maynard Keynes' },
  { day: '2010-12-14', text: "All of man's unhappiness comes from one thing: that he cannot sit quietly in a room.", source: 'Blaise Pascal' },
  { day: '2011-01-04', text: 'I have measured out my life with coffee spoons.', source: 'T. S. Eliot' },
  { day: '2011-01-11', text: 'Whereof one cannot speak, thereof one must be silent.', source: 'Ludwig Wittgenstein' },
  { day: '2011-01-18', text: 'Life is a tale told by an idiot, full of sound and fury, signifying nothing.', source: 'William Shakespeare' },
  { day: '2011-01-25', text: 'I am nothing. I shall always be nothing. I cannot want to be something.', source: 'Fernando Pessoa' },
  { day: '2011-02-01', text: 'Nothing is certain except death and taxes.', source: 'Benjamin Franklin' },
  { day: '2011-02-08', text: 'Every tape has a last bar. Nobody says which one.', source: 'written on a desk in the library' },
  { day: '2011-02-15', text: 'A man is only as free as the last thing he checked.', source: 'overheard on the train' },
  { day: '2011-02-22', text: 'The graph is not the territory.', source: 'unknown' },
  { day: '2011-02-27', text: 'Nobody rings to say the tape is over.', source: 'found on a receipt' },
  { day: '2011-03-01', text: 'You can leave the page open. It will keep your place.', source: 'a man at the bus stop' },
  { day: '2011-03-04', text: 'The next bar has not been written yet.', source: 'unknown' },
  { day: '2011-03-07', text: 'The seed is not a seed.', source: 'M.' },
  { day: '2011-03-09', text: 'It was always going to be this bar.', source: 'unknown' },
  { day: '2011-03-11', text: 'Someone is watching the person who is watching the screen.', source: 'unknown' },
  { day: '2011-03-13', text: 'There is nothing after the last bar. I keep checking.', source: 'M.' },
  { day: '2011-03-14', text: 'The trend is your friend until the end.', source: 'old trading proverb' },
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2011-03-14" as "14 MAR 2011". */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
