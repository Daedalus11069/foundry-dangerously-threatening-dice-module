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
    const reg = /threat:(?<threat>\d+)|error:(?<error>\d+)/gi;
    let match;
    const groups = {};
    while ((match = reg.exec(dice.flavor)) !== null) {
      if (typeof match.groups.error !== "undefined") {
        groups.error = match.groups.error;
      }
      if (typeof match.groups.threat !== "undefined") {
        groups.threat = match.groups.threat;
      }
    }
    let error = window.parseInt(groups.error, 10);
    let threat = window.parseInt(groups.threat, 10);
    if (error === 0 || isNaN(error)) {
      error = 1;
    }
    if (threat === 0 || isNaN(threat)) {
      threat = dice.faces;
    }

    if (typeof dice.options.onResultEffects === "undefined") {
      dice.options.onResultEffects = {};
    }

    if (failDice.includes(`d${dice.faces}`)) {
      dice.options.onResultEffects[
        game.settings.get(
          "dangerously-threatening-dice",
          "failureAnimationName"
        )
      ] = {
        onResult: rangeArrayFrom(1, error)
      };
    }

    if (critDice.includes(`d${dice.faces}`)) {
      dice.options.onResultEffects[
        game.settings.get("dangerously-threatening-dice", "critAnimationName")
      ] = {
        onResult: rangeArrayFrom(threat, dice.faces)
      };
    }
  }
});
