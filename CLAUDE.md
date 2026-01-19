# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an "app a day" project containing standalone single-page web apps. Each app is a self-contained utility built with vanilla HTML, CSS, and JavaScript (no frameworks or build tools).

## Repository Structure

Each `dayN/` folder contains an independent web app:
- `index.html` - Entry point, open directly in a browser to run
- `styles.css` - Styling
- `app.js` - Application logic

**Current apps:**
- day1: **Fairly** - Repeat-aware group maker with local history
- day2: **TrialGuard** - Free trial reminder builder with ICS export
- day3: **Round Robin Mixer** - Multi-round group generator minimizing repeat pairings
- day4: **Return Window Tracker** - Return deadline tracker with calendar export

## Running Apps

Open any `dayN/index.html` directly in a browser. No build step or server required.

## Architecture Patterns

All apps follow the same conventions:
- Vanilla JS with DOM manipulation (no frameworks)
- Local-only data using `localStorage` with versioned keys (e.g., `fairly-history-v1`)
- Single `app.js` file with event binding at the bottom
- UI updates triggered by input events, computed reactively
- Copy-to-clipboard support with fallback for older browsers
