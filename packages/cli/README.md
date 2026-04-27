# @crazydev/bambu-cli

CLI for Bambu Lab printers. Built on top of [`@crazydev/bambu`](../sdk).

## Install

```bash
# via npm
npm i -g @crazydev/bambu-cli

# via Homebrew (planned)
brew install MADEiN83/tap/bambu
```

## Usage

```bash
bbu login                    # Login to Bambu Cloud (interactive, MFA-aware)
bbu devices                  # List bound printers
bbu status                   # Live status of all printers
bbu watch --printer=<id>     # Live MQTT stream for one printer
bbu tasks                    # Recent print tasks
bbu pause --printer=<id>     # Pause an active print
bbu resume --printer=<id>
```

## License

MIT
