
# How to run a miner

A UR miner supplies an internet exit for a network operator. Validators measure whether it routes traffic, and Bittensor SN25 (netuid 25) distributes rewards in the subnet's native α token, branded $UR.

Most miners join an operator's **pool**. You register a provider identity with that operator, without buying your own Bittensor UID or paying a subnet registration burn. The immutable settlement vault owns the operator's shared pool hotkey and pays your entitlement directly to your Bittensor coldkey. Larger fleets can register their own **head-tier** hotkey and earn native miner emission; [that path](#larger-fleets-and-the-head-tier) has additional requirements.

The steps below serve one operator, the default. One command can instead serve every operator in the published [operator list](https://ur.xyz/operators.yml); see [Mine every listed operator](#mine-every-listed-operator).

This guide follows the current [`sn/miner` implementation](https://github.com/urfoundation/sn/tree/main/miner) and [`cli/miner` entry point](https://github.com/urfoundation/sn/tree/main/cli/miner). The executable is named `provider` in these examples. For the other roles, see [Run a validator](https://ur.xyz/docs/validator) and [Run a network operator](https://ur.xyz/docs/operator).

## Before you start

- Use a Linux or macOS host with a stable internet connection. Current provider identity storage supports these platforms; a build for another platform does not imply support for its durable registration path.
- Create an account with the [network operator](https://ur.xyz/operators) you want to serve. Obtain its API URL, connect URL and current subnet deployment information, including the settlement vault and EVM RPC endpoints.
- To mine every listed operator instead, the list supplies each operator's URLs. In auto mode a Bittensor sr25519 hotkey seed file replaces the operator accounts: the hotkey signs in to each operator without a chain transaction.
- Use one stable public exit address per provider identity. If you run several exits, give each its own provider slot; see [Several exits on one host](#several-exits-on-one-host).
- Have a Bittensor sr25519 coldkey with a prefix-42 SS58 address for receiving rewards. You can sign wallet consent on a separate device and keep the coldkey seed off the provider host.
- To submit pool claims yourself, have a separate secp256k1 EVM relayer key funded with TAO for gas on the selected Subtensor EVM network. The relayer pays transaction fees; the reward destination remains the coldkey in the payout proof.

Obtain deployment details from the operator's published configuration. The mainnet plan uses EVM chain ID 964 and SN25; testnet uses different addresses, chain identity and timing. A successful build or login does not establish that an operator's subnet rewards are activated.

## 1. Get the provider

Download a release build of the provider, or build it from source.

### Download a release

The miner ships under its historical name `provider`, as `urnetwork-provider-<version>.tar.gz` on the [build releases page](https://github.com/urnetwork/build/releases). The tarball holds one binary per platform at `<os>/<arch>/provider`. Use the Linux or macOS binary for your host (see [Before you start](#before-you-start)), such as `linux/amd64` on x86-64 Linux or `darwin/arm64` on Apple silicon:

```bash
VERSION=2026.10.6-1065506180   # the latest tag on the releases page, without the leading v
curl -fSsL -o urnetwork-provider.tar.gz \
  "https://github.com/urnetwork/build/releases/download/v${VERSION}/urnetwork-provider-${VERSION}.tar.gz"
tar -xzf urnetwork-provider.tar.gz
mkdir -p "$HOME/.local/bin"
install -m 755 linux/amd64/provider "$HOME/.local/bin/provider"   # choose your os/arch
export PATH="$HOME/.local/bin:$PATH"
provider --help
```

### Or build from source

Use the Go version required by `sn/go.mod` (currently Go 1.26.5) and compatible revisions of the sibling repositories referenced by its `replace` directives. The source workspace must have this shape:

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

The local replacements are part of the build: use the matched source checkouts or source bundle for the release you are deploying. A checkout of `sn` alone is insufficient. Obtain the matching generated `gvisor` source with that bundle; an arbitrary upstream revision is not a reproducible substitute.

From the `sn` directory:

```bash
mkdir -p "$HOME/.local/bin"
go build -o "$HOME/.local/bin/provider" ./cli/miner
export PATH="$HOME/.local/bin:$PATH"
provider --help
```

You can also install an operator-supplied binary built from the same current source. Check its `--help` for `--allow-client-registration`, `wallet challenge`, `--provider-jwt` and `claim`; an older binary may have different registration and wallet behavior.

## 2. Select an operator and authenticate

The default endpoints are `https://api.bringyour.com` and `wss://connect.bringyour.com`. To select another operator, do this before the first registration:

```bash
provider choose_network https://api.example.net wss://connect.example.net
provider choose_network --show
```

Use the operator's actual URLs in place of the examples. A saved selection applies to later commands. API URLs require HTTPS and connect URLs require WSS, except for explicit loopback development hosts. `choose_network --reset` restores the defaults. Individual commands also accept `--api_url`; `provide` accepts `--connect_url`.

Get an authentication code from the operator's app or account page, then run:

```bash
provider auth
# Paste the authentication code at the prompt.
```

Alternatively, use your account login and enter the password at the prompt:

```bash
provider auth --user_auth='you@example.com'
```

Authentication writes the network bootstrap token to `~/.urnetwork/jwt`. If a token already exists, the command asks before replacing it; `-f` explicitly permits replacement. This account token lets the provider register or refresh its own client identity. Wallet consent and provider claims use the resulting **provider token**, not the bootstrap token.

Run these commands and the eventual service as the same operating-system user. No environment variables are required for the default setup. Keep each operator in its own provider state and account context: changing URLs does not reassign an existing provider identity to a different operator.

### Mine every listed operator

`provider provide --all-operators` mines every operator in the operator list published at [ur.xyz/operators.yml](https://ur.xyz/operators.yml), with one provider process per operator. The one-line auto mode signs in to each operator with your Bittensor hotkey, as a TAO wallet:

```bash
provider provide --all-operators --auto-register --hotkey_seed_file=/absolute/private/hotkey.seed
```

No chain transaction is involved. The first sign-in creates the hotkey's network on that operator, and each new operator directory registers its first provider client: `--auto-register` implies `--allow-client-registration`, which never replaces a retained identity. The seed file holds the hotkey's 32-byte sr25519 seed, raw or as 64 hexadecimal characters, in a private file that the provider never creates.

To authenticate operators yourself instead, list them, then authenticate each one with an auth code, your account login or the hotkey:

```bash
provider operators
provider auth --operator='<domain>'
provider auth --operator='<domain>' --user_auth='you@example.com'
provider auth --operator='<domain>' --hotkey_seed_file=/absolute/private/hotkey.seed
```

`provider operators` prints the list's source and digest, then each operator's domain, credential state (`jwt present` or `awaiting auth`), API URL and connect URL. `provider auth --operator` prompts for the code or password you don't pass, and writes that operator's token to `~/.urnetwork/operators/<domain>/jwt`. An operator authenticated this way has no provider client yet, so the first run needs the creation flag; later runs don't:

```bash
provider provide --all-operators --allow-client-registration
```

An operator without a token gets no provider. The log shows `operator <domain> is awaiting auth: provider auth --operator=<domain>`, and the miner checks again every five minutes. [Running every listed operator](#running-every-listed-operator) describes the supervised providers.

## 3. Register once and start providing

For a genuinely new installation:

```bash
provider provide --allow-client-registration
```

The first start retains the provider's Ed25519 key, registers its direct provider slot, saves its client credential and begins serving. Leave it running while you set the wallet in another terminal. Record the printed `client_id`; this is the provider identity used for measurement and payout attribution.

For subsequent starts:

```bash
provider provide
```

The provider reuses its retained identity and registration operation. Do not clear its files or add the creation flag to work around a missing key or identity mismatch. An installation upgrading from a legacy `.provider.key` may require the explicit, one-time `--adopt-legacy-provider-key` assertion after you identify the original key; see the [registration and recovery instructions](https://github.com/urfoundation/sn/blob/main/miner/PROVIDER-REGISTRATION.md).

Useful runtime options are:

```bash
provider provide --max-memory=1gib
provider provide -v
provider provide --port=8080
```

`--max-memory` is a soft memory target, accepting bytes or `b`, `kib`, `mib` and `gib` suffixes. Without it, the target comes from host memory. `-vv` increases logging further. `--port=8080` exposes status JSON on all interfaces at port 8080; restrict that port to your monitoring network. The default port `0` disables the status server.

The process stays in the foreground until stopped with Ctrl-C or a termination signal. `auth-provide` combines authentication and providing; a new installation still needs `--allow-client-registration`.

### Running every listed operator

With `--all-operators`, one process supervises a provider for each listed operator:

- Each operator has its own state directory, `~/.urnetwork/operators/<domain>/`, with its own token, provider key and client credential. These are new provider identities: the single-operator identity in `~/.urnetwork` is not used, and a network saved with `choose_network` does not apply.
- The list is refetched every hour. `--operators-refresh=<duration>` changes the interval, as a Go duration of at least `1m`, such as `30m`, and `--operators-url=<url>` follows another list. The last good copy is kept as `~/.urnetwork/operators.yml`, so mining continues while ur.xyz is unreachable.
- A newly listed operator gets a provider once it has a token, and an operator whose URLs change has its provider restarted. A delisted operator's provider gets SIGTERM, then SIGKILL after 60 seconds; its directory is kept.
- A provider that exits restarts after 30 seconds, doubling up to 10 minutes. Ctrl-C or a termination signal stops every provider.
- `--max-memory` is divided evenly between the providers, and a provider restarts when its share changes. `--port` serves the status of every operator; the providers themselves run without a status port.
- The first provider process to take TCP 443 serves the extender for the host.
- `--all-operators` refuses `--api_url`, `--connect_url`, `--provider-jwt`, `--wallet` and its consent flags, `--adopt-legacy-provider-key`, `--test-egress-source-ip`, and the capture and close-report flags, which stay single-operator.

### Retain the provider state

The default state directory is `~/.urnetwork`. Back up the complete directory privately after stopping its writers, and restore it as one identity. Do not run simultaneous copies of the same state.

| File or directory | Purpose |
| --- | --- |
| `jwt` | Operator account bootstrap credential. |
| `.provider.key` and `.provider.key.identity` | Original Ed25519 seed and identity marker. |
| `.provider.key.registration.lock` | Local registration ownership lock. |
| `.provider.jwt` | Direct provider's renewable client credential. |
| `.provider.jwt.registration*` | Retained registration request, first-send and recovery state. Preserve every side file. |
| `.provider.jwt.wallet-consent/` | Signed wallet-consent history, including pending originals. |
| `.provider.cert`, `.provider.extender.key` | Provider certificate and ingress identity, when present. |
| `network.json` | Selected operator endpoints. |
| `proxy` | Optional SOCKS5 exit configuration. |
| `operators.yml` | Last good copy of the operator list, with `--all-operators`. |
| `operators/<domain>/` | One listed operator's own state, with the files above. |
| `hotkey-wallet/` | Signed hotkey payout chain (`originals.json`) and any pending statement (`pending.json`). |

Losing or editing identity files can prevent recovery even if account login still works.

## 4. Set the wallet that earns pool rewards

Set a wallet after the provider registers, using its retained `.provider.jwt`. Consent binds the exact provider, deployment, predecessor and earning interval to your coldkey. Merely storing a wallet address in an account profile does not establish this signed provider mapping.

### Sign on another device

Request the statement to sign:

```bash
provider wallet challenge '<coldkey_ss58>'
```

Sign the exact printed statement with that coldkey and use the `wallet set` command printed by the challenge. Its shape is:

```bash
provider wallet set '<coldkey_ss58>' \
  --message='<exact printed statement>' \
  --signature='0x<64-byte sr25519 signature>'
```

Use the exact UTF-8 message, with LF line endings and no extra trailing newline, in the sr25519 `substrate` signing context. A Polkadot extension `signRaw` of type `bytes`, which wraps the statement in `<Bytes>...</Bytes>`, is also accepted. A literal `\n` in `--message` stands for a line break. Submit within the challenge's five-minute maximum lifetime. The printed command preserves the selected API URL and provider token path.

### Sign with a local seed file

On a host where you deliberately keep the coldkey seed, the CLI can obtain and sign the statement itself:

```bash
provider wallet set '<coldkey_ss58>' \
  --coldkey_seed_file=/absolute/private/coldkey.seed
```

The file must already exist, be owned by the user, have private permissions such as `0600`, and have no symlinked path components. It contains the raw 32-byte sr25519 mini secret or 64 hexadecimal characters, optionally prefixed with `0x`; it is not a mnemonic phrase. The command refuses a seed that derives a different address. The seed is used locally and never sent to the operator.

You can do the same signed setup at startup with `provide --wallet='<coldkey_ss58>' --coldkey_seed_file=/absolute/private/coldkey.seed`. A wallet failure is logged while traffic serving continues, so check the result before assuming rewards are configured.

### When the wallet mapping takes effect

Default consent starts at the next earning epoch and covers 65,536 epochs. To select a shorter exact interval, pass both `--wallet-from-epoch=<epoch>` and `--wallet-through-epoch=<epoch>` to the challenge/set flow. The operator's prospective boundary remains authoritative. Set the wallet before the epoch in which you intend to earn, and renew consent before its interval ends.

Before submitting, the CLI retains the signed original under `<provider-jwt-path>.wallet-consent/history.json`. Keep it with the credential. A retry reconciles and replays the same pending original, including after the seed is removed from the host. A new mapping does not redirect earlier earned obligations.

For a proxy provider, add `--provider-jwt=/absolute/path/to/.provider-<hash>.jwt` to select that slot for both wallet commands and claims. Every provider that should earn needs its own valid consent; several providers may choose the same coldkey.

### Sign once for every listed operator

With `--all-operators`, one coldkey signature sets the payout wallet on every operator. The coldkey and the hotkey both sign one global consent that maps the hotkey to the coldkey, kept as a chain under `~/.urnetwork/hotkey-wallet/`. Each authenticated operator then stores the chain, and the hotkey alone signs a delegation of your network there to the chain's head. The coldkey never signs per operator.

Request the statement:

```bash
provider wallet hotkey challenge '<coldkey_ss58>' \
  --hotkey_seed_file=/absolute/private/hotkey.seed
```

Sign the exact printed statement with the coldkey in the same sr25519 `substrate` context, then run the `wallet hotkey set` command the challenge prints. Its shape is:

```bash
provider wallet hotkey set '<coldkey_ss58>' \
  --hotkey_seed_file=/absolute/private/hotkey.seed \
  --message='<exact printed statement>' \
  --signature='0x<64-byte sr25519 signature>'
```

The statement stays pending in `hotkey-wallet/pending.json` until it is set or replaced. On a host where you deliberately keep the coldkey seed, pass `--coldkey_seed_file=/absolute/private/coldkey.seed` to `set` in place of `--message` and `--signature`.

`set` adds the hotkey's signature, appends the new generation to the chain, then stores the chain and the delegation at every authenticated operator and reports each one; a failing operator never stops the others. `provider provide --all-operators` with `--hotkey_seed_file` keeps every authenticated operator delegated, at start and every hour, including operators listed later, so the coldkey signs only once. `provider wallet hotkey status` shows the chain, any pending statement and each operator's delegation.

Unless `--wallet-from-epoch` and `--wallet-through-epoch` choose them, generation 1 earns from epoch 0 and a later generation from the operators' current epoch plus 1. Each delegation starts at the operator's current epoch plus 2, past its prospective boundary, and every interval covers 65,536 epochs. A later generation changes the coldkey or the epochs.

An operator pays a provider by precedence: the provider's own wallet consent (`provider wallet set`), then a network consent, then the hotkey delegation.

## 5. Keep the provider running

After initial registration and wallet setup, a Linux user service can restart the retained provider automatically. Create `~/.config/systemd/user/urnetwork-provider.service`:

```ini
[Unit]
Description=URnetwork provider

[Service]
ExecStart=%h/.local/bin/provider provide
Restart=always
RestartSec=10
UMask=0077

[Install]
WantedBy=default.target
```

Stop the foreground instance, then enable the service:

```bash
systemctl --user daemon-reload
systemctl --user enable --now urnetwork-provider.service
journalctl --user -u urnetwork-provider.service -f
```

Enable lingering for that user if it must run after logout (`loginctl enable-linger`). Keep the creation flag out of the normal service command so missing state requires an explicit recovery decision.

To serve every listed operator, run the same unit with `ExecStart=%h/.local/bin/provider provide --all-operators --auto-register --hotkey_seed_file=/absolute/private/hotkey.seed`. In auto mode the service keeps `--auto-register`, so each newly listed operator registers its first provider client; it never replaces a retained identity. If you authenticate operators yourself, leave out `--auto-register`, keep `--hotkey_seed_file` if you use the hotkey payout, and add `--allow-client-registration` only for the first start after authenticating a new operator.

## How rewards accrue

Pool rewards depend on completed traffic and measured reliability. The operator records completed work against the original provider identity and uses the epoch's signed wallet mapping. **Equal completed paid and free traffic receives equal usage credit.** Account balances, escrow reservations, subscription payments and uncompleted contracts are not proof of work performed.

The pool payout weight is proportional to:

```text
completed usage bytes × reliability
reliability = confirmations / max(assignments, reliability_a_min)
```

The implementation represents reliability in parts per million. To enter the payout list, a provider needs positive completed usage, at least the required number of assigned verification hops, at least one confirmation, a valid earning wallet and no active head-fleet exclusion. Eligible contributions sharing one coldkey are aggregated into one leaf, and the shares are allocated across the pool in basis points.

Validators independently measure routing quality and weight the operator pools and eligible head fleets. The current mainnet launch plan assigns **10% of the native miner allocation to providers**, split between the pool and head channels by policy, with the other 90% received by `ur-reserve` for network improvements. This is a launch policy, not a fixed payment per byte; use the operator's activated policy and published payout artifacts to inspect actual earnings. The reserve is separate from the settlement vault's provider claim collateral.

A settlement epoch is defined by the deployed contracts and signed policy. The mainnet reference uses 50,400 blocks, about seven days at a 12-second block time. After the epoch closes, its payout root must be committed and finalized before claims open. Read the returned `claim_open_block` and the operator's deployment windows rather than assuming recent work is immediately claimable.

## 6. Claim pool rewards

The provider fetches your proof from the operator, recomputes the Merkle leaf and checks the proof. Supply the deployment's EVM RPC endpoint to also compare the root with the settlement vault:

```bash
provider claim --epoch='<settlement_epoch>' --rpc='https://<evm-json-rpc>'
```

With no key, this command verifies and prints the `epoch`, `no_id`, `coldkey`, `share_bps`, payout roots, vault `contract`, `claim_open_block` and claim calldata. Review the destination coldkey, contract and chain ID against the operator's published deployment. `--rpc` is repeatable for ordered endpoint failover. A proof or root mismatch causes a nonzero exit and must be resolved before submission.

Omitting `--epoch` selects `current_epoch - 1`. Although the CLI labels this the last finalized epoch, it can still be inside the root-commit or challenge window; the contract must actually be finalized and open. Specify older unclaimed epochs explicitly.

With `--all-operators`, each operator settles its own pool, so claim from each operator separately. Select that operator's provider credential, and its API URL as `provider operators` prints it:

```bash
provider claim --epoch='<settlement_epoch>' --rpc='https://<evm-json-rpc>' \
  --provider-jwt="$HOME/.urnetwork/operators/<domain>/.provider.jwt" \
  --api_url='<operator api_url>'
```

Place the funded EVM relayer's hex-encoded 32-byte secp256k1 key in a private file. First check the claim without broadcasting:

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

`--key_file` requires `--rpc`. Any funded relayer can submit the proof; it cannot change the leaf's coldkey or receive its α. The reward is transferred as native α stake to the beneficiary coldkey. The coldkey seed is not needed to relay the claim.

Read the receipt events separately:

| Event | Meaning |
| --- | --- |
| `Claimed` | The vault accepted the entitlement and credited the coldkey. This alone does not prove a transfer. |
| `ClaimPaid` | Accumulated credit was transferred to the coldkey. |
| `ClaimPaymentDeferred` | Credit remains in the vault, for example because it is below the runtime transfer minimum, the price is unavailable or the runtime transfer failed. |

Deferred credit survives entitlement expiry. A later claim can pay the accumulated credit once payment is possible. The vault also exposes the permissionless `withdrawClaimCredit(bytes32 coldkey)` method to retry existing credit; the current `provider` and `snclaim` CLIs do not provide a withdrawal subcommand. Re-submitting an already accepted leaf is not a withdrawal and will fail as already claimed.

### Separate proof fetching from transaction submission

For a separate relayer host, build the claim submitter from the same source:

```bash
# From sn/:
go build -o "$HOME/.local/bin/snclaim" ./cli/snclaim
```

Or download it from the same release: the [releases page](https://github.com/urnetwork/build/releases) also ships `urnetwork-snclaim-<version>.tar.gz`, which holds `<os>/<arch>/snclaim` for Linux and macOS. Install it the way [Download a release](#download-a-release) installs the provider.

Fetch and verify with `provider claim` on the provider host, then submit its exact calldata and vault address on the relayer host:

```bash
snclaim submit --calldata='0x<verified claim calldata>' \
  --contract='0x<settlement vault>' --rpc='https://<evm-json-rpc>' \
  --chain_id=964 --key_file=/absolute/private/relayer.key --dry-run
```

Use the deployment's actual chain ID; remove `--dry-run` to broadcast. This separates the keys between hosts, but the submitter still needs an RPC connection. To inspect whether the leaf is already accepted:

```bash
snclaim status --epoch='<settlement_epoch>' --no_id='<operator id>' \
  --coldkey='<coldkey_ss58>' --contract='0x<settlement vault>' \
  --rpc='https://<evm-json-rpc>'
```

### Optional automatic claims

The claim daemon retains pending and signed claims in a durable queue and reconciles finalized EVM outcomes across restarts. Its configuration is strict YAML:

```yaml
schema_version: 1
release: "1.0"
api_url: https://api.example.net
rpc:
  - https://evm-rpc.example.net
key_file: /home/miner/.urnetwork/private/relayer.key
jwt_file: /home/miner/.urnetwork/.provider.jwt
state_dir: /var/lib/urnetwork/claims/provider-1
poll_seconds: 30
lookback_epochs: 2
```

Replace these paths and endpoints. Relative file paths are resolved against the configuration file. `jwt_file` selects the provider credential and must be a private regular file; omitting it selects the default `.provider.jwt`. `poll_seconds` accepts 5–3,600; the default initial lookback is two epochs, with a maximum of 256.

Before starting, prepare the claim-queue storage and obtain the exact durable-volume declaration and reviewed digest for the host. These are required by current storage admission; creating an empty directory or omitting the flags is insufficient. The declaration uses the daemon-volume schema and covers the actual `state_dir` and retained queue. See [claim queue ownership](https://github.com/urfoundation/sn/blob/main/miner/CLAIM-QUEUE-OWNERSHIP.md) and the repository's [offline storage preparation](https://github.com/urfoundation/sn/blob/main/mainnet/OWNER-CUSTODY-PREPARATION.md) instructions for the storage workflow.

```bash
provider claim-daemon --config=/absolute/path/claim.yml \
  --durable-volumes=/absolute/path/reviewed-daemon-volumes.json \
  --durable-volumes-sha256='sha256:<reviewed digest>'
```

Run one owner for each queue and relayer key. Do not submit one-shot claims or run another daemon with that key concurrently. Preserve the complete queue directory, including custody side files, after an interrupted submission. A queue marked `uncertain` needs reconciliation of its original signed transaction. A finalized claim entry establishes acceptance; use payment events to distinguish paid rewards from deferred credit.

Claim before the deployed entitlement expires. The mainnet reference window is eight epochs plus one grace epoch; unclaimed entitlements can then become carry for the same operator's pool. This expiry does not erase credit already accepted by `claim`.

## Several exits on one host

The provider supports SOCKS5 exits, with a separate client slot for each effective proxy address:

```bash
provider proxy add '<host>:<port>:<user>:<pass>'
provider proxy add --proxy_file=/absolute/private/proxies.txt
provider provide --allow-client-registration
```

Use the creation flag only when adding genuinely new slots. Ordinary restarts use `provider provide`. Each slot retains a `.provider-<hash>.jwt` and its registration side files. Select that token with `--provider-jwt` when setting its wallet and fetching claims. The shared `.provider.key` and all slot histories belong in the same backup. Provider identity and unique routable exit coverage matter; adding accounts behind the same exit does not manufacture additional coverage.

With `--all-operators`, the `proxy` file in `~/.urnetwork` is copied into each operator's directory when its provider starts.

## Larger fleets and the head tier

A head fleet binds many provider client IDs to one Bittensor hotkey. Validators score distinct routable exit prefixes, sharing a prefix's weight when fleets overlap. The hotkey earns native miner emission and uses the chain's normal coldkey/hotkey stake management; there is no pool Merkle claim for that head reward. Providers with active head bindings are excluded from the pool payout list for the corresponding epoch.

The current workflow is:

1. Create a canonical `urnetwork-fleet-manifest-v1` JSON manifest containing the deployment's chain ID, netuid and coordinator, a stable fleet ID, fleet hotkey, generation, and providers' client IDs and public keys. Inspect it with `provider fleet manifest --manifest=/absolute/path/fleet.json`.
2. Preview `provider fleet register` with the manifest, hotkey and owning coldkey seed files, and native `--substrate` endpoints. Registration is a dry run unless `--apply` is present. Use `--burn_limit_rao` and `--fee_limit_rao` to bound registration costs.
3. Use `provider fleet publish` to publish the manifest commitment, then `provider fleet bind` for each member. Each binding needs both the original provider client seed and fleet hotkey signature, a finite earning-epoch interval and an EVM relayer.
4. Inspect with `provider fleet status`; use `provider fleet revoke` to revoke a member prospectively.

Production fleet commands require an independently reviewed `--mainnet-runtime-authority` document and its `--mainnet-runtime-authority-sha256`. Fleet writes also require the prepared owner-local durable-volume declaration selected with `--durable-volumes` and `--durable-volumes-sha256`. The repository does not ship a universal mainnet authority pin. Obtain these deployment-specific inputs before signing; a testnet pin or a fresh RPC observation is insufficient. See the [complete fleet authority and recovery contract](https://github.com/urfoundation/sn/blob/main/miner/FLEET-MAINNET-RUNTIME.md) and `provider --help` for exact arguments.

Keep the fleet coldkey on the registration/signing host. The always-on provider only needs its original provider identity and credentials. A larger fleet does not automatically retain a UID: native registration, validator scores and the chain's pruning rules still determine eligibility and emission.

## Troubleshooting

- **`startup_recovery_required`:** recover the original key, identity marker, registration history and credentials together. New account login does not replace a lost provider identity.
- **`operator <domain> is awaiting auth`:** with `--all-operators`, that operator has no token yet. Run `provider auth --operator=<domain>`, or start with `--auto-register --hotkey_seed_file=<path>`. The miner checks again every five minutes.
- **No payout leaf:** check positive completed usage, enough verification assignments, a confirmation and signed wallet consent for the earning epoch. An active head binding moves its earning path out of the pool.
- **Wallet change appears late:** consent is prospective. Review the exact earning interval; it cannot rewrite an earlier payout destination.
- **Claim proof is not ready:** confirm the operator published this provider's contribution and finalized the epoch's root. A network bootstrap JWT cannot substitute for `.provider.jwt`.
- **Proof or root mismatch:** retain the output and compare the deployment, epoch and artifact with the operator. Waiting or changing wallets is not a fix for contradictory proof bytes.
- **Claim accepted but balance unchanged:** inspect `ClaimPaid` versus `ClaimPaymentDeferred`, and check native α stake for the beneficiary coldkey. The EVM relayer's balance is not the reward balance.
- **Lost connection during a claim:** reconcile the existing transaction or retained daemon queue before using the relayer again. Keep signed transaction history intact.

`--legacy-network-wallet` and `claim --legacy-coldkey` are compatibility paths for retained historical records. They do not establish a new provider earning-wallet consent or infer old ownership from the current account wallet. Use them only with the operator's original legacy records.
