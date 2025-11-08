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

The module now supports **directional anchoring** with optional `H` or `L` suffixes:

```
threat:N[H|L]
error:N[H|L]
```

**Direction Modifiers:**

- **No suffix (default)**: Auto-detects based on value
  - `error:3` on d20 → rolls 1-3 (low range)
  - `error:99` on d100 → rolls 99-100 (high range, auto-detected)
  - `threat:18` on d20 → rolls 18-20 (high range, auto-detected)
- **`H` (High-anchored)**: Always counts from the highest values
  - `error:3H` on d20 → rolls 18-20 (top 3 results)
  - `threat:2H` on d20 → rolls 19-20 (top 2 results)
- **`L` (Low-anchored)**: Always counts from the lowest values
  - `error:3L` on d20 → rolls 1-3 (bottom 3 results)
  - `threat:3L` on d20 → rolls 3-20 (from 3 to max)

**Auto-Detection Logic:**

- If the value is **greater than half the dice faces** and no direction is specified, it's treated as high-anchored
- Example: `threat:15` on d20 automatically becomes the top 6 values (15-20) because 15 > 10

### Examples

#### Basic Examples

```
/roll 1d20[Attack Roll error:1 threat:20]
```

- Error animation on rolling 1
- Threat animation on rolling 20

```
/r 1d20[Skill Check error:3 threat:18]
```

- Error animation on rolls 1-3
- Threat animation on rolls 18-20

```
/roll 4d6[Damage threat:6]
```

- Threat animation on any die showing 6
- No error animation (not specified)

#### Advanced Anchoring Examples

```
/roll 1d100[Percentile Check error:5 threat:95]
```

- Error: 1-5 (low range, auto-detected)
- Threat: 95-100 (high range, auto-detected)

```
/r 1d20[Fumble Check error:3H]
```

- Error: 18-20 (top 3 values, explicitly high-anchored)

```
/roll 1d12[Wild Magic threat:2H]
```

- Threat: 11-12 (top 2 values)

```
/r 1d20[Custom threat:10L error:2H]
```

- Threat: 10-20 (from 10 to max, low-anchored)
- Error: 19-20 (top 2 values, high-anchored)

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
If direction is 'H' or value > faces/2:
  Range = [faces - (N - 1), faces]  // Top N values
Else:
  Range = [1, N]  // Bottom N values

// Threat (Critical) Range
If direction is 'H' or value > faces/2:
  Range = [faces - (N - 1), faces]  // Top N values
Else:
  Range = [N, faces]  // From N to max
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

### v1.0.0

- Initial release
- Basic threat and error range support
- Advanced directional anchoring (H/L suffixes)
- Auto-detection for high/low ranges
- Configurable animations per dice type
- Stable multi-dice rolling with forked Dice So Nice
