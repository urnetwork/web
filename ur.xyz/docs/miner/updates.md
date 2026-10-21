---
published: 2026-10-21
description: Keep the UR miner up to date. How automatic updates work with the Linux installer, how to check, pause or pin them, and how to update a manual install.
---

# Keep the miner up to date

New miner releases fix problems and keep your miner compatible with the network, so it's best to run the latest one. If you used the Linux installer, there's nothing to do: it updates automatically.

## Automatic updates (Linux installer)

The [Linux installer](/docs/miner/install#linux-installer) sets up a daily update check on systems with systemd. Once a day, it looks for a newer release on the [build releases page](https://github.com/urnetwork/build/releases). When there is one, it stops the miner, installs the new version and starts the miner again. Your identity in `~/.urnetwork` isn't touched.

The installer switches the daily check on for your next login or restart. To start it straight away, run:

```bash
urnet-tools auto-update on
```

To see which version you have, and whether a newer one is out:

```bash
urnet-tools --version
```

To update straight away instead of waiting for the daily check:

```bash
urnet-tools update
```

### Change or turn off automatic updates

Automatic updates are on by default, and we recommend leaving them on. To see whether they're on:

```bash
urnet-tools auto-update
```

To check weekly or monthly instead of daily:

```bash
urnet-tools auto-update on --interval weekly
```

To turn them off, and back on:

```bash
urnet-tools auto-update off
urnet-tools auto-update on
```

With automatic updates off, run `urnet-tools update` yourself from time to time. Each update or reinstall sets the installer's defaults again: daily automatic updates on, and the service starting by itself. Run `urnet-tools auto-update off` again afterwards if you want them to stay off.

### Stay on one version

To install a particular release, give its tag from the releases page:

```bash
urnet-tools reinstall -t <version>
```

Then turn automatic updates off with `urnet-tools auto-update off`, or the next daily check will move you to the latest release again.

## Manual installs

A [manual download](/docs/miner/install#manual-download-linux-and-macos) or a [source build](/docs/miner/install#build-from-source) doesn't update itself. To update:

1. Download the new release and unpack it, as in [Manual download](/docs/miner/install#manual-download-linux-and-macos).
2. Stop the miner (Ctrl-C, or `systemctl --user stop urnetwork-provider.service` for the [service](/docs/miner/run#with-a-manual-install-linux)).
3. Replace the program: `install -m 755 <os>/<arch>/provider "$HOME/.local/bin/provider"`.
4. Start the miner again with `provider provide`, or `systemctl --user start urnetwork-provider.service`.

Don't add `--allow-client-registration` after an update: the miner keeps its identity in `~/.urnetwork`, so it continues as the same device.

Watch the [releases page](https://github.com/urnetwork/build/releases) for new versions; GitHub can notify you about each release.
