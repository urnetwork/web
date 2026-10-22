
# How to run a miner

A UR miner shares your internet connection as an exit for a network operator. Validators check that it really carries traffic, and Bittensor SN25 (netuid 25) pays rewards for that work in the subnet's α token, branded $UR.

This page gets you from nothing to a running miner. The rest of the miner guide goes deeper, one topic per page:

| Page | What it covers |
| --- | --- |
| [Install](https://ur.xyz/docs/miner/install) | The installers for Linux, macOS and Windows, a manual download, and building from source. |
| [Run and monitor](https://ur.xyz/docs/miner/run) | Starting and stopping, running in the background, logs and the status page, backups. |
| [Updates](https://ur.xyz/docs/miner/updates) | How the miner stays up to date, and how to control that. |
| [Get paid](https://ur.xyz/docs/miner/rewards) | Setting your payout wallet, how rewards are counted, and claiming them. |
| [Troubleshooting](https://ur.xyz/docs/miner/troubleshooting) | The common errors and what to do about each one. |
| [Advanced](https://ur.xyz/docs/miner/advanced) | Mining every operator, several exits on one host, automatic claims and the head tier for large fleets. |
| [Reference](https://ur.xyz/docs/miner/reference) | Every everyday command, the files the miner keeps, environment variables and a glossary. |

For the other roles, see [Run a validator](https://ur.xyz/docs/validator) and [Run a network operator](https://ur.xyz/docs/operator).

## How it works

```text
your miner (provider)
  │ carries internet traffic for
  ↓
a network operator  ←─  validators
  │ pays its pool       measure it
  ↓ every epoch
your Bittensor coldkey (α, $UR)
```

Most miners join an operator's **pool**. You don't need your own Bittensor registration: you sign in to the operator, your miner registers itself as a device, and the pool's rewards are paid to the Bittensor wallet you choose. Large fleets can instead register their own hotkey; see [the head tier](https://ur.xyz/docs/miner/advanced#larger-fleets-and-the-head-tier).

## What you need

- **A Linux, macOS or Windows computer that stays online.** A home PC, a server or a Raspberry Pi all work. Windows needs the miner's next release, and on Windows the miner only runs while you're signed in.
- **One stable public internet address per miner.** The miner also tries to listen on TCP port 443 and on UDP ports 443, 53 and 4053 for its extender. To run more than one exit from a host, see [Several exits on one host](https://ur.xyz/docs/miner/advanced#several-exits-on-one-host).
- **An account with a network operator.** The miner uses the default operator, `bringyour.com`, unless you [choose another](https://ur.xyz/docs/miner/run#choose-an-operator). You'll get an **auth code** from your account to sign the miner in.
- **A Bittensor wallet address (coldkey)** for your rewards. It's an ss58 address that starts with `5`. You can sign for it on another device; its secret never needs to be on the miner.

## Quick start

> **Next miner release.** This guide uses the friendlier commands (`setup`, `status`, `login`, `start`) that come with the miner's next release. If `provider --version` prints a long usage text instead of a version, you have an older release: [update](https://ur.xyz/docs/miner/updates) first.

The miner program is called `provider`. Install it, run `provider setup`, and check on it with `provider status`.

### 1. Install

The installer is the easiest way. It puts the miner in your home folder, runs it in the background, and keeps it up to date automatically.

On **Linux**:

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Linux.sh | sh
```

On **macOS** (not yet tested on a real Mac):

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_macOS.sh | sh
```

On **Windows** (not yet tested on a real PC), in PowerShell:

```powershell
irm https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Win32.ps1 | iex
```

Then open a new terminal. The installer asks for an auth code from your operator account (for the default operator, from your URnetwork account at [ur.io](https://ur.io)), registers this device and starts mining.

The installer names the command `urnetwork`, not `provider`. If you used it, type `urnetwork` wherever this guide says `provider`, including in commands the miner prints for you to copy.

To install without an installer, see [Manual download](https://ur.xyz/docs/miner/install#manual-download-linux-and-macos).

### 2. Run setup

```bash
provider setup
```

It walks you through four steps, and you can stop and run it again at any time; it keeps the steps you've finished:

1. **Sign in.** Paste an auth code from your operator account. The prompt hides what you paste.
2. **Register this device.** A new device gets its own miner identity, saved in `~/.urnetwork`.
3. **Payout address.** Your Bittensor coldkey address. Setup prints a short message; sign it in your wallet app (Polkadot.js, Talisman or btcli) and paste the signature. You can press Enter to skip this and [set it later](https://ur.xyz/docs/miner/rewards#set-your-payout-wallet).
4. **Background service.** Runs the miner now and every time the computer starts, and keeps it up to date (Linux and macOS).

If you used an installer, it already did steps 1, 2 and 4. Run `urnetwork setup --no-service` to add your payout address.

### 3. Check on it

```bash
provider status
```

A minute after the miner starts, each line (Miner, Signed in, Device, Connected and Updates) should have a ✓. It exits with 0 when all is well, 3 when the device needs setup, and 4 when the miner isn't running or isn't connected, so scripts can check it too (`provider status --json` prints the details).

When something isn't right, `status` prints the command to run next. `provider doctor` looks for the reason: the state folder, DNS, the connection, a proxy that inspects TLS, and the clock. See [Run and monitor](https://ur.xyz/docs/miner/run) for logs and stopping and starting.

### 4. Back up your miner

Copy the folder `~/.urnetwork` somewhere private. It holds this device's identity and your signed wallet history. If you lose it, the device can't be recovered, even though you can still sign in to your account. See [Back up your miner](https://ur.xyz/docs/miner/run#back-up-your-miner).

That's it. Rewards are counted per settlement epoch, about a week on mainnet, and are claimed after the epoch closes: see [Get paid](https://ur.xyz/docs/miner/rewards). If something didn't work, see [Troubleshooting](https://ur.xyz/docs/miner/troubleshooting).

### Step by step instead of setup

`provider setup` runs these commands for you. To do it by hand:

```bash
provider login                    # paste the auth code when asked
provider start                    # the first start asks before registering this device
provider wallet challenge '<your coldkey ss58 address>'
provider service install          # in a second terminal, after Ctrl-C in the first
```

`provider wallet challenge` prints a message to sign; then run the `provider wallet set` command it prints, with your signature. [Get paid](https://ur.xyz/docs/miner/rewards#set-your-payout-wallet) explains it. `login`, `start` and `network` are new names for `auth`, `provide` and `choose_network`, which still work.

## Where this guide comes from

This guide follows the current [`sn/miner` implementation](https://github.com/urfoundation/sn/tree/main/miner) and its [`cli/miner` entry point](https://github.com/urfoundation/sn/tree/main/cli/miner). Many parts of it are refined in conversations [on our Discord](https://discord.gg/urnetwork), which is also the place to ask for help.
