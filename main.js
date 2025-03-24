Hooks.on("diceSoNiceRollStart", (messageId, context) => {
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

    if (dice.values[0] <= error) {
      dice.options.sfx = {
        specialEffect: "PlayAnimationParticleVortex"
      };
    } else if (dice.values[0] >= threat) {
      dice.options.sfx = {
        specialEffect: "PlayAnimationParticleSpiral"
      };
    }
  }

  // Hooks.on("diceSoNiceRollComplete", messageId => {
  //   const message = game.messages.get(messageId);
  //   for (const roll of message.rolls) {
  //     if (roll.dice[0].options.content) {
  //       ChatMessage.create({
  //         content: `${roll.dice[0].options.content} = ${roll.total}`
  //       });
  //     }
  //   }
  // });
});
