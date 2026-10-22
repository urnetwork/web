---
published: 2026-10-21
description: UR miner reference. The provider commands and options, the installers' urnet-tools commands, the files the miner keeps, environment variables and a glossary.
---

# Miner reference

A quick reference for the `provider` command. `provider --help` prints a short overview, `provider <command> --help` explains one command, and `provider help all` prints every command and option. If you used an installer, the command is called `urnetwork`.

## Everyday commands

Names in brackets are other names for the same command.

| Command | What it does |
| --- | --- |
| `provider setup` | Set up this device step by step: sign in, register, payout address, background service. Safe to run again. `--no-service` skips the service, and `--yes --auth-code-file=<path>` runs it without questions (and skips the payout address). |
| `provider status` | Is it set up, running and connected? Exit code 0 when all is well, 3 when it needs setup, 4 when it isn't running or connected. `--json` for scripts. |
| `provider doctor` | Why it can't sign in or connect: state folder, DNS, connection, TLS, clock, updates. |
| `provider login` (`auth`) | Sign in with an auth code, typed at a hidden prompt. `provider login <auth_code>` takes the code directly, but leaves it in your shell history. `--user_auth='you@example.com'` signs in with your account email and asks for the password. |
| `provider start` (`provide`) | Start mining in this terminal. The first start on a new device asks before registering it; `--allow-client-registration` registers without asking. `provide` prints the full log instead of the live view. |
| `provider service install` | Run the miner in the background, with automatic updates: at every boot on Linux, at login on macOS, at sign-in on Windows. Also `start`, `stop`, `restart`, `status`, `logs --follow` and `uninstall`. |
| `provider update` | Update to the newest release. `--check` only looks, `--status` shows the automatic update settings. See [Updates](/docs/miner/updates). |
| `provider --version` | Print the version. |
| `provider auth-provide` | Sign in and start in one command. |
| `provider wallet challenge '<coldkey_ss58>'` | Print the statement to sign for your payout wallet. |
| `provider wallet set '<coldkey_ss58>' …` | Set your payout wallet with a signature or a seed file. See [Get paid](/docs/miner/rewards#set-your-payout-wallet). |
| `provider claim --epoch=<epoch> --rpc=<url>` | Check a pool reward claim; add `--key_file` to submit it. See [Claim your rewards](/docs/miner/rewards#claim-your-rewards). |
| `provider network` (`choose_network`) | Show the operator in effect. `provider network use <api_url> <connect_url>` chooses another, `provider network reset` goes back to the default. |
| `provider operators` | List the operators in the published operator list and your sign-in state with each. |
| `provider proxy add …` | Add SOCKS5 exits. See [Several exits on one host](/docs/miner/advanced#several-exits-on-one-host). |

The commands for every operator, hotkey wallets, the claim daemons and head-tier fleets are on the [Advanced](/docs/miner/advanced) page.

## Common options

| Option | Used with | What it does |
| --- | --- | --- |
| `--allow-client-registration` | `start`, `provide` | Allow registering a new device. Never replaces an identity the miner already has. |
| `--port=<port>` | `start`, `provide` | Serve the [status page](/docs/miner/run#the-status-page) on this port. `0`, the default, turns it off. |
| `--max-memory=<mem>` | `start`, `provide`, `login` | Soft memory target in bytes, or with `b`, `kib`, `mib` or `gib`. |
| `-v`, `-vv` | most | More log detail. (For `urnet-tools`, `-v` means `--version`.) |
| `-f` | `login`, `proxy` | Replace an existing sign-in or proxy without asking. |
| `--api_url=<url>` | most | Use this operator API URL for one command. |
| `--connect_url=<url>` | `start`, `provide` | Use this operator connect URL for one run. |
| `--provider-jwt=<path>` | `wallet`, `claim` | Choose which device's credential to use, for extra exits or other operators. |
| `--wallet=<coldkey_ss58>` | `start`, `provide` | Also set the payout wallet at start, like `wallet set`. A failure is logged and doesn't stop mining. |

## Installer commands

The installers for Linux, macOS and Windows share one command, `urnet-tools`:

| Command | What it does |
| --- | --- |
| `urnet-tools status` | One-screen summary: running or not, version, signed in, automatic updates. |
| `urnet-tools start`, `stop`, `restart` | Start, stop or restart the miner in the background. |
| `urnet-tools logs` | Follow the miner's output. Ctrl-C to leave. |
| `urnet-tools version` | Show the installed version, and the latest if it's newer. |
| `urnet-tools update` | Update now, if there's a newer release. On Linux it never moves to an older one. |
| `urnet-tools auto-update` | Show whether automatic updates are on. Add `on` or `off` to change it, and `--interval 6h`, `daily`, `weekly` or `monthly` to change how often. |
| `urnet-tools auto-start on`, `off` | Whether the miner starts by itself after a restart (on macOS and Windows, when you log in). |
| `urnet-tools reinstall -t <version>` | Install a particular release. |
| `urnet-tools uninstall` | Remove the miner and its background jobs. Keeps `~/.urnetwork`. Add `--remove-identity` to delete it too, after you type `delete`. |

Options take either `--interval weekly` or `--interval=weekly`. On Windows the PowerShell spellings work too (`-Interval`, `-RemoveIdentity`), and if PowerShell says running scripts is disabled, type `urnet-tools.cmd` instead. See [Updates](/docs/miner/updates) and [Run in the background](/docs/miner/run#with-an-installer).

Where each installer keeps the miner:

| System | Folder | Log |
| --- | --- | --- |
| Linux | `~/.local/share/urnetwork-provider` | `urnet-tools logs` (the systemd journal) |
| macOS | `~/.local/share/urnetwork-provider` | `~/Library/Logs/urnetwork/` |
| Windows | `%LOCALAPPDATA%\urnetwork\provider` | `provider.log` in that folder |

## Files the miner keeps

The miner keeps its state in `~/.urnetwork`. Back up the whole folder after stopping the miner, keep it private and restore it as one piece. Don't run two copies of the same folder at once. Losing or editing the identity files can make the device impossible to recover, even though your account sign-in still works.

| File or folder | What it holds |
| --- | --- |
| `jwt` | Your account sign-in, written by `provider login` (`auth`). |
| `.provider.key` and `.provider.key.identity` | The device's original Ed25519 key and its identity marker. |
| `.provider.key.registration.lock` | A local lock for registering the device. |
| `.provider.jwt` | The device's own renewable credential, used for wallets and claims. |
| `.provider.jwt.registration*` | The kept registration request and recovery state. Keep every one of these files. |
| `.provider.jwt.wallet-consent/` | Your signed wallet history, including statements not yet sent. |
| `.provider.cert`, `.provider.extender.key` | The device's certificate and extender identity, when present. |
| `network.json` | The operator chosen with `provider network use` (`choose_network`). |
| `proxy` | Optional SOCKS5 exits. |
| `operators.yml` | The last good copy of the operator list, with `--all-operators`. |
| `operators/<domain>/` | One listed operator's own state, with the files above. |
| `hotkey-wallet/` | The signed hotkey payout chain (`originals.json`) and any pending statement (`pending.json`). |
| `miner.log` | The log of `provider start` in a terminal. |
| `miner-status.json`, `miner-update.json` | What `provider status` reads, and the automatic update settings and last check. |

The installers keep the miner program and `urnet-tools` in their own folder (see [Installer commands](#installer-commands)), separate from this folder.

## Environment variables

None are needed for a normal setup.

| Variable | What it does |
| --- | --- |
| `URNETWORK_STATE_DIR` | Use this folder instead of `~/.urnetwork`. Handy for trying a test device without touching your real one. |
| `URNETWORK_AUTO_UPDATE` | Set to `0` to turn off the miner's own automatic updates, like `provider update --off`. |
| `URNETWORK_CONNECT_EXTRA_ROOT_CA_FILE` | A PEM file of extra CA certificates to trust, for a network that inspects encrypted traffic. It must hold only CA certificates. |

## Glossary

| Term | Meaning |
| --- | --- |
| Auth code | A one-time code from your operator account that signs a computer in to it. |
| Operator | The network your miner provides internet exits for. The default is `bringyour.com`. |
| Device (provider identity) | This computer as a miner: the identity in `~/.urnetwork` that stays the same across restarts and updates. |
| Coldkey | Your Bittensor wallet, as an ss58 address starting with `5`. Rewards are paid to it. |
| Hotkey | A second Bittensor key. Miners use one to sign in to every operator at once, and fleets to register in the head tier. |
| Epoch | The period rewards are counted in. A settlement epoch is about seven days on mainnet. |
| Pool | An operator's shared payout. Most miners earn from a pool. |
| Head tier | Large fleets that register their own hotkey and earn miner emission directly. |
| Relayer | An EVM key that pays the gas to submit a claim. It never receives the reward. |
| α ($UR) | The subnet's token, which rewards are paid in. |
| Momentum | The share of miner emission paid out now; the rest goes to the [Network Capacity Reserve](/reserve). |
