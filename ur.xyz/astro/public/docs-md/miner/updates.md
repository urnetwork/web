
# Keep the miner up to date

New miner releases fix problems and keep your miner compatible with the network, so it's best to run the latest one. If you used the Linux or Windows installer, it updates automatically; on Linux, see the one thing to check below. There's no macOS installer yet, so a Mac is updated [by hand](#manual-installs).

## Automatic updates (Linux installer)

The [Linux installer](https://ur.xyz/docs/miner/install#linux-installer) sets up an update check on systems with systemd, daily by default. Each time, it looks for a newer release on the [build releases page](https://github.com/urnetwork/build/releases). When there is one, it stops the miner, installs the new version and starts the miner again. Your identity in `~/.urnetwork` isn't touched.

The installer switches the daily check on for your next login or restart. To start it straight away, run:

```bash
urnet-tools auto-update on
```

> **Known issue:** after each update, whether automatic or with `urnet-tools update` or `reinstall`, the check stays paused until the next restart or login, even though `urnet-tools auto-update` says `enabled`. On an always-on server that can mean no more updates. After each update, run `urnet-tools auto-update on` again, adding `--interval weekly` or `--interval monthly` if you use one, because `on` on its own sets the check back to daily.

To see which version you have, and whether a newer one is out:

```bash
urnet-tools --version
```

To update straight away instead of waiting for the next check:

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

## Automatic updates (Windows installer)

The [Windows installer](https://ur.xyz/docs/miner/install#windows-installer) turns on automatic updates. A small updater starts, hidden, when you log in. Once you've been signed in for a full day (or week or month, if you changed the frequency), it runs `urnet-tools update`, which installs a newer release if there is one. The wait starts again at each sign-in, so a PC that's never signed in for a full day doesn't update by itself: run `urnet-tools update` now and then. Your identity in `%USERPROFILE%\.urnetwork` isn't touched.

```powershell
urnet-tools version               # installed version, and whether a newer one is out
urnet-tools update                # update now
urnet-tools auto-update-freq      # asks: day, week or month
urnet-tools auto-update-disable   # turn automatic updates off
urnet-tools auto-update-enable    # and back on
```

`urnet-tools auto-start-disable` also turns automatic updates off; run `urnet-tools auto-update-enable` afterwards to keep them.

## Manual installs

A [manual download](https://ur.xyz/docs/miner/install#manual-download-linux-and-macos) or a [source build](https://ur.xyz/docs/miner/install#build-from-source) doesn't update itself. To update:

1. Download the new release and unpack it, as in [Manual download](https://ur.xyz/docs/miner/install#manual-download-linux-and-macos).
2. Stop the miner (Ctrl-C, or `systemctl --user stop urnetwork-provider.service` for the [service](https://ur.xyz/docs/miner/run#with-a-manual-install-linux)).
3. Replace the program: `install -m 755 <os>/<arch>/provider "$HOME/.local/bin/provider"`.
4. Start the miner again with `provider provide`, or `systemctl --user start urnetwork-provider.service`.

Don't add `--allow-client-registration` after an update: the miner keeps its identity in `~/.urnetwork`, so it continues as the same device.

Watch the [releases page](https://github.com/urnetwork/build/releases) for new versions; GitHub can notify you about each release. A manual install has no version command: `provider --version` prints the help instead. The [status page](https://ur.xyz/docs/miner/run#the-status-page) shows the running version.
