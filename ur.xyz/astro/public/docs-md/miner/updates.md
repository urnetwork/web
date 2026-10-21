
# Keep the miner up to date

New miner releases fix problems and keep your miner compatible with the network, so it's best to run the latest one. If you used the Linux installer, it updates automatically; see the one thing to check below.

## Automatic updates (Linux installer)

The [Linux installer](https://ur.xyz/docs/miner/install#linux-installer) sets up a daily update check on systems with systemd. Once a day, it looks for a newer release on the [build releases page](https://github.com/urnetwork/build/releases). When there is one, it stops the miner, installs the new version and starts the miner again. Your identity in `~/.urnetwork` isn't touched.

The installer switches the daily check on for your next login or restart. To start it straight away, run:

```bash
urnet-tools auto-update on
```

> **Known issue:** after each update, whether automatic or with `urnet-tools update` or `reinstall`, the daily check is set back to daily and stays paused until the next restart or login, even though `urnet-tools auto-update` says `enabled`. Run `urnet-tools auto-update on` again after an update, or restart the computer from time to time, so the checks keep running.

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

To check weekly or monthly instead of daily (write `--interval weekly` with a space; the `--interval=weekly` form that `urnet-tools --help` shows doesn't work):

```bash
urnet-tools auto-update on --interval weekly
```

To turn them off, and back on:

```bash
urnet-tools auto-update off
urnet-tools auto-update on
```

With automatic updates off, run `urnet-tools update` yourself from time to time. Each update or reinstall sets the installer's defaults again: daily automatic updates on (from the next restart or login), and the service starting by itself. Run `urnet-tools auto-update off` again afterwards if you want them to stay off.

### Stay on one version

To install a particular release, give its tag from the releases page, with a space after `-t`:

```bash
urnet-tools reinstall -t <version>
```

Then turn automatic updates off with `urnet-tools auto-update off`, or the next daily check will move you to the latest release again.

## Manual installs

A [manual download](https://ur.xyz/docs/miner/install#manual-download-linux-and-macos) or a [source build](https://ur.xyz/docs/miner/install#build-from-source) doesn't update itself. To update:

1. Download the new release and unpack it, as in [Manual download](https://ur.xyz/docs/miner/install#manual-download-linux-and-macos).
2. Stop the miner (Ctrl-C, or `systemctl --user stop urnetwork-provider.service` for the [service](https://ur.xyz/docs/miner/run#with-a-manual-install-linux)).
3. Replace the program: `install -m 755 <os>/<arch>/provider "$HOME/.local/bin/provider"`.
4. Start the miner again with `provider provide`, or `systemctl --user start urnetwork-provider.service`.

Don't add `--allow-client-registration` after an update: the miner keeps its identity in `~/.urnetwork`, so it continues as the same device.

Watch the [releases page](https://github.com/urnetwork/build/releases) for new versions; GitHub can notify you about each release.
