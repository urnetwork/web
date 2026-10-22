---
published: 2026-10-21
description: Fix common UR miner problems. Sign-in errors, a miner that stops straight away or keeps getting refused, wallet and claim errors, and where to ask for help.
---

# Miner troubleshooting

Find the message you're seeing, or the closest symptom, below. If you used the Linux installer, type `urnetwork` wherever this page says `provider`. Still stuck? Ask [on our Discord](https://discord.gg/urnetwork), with the command you ran and what it printed. Never post your auth code, seed files or anything from `~/.urnetwork`.

## Installing

### `urnetwork: command not found` after installing

The installer adds its folder to your `PATH` in `~/.bashrc`, which only new bash terminals read. Run `source ~/.bashrc`, or open a new terminal. If your shell isn't bash, or you have no `~/.bashrc` (the installer then said `~/.bashrc is up-to-date`), add the folder yourself: see [Linux installer](/docs/miner/install#linux-installer).

### `Could not enable the newly installed systemd service`

The installer couldn't reach your user's systemd, which happens in a `sudo su` shell, in many containers and in WSL without systemd. Log in directly as the user who will run the miner (over SSH or at the console) and run the installer again, or use the [manual download](/docs/miner/install#manual-download-linux-and-macos).

### `Provider binary was not found in the tarball!`

The installer doesn't support your processor, usually 32-bit ARM. Use the [manual download](/docs/miner/install#manual-download-linux-and-macos) with `linux/arm`, which runs on ARMv7 and later (a Raspberry Pi 2 or newer). A Pi Zero or Pi 1 isn't supported.

### macOS says the program can't be opened

A file downloaded with a web browser is quarantined. Run `xattr -d com.apple.quarantine "$HOME/.local/bin/provider"` once. (A file downloaded with `curl` isn't, and the command then says `No such xattr`, which is harmless.)

## Signing in

### Nothing appears when I paste the auth code

That's on purpose: the prompt hides the code. Paste it and press Enter.

To give up without a code, press Enter on the empty prompt; Ctrl-C doesn't stop this prompt. It then prints `panic: no auth code entered` and some internal details, which is harmless. Have your code ready before you run `provider auth`.

### `panic: Invalid auth code.`

The code was mistyped, already used or expired. Get a new code from your operator account and run `provider auth` again. The lines after `panic:` are internal details you can ignore.

### `… jwt exists. Overwrite? [yN]`

This device is already signed in. Answer `y` to sign in again with the new code, or anything else to keep the current sign-in.

### `panic: http request attempts exhausted`

The miner couldn't reach the operator. Check the computer's internet connection, and that the operator's URLs are right (`provider choose_network --show`).

On a network that inspects encrypted traffic with its own certificate authority, such as some company networks, the miner rejects that authority. Point `URNETWORK_CONNECT_EXTRA_ROOT_CA_FILE` at a PEM file holding only that network's CA certificates, then try again.

## Starting

### The miner stops straight away

It prints a JSON line with `"event":"startup_recovery_required"` and exits, with a success exit code, so a service shows it as stopped rather than failed. The usual reasons, most likely first:

1. **You haven't signed in on this computer.** Run `provider auth` first.
2. **This is a new device.** The first start needs `provider provide --allow-client-registration`. Later starts don't.
3. **This device's identity files are missing or don't match**, for example after moving to a new computer or restoring part of a backup. Restore the whole `~/.urnetwork` folder from your backup. Signing in again doesn't replace a lost identity, and `--allow-client-registration` won't bring it back either: it only registers new devices. An installation upgrading from an old `.provider.key` may need the one-time `--adopt-legacy-provider-key`; see the [registration and recovery instructions](https://github.com/urfoundation/sn/blob/main/miner/PROVIDER-REGISTRATION.md) before using it.

### `registration parent must be owned and not writable by other users`

The miner's folder belongs to another user (for example, after running the miner once with `sudo`) or can be changed by other users, so it refuses to save its identity there. Give it back to your user, make it private, and start again:

```bash
sudo chown -R "$USER" ~/.urnetwork
chmod 700 ~/.urnetwork
```

### The log keeps saying `refused`

The miner started, but the operator isn't accepting its connection, and it keeps retrying every few seconds. The status page still says `"status":"ok"`, because the process itself is fine.

- Make sure the computer has a normal home or server internet connection, without a VPN or proxy in front of the miner.
- Check that you signed in to the operator the miner is using (`provider choose_network --show`).
- If it continues, ask your operator or [on our Discord](https://discord.gg/urnetwork), with the lines around `refused`.

### The miner stops when I log out

Your user's services stop at logout unless lingering is on. Turn it on once with `sudo loginctl enable-linger "$USER"`.

### `operator <domain> is awaiting auth`

With `--all-operators`, that operator has no sign-in yet. Run `provider auth --operator=<domain>`, or start with `--auto-register --hotkey_seed_file=<path>`. The miner checks again every five minutes. See [Mine every listed operator](/docs/miner/advanced#mine-every-listed-operator).

## Getting paid

### `wallet challenge` or `wallet set` says `credential not ready`

The device isn't registered yet. Start it once with `provider provide --allow-client-registration`, then set the wallet. See [Set your payout wallet](/docs/miner/rewards#set-your-payout-wallet).

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
