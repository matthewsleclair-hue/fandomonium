# Fandomonium

Movie trivia for 2 to 4 teams around one screen. 215 questions across Harry Potter, Marvel, Star Wars, Disney & Pixar and Lord of the Rings.

**[Play in your browser](https://matthewsleclair-hue.github.io/fandomonium/play/)** · **[Download for Windows](https://github.com/matthewsleclair-hue/fandomonium/releases/latest/download/Fandomonium.exe)** · **[Website](https://matthewsleclair-hue.github.io/fandomonium/)**

![A Harry Potter question answered correctly for 200 points](docs/screenshots/answered.webp)

## How a game runs

Each round, every team gets its own question on the clock:

- **Trivia**: four answers, one right (200 points, 20 seconds)
- **Odd one out**: spot the one that doesn't belong (200 points)
- **Put it in order**: release dates, story order and more (300 points, 35 seconds)

Then comes **All play**. A puzzle reveals itself bit by bit while its value drops from 500 to 100, and the first team to buzz gets a shot:

- **Scramble**: letters slide into place one at a time
- **Who am I?**: four clues, hardest first
- **Emoji movie**: a film spelled out in emoji

A wrong pick locks that team out of the puzzle. The last round is worth double.

![All play scramble with team buzzers](docs/screenshots/scramble.webp)

## Controls

| Key | What it does |
| --- | --- |
| Q, P, Z, M | Buzz in for teams 1 to 4 |
| 1–4 or A–D | Pick an answer |
| Space or Enter | Next question, or skip the curtain |
| F11 | Full screen (Windows app) |

On a touchscreen, tap the buzzers and answers instead.

## Add your own questions

Every question lives in [`src/bank.js`](src/bank.js). Put the right answer first; the game shuffles the choices.

```js
hp:{
  mc:[
    ["What’s the name of Harry’s owl?", "Hedwig", "Errol", "Pigwidgeon", "Hermes"],
  ],
  scr:[["HOGWARTS", "Place"]],
  who:[["Dobby", ["clue 1", "clue 2", "clue 3", "clue 4"], ["Kreacher", "Winky", "Griphook"]]],
}
```

To add a whole new fandom, add a key to `BANK` in `src/bank.js` and a matching entry in `CATS` in `src/game.html` (name, colour, icon).

## Build it yourself

Needs [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm start        # play it in a window
npm run dist     # build release/Fandomonium.exe
npm run site     # build the website into site/
```

| File | What it is |
| --- | --- |
| `src/game.html` | The whole game: layout, styles and logic |
| `src/bank.js` | Every question |
| `site-src/index.html` | The website's landing page |
| `main.js` | The Electron window for the Windows app |
| `build-web.js`, `build-site.js` | Inline the fonts and questions, assemble the site |

Pushing to `main` rebuilds and deploys the website. Pushing a tag like `v1.1.0` builds `Fandomonium.exe` on Windows and attaches it to a GitHub release.

## Notes

The Windows app isn't code-signed, so Windows may show "Windows protected your PC" the first time. Click **More info**, then **Run anyway**.

Fandomonium is fan-made trivia and isn't affiliated with or endorsed by Warner Bros., Disney, Marvel Studios, Lucasfilm or the Tolkien Estate. Film titles and character names belong to their owners.
