---
published: 2026-10-21
description: Run the UR miner day to day. Start and stop it, choose an operator, keep it running in the background, read its logs and status page, and back it up.
---

# Run and monitor the miner

This page assumes you've [installed](/docs/miner/install) the miner and [signed in](/docs/miner#2-sign-in). If you used the Linux installer, type `urnetwork` wherever this page says `provider`.

## Start and stop

The first start on a new device registers it, so it needs one extra flag:

```bash
provider provide --allow-client-registration
```

Every start after that is just:

```bash
provider provide
```

The miner runs in the foreground until you stop it with Ctrl-C. It reuses the identity it saved in `~/.urnetwork` on the first start.

Only use `--allow-client-registration` for a genuinely new device. It never replaces an identity the miner already has, but don't add it, or delete files, to get past an error about a missing or mismatched identity: see [Troubleshooting](/docs/miner/troubleshooting#the-miner-stops-straight-away) instead.

Run every miner command, and the background service, as the same user. Each user has their own `~/.urnetwork`.

## Choose an operator

The miner serves the default operator, `bringyour.com` (`https://api.bringyour.com` and `wss://connect.bringyour.com`), unless you choose another. To serve a different operator, choose it **before** the first start, using the URLs it publishes:

```bash
provider choose_network https://api.example.net wss://connect.example.net
provider choose_network --show
```

`--show` prints the operator in effect, and `provider choose_network --reset` goes back to the default. The choice is saved and applies to every later command. Then [sign in](/docs/miner#2-sign-in) with an auth code from that operator.

Changing the operator doesn't move a device that's already registered to the new one. Keep each operator in its own state and account. To serve every operator in the published list at once, see [Mine every listed operator](/docs/miner/advanced#mine-every-listed-operator).

## Run in the background

### With the Linux installer

The installer has already set up a user service named `urnetwork`. Once the device is registered and your wallet is set:

```bash
urnet-tools start          # start the service
urnet-tools status         # is it running?
urnet-tools stop           # stop it
journalctl --user -u urnetwork -f   # follow its log; Ctrl-C to stop reading
```

The service starts when you log in, and at boot when lingering is on (the installer tries to turn it on). `urnet-tools auto-start off` stops it starting by itself, and `urnet-tools auto-start on` turns that back on.

The installer's service doesn't restart the miner if it stops. If `urnet-tools status` shows it inactive, start it again with `urnet-tools start` and look at its log.

### With a manual install (Linux)

Create the file `~/.config/systemd/user/urnetwork-provider.service`:

```ini
[Unit]
Description=URnetwork provider

[Service]
ExecStart=%h/.local/bin/provider provide
Restart=always
RestartSec=10
UMask=0077

[Install]
WantedBy=default.target
```

Stop the miner if it's running in a terminal, then enable the service:

```bash
systemctl --user daemon-reload
systemctl --user enable --now urnetwork-provider.service
journalctl --user -u urnetwork-provider.service -f
```

To keep it running after you log out, turn on lingering once: `sudo loginctl enable-linger "$USER"`. Keep `--allow-client-registration` out of the service command, so a missing identity stops the miner instead of registering a new device without you noticing.

### On macOS

Run `provider provide` in a terminal window and leave it open, or under a process manager you already use. This guide doesn't include a background service recipe for macOS yet.

## Check it's working

### The log

The miner writes a lot of log lines, in a few formats; most of them are routine. These lines are good signs:

- `"event":"provider_started"`: the miner started.
- `"event":"identity_available"`: it found or created this device's identity.

Warning signs:

- A JSON line with `"event":"startup_recovery_required"`, then the program exits: see [Troubleshooting](/docs/miner/troubleshooting#the-miner-stops-straight-away).
- The word `refused` repeating every few seconds: the operator isn't accepting the connection. See [Troubleshooting](/docs/miner/troubleshooting#the-log-keeps-saying-refused).

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

It shows the miner's `version`, its `host` name, and a `diagnostics` section with the latest outcome of sign-in (`authentication`), `keys`, `extender` and `runtime`. The top-level `"status":"ok"` only means the miner process is up; it doesn't mean it's connected or earning, so read the `diagnostics` too.

The status page listens on every network interface, not just the local one. Block that port in your firewall, or allow only your monitoring network.

## Useful options

| Option | What it does |
| --- | --- |
| `--max-memory=1gib` | A soft memory target, in bytes or with `b`, `kib`, `mib` or `gib`. Without it, the miner picks one from the computer's memory. |
| `-v`, `-vv` | More log detail. |
| `--port=<port>` | Serve the [status page](#the-status-page) on that port. `0`, the default, turns it off. |

`provider auth-provide` signs in and starts in one command. A new device still needs `--allow-client-registration`. All options are in `provider --help` and in the [Reference](/docs/miner/reference).

## Back up your miner

Everything that makes this device *your* miner is in `~/.urnetwork`: its identity key, its registration, its sign-in and your signed wallet history. If you lose it, you can't recover the device, even though you can still sign in to your account.

- Stop the miner (or its service) before you copy the folder, so nothing is half-written.
- Copy the **whole** folder, keep the copy private, and restore it as one piece.
- Never run two copies of the same folder at once, on one machine or two.

The [Reference](/docs/miner/reference#files-the-miner-keeps) lists each file in the folder.
