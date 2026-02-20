# Quick Profile Switcher V2

A SillyTavern extension that throws a quick-access chevron next to your send button. It lets you swap API profiles on the fly without digging through menus, plus it has a built-in roulette mode.

## What it does

- **Quick Swap**: Click the chevron, pick a profile, done.
- **Roulette Mode**: Click the dice icon, check multiple profiles. Every time you send a message, it spins and auto-swaps to one of them (without repeating the same one twice in a row if possible).
- **Native Theme Support**: Uses SillyTavern's CSS vars. It just matches your current theme perfectly.
- **No Input Bugs**: Uses FontAwesome icons instead of native HTML checkboxes, avoiding those weird rendering bugs on different themes/browsers.

## Install

1. Download or clone this repo.
2. Drop the `Quick-Profile-Switcher` folder straight into:
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```
3. Hit F5 to reload SillyTavern.

## Usage

1. **Manual Switch**: Click the chevron `⌃` by the send button and pick a profile.
2. **Roulette**: Open the menu, hit the `🎲` dice icon. Checkboxes will pop up next to the profiles. Check the ones you want. Send your messages and watch the chevron spin.

It saves your roulette picks automatically, so you don't gotta do it every time you refresh.

---
**License**: MIT
