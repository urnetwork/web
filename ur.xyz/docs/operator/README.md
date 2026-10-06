---
description: Run a URnetwork operator in one binary, configure PostgreSQL, Redis and Warp resources for main, and operate the SN25 reward pipeline.
---

# How to become a network operator

A network operator runs the servers of the UR privacy network: the API and connect services that users and miners attach to, the `/verify` endpoint that validators walk, and the epoch pipeline that settles its miners' rewards on **Bittensor SN25 (netuid 25)**. An operator brings its own users and products (the ur.io apps are one operator's), deposits α as a revenue-backed signal of real demand, and each settlement epoch commits the Merkle payout list that splits its pool among its miners. It directs where the pool goes but never holds anyone else's α: the immutable settlement vault owns the pool and every miner claims from it directly.

The [`server/cli/all/main.go`](https://github.com/urnetwork/server/blob/main/cli/all/main.go) entry point runs the API, Connect and the production taskworker together. You deploy one operator executable; PostgreSQL, Redis, artifact storage and public TLS ingress remain backing services. For the mechanism read the [litepaper](/docs/litepaper); for the other roles see [How to become a miner](/docs/miner) and [How to become a validator](/docs/validator).

## Who this is for

Teams that want to run a network space: a deployment of the open-source server stack with its own domain, users, apps or integrations, and a miner community. In the launch phase operator admission is owner-gated (see [Initial period](#initial-period)), so the first step is a conversation with the subnet owner.

## What you need

- **A Linux host and your domain.** The single binary serves the API (`api.<your domain>`), Connect (`connect.<your domain>`) and the full production taskworker. PostgreSQL stores accounts, usage, settlement and the durable task queue; Redis supplies shared coordination and caches; local durable artifact storage holds payout and evidence artifacts. Configure the integrations your operator offers, including extender gossip when using extenders. The optional Alt and Proxy frontends are separate server roles.
- **Admission on the coordinator.** Operators are registered by the subnet owner with `registerOperator(noId, coldkey, poolHotkey, depositHotkey, depositSigner, rootSigner, effectiveEpoch, maximumBurnRao)`, an owner-only call that also has the settlement vault register your pool UID under the vault's own coldkey (the registration burn is paid from the call's value up to `maximumBurnRao`, with the unburned remainder refunded). Later role changes are scheduled future-effective with `scheduleOperator`. You supply the identities; the owner registers them and gives you your `no_id`.
- **Keys and hotkeys.** An operator coldkey (ss58, prefix 42); a **pool hotkey** the vault registers as your pool UID; a **deposit hotkey**, unique to you, on which deposits are staged; and three EVM signers held by the server (hex-encoded secp256k1): the **deposit signer** (`deposit_key`, calls `deposit`), the **root signer** (`root_key`, closes epochs, commits payout roots and finalizes), and the **artifact signer** (`artifact_key`, signs payout artifacts; validators pin it as your `artifact_signer`). The signers need TAO on the Subtensor EVM for gas; the deposit hotkey needs α to deposit (none during the initial period).
- **`/verify` server keys.** One or more Ed25519 keys in the `verify.yml` vault resource; the first signs new trails and all are published at `GET /verify/keys` so historical proofs verify across rotations.
- **Egress probes.** The binary's taskworker runs durable probe shards configured by `config/main/provider_egress_probe.yml`, measuring what each miner's exit actually carries.
- **A public stats feed** (`stats.json`) so the ur.xyz operators directory can list you.

## Step 1: build the single operator binary

Use the current [`urnetwork/server`](https://github.com/urnetwork/server) source and the Go version and **exact sibling revisions** in its [source lock](https://github.com/urnetwork/server/blob/main/local/source-graph/lock.yml). The current lock uses Go 1.26.7. Its sibling checkouts are `connect`, `glog`, `sdk`, `proxy`, `goidenticons`, `userwireguard`, `operator-proxy`, `warp`, `sn` and `gvisor`; `sn` comes from `urfoundation/sn`, and the others from `urnetwork`. Keep these beside `server`: `go.mod` uses relative replacements. Follow the repository's [canonical build instructions](https://github.com/urnetwork/server#canonical-build-sources) when preparing that source tree.

From the `server` checkout:

```bash
GOWORK=off GOTOOLCHAIN=local CGO_ENABLED=0 \
  go build -mod=readonly -p 2 -o build/ur-operator ./cli/all

./build/ur-operator --help
```

Copy `build/ur-operator` to `/usr/local/bin/ur-operator` on the server. Keep the binary's source revision with your release record. Build each upgrade from the dependency revisions selected by that server revision.

## Step 2: create the Warp layout for main

The executable uses the same resolver as the individual server services. `WARP_ENV=main` selects the **deployment environment**; `URNETWORK_ST_PROFILE=mainnet` separately selects the **chain profile**. This example runs the process as a dedicated `urnetwork` Unix user, with public HTTPS terminated by a reverse proxy on the same host.

```bash
sudo useradd --system --home-dir /srv/warp --no-create-home \
  --shell /usr/sbin/nologin urnetwork
sudo install -d -o root -g urnetwork -m 0750 /srv/warp
sudo install -d -o root -g urnetwork -m 0750 \
  /srv/warp/config/main/mmdb /srv/warp/vault/main /srv/warp/site
sudo install -d -o root -g urnetwork -m 0750 /etc/urnetwork
```

Use this layout. Names such as `pg.yml` are literal resource names; `<...>` values in the examples below must be replaced.

```text
/usr/local/bin/ur-operator
/etc/urnetwork/operator.env
/etc/urnetwork/durable-volumes.json   # external declaration for artifact storage
/srv/urnetwork-data/                 # separately mounted persistent filesystem
  operator-blob/                     # preprovisioned artifact root
  operator-identity/                 # external volume marker and root lease
/srv/warp/
  config/
    main/
      db.yml
      redis.yml
      tls.yml
      provider_egress_probe.yml
      sn.yml                         # reviewed earnings/activation declaration
      operator-gas-authority.yml      # independently provisioned public approval
      mmdb/
        geolite2.mmdb                 # real GeoLite2-City database
        places.yml                   # place export from the same database
    all/                             # optional resources shared by environments
  vault/
    main/
      pg.yml
      redis.yml
      jwt.yml
      jwt-signing.pem
      password.yml
      client.yml
      verify.yml
      provider_egress.yml
      minio.yml
      st.yml
      auth.yml                       # OAuth configuration when offering OAuth
      oauth/                         # OAuth's separate signing keys
      extender.yml                   # when offering extender/gossip services
      tls/                           # when enabling Connect's native TLS transports
        connect.example.net/
          connect.example.net.crt
          connect.example.net.key
    all/                             # optional shared vault resources
  site/
    settings.yml                     # host-specific routes/settings
```

Set vault files to `root:urnetwork` mode `0640` and vault directories to `0750`; use `umask 077` when generating secrets. Keep the operator's config and binaries readable but not writable by the service user. PostgreSQL, Redis and object storage need persistent data and backups independent of this resource tree.

Without overrides the roots are `$WARP_HOME/{config,vault,site}`, and `WARP_HOME` defaults to `/srv/warp`. You may instead set `WARP_CONFIG_HOME`, `WARP_VAULT_HOME` and `WARP_SITE_HOME` to other roots. For each resource, the resolver tries direct files at the root, then `main/`, then `all/`; after those it searches version directories in descending semantic-version order. A root-level file therefore overrides the environment copy. A Warp container may mount the already-selected environment directly at a root. Use one layout consistently and avoid stale files at a higher-precedence location.

Write `/etc/urnetwork/operator.env` as plain `NAME=value` assignments, without `export`, so both the shell and systemd can read it:

```dotenv
WARP_HOME=/srv/warp
WARP_ENV=main
URNETWORK_ST_PROFILE=mainnet
WARP_SERVICE=all
WARP_BLOCK=operator-1
WARP_HOST=operator-1.example.net
WARP_DOMAIN=example.net
WARP_VERSION=2026.10.6
WARP_CONFIG_VERSION=2026.10.6
WARP_HOST_IPV4=127.0.0.1
WARP_PORTS=8080:8080,8081:8081,8082:8082,5080:5080
BY_LOG_LOGTOSTDERR=true
```

Replace the domain, host, binary version and configuration version with yours. `WARP_PORTS` is `service-port:host-port`, and includes **5080**, the first internal Connect exchange port. The three HTTP ports must be distinct. Keeping a host IP and an explicit port map also selects which optional native Connect listeners are enabled. Add contiguous internal mappings `5081:5081`, `5082:5082`, and so on when allocating more exchange ports.

For this single-host loopback deployment, `/srv/warp/site/settings.yml` routes the advertised host back to its internal listener:

```yaml
routes:
  operator-1.example.net: 127.0.0.1
```

`config/main/settings.yml`, if present, supplies shared `all:` and host-specific settings, followed by `site/settings.yml` overrides. Keep secrets in the vault, not a `settings.yml` `env_vars` block: startup logs the merged settings. This example uses literal PostgreSQL/Redis/RPC authorities in vault files, so `BRINGYOUR_POSTGRES_HOSTNAME`, `BRINGYOUR_REDIS_HOSTNAME` and `BRINGYOUR_SUBTENSOR_HOSTNAME` are not needed. They are needed only if your resources explicitly interpolate them with `{{ env:NAME }}`.

## Step 3: set up PostgreSQL, Redis and artifact storage

Install and start PostgreSQL and Redis as separate services; the server repository's local setup uses PostgreSQL 18 and Redis 8. On a host with PostgreSQL installed, create the operator's own database and owner role:

```bash
sudo -u postgres createuser --pwprompt urnetwork
sudo -u postgres createdb --owner=urnetwork --encoding=UTF8 \
  --locale=en_US.UTF-8 --template=template0 urnetwork
```

Install the `en_US.UTF-8` locale first if the database host does not have it. Bind PostgreSQL to loopback, and permit password authentication for role `urnetwork` to database `urnetwork` from `127.0.0.1/32` in `pg_hba.conf` using `scram-sha-256`. The migration role must own the database/schema and be able to create and alter its tables and indexes. Use a generated hexadecimal password so it is safe in the connection URL constructed by this server.

Create `/srv/warp/vault/main/pg.yml`:

```yaml
authority: 127.0.0.1:5432
db: urnetwork
user: urnetwork
password: "<the PostgreSQL role password>"
```

Create `/srv/warp/config/main/db.yml`:

```yaml
min_connections: 0
max_connections: 32
```

The maintenance pool falls back to these resources. If adding PgBouncer, keep `pg.yml` pointed at the pooler and put the direct PostgreSQL connection in `vault/main/pg_maintenance.yml`; `config/main/db_maintenance.yml` can size that pool separately. Migrations and maintenance need the direct connection. Budget PostgreSQL's connection limit for both pools and any other clients. The current PostgreSQL client uses `sslmode=disable`, so keep this connection on loopback or a protected private transport.

Configure Redis with persistence and a password. For a package-based Redis service, the relevant `redis.conf` settings are:

```conf
bind 127.0.0.1
protected-mode yes
appendonly yes
maxmemory-policy noeviction
requirepass <a separate generated Redis password>
```

Restart Redis after installing the settings. Create `/srv/warp/vault/main/redis.yml`:

```yaml
authority: 127.0.0.1:6379
password: "<the Redis password>"
cluster: false
db: 0
```

Create `/srv/warp/config/main/redis.yml`:

```yaml
min_connections: 0
max_connections: 32
```

These are separate files: the vault supplies the connection credentials and the config supplies pool sizes. A Redis cluster uses `cluster: true`; this guide uses a standalone instance dedicated to the operator. Neither backing service should be reachable from the public internet.

### Prepare local artifact storage

The payout and evidence code uses the server's `BlobStore` interface. It supports local files; no cloud object-store account is required. The configuration resource is still named `minio.yml`, including for the local backend.

Mount a persistent **separate filesystem** at `/srv/urnetwork-data`, using ext4, XFS or Btrfs, and arrange for it to mount before the service starts. A directory on the system root filesystem, tmpfs or a container overlay does not satisfy daemon storage admission. Size the filesystem for your artifact history and backups.

For a **new, empty operator**, provision the artifact root and its independently retained identity declaration. The following example refuses to reuse existing roots, marker files or a declaration. Run it once as the host administrator after checking that this is the intended mounted volume:

```bash
sudo python3 - <<'PY'
import hashlib, json, os, pathlib, pwd, subprocess

mount = pathlib.Path('/srv/urnetwork-data')
root = mount / 'operator-blob'
identity = mount / 'operator-identity'
declaration = pathlib.Path('/etc/urnetwork/durable-volumes.json')
account = pwd.getpwnam('urnetwork')
if not os.path.ismount(mount) or mount.stat().st_dev == pathlib.Path('/').stat().st_dev:
    raise SystemExit('a separately mounted persistent filesystem is required')
uuid, fs_type = subprocess.check_output(
    ['findmnt', '--noheadings', '--raw', '--output', 'UUID,FSTYPE', '--mountpoint', str(mount)],
    text=True).strip().split()
if fs_type not in ('ext4', 'xfs', 'btrfs'):
    raise SystemExit('unsupported durable filesystem')
if any(p.exists() for p in (root, identity, declaration)):
    raise SystemExit('existing storage requires its original declaration and recovery procedure')
os.umask(0o077)
root.mkdir(mode=0o700)
os.chown(root, account.pw_uid, account.pw_gid)
identity.mkdir(mode=0o750)
os.chown(identity, 0, account.pw_gid)
os.chmod(identity, 0o750)
def digest(data):
    return 'sha256:' + hashlib.sha256(data).hexdigest()
def protected_write(path, data):
    with path.open('xb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.chown(path, 0, account.pw_gid)
    os.chmod(path, 0o640)
marker, lease, generation = os.urandom(32), os.urandom(32), os.urandom(32)
protected_write(identity / 'marker', marker)
protected_write(identity / 'blob-lease', lease)
os.setxattr(root, 'user.urnetwork.durable-root-generation', generation, os.XATTR_CREATE)
config = {'schema': 'urnetwork-durable-volumes-v2', 'volumes': [{
    'mount_path': str(mount), 'filesystem_uuid': uuid, 'filesystem_type': fs_type,
    'marker_path': str(identity / 'marker'), 'marker_sha256': digest(marker),
    'min_available_bytes': 1073741824, 'min_available_inodes': 10000,
    'state_roots': [{'path': str(root), 'lease_path': str(identity / 'blob-lease'),
        'lease_sha256': digest(lease), 'root_inode': root.stat().st_ino,
        'generation_sha256': digest(generation)}]}]}
encoded = (json.dumps(config, indent=2) + '\n').encode()
protected_write(declaration, encoded)
for directory in (root, identity, mount, declaration.parent):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)
print('declaration:', declaration)
print('sha256:', digest(encoded))
PY
```

Record the emitted declaration path and `sha256:` digest, and configure `/srv/warp/vault/main/minio.yml`:

```yaml
authority: local
path: /srv/urnetwork-data/operator-blob
prefix: blob
max_bytes: 107374182400
durable_volumes:
  path: /etc/urnetwork/durable-volumes.json
  sha256: "sha256:<exact declaration digest>"
```

The example allocates at most 100 GiB to blobs and refuses writes below 1 GiB or 10,000 free inodes; choose limits for your host. The declaration binds the filesystem UUID, marker, lease, root inode and 32-byte generation attribute. The service validates those existing objects and never creates a replacement root. Keep their ownership and ancestor directories protected from group/world writes. Preserve the original declaration and bytes on restart; a restore to another inode or filesystem requires an explicit storage migration, not rerunning this fresh setup over retained artifacts. This recipe provisions the operator's file store only; miner claim queues and validator journals have their own owner-state preparation.

An absent `minio.yml` does not provide a filesystem fallback in `main`. Existing deployments can alternatively use the self-hosted MinIO backend supported by [`server/blob.go`](https://github.com/urnetwork/server/blob/main/blob.go), with `authority`, `tls`, `access_key`, `secret_key`, `bucket` and `prefix`. Keep artifact storage and the database together in your recovery plan: miners and validators must still be able to fetch the artifacts referenced by on-chain roots.

## Step 4: configure authentication and ingress

Generate a dedicated P-256 JWT signing key into `vault/main/jwt-signing.pem`, for example with `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out jwt-signing.pem`, then install it with the vault permissions above. Do this in a private directory under `umask 077`. Point `vault/main/jwt.yml` at it:

```yaml
tls_key_paths:
  - jwt-signing.pem
```

The resource name is historical: this can be a dedicated signing key and does not have to be your public HTTPS certificate key. Keep previous JWT keys available during a rotation. Configure two separate random peppers:

```yaml
# vault/main/password.yml
password:
  pepper: "<random password pepper>"
```

```yaml
# vault/main/client.yml
client_ip_hash_pepper: "<different random IP hash pepper>"
```

Install a current, licensed GeoLite2-City database at `config/main/mmdb/geolite2.mmdb` and its matching `places.yml`. The server's `cli/geolite2export` build tool generates the place list from that exact MMDB (`-mmdb <path> -out <path>`); generate it on the build/configuration host and ship both files. The tiny `local/testdata` database is a test fixture, not a production geography database. API and Connect warmup require a valid City database, and location seeding requires its place list.

Create `config/main/tls.yml`, which Connect loads even when the deployment uses only WebSockets:

```yaml
allowed_hosts:
  - connect.example.net
```

For the loopback port map above, configure your HTTPS reverse proxy as follows:

| Public endpoint | Internal listener | Ingress requirement |
| --- | --- | --- |
| `https://api.example.net` | `http://127.0.0.1:8080` | forward the API routes and real client address |
| `wss://connect.example.net` | `http://127.0.0.1:8081` | preserve WebSocket upgrades and long-lived connections |
| worker status | `http://127.0.0.1:8082/status` | keep private for monitoring |
| Connect exchange | TCP `127.0.0.1:5080` | internal only |

Terminate TLS with certificates for your public names. The ingress must **overwrite `X-UR-Forwarded-For` with one real client `IP:port` pair**, using brackets around an IPv6 address. The [server's address resolver](https://github.com/urnetwork/server/blob/main/session/client_session.go) deliberately ignores standard `X-Forwarded-For`; `/verify` depends on observing the actual miner exit address. Only your trusted ingress should reach the internal listeners. Route `/verify`, `/sn/*`, and WebSocket traffic without authentication or buffering rules that interfere with their own protocols.

This port map provides the WebSocket transport. Native HTTP/3 and DNS transports additionally need Connect port mappings for service UDP/443 and UDP/4053, the [Warp ingress forwarding convention](https://github.com/urnetwork/warp), and certificates under `vault/main/tls/<hostname>/<hostname>.crt` and `.key`. Public DNS uses UDP/53, which ingress forwards to private UDP/4053; UDP/8053 is a compatibility listener enabled only when explicitly mapped. These listeners expect the production ingress's Proxy Protocol framing; opening a UDP port alone is insufficient. Keep each certificate and key pair in the same resource/version directory.

The full API and worker also support product features such as OAuth, email, subscriptions and extenders. Provision their resources when offering those features; the binary does not generate integration credentials. OAuth uses `auth.yml` with its own issuer and **separate** OAuth signing keys, generated and rotated with Warp's OAuth tooling. See [server IDP configuration](https://github.com/urnetwork/server/blob/main/IDP.md). Do not use the JWT key as an OAuth signer.

### Configure the verification endpoint

The `/verify` route needs no separate service: it is part of the API, and its statistics, proofs and keys are public routes on the same host:

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

`server_key_id` is one byte (0 to 255) carried in every ASSIGN and FINAL message; to rotate, add a new first entry and keep the old ones. Verification requires at least one key; check `GET /verify/keys` after startup.

The `/verify` server enforces the invariant validators depend on: each eligible miner maps to exactly one exit IP and each exit IP to exactly one miner; a miner seen behind two exits is dropped from the eligible index until it is back to one. Seeds whose source address does not resolve to a miner, or that exceed the soft limits, are poisoned (walked to full depth but never published) so the endpoint cannot be used as an oracle for which addresses are miners; only the hard per-source limits in the policy (`hard_seed_per_minute_per_source`, `hard_extend_per_minute_per_source`, `hard_active_trails_per_source`) refuse requests outright.

## Step 5: configure the epoch pipeline

The subtensor pipeline is configured by `vault/main/st.yml`. Without a valid, enabled resource the API and taskworker can run with the subnet subsystem disabled, so an HTTP health check alone does not establish that miners can earn or claim. Select mainnet with `URNETWORK_ST_PROFILE=mainnet` in the environment and `profile: mainnet` in the file. Testnet has a separate `testnet-...` namespace; it is not selected by `WARP_ENV` or by changing `profile` alone. Fields, from [`server/controller/st_controller.go`](https://github.com/urnetwork/server/blob/main/controller/st_controller.go):

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
launch_readiness_sha256: "<reviewed readiness receipt digest from sn.yml>"
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

An enabled operator requires **three distinct** deposit, root and artifact keys. They must match the admitted operator identity. Missing or malformed `st.yml` is logged as a disabled subsystem; check that state explicitly after startup. `attempt_upload` and `reserved_attempt_upload` bound validator evidence uploads; `ops_key` and `contract_address` are legacy fields and should not be used for a new deployment.

Mainnet activation also requires the reviewed `config/main/sn.yml` earnings declaration, including the selected chain/genesis, coordinator, settlement vault, policy and readiness receipt. Its exact file digest is used by the migration command below, and its readiness digest must match `st.yml`'s `launch_readiness_sha256`. Obtain these deployment-specific values through operator admission and preserve the reviewed bytes. The server keeps post-cutoff usage separate from legacy obligations and refuses mainnet settlement when activation is blocked or the identities differ.

Before any mainnet EVM publishing can succeed, install the independently signed `operator_gas_policy` in `st.yml` and its matching `config/main/operator-gas-authority.yml`. The approval binds the operator, deposit/root accounts, policy revision, validity window, transaction-history pins and gas/attempt limits. The [gas policy implementation](https://github.com/urnetwork/server/blob/main/st_operator_gas_policy.go) defines its schema. Funding a signer does not replace this approval, and the approver's private key does not belong on this host.

The deposit tiers must be the signed policy's schedule: validators recompute your required deposit from the same formula and zero your pool when the observed deposit differs (see below).

## Step 6: migrate, initialize and run

Install the probe resources in Step 7 before starting the worker. Use the same binary and environment for all three commands below. `db migrate` applies the server's complete PostgreSQL migration catalog; it does not create the PostgreSQL role or database. For `main`, supply the independently reviewed **64-character lowercase SHA-256** of the exact `sn.yml` bytes, without a `sha256:` prefix. The command checks the schedule before DDL and prepares the payout boundary after migration. Its `earning_boundary` output reports `deployment_verified: false` and `chain_readiness_authorized: false`: preparation does not activate mainnet. Use the digest from your release review, rather than treating a hash of an unreviewed edit as approval.

Open a shell as the service user, then load the environment:

```bash
sudo -u urnetwork bash
set -a
. /etc/urnetwork/operator.env
set +a

SN_SCHEDULE_SHA256='replace-with-the-reviewed-64-character-sha256'
ur-operator db migrate --sn-schedule-sha256="$SN_SCHEDULE_SHA256"
ur-operator init-tasks
ur-operator run --require-subnet
```

Complete each command successfully before running the next. `init-tasks` initializes recurring production tasks; normal startup also ensures their idempotent schedules exist. Ordinary `run` never applies database migrations. `--require-subnet` makes an absent, invalid or disabled `st.yml` a startup error, instead of silently starting a network without its subnet pipeline. The running worker executes maintenance, probes, verification and SN epoch tasks, plus configured retail/product work.

Default listeners are API 8080, Connect 8081 and worker status 8082, with eight workers and batch size four. The corresponding options are `--api-port`, `--connect-port`, `--taskworker-port`, `--worker-count` and `--worker-batch-size`. When changing ports, update `WARP_PORTS` and the reverse proxy together.

For optional Connect diagnostics, `--memory-owner-ledger` enables transfer-owner accounting. `--private-heap-profile-target` accepts `config` (the default), `disabled`, or an exact `host/block` scope.

For operators using extenders, configure `vault/main/extender.yml` with the deployment's root/issuer keys and gossip identity, add `8083:8083` to `WARP_PORTS`, route `wss://gossip.example.net` to its listener, and add `--gossip-port=8083`. A nonempty `gossip_identity_key_hex` requires that listener: advertising gossip without running it leaves queued extender publications unconsumed. See the [extender deployment specification](https://github.com/urnetwork/connect/blob/main/EXTENDER.md). Alt and Proxy deployments continue to use their own frontends; they are not required to run the API/Connect operator described here.

Once the foreground startup is healthy, stop it with Ctrl-C and leave the service-user shell. Install `/etc/systemd/system/ur-operator.service`:

```ini
[Unit]
Description=URnetwork operator
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
RequiresMountsFor=/srv/urnetwork-data

[Service]
Type=simple
User=urnetwork
Group=urnetwork
WorkingDirectory=/srv/warp
EnvironmentFile=/etc/urnetwork/operator.env
ExecStart=/usr/local/bin/ur-operator run --require-subnet
Restart=on-failure
RestartSec=5
TimeoutStopSec=180
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Adjust backing-service unit names for your distribution, and add the gossip argument if configured. Start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ur-operator
sudo journalctl -u ur-operator -f
```

Check **each** service's readiness JSON. HTTP 200 by itself is insufficient; each `status` must be `ok`:

```bash
for port in 8080 8081 8082; do
  curl --fail --silent --show-error "http://127.0.0.1:$port/status" \
    | jq -e '.status == "ok"' || break
done
curl --fail --silent --show-error https://api.example.net/verify/keys
curl --fail --silent --show-error https://api.example.net/sn/epoch
```

Confirm the public epoch response identifies your expected chain, contract, settlement vault and `no_id`, and that the worker is advancing its chain mirror. Readiness checks PostgreSQL's migration head and Redis before the services activate; it is not proof of completed operator admission, funded/approved publishing, or an available claim. If a check reports `error not ready`, resolve that cause and restart: readiness is latched at startup. For upgrades, back up the database and artifacts, deploy the reviewed resources, apply migrations explicitly, then restart the binary and check all listeners again.

When enabled, gossip has no `/status` endpoint. Check its listener and startup logs separately: `[gossip]not ready` means its publication-queue drainer did not start, even if the mesh can receive messages. Resolve the backing-service error and restart before treating gossip publishing as ready.

## Step 7: run the prober

Miners are placed and health-checked through tunnels pinned to each miner, never from the operator host's own network. The single binary's production worker runs durable probe shards; configure `config/main/provider_egress_probe.yml` with your own endpoints:

```yaml
enabled: true
shard_count: 4
api_url: https://api.example.net
platform_url: wss://connect.example.net
public_api_url: https://api.example.net
url_probe:
  limit: 8
  concurrency: 8
  probe_timeout_seconds: 60
```

Create `vault/main/provider_egress.yml` with `ingest_secret: "<a separate random ingest secret>"`. Each live probe shard creates its own credential and credit at execution admission; the recurring `ProberBootstrap` task cleans up finished shard accounts after crashes. Re-run `ur-operator init-tasks` after changing the shard configuration. Current production probes use `url_probe`; the older `full` and `blackhole` task fields remain for compatibility. Monitor probe results and queue retries before admitting miners: an API that is reachable does not prove that miner egress is usable.

## Step 8: publish your stats feed and get listed

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

Every attempt is recorded (`AddStPublish`/`UpdateStPublish`) and publishing reconciles retained transactions against chain state across restarts. Normal operation uses the single `ur-operator` binary. For optional manual diagnostics and recovery, build the separate administrative client from the same server checkout and install it on the operator host:

```bash
GOWORK=off GOTOOLCHAIN=local CGO_ENABLED=0 \
  go build -mod=readonly -p 2 -o build/bringyourctl ./bringyourctl
sudo install -o root -g root -m 0755 build/bringyourctl /usr/local/bin/bringyourctl
```

Run it as the service user with the same `/etc/urnetwork/operator.env` loaded. These are administrative subcommands of `bringyourctl`, not additional `ur-operator` subcommands:

```text
bringyourctl st status [--epoch=<epoch>]
bringyourctl st deposit [--alpha_rao=<alpha_rao>]
bringyourctl st commit --epoch=<epoch>
bringyourctl st finalize --epoch=<epoch>
```

A manual `--alpha_rao` deposit is still bounded by `deposit_epoch_cap_rao`. Voluntary conviction (`addConviction`, the same one-way path, which raises your tier without counting as demand) has no server task; it is a transaction from your deposit signer.

## How you are measured and paid

An operator's pool emission belongs to its miners, and the settlement vault pays the realized captured amount against the operator's root. The selected launch policy targets **10% of the native miner allocation for providers**, split between operator pools and head fleets, and **90% for the receive-only `ur-reserve`**. These are routing targets subject to native consensus and runtime behavior, not guaranteed fixed payouts. The native reserve is separate from the immutable deposit sink and the settlement vault's claim balances. See the [native reserve allocation](https://github.com/urfoundation/sn/blob/main/mainnet/TREASURY-EMISSIONS.md). Your operator revenue comes from your own business; the subnet pays miners for carrying that traffic.

- **Pool weight.** Each tempo every validator weights your pool by `implied_demand × Q`: `implied_demand = bytes × rate0_gib / GiB + users × rate0_user`, your audited `total_usage_bytes` and `total_users` priced at the conviction-zero tier. Your own tier is the highest one whose `min_conviction_rao` your cumulative locked α (deposits plus voluntary conviction) meets, so a committed operator posts less α for the same weight: the discount changes what you pay, not your weight (and when the epoch cap truncates what you owe, it truncates your demand by the same factor). `Q` is the exposure-weighted quality of your pool miners as measured by that validator's own trails, clamped by the policy's `quality_transform`. Native Yuma computes consensus from validator weight rows under the active runtime's masking, clipping and normalization rules. While the published price is zero every pool's implied demand is exactly 1 (see [Initial period](#initial-period)).
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
