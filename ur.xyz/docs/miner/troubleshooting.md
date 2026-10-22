---
published: 2026-10-21
description: Fix common UR miner problems. Sign-in errors, a miner that stops straight away or keeps getting refused, wallet and claim errors, and where to ask for help.
---

# Miner troubleshooting

Find the message you're seeing, or the closest symptom, below. If you used an installer, type `urnetwork` wherever this page says `provider`. Still stuck? Ask [on our Discord](https://discord.gg/urnetwork), with the command you ran and what it printed. Never post your auth code, seed files or anything from `~/.urnetwork`.

## Installing

### `urnetwork: command not found` after installing

The installer adds its folder to your `PATH` in your shell's startup file (`~/.bashrc`, and `~/.zshrc` if you have one, on Linux; `~/.zshrc` on macOS), which only new terminals read. Open a new terminal, or run the `export PATH=…` line the installer printed. On Windows, open a new PowerShell window. If you installed with `-B`, add the folder yourself: see [the installers](/docs/miner/install#the-installers).

### `urnet-tools` on Windows says running scripts is disabled

That's Windows' default script policy. Type `urnet-tools.cmd` instead of `urnet-tools`, for example `urnet-tools.cmd status`.

### `no systemd user session` (Linux)

The installer couldn't reach your user's systemd, which happens in a `sudo su` shell, in many containers and in WSL without systemd. It installs the miner anyway, but can't run it in the background. Log in directly as the user who will run the miner (over SSH or at the console) and run the installer again, or run the miner in the foreground with `urnetwork provide`.

### The installer says your processor isn't supported

The releases cover 64-bit and 32-bit Intel and AMD, 64-bit ARM, and 32-bit ARMv7 (a Raspberry Pi 2 or newer) on Linux, and Apple silicon and Intel Macs. A Pi Zero or Pi 1 isn't supported. On anything else, [build from source](/docs/miner/install#build-from-source).

### macOS says the program can't be opened

A file downloaded with a web browser is quarantined. Run `xattr -d com.apple.quarantine "$HOME/.local/bin/provider"` once. (A file downloaded with `curl` isn't, and the command then says `No such xattr`, which is harmless.)

## Signing in

### Nothing appears when I paste the auth code

That's on purpose: the prompt hides the code. Paste it and press Enter.

To give up, press Ctrl-C: it says `Cancelled.` and changes nothing. Pressing Enter on the empty prompt says `No auth code was entered`. (On releases from before late October 2026, Ctrl-C doesn't stop the prompt, and Enter prints `panic: no auth code entered` with some internal details, which is harmless.) Have your code ready before you run `provider login` or `provider setup`.

### `That auth code wasn't accepted`

The code was mistyped, already used or expired. Get a new code from your operator account and run `provider login` again. Older releases, and a miner whose output goes to a log rather than a terminal, print `panic: Invalid auth code.` followed by internal details you can ignore.

### `… jwt exists. Overwrite? [yN]`

This device is already signed in. Answer `y` to sign in again with the new code, or anything else to keep the current sign-in.

### `Couldn't reach the URnetwork API`

In logs and on older releases this is `panic: http request attempts exhausted`. The miner couldn't reach the operator. Check the computer's internet connection, and that the operator's URLs are right (`provider network`, or `provider choose_network --show` on an older release).

On a network that inspects encrypted traffic with its own certificate authority, such as some company networks, the miner rejects that authority. Point `URNETWORK_CONNECT_EXTRA_ROOT_CA_FILE` at a PEM file holding only that network's CA certificates, then try again.

## Starting

### First, ask the miner

`provider status` says what's missing and the command to run next, and `provider doctor` checks the state folder, DNS, the connection, TLS and the clock, and names the fix for each problem. Start there; the entries below explain the messages in more detail. (Both came with the miner releases of late October 2026.)

### The miner stops straight away

`provider start` and `provider provide` say why in plain words, and exit with code 3:

- *This device isn't signed in yet*: run `provider setup`, or `provider login`.
- *This is the first start on this device*: answer yes in a terminal, or add `--allow-client-registration` in a script. If you used an installer, run `urnet-tools start`: it registers a new device once you're signed in.

Otherwise, and on releases from before late October 2026, the miner prints a JSON line with `"event":"startup_recovery_required"` and exits with a success exit code, so a service shows it as stopped rather than failed. The usual reasons, most likely first:

1. **You haven't signed in on this computer.** On an older release, run `provider auth`.
2. **This is a new device.** On an older release, the first start needs `provider provide --allow-client-registration`. Later starts don't.
3. **This device's identity files are missing or don't match**, for example after moving to a new computer or restoring part of a backup. Restore the whole `~/.urnetwork` folder from your backup. Signing in again doesn't replace a lost identity, and `--allow-client-registration` won't bring it back either: it only registers new devices. An installation upgrading from an old `.provider.key` may need the one-time `--adopt-legacy-provider-key`; see the [registration and recovery instructions](https://github.com/urfoundation/sn/blob/main/miner/PROVIDER-REGISTRATION.md) before using it.

### `The state folder … can be changed by other users`

In logs and on older releases this is `registration parent must be owned and not writable by other users`. The miner's folder belongs to another user (for example, after running the miner once with `sudo`) or can be changed by other users, so it refuses to save its identity there. Give it back to your user, make it private, and start again:

```bash
sudo chown -R "$USER" ~/.urnetwork
chmod 700 ~/.urnetwork
```

### The log keeps saying `refused`

The miner started, but the operator isn't accepting its connection, and it keeps retrying every few seconds. The status page still says `"status":"ok"`, because the process itself is fine.

- Make sure the computer has a normal home or server internet connection, without a VPN or proxy in front of the miner.
- Check that you signed in to the operator the miner is using (`provider network`, or `provider choose_network --show` on an older release).
- If it continues, ask your operator or [on our Discord](https://discord.gg/urnetwork), with the lines around `refused`.

### The miner stops when I log out

On Linux, your user's services stop at logout unless lingering is on. The installer and `provider service install` try to turn it on; if they printed a lingering warning, turn it on once with `sudo loginctl enable-linger "$USER"`.

On Windows, the installer starts the miner when you sign in, and it stops when you sign out. That's a known limit: keep the user signed in (a locked screen is fine).

### `operator <domain> is awaiting auth`

With `--all-operators`, that operator has no sign-in yet. Run `provider auth --operator=<domain>`, or start with `--auto-register --hotkey_seed_file=<path>`. The miner checks again every five minutes. See [Mine every listed operator](/docs/miner/advanced#mine-every-listed-operator).

## Getting paid

### `wallet challenge` or `wallet set` says `credential not ready`

The device isn't registered yet. Run `provider setup`, or start it once with `provider start` and let it register, then set the wallet. See [Set your payout wallet](/docs/miner/rewards#set-your-payout-wallet).

### A new wallet doesn't show up straight away

That's expected. A wallet setting starts at the next epoch and never changes where earlier rewards go. See [When the wallet starts earning](/docs/miner/rewards#when-the-wallet-starts-earning).

### No payout for an epoch

To be paid, a device needs completed traffic, enough verification checks, at least one confirmation and a signed wallet for that epoch. A device in the head tier earns there instead of from the pool. See [How rewards are counted](/docs/miner/rewards#how-rewards-are-counted).

### The claim proof isn't ready

Check that the operator has published this device's work for the epoch and finalized the epoch's root. The claim uses the device's `.provider.jwt`; your account sign-in (`jwt`) can't stand in for it.

### Proof or root mismatch

Keep the output and compare the deployment, epoch and payout files with your operator. Waiting or changing wallets won't fix proofs that disagree.

### Claimed, but my balance hasn't changed

Look for `ClaimPaid` or `ClaimPaymentDeferred` in the receipt, and check the α stake on your coldkey, not the relayer's balance. See [Read the result](/docs/miner/rewards#3-read-the-result).

### The connection dropped during a claim

Check what happened to the transaction you sent, or to the claim daemon's queue, before using the relayer key again. Keep the signed transaction history.

### Old wallets from before signed wallets

`--legacy-network-wallet` and `claim --legacy-coldkey` are for records kept from before signed device wallets. They don't set a new wallet, and they don't work out old ownership from your current account wallet. Use them only with your operator's original records.
