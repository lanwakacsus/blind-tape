/* The claims screen: test one of the author's claims on a sample of markets, then rule on it. */

import { CLAIMS, FULL, SAMPLES, fullResult, type Claim, type ClaimResult } from '../engine/claims';
import { body, stamp } from '../game/diary';
import { recordClaim, save } from '../game/save';
import { $, classes, fill, h, type Child } from './dom';
import { onEnter, showScreen } from './screens';

/** The latest sample run on each claim, kept until the player leaves the screen. */
let samples: Record<string, { n: number; result: ClaimResult }> = {};
let found: ReturnType<typeof recordClaim> = [];

function evidence(r: ClaimResult): HTMLElement {
  return h('div', { class: 'evidence' }, ...r.evidence.map((line) => h('div', null, line)));
}

function ruled(claim: Claim): Child[] {
  const done = save.claims[claim.id];
  const truth = fullResult(claim);
  const sample = samples[claim.id];
  return [
    h('div', { class: classes('result', done.right ? 'ok' : 'bad') }, `You said he is ${done.guess ? 'right' : 'wrong'}. ${done.right ? 'Correct.' : 'Incorrect.'} The full ${FULL} markets say the claim ${truth.holds ? 'holds' : 'does not hold'}.`),
    evidence(truth),
    sample && sample.result.holds !== truth.holds
      ? h('div', { class: 'small' }, `Your sample of ${sample.n} said the opposite. That is how a small sample lies.`)
      : null,
    h('p', { class: 'react' }, done.right ? claim.right : claim.wrong),
  ];
}

function open(claim: Claim): Child[] {
  const sample = samples[claim.id];
  const test = (n: number) =>
    h('button', {
      class: classes('btn', sample?.n === n && 'on'),
      type: 'button',
      onclick: () => {
        samples[claim.id] = { n, result: claim.evaluate(n) };
        render();
      },
    }, `${n} markets`);
  const rule = (guess: boolean) =>
    h('button', {
      class: 'btn primary',
      type: 'button',
      disabled: !sample,
      onclick: () => {
        found = recordClaim(claim.id, guess, guess === fullResult(claim).holds);
        render();
      },
    }, guess ? 'He is right' : 'He is wrong');
  return [
    h('div', { class: 'sampler' }, h('span', { class: 'small' }, 'Test it on'), ...SAMPLES.map(test)),
    sample ? evidence(sample.result) : h('div', { class: 'small' }, 'Pick a sample to see what the engine says before you rule.'),
    sample ? h('div', { class: 'small' }, `In this sample the claim ${sample.result.holds ? 'holds' : 'does not hold'}.`) : null,
    h('div', { class: 'sampler' }, rule(true), rule(false)),
  ];
}

function render(): void {
  const total = Object.keys(save.claims).length;
  const right = Object.values(save.claims).filter((c) => c.right).length;
  $('#claimsCount').textContent = `${total} of ${CLAIMS.length} ruled on \u00b7 ${right} right`;
  $('#claimsFound').hidden = found.length === 0;
  fill($('#claimsFoundBody'), ...[...found].reverse().map((e) => h('article', null, h('time', null, stamp(e)), h('p', null, body(e)))));
  fill(
    $('#claimsList'),
    ...CLAIMS.map((c) => h('article', { class: 'claim' }, h('p', { class: 'claim-text' }, c.text), ...(save.claims[c.id] ? ruled(c) : open(c)))),
  );
}

export function initClaims(): void {
  onEnter('claims', () => {
    samples = {};
    found = [];
    render();
    $('#claims').scrollTop = 0;
  });
  $('#claimsBack').addEventListener('click', () => showScreen('title'));
}
