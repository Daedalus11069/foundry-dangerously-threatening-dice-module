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

Hooks.on("diceSoNiceRollStart", (messageId, context) => {
  function rangeArrayFrom(n, m) {
    return Array.from({ length: m - n + 1 }, (_, index) => `${n + index}`);
  }
  function mapConfigIntoDice(dice) {
    if (isNaN(dice)) {
      return dice;
    } else {
      return `d${dice}`;
    }
  }
  const failDice = (
    game.settings.get("dangerously-threatening-dice", "failDice") || ""
  )
    .toLowerCase()
    .split(/, ?/)
    .filter(d => d !== "")
    .map(mapConfigIntoDice);
  const critDice = (
    game.settings.get("dangerously-threatening-dice", "critDice") || ""
  )
    .toLowerCase()
    .split(/, ?/)
    .filter(d => d !== "")
    .map(mapConfigIntoDice);

  for (const dice of context.roll.dice) {
    // Support modifiers in the flavour like: threat:19 error:3
    // Extended syntax supports an optional H/L suffix to anchor the value at the high or low end:
    //   threat:2    -> default behavior: 2 .. faces
    //   threat:2H   -> high-anchored: (faces-1) .. faces (the top 2 results)
    //   error:3     -> default behavior: 1 .. 3
    //   error:99    -> auto-detects high-end on d100 and becomes 99 .. 100
    //   error:3H    -> forces high-end: (faces-2) .. faces
    // If no suffix is provided and the numeric value is greater than faces/2, it will be treated
    // as a high-anchored value (top-end). This keeps the short form convenient for large numbers.

    const reg = /(?<key>threat|error):(?<value>\d+)(?<dir>[hHlL])?/gi;
    let match;
    const groups = {};
    while (
      (match = reg.exec(
        dice.flavor ||
          dice.flavour ||
          dice.options.flavor ||
          dice.options.flavour
      )) !== null
    ) {
      if (!match.groups) continue;
      const key = match.groups.key.toLowerCase();
      const rawValue = match.groups.value;
      const dir = match.groups.dir;
      groups[key] = { raw: rawValue, dir };
    }

    // parse numeric values and direction
    function parsePair(pair, faces, defaultIsThreat) {
      if (!pair || typeof pair.raw === "undefined") {
        // default: for error -> 1, for threat -> faces
        return null;
      }
      let n = window.parseInt(pair.raw, 10);
      if (isNaN(n) || n <= 0) {
        n = defaultIsThreat ? faces : 1;
      }
      const dir = pair.dir ? pair.dir.toLowerCase() : null;
      // auto-detect high-anchored if value > faces/2 and no explicit dir
      const autoHigh = !dir && n > faces / 2;
      return { n, dir, autoHigh };
    }

    const parsedError = parsePair(groups.error, dice.faces, false);
    const parsedThreat = parsePair(groups.threat, dice.faces, true);

    if (typeof dice.options.onResultEffects === "undefined") {
      dice.options.onResultEffects = {};
    }

    // Helper to clamp a number into 1..faces
    const clamp = v => Math.max(1, Math.min(dice.faces, v));

    // Compute error range: default 1..n, but if dir==='h' or autoHigh then top-end
    if (failDice.includes(`d${dice.faces}`) && parsedError) {
      let start, end;
      if (parsedError.dir === "h" || parsedError.autoHigh) {
        // high anchored: top N values -> faces-(n-1) .. faces
        end = clamp(dice.faces);
        start = clamp(dice.faces - (parsedError.n - 1));
      } else {
        // low anchored: 1 .. n
        start = 1;
        end = clamp(parsedError.n);
      }

      dice.options.onResultEffects[
        game.settings.get(
          "dangerously-threatening-dice",
          "failureAnimationName"
        )
      ] = {
        onResult: rangeArrayFrom(start, end)
      };
    }

    // Compute threat range: default n..faces, but if dir==='h' or autoHigh then top-end
    if (critDice.includes(`d${dice.faces}`) && parsedThreat) {
      let start, end;
      if (parsedThreat.dir === "h" || parsedThreat.autoHigh) {
        // high anchored: top N values -> faces-(n-1) .. faces
        start = clamp(dice.faces - (parsedThreat.n - 1));
        end = clamp(dice.faces);
      } else {
        // low anchored: n .. faces
        start = clamp(parsedThreat.n);
        end = clamp(dice.faces);
      }
      dice.options.onResultEffects[
        game.settings.get("dangerously-threatening-dice", "critAnimationName")
      ] = {
        onResult: rangeArrayFrom(start, end)
      };
    }
  }
});
