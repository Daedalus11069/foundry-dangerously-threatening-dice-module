# Dangerously Threatening Dice

A Foundry VTT module that adds visual effects to dice rolls based on critical threats and errors, inspired by Fantasy Craft-style mechanics.

> **Important:** This module requires a specific fork of Dice So Nice to function properly.  
> Use this fork: https://github.com/Daedalus11069/dice-so-nice-fork

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Syntax](#basic-syntax)
  - [Advanced Syntax](#advanced-syntax)
  - [Examples](#examples)
- [Configuration](#configuration)
- [Technical Details](#technical-details)

---

## Overview

This module enhances your Foundry VTT dice rolls by triggering special visual animations when dice land on critical (threat) or failure (error) values. It works by parsing special modifiers in your roll commands and triggering Dice So Nice animations accordingly.

### Key Features

- **Critical/Threat Animations**: Play special effects when dice roll high values (e.g., natural 20s)
- **Error/Failure Animations**: Play special effects when dice roll low values (e.g., natural 1s)
- **Flexible Range Configuration**: Define custom threat and error ranges with multiple syntax options
- **Smart Overlap Handling**: Explicitly set values always win — setting `threat:1` means rolling 1 is a critical, not a fumble
- **d100 Special Handling**: No default animations for d100 (must be explicitly set); when triggered, both dice light up based on the total rolled
- **Configurable Per Dice Type**: Set which dice types trigger animations
- **Customizable Animations**: Choose which Dice So Nice animations to play

### Why a Fork?

This module uses an experimental approach that could cause crashes in the original Dice So Nice when multiple dice are rolled simultaneously. The forked version includes stability improvements to prevent these issues.

---

## Installation

### Step 1: Install the Dice So Nice Fork

1. Inside Foundry VTT, go to **Configuration and Setup** → **Add-on Modules**
2. Click **Install Module**
3. Enter this manifest URL: `https://github.com/Daedalus11069/dice-so-nice-fork/releases/latest/download/module.json`
4. Click **Install** and wait for completion

### Step 2: Install Dangerously Threatening Dice

1. Still in **Add-on Modules**, click **Install Module** again
2. Enter this manifest URL: `https://github.com/Daedalus11069/foundry-dangerously-threatening-dice-module/releases/latest/download/module.json`
3. Click **Install** and wait for completion

### Step 3: Enable Both Modules

1. Launch your world
2. Go to **Settings** → **Manage Modules**
3. Enable both "Dice So Nice" (the fork) and "Dangerously Threatening Dice"
4. Click **Save Module Settings**

---

## Usage

### Basic Syntax

To use this module, add special modifiers to your dice roll flavor text using square brackets:

```
/roll XdY[description threat:N error:N]
```

or shorthand:

```
/r XdY[description threat:N error:N]
```

**Parameters:**

- `threat:N` - Defines the critical threat range
- `error:N` - Defines the failure/error range
- The order of `threat` and `error` doesn't matter
- You can include any descriptive text in the brackets

### Advanced Syntax

The module supports **directional anchoring** with optional `H` or `L` suffixes, allowing you to handle both **roll-over** (D&D style) and **roll-under** (Call of Cthulhu style) systems:

```
threat:N[H|L]
error:N[H|L]
```

### Understanding Roll-Over vs Roll-Under Systems

| System Type    | Good Rolls   | Bad Rolls    | Examples               |
| -------------- | ------------ | ------------ | ---------------------- |
| **Roll-Over**  | High numbers | Low numbers  | D&D, Pathfinder        |
| **Roll-Under** | Low numbers  | High numbers | Call of Cthulhu, GURPS |

**Direction Modifiers:**

- **`L` (Low-anchored)**: Range starts from 1
  - `threat:5L` on d100 → rolls 1-5 (critical success in roll-under systems)
  - `error:3L` on d20 → rolls 1-3 (fumble in roll-over systems)
- **`H` (High-anchored)**: Range ends at max die value
  - `error:95H` on d100 → rolls 95-100 (fumble in roll-under systems)
  - `threat:18H` on d20 → rolls 18-20 (critical in roll-over systems)
- **No suffix (default)**: Smart defaults based on typical usage
  - `threat:N` — if N ≤ faces/2, treated as low-anchored (1 to N); if N > faces/2, treated as high-anchored (N to max)
  - `error:N` — if N ≤ faces/2, treated as low-anchored (1 to N); if N > faces/2, treated as high-anchored (N to max)

**Smart Auto-Detection Logic:**

- **Threat values**: `threat:1` on d20 → just 1 (smart low-anchor), `threat:18` on d20 → 18-20 (smart high-anchor)
- **Error values**: `error:1` on d20 → just 1 (low-anchor), `error:95` on d100 → 95-100 (auto high-anchor)
- The threshold is half the dice faces (10 for d20, 50 for d100)

**Overlap Handling:**

- When threat and error ranges would overlap, **explicitly set values take priority**
- Example: `threat:1` removes 1 from the default error range — rolling 1 triggers only the critical animation
- Example: `error:20H` removes 20 from the default threat range — rolling 20 triggers only the fumble animation
- This allows full flexibility for any game system

### Examples

#### Roll-Over System Examples (D&D, Pathfinder)

In roll-over systems, **high rolls are good** and **low rolls are bad**.

```
/roll 1d20[Attack Roll error:1 threat:20]
```

- Error animation on rolling 1 (natural fumble)
- Threat animation on rolling 20 (natural crit)

```
/r 1d20[Skill Check error:3 threat:18]
```

- Error animation on rolls 1-3 (fumble range)
- Threat animation on rolls 18-20 (critical range)

```
/roll 4d6[Damage threat:6]
```

- Threat animation on any die showing 6 (max damage!)
- No error animation (not specified)

#### Roll-Under System Examples (Call of Cthulhu, GURPS)

In roll-under systems, **low rolls are good** and **high rolls are bad**.

> **Note about d100:** Unlike other dice, d100 has **no default animations**. This is because Dice So Nice often renders d100 as two d10s (tens and ones), and a "1" showing on one die could represent 1, 11, 21, 31, etc. You must explicitly set `threat:` and `error:` values for d100 rolls. When the total IS in the specified range, **both dice will light up** with the animation effect.

```
/roll 1d100[Spot Hidden threat:5L error:95H]
```

- Threat (critical success): 1-5 (rolling very low is amazing) — both dice glow!
- Error (fumble): 95-100 (rolling very high is a disaster) — both dice glow!

```
/r 1d100[Sanity Check threat:1L error:100H]
```

- Threat: rolling 1 (perfect success)
- Error: rolling 100 (catastrophic failure)

```
/roll 1d100[Luck Roll threat:10L error:96H]
```

- Threat (extreme success): 1-10
- Error (fumble): 96-100

#### Mixed/Custom Examples

```
/r 1d20[Custom threat:2H error:2L]
```

- Threat: 19-20 (top 2 values)
- Error: 1-2 (bottom 2 values)

```
/roll 1d12[Wild Magic threat:2H]
```

- Threat: 11-12 (top 2 values)

#### Overlap Handling Examples

When you want a value to be a critical instead of a fumble (or vice versa):

```
/roll 1d20[Inverted threat:1]
```

- Threat: 1 (rolling 1 is now a CRITICAL, not a fumble!)
- Error: (default 1 is excluded) — no error animation on 1

```
/r 1d20[Cursed Blade error:20H]
```

- Error: 20 (rolling 20 is now a FUMBLE, not a critical!)
- Threat: (default 20 is excluded) — no threat animation on 20

```
/roll 1d20[Chaotic threat:1 error:20H]
```

- Threat: 1 (low roll = critical success)
- Error: 20 (high roll = fumble)
- Completely inverted from normal D&D rules!

#### Multiple Dice Examples

```
/roll 2d20[Advantage error:1 threat:20]
```

- Each die independently triggers effects

```
/r 8d6[Fireball Damage threat:6]
```

- Any die rolling 6 gets the critical animation

---

## Configuration

Access module settings via **Game Settings** → **Module Settings** → **Dangerously Threatening Dice**

### Available Settings

#### 1. Failure Animation Dice

**Default:** `d20`

Comma-separated list of dice types that should trigger failure animations.

**Examples:**

- `d20` - Only d20s show failure effects
- `d20,d12,d10` - Multiple dice types
- `20,12,10` - Alternative format (without 'd' prefix)

#### 2. Failure Animation Name

**Default:** `PlayAnimationParticleVortex`

The Dice So Nice animation to play on failures/errors.

**Common Options:**

- `PlayAnimationParticleVortex` - Swirling vortex effect
- `PlayAnimationParticleSpiral` - Spiral effect
- `PlayAnimationDark` - Dark/shadowy effect
- (Refer to Dice So Nice documentation for full list)

#### 3. Critical Animation Dice

**Default:** `d20,d12,d10,d8`

Comma-separated list of dice types that should trigger critical/threat animations.

#### 4. Critical Animation Name

**Default:** `PlayAnimationParticleSpiral`

The Dice So Nice animation to play on critical successes/threats.

---

## Technical Details

### How It Works

1. **Hook Registration**: The module registers a hook for `diceSoNiceRollStart`
2. **Flavor Parsing**: It extracts `threat:N` and `error:N` modifiers from the dice flavor text
3. **Range Calculation**: Based on the values and direction modifiers, it calculates which die results should trigger effects
4. **Effect Assignment**: It assigns the configured animation to the calculated result ranges
5. **Animation Triggering**: Dice So Nice plays the animations when dice land on those values

### Range Calculation Logic

```javascript
// Error (Failure) Range
If direction is 'H' (explicit high-anchor):
  If N > faces/2:  Range = [N, faces]      // From N to max (e.g., 95-100)
  Else:            Range = [faces-N+1, faces]  // Top N values (e.g., top 3 = 18-20)
Else If direction is 'L' (explicit low-anchor):
  Range = [1, N]  // Bottom values
Else If N > faces/2 (auto-detect high):
  Range = [N, faces]  // From N to max
Else:
  Range = [1, N]  // Default: bottom values

// Threat (Critical) Range
If direction is 'L' (explicit low-anchor - roll-under systems):
  Range = [1, N]  // Bottom values (e.g., 1-5 for crit success)
Else If direction is 'H' (explicit high-anchor):
  If N > faces/2:  Range = [N, faces]      // From N to max
  Else:            Range = [faces-N+1, faces]  // Top N values
Else If N <= faces/2 (smart low-anchor):
  Range = [1, N]  // Low values (e.g., threat:1 = just 1)
Else:
  Range = [N, faces]  // High values (e.g., threat:18 = 18-20)

// Overlap Resolution
If user explicitly set threat:
  Remove threat values from error range
If user explicitly set error:
  Remove error values from threat range
```

### Supported Dice Types

Any standard polyhedral dice: d4, d6, d8, d10, d12, d20, d100, etc.

### Compatibility

- **Foundry VTT**: v11 minimum, verified on v12
- **Dice So Nice**: Requires the forked version (v5.1.9+)

---

## Troubleshooting

### Animations Don't Play

1. Verify you installed the **forked version** of Dice So Nice, not the original
2. Check that both modules are enabled in your world
3. Ensure the dice type is listed in the module settings (e.g., d20 for d20 rolls)
4. Verify your roll syntax includes the modifiers in square brackets

### Syntax Not Working

- Make sure modifiers are inside square brackets: `[error:1 threat:20]`
- Use colons, not equals signs: `threat:20` not `threat=20`
- The format is case-insensitive: `THREAT:20` works too

### Multiple Dice Issues

- The fork should handle multiple dice correctly
- If you experience crashes, please report them on the GitHub repository

---

## Credits

**Author:** Daedalus11069

**Special Thanks:**

- Dice So Nice original authors
- The Foundry VTT community for support and feedback

---

## License & Links

- **Repository:** https://github.com/Daedalus11069/foundry-dangerously-threatening-dice-module
- **Dice So Nice Fork:** https://github.com/Daedalus11069/dice-so-nice-fork
- **Issues:** Report bugs on GitHub

---

## Changelog

### v1.2.0

- **Smart Overlap Handling**: Explicitly set threat/error values now take priority over defaults
  - `threat:1` means rolling 1 is a critical, NOT a fumble (removes 1 from error range)
  - `error:20H` means rolling 20 is a fumble, NOT a critical (removes 20 from threat range)
- **Improved Auto-Detection**: `threat:N` now smartly detects low vs high anchor based on value
  - `threat:1` on d20 → just 1 (not 1-20!)
  - `threat:5` on d20 → 1-5 (low anchor since 5 ≤ 10)
  - `threat:18` on d20 → 18-20 (high anchor since 18 > 10)
- **d100 Special Handling**: No default animations for d100 rolls
  - Prevents false triggers since a "1" on the dice could be 1, 11, 21, 31, etc.
  - You must explicitly set `threat:` and `error:` for d100 rolls

### v1.1.0

- **Roll-Under System Support**: Full support for systems where low rolls are good (Call of Cthulhu, GURPS, etc.)
  - Use `threat:NL` to trigger critical animations on low rolls (e.g., `threat:5L` = 1-5)
  - Use `error:NH` to trigger failure animations on high rolls (e.g., `error:95H` = 95-100)
- Improved range calculation logic for edge cases
- Better documentation with roll-over vs roll-under examples

### v1.0.0

- Initial release
- Basic threat and error range support
- Advanced directional anchoring (H/L suffixes)
- Auto-detection for high/low ranges
- Configurable animations per dice type
- Stable multi-dice rolling with forked Dice So Nice
