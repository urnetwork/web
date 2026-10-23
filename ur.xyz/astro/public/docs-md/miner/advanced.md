
# Advanced mining

Most miners don't need this page: the [quick start](https://ur.xyz/docs/miner#quick-start) covers one device serving one operator. Read on if you want to serve every operator, run several exits from one host, automate claims or run a large fleet. If you used an installer, type `urnetwork` wherever this page says `provider`.

## Mine every listed operator

`provider provide --all-operators` mines every operator in the list published at [ur.xyz/operators.yml](https://ur.xyz/operators.yml), with one miner process per operator. The simplest way signs in to each operator with a Bittensor **hotkey**, as a TAO wallet:

```bash
provider provide --all-operators --auto-register --hotkey_seed_file=/absolute/private/hotkey.seed
```

No chain transaction is involved. The first sign-in creates the hotkey's network at that operator, and each new operator registers its first device: `--auto-register` implies `--allow-client-registration`, which never replaces an identity the miner already has. The seed file holds the hotkey's 32-byte sr25519 seed, raw or as 64 hexadecimal characters, in a private file that the miner never creates.

To sign in to operators yourself instead, list them, then sign in to each with an auth code, your account login or the hotkey:

```bash
provider operators
provider auth --operator='<domain>'
provider auth --operator='<domain>' --user_auth='you@example.com'
provider auth --operator='<domain>' --hotkey_seed_file=/absolute/private/hotkey.seed
```

`provider operators` prints where the list came from and its digest, then each operator's domain, sign-in state (`jwt present` or `awaiting auth`), API URL and connect URL. `provider auth --operator` asks for the code or password you don't pass, and saves that operator's sign-in in `~/.urnetwork/operators/<domain>/jwt`. An operator signed in this way has no device yet, so the first start needs the registration flag; later starts don't:

```bash
provider provide --all-operators --allow-client-registration
```

An operator without a sign-in gets no miner. The log shows `operator <domain> is awaiting auth: provider auth --operator=<domain>`, and the miner checks again every five minutes.

### How it runs

With `--all-operators`, one process looks after a miner for each listed operator:

- Each operator has its own folder, `~/.urnetwork/operators/<domain>/`, with its own sign-in, identity key and device credential. These are new device identities: the single-operator identity in `~/.urnetwork` isn't used, and an operator chosen with `provider network use` doesn't apply.
- The list is fetched again every hour. `--operators-refresh=<duration>` changes that, as a Go duration of at least `1m` such as `30m`, and `--operators-url=<url>` follows another list. The last good copy is kept as `~/.urnetwork/operators.yml`, so mining continues while ur.xyz is unreachable.
- A newly listed operator gets a miner once it has a sign-in, and an operator whose URLs change has its miner restarted. A delisted operator's miner gets SIGTERM, then SIGKILL after 60 seconds; its folder is kept.
- A miner that exits restarts after 30 seconds, doubling up to 10 minutes. Ctrl-C or a termination signal stops every miner.
- `--max-memory` is split evenly between the miners, and a miner restarts when its share changes. `--port` serves the status of every operator; the miners themselves run without a status port.
- The first miner process to take TCP port 443 serves the extender for the host.
- `--all-operators` refuses `--api_url`, `--connect_url`, `--provider-jwt`, `--wallet` and its signing flags, `--test-egress-source-ip`, and the capture and close-report flags, which stay single-operator.

To run it as a [service of your own](https://ur.xyz/docs/miner/run#a-service-of-your-own), use `ExecStart=%h/.local/bin/provider provide --all-operators --auto-register --hotkey_seed_file=/absolute/private/hotkey.seed`. In auto mode the service keeps `--auto-register`, so each newly listed operator registers its first device; it never replaces an identity the miner already has. If you sign in to operators yourself, leave out `--auto-register`, keep `--hotkey_seed_file` if you use the hotkey payout below, and add `--allow-client-registration` only for the first start after signing in to a new operator.

### Sign once for every listed operator

With `--all-operators`, one coldkey signature sets the payout wallet at every operator. The coldkey and the hotkey both sign one global statement that maps the hotkey to the coldkey, kept as a chain in `~/.urnetwork/hotkey-wallet/`. Each signed-in operator then stores the chain, and the hotkey alone signs a delegation of your network there to the chain's latest entry. The coldkey never signs per operator.

Ask for the statement:

```bash
provider wallet hotkey challenge '<coldkey_ss58>' \
  --hotkey_seed_file=/absolute/private/hotkey.seed
```

Sign the exact printed statement with the coldkey, in the same sr25519 `substrate` context as a [normal wallet](https://ur.xyz/docs/miner/rewards#set-your-payout-wallet), then run the `wallet hotkey set` command the challenge prints. It looks like this:

```bash
provider wallet hotkey set '<coldkey_ss58>' \
  --hotkey_seed_file=/absolute/private/hotkey.seed \
  --message='<exact printed statement>' \
  --signature='0x<64-byte sr25519 signature>'
```

The statement waits in `hotkey-wallet/pending.json` until it's set or replaced. If you deliberately keep the coldkey seed on this computer, pass `--coldkey_seed_file=/absolute/private/coldkey.seed` to `set` instead of `--message` and `--signature`.

`set` adds the hotkey's signature, appends the new entry to the chain, then stores the chain and the delegation at every signed-in operator and reports each one; one operator failing never stops the others. `provider provide --all-operators` with `--hotkey_seed_file` keeps every signed-in operator delegated, at start and every hour, including operators listed later, so the coldkey signs only once. `provider wallet hotkey status` shows the chain, any pending statement and each operator's delegation.

Unless `--wallet-from-epoch` and `--wallet-through-epoch` choose them, the first entry earns from epoch 0 and a later one from the operators' current epoch plus 1. Each delegation starts at the operator's current epoch plus 2, and every range covers 65,536 epochs. A later entry changes the coldkey or the epochs.

An operator pays a device by precedence: the device's own wallet (`provider wallet set`), then a network-wide wallet, then the hotkey delegation.

### Claims with every operator

Each operator settles its own pool, so claim from each operator separately. Select that operator's device credential and its API URL, as `provider operators` prints it:

```bash
provider claim --epoch='<settlement_epoch>' --rpc='https://<evm-json-rpc>' \
  --provider-jwt="$HOME/.urnetwork/operators/<domain>/.provider.jwt" \
  --api_url='<operator api_url>'
```

## Several exits on one host

The miner supports SOCKS5 exits, with a separate device for each proxy address:

```bash
provider proxy add '<host>:<port>:<user>:<pass>'
provider proxy add --proxy_file=/absolute/private/proxies.txt
provider provide --allow-client-registration
```

Use the registration flag only when you add genuinely new exits; ordinary restarts are `provider provide`. Each exit keeps a `.provider-<hash>.jwt` and its registration side files. Select that file with `--provider-jwt` when you set its wallet and claim for it. The shared `.provider.key` and every exit's files belong in the same backup. What counts is distinct, routable exits: adding accounts behind the same exit doesn't add coverage.

`provider proxy remove` removes exits, and `provider proxy auth add` and `provider proxy auth remove` manage proxy credentials; see `provider proxy --help`. With `--all-operators`, the `proxy` file in `~/.urnetwork` is copied into each operator's folder when its miner starts.

## Claim automatically

### Submit claims from another computer

To keep the relayer key off the miner, check the claim on the miner with `provider claim`, then submit its exact claim data and vault address from another computer with `snclaim`. Build it from the same source:

```bash
# From sn/:
go build -o "$HOME/.local/bin/snclaim" ./cli/snclaim
```

Or download it from the same release: the [releases page](https://github.com/urnetwork/build/releases) also has `urnetwork-snclaim-<version>.tar.gz`, with `<os>/<arch>/snclaim` for Linux and macOS. Install it the way [Manual download](https://ur.xyz/docs/miner/install#manual-download) installs the miner. Then:

```bash
snclaim submit --calldata='0x<verified claim calldata>' \
  --contract='0x<settlement vault>' --rpc='https://<evm-json-rpc>' \
  --chain_id=964 --key_file=/absolute/private/relayer.key --dry-run
```

Use your deployment's actual chain ID, and remove `--dry-run` to send it. The submitting computer still needs an RPC connection. To see whether a claim was already accepted:

```bash
snclaim status --epoch='<settlement_epoch>' --no_id='<operator id>' \
  --coldkey='<coldkey_ss58>' --contract='0x<settlement vault>' \
  --rpc='https://<evm-json-rpc>'
```

### The claim daemon

The claim daemons run on Linux and macOS only. The claim daemon keeps pending and signed claims in a durable queue and follows their results on the EVM chain across restarts. Its configuration is strict YAML:

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

Replace these paths and endpoints. Relative file paths are resolved against the configuration file. `jwt_file` selects the device credential and must be a private regular file; leaving it out selects the default `.provider.jwt`. `poll_seconds` accepts 5 to 3,600; the default lookback is two epochs, up to 256.

Before starting, prepare the claim-queue storage and get the exact durable-volume declaration and its reviewed digest for the host. Current storage admission requires them; an empty folder or leaving the flags out isn't enough. The declaration uses the daemon-volume schema and covers the actual `state_dir` and queue. See [claim queue ownership](https://github.com/urfoundation/sn/blob/main/miner/CLAIM-QUEUE-OWNERSHIP.md) and the [offline storage preparation](https://github.com/urfoundation/sn/blob/main/mainnet/OWNER-CUSTODY-PREPARATION.md) instructions.

```bash
provider claim-daemon --config=/absolute/path/claim.yml \
  --durable-volumes=/absolute/path/reviewed-daemon-volumes.json \
  --durable-volumes-sha256='sha256:<reviewed digest>'
```

Run one daemon for each queue and relayer key, and don't submit one-off claims or run another daemon with that key at the same time. Keep the whole queue folder, including its side files, after an interrupted submission. A queue entry marked `uncertain` needs its original signed transaction reconciled. A finalized claim entry shows the claim was accepted; the payment events tell paid rewards from deferred credit.

For settlement v2 accounts, `provider claim-daemon-v2` claims an account once its claimable balance reaches `--threshold-rao` (default 1.9 α), and `--claim-now` claims everything claimable once at start. `--v1-config` runs the v1 daemon above in the same process, sharing one relayer key. See `provider claim-daemon-v2 --help` for its options.

## Claim your own miner UID (head tier)

By default every miner earns in its operator's **pool**: the operator's pool UID is paid, and the pool is split among its devices. A large fleet can instead claim **its own miner UID** on the subnet. Validators then weight that UID directly and the chain pays it natively, as α staked on the fleet's own hotkey under its own coldkey, every tempo. There's no pool, no operator and no claim in the payout path.

### Who can get one

Validators give weight to the **top 200 fleets** only; every other fleet's UID gets nothing. Fleets are ranked by **routable exit breadth**, not by traffic:

- Each exit address a validator routes a real verification hop through is reduced to its network prefix (a /29 for IPv4, a /48 for IPv6). A fleet's score is the number of distinct prefixes its devices exit from.
- A prefix shared with other head fleets is split equally between them, so many devices behind one address or in one small range count once.
- The score is smoothed over time (each tempo counts a quarter), so one bad measurement doesn't drop a fleet, and a new fleet takes a while to reach its full score.

A single home connection counts as about one prefix. A head UID pays off for fleets whose devices exit from many different networks, such as hosts spread across many data centers or many residential connections.

To see where you stand, the ur.io **Top 200** page shows your account's estimated score and rank against the cutoff, and whether your devices are bound to a hotkey yet.

### What it costs, and the risks

- **Registration burns α.** The fleet's coldkey pays the subnet's current registration burn, and each new registration raises the next one. `provider fleet register` shows the live burn before it signs anything.
- **UIDs are limited.** When the subnet is full, a new registration replaces the UID with the lowest emission, once that UID's immunity period is over. A fleet that falls out of the top 200 earns nothing, is replaced by the next registration, and has to pay the burn again to come back.
- **One tier at a time.** A device bound to a head fleet earns no pool share while the binding is active. If the fleet loses its UID, its devices go back to earning in their operator's pool. Pool rewards a device already earned stay claimable.
- **Binding is public.** A binding publishes which devices belong to your hotkey, and so the network prefixes they exit from. Devices in the pool aren't linked to you this way.

### How to claim one

You need a Bittensor coldkey with enough TAO for the burn, a hotkey for the fleet, and the miners' identity files (`~/.urnetwork`). Keep the coldkey on one registration computer; the miners only need their own identities. Registering, publishing, binding and revoking on mainnet run on Linux and macOS only.

1. **Write the fleet manifest.** It lists the network's chain ID, netuid and coordinator, a fleet ID, the fleet hotkey, a generation, and each device's client ID and public key. `provider fleet init` builds it from the miners' files, and `provider fleet manifest --manifest=<path>` checks it.
2. **Register the UID.** Run `provider fleet register` with the manifest, the hotkey and coldkey seed files and `--substrate` endpoints. Without `--apply` it's a dry run that quotes the live burn and fee. Add `--apply` to sign and broadcast, with `--burn_limit_rao` and `--fee_limit_rao` as caps: the chain refuses a registration that would burn more than your limit.
3. **Publish the manifest.** `provider fleet publish` puts the manifest's hash on chain from the fleet hotkey.
4. **Bind each device to the hotkey.** Every binding is signed by both the device's key and the fleet hotkey, so nobody can claim devices they don't run. A binding starts no earlier than the next epoch and covers the epoch range you choose (`--valid_from_epoch`, `--valid_to_epoch`). Either:
   - run `provider fleet sign` for each device, which only reads local files, then paste its output into the ur.io Top 200 page and submit the transaction it prepares from your own EVM wallet; or
   - run `provider fleet bind` for each device, which submits the binding itself with an EVM relayer key and `--rpc` endpoints.
5. **Check and maintain it.** `provider fleet status` shows a device's binding and the UID. `provider fleet revoke` removes a device from a future epoch. Bind new devices the same way, and bind again before a binding's last epoch.

On mainnet, `register`, `publish`, `bind`, `status` and `revoke` also need the network's reviewed fleet runtime authority document (`--mainnet-runtime-authority` and its `--mainnet-runtime-authority-sha256`), and the writes need a durable-volume declaration (`--durable-volumes` and `--durable-volumes-sha256`). See the [fleet authority and recovery contract](https://github.com/urfoundation/sn/blob/main/miner/FLEET-MAINNET-RUNTIME.md) and `provider fleet --help` for every option. How the head and pool tiers are scored is in the [whitepaper](https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md), sections 8.4 and 11.4.
