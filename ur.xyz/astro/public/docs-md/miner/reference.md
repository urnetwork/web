
# Miner reference

A quick reference for the `provider` command. `provider --help` prints every command and option. If you used the Linux installer, the command is called `urnetwork`.

## Everyday commands

| Command | What it does |
| --- | --- |
| `provider auth` | Sign in with an auth code, typed at a hidden prompt. `provider auth <auth_code>` takes the code directly, but leaves it in your shell history. |
| `provider auth --user_auth='you@example.com'` | Sign in with your account email; it asks for the password. |
| `provider provide --allow-client-registration` | First start on a new device: registers it, then runs. |
| `provider provide` | Start mining with this device's saved identity. |
| `provider auth-provide` | Sign in and start in one command. |
| `provider wallet challenge '<coldkey_ss58>'` | Print the statement to sign for your payout wallet. |
| `provider wallet set '<coldkey_ss58>' …` | Set your payout wallet with a signature or a seed file. See [Get paid](https://ur.xyz/docs/miner/rewards#set-your-payout-wallet). |
| `provider claim --epoch=<epoch> --rpc=<url>` | Check a pool reward claim; add `--key_file` to submit it. See [Claim your rewards](https://ur.xyz/docs/miner/rewards#claim-your-rewards). |
| `provider choose_network <api_url> <connect_url>` | Choose another operator. `--show` prints the one in effect, `--reset` goes back to the default. |
| `provider operators` | List the operators in the published operator list and your sign-in state with each. |
| `provider proxy add …` | Add SOCKS5 exits. See [Several exits on one host](https://ur.xyz/docs/miner/advanced#several-exits-on-one-host). |
| `provider --help` | Every command and option. |

The commands for every operator, hotkey wallets, the claim daemons and head-tier fleets are on the [Advanced](https://ur.xyz/docs/miner/advanced) page.

## Common options

| Option | Used with | What it does |
| --- | --- | --- |
| `--allow-client-registration` | `provide` | Allow registering a new device. Never replaces an identity the miner already has. |
| `--port=<port>` | `provide` | Serve the [status page](https://ur.xyz/docs/miner/run#the-status-page) on this port. `0`, the default, turns it off. |
| `--max-memory=<mem>` | `provide`, `auth` | Soft memory target in bytes, or with `b`, `kib`, `mib` or `gib`. |
| `-v`, `-vv` | most | More log detail. (For `urnet-tools`, `-v` means `--version`.) |
| `-f` | `auth`, `proxy` | Replace an existing sign-in or proxy without asking. |
| `--api_url=<url>` | most | Use this operator API URL for one command. |
| `--connect_url=<url>` | `provide` | Use this operator connect URL for one run. |
| `--provider-jwt=<path>` | `wallet`, `claim` | Choose which device's credential to use, for extra exits or other operators. |
| `--wallet=<coldkey_ss58>` | `provide` | Also set the payout wallet at start, like `wallet set`. A failure is logged and doesn't stop mining. |

## Installer commands

### Linux

| Command | What it does |
| --- | --- |
| `urnet-tools start`, `stop`, `status` | Start, stop or show the background service. |
| `urnet-tools update` | Update now, if there's a newer release. |
| `urnet-tools --version` | Show the installed version, and the latest if it's newer. |
| `urnet-tools auto-update` | Show whether automatic updates are on. Add `on` or `off` to change it, and `--interval weekly` or `monthly` with `on`. |
| `urnet-tools auto-start on`, `off` | Whether the service starts by itself. |
| `urnet-tools reinstall -t <version>` | Install a particular release. |
| `urnet-tools uninstall` | Remove the miner, its service and **`~/.urnetwork`**. Back up first. |

Options take a space before their value (`-t <version>`, `--interval weekly`), not the `=` that `urnet-tools --help` shows. See [Updates](https://ur.xyz/docs/miner/updates) and [Run in the background](https://ur.xyz/docs/miner/run#with-the-linux-installer).

### Windows

Mining doesn't work on Windows yet; see [Windows installer](https://ur.xyz/docs/miner/install#windows-installer).

| Command | What it does |
| --- | --- |
| `urnet-tools start`, `stop`, `status` | Start the miner in a hidden window, stop it, or say whether it's running. |
| `urnet-tools update` | Update now, if there's a newer release. |
| `urnet-tools version` | Show the installed version, and whether a newer one is out. |
| `urnet-tools auto-update-enable`, `auto-update-disable` | Turn automatic updates on or off. |
| `urnet-tools auto-update-freq` | Choose daily, weekly or monthly update checks. |
| `urnet-tools auto-start-enable`, `auto-start-disable` | Whether the miner starts when you log in. Disabling also turns off automatic updates. |
| `urnet-tools reinstall` | Uninstall, then install the same version again. |
| `urnet-tools uninstall` | Remove the miner, its startup entries and, as written, **`%USERPROFILE%\.urnetwork`**. Back up first. |

The Windows installer keeps its files in `%LOCALAPPDATA%\urnetwork\provider`.

## Files the miner keeps

The miner keeps its state in `~/.urnetwork`. Back up the whole folder after stopping the miner, keep it private and restore it as one piece. Don't run two copies of the same folder at once. Losing or editing the identity files can make the device impossible to recover, even though your account sign-in still works.

| File or folder | What it holds |
| --- | --- |
| `jwt` | Your account sign-in, written by `provider auth`. |
| `.provider.key` and `.provider.key.identity` | The device's original Ed25519 key and its identity marker. |
| `.provider.key.registration.lock` | A local lock for registering the device. |
| `.provider.jwt` | The device's own renewable credential, used for wallets and claims. |
| `.provider.jwt.registration*` | The kept registration request and recovery state. Keep every one of these files. |
| `.provider.jwt.wallet-consent/` | Your signed wallet history, including statements not yet sent. |
| `.provider.cert`, `.provider.extender.key` | The device's certificate and extender identity, when present. |
| `network.json` | The operator chosen with `choose_network`. |
| `proxy` | Optional SOCKS5 exits. |
| `operators.yml` | The last good copy of the operator list, with `--all-operators`. |
| `operators/<domain>/` | One listed operator's own state, with the files above. |
| `hotkey-wallet/` | The signed hotkey payout chain (`originals.json`) and any pending statement (`pending.json`). |

The Linux installer keeps its commands in `~/.local/share/urnetwork-provider/bin`, separate from this folder.

## Environment variables

None are needed for a normal setup.

| Variable | What it does |
| --- | --- |
| `URNETWORK_STATE_DIR` | Use this folder instead of `~/.urnetwork`. Handy for trying a test device without touching your real one. |
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
| Momentum | The share of miner emission paid out now; the rest goes to the [Network Capacity Reserve](https://ur.xyz/reserve). |
