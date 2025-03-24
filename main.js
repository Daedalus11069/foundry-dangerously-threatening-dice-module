Hooks.once("init", () => {
  Hooks.on("diceSoNiceRollStart", (messageId, context) => {
    for (const dice of context.roll.dice) {
      const match = dice.flavor.match(
        /error:(?<error>\d+)\s*(threat:(?<threat>\d+))?|threat:(?<threat>\d+)\s*(error:(?<error>\d+))?|threat:(?<threat>\d+)|error:(?<error>\d+)/i
      );
      if (match !== null) {
        let error = window.parseInt(match.groups.error, 10);
        let threat = window.parseInt(match.groups.threat, 10);
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
    }
  });

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
