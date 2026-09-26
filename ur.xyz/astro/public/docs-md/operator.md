
# How to become a network operator

A network operator runs the servers of the UR privacy network: the API and connect services that users and miners attach to, the `/verify` endpoint that validators walk, and the epoch pipeline that settles its miners' rewards on **Bittensor SN25 (netuid 25)**. An operator brings its own users and products (the ur.io apps are one operator's), deposits α as a revenue-backed signal of real demand, and each settlement epoch commits the Merkle payout list that splits its pool among its miners. It directs where the pool goes but never holds anyone else's α: the immutable settlement vault owns the pool and every miner claims from it directly.

This guide is written against the release-1.0 code in the `sn` and `server` repositories. For the mechanism read the [litepaper](/docs/litepaper); for the other roles see [How to become a miner](/docs/miner) and [How to become a validator](/docs/validator).

## Who this is for

Teams that want to run a network space: a deployment of the open-source server stack with its own domain, users, apps or integrations, and a miner community. In the launch phase operator admission is owner-gated (see [Initial period](#initial-period)), so the first step is a conversation with the subnet owner.

## What you need

- **The server stack.** The services in [github.com/urnetwork/server](https://github.com/urnetwork/server): the API (`api.<your domain>`), the connect service (`connect.<your domain>`), an extender (`extender.<your domain>`), taskworkers, PostgreSQL, Redis, and the content-addressed `server/blob` object store (MinIO) that holds payout and evidence artifacts. The reference operator deploys it continuously with the `warp` tools and tags each deployed version on GitHub. Anyone can host a network space by deploying and maintaining these services.
- **Admission on the coordinator.** Operators are registered by the subnet owner with `registerOperator(noId, coldkey, poolHotkey, depositHotkey, depositSigner, rootSigner, effectiveEpoch, maximumBurnRao)`, an owner-only call that also has the settlement vault register your pool UID under the vault's own coldkey (the registration burn is paid from the call's value up to `maximumBurnRao`, with the unburned remainder refunded). Later role changes are scheduled future-effective with `scheduleOperator`. You supply the identities; the owner registers them and gives you your `no_id`.
- **Keys and hotkeys.** An operator coldkey (ss58, prefix 42); a **pool hotkey** the vault registers as your pool UID; a **deposit hotkey**, unique to you, on which deposits are staged; and three EVM signers held by the server (hex-encoded secp256k1): the **deposit signer** (`deposit_key`, calls `deposit`), the **root signer** (`root_key`, closes epochs, commits payout roots and finalizes), and the **artifact signer** (`artifact_key`, signs payout artifacts; validators pin it as your `artifact_signer`). The signers need TAO on the Subtensor EVM for gas; the deposit hotkey needs α to deposit (none during the initial period).
- **`/verify` server keys.** One or more Ed25519 keys in the `verify.yml` vault resource; the first signs new trails and all are published at `GET /verify/keys` so historical proofs verify across rotations.
- **An egress prober.** Something that measures what each miner's exit actually carries: either the taskworker's durable probe shards (`config/<env>/provider_egress_probe.yml`) or the standalone `egress-prober` from [operator-proxy](https://github.com/urnetwork/operator-proxy).
- **A public stats feed** (`stats.json`) so the ur.xyz operators directory can list you.

## Step 1: deploy the servers

Deploy the server repository's services for your domain. The `/verify` route needs no separate service: it is part of the API, and its statistics, proofs and keys are public routes on the same host:

| Route | Purpose |
| --- | --- |
| `POST /verify` | the trail protocol (SEED, EXTEND, FINAL), authenticated by the protocol's own Ed25519 signatures, not a JWT |
| `GET /verify/keys` | the server signing keys, current and historical |
| `GET /verify/stats` | operator-observed rollups for audit and reconstruction (validators do not score from these) |
| `GET /verify/proofs` | every signed, non-poison completed or expired trail |
| `GET /key/<client_id>` | a client's public Ed25519 key, unauthenticated |
| `POST /sn/wallet`, `GET /sn/wallet` | a miner's claim coldkey |
| `GET /sn/pool/claim` | a miner's Merkle proof for an epoch |
| `GET /sn/epoch` | the mirrored contract clock (`epoch`, `start_block`, `commit_deadline_block`, `finalize_block`, `t_epoch_blocks`, `chain_id`, `contract_address`, `settlement_vault_address`, `no_id`, `netuid`, `rpc_url`) |
| `GET /sn/artifact`, `GET /sn/artifacts` | signed payout artifacts by content hash and history |
| `POST /sn/attempt-artifact`, `GET /sn/evidence`, `GET /sn/evidence/history` | validator evidence uploads and the published evidence index |

Create the `verify.yml` vault resource (a peer of `jwt.yml`):

```yaml
keys:
  - server_key_id: 0
    seed: <base64 standard encoding of a 32-byte Ed25519 seed>
```

`server_key_id` is one byte (0 to 255) carried in every ASSIGN and FINAL message; to rotate, add a new first entry and keep the old ones. The API refuses to start without at least one key.

The `/verify` server enforces the invariant validators depend on: each eligible miner maps to exactly one exit IP and each exit IP to exactly one miner; a miner seen behind two exits is dropped from the eligible index until it is back to one. Seeds whose source address does not resolve to a miner, or that exceed the soft limits, are poisoned (walked to full depth but never published) so the endpoint cannot be used as an oracle for which addresses are miners; only the hard per-source limits in the policy (`hard_seed_per_minute_per_source`, `hard_extend_per_minute_per_source`, `hard_active_trails_per_source`) refuse requests outright.

## Step 2: configure the epoch pipeline

The subtensor pipeline is configured by the `st.yml` vault resource. It is optional: without it the API and taskworker run with the subnet subsystem disabled. Mainnet values use the unprefixed keys; the testnet profile uses the same keys with a `testnet-` prefix, selected by `profile`. Fields, from `server/controller/st_controller.go`:

```yaml
profile: mainnet
enabled: true
wallet_allow_unsigned: false              # keep the unsigned POST /sn/wallet path closed; apps sign the challenge
public_rpc_url: https://<public evm json-rpc>   # published to clients via GET /sn/epoch
rpc_urls: [https://<evm json-rpc>]        # or `authority`, resolved by server/st
chain_id: 964
genesis_hash: "0x<native genesis hash>"
deployment_id: ur-mainnet
policy_hash: "0x<sha256 of the signed policy>"
coordinator_address: "0x<coordinator>"
settlement_vault_address: "0x<settlement vault>"
reserve_sink_address: "0x<reserve sink>"
netuid: 25
no_id: <your operator id>
treasury_hotkey: "0x<32-byte hotkey>"
deposit_hotkey: "0x<32-byte hotkey>"
deposit_key: "<hex secp256k1 key>"        # deposit signer
root_key: "<hex secp256k1 key>"           # root signer: close, commit root, finalize
artifact_key: "<hex secp256k1 key>"       # payout artifact signer
deposit_tiers:                            # the signed policy's tier schedule, verbatim
  - min_conviction_rao: 0
    rate_numerator_rao_per_gib: <rate>    # rao per GiB of usage
    rate_numerator_rao_per_user: <rate>   # rao per distinct user (omit or 0 when the policy prices bytes only)
    rate_denominator: 1
deposit_zero_rate_action: halt            # the policy's zero_rate_action; equal_demand only while every rate is 0
deposit_epoch_cap_rao: <cap>              # custody blast-radius cap per epoch
reliability_a_min: 8                      # the policy's reliability_a_min
block_seconds: 12
deploy_block: <coordinator deployment block>
```

`attempt_upload` and `reserved_attempt_upload` bound the validator attempt-artifact uploads your API accepts; `ops_key` and `contract_address` exist only for the retired monolithic contract. Keys are optional for a read-only deployment; each publish flow errors per call when its key is absent.

The deposit tiers must be the signed policy's schedule: validators recompute your required deposit from the same formula and zero your pool when the observed deposit differs (see below).

## Step 3: run the prober

Miners are placed and health-checked through tunnels pinned to each miner, never from the operator host's own network. In the reference deployment this runs as durable taskworker shards configured in `config/<env>/provider_egress_probe.yml` (`shard_count`, batch sizes and timeouts for the `full` and `blackhole` passes, the control-plane URLs and the bandwidth CDN); the prober identity is minted by the `ProberBootstrap` task and the ingest secret lives in `vault/<env>/provider_egress.yml`. Run `taskworker init-tasks` after changing the shard count. The standalone equivalent is:

```bash
./egress-prober \
  -api-url https://api.example.net \
  -platform-url wss://connect.example.net \
  -operator-secret "$UR_OPERATOR_SECRET" \
  -public-api-url https://api.example.net \
  -cache-ttl 24h \
  -interval 1h
```

`-operator-secret` must equal `ingest_secret` in `provider_egress.yml`; the prober fetches its own credential from `/network/prober-credential` unless `-by-jwt` (or `UR_PROBER_BY_JWT`) is given. It refuses to start unless it is confined (it must be unable to reach any probe destination directly, for example a systemd unit with `IPAddressDeny=any` and `IPAddressAllow=` your API and connect addresses), because a probe that fell back to the host's own egress would certify a dead miner as healthy.

## Step 4: publish your stats feed and get listed

The ur.xyz operators directory is the registry baked into the site at `web/ur.xyz/react/src/lib/network.js` (`NETWORK_OPERATORS`): an operator lists itself by adding an entry there by pull request with its name, site, app name, dashboard and GitHub URLs, its store listings, and its `statsUrl`. The site reads live totals from every listed feed in the visitor's browser, so the feed must be public JSON with exactly one `Access-Control-Allow-Origin` (`*` or a reflection that includes `https://ur.xyz`):

```json
{
  "block": 13,
  "users": 125000,
  "data_gib": 812345.5,
  "total_networks": 250000,
  "staked_alpha": 250000.0,
  "demand_deposits_alpha": 1234.5,
  "miner_emissions_alpha": 5678.9,
  "alpha_usd": 1.75,
  "countries": 123,
  "prev_users": 118000,
  "prev_data_gib": 1012345.5,
  "prev_demand_deposits_alpha": 1100.5,
  "prev_miner_emissions_alpha": 5200.1
}
```

`block` is the settlement epoch number, the accumulators are for the current epoch and `prev_*` for the last finished one (omit them when there is no finished epoch), `alpha_usd` is the α price you observe (the site takes the mean across operators), and `countries` is informational. Missing fields parse as null, never as zero.

## What the server does every epoch

Once `st.yml` is present the taskworker runs the pipeline on its own; nothing here needs an operator at the keyboard:

1. **`StSyncChain`** (every 5 s) mirrors the contract epoch clock into `st_epoch` and Redis (served at `GET /sn/epoch`), advances the finalized event mirror, backfills any epoch the worker slept through, and schedules the per-epoch tasks below at block-derived times. The contract clock is authoritative; every deadline is re-checked in blocks before a send.
2. **`StEpochClose(e)`** computes the payout leaves and root for a closed epoch and closes your pool on chain (`closeOperatorEpoch`, root signer), capturing the pool's realized emission into the vault. Each eligible miner (`usage_bytes > 0`, at least `reliability_a_min` assigned hops, at least one confirmation, a wallet, and not bound into a head fleet) gets `weight = usage_bytes × confirmations / max(assignments, reliability_a_min)`, aggregated per coldkey and allocated to exactly 10,000 basis points by largest remainder. The list is written as a signed, content-addressed payout artifact.
3. **`StCommitRoot(e)`** commits the root and the artifact hash (`commitOperatorRoot`, root signer) inside the root-commit window, retrying every 5 minutes, with an alert two hours before the deadline.
4. **`StDeposit(e)`** sizes and sends the epoch's deposit (`deposit`, deposit signer): it reads the previous epoch's signed payout artifact, takes its `total_usage_bytes` and `total_users` (the distinct top-level users with contract usage in the epoch, the same figure as your stats feed's `users`), reads your conviction before this epoch, selects the tier and computes `floor(usage_bytes × rate_numerator_rao_per_gib / (GiB × rate_denominator) + users × rate_numerator_rao_per_user / rate_denominator)` capped at `deposit_epoch_cap_rao`. Epoch 0 deposits nothing; a zero-sized deposit is skipped; a deposit already on chain for the epoch is skipped. While every configured rate is 0 (`deposit_zero_rate_action: equal_demand`, the initial period) the task records a skipped publish, sends no transaction, reserves no nonce and raises no alert; `bringyourctl st status` shows the sizing (bytes, users, tier, required deposit, or that the price is zero). The staged α is moved to the reserve hotkey and transferred into the immutable reserve sink: deposits are conviction stake and are never returned.
5. **`StFinalizePoke(e)`** calls the permissionless `finalizeOperatorEpoch` at or after the finalize block, fixing the entitlement (captured emission plus same-operator carry) so claims open.

Every attempt is recorded (`AddStPublish`/`UpdateStPublish`) and every flow reads chain state first, so a restart never double-sends. The manual fallback is `bringyourctl`:

```text
bringyourctl st status [--epoch=<epoch>]
bringyourctl st deposit [--alpha_rao=<alpha_rao>]
bringyourctl st commit --epoch=<epoch>
bringyourctl st finalize --epoch=<epoch>
```

A manual `--alpha_rao` deposit is still bounded by `deposit_epoch_cap_rao`. Voluntary conviction (`addConviction`, the same one-way path, which raises your tier without counting as demand) has no server task; it is a transaction from your deposit signer.

## How you are measured and paid

An operator is not paid by SN25's emission: the 41% miner share that lands on your pool UID belongs to your miners, and the vault pays it out against your root. Your revenue is your own business (the reference operator sells premium subscriptions to its users); the subnet is how your miners are paid for carrying that traffic, and how your pool competes with other operators' pools for emission.

- **Pool weight.** Each tempo every validator weights your pool by `implied_demand × Q`: `implied_demand = bytes × rate0_gib / GiB + users × rate0_user`, your audited `total_usage_bytes` and `total_users` priced at the conviction-zero tier. Your own tier is the highest one whose `min_conviction_rao` your cumulative locked α (deposits plus voluntary conviction) meets, so a committed operator posts less α for the same weight: the discount changes what you pay, not your weight (and when the epoch cap truncates what you owe, it truncates your demand by the same factor). `Q` is the exposure-weighted quality of your pool miners as measured by that validator's own trails, clamped by the policy's `quality_transform`. Yuma Consensus takes the stake-weighted median across validators. While the published price is zero every pool's implied demand is exactly 1 (see [Initial period](#initial-period)).
- **The deposit audit.** Validators do not trust your deposit sizing. With `usage_lag_epochs: 1` and `tier_snapshot: conviction_before_epoch`, each validator reads your committed root for the previous epoch, fetches the signed artifact from your API, checks its content hash, signer, finalized boundaries and root, recomputes the required deposit from `total_usage_bytes` and `total_users`, and requires the observed deposit to equal it exactly. `mismatch_action: zero_pool_weight`; a root or artifact still unavailable after the root-commit window is `zero_pool_weight_after_root_window`; the bootstrap epoch must carry a zero deposit. Deposits are also capped per operator per epoch by the policy. Under a zero-price policy no deposit is audited at all: the audit is recorded as `zero_price_no_deposit_required` and your pool is eligible whatever you voluntarily deposited.
- **Head fleets.** Miners that bind into a top-level fleet are promoted out of your payout list for as long as the binding is live (`head_fleet_active`) and earn natively on their fleet's hotkey; they fall back into your pool from the epoch after the binding goes stale.
- **Settlement.** A settlement epoch is 50,400 blocks (about 7 days); the mainnet reference windows are a 1,200-block root-commit window (+4 h), finalization at 14,400 blocks (+48 h), and a claim horizon of 8 epochs plus 1 grace epoch, all fixed by the signed policy. Unclaimed and unallocated remainders, and a missed root's captured emission, carry to your own next epoch (`carry_same_operator`); nothing moves between operators. Claims are permissionless and cannot be paused, and a finalized entitlement cannot be rewritten by any upgrade or owner action.

## What can go wrong

- **A missed root.** If the root is not committed inside the window the epoch still finalizes, the captured emission carries to your next epoch, and validators zero your pool weight from the end of the window until an audit passes. Watch the T-2h alert.
- **A deposit that does not match.** Any difference between your deposit and the validators' recomputation (a different tier table in `st.yml`, a manual `--alpha_rao` override, a cap that truncated the amount) zeroes the pool for the epoch. Keep `deposit_tiers` and `deposit_epoch_cap_rao` equal to the signed policy.
- **A deposit below the runtime transfer floor.** The server preflights each deposit against the vault's immutable `minimumTransferTaoRao` at the current α price and refuses (without reserving a nonce) a usage-based amount whose reserve move is worth less than the floor; the outcome is recorded as failed for that epoch and is not retried.
- **Too few operators.** The signed policy requires at least two healthy operators and two live validators; validators halt steering below that, so the network needs more than one admitted operator to pay anyone.
- **Miners without wallets or exposure.** Miners missing a claim wallet or below `reliability_a_min` assigned hops get no leaf, and a miner seen behind more than one exit address is not assigned hops at all until it is back to one. The unsigned `POST /sn/wallet` path stays closed unless you set `wallet_allow_unsigned: true`; the apps sign the wallet challenge.
- **An artifact your validators cannot fetch.** Validators fetch artifacts from your API by content hash. Keep the blob store and the `/sn/artifact` routes reachable; equivocation (two artifacts for one epoch) is an audit failure.

## Initial period

At launch the published [price sheet](/price) is **0 α per GiB and 0 α per user**, and the signed mainnet policy carries that zero price explicitly: every tier's per-GiB and per-user rate is 0 and `zero_rate_action: equal_demand` is set. While the price is zero, operators make no demand deposits: none are required and none are audited. Copy the same schedule into `st.yml` with `deposit_zero_rate_action: equal_demand` (the server refuses an all-zero tier table without it, so a zero price can never happen by accident); `StDeposit` then owes nothing, sends no transaction and raises no alert, and `bringyourctl st status` reports that the price is zero. Validators give every registered operator pool the same implied demand (exactly 1), so the pool channel is split by their measured quality alone; a voluntary deposit or conviction lock (`addConviction` stays available and still raises your tier for later) neither helps nor hurts your pool. The head channel, the `theta` split, the quality clamp and the cede rule are unchanged, and your epoch pipeline otherwise runs exactly as above: the payout artifact (now also carrying `total_users`) and the root commitment are still required for your miners to claim. Operator admission is owner-gated at launch, so a new operator is registered on the coordinator by the subnet owner after review. This is a deliberate launch mode while bugs are flushed out of the network; watch the price sheet's RSS feed for the change that starts collecting deposits.
