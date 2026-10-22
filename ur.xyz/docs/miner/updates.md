---
published: 2026-10-21
description: Keep the UR miner up to date. How the installers update it automatically, how to check, change or turn off updates, stay on one version, and update by hand.
---

# Keep the miner up to date

New miner releases fix problems and keep your miner compatible with the network, so it's best to run the latest one. If you used an [installer](/docs/miner/install#the-installers), there's nothing to do: it updates the miner automatically.

## Automatic updates (installers)

Every installer turns on automatic updates. By default it checks for a newer release on the [build releases page](https://github.com/urnetwork/build/releases) about every 6 hours. When there is one, it downloads it, checks it against the SHA-256 GitHub lists for it, makes sure the new program runs, and swaps it in. A miner that was running is restarted on the new version; one you stopped stays stopped. If anything fails, the old version keeps running. Your identity in `~/.urnetwork` isn't touched, and your update and start settings are kept.

How each system keeps to the schedule:

- **Linux:** a systemd timer, every 6 hours plus up to an hour of random delay.
- **macOS:** a launchd agent that checks four times a day at times picked once per Mac, and again when you log in, so a Mac that was asleep or off catches up. (Not yet tested on a real Mac.)
- **Windows:** an updater that starts, hidden, when you sign in and checks once the interval has passed, so sleep and restarts don't skip a check. (Not yet tested on a real PC.)

An update also brings `urnet-tools` itself up to date. On Linux it never moves you to an older release.

To see which version you have, and whether a newer one is out, or to update straight away:

```bash
urnet-tools version
urnet-tools update
```

### Change or turn off automatic updates

Automatic updates are on by default, and we recommend leaving them on. To see whether they're on, and how often they check:

```bash
urnet-tools auto-update
```

To check less often, choose `6h` (the default), `daily`, `weekly` or `monthly`. This keeps updates on or off as they are:

```bash
urnet-tools auto-update --interval daily
```

To turn them off, and back on:

```bash
urnet-tools auto-update off
urnet-tools auto-update on
```

With automatic updates off, run `urnet-tools update` yourself from time to time. Your choice is kept when you update or run the installer again. To install with updates off from the start, pass `--no-auto-update` to the macOS installer, or `-NoAutoUpdate` to the Windows one. On Linux, run `urnet-tools auto-update off` right after installing.

### Stay on one version

To install a particular release, give its tag from the releases page:

```bash
urnet-tools reinstall -t <version>
```

Then turn automatic updates off with `urnet-tools auto-update off`, or the next check will move you to the latest release again.

## Manual installs

A [manual download](/docs/miner/install#manual-download-linux-and-macos) or a [source build](/docs/miner/install#build-from-source) doesn't update itself. To switch to automatic updates, stop your own service and run an [installer](/docs/miner/install#the-installers): it keeps your identity. To update:

1. Download the new release and unpack it, as in [Manual download](/docs/miner/install#manual-download-linux-and-macos).
2. Stop the miner (Ctrl-C, or `systemctl --user stop urnetwork-provider.service` for the [service](/docs/miner/run#with-a-manual-install-linux)).
3. Replace the program: `install -m 755 <os>/<arch>/provider "$HOME/.local/bin/provider"`.
4. Start the miner again with `provider provide`, or `systemctl --user start urnetwork-provider.service`.

Don't add `--allow-client-registration` after an update: the miner keeps its identity in `~/.urnetwork`, so it continues as the same device.

Watch the [releases page](https://github.com/urnetwork/build/releases) for new versions; GitHub can notify you about each release. A manual install has no version command: `provider --version` prints the help instead. The [status page](/docs/miner/run#the-status-page) shows the running version.
