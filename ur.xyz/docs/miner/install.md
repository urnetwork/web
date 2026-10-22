---
published: 2026-10-21
description: Install the UR miner. The installers for Linux, macOS and Windows with automatic updates, a manual download, and building the provider from source.
---

# Install the miner

The miner is a single program, `provider`. There are three ways to get it:

| Way | Systems | Updates | Best for |
| --- | --- | --- | --- |
| [Installer](#the-installers) | Linux, macOS, Windows | Automatic | Most people |
| [Manual download](#manual-download-linux-and-macos) | Linux, macOS | Automatic, with `provider setup` | Full control |
| [Build from source](#build-from-source) | Linux, macOS | By hand | Developers and auditors |

> **Windows** mining needs a miner release from late October 2026 or later, and hasn't been tested on a real PC yet.

Whichever you choose, the miner keeps its identity in `~/.urnetwork` (`%USERPROFILE%\.urnetwork` on Windows), so you can switch later without registering again. Back that folder up first, and stop the old way's background job before starting the new one, so two copies never run at once. After installing, go back to [the quick start](/docs/miner#2-run-setup).

## The installers

Each installer puts the miner in your own user folder (no administrator rights needed), runs it in the background, keeps it up to date, and gives you one command to manage it all: `urnet-tools`. They live in the [`scripts` folder of urnetwork/connect](https://github.com/urnetwork/connect/tree/main/scripts).

All three:

- download the latest release for your processor, check its SHA-256 and install only your machine's program;
- install the miner as **`urnetwork`**: type `urnetwork` wherever this guide says `provider`, including in commands the miner prints for you to copy;
- ask for your auth code if you aren't signed in yet (press Enter to do it later; `--auth-code <code>`, or `-AuthCode` on Windows, signs in without asking);
- register a new device on its first start, once you've signed in;
- turn on [automatic updates](/docs/miner/updates), every 6 hours by default;
- can be run again at any time: a second run updates in place and keeps your settings and your identity.

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Linux.sh | sh
```

Then open a new terminal, or run the `export PATH=…` line it prints. It runs on 64-bit and 32-bit Intel, AMD and ARM, including a Raspberry Pi on a 32-bit OS, and needs `curl` or `wget`. It:

- installs `urnetwork` and `urnet-tools` into `~/.local/share/urnetwork-provider/bin` and adds that folder to your `PATH` in `~/.bashrc`, creating the file if needed. Pass `-B` to leave `~/.bashrc` alone;
- runs the miner as a systemd user service, `urnetwork.service`, with an update timer, and turns on lingering so the service keeps running after you log out (if that needs an administrator, it prints the `sudo loginctl enable-linger` command to run);
- in a shell without a systemd user session (a `sudo su` shell, many containers, WSL), installs anyway and tells you how to run the miner in the foreground.

Options go after `sh -s --`, for example `curl -fsSL … | sh -s -- --no-start`. Run it with `--help` for all of them.

### macOS

> Not yet tested on a real Mac.

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_macOS.sh | sh
```

Then open a new Terminal window. It needs macOS 12 or later and nothing else, and it works on Apple silicon and Intel Macs (from a Rosetta terminal too, it picks the native build). It:

- installs `urnetwork` and `urnet-tools` into `~/.local/share/urnetwork-provider/bin` and adds that folder to your `PATH` in `~/.zshrc` (and in `~/.bash_profile` if you use bash). Pass `-B` to leave them alone;
- runs the miner as a launchd agent that starts when you log in and restarts the miner if it crashes. macOS may show a "Background Items Added" notification; that's expected. It's listed as `urnet-tools` under System Settings → General → Login Items;
- clears the download's quarantine flag for you, and refuses to run with `sudo`.

`--dry-run` prints everything it would do without changing anything, and `-y` answers every question itself. The miner's log is in `~/Library/Logs/urnetwork/`.

### Windows

> **Not yet tested on a real PC.** Mining on Windows needs a miner release from late October 2026 or later; older ones can't register a new device on Windows.

In a normal PowerShell window (not "Run as administrator"):

```powershell
irm https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Win32.ps1 | iex
```

It works in Windows PowerShell 5.1 and PowerShell 7, on 64-bit Intel or AMD and on ARM64. It:

- installs `urnetwork.exe`, `urnet-tools` and the updater into `%LOCALAPPDATA%\urnetwork\provider` and adds that folder to your `PATH`. Open a new window afterwards;
- asks whether to run the miner in the background, now and whenever you sign in to Windows. It runs hidden, from shortcuts in your Startup folder, so it **stops when you sign out**;
- installs `urnet-tools.cmd` beside `urnet-tools.ps1`. If PowerShell says "running scripts is disabled", type `urnet-tools.cmd` instead of `urnet-tools`.

`urnetwork.exe` isn't code-signed, so SmartScreen or Defender may ask before running it. Windows options are PowerShell-style: `-Tag`, `-AuthCode`, `-NoStart`, `-NoAutoUpdate`, `-AddToStartup`, `-NonInteractive`. Save the script and run `Get-Help .\Provider_Install_Win32.ps1 -Detailed` for all of them.

### Manage it with urnet-tools

| Command | What it does |
| --- | --- |
| `urnet-tools status` | Version, whether you're signed in, whether the miner runs, starts by itself and updates. |
| `urnet-tools start`, `stop`, `restart` | Start, stop or restart the background miner. |
| `urnet-tools logs` | Follow the miner's log; Ctrl-C to leave. |
| `urnet-tools version` | The installed version, and the latest one if it's newer. |
| `urnet-tools update` | Update now (the miner and `urnet-tools` itself). |
| `urnet-tools auto-update`, `auto-update on`, `off` | Show or change automatic updates; see [Updates](/docs/miner/updates). |
| `urnet-tools auto-start on`, `off` | Start the miner at boot or login, or not. |
| `urnet-tools reinstall -t <version>` | Install a particular release. |
| `urnet-tools uninstall` | Remove the miner, keeping your identity. |

`urnet-tools --help` lists everything for your system (on Windows: `urnet-tools help`). Options take `--option value` or `--option=value`; on Windows they're PowerShell-style, such as `-Interval` and `-RemoveIdentity`.

### Uninstall

```bash
urnet-tools uninstall
```

It removes the miner, its background job and its `PATH` entry, and **keeps** your identity in `~/.urnetwork`, so you can install again later as the same device. To delete the identity too, add `--remove-identity` (`-RemoveIdentity` on Windows); it asks you to type `delete` first. [Back it up](/docs/miner/run#back-up-your-miner) before you do: without it, the device can't be recovered.

## Manual download (Linux and macOS)

Every release on the [build releases page](https://github.com/urnetwork/build/releases) has a file named `urnetwork-provider-<version>.tar.gz`. It's a large download, because it holds one `provider` program for every system, at `<os>/<arch>/provider`. It also has MIPS builds for routers and Windows builds; Windows users should use the [installer](#windows):

| Your computer | Folder in the download |
| --- | --- |
| Linux PC or server (Intel or AMD, 64-bit) | `linux/amd64` |
| Raspberry Pi 4 or 5 on a 64-bit OS, or another 64-bit ARM Linux | `linux/arm64` |
| Older 32-bit Intel or AMD Linux PC | `linux/386` |
| Raspberry Pi or another ARM board on a 32-bit OS | `linux/arm` |
| Mac with Apple silicon (M1 or later) | `darwin/arm64` |
| Mac with an Intel processor | `darwin/amd64` |

Download and install it into `~/.local/bin`, choosing your folder from the table:

```bash
VERSION=<version>   # the latest tag on the releases page, without the leading v
curl -fSsL -o urnetwork-provider.tar.gz \
  "https://github.com/urnetwork/build/releases/download/v${VERSION}/urnetwork-provider-${VERSION}.tar.gz"
tar -xzf urnetwork-provider.tar.gz linux/amd64/provider            # your folder from the table
mkdir -p "$HOME/.local/bin"
install -m 755 linux/amd64/provider "$HOME/.local/bin/provider"   # your folder from the table
export PATH="$HOME/.local/bin:$PATH"
provider --version
```

Add the `export PATH=…` line to your shell's startup file (`~/.bashrc` on most Linux systems, `~/.zshrc` on macOS) so the command is found in new terminals.

On macOS, a file downloaded with a web browser (not with `curl` as above) is quarantined and won't run. Remove the quarantine once:

```bash
xattr -d com.apple.quarantine "$HOME/.local/bin/provider"
```

Then go back to [the quick start](/docs/miner#2-run-setup) and run `provider setup`. Its background service also keeps a manual install up to date; see [Updates](/docs/miner/updates).

## Build from source

Use the Go version that `sn/go.mod` asks for (currently Go 1.27.3) and matching revisions of the sibling repositories its `replace` directives point to. The source folder must look like this:

```text
urnetwork/
├── sn/                 # github.com/urfoundation/sn
├── connect/            # includes connect/sctp
├── sdk/
├── server/
├── warp/
├── proxy/
├── userwireguard/
├── glog/
├── goidenticons/
└── gvisor/             # matching generated Go source selected by the release
```

The local replacements are part of the build: use the matched source checkouts or source bundle for the release you are deploying. A checkout of `sn` alone is not enough. Get the matching generated `gvisor` source with that bundle; an arbitrary upstream revision is not a reproducible substitute.

From the `sn` folder:

```bash
mkdir -p "$HOME/.local/bin"
go build -o "$HOME/.local/bin/provider" ./cli/miner
export PATH="$HOME/.local/bin:$PATH"
provider --help
```

A build of your own says `development build` and never updates itself. Update it by building again.

## A binary from your operator

You can also install a `provider` binary your operator supplies, if it's built from the same current source. Check that `provider --help` lists `setup`, `status` and `wallet`. An older binary may register devices and set wallets differently from this guide.
