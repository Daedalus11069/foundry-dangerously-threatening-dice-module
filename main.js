Hooks.once("init", async function () {
  game.settings.register("dangerously-threatening-dice", "failDice", {
    scope: "world",
    config: true,
    name: "DANGEROUSLYTHREATENINGDICE.failDice.AllowedName",
    hint: "DANGEROUSLYTHREATENINGDICE.failDice.AllowedHint",
    type: String,
    default: "d20"
  });

  game.settings.register(
    "dangerously-threatening-dice",
    "failureAnimationName",
    {
      scope: "world",
      config: true,
      name: "DANGEROUSLYTHREATENINGDICE.failureAnimationName.AllowedName",
      hint: "DANGEROUSLYTHREATENINGDICE.failureAnimationName.AllowedHint",
      type: String,
      default: "PlayAnimationParticleVortex"
    }
  );

  game.settings.register("dangerously-threatening-dice", "critDice", {
    scope: "world",
    config: true,
    name: "DANGEROUSLYTHREATENINGDICE.critDice.AllowedName",
    hint: "DANGEROUSLYTHREATENINGDICE.critDice.AllowedHint",
    type: String,
    default: "d20,d12,d10,d8"
  });

  game.settings.register("dangerously-threatening-dice", "critAnimationName", {
    scope: "world",
    config: true,
    name: "DANGEROUSLYTHREATENINGDICE.critAnimationName.AllowedName",
    hint: "DANGEROUSLYTHREATENINGDICE.critAnimationName.AllowedHint",
    type: String,
    default: "PlayAnimationParticleSpiral"
  });
});

const MODULE_ID = "dangerously-threatening-dice";
const FLAVOR_REGEX = /(?<key>threat|error):(?<value>\d+)(?<dir>[hHlL])?/gi;

function parseDiceList(setting) {
  return (game.settings.get(MODULE_ID, setting) || "")
    .toLowerCase()
    .split(/, ?/)
    .filter(d => d !== "")
    .map(d => (isNaN(d) ? d : `d${d}`));
}

function rangeArrayFrom(n, m) {
  return Array.from({ length: m - n + 1 }, (_, index) => n + index);
}

function parseFlavor(flavorText) {
  const groups = {};
  for (const match of flavorText.matchAll(FLAVOR_REGEX)) {
    groups[match.groups.key.toLowerCase()] = {
      raw: match.groups.value,
      dir: match.groups.dir?.toLowerCase() ?? null
    };
  }
  return groups;
}

/**
 * Support modifiers in the flavor like: threat:19 error:3
 * An optional H/L suffix anchors the value at the high or low end:
 *   threat:18   -> default: 18 .. faces (high is good)
 *   threat:5L   -> low-anchored (roll-under): 1 .. 5
 *   threat:3H   -> top 3 values (faces-2 .. faces)
 *   error:3     -> default: 1 .. 3 (low is bad)
 *   error:95H   -> high-anchored: 95 .. faces
 *   error:3H    -> top 3 values (faces-2 .. faces)
 * Without a suffix, values > faces/2 on error auto-detect as high-anchored.
 * d100 has no default effects: the values must be explicit.
 *
 * Returns { threat: [start, end] | null, error: [start, end] | null }
 */
function computeRanges(faces, groups, enabled) {
  const clamp = v => Math.max(1, Math.min(faces, v));
  const isD100 = faces === 100;

  const parse = (pair, isThreat) => {
    if (!pair) {
      if (isD100) return null;
      return { n: isThreat ? faces : 1, dir: null, defaulted: true };
    }
    let n = parseInt(pair.raw, 10);
    if (isNaN(n) || n <= 0) n = isThreat ? faces : 1;
    return { n, dir: pair.dir, defaulted: false };
  };

  // top-N or n..max for a high anchor
  const highRange = n =>
    n > faces / 2 || isD100
      ? [clamp(n), faces]
      : [clamp(faces - (n - 1)), faces];

  let threat = null;
  if (enabled.crit) {
    const p = parse(groups.threat, true);
    if (p) {
      if (p.dir === "l") threat = [1, clamp(p.n)];
      else if (p.dir === "h") threat = highRange(p.n);
      else threat = [clamp(p.n), faces];
    }
  }

  let error = null;
  if (enabled.fail) {
    const p = parse(groups.error, false);
    if (p) {
      if (p.dir === "h") error = highRange(p.n);
      else if (p.dir === "l") error = [1, clamp(p.n)];
      else if (!p.defaulted && p.n > faces / 2) error = [clamp(p.n), faces];
      else error = [1, clamp(p.n)];
    }
  }

  return { threat, error };
}

const inRange = (range, v) => range !== null && v >= range[0] && v <= range[1];

/**
 * Dice So Nice applies `options.sfx` to a whole term, so to light up only some
 * dice of a term (e.g. 2 of 10d20) we show a copy of the roll where such terms
 * are split into one term per effect. The real roll is never modified.
 */
const isRealReroll = r => !!r?.rerolled && !r.active && !r.discarded;
const triggersThrow = r => !!r?.exploded || isRealReroll(r);

/**
 * Mirrors how Dice So Nice numbers the throws of a term: dice that exploded or
 * were rerolled make the dice that follow them wait for a later throw.
 */
function throwIndices(results) {
  let cnt = results.filter(r => !triggersThrow(r)).length;
  let extra = 0;
  let t = 0;
  return results.map(r => {
    if (triggersThrow(r)) extra++;
    const index = t;
    if (r.hidden && (r.discarded || r.rerolled)) return index;
    if (--cnt <= 0) {
      t++;
      cnt = extra;
      extra = 0;
    }
    return index;
  });
}

/**
 * Builds the results of a sub-term whose dice must keep the throw they had in
 * the original term. Dice So Nice only knows a term's throws from the
 * exploded/rerolled flags of its results, so we rewrite them: each throw gets
 * as many flagged entries as the next throw has dice. Invisible hidden
 * entries (never created as dice) pad a throw when needed.
 */
function buildSequencedResults(entries) {
  const maxT = Math.max(...entries.map(e => e.t));
  const reals = Array.from({ length: maxT + 1 }, () => []);
  for (const { r, t } of entries) {
    const copy = foundry.utils.deepClone(r);
    delete copy.exploded;
    delete copy.rerolled;
    reals[t].push(copy);
  }

  // padders needed per throw, computed from the last throw backwards
  const sizes = new Array(maxT + 1);
  const padders = new Array(maxT + 1);
  for (let t = maxT; t >= 0; t--) {
    const next = t === maxT ? 0 : sizes[t + 1];
    padders[t] = Math.max(next, reals[t].length === 0 ? 1 : 0);
    sizes[t] = reals[t].length + padders[t];
  }

  const out = [];
  for (let t = 0; t <= maxT; t++) {
    out.push(...reals[t]);
    const marked = t === maxT ? 0 : sizes[t + 1];
    for (let p = 0; p < padders[t]; p++) {
      out.push({
        result: 1,
        active: true,
        hidden: true,
        ...(p < marked ? { exploded: true } : {})
      });
    }
  }
  return out;
}

/**
 * Dice So Nice applies `options.sfx` to a whole term, so to light up only some
 * dice of a term (e.g. 2 of 10d20) we show a copy of the roll where such terms
 * are split into one term per effect. The real roll is never modified.
 * `results` are the term's results, or the entries to rebuild with their
 * throws kept (see buildSequencedResults).
 */
function cloneTerm(term, results, sequenced = false) {
  const clone = foundry.dice.terms.RollTerm.fromData(term.toJSON());
  const shown = sequenced ? results.map(e => e.r) : results;
  clone.results = sequenced
    ? buildSequencedResults(results)
    : results.map(r => foundry.utils.deepClone(r));
  clone.number = shown.length;
  const total = shown.reduce(
    (sum, r) => (r.active === false || r.discarded ? sum : sum + r.result),
    0
  );
  Object.defineProperty(clone, "total", { value: total, configurable: true });
  clone.options = foundry.utils.deepClone(term.options ?? {});
  return clone;
}

Hooks.on("diceSoNiceRollStart", (messageId, context) => {
  try {
    applyThreatEffects(messageId, context);
  } catch (err) {
    // never let this module stop the dice from rolling
    console.error(
      "Dangerously Threatening Dice | failed to apply effects",
      err
    );
  }
});

function applyThreatEffects(messageId, context) {
  const sourceRoll = context.dsnRoll || context.roll;
  if (!sourceRoll) return;

  const critName = game.settings.get(MODULE_ID, "critAnimationName");
  const failName = game.settings.get(MODULE_ID, "failureAnimationName");
  const failDice = parseDiceList("failDice");
  const critDice = parseDiceList("critDice");

  // Try to get flavor from the roll, then the chat message
  let rollFlavor =
    sourceRoll.options?.flavor || sourceRoll.options?.flavour || "";
  if (!rollFlavor && messageId) {
    const message = game.messages.get(messageId);
    if (message) rollFlavor = message.flavor || message.system?.flavor || "";
  }

  let changed = false;
  const newDice = [];

  for (const term of sourceRoll.dice) {
    const faces = term.faces;
    const enabled = {
      crit: critDice.includes(`d${faces}`),
      fail: failDice.includes(`d${faces}`)
    };
    const results = term.results ?? [];
    if ((!enabled.crit && !enabled.fail) || !results.length) {
      newDice.push(term);
      continue;
    }

    // dice flavor first, then fall back to the roll flavor
    const flavorText =
      term.flavor ||
      term.flavour ||
      term.options?.flavor ||
      term.options?.flavour ||
      rollFlavor ||
      "";
    const groups = parseFlavor(flavorText);
    const { threat, error } = computeRanges(faces, groups, enabled);

    // Threat takes priority; an explicit threat also removes its values from error
    const classify = value => {
      if (inRange(threat, value)) return "crit";
      if (inRange(error, value)) return "fail";
      return null;
    };

    const kinds = results.map(r => classify(r.result));
    if (kinds.every(k => k === null)) {
      newDice.push(term);
      continue;
    }

    const effectFor = kind => (kind === "crit" ? critName : failName);
    const hasChain = results.some(r => r.exploded || r.rerolled);
    const allSame = kinds.every(k => k === kinds[0]);

    // Every die has the same outcome: no split needed
    if (allSame) {
      const clone = cloneTerm(term, results);
      clone.options.sfx ??= { specialEffect: effectFor(kinds[0]), options: {} };
      newDice.push(clone);
      changed = true;
      continue;
    }

    // Mixed term: one sub-term per outcome, keeping the original order
    // (hidden dice that were discarded/rerolled are never shown, so they are dropped)
    const throws = hasChain ? throwIndices(results) : null;
    for (const kind of ["crit", "fail", null]) {
      const subset = hasChain
        ? results
            .map((r, i) => ({ r, t: throws[i], kind: kinds[i] }))
            .filter(
              e =>
                e.kind === kind &&
                !(e.r.hidden && (e.r.discarded || e.r.rerolled))
            )
        : results.filter((_, i) => kinds[i] === kind);
      if (!subset.length) continue;
      const clone = cloneTerm(term, subset, hasChain);
      if (kind)
        clone.options.sfx ??= { specialEffect: effectFor(kind), options: {} };
      newDice.push(clone);
    }
    changed = true;
  }

  if (!changed) return;

  const dsnRoll = sourceRoll.constructor.fromData(sourceRoll.toJSON());
  dsnRoll.secret = sourceRoll.secret;
  dsnRoll.ghost = sourceRoll.ghost;
  Object.defineProperty(dsnRoll, "dice", {
    value: newDice,
    configurable: true
  });
  context.dsnRoll = dsnRoll;
}
