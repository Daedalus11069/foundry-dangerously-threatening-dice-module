Hooks.once("init", async function () {
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
    dice.options.onResultEffects[
      game.settings.get("dangerously-threatening-dice", "failureAnimationName")
    ] = {
      onResult: rangeArrayFrom(1, error)
    };

    dice.options.onResultEffects[
      game.settings.get("dangerously-threatening-dice", "critAnimationName")
    ] = {
      onResult: rangeArrayFrom(threat, dice.faces)
    };
  }
});
