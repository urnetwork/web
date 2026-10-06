---
description: Build and run the current SN25 validator, provision its keys and production configuration, monitor validation, and withdraw native validator rewards.
---

# How to run a validator

The UR validator runs on **Bittensor SN25, netuid 25**. The current [`sn/validator`](https://github.com/urfoundation/sn/tree/main/validator) measures providers through `/verify` trails, retains signed evidence, and submits the resulting miner weights through native commit-reveal. One `validator` process performs both measurement and weight submission.

Validators earn **native Bittensor dividends**. These are separate from the provider rewards claimed from UR's settlement vault. There is no `validator claim` command or validator effort bounty in release 1.0. The withdrawal procedure is below.

This guide covers an SN25 validator. A **root validator on netuid 0** has separate registration, operation and basket claims; registering on root does not start UR validation. See the [miner guide](/docs/miner) and [network operator guide](/docs/operator) for the other UR roles.

## Before you start

Prepare these inputs for the deployment you intend to join:

- A Linux host, persistent storage, and continuous access to each configured operator's HTTPS API and WSS transport, plus the deployment's EVM HTTP(S) and native WS(S) RPC endpoints. The mainnet durable-volume checks require Linux even though the binary can also be built for macOS.
- A Bittensor coldkey wallet with funds for registration, staking and transaction fees. Keep it on the machine used for wallet operations. The running validator needs its hotkey and per-operator client keys, not the coldkey.
- A registered SN25 hotkey with enough stake weight to obtain a validator permit. Registration, the stake threshold and the number of permits are chain state, not fixed amounts in this guide. [Bittensor validator permits](https://www.bittensor.com/docs/guides/validating) explains how eligibility is determined.
- A complete, independently approved **schema-3 production configuration**, its referenced runtime/policy approvals, and the activation and history files for every operator. Obtain these for your actual hotkey, deployment and host paths before starting the service.
- Prepared state directories and a SHA-256-pinned durable-volume declaration for those directories. Mainnet startup requires this declaration and checks the real storage identity.

The current production binary accepts a provisioned schema-3 deployment. Its `init --config`, `register`, `stake add`, `activate` and `status --config` commands still use the older preactivation loader, which rejects schema 3. They do not provide a self-service bootstrap for current mainnet. Use the native wallet steps below for registration and staking; provision mainnet evidence and approval inputs through the deployment's bootstrap process. Changing a schema number or copying a testnet configuration does not produce those inputs. This boundary is documented in [production runtime admission](https://github.com/urfoundation/sn/blob/main/mainnet/VALIDATOR-PRODUCTION-RUNTIME.md).

## 1. Build the current validator

Build from the `sn` revision selected for your deployment. Use the Go version declared in [`sn/go.mod`](https://github.com/urfoundation/sn/blob/main/go.mod) and matching sibling checkouts for its local `replace` directives: `connect` (including `sctp`), `sdk`, `server`, `warp`, `proxy`, `userwireguard`, `glog`, `goidenticons` and `gvisor`.

From the `sn` repository root:

```bash
go build -trimpath -o ./bin/validator ./cli/validator
install -d "$HOME/.local/bin"
install -m 755 ./bin/validator "$HOME/.local/bin/validator"
"$HOME/.local/bin/validator" --help
```

Add `$HOME/.local/bin` to your `PATH` for the commands below. The executable entry point is `cli/validator`; `validator/` is the importable implementation, so `go build ./validator` does not produce the service executable. Record the source revision with the binary so a later deployment can reproduce it.

## 2. Create the service keys

Run key creation as the account that will own the validator's private files, after the host administrator has provisioned its storage. This example uses operators `1` and `2`; substitute the actual operator IDs and include every operator in your deployment configuration:

```bash
umask 077
validator init --state_dir=/var/lib/ur-validator --no_id=1 --no_id=2
```

This creates `/var/lib/ur-validator/hotkey.seed` and a `no-<id>/client.key` for each operator, with mode `0600`. It prints the hotkey's SS58 address and public key, and each client key's public `vpk`. Existing seeds are reused. The hotkey is sr25519; the per-operator client keys are Ed25519. Keep the original keys with the original state across restarts, and back them up privately. Never share a client key or state directory across operators or validators.

The state-directory form of `init` works before a production config exists. If you already operate the registered hotkey, provision its existing seed instead of generating a different identity. The hotkey seed file accepts 32 raw bytes or 64 hexadecimal characters, with an optional `0x` prefix. Keep the per-operator client seed files in their generated form. Do not pass seed material as a shell argument or place it in the YAML configuration.

## 3. Register and stake on SN25

On your **coldkey wallet machine**, install the current Bittensor CLI using its [official installation instructions](https://www.bittensor.com/docs/quickstart). The following examples use the current v11 command surface; check `btcli --version` and the [migration guide](https://www.bittensor.com/docs/migration) if your installation has older `--wallet.name` flags.

Set the public hotkey address to the `hotkey ss58` printed by `validator init`, and select your existing coldkey wallet. These variables contain no secrets:

```bash
VALIDATOR_WALLET='your-coldkey-wallet-name'
VALIDATOR_HOTKEY='your-validator-hotkey-ss58'

btcli -n finney query subnet-hyperparameters --netuid 25 --json
btcli -n finney query metagraph --netuid 25 --json
```

Inspect current registration availability and cost before submitting. Preview [registration](https://www.bittensor.com/docs/tx/burned-register), then submit the same operation with confirmation:

```bash
btcli -n finney -w "$VALIDATOR_WALLET" tx burned-register \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY" --dry-run

btcli -n finney -w "$VALIDATOR_WALLET" tx burned-register \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY"
```

If the hotkey is already registered to the intended coldkey, keep that registration. Registration alone does not grant a validator permit.

Choose the TAO amount to stake based on current eligibility and your available balance, leaving funds for fees. Enter that amount when prompted:

```bash
read -r -p 'TAO amount to stake: ' VALIDATOR_STAKE_TAO
btcli -n finney -w "$VALIDATOR_WALLET" tx add-stake \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY" \
  --amount-tao "$VALIDATOR_STAKE_TAO" --dry-run

btcli -n finney -w "$VALIDATOR_WALLET" tx add-stake \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY" \
  --amount-tao "$VALIDATOR_STAKE_TAO"
```

[`add-stake`](https://www.bittensor.com/docs/tx/add-stake) converts TAO to SN25 alpha at the pool price. Review the preview's fees and price protection before confirming. Check the [metagraph](https://www.bittensor.com/docs/query/metagraph) again after finalization and permit assignment; your hotkey, owning coldkey, UID, stake and validator permit must match the production inputs.

The SN binary also retains `validator register` and `validator stake add` for configurations admitted by its older loader. They default to dry runs until `--apply`, take a coldkey seed file, and express stake amounts in **rao**. They are not substitutes for the mainnet schema-3 setup described here.

## 4. Authenticate with every operator

Use a separate account credential and client identity for each configured operator. For the reference operator, obtain an auth code at [ur.io/?auth](https://ur.io/?auth), then run:

```bash
validator auth --api_url=https://api.bringyour.com
install -m 600 "$HOME/.urnetwork/jwt" /var/lib/ur-validator/no-1/network.jwt
```

For another operator, use its actual API and login flow, then copy the newly issued token to that operator's directory. `validator auth -f --api_url=...` explicitly replaces the temporary `$HOME/.urnetwork/jwt`; `validator auth --user_auth=... --api_url=...` prompts for a password instead.

Each operator configuration names `network_jwt_file`, `client_jwt_file` and `client_key_seed_file`. The client JWT is tied to the original client key and identity. A production configuration can explicitly authorize first registration with `allow_client_registration: true`; without that signed permission, provide the existing client credential. An unsupported registration API, missing login or identity mismatch can leave measurement waiting. Preserve the existing identity when recovering authentication.

## 5. Provision the production configuration and evidence

Use the complete approved `release.yml`, not a hand-edited version of a signed configuration. The following is the input checklist for the current [`ReleaseConfig`](https://github.com/urfoundation/sn/blob/main/validator/config.go):

| Input | What to provision |
| --- | --- |
| Production identity | `schema_version: 3`, `production: true`, `release: "1.0"`, the deployment's `deployment_id`, and your nonzero `validator_id`. |
| Network and contracts | Mainnet `chain_id: 964`, `netuid: 25`, the actual `genesis_hash`, `coordinator`, `settlement_vault` and `deploy_block`. |
| Runtime | Reviewed `runtime_spec`, `transaction_version`, `state_version`, `runtime_code_hash` and `runtime_metadata_hash`, plus the approval's finite native block/epoch windows and producer capability. |
| Policy and scheduling | Complete `policy`, its matching `policy_hash`, `version_key`, `trail_depth` equal to the policy's trail depth, and `poll_seconds` from 1 to 60. |
| Native economic approval | The deployment's independently signed `treasury_approval` or `owner_recycle_approval`, with the independent public signer and exact approval file path, byte length and SHA-256. The selectors are mutually exclusive. |
| Connections | Explicit EVM `rpc` HTTP(S) endpoints and native `substrate` WS(S) endpoints. |
| Private service files | `state_dir`, `hotkey_seed_file`, and the separate state and credentials for every operator. |
| Operator directory | Each operator's `no_id`, `api_url`, `connect_url`, distinct `artifact_signer`, credential/key paths and `concurrency`. Include at least `policy.safety.minimum_healthy_no_count` operators. |
| Independence | `controlled_no_ids` lists operators you control so their pools and associated head fleets are masked. |
| Evidence | Full `evidence_v2` bounds and each operator's `activation`, `vpk_signature`, `hotkey_signature`, `context`, `history`, `replay_scratch_root` and `seal_scratch_root`. File references pin the path, bytes and SHA-256. |
| Original request evidence | The deployment's `request_receipt_scope` and `request_preparation` for operators using the original request receipt flow, with their prepared storage. |
| Renewal history | Any selected `production_runtime_approvals`, `production_authority_history` and capacity revision required to replay existing work under its original authority. |

The current treasury production path and its approval format are described in [native treasury production](https://github.com/urfoundation/sn/blob/main/validator/TREASURY-PRODUCTION.md). Validators receive public treasury routing data; a treasury private key is not a validator prerequisite.

Size the host for the approved evidence and history bounds and all configured trail workers. Per-operator `concurrency` must be between 1 and 128, stay within the policy's active-trail cap, and allow each worker to enter the rate-limited seed gate before the step timeout. Increasing concurrency or disk bounds in a signed configuration requires an approved replacement.

Activation records bind each operator's client identity to your registered validator hotkey, with both signatures and finalized evidence-journal publication. Their context and history must cover the configured initial settlement boundary. The production service authenticates these inputs before it starts new work. An empty `evidence_v2.operators` entry is insufficient on mainnet. The older `validator activate --config=...` path cannot render these inputs from a schema-3 configuration.

Keep paths stable when provisioning. Relative paths resolve against the config directory, and moving a config can change their meaning. A representative layout is:

```text
/etc/ur-validator/
  release.yml                    # complete approved production config
  durable-volumes.json           # declaration for this host's actual storage
  approvals/                     # referenced public approval/history files
/var/lib/ur-validator/
  hotkey.seed                     # private sr25519 seed
  state/                         # durable intents and shared validator state
  no-1/
    client.key                   # private Ed25519 seed
    network.jwt
    client.jwt
    ...                          # prepared operator evidence/state
  no-2/                          # separate keys, JWTs and state
  evidence-v2/                   # prepared, hash-pinned activation inputs
  scratch-v2/                    # prepared replay and seal storage
/var/lib/ur-validator-observation/
  progress.json                  # created by the running validator
```

These are example paths, not a substitute for the paths in your approved bundle. Private files need protected ownership and permissions; protocol directories must use the prepared durable storage. Creating empty directories alone does not prepare attempt ledgers or replace their retained history. Put the progress file outside every protocol, key, credential and evidence directory, with an existing parent that is not writable by group or others.

## 6. Run and monitor the validator

Set the durable declaration's **independently accepted SHA-256**; do not substitute a freshly computed hash to bypass a mismatch. Inspect the prepared directories before startup:

```bash
VALIDATOR_VOLUMES_SHA256='sha256:replace-with-the-approved-64-hex-digit-digest'

validator storage-inspect \
  --durable-volumes=/etc/ur-validator/durable-volumes.json \
  --durable-volumes-sha256="$VALIDATOR_VOLUMES_SHA256" \
  --directory=/var/lib/ur-validator/state \
  --directory=/var/lib/ur-validator/no-1 \
  --directory=/var/lib/ur-validator/no-2

validator run --config=/etc/ur-validator/release.yml \
  --durable-volumes=/etc/ur-validator/durable-volumes.json \
  --durable-volumes-sha256="$VALIDATOR_VOLUMES_SHA256" \
  --progress-file=/var/lib/ur-validator-observation/progress.json
```

The foreground command performs real validation and can submit weights once the approved conditions are met. Run exactly one process for each hotkey and state namespace. Use the same arguments under your deployment's service manager; retain the original journals and signed pending transactions on restart. Handle a custody or configuration refusal before restarting instead of deleting state or generating replacement keys.

Watch stderr and the bounded [progress record](https://github.com/urfoundation/sn/blob/main/mainnet/SERVICE-PROGRESS.md). Check several separate signals:

- A recent `heartbeat_at` and `publisher.last_success_at` show process and publication activity.
- `intent` records expose the prepared, finalized and applied transaction boundaries. A submitted or pending transaction is not yet an applied weight vector.
- `settlement` shows the durable epoch cursor and outstanding publication work.
- Operator authentication and trail diagnostics show whether measurement can progress for each operator.
- Native metagraph reads show whether the hotkey still holds its UID and permit and is receiving dividends.

An epoch wait can be normal; a fresh heartbeat alone does not establish successful validation. The current `validator status --config` rejects schema 3, so use the progress record, service logs and native chain reads for this production path. Without `--config`, `validator run` is a legacy measurement-only mode and never writes release weights.

## 7. Collect validator rewards

SN25 validator dividends accrue through Bittensor's native staking accounting. Your coldkey controls your own position; delegated stake and its rewards belong to the delegating coldkeys, subject to the validator's take. UR's coordinator and settlement vault do not custody validator dividends. `provider claim`, `snclaim submit` and the operator's payout Merkle proofs are for the miner/provider reward path.

To take your available SN25 alpha back to **free TAO**, unstake the amount you choose from the actual hotkey holding that position. Use the coldkey wallet machine and the same public wallet variables from step 3. First inspect your positions and choose the amount in **alpha**, not TAO:

```bash
btcli -n finney -w "$VALIDATOR_WALLET" stake list
btcli -n finney -w "$VALIDATOR_WALLET" wallet balance
read -r -p 'SN25 alpha amount to withdraw: ' VALIDATOR_WITHDRAW_ALPHA

btcli -n finney query quote-unstake \
  --netuid 25 --amount-alpha "$VALIDATOR_WITHDRAW_ALPHA" --json

btcli -n finney -w "$VALIDATOR_WALLET" tx remove-stake \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY" \
  --amount-alpha "$VALIDATOR_WITHDRAW_ALPHA" --dry-run
```

The [quote](https://www.bittensor.com/docs/query/quote-unstake) estimates TAO output, fees and slippage. After checking the dry run and the remaining stake, submit with interactive confirmation:

```bash
btcli -n finney -w "$VALIDATOR_WALLET" tx remove-stake \
  --netuid 25 --hotkey "$VALIDATOR_HOTKEY" \
  --amount-alpha "$VALIDATOR_WITHDRAW_ALPHA"

btcli -n finney -w "$VALIDATOR_WALLET" stake list
btcli -n finney -w "$VALIDATOR_WALLET" wallet balance
```

[`remove-stake`](https://www.bittensor.com/docs/tx/remove-stake) swaps available alpha into TAO and credits the signing coldkey's free balance. Check the finalized transaction result and updated balances. Your accumulated position contains principal as well as rewards: there is no separate SN25 “claim only my earnings” balance. Withdrawing stake can affect your permit; locks, collateral, fees and pool price protection can limit an operation. If your rewards have been directed to another staking hotkey, select that actual position.

**Root rewards are different.** If you also stake on netuid 0, its basket yield has a separate native root-claim workflow before withdrawal. Follow [Bittensor's root staking and dividends instructions](https://www.bittensor.com/docs/guides/staking#root-stake-and-dividends). Do not use a root claim to collect ordinary SN25 alpha rewards.
