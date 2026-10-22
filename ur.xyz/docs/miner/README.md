---
description: Start mining on UR in a few steps. What a miner does, what you need, a quick start for Linux and macOS, and where each part of the miner guide lives.
---

# How to run a miner

A UR miner shares your internet connection as an exit for a network operator. Validators check that it really carries traffic, and Bittensor SN25 (netuid 25) pays rewards for that work in the subnet's α token, branded $UR.

This page gets you from nothing to a running miner. The rest of the miner guide goes deeper, one topic per page:

| Page | What it covers |
| --- | --- |
| [Install](/docs/miner/install) | The Linux installer, a manual download for Linux and macOS, and building from source. |
| [Run and monitor](/docs/miner/run) | Starting and stopping, running in the background, logs and the status page, backups. |
| [Updates](/docs/miner/updates) | How the miner stays up to date, and how to control that. |
| [Get paid](/docs/miner/rewards) | Setting your payout wallet, how rewards are counted, and claiming them. |
| [Troubleshooting](/docs/miner/troubleshooting) | The common errors and what to do about each one. |
| [Advanced](/docs/miner/advanced) | Mining every operator, several exits on one host, automatic claims and the head tier for large fleets. |
| [Reference](/docs/miner/reference) | Every everyday command, the files the miner keeps, environment variables and a glossary. |

For the other roles, see [Run a validator](/docs/validator) and [Run a network operator](/docs/operator).

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

Most miners join an operator's **pool**. You don't need your own Bittensor registration: you sign in to the operator, your miner registers itself as a device, and the pool's rewards are paid to the Bittensor wallet you choose. Large fleets can instead register their own hotkey; see [the head tier](/docs/miner/advanced#larger-fleets-and-the-head-tier).

## What you need

- **A Linux or macOS computer that stays online.** A home PC, a server or a Raspberry Pi 2 or newer all work (the Linux installer needs a 64-bit OS on a Pi). Other systems aren't supported for mining.
- **One stable public internet address per miner.** The miner also tries to listen on TCP port 443 and on UDP ports 443, 53 and 4053 for its extender. To run more than one exit from a host, see [Several exits on one host](/docs/miner/advanced#several-exits-on-one-host).
- **An account with a network operator.** The miner uses the default operator, `bringyour.com`, unless you [choose another](/docs/miner/run#choose-an-operator). You'll get an **auth code** from your account to sign the miner in.
- **A Bittensor wallet address (coldkey)** for your rewards. It's an ss58 address that starts with `5`. You can sign for it on another device; its secret never needs to be on the miner.

## Quick start

The miner program is called `provider`. The steps are the same on every system: install, sign in, start once to register, set your payout wallet, then leave it running.

### 1. Install

On **Linux**, the installer is the easiest way. It puts the miner in your home folder, sets up a background service, and keeps the miner up to date automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/urnetwork/connect/main/scripts/Provider_Install_Linux.sh | sh
source ~/.bashrc
```

The installer names the command `urnetwork`, not `provider`. If you used it, type `urnetwork` wherever this guide says `provider`, including in commands the miner prints for you to copy.

On **macOS**, or on Linux without the installer, download the release yourself: see [Manual download](/docs/miner/install#manual-download-linux-and-macos).

### 2. Sign in

Get an auth code from your operator account (for the default operator, from your URnetwork account at [ur.io](https://ur.io)), then run:

```bash
provider auth
```

Paste the code at the prompt and press Enter. The prompt hides what you paste, so nothing appears while you do it. When it works, it prints `Jwt written to …/.urnetwork/jwt`: that file is your sign-in.

### 3. Start once to register this device

The very first start needs one extra flag, which lets the miner register this computer as a new device:

```bash
provider provide --allow-client-registration
```

It prints a lot of log lines; that's normal. Within a few seconds it has registered the device, and you can do step 4 in a second terminal while it keeps running. Stop it with Ctrl-C when you're ready for step 5. Only use `--allow-client-registration` this first time: later starts are just `provider provide`.

### 4. Set your payout wallet

In a second terminal:

```bash
provider wallet challenge '<your coldkey ss58 address>'
```

It prints a statement to sign. Sign it with that coldkey in a wallet that can sign raw messages with sr25519, for example [polkadot.js Apps](https://polkadot.js.org/apps/#/signing) (Developer → Sign and verify) with your account from the Polkadot.js extension, then run the `provider wallet set` command it printed, with your signature filled in. [Get paid](/docs/miner/rewards#set-your-payout-wallet) explains the signing step in detail.

The wallet has to come after step 3: it's tied to the device that step 3 registers.

### 5. Leave it running

With the Linux installer, the background service is already set up. Stop the miner from step 3 with Ctrl-C, then start the service and check it:

```bash
urnet-tools start
urnet-tools status
urnet-tools auto-update on   # start the daily update check now, not at the next restart
```

The service starts again by itself when the computer restarts. For a manual install, see [Run in the background](/docs/miner/run#run-in-the-background).

### 6. Back up your miner

Copy the folder `~/.urnetwork` somewhere private. It holds this device's identity and your signed wallet history. If you lose it, the device can't be recovered, even though you can still sign in to your account. See [Back up your miner](/docs/miner/run#back-up-your-miner).

That's it. Rewards are counted per settlement epoch, about a week on mainnet, and are claimed after the epoch closes: see [Get paid](/docs/miner/rewards). If something didn't work, see [Troubleshooting](/docs/miner/troubleshooting).

## Where this guide comes from

This guide follows the current [`sn/miner` implementation](https://github.com/urfoundation/sn/tree/main/miner) and its [`cli/miner` entry point](https://github.com/urfoundation/sn/tree/main/cli/miner). Many parts of it are refined in conversations [on our Discord](https://discord.gg/urnetwork), which is also the place to ask for help.
