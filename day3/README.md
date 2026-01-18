# Round Robin Mixer

Round Robin Mixer is a tiny web app that builds multi-round groups while minimizing repeated pairings. It keeps everything in the browser and works offline once loaded.

## How to run

Open `index.html` in a browser.

## How it works

The generator shuffles the roster multiple times per round and scores each candidate based on how often people have already been paired. It keeps the grouping with the lowest repeat score and updates pair history for the next round.
