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

  // Generate array of ALL possible values for a die (1 to faces, or 0-9 for d10)
  function allValuesFor(faces) {
    if (faces === 10) {
      // d10 can show 0-9 or 1-10 depending on the die
      return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    }
    return rangeArrayFrom(1, faces);
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

  // Try to get flavor from various sources:
  // 1. The roll itself
  // 2. The chat message
  // 3. Individual dice terms
  let rollFlavor =
    context.roll?.options?.flavor || context.roll?.options?.flavour || "";

  // If no roll flavor, try to get from the chat message
  if (!rollFlavor && messageId) {
    const message = game.messages.get(messageId);
    if (message) {
      rollFlavor = message.flavor || message.system?.flavor || "";
    }
  }

  // Special handling for d100: check if we have a d100 roll with explicit settings
  // and pre-calculate whether the total is in threat/error range
  function handleD100Roll(diceTerms, flavorText) {
    // Look for d100 dice term
    const d100Term = diceTerms.find(d => d.faces === 100);
    if (!d100Term) return null;

    // Parse flavor for explicit threat/error
    const reg = /(?<key>threat|error):(?<value>\d+)(?<dir>[hHlL])?/gi;
    let match;
    const groups = {};
    reg.lastIndex = 0;
    while ((match = reg.exec(flavorText)) !== null) {
      if (!match.groups) continue;
      const key = match.groups.key.toLowerCase();
      groups[key] = { raw: match.groups.value, dir: match.groups.dir };
    }

    // If no explicit settings, d100 has no effects
    if (!groups.threat && !groups.error) return null;

    // Get the actual rolled total
    const total = d100Term.total;

    // Calculate ranges
    const clamp = v => Math.max(1, Math.min(100, v));
    let threatStart = null,
      threatEnd = null;
    let errorStart = null,
      errorEnd = null;

    if (groups.threat) {
      const n = parseInt(groups.threat.raw, 10);
      const dir = groups.threat.dir?.toLowerCase();
      if (dir === "l") {
        threatStart = 1;
        threatEnd = clamp(n);
      } else if (dir === "h" || n > 50) {
        threatStart = clamp(n);
        threatEnd = 100;
      } else {
        threatStart = 1;
        threatEnd = clamp(n);
      }
    }

    if (groups.error) {
      const n = parseInt(groups.error.raw, 10);
      const dir = groups.error.dir?.toLowerCase();
      if (dir === "h" || n > 50) {
        errorStart = clamp(n);
        errorEnd = 100;
      } else if (dir === "l") {
        errorStart = 1;
        errorEnd = clamp(n);
      } else {
        errorStart = 1;
        errorEnd = clamp(n);
      }
    }

    // Determine which effect should trigger based on actual total
    let triggerThreat = false;
    let triggerError = false;

    if (threatStart !== null && total >= threatStart && total <= threatEnd) {
      triggerThreat = true;
    }
    if (errorStart !== null && total >= errorStart && total <= errorEnd) {
      triggerError = true;
    }

    // Handle overlap: explicit threat wins over explicit error if both set
    // (or we could let both trigger - but typically you want one)

    return {
      triggerThreat,
      triggerError,
      hasExplicitThreat: !!groups.threat,
      hasExplicitError: !!groups.error
    };
  }

  // Check for d100 special handling
  const d100Result = handleD100Roll(context.roll.dice, rollFlavor);

  for (const dice of context.roll.dice) {
    // Special handling for d100: apply effects to ALL dice values when total is in range
    // This makes both the tens and ones dice light up together
    if (dice.faces === 100 && d100Result !== null) {
      if (typeof dice.options.onResultEffects === "undefined") {
        dice.options.onResultEffects = {};
      }

      // For d100, we apply effects to ALL possible results so both dice light up
      // when the total is in the target range
      const allResults = allValuesFor(100);

      if (d100Result.triggerThreat && critDice.includes("d100")) {
        dice.options.onResultEffects[
          game.settings.get("dangerously-threatening-dice", "critAnimationName")
        ] = {
          onResult: allResults
        };
      }

      if (d100Result.triggerError && failDice.includes("d100")) {
        // Don't apply error if threat already triggered (threat takes priority)
        if (!d100Result.triggerThreat) {
          dice.options.onResultEffects[
            game.settings.get(
              "dangerously-threatening-dice",
              "failureAnimationName"
            )
          ] = {
            onResult: allResults
          };
        }
      }

      // Skip normal processing for d100
      continue;
    }

    // Support modifiers in the flavor like: threat:19 error:3
    // Extended syntax supports an optional H/L suffix to anchor the value at the high or low end:
    //   threat:18   -> default behavior (roll-over): 18 .. faces (high is good)
    //   threat:5L   -> low-anchored (roll-under): 1 .. 5 (low is good)
    //   threat:3H   -> high-anchored: top 3 values (faces-2 .. faces)
    //   error:3     -> default behavior: 1 .. 3 (low is bad)
    //   error:95H   -> high-anchored (roll-under): 95 .. faces (high is bad)
    //   error:3H    -> forces high-end: top 3 values (faces-2 .. faces)
    //
    // Roll-under system examples (like Call of Cthulhu where low=success, high=fumble):
    //   /roll 1d100[Spot Hidden threat:5L error:95H]
    //   -> threat (crit): 1-5 (rolling low is critical success)
    //   -> error (fumble): 95-100 (rolling high is critical failure)
    //
    // Roll-over system examples (like D&D where high=success, low=fumble):
    //   /roll 1d20[Attack threat:20 error:1]
    //   -> threat (crit): 20 (rolling high is critical)
    //   -> error (fumble): 1 (rolling low is failure)
    //
    // If no suffix is provided, the module uses smart defaults:
    //   - threat defaults to high-end (roll-over style)
    //   - error defaults to low-end (roll-over style)
    //   - Values > faces/2 auto-detect as high-anchored

    const reg = /(?<key>threat|error):(?<value>\d+)(?<dir>[hHlL])?/gi;
    let match;
    const groups = {};

    // Get the flavor text from wherever it might be stored
    // Check dice-level flavor first, then fall back to roll-level flavor
    const flavorText =
      dice.flavor ||
      dice.flavour ||
      dice.options?.flavor ||
      dice.options?.flavour ||
      rollFlavor ||
      "";

    // Reset regex lastIndex before exec loop (important for global regexes)
    reg.lastIndex = 0;

    while ((match = reg.exec(flavorText)) !== null) {
      if (!match.groups) continue;
      const key = match.groups.key.toLowerCase();
      const rawValue = match.groups.value;
      const dir = match.groups.dir;
      groups[key] = { raw: rawValue, dir };
    }

    // parse numeric values and direction
    // Returns: { n: number, dir: 'h'|'l'|null, autoHigh: boolean, autoLow: boolean } or null for d100 defaults
    function parsePair(pair, faces, defaultIsThreat) {
      if (!pair || typeof pair.raw === "undefined") {
        // No value specified - use defaults for basic functionality
        // EXCEPT for d100: don't apply defaults because the d10 dice showing "1"
        // could be 1, 11, 21, 31... not necessarily a natural 1 or 100
        if (faces === 100) {
          return null; // No default effects for d100 - must be explicitly set
        }
        // error defaults to 1 (fumble on natural 1)
        // threat defaults to faces (crit on max roll)
        return {
          n: defaultIsThreat ? faces : 1,
          dir: null,
          autoHigh: defaultIsThreat, // threat is high by default
          autoLow: !defaultIsThreat // error is low by default
        };
      }
      let n = window.parseInt(pair.raw, 10);
      if (isNaN(n) || n <= 0) {
        n = defaultIsThreat ? faces : 1;
      }
      const dir = pair.dir ? pair.dir.toLowerCase() : null;
      // auto-detect anchoring if value > faces/2 and no explicit dir
      // For error: high value without dir = auto high-anchored (e.g., error:95 on d100)
      // For threat: high value without dir = already high (default behavior)
      const autoHigh = !dir && n > faces / 2;
      const autoLow = !dir && n <= faces / 2;
      return { n, dir, autoHigh, autoLow };
    }

    const parsedError = parsePair(groups.error, dice.faces, false);
    const parsedThreat = parsePair(groups.threat, dice.faces, true);

    // Track if user explicitly set threat or error (vs using defaults)
    const hasExplicitThreat = groups.threat !== undefined;
    const hasExplicitError = groups.error !== undefined;

    if (typeof dice.options.onResultEffects === "undefined") {
      dice.options.onResultEffects = {};
    }

    // Helper to clamp a number into 1..faces
    const clamp = v => Math.max(1, Math.min(dice.faces, v));

    // Calculate threat range first so we can exclude it from error range if needed
    let threatStart = null,
      threatEnd = null;
    // Only calculate threat range if we have explicit or default threat settings (not null)
    if (critDice.includes(`d${dice.faces}`) && parsedThreat !== null) {
      if (parsedThreat.dir === "l") {
        threatStart = 1;
        threatEnd = clamp(parsedThreat.n);
      } else if (parsedThreat.dir === "h") {
        if (parsedThreat.n > dice.faces / 2) {
          threatStart = clamp(parsedThreat.n);
          threatEnd = clamp(dice.faces);
        } else {
          threatEnd = clamp(dice.faces);
          threatStart = clamp(dice.faces - (parsedThreat.n - 1));
        }
      } else if (parsedThreat.n <= dice.faces / 2) {
        threatStart = 1;
        threatEnd = clamp(parsedThreat.n);
      } else {
        threatStart = clamp(parsedThreat.n);
        threatEnd = clamp(dice.faces);
      }
    }

    // Compute error range
    // Default (roll-over systems): low values are errors (1..n)
    // With H suffix (roll-under systems): high values are errors (n..faces or top N)
    // With L suffix: explicitly low-anchored (1..n)
    // Skip if parsedError is null (d100 with no explicit setting)
    if (failDice.includes(`d${dice.faces}`) && parsedError !== null) {
      let start, end;
      if (parsedError.dir === "h") {
        // Explicitly high-anchored: could mean "top N values" or "from N to max"
        // If n > faces/2, treat as "from n to faces" (e.g., error:95H on d100 = 95-100)
        // If n <= faces/2, treat as "top N values" (e.g., error:3H on d20 = 18-20)
        if (parsedError.n > dice.faces / 2) {
          start = clamp(parsedError.n);
          end = clamp(dice.faces);
        } else {
          end = clamp(dice.faces);
          start = clamp(dice.faces - (parsedError.n - 1));
        }
      } else if (parsedError.dir === "l") {
        // Explicitly low-anchored: 1 .. n
        start = 1;
        end = clamp(parsedError.n);
      } else if (parsedError.autoHigh) {
        // Auto-detected high anchor (value > faces/2): n .. faces
        start = clamp(parsedError.n);
        end = clamp(dice.faces);
      } else {
        // Default: low anchored (1 .. n)
        start = 1;
        end = clamp(parsedError.n);
      }

      // Build the error range, but exclude values that overlap with an explicitly set threat range
      // If user explicitly set threat, those values should NOT trigger error animation
      let errorResults = rangeArrayFrom(start, end);
      if (hasExplicitThreat && threatStart !== null && threatEnd !== null) {
        const threatValues = new Set(rangeArrayFrom(threatStart, threatEnd));
        errorResults = errorResults.filter(v => !threatValues.has(v));
      }

      // Only set the effect if there are any error values left after filtering
      if (errorResults.length > 0) {
        dice.options.onResultEffects[
          game.settings.get(
            "dangerously-threatening-dice",
            "failureAnimationName"
          )
        ] = {
          onResult: errorResults
        };
      }
    }

    // Compute threat range - use pre-calculated values
    // Also filter out values that overlap with explicitly set error range
    if (
      critDice.includes(`d${dice.faces}`) &&
      threatStart !== null &&
      threatEnd !== null
    ) {
      // Build the threat range, but exclude values that overlap with an explicitly set error range
      // If user explicitly set error, those values should NOT trigger threat animation
      let threatResults = rangeArrayFrom(threatStart, threatEnd);

      if (hasExplicitError && parsedError !== null) {
        // Calculate error range to exclude
        let errorStart, errorEnd;
        if (parsedError.dir === "h") {
          if (parsedError.n > dice.faces / 2) {
            errorStart = clamp(parsedError.n);
            errorEnd = clamp(dice.faces);
          } else {
            errorEnd = clamp(dice.faces);
            errorStart = clamp(dice.faces - (parsedError.n - 1));
          }
        } else if (parsedError.dir === "l") {
          errorStart = 1;
          errorEnd = clamp(parsedError.n);
        } else if (parsedError.autoHigh) {
          errorStart = clamp(parsedError.n);
          errorEnd = clamp(dice.faces);
        } else {
          errorStart = 1;
          errorEnd = clamp(parsedError.n);
        }
        const errorValues = new Set(rangeArrayFrom(errorStart, errorEnd));
        threatResults = threatResults.filter(v => !errorValues.has(v));
      }

      // Only set the effect if there are any threat values left after filtering
      if (threatResults.length > 0) {
        dice.options.onResultEffects[
          game.settings.get("dangerously-threatening-dice", "critAnimationName")
        ] = {
          onResult: threatResults
        };
      }
    }
  }
});
