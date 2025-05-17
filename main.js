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
    if (typeof groups.error !== "undefined") {
      dice.options.onResultEffects.PlayAnimationParticleVortex = {
        onResult: rangeArrayFrom(1, error)
      };
    }
    if (typeof groups.threat !== "undefined") {
      dice.options.onResultEffects.PlayAnimationParticleSpiral = {
        onResult: rangeArrayFrom(threat, dice.faces)
      };
    }
  }
});
