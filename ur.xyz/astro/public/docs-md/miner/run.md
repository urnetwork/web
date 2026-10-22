
# Run and monitor the miner

This page assumes you've [installed](https://ur.xyz/docs/miner/install) the miner and [set it up](https://ur.xyz/docs/miner#2-run-setup). If you used an installer, type `urnetwork` wherever this page says `provider`.

## Start and stop

> **Older miners.** `start`, `status`, `doctor` and `service` came with the miner releases of late October 2026. On an older release, use `provider provide` and [a service of your own](#a-service-of-your-own).

To mine in a terminal:

```bash
provider start
```

It shows a short live view (Connecting, Connected, ● Mining) and runs until you stop it with Ctrl-C. The detailed log goes to `miner.log` in `~/.urnetwork`; add `-v` to see it in the terminal instead.

The first start on a new device asks before registering it, and saves its identity in `~/.urnetwork`. Every later start reuses that identity. In a script, where nobody can answer, add `--allow-client-registration` to the first start. `provider provide` is the same command with the full log output, for scripts and services.

Only register a genuinely new device. Registering never replaces an identity the miner already has, but don't delete files to get past an error about a missing or mismatched identity: see [Troubleshooting](https://ur.xyz/docs/miner/troubleshooting#the-miner-stops-straight-away) instead.

Run every miner command, and the background service, as the same user. Each user has their own `~/.urnetwork`.

## Choose an operator

The miner serves the default operator, `bringyour.com` (`https://api.bringyour.com` and `wss://connect.bringyour.com`), unless you choose another. To serve a different operator, choose it **before** the first start, using the URLs it publishes:

```bash
provider network use https://api.example.net wss://connect.example.net
provider network
```

API URLs start with `https://` and connect URLs with `wss://` (plain `http://` and `ws://` work only for a local test server). `provider network` on its own shows the operator in effect, and `provider network reset` goes back to the default. (On an older release, use `provider choose_network <api_url> <connect_url>`, `--show` and `--reset`.) The choice is saved and applies to every later command. Then run `provider setup`, or `provider login`, with an auth code from that operator.

Changing the operator doesn't move a device that's already registered to the new one. Keep each operator in its own state and account. To serve every operator in the published list at once, see [Mine every listed operator](https://ur.xyz/docs/miner/advanced#mine-every-listed-operator).

## Run in the background

### With an installer

The [installers](https://ur.xyz/docs/miner/install#the-installers) already run the miner in the background: a systemd user service on Linux, a launchd agent on macOS and Startup shortcuts on Windows. Manage it with `urnet-tools`:

```bash
urnet-tools start          # start it (no error if it's already running)
urnet-tools status         # version, signed in, running, updates; exits 3 when it isn't running
urnet-tools logs           # follow its log; Ctrl-C to stop reading
urnet-tools restart
urnet-tools stop           # stop it until you start it again, restart (Linux) or log in again (macOS, Windows)
```

On Linux, `provider service start`, `stop`, `status` and `logs` work on the installer's service too.

It starts by itself at boot on Linux (when lingering is on; the installer tries to turn it on), when you log in on macOS, and when you sign in on Windows, where it also **stops when you sign out**. `urnet-tools auto-start off` stops it starting by itself, and `urnet-tools auto-start on` turns that back on.

If the miner crashes, systemd on Linux restarts it after 30 seconds and launchd on macOS after 60. On Windows, a miner that stops stays stopped until you run `urnet-tools start` or sign in again. A miner that stops cleanly, for example because the device [isn't registered](https://ur.xyz/docs/miner/troubleshooting#the-miner-stops-straight-away), stays stopped: `urnet-tools status` then says it isn't running.

### With provider service (Linux and macOS)

`provider setup` offers to set this up. To do it yourself, stop the miner if it's running in a terminal, then:

```bash
provider service install
```

On Linux it installs a systemd user service, `urnetwork-provider.service`, that starts at boot; it turns on lingering so the service keeps running after you log out, or prints the `sudo loginctl enable-linger` command to run. On macOS it installs a launchd agent that starts when you log in. Either way it starts the miner now, restarts it if it crashes, and checks for [updates](https://ur.xyz/docs/miner/updates) every 6 hours. To manage it:

```bash
provider service status
provider service logs --follow   # Ctrl-C to stop reading
provider service restart
provider service stop
provider service uninstall       # your sign-in and identity are kept
```

On Linux, `provider service install` won't add a second service beside an installer's `urnetwork.service`. On macOS it can't see the installer's agent yet, so if you used the macOS installer, keep using `urnet-tools` and don't install a second service.

If you followed an older version of this guide and created `~/.config/systemd/user/urnetwork-provider.service` yourself, remove it first, because `provider service install` uses that name:

```bash
systemctl --user disable --now urnetwork-provider.service
rm ~/.config/systemd/user/urnetwork-provider.service
systemctl --user daemon-reload
```

### A service of your own

Without systemd or launchd, on an older release, or to run the miner with options of your own, run `provider provide` under your own service manager, `tmux` or `screen`. On Linux, for example, create `~/.config/systemd/user/ur-miner.service`:

```ini
[Unit]
Description=UR miner

[Service]
ExecStart=%h/.local/bin/provider provide
Restart=always
RestartSec=10
UMask=0077

[Install]
WantedBy=default.target
```

Stop the miner if it's running, then enable the service and follow its log:

```bash
systemctl --user daemon-reload
systemctl --user enable --now ur-miner.service
journalctl --user -u ur-miner.service -f
```

To keep it running after you log out, turn on lingering once: `sudo loginctl enable-linger "$USER"`. Leave `--allow-client-registration` out of the service command, so a missing identity makes the service fail instead of registering a new device without you noticing. Don't run this and `provider service` at the same time.

On Windows, `provider service` doesn't run the miner in the background yet. Use the [Windows installer](https://ur.xyz/docs/miner/install#windows), or leave `provider start` running in its own PowerShell window; it reconnects by itself.

## Check it's working

### Status and doctor

```bash
provider status
```

One line each for the miner, sign-in, the device's registration, the connection and updates, and the command to run next when something isn't right. It exits with 0 when all is well, 3 when the device needs setup and 4 when the miner isn't running or isn't connected. `provider status --json` prints the same for scripts and monitoring.

```bash
provider doctor
```

Looks for why the miner can't sign in or connect: whether the state folder is private, DNS, the connection to the operator, a proxy or firewall that inspects TLS, the clock, and whether updates can install. It names the fix for each problem it finds.

### The log

`provider start` writes its log to `miner.log` in `~/.urnetwork`. For a background miner, use `provider service logs --follow`, or `urnet-tools logs` with an installer.

The miner writes a lot of log lines, in a few formats; most of them are routine. These lines are good signs:

- `"event":"identity_available"`: it found or created this device's identity.
- The miner keeps running. If it stops by itself within a few seconds, something is wrong, even when its exit looks clean.

Warning signs:

- A JSON line with `"event":"startup_recovery_required"`, then the program exits: see [Troubleshooting](https://ur.xyz/docs/miner/troubleshooting#the-miner-stops-straight-away).
- The word `refused` repeating every few seconds: the operator isn't accepting the connection. See [Troubleshooting](https://ur.xyz/docs/miner/troubleshooting#the-log-keeps-saying-refused).

Add `-v`, or `-vv` for more, to see more detail.

### The status page

The miner can serve a small status page in JSON. It's off by default; turn it on with `--port`:

```bash
provider provide --port=8080
```

Then, on the same machine:

```bash
curl -s http://127.0.0.1:8080/
```

It shows the miner's `version` (release builds have one), its `host` name, and a `diagnostics` section with the latest outcome of sign-in (`authentication`), `keys`, `extender` and `runtime`. The top-level `"status":"ok"` only means the miner process is up; it doesn't mean it's connected or earning, so read the `diagnostics` too.

The status page listens on every network interface, not just the local one. Block that port in your firewall, or allow only your monitoring network.

## Useful options

| Option | What it does |
| --- | --- |
| `--max-memory=1gib` | A soft memory target, in bytes or with `b`, `kib`, `mib` or `gib`. Without it, the miner picks one from the computer's memory. |
| `-v`, `-vv` | More log detail. |
| `--port=<port>` | Serve the [status page](#the-status-page) on that port. `0`, the default, turns it off. |

`provider auth-provide` signs in and starts in one command. A new device still needs `--allow-client-registration`. All options are in `provider help all` and in the [Reference](https://ur.xyz/docs/miner/reference).

## Back up your miner

Everything that makes this device *your* miner is in `~/.urnetwork`: its identity key, its registration, its sign-in and your signed wallet history. If you lose it, you can't recover the device, even though you can still sign in to your account.

- Stop the miner (or its service) before you copy the folder, so nothing is half-written.
- Copy the **whole** folder, keep the copy private, and restore it as one piece.
- Never run two copies of the same folder at once, on one machine or two.

The [Reference](https://ur.xyz/docs/miner/reference#files-the-miner-keeps) lists each file in the folder.
