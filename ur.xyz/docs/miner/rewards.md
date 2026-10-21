---
published: 2026-10-21
description: Get paid for mining on UR. Set the payout wallet your miner earns to, understand how pool rewards are counted per epoch, and claim them to your coldkey.
---

# Get paid for mining

Your miner earns for the traffic it carries. This page covers the three parts of getting paid: telling the operator which Bittensor wallet to pay ([set your payout wallet](#set-your-payout-wallet)), [how rewards are counted](#how-rewards-are-counted), and [claiming them](#claim-your-rewards).

If you used the Linux installer, type `urnetwork` wherever this page says `provider`.

## Set your payout wallet

Rewards go to a Bittensor **coldkey**: an ss58 address that starts with `5`. You prove the coldkey is yours by signing a short statement with it. The operator stores that signed statement for this device, so a wallet address saved in your account profile alone is not enough.

Set the wallet **after** the device's first start (`provider provide --allow-client-registration`), because the statement names the device that start registers. Before that, the command fails with `.provider.jwt: no such file`.

### Sign in your wallet app (recommended)

This keeps your coldkey's secret off the miner. First, ask for the statement:

```bash
provider wallet challenge '<coldkey_ss58>'
```

Sign the exact printed statement with that coldkey, then run the `provider wallet set` command the challenge printed, with your signature. It looks like this:

```bash
provider wallet set '<coldkey_ss58>' \
  --message='<exact printed statement>' \
  --signature='0x<64-byte sr25519 signature>'
```

What the signature has to be:

- Over the exact statement as printed, as UTF-8 text with LF line endings and no extra newline at the end, signed with sr25519 in the `substrate` signing context. In `--message`, a literal `\n` stands for a line break.
- A Polkadot extension `signRaw` of type `bytes`, which wraps the statement in `<Bytes>...</Bytes>`, is accepted too.
- Submit it within five minutes of the challenge.

The printed command keeps the operator and device you're using, so copy it rather than typing your own.

### Sign with a seed file on the miner

If you deliberately keep the coldkey's seed on the miner's computer, the miner can fetch and sign the statement itself:

```bash
provider wallet set '<coldkey_ss58>' \
  --coldkey_seed_file=/absolute/private/coldkey.seed
```

The file must already exist, belong to you, be private (for example mode `0600`) and have no symlinks in its path. It holds the raw 32-byte sr25519 mini secret, or the same as 64 hexadecimal characters with an optional `0x`. It is not a mnemonic phrase. The command refuses a seed that doesn't match the address, and the seed never leaves your computer.

You can also set the wallet as the miner starts: `provider provide --wallet='<coldkey_ss58>' --coldkey_seed_file=/absolute/private/coldkey.seed`. If that fails, the miner logs the failure and keeps running, so check the log before you rely on it.

### When the wallet starts earning

Rewards are counted in **epochs**. A new wallet setting starts at the **next** epoch and lasts for 65,536 epochs, so set it before the epoch you want to earn in, and renew it before it runs out. It never changes where earlier rewards go. To choose an exact range instead, pass both `--wallet-from-epoch=<epoch>` and `--wallet-through-epoch=<epoch>` to `wallet challenge` and `wallet set`; the operator still decides the earliest epoch it accepts.

The miner keeps every signed statement in `.provider.jwt.wallet-consent/history.json` in `~/.urnetwork`. Keep it with your [backup](/docs/miner/run#back-up-your-miner). If sending a statement is interrupted, running the same command again sends the same signed statement, even if the seed is no longer on the computer.

Every device that should earn needs its own signed wallet; several devices can use the same coldkey. For extra exits on one host, select each with `--provider-jwt`: see [Several exits on one host](/docs/miner/advanced#several-exits-on-one-host). To sign once for every listed operator, see [Sign once for every listed operator](/docs/miner/advanced#sign-once-for-every-listed-operator).

## How rewards are counted

Pool rewards depend on the traffic your miner completed and how reliably it was measured doing so. The operator records completed work against your device and pays the wallet signed for that epoch. **Paid and free traffic of the same size earn the same credit.** Account balances, reservations, subscription payments and unfinished contracts are not proof of work.

Each device's share of the pool is proportional to:

```text
completed usage bytes × reliability
reliability = confirmations / max(assignments, reliability_a_min)
```

To be paid for an epoch, a device needs completed usage above zero, at least the required number of verification checks, at least one confirmation, a signed wallet for that epoch and no active head-tier binding. Devices paying the same coldkey are added together into one payout. From settlement v2's switch epoch, the pool is split by completed usage alone, with no reliability factor or minimum, into one account per payout coldkey that never expires (see the [litepaper](/docs/litepaper)).

Validators measure routing quality on their own and weight the operator pools and head fleets. Miners are paid **momentum**: the share of the subnet's miner emission used now to power the network, split between the pool and head tiers by policy. Momentum is 10% at launch. The [Network Capacity Reserve](/reserve), the `ur-reserve` account, receives the rest: miner emissions × (1 − momentum). Its share isn't fixed; it gets smaller as momentum grows. Momentum is a share of emission, not a fixed price per byte; your operator's published policy and payout files show actual earnings. The reserve is separate from the settlement vault's claim collateral.

A settlement epoch is set by the deployed contracts and policy. On mainnet it's 50,400 blocks, about seven days at 12 seconds a block. After an epoch closes, its payout root is committed and finalized before claims open, so recent work isn't claimable straight away. The `claim_open_block` the claim command prints, and your operator's published deployment windows, tell you when.

## Claim your rewards

A claim fetches your proof from the operator, checks it, and sends it to the settlement vault, which pays your coldkey.

### 1. Check the claim

```bash
provider claim --epoch='<settlement_epoch>' --rpc='https://<evm-json-rpc>'
```

Use your operator's EVM RPC endpoint; you can repeat `--rpc` for backups, tried in order. The miner checks the proof and the payout root and prints the `epoch`, `no_id`, `coldkey`, `share_bps`, the payout roots, the vault `contract`, the `claim_open_block` and the claim data. Check the coldkey, contract and chain ID against your operator's published deployment. A proof or root mismatch exits with an error: sort it out with your operator before submitting.

Without `--epoch`, the miner picks the epoch before the current one. That epoch may still be waiting for its root to be finalized, so the claim might not be open yet. Give older unclaimed epochs explicitly.

### 2. Submit it

Submitting needs an EVM **relayer** key: a separate secp256k1 key with a little TAO for gas on the Subtensor EVM network. It only pays the fee; the reward still goes to the coldkey in the proof. Put its 32-byte hex key in a private file, then try it without sending anything:

```bash
provider claim --epoch='<settlement_epoch>' \
  --rpc='https://<evm-json-rpc>' \
  --key_file=/absolute/private/relayer.key --dry-run
```

Then submit it:

```bash
provider claim --epoch='<settlement_epoch>' \
  --rpc='https://<evm-json-rpc>' \
  --key_file=/absolute/private/relayer.key
```

`--key_file` needs `--rpc`. Any funded relayer can submit your proof: it can't change the coldkey or receive the reward. The reward arrives as native α stake on your coldkey. The coldkey's seed isn't needed to claim.

### 3. Read the result

| Event | Meaning |
| --- | --- |
| `Claimed` | The vault accepted the claim and credited your coldkey. On its own, this doesn't prove a transfer. |
| `ClaimPaid` | The credit was transferred to your coldkey. |
| `ClaimPaymentDeferred` | The credit stays in the vault for now, for example because it's below the transfer minimum, the price isn't available or the transfer failed. |

Deferred credit doesn't expire. A later claim pays the accumulated credit once payment is possible, and anyone can retry it with the vault's `withdrawClaimCredit(bytes32 coldkey)` method; `snclaim withdraw --vault=v1` (with `--coldkey`, `--contract`, `--rpc` and `--key_file`) calls it. Submitting an already accepted claim again isn't a withdrawal and fails as already claimed.

Claim before the entitlement expires. On mainnet that's eight epochs plus one grace epoch; after that, unclaimed rewards can go back into the same operator's pool. Expiry doesn't remove credit already accepted. From settlement v2's switch epoch, accounts never expire.

To claim automatically, or to submit from a different computer than the miner, see [Advanced](/docs/miner/advanced#claim-automatically).
