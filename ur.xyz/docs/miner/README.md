---
description: How to run a UR miner on Bittensor SN25 (netuid 25): install the provider binary, join a network operator, set a claim wallet, claim pool payouts and reach a top-level slot.
---

# How to become a miner

A miner carries the traffic of the UR privacy network. The network is coordinated by **Bittensor SN25 (netuid 25)**: independent validators measure which miners actually route, and Bittensor's Yuma Consensus turns that measurement into the subnet's miner emission, paid in the subnet's α token. A miner joins a network operator, runs the `provider` binary (or one of the operator's apps), and is paid in one of two ways:

- **Pool tier** (where everyone starts): your operator holds one on-chain slot for all of its miners. You need no slot, no stake and no registration. Each settlement epoch you claim your share of the pool directly from the settlement vault with a Merkle proof.
- **Top-level miners** (the head): the roughly 200 fleets with the broadest distinct, routable exit coverage register their own hotkey on SN25, bind their miners to it, and are paid natively to that hotkey each tempo, with no operator in the payout path.

This guide is written against the release-1.0 code in the `sn` repository. Where a step is not automated by the code, it says so. For the mechanism itself read the [litepaper](/docs/litepaper); for the other roles see [How to become a validator](/docs/validator) and [How to become a network operator](/docs/operator).

## Who this is for

- Anyone with a computer, router or server that has its own public IPv4 or IPv6 address and can leave a small user-space process running.
- Operators of larger fleets (many exits in many networks) who want to compete for a top-level miner slot.

You do not need to be a Bittensor validator, and you do not need to buy a UID to start.

## What you need

- **Hardware.** The `provider` binary runs in user space with no special permissions on Linux (arm64, arm, amd64, 386, mips, mipsle, mips64, mips64le), macOS (arm64, amd64) and Windows (arm64, amd64). Memory is bounded by a soft limit you can set with `--max-memory`; with no limit the target is derived from the host's memory.
- **One public exit address per miner.** Validators attribute a measured hop to exactly one miner by its exit IP. A miner whose `client_id` is currently seen behind more than one exit IP is not eligible to be measured until it is back to one (the one-provider, one-egress-IP rule of the `/verify` protocol). If you have several exits, run one provider per exit (see [Several exits on one host](#several-exits-on-one-host)).
- **An account with a network operator.** Miners work with operators; the operator you join runs the API and connect servers your provider talks to. The operators listed on [/operators](/operators) publish their app and their public stats feed. The reference operator is ur.io (`https://api.bringyour.com`, `wss://connect.bringyour.com`), which the binary uses by default.
- **A Bittensor coldkey** (an ss58 address, prefix 42) to receive pool payouts. Set it as your claim wallet (below). It never needs to hold TAO or α to receive claims.
- **For claims and the head tier only:** an EVM key (hex-encoded 32-byte secp256k1) funded with TAO on the Subtensor EVM to pay gas for claim and binding transactions, and, for a fleet, a hotkey seed plus a coldkey seed whose account holds TAO for the registration burn (`provider fleet register` registers the hotkey on SN25 with them).

Your Bittensor keys never touch the provider process: the provider only stores the ss58 address of your coldkey.

## Step 1: install the provider binary

The miner is shipped under its historical name, `provider`, as the release asset `urnetwork-provider-<version>.tar.gz` on [github.com/urnetwork/build/releases](https://github.com/urnetwork/build/releases). The tarball contains one binary per platform at `<os>/<arch>/provider` (`provider.exe` on Windows).

```bash
VERSION=2026.9.24-1054966040   # pick the latest tag on the releases page (without the leading v)
curl -fSsL -o urnetwork-provider.tar.gz \
  "https://github.com/urnetwork/build/releases/download/v${VERSION}/urnetwork-provider-${VERSION}.tar.gz"
tar -xzf urnetwork-provider.tar.gz
mkdir -p ~/.local/bin
install -m 755 linux/amd64/provider ~/.local/bin/provider   # choose your os/arch
provider --help
```

On macOS the binaries are not signed; clear the quarantine flag once:

```bash
xattr -d com.apple.quarantine ~/.local/bin/provider
```

The same release also ships `urnetwork-snclaim-<version>.tar.gz` (the offline transaction submitter used below) and `urnetwork-validator-<version>.tar.gz`.

**Installer scripts.** The `Provider_Install_Linux.sh` and `Provider_Install_Win32.ps1` scripts in the `urnetwork/connect` repository install the binary as `urnetwork` (Linux: `~/.local/share/urnetwork-provider/bin/urnetwork`, with a user systemd unit `urnetwork.service` that runs `urnetwork provide` and an `urnetwork-update.timer`; Windows: `%LOCALAPPDATA%\urnetwork\provider\urnetwork.exe` with an optional startup shortcut). Note that both scripts resolve the release from the `urnetwork/connect` GitHub releases, not from `urnetwork/build` where current builds are published, so prefer the manual download above until the scripts are updated.

**Building from source.** The miner lives in the `sn` repository (`cli/miner`, module `github.com/urfoundation/sn`). Its `go.mod` resolves the sibling urnetwork repositories through `replace` directives, so a lone checkout does not build; check out the siblings named in `go.mod` beside `sn`, then:

```bash
cd sn/cli/miner
go build -o provider .
```

## Step 2: join a network operator

Create an account with the operator you want to mine for. On ur.io, log in at [ur.io/?auth](https://ur.io/?auth) and use **Copy an Auth Code** to get a time-limited auth code. Then authenticate the provider:

```bash
provider auth
# Enter auth code: <paste>
# Jwt written to ~/.urnetwork/jwt
```

Or log in with a username and password:

```bash
provider auth --user_auth=<user_auth>
# Enter password:
```

`provider auth` asks before overwriting an existing `~/.urnetwork/jwt` unless you pass `-f`. Everything the provider keeps lives in `~/.urnetwork` (override the directory with the `URNETWORK_STATE_DIR` environment variable):

| File | What it is |
| --- | --- |
| `jwt` | the network credential written by `provider auth` |
| `.provider.jwt` | the renewable client credential minted on the first `provide` |
| `.provider.key` | the 32-byte Ed25519 seed of your client identity (0600). It signs your head-tier binding; anyone holding it can impersonate your miner |
| `.provider.cert` | the TLS certificate and key the provider serves with |
| `.provider.extender.key` | the seed of your ingress (extender) identity |
| `network.json` | the operator chosen with `provider choose_network` |
| `proxy` | SOCKS5 exits added with `provider proxy add` |

You can copy `~/.urnetwork` to another machine to move a miner, but never run two providers from the same copy at once.

### Mining for a different operator

The binary defaults to the ur.io operator. To mine for another operator, save its API and connect URLs; they must be `https://` and `wss://` (plaintext is accepted only for an explicit loopback host):

```bash
provider choose_network https://api.example.net wss://connect.example.net
provider choose_network --show
provider choose_network --reset
```

A saved network replaces the defaults for every command. The `jwt` you already have was issued by the previous operator, so run `provider auth` against the new one before `provider provide`. A one-off `--api_url=<api_url>` / `--connect_url=<connect_url>` flag on a command overrides the saved network for that command only.

## Step 3: provide

```bash
provider provide
```

The provider prints its identity and stays in the foreground until killed:

```text
client_id: <16-byte id>
instance_id: <id>
extender_public_key: <hex>
extender: listening, v4 activated at <ip>, v6 not activated
Provider <version> started
```

Useful flags:

```bash
provider provide --port=8080                 # serve GET / status JSON on *:8080
provider provide --wallet=<coldkey_ss58>     # also set the claim wallet at startup (see step 4)
provider provide --max-memory=1gib           # soft memory limit: b, kib, mib, gib
provider provide -v                          # verbose; -vv for more
```

`provider auth-provide` does `auth` and `provide` in one invocation (same options as both), which is convenient for containers.

**Ingress as well as egress.** On desktop and server builds the provider also takes the ingress role: it starts an extender on TCP 443, UDP 443 and UDP 53 (each bound independently; a port that fails to bind just disables that carrier), activates its public address with the operator, and prints one `extender:` status line whenever that status changes. Its identity is the `.provider.extender.key` seed beside your client key. Mobile builds carry no extender.

**Running in the background.** On Linux, a user systemd unit is the simplest way (the installer script generates the same unit for its `urnetwork` binary, with `Restart=no`):

```ini
# ~/.config/systemd/user/urnetwork.service
[Unit]
Description=URnetwork Provider

[Service]
ExecStart=%h/.local/bin/provider provide
Restart=always

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now urnetwork
loginctl enable-linger        # keep user services running after logout
```

On Windows, `powershell -NoProfile -WindowStyle Hidden -Command "Start-Process provider.exe -ArgumentList 'provide' -WindowStyle Hidden"` runs it hidden; the installer script can add it to the Startup folder.

**Apps.** The operator's consumer apps can provide too: in the URnetwork apps, turn on **Provide while disconnected** in settings to run an always-on provider on a phone, desktop or TV you already own. See [ur.io/app](https://ur.io/app). The rest of this guide is about the binary.

## Step 4: set your claim wallet

Pool payouts are claimable by an ss58 coldkey (Bittensor prefix 42) that you register with your operator. The provider records it for your network with `POST /sn/wallet`; the latest wallet set wins and applies from the next committed epoch's payout list.

```bash
provider wallet set <coldkey_ss58>
# subnet wallet set to 5… (pubkey 0x…)
```

or pass `--wallet=<coldkey_ss58>` to `provider provide` (a failure is logged and does not stop providing; retry with `provider wallet set`).

By default an operator requires the coldkey to sign a single-use challenge before it accepts a wallet, which the URnetwork apps do (set the wallet in the app under your account). The unsigned CLI path above only works for an operator that keeps the `wallet_allow_unsigned` policy on; the ur.io operator does not, so on ur.io set the wallet from the app or web account. A miner without a wallet at epoch close is left out of that epoch's payout list (`missing_payout_wallet`).

## Several exits on one host

The provider can front several SOCKS5 exits, running one independent miner identity per exit:

```bash
provider proxy auth add <key> <proxy_user> <proxy_password>
provider proxy add <key>@<host>:<port>
provider proxy add <host>:<port>:<user>:<pass>
provider proxy add --proxy_file=<proxy_file>     # one entry per line; # comments allowed
provider proxy remove <key>@<host>:<port>
provider proxy remove --all
provider proxy auth remove <key>
```

Entries take the forms `host:port`, `host:port:user:pass`, `host:port::` or `key@host:port` (the key names a saved auth). On the next `provide` the provider prints `Using N proxy servers:` and runs each with its own client identity (`.provider-<hash>.jwt`). Each exit must still map to exactly one miner.

## How you are measured and paid

### The clocks

- A **tempo** is 360 chain blocks (about 72 minutes). Each tempo every validator scores both miner tiers and commits its weight vector under commit-reveal; Yuma Consensus takes the stake-weighted median, clips outliers and pays the 41% miner share of SN25's emission accordingly.
- A **settlement epoch** is 50,400 chain blocks (about 7 days). Pool emission accrues to the vault over the epoch; at the boundary the operator's pool is captured, the operator has a root-commit window to commit its payout list (the mainnet reference is 1,200 blocks, +4 h), the epoch finalizes at +48 h (14,400 blocks), and claims open. The signed mainnet policy fixes these windows; the values above are the deploy-script reference in `sn/mainnet/MAINNET.md`.

### The pool tier

Validators weight your operator's pool by `implied_usage × Q`: implied usage is the operator's audited demand, the bytes and distinct users in its signed payout artifact priced at the baseline (conviction-zero) tier of the published rate schedule, so a conviction discount lowers what the operator deposits but not its weight; and `Q` is the exposure-weighted quality of the operator's pool miners as measured by that validator's own trails (the head-bound miners are excluded from `Q`). While the published price is zero (see [Initial period](#initial-period)) every pool's implied usage is exactly 1, and `Q` alone sets the pool split. The policy clamps `Q` into a band (`quality_transform: clamp_ppm`, minimum and maximum in parts per million) so a noisy measurement cannot swing a pool to zero.

Inside the pool the operator's server computes one leaf per coldkey each epoch:

```text
weight   = usage_bytes × confirmations / max(assignments, reliability_a_min)
shareBps = weight / Σ weight, allocated to exactly 10,000 basis points (largest remainder, ties by coldkey)
```

`usage_bytes` is the traffic you carried under contracts in the epoch; `assignments` and `confirmations` are the validator trail hops the operator's `/verify` server assigned to you and saw you confirm. A miner is in the list only if it carried usage, was assigned at least `reliability_a_min` hops, confirmed at least one, has a wallet, and is not bound into a head fleet. All of a coldkey's miners at one operator collapse into one leaf, and the list is published as a content-addressed payout artifact anyone can reproduce.

### Claiming a pool payout

Claims are permissionless pull claims against the immutable settlement vault: any funded EVM key may relay the transaction, and the α always goes to the coldkey in the leaf. The simplest path is the provider's own claim command, which fetches your proof from the operator (`GET /sn/pool/claim`), recomputes the leaf, checks the proof against the operator's root and, with `--rpc`, against the root the vault holds on chain:

```bash
provider claim --rpc=<rpc_url>
```

```text
epoch: 41 (last finalized; current epoch is 42. Use --epoch to override)
no_id: 0x…
coldkey: 0x…
share_bps: 125 (1.25%)
payout_root (server): 0x…
payout_root (proof): verifies against the server root (9-element proof)
payout_root (chain): 0x… (via <rpc_url>, chain id 964)
contract: 0x… (chain id 964)
claim_open_block: 1234567
claim calldata:
0x…
submit with: snclaim submit --calldata=0x… --contract=0x… --rpc=<rpc_url> --key_file=<evm_key_file>
status: VERIFIED (proof, server, and on-chain roots agree)
```

`--epoch=<epoch>` selects an epoch; the default is the last finalized one (the current epoch minus one). `--rpc=<rpc_url>` may be repeated; endpoints are tried in order. The command exits non-zero with `status: MISMATCH — do not submit` if the proof, the server root and the on-chain root disagree, and with `status: UNVERIFIED — no --rpc endpoint answered` if no endpoint answers.

To sign and send in the same step, give the provider the relayer key (needs `--rpc`):

```bash
provider claim --rpc=<rpc_url> --key_file=<key_file>            # sign and submit
provider claim --rpc=<rpc_url> --key_file=<key_file> --dry-run  # stop at the eth_call preflight
```

The receipt is decoded for you. `Claimed` records the accepted entitlement, `ClaimPaid` the actual α transfer, and `ClaimPaymentDeferred` a credit that stayed in the vault because its TAO equivalent is below the runtime's `DefaultMinTransfer` floor. Deferred credit is not lost: it accumulates on your coldkey and pays out in a later claim once it clears the floor.

To keep an air-gapped key, run `provider claim` without `--key_file`, copy the printed calldata, and submit it with `snclaim` (from `urnetwork-snclaim-<version>.tar.gz`), giving the settlement vault address that `provider claim` printed as `contract`:

```bash
snclaim submit --calldata=<hex> --contract=<addr> --rpc=<url>... --key_file=<path> [--chain_id=<id>] [--gas_limit=<n>] [--dry-run]
snclaim status --epoch=<e> --no_id=<n> [--coldkey=<key>] --contract=<addr> --rpc=<url>...
```

`snclaim submit` refuses any calldata whose selector is not the settlement vault's `claim(uint256,uint256,bytes32,uint256,bytes32[])` (`0xce479a1b`), and `submit`/`status` are its only commands; head-tier registration and bindings use `provider fleet` (below).

**Claiming automatically.** The claim daemon polls the operator's epoch clock, discovers every claimable epoch, and submits and reconciles claims with a durable queue (`claim-queue.json`, one entry per epoch with statuses such as `pending`, `submitting`, `uncertain`, `retry`, `finalized` and `no-claim`, retried with a backoff from one minute doubling to one hour):

```bash
provider claim-daemon --config=<path>
```

The config is strict YAML (unknown keys are rejected):

```yaml
schema_version: 1
release: "1.0"
api_url: https://api.bringyour.com     # your operator's API
rpc:                                   # Subtensor EVM JSON-RPC endpoints, tried in order
  - https://<evm-json-rpc>
key_file: relayer.key                  # hex-encoded 32-byte secp256k1 EVM key; holds TAO for gas
jwt_file: network.jwt                  # optional: defaults to ~/.urnetwork/jwt; must be a private (0600) regular file
state_dir: /var/lib/urnetwork/claims   # created 0700; relative paths are anchored to this file
poll_seconds: 30                       # 5 to 3600
lookback_epochs: 2                     # up to 256 epochs discovered on first start
```

Run exactly one daemon per relayer key: the daemon owns that key's nonce through preparation, broadcast and finality, and two processes sharing a key would race.

**Claim expiry.** An entitlement stays claimable for the policy's `claim_ttl_epochs` plus `claim_grace_epochs` (the mainnet reference is 8 epochs plus 1 grace epoch). What is still unclaimed after that becomes carry for the same operator's pool; credit you already claimed is never expired.

### The top-level (head) tier

The head is the roughly 200 fleets with the broadest routable exit coverage. A fleet is a hotkey registered on SN25 with one or more miners bound to it. Validators score a fleet by counting the distinct routable **prefixes** its miners' verified trail hops egressed from (the scoring unit is a keyed hash of the exit prefix, IPv4 /29 and IPv6 /48 by policy, never the raw IP), splitting each prefix equally among every fleet seen on it, and smoothing the score across tempos with the policy's `head_score_ema`. The top `maximum_head_fleets` (at most 200) positive scores get head weight; the policy's `theta` share of the miner emission (the launch value is 3/10) is normalized across them. A fleet earns natively on its own hotkey, needs no claim, and its miners are removed from their operators' payout lists for as long as the binding is live. A fleet that slips out of the top set, or whose hotkey is deregistered, falls back to earning inside the pool.

Publishing a binding maps your `client_id`s to a public hotkey, and therefore to your exit addresses. It is opt-in self-deanonymization for fleets that want a public slot; pool miners stay pseudonymous.

**1. Register a hotkey on SN25.** The fleet registers its own hotkey as a neuron on the manifest's netuid with a burned registration (`register_limit` with a maximum-burn ceiling), signed by the fleet coldkey. Keep the hotkey's 32-byte sr25519 seed in a file (raw bytes or hex) for `--hotkey_seed_file`, and the coldkey's seed (same grammar; a `btcli` wallet's coldkey seed works, and `btcli` remains the tool for creating the wallet and moving TAO onto it) in another file that never touches the mining hosts. The command reads the live burn economics from the finalized chain, refuses a burn above the ceiling, and is a dry run until `--apply`:

```bash
provider fleet register --manifest=<path> --hotkey_seed_file=<path> --coldkey_seed_file=<path> --substrate=<ws_url>...
# fleet register: netuid 25 hotkey 0x… via <ws_url>
# runtime: node-subtensor/…/1/1 at finalized block … (0x…)
# registration economics (netuid 25): burn 1.000000000 TAO (1000000000 rao), min … rao, max … rao, half-life … blocks, increase x…/2^64
# hotkey: 0x…
# coldkey: 5… (free balance 3.250000000 TAO)
# burn limit: 1000000000 rao (register_limit refuses a higher live burn)
# extrinsic: 0x… (signer 5…, nonce 0, 168 bytes)
# fee: estimated 0.002131733 TAO (2131733 rao), limit 10000000 rao
# dry run: nothing was broadcast; re-run with --apply to submit
provider fleet register --manifest=<path> --hotkey_seed_file=<path> --coldkey_seed_file=<path> --substrate=<ws_url>... --apply
# …
# registered: uid 137 on netuid 25 (hotkey 0x…, coldkey 5…)
```

`--burn_limit_rao=<n>` sets the ceiling the runtime enforces (default: the burn observed at the read), `--fee_limit_rao` (default 10,000,000 rao) bounds the quoted fee, and every broadcast is journaled with its extrinsic hash under `~/.urnetwork/fleet-native/`. The hotkey seed must derive the manifest's `hotkey`; a hotkey already registered under that coldkey is reported and nothing is sent. Each registration pays the current burn, and a slot that earns the least emission is the one pruned when the subnet is full, so only register a fleet whose breadth can hold a slot.

**2. Write the fleet manifest.** The manifest is JSON in the exact canonical form (schema `urnetwork-fleet-manifest-v1`, members ordered by `client_id`, lowercase `0x` hex, no trailing whitespace):

```json
{"schema":"urnetwork-fleet-manifest-v1","chain_id":964,"netuid":25,"coordinator":"0x<coordinator address>","fleet_id":"0x<32-byte fleet id>","hotkey":"0x<32-byte hotkey public key>","generation":1,"members":[{"client_id":"0x<16-byte client id>","client_key":"0x<32-byte client public key>"}]}
```

`client_id` is what `provider provide` prints; `client_key` is that client's Ed25519 public key as the operator publishes it at `GET /key/<client_id>`. `fleet_id` is a 32-byte identifier you choose and keep across generations; `generation` starts at 1 and must strictly increase for every replacement. A client may belong to at most one fleet in any epoch. Check and canonicalize the file:

```bash
provider fleet manifest --manifest=<path>
# prints the canonical JSON, commitment_sha256: 0x…, members: N
```

**3. Publish the commitment.** The hotkey writes the manifest's SHA-256 to the Subtensor commitments pallet (free) under `(netuid, hotkey)`; the finalized chain index mirrors it into the coordinator:

```bash
provider fleet publish --manifest=<path> --substrate=<ws_url>... --hotkey_seed_file=<path>
# fleet commitment finalized
#   endpoint: … netuid: 25 hotkey: 0x… commitment: 0x… extrinsic: … finalized_block: … finalized_hash: …
```

`--substrate` is repeatable (ordered failover) and the endpoint's runtime is authenticated against the release pin before anything is signed.

**4. Bind each member.** Each miner's client key and the fleet hotkey both sign the binding; a relayer EVM key (which receives no ownership) submits it to the coordinator:

```bash
provider fleet bind --manifest=<path> --client_id=<hex> --client_seed_file=<path> --hotkey_seed_file=<path> \
  --valid_from_epoch=<e> --valid_to_epoch=<e> --rpc=<rpc_url>... --relayer_key_file=<path> [--dry-run]
# fleet member binding finalized: client=0x… fleet=0x… hotkey=0x… uid=… generation=… epochs=[from,to]
```

`--client_seed_file` is that miner's `~/.urnetwork/.provider.key`. Bindings take effect no earlier than the next settlement epoch, run for at most the policy's `maximum_validity_epochs`, and are accepted only if the hotkey holds a live UID and the mirrored commitment matches the manifest exactly. Versions cannot overlap.

**5. Check and revoke.**

```bash
provider fleet status --manifest=<path> --client_id=<hex> --substrate=<ws_url>... --rpc=<rpc_url>...
provider fleet revoke --manifest=<path> --client_id=<hex> --client_seed_file=<path> --effective_epoch=<e> \
  --rpc=<rpc_url>... --relayer_key_file=<path> [--dry-run]
```

`status` fails if the native commitment, the coordinator record, the hotkey or the fleet id disagree with the manifest. A revocation is signed by the client alone and takes effect at a future epoch; anyone can clean up an expired, deregistered or UID-reused binding.

### Testnet

The public testnet campaign runs the same software on netuid 521 (chain id 945) with accelerated epochs. Point `provider choose_network` at a testnet operator and use the testnet coordinator, chain id and netuid in your manifest; nothing else changes.

## What can go wrong

- **No wallet, or a wallet set after epoch close.** The leaf set is frozen when the operator closes the epoch; a wallet set later applies from the next committed epoch.
- **Too little exposure.** Below `reliability_a_min` assigned trail hops in the epoch you get no leaf (`reliability_exposure_floor`). Stay up; validators sample eligible miners at random.
- **More than one exit IP.** A `client_id` seen behind two exit addresses is excluded from trails until it is back to one. A prefix shared by two fleets is split, so co-located exits do not add head score.
- **Proof or root mismatch.** `provider claim` refuses to emit a submit line when the proof, the server root and the on-chain root disagree. Retry after the epoch finalizes (`claim_open_block`), and if it persists the operator's artifact is at fault, not your claim.
- **Below the transfer floor.** Small entitlements are accepted as `ClaimPaymentDeferred` credit and paid once they aggregate above the runtime's minimum transfer.
- **Missed or expired claims.** After the claim TTL and grace the unclaimed remainder becomes the operator's carry. Run the claim daemon.
- **The operator missed its root.** The pool's captured emission is not lost: it carries to the same operator's next epoch (`missed_root_action: carry_same_operator`), and validators zero the pool's weight only while the operator's deposit audit fails.
- **A stale head binding.** If the fleet hotkey loses its UID, or the recorded UID no longer matches the live one, validators skip the binding (never guess), the fleet earns nothing on the head, and its miners are back in the pool from the next epoch; publish a new generation after re-registering.
- **A rejected credential.** If the operator rejects your client JWT the provider prints `provider authentication was rejected; run provider auth if the bootstrap credential is no longer valid` and exits; run `provider auth` again.

## Safety rules

Miners are exits to the public internet, so the reference operator (ur.io) ships every miner with a safe-by-default policy embedded in the client and provider software. The client and the provider must agree on the rules; a mismatch raises a contract dispute, so neither side can change them alone. Other operators may publish their own rules.

**Protocol limits.**

- Only public unicast addresses route. Traffic to private or multicast addresses is dropped.
- Unencrypted protocols are blocked: DNS (53), HTTP (80), IMAP (143), SMTP (25) and POP (110). Their encrypted forms are open: HTTPS and DoH (443), DoT (853), IMAP TLS (993), SMTP TLS (587 and 465), POP TLS (995) and SFTP (990).
- Of the restricted port range only the protocols mainstream users need are open; user ports are open except the ones that generate a disproportionate number of abuse reports for miners: BitTorrent (6881 to 6889) and IRC (6667) are blocked.

**Rate limits.** Each source may open a limited number of new TCP connections and UDP streams per second and a limited number of parallel connections, high enough not to affect normal use; per miner, parallel connections are additionally bounded by the host's `ulimit`.

**Contract limits.** Every transfer is preceded by a contract with an escrowed balance and a permission set, and both sides close it with an acknowledged byte count. The operator assigns each contract a priority weighted toward premium users and premium traffic (spend per GiB), so miners may rate-limit by priority and bots cannot buy priority without spending money.

**Abuse audit that preserves privacy.** The operator keeps an encrypted audit log for 24 months. Miners opt in to send encrypted records and throw away their key; only the destination or its ISP can reconstruct the record key, which is what they send in an abuse report (when, source and destination IP and port, the SHA-256 of the TLS client random for TLS connections, an official reporter contact and the notice), to [notice@bringyour.com](mailto:notice@bringyour.com). The operator can decode a single record only with a mostly complete key from a legitimate report; everyone involved in an incident, including the reporter, can be removed from the network.

**Opting out.** A miner may opt out of sending encrypted audit records, in which case the operator cannot act on abuse reports the miner receives. Letting miners switch off individual frontline rules, and letting users pick miners by the rules they run, is on the roadmap.

## Initial period

At launch the published [price sheet](/price) is **0 α per GiB and 0 α per user**, and the signed mainnet policy carries that zero price explicitly (`zero_rate_action: equal_demand`). While the price is zero, operators make no demand deposits: none are required and none are audited. Every registered operator pool is given the same implied usage (exactly 1), so the pool channel is split by the validators' measured quality `Q` alone, and a voluntary deposit or conviction lock neither helps nor hurts a pool. The head channel, the `theta` split, the quality clamp and the cede rule are unchanged, so as a miner nothing about your payout list, your claims or the head tier changes. Operator admission is owner-gated at launch. This is a deliberate launch mode while bugs are flushed out of the network; watch the price sheet's RSS feed for the change that starts collecting deposits.
