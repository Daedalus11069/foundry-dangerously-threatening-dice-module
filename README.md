Only use with the fork of dice-so-nice I created: https://github.com/Daedalus11069/dice-so-nice-fork

This is an experimental module because of the fact that I have not gotten it to consisitently not crash Dice So Nice when multiple dice are rolled at the same time.
Because of this fact, I have had to fork dice-so-nice.

To use, rolls **must** use the format of: `/roll 1d20[optional reason error:number threat:number]`; examples:

- `/roll 1d20[some reason error:3 threat:18]`
- `/roll 1d20[some reason here threat:20 error:5]`

If rolling multiple numbers, give each its own roll. The module does not currently support a `XdY` with an `X` higher than 1.
