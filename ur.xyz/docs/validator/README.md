---
description: How to run an independent validator on Bittensor SN25 (netuid 25): stake α, register a hotkey, authenticate with the operators, then measure miners and commit weights.
---

# How to become a validator

A validator is the measuring instrument of the UR privacy network, which is coordinated by **Bittensor SN25 (netuid 25)**. It has two jobs, and one binary does both:

1. **Measure.** Walk `/verify` trails: server-assigned chains of miners at each network operator, proving in real time that it can egress from each one, and aggregate the completed and failed hops into per-miner liveness and latency statistics.
2. **Steer.** Each tempo (360 blocks, about 72 minutes) turn those statistics into one weight vector over the subnet's miner UIDs, pools and top-level fleets alike, and commit it under commit-reveal. Bittensor's Yuma Consensus turns every validator's vector into the miner emission.

For this a validator earns SN25's **native Yuma dividends** (proportional to its stake and its vtrust, its agreement with consensus). That is the only validator reward in release 1.0: there is no fee, no bounty and no operator paying validators. The validator set is permissionless and no operator owns a validator. For the mechanism read the [litepaper](/docs/litepaper) and the [research page](/research); for the other roles see [How to become a miner](/docs/miner) and [How to become a network operator](/docs/operator).

## Who this is for

Bittensor validators who hold or attract α stake on SN25 and can run a Go service continuously against several operator APIs. A validator that does not run trails cannot score honestly: commit-reveal hides everyone's weights until they are stale, so copying earns low vtrust.

## What you need

- **A hotkey registered on SN25 with a validator permit.** Permits go to the top stakers, so the hotkey's coldkey must hold enough of your own α (the subnet's `max_allowed_validators` and stake threshold are live chain values; `validator register` and `validator stake add` read and print them before they act). The release validator refuses to commit while its hotkey has no live UID.
- **A Bittensor coldkey** that holds TAO for the registration burn and the α you stake, as a 32-byte sr25519 seed file (raw bytes, or 64 hex chars with an optional `0x` prefix; a `btcli` wallet's coldkey seed works). The `validator` binary signs `register_limit` and `add_stake` with it and needs it only for those two commands; the release configuration carries no coldkey and the EVM key's mirror account cannot sign a native extrinsic, so keep the seed off the host afterwards.
- **The hotkey's 32-byte sr25519 seed in a file** (raw bytes or hex). The validator signs its commit-reveal extrinsics with it; `validator init` creates it (0600) and prints its `hotkey ss58` and `hotkey pubkey`, and the production loader only ever reads it.
- **An account with every operator you measure**, at least two: the signed policy's `minimum_healthy_no_count` is 2 and the configuration must list at least that many. Each operator gets its own isolated state directory, credentials and statistics; nothing is shared between operators.
- **Chain access.** At least one Subtensor EVM JSON-RPC endpoint (`http`/`https`) and one Substrate websocket endpoint (`ws`/`wss`). Every read authenticates the runtime against the identity pinned in your configuration.
- **The deployment identity**: chain id (964 on mainnet), genesis hash, runtime spec, transaction and state versions, runtime code and metadata hashes, the coordinator and settlement vault addresses, the deploy block, and the signed policy with its hash. The subnet owner publishes these in the deployment manifest at launch; the configuration refuses to start if the chain disagrees with any of them.
- **Hardware.** Release binaries for linux/amd64, linux/arm64, darwin/arm64 and darwin/amd64. Each operator is measured with `concurrency` trail walkers (default 4, at most 128 and never more than the policy's `hard_active_trails_per_source`), each walking through a tunnel pinned to one miner, so memory grows with concurrency. Disk holds the per-operator attempt ledgers and evidence under the bounds you configure.
- **Independence.** If you also run a network operator, list its `no_id` in `controlled_no_ids`: the validator masks those pools and any head fleet whose members mine for them, so you never weight yourself.

## Step 1: install the validator

The validator is the release asset `urnetwork-validator-<version>.tar.gz` on [github.com/urnetwork/build/releases](https://github.com/urnetwork/build/releases), containing `<os>/<arch>/validator`:

```bash
VERSION=2026.9.24-1054966040   # pick the latest tag on the releases page (without the leading v)
curl -fSsL -o urnetwork-validator.tar.gz \
  "https://github.com/urnetwork/build/releases/download/v${VERSION}/urnetwork-validator-${VERSION}.tar.gz"
tar -xzf urnetwork-validator.tar.gz
install -m 755 linux/amd64/validator ~/.local/bin/validator
validator --help
```

To build from source, check out the sibling repositories named by the `replace` directives in `sn/go.mod` beside `sn`, then `cd sn/cli/validator && go build -o validator .`.

## Step 2: create the hotkey and the per-operator client keys

One command creates every seed the release configuration reads: the hotkey seed and one Ed25519 client key per operator you will measure (here operators `1` and `2`):

```bash
validator init --state_dir=/var/lib/ur-validator --no_id=1 --no_id=2
# hotkey seed: /var/lib/ur-validator/hotkey.seed (created, mode 0600)
# hotkey ss58: 5…
# hotkey pubkey: 0x…
# client key seed (no_id 1): /var/lib/ur-validator/no-1/client.key (created, mode 0600)
# vpk (no_id 1): 0x…
# client key seed (no_id 2): /var/lib/ur-validator/no-2/client.key (created, mode 0600)
# vpk (no_id 2): 0x…
```

`init` never replaces an existing seed (re-running it prints the same keys), and `validator init --config=<path>` does the same for the paths a configuration names. Each client key's public half is your path key `vpk` at that operator: the key the operator registers for your client and checks every `SEED` request against, and the key that signs your attempt ledger and evidence. Use a different seed for every operator and never reuse one across validators. The hotkey seed is the hotkey's whole secret: keep it on the validator host only, mode 0600. Registration and staking come after the configuration is written (step 5), because they read the netuid, endpoints and runtime pins from it.

## Step 3: authenticate with each operator

Each operator issues a network credential the same way it does for miners (on ur.io: log in at [ur.io/?auth](https://ur.io/?auth) and copy an auth code):

```bash
validator auth --api_url=https://api.bringyour.com
# Enter auth code: <paste>
# Jwt written to ~/.urnetwork/jwt
```

or `validator auth --user_auth=<user_auth> --api_url=<api_url>` (the password is prompted). `-f` overwrites an existing `~/.urnetwork/jwt`. The production configuration reads one credential file per operator (`network_jwt_file`, default `<operator state_dir>/network.jwt`), so move each token into place after `auth`:

```bash
install -m 600 ~/.urnetwork/jwt /var/lib/ur-validator/no-1/network.jwt
```

The validator mints and renews its own per-operator client credential (`client_jwt_file`, default `<operator state_dir>/client.jwt`) from that network token on first start.

## Step 4: write the configuration

`validator run --config=<path>` is the only mode that writes weights. The file is strict YAML (unknown keys, aliases and duplicate keys are rejected; relative paths resolve against the file's directory) and it must validate before anything starts. Its fields, from `sn/validator/config.go`:

| Field | Meaning |
| --- | --- |
| `schema_version` | `1` |
| `production` | must be `true` |
| `release` | `"1.0"` |
| `deployment_id` | one safe path segment naming the deployment (no `/`, `\` or `.`) |
| `validator_id` | your nonzero validator number in this deployment |
| `chain_id`, `genesis_hash` | the Subtensor EVM chain id and native genesis hash (964 on mainnet) |
| `runtime_spec`, `transaction_version`, `state_version`, `runtime_code_hash`, `runtime_metadata_hash` | the pinned runtime identity; a runtime change stops signing until a reviewed configuration admits it |
| `netuid` | `25` on mainnet |
| `coordinator`, `settlement_vault`, `deploy_block` | the release contract addresses and their deployment block |
| `policy_hash`, `policy` | the signed policy embedded verbatim; its SHA-256 must equal `policy_hash` and the coordinator's active policy |
| `previous_policy` | optional: the prior policy across a reviewed rate amendment |
| `rpc` | EVM JSON-RPC endpoints, `http`/`https`, ordered failover, no duplicates |
| `substrate` | Substrate websocket endpoints, `ws`/`wss` |
| `state_dir` | the validator's own state (intents, head EMA, measurement artifacts) |
| `hotkey_seed_file` | the sr25519 seed `validator init` created in step 2 |
| `controlled_no_ids` | operators you control (masked) |
| `trail_depth` | must equal `policy.verify.trail_depth` (8 in the example policy) |
| `poll_seconds` | 1 to 60 (default 3) |
| `version_key` | the `weights_version_key` the subnet owner announces |
| `operators[]` | one entry per operator: `no_id`, `api_url`, `connect_url`, `artifact_signer` (the operator's payout-artifact signing address, distinct per operator), `state_dir`, `network_jwt_file`, `client_jwt_file`, `client_key_seed_file`, `concurrency` |
| `evidence_v2` | the runtime evidence configuration: `schema: urnetwork-validator-runtime-evidence-v2`, `upload_intent_seconds` (at most 3600), `bounds` (disk, cut, replay, persistence, head EMA and size limits), and `operators[]`, one entry per operator. You write each entry as just its `no_id`; `validator activate` (step 6) fills in the `activation`, `vpk_signature`, `hotkey_signature`, `context` and `history` file references (path, byte length, SHA-256) and the `replay_scratch_root` / `seal_scratch_root` |

A skeleton, with the deployment values left to the published manifest:

```yaml
schema_version: 1
production: true
release: "1.0"
deployment_id: ur-mainnet
validator_id: 7
chain_id: 964
genesis_hash: "0x<native genesis hash>"
runtime_spec: <spec>
transaction_version: 1
state_version: 1
runtime_code_hash: "0x<code hash>"
runtime_metadata_hash: "0x<metadata hash>"
netuid: 25
coordinator: "0x<coordinator>"
settlement_vault: "0x<settlement vault>"
deploy_block: <block>
policy_hash: "0x<sha256 of the canonical policy>"
rpc:
  - https://<evm-json-rpc>
substrate:
  - wss://<substrate-ws>
state_dir: /var/lib/ur-validator/state
hotkey_seed_file: /var/lib/ur-validator/hotkey.seed
controlled_no_ids: []
trail_depth: 8
poll_seconds: 3
version_key: <weights version key>
policy:
  schema: urnetwork-policy-v1
  network_profile: mainnet
  # … the signed policy, verbatim
operators:
  - no_id: 1
    api_url: https://api.bringyour.com
    connect_url: wss://connect.bringyour.com
    artifact_signer: "0x<operator artifact signer>"
    state_dir: /var/lib/ur-validator/no-1
    concurrency: 4
  - no_id: 2
    api_url: https://api.example.net
    connect_url: wss://connect.example.net
    artifact_signer: "0x<operator artifact signer>"
    state_dir: /var/lib/ur-validator/no-2
    concurrency: 4
evidence_v2:
  schema: urnetwork-validator-runtime-evidence-v2
  upload_intent_seconds: 600
  bounds:
    # … the bounds from the published manifest, verbatim
  operators:
    - no_id: 1
    - no_id: 2
```

Validation also enforces: at least `minimum_healthy_no_count` operators; no two operators sharing an `artifact_signer`, a state directory or a credential path; operator state directories outside the validator's `state_dir`; `concurrency` low enough that every walker can enter the seed gate within `step_timeout_seconds` at the policy's `hard_seed_per_minute_per_source` pacing; and every configured `controlled_no_id` present in `operators`. Until step 6 has rendered the evidence inputs, `validator run` refuses the file with `evidence_v2 activation inputs are not rendered for every operator`; `init`, `register`, `stake add`, `activate` and `status` accept it.

Check the file:

```bash
validator status --config=/etc/ur-validator/release.yml
# release: 1.0 production=true validator=7 netuid=25 operators=2
# coordinator: 0x…
# policy: 0x…
# state_dir: /var/lib/ur-validator/state
# evidence_v2: 0/2 operator inputs rendered
# activation: not prepared (run `validator activate --config=/etc/ur-validator/release.yml`)
# hotkey ss58: 5…
# native: finalized block … runtime node-subtensor/…
# registration: NOT REGISTERED on netuid 25; run `validator register …`
```

## Step 5: register the hotkey and stake

Both commands read the netuid, the Substrate endpoints and the pinned runtime identity from the configuration, authenticate the finalized runtime against that pin, print the live economics, and are dry runs until you pass `--apply`. They sign with the coldkey seed file (`btcli` is still the right tool for creating that wallet and for transferring TAO to it):

```bash
validator register --config=/etc/ur-validator/release.yml --coldkey_seed_file=/root/coldkey.seed
# runtime: node-subtensor/…/1/1 at finalized block … (0x…)
# registration economics (netuid 25): burn 1.000000000 TAO (1000000000 rao), min … rao, max … rao, half-life … blocks, increase x…/2^64
# hotkey: 0x…
# coldkey: 5… (free balance 3.250000000 TAO)
# burn limit: 1000000000 rao (register_limit refuses a higher live burn)
# extrinsic: 0x… (signer 5…, nonce 4, 168 bytes)
# fee: estimated 0.002131733 TAO (2131733 rao), limit 10000000 rao
# dry run: nothing was broadcast; re-run with --apply to submit
validator register --config=/etc/ur-validator/release.yml --coldkey_seed_file=/root/coldkey.seed --apply
# …
# finalized: extrinsic 0x… in block … (0x…)
# registered: uid 42 on netuid 25 (hotkey 0x…, coldkey 5…)
```

`register` submits `register_limit` with a burn ceiling: `--burn_limit_rao=<n>` sets it (the runtime rejects the registration if the live burn rises above it) and it defaults to the burn observed at the read. A hotkey that is already registered under your coldkey is reported as such and nothing is sent. Every broadcast is journaled with its extrinsic hash under `<state_dir>/native/native-transactions.jsonl`.

```bash
validator stake add --amount_rao=250000000000 --config=/etc/ur-validator/release.yml --coldkey_seed_file=/root/coldkey.seed --apply
# pool (netuid 25): … TAO in, … alpha in, price 0.812000000 TAO/alpha (812000000 rao/alpha)
# hotkey: 0x… (uid 42 registered=true, staked alpha 0.000000000)
# coldkey: 5… (free balance 252.000000000 TAO)
# stake: 250.000000000 TAO (250000000000 rao) via add_stake at the pool price
# …
# staked: hotkey alpha 0.000000000 -> 307.881773399 (+307.881773399 alpha)
```

`--amount_rao` is TAO in rao (1 TAO = 1e9 rao); the pool converts it to α at its price. `--limit_price_rao=<n>` switches to `add_stake_limit` with that maximum price in TAO rao per α (`--allow_partial` accepts a partial fill instead of fill-or-kill). `--fee_limit_rao` (default 10,000,000 rao) bounds the fee `payment_queryInfo` quotes for the signed bytes; a higher quote refuses to broadcast. Check the result with `validator status --config=…`, which prints the UID, the coldkey, the hotkey's α, the weighted stake against the permit threshold and `permit=true` once the tempo has granted it.

## Step 6: activate

`evidence_v2` needs, for every operator, a signed activation record (both your hotkey and that operator's client key sign it), published through the deployment's evidence journal contract, plus the context and history files that pin it to the first settlement epoch it covers. The validator renders all of these itself from finalized chain state and its own keys, in the same shape the release harness renders them; nothing comes from the subnet owner beyond the deployment manifest already in your configuration. The activation names the *next* settlement epoch, so the command has two halves:

```bash
# 1. prepare, sign and publish (the relayer key only pays gas and receives no authority)
validator activate --config=/etc/ur-validator/release.yml --relayer_key_file=/root/relayer.key
# activation: validator=7 netuid=25 deployment=ur-mainnet operators=2
# prepared (dry run): nothing written; re-run with --apply to sign and journal this preparation
# activation epoch: 43 (EVM snapshot … 0x…, native snapshot … 0x…)
# evidence journal: 0x… (runtime 0x…)
#   no_id 1: validator uid 42, vpk 0x…, activation 0x…, signed=false
#   no_id 2: validator uid 42, vpk 0x…, activation 0x…, signed=false
validator activate --config=/etc/ur-validator/release.yml --relayer_key_file=/root/relayer.key --apply
# prepared: signed activations journaled at /var/lib/ur-validator/state/evidence-v2-setup/prepared.json
# publication at the finalized EVM head:
#   no_id 1: not published at finalized block …
# publishing no_id 1 activation through 0x…
# …
#   no_id 1: published at block … (tx 0x…)
# waiting: activation epoch 43 has not begun (current epoch 42 at finalized block …); re-run `validator activate` or start `validator run` after it begins

# 2. once epoch 43 has begun: render the inputs and pin them in the configuration
validator activate --config=/etc/ur-validator/release.yml --apply
# boundary: block … (0x…); epoch 43 spans blocks […, …)
# rendered: no_id 1 inputs under /var/lib/ur-validator/evidence-v2/no-1
# rendered: no_id 2 inputs under /var/lib/ur-validator/evidence-v2/no-2
# configuration: evidence_v2.operators pinned in /etc/ur-validator/release.yml
# activation complete: the production loader accepts every rendered input; start `validator run --config=/etc/ur-validator/release.yml`
```

The prepared activations require the hotkey to already hold a UID with a permit and stake above the threshold (step 5). The second half rewrites only `evidence_v2.operators` in your file (the original is kept once as `release.yml.pre-activation`), writes the five files per operator beside your state directory (`/var/lib/ur-validator/evidence-v2/no-<id>/` and `scratch-v2/no-<id>/` by default; pre-declare paths in the entries to choose others), and then loads them through the production reader before reporting success. You do not have to come back for it: `validator run --config=…` started after the epoch begins completes a prepared and published activation itself before it starts. Re-running `activate` is safe at every stage; it never signs a second preparation, never publishes twice, and refuses a fresh activation while an operator state directory already holds ledger history.

## Step 7: run

```bash
validator run --config=/etc/ur-validator/release.yml
# validator release 1.0 running: validator=7 netuid=25 hotkey=5… operators=2
```

On start the validator authenticates the pinned runtime and contract identities, loads the finalized settlement snapshot, opens each operator's attempt ledger, authenticates each operator credential, and then runs the measurement workers and the steering loop. Run it under a supervisor with a bounded restart policy; state is durable and restarts reconcile any in-flight commit before submitting a new one. The legacy flag mode, `validator run [--api_url=<api_url>] [--connect_url=<connect_url>] [--concurrency=<n>] [--m=<depth>] [--rpc=<rpc_url>]... [--contract=<addr>] [--state_dir=<path>]`, measures only and prints `steering: disabled in legacy flag mode; use --config for release-1.0 steering`; use it to test trails against one operator.

## How you are measured and paid

### Measurement

For every configured operator the validator seeds trails at the operator's `/verify` endpoint, is assigned hops one at a time (the server picks the next miner at random among eligible ones; the validator never chooses), egresses through each assigned miner to prove transit, and receives a server-signed `FINAL` proof. The operator identifies each hop by the unspoofable source address of your request, so the proof names the miner that actually carried you. Completed and failed hops feed a per-miner liveness estimate (a Wilson score over server-assigned, non-seed hops) and latency percentiles, smoothed across epochs; a miner needs at least `reliability_a_min` assigned hops before it counts. The server publishes its own rollups at `GET /verify/stats` and every non-poison proof at `GET /verify/proofs` for audit, but validators do not consume those for scoring: your weights come from your own trails.

### The weight vector

Each tempo the release steerer takes a finalized snapshot of the chain and builds one vector with the policy's `theta` (the head share; 3/10 in the example policy):

- **Pools.** For every active operator: read this epoch's deposit and the operator's conviction before the epoch, select the tier (`tier_snapshot: conviction_before_epoch`), audit the deposit (below), and compute the pool's implied demand from the audited usage: `implied_demand = bytes × rate0_gib / GiB + users × rate0_user`, the artifact's `total_usage_bytes` and `total_users` priced at the conviction-zero tier (the tier discount changes what the operator pays, not its weight; when the epoch cap truncated the deposit, the demand is truncated by the same factor), times the pool's exposure-weighted quality in parts per million, clamped by `quality_transform` (`minimum_ppm` to `maximum_ppm`). Miners bound into a live head fleet are excluded from the pool quality. A pool with no audited usage or zero quality has zero weight. While the signed policy's price is zero (every rate in every tier is 0, declared with `zero_rate_action: equal_demand`) every pool's implied demand is exactly 1 and quality alone steers.
- **Deposit audit.** Before a pool gets weight, the validator reads the operator's committed root for the previous epoch (`usage_lag_epochs: 1`), fetches the signed payout artifact from the operator's API, verifies its content hash, signer, boundaries and root, recomputes the required deposit from the artifact's `total_usage_bytes` and `total_users` with the canonical formula (`floor(bytes × rate_gib / (GiB × d) + users × rate_user / d)`, capped), and requires the observed deposit to equal it exactly. A mismatch zeroes the pool (`mismatch_action: zero_pool_weight`); a missing root or artifact is pending until the root-commit window closes and then zeroes the pool (`unavailable_action: zero_pool_weight_after_root_window`); in the bootstrap epoch (before any usage artifact exists) the deposit must be zero. Every audit is recorded in the measurement artifact. Under a zero-price policy no deposit is audited: every active operator's audit is recorded as `zero_price` / `zero_price_no_deposit_required` from chain state alone (no payout artifact is fetched for steering), the pool is eligible whatever it voluntarily deposited, and a priced-style audit is rejected by the artifact verifier, as a zero-price audit is under a priced policy.
- **Head.** For every miner with an active fleet binding whose hotkey holds the recorded live UID, collect the distinct egress prefix hashes of its verified hops (IPv4 /29, IPv6 /48 by policy), split each hash equally among the fleets seen on it, smooth each fleet's score with `head_score_ema`, rank by score (ties by lower UID), and keep at most `maximum_head_fleets` (200). A binding whose UID is stale contributes nothing and is listed as stale rather than guessed.
- **Combine.** Normalize the head to `theta` and the pools to `1 − theta`; an empty channel cedes its share to the other (`empty_channel: cede_to_nonempty`); if both are empty there is nothing to commit. Apply the self-mask (your own UID and everything in `controlled_no_ids`), cap by the policy's `max_weight_limit_u16` (the runtime does not enforce a native cap, so the signed cap is applied locally and audited on the finalized vector), convert to `u16` with deterministic rounding repair, and commit under CRv4. The whole decision is sealed into a signed measurement artifact and a write-ahead intent before the extrinsic is sent, so a crash never double-submits and every vector you ever committed is reproducible from public inputs.

### Dividends

Yuma Consensus takes the stake-weighted median of all validators' vectors, clips outliers to consensus and pays miners accordingly. You are paid dividends in proportion to your stake and your vtrust; scoring that diverges from the honest majority is clipped and lowers your vtrust, and copying stale consensus lowers it too. Nothing about the vector is discretionary: `theta`, the rate schedule, the quality clamp, the EMA and the caps are the signed policy, which a stake majority runs in common.

## What can go wrong

- **`self-mask: validator hotkey has no live UID on netuid 25`.** The hotkey is not registered, or was deregistered. `validator register --config=… --coldkey_seed_file=… --apply` registers it again (a deregistered hotkey pays the burn again) and `validator status --config=…` shows the UID; then restart.
- **`evidence_v2 activation inputs are not rendered for every operator`.** The configuration still lists bare `no_id` entries: run `validator activate` (step 6). If the activation is prepared and published but its epoch has not begun, `run` reports `activation epoch N has not begun`; start it again after the epoch boundary.
- **Identity mismatch at start** (`coordinator netuid … configured …`, `policy hash mismatch`, `native genesis … does not match`, a runtime that is not the pinned artifact). The configuration is wrong or the chain changed; the validator fails closed until a reviewed configuration matches.
- **`configured operators N below policy minimum 2`** or **`active operator count N below policy minimum`.** Add operators; the safety policy halts steering rather than score a single operator.
- **Finalized head lag.** If the EVM and native finalized heads drift apart by more than `maximum_finalized_head_lag_blocks`, the tempo is skipped.
- **A rejected credential.** `no_id N authentication: …` means the operator rejected the client token; run `validator auth` against that operator and replace its `network.jwt`.
- **No positive weights.** With no eligible pool weight (no audited demand under a priced schedule, or zero measured quality everywhere) and no live head fleets, `BuildWeightVectorExact` has nothing to commit; the loop retries each poll and the process exits after 10 consecutive failed attempts, to be restarted by your supervisor.
- **An incomplete epoch.** If a native epoch advances while your intent for it is still pending, the validator refuses a new commit until the pending one is reconciled (it replays the exact signed bytes while the nonce is still usable, or marks it failed).

## Initial period

At launch the published [price sheet](/price) is **0 α per GiB and 0 α per user**, and the signed mainnet policy carries that zero price explicitly: every tier's `rate_numerator_rao_per_gib` and `rate_numerator_rao_per_user` is 0 and `zero_rate_action: equal_demand` is set (without it an all-zero schedule is rejected, and a schedule with zero rates in some tiers only is always rejected; `zero_or_invalid_rate: halt` keeps covering malformed schedules). While the price is zero, operators make no demand deposits: none are required and none are audited. Your validator gives every registered operator pool the same implied demand (exactly 1), records a `zero_price` audit with disposition `zero_price_no_deposit_required` for each, and scores the pool channel by measured quality alone (`1 × Q`, clamped as usual); a voluntary deposit or conviction lock neither helps nor hurts a pool. The head channel, the `theta` split, the quality clamp, the cede rule and the failure limit are unchanged. This is a deliberate launch mode while bugs are flushed out of the network; watch the price sheet's RSS feed for the change that starts collecting deposits.
