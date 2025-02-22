Hooks.once("init", () => {
  Hooks.on("diceSoNiceRollStart", (messageId, context) => {
    if (context.roll.dice.length === 1) {
      for (const dice of context.roll.dice) {
        if (dice.faces !== 20) {
          return;
        }
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

          if (error >= 1 && threat >= 1) {
            if (dice.values[0] <= error) {
              // ChatMessage.create({ content: `Botch on: ${dice.formula}` });
              // dice.options.content = `Botch on: ${dice.formula}`;
              dice.options.sfx = {
                specialEffect: "PlayAnimationParticleVortex"
              };
            } else if (dice.values[0] >= threat) {
              // ChatMessage.create({ content: `Crit on: ${dice.formula}` });
              // dice.options.content = `Crit on: ${dice.formula}`;
              dice.options.sfx = {
                specialEffect: "PlayAnimationParticleSpiral"
              };
            }
          }
        }
        return;
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
