---
published: 2026-10-21
description: Install the UR miner. The Linux installer with automatic updates, a manual download for Linux and macOS, and building the provider from source.
---

# Install the miner

The miner is a single program, `provider`. There are three ways to get it:

| Way | Systems | Updates | Best for |
| --- | --- | --- | --- |
| [Linux installer](#linux-installer) | Linux | Automatic | Most people on Linux |
| [Manual download](#manual-download-linux-and-macos) | Linux, macOS | By hand | macOS, or if you want full control |
| [Build from source](#build-from-source) | Linux, macOS | By hand | Developers and auditors |

Whichever you choose, the miner keeps its identity in `~/.urnetwork`, so you can switch later without registering again. Back that folder up first, and stop the old way's service before starting the new one, so two copies never run at once. Don't switch by running `urnet-tools uninstall`: it deletes the folder (see [Uninstall](#uninstall)). After installing, go back to [the quick start](/docs/miner#2-sign-in).

## Linux installer

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Linux.sh | sh
source ~/.bashrc
```

The installer needs `curl` or `wget`, and `jq` or `python3`, which most Linux systems already have. It needs no `sudo`. It:

- downloads the latest release for your processor (64-bit x86 or ARM, or 32-bit x86) into `~/.local/share/urnetwork-provider/bin`. It doesn't recognise 32-bit ARM, such as a Raspberry Pi on a 32-bit OS;
- adds that folder to your `PATH` in `~/.bashrc`;
- on systems with systemd, sets up a background service, `urnetwork.service`, and a daily [automatic update](/docs/miner/updates);
- turns on lingering for your user, so the service keeps running after you log out. If that needs an administrator, it prints the `sudo loginctl enable-linger` command to run.

It installs two commands:

| Command | What it is |
| --- | --- |
| `urnetwork` | The miner itself. Type it wherever this guide says `provider`. |
| `urnet-tools` | Manages the installation: start, stop, status, updates and uninstall. Run `urnet-tools --help` to see everything. |

If your shell isn't bash (zsh, for example), add the folder to your `PATH` yourself:

```bash
export PATH="$PATH:$HOME/.local/share/urnetwork-provider/bin"
```

To switch to a particular release later, use [`urnet-tools reinstall`](/docs/miner/updates#stay-on-one-version).

### Uninstall

```bash
urnet-tools uninstall
```

> Uninstalling also **deletes `~/.urnetwork`**, which is this device's miner identity and your signed wallet history. [Back it up](/docs/miner/run#back-up-your-miner) first if you might mine on this device again.

## Manual download (Linux and macOS)

Every release on the [build releases page](https://github.com/urnetwork/build/releases) has a file named `urnetwork-provider-<version>.tar.gz`. It holds one `provider` program per system, at `<os>/<arch>/provider`:

| Your computer | Folder in the download |
| --- | --- |
| Linux PC or server (Intel or AMD, 64-bit) | `linux/amd64` |
| Raspberry Pi 4 or 5 on a 64-bit OS, or another 64-bit ARM Linux | `linux/arm64` |
| Older 32-bit Intel or AMD Linux PC | `linux/386` |
| Mac with Apple silicon (M1 or later) | `darwin/arm64` |
| Mac with an Intel processor | `darwin/amd64` |

Download and install it into `~/.local/bin`, choosing your folder from the table:

```bash
VERSION=<version>   # the latest tag on the releases page, without the leading v
curl -fSsL -o urnetwork-provider.tar.gz \
  "https://github.com/urnetwork/build/releases/download/v${VERSION}/urnetwork-provider-${VERSION}.tar.gz"
tar -xzf urnetwork-provider.tar.gz
mkdir -p "$HOME/.local/bin"
install -m 755 linux/amd64/provider "$HOME/.local/bin/provider"   # your folder from the table
export PATH="$HOME/.local/bin:$PATH"
provider --help
```

Add the `export PATH=…` line to your shell's startup file (`~/.bashrc` on most Linux systems, `~/.zshrc` on macOS) so the command is found in new terminals.

On macOS, a file downloaded with a web browser is quarantined and won't run. Remove the quarantine once:

```bash
xattr -d com.apple.quarantine "$HOME/.local/bin/provider"
```

A manual install doesn't update itself. See [Updates](/docs/miner/updates#manual-installs).

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

## A binary from your operator

You can also install a `provider` binary your operator supplies, if it's built from the same current source. Check that `provider --help` lists `--allow-client-registration`, `wallet challenge`, `--provider-jwt` and `claim`. An older binary may register devices and set wallets differently from this guide.
