# Browser Games

Two games written in plain JavaScript that run in the browser without a build step.

| Game | Description | Stack |
|---|---|---|
| [`recursion`](recursion) | **Recursion: Object-1988.** A first-person 3D narrative game. The player explores an apartment, the stairwell and the neighbours' flats, reads notes and letters and works with ISKRA-OS, an in-game operating system with a file manager, mail, terminal and browser. | Three.js 0.160, ES modules |
| [`underhood`](underhood) | **Underhood.** A top-down pixel-art open world. The map is generated in chunks from noise-based biomes, with wind, ambient audio, a day-night cycle and enterable buildings. | Phaser 3.80, ES modules |

## Running locally

Both games use ES modules, so they must be served over HTTP rather than opened as files:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000/` for the game selector, or `/recursion/` and `/underhood/` directly. The repository root is ready for GitHub Pages.

## Controls

**Recursion**

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Look around |
| `E` | Interact |
| `Esc` | Release the cursor |
| `F` | Restart |

Gamepad and touch controls are supported.

**Underhood**

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| `E` | Interact, enter buildings |

On touch devices an on-screen joystick and buttons are shown; gamepads are supported.

## Structure

```
recursion/
├── js/world/      Apartment, hallway and neighbour scenes
├── js/os/         ISKRA-OS: window manager, virtual file system, apps
├── js/ui/         HUD, dialogue, letters, gamepad and touch input
└── js/data/       In-game texts
underhood/
├── src/world/     Chunk manager, biome and noise generators, wind
├── src/scenes/    Boot, preload, world and UI scenes
├── src/systems/   Day-night cycle, ambient audio
└── src/locations/ Building interiors
```

## License

[MIT](LICENSE) © Vadym Zelenko
