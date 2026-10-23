---
published: 2026-10-21
description: Keep the UR miner up to date. How the installers and the miner's own service update it automatically, how to check, change or turn off updates, and stay on one version.
---

# Keep the miner up to date

New miner releases fix problems and keep your miner compatible with the network, so it's best to run the latest one. If you used an [installer](/docs/miner/install#the-installers), or let `provider setup` install the background service, there's nothing to do: the miner is updated automatically.

## Automatic updates (installers)

Every installer turns on automatic updates, except on Linux without a systemd user session and on Windows when you install a particular version with `-Tag`. By default it checks for a newer release on the [build releases page](https://github.com/urnetwork/build/releases) about every 6 hours. When there is one, it downloads it, checks it against the SHA-256 GitHub lists for it (a release without one isn't installed), makes sure the new program runs, and swaps it in. A miner that was running is restarted on the new version; one you stopped stays stopped. If anything fails, the old version keeps running. Your identity in `~/.urnetwork` isn't touched, and your update and start settings are kept.

How each system keeps to the schedule:

- **Linux:** a systemd timer, every 6 hours plus up to an hour of random delay.
- **macOS:** a launchd agent that checks four times a day at times picked once per Mac, and again when you log in, so a Mac that was asleep or off catches up.
- **Windows:** an updater that starts, hidden, when you sign in, wakes every hour and checks once the interval has passed, so sleep and restarts don't skip a check.

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

## Automatic updates (provider service)

The [background service](/docs/miner/run#with-provider-service) that `provider setup` or `provider service install` sets up also keeps the miner up to date. It checks the [build releases page](https://github.com/urnetwork/build/releases) every 6 hours: on Linux from 15 minutes after the computer starts, plus up to an hour of random delay; on macOS from when you log in; on Windows from 15 minutes after you sign in, plus up to an hour of random delay. After a release, each miner waits its own random share of 16 hours, so every miner has it within a day without all of them restarting at once.

An update checks the download against the SHA-256 GitHub lists for it (that catches a damaged download), keeps the previous program beside the new one, and restarts the service. If the new version doesn't come back within 10 minutes (connected again, if it was connected before), the previous one is put back, and that release is skipped for a week. Your identity in `~/.urnetwork` isn't touched.

```bash
provider update --check    # is a newer release out?
provider update            # update now
provider update --status   # automatic update settings and the last check
```

The program's folder has to be writable by the service's user; `provider doctor` checks this. A miner an installer set up keeps updating through `urnet-tools`, and `provider update` runs it for you.

### Turn off the miner's own updates

Automatic updates are on by default, and we recommend leaving them on. To turn them off, and back on:

```bash
provider update --off
provider update --on
```

You can also install the service with updates off: `URNETWORK_AUTO_UPDATE=0 provider service install`. That doesn't affect a miner an installer set up; use `urnet-tools auto-update off` there. With updates off, run `provider update` yourself from time to time.

## Without automatic updates

A [source build](/docs/miner/install#build-from-source) never updates itself: build it again. A miner you run in a terminal, or under [a service of your own](/docs/miner/run#a-service-of-your-own), updates with `provider update`; then restart it.

Watch the [releases page](https://github.com/urnetwork/build/releases) for new versions; GitHub can notify you about each release. `provider --version` prints the version you have.
