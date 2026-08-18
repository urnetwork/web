# A privacy network, coordinated on Bittensor.

> Own your privacy. Own your network.

## I. A decentralized privacy network

UR is a decentralized privacy network. It distributes user traffic across a global network of independent miners using multi-hop routing and layered encryption, so that no single miner sees both who a user is and what they are doing. The transport is designed to resemble ordinary HTTPS — N-layer TLS encryption, SNI spoofing, and traffic indistinguishability — so the network stays reachable almost everywhere.

The UR Subnet coordinates this network through on-chain incentives on Bittensor. Network operators run the servers; independent miners carry the ingress and egress traffic; and independent validators continuously walk operator-assigned chains of miners to prove real-time transit and measure which miners are the weakest links. That measurement is the core signal the network pays for.

Bittensor's Yuma Consensus turns the validators' measurements into token emission, and a smart contract on the Subtensor EVM settles the payouts. The protocol is open source, and running a miner or a validator is permissionless.

## II. Roles

Network operators run the privacy servers and the verification endpoint. An operator deposits into the subnet, co-signs each measured path, and commits a payout list that splits its rewards among the miners attached to it. An operator directs where its rewards go but never holds anyone else's funds.

Miners are the ingress and egress of the network. They run a safe-by-default security model, block known-malicious IPs, and route only encrypted traffic. A miner carries traffic for one or more operators and is paid for the routable capacity it contributes.

Validators are independent. Each stakes its own UR, runs the routing-verification protocol, and scores every operator's pool by demand and measured quality. Validators earn the network's native dividends for accurate, consensus-aligned scoring — no operator owns a validator, and the set is permissionless.

The Subnet Owner governs the settlement contract and operates the network's reserve. That role is transitional: control begins centralized-but-bounded and progressively decentralizes (clause V).

## III. The UR token

UR is the subnet's native token — the unit of account for deposits, emission, and settlement. It is a utility token for coordinating and paying for network resources; it is not designed to represent or provide any right to profits, income, or returns.

New UR is emitted by Bittensor's coinbase each cycle and split three ways:

[object Object]

Operators fund the network by depositing UR sized to their real usage, at a published reference rate. A deposit is a costly, revenue-backed signal of real demand — and it is conviction stake: the contract moves every deposit into a locked reserve where it compounds and is never redistributed, permanently removing UR from liquid supply in proportion to real usage. An operator's cumulative locked stake lowers the rate it must post, so committed operators can onboard with less up-front capital.

Miners are paid from emission, not from deposits. Because deposits are locked rather than recycled, real usage becomes a standing, growing bid under the token instead of sell pressure, while emission follows a fixed schedule with halvings.

## IV. Two ways to earn

A single operator can serve well over 100,000 miners — far more than a subnet's roughly 256 on-chain slots — so the network pays miners through two tiers that run in parallel.

The pool is the on-ramp. Every operator holds one on-chain slot for all of its miners; validators weight that pool by the operator's demand and its measured quality, and each miner claims its share directly from the settlement contract with a cryptographic proof. There is no slot to win and nothing to burn — it is where a miner starts and earns a baseline reward.

Top-level miners are the supply apex. The roughly 200 largest fleets — ranked by how many distinct, routable exit IPs they actually serve, not by traffic volume — each claim their own on-chain slot and are paid directly by the network, with no operator in the payout path. A shared IP is split among the fleets that claim it, so breadth cannot be double-counted.

The two tiers are one tournament: a miner starts in a pool, graduates to a top slot as its routable-IP breadth grows, and falls back to the pool if it slips. A governance-set share divides emission between the head and the tail.

[object Object]

## V. Custody, settlement, and decentralization

Settlement runs on a seven-day cycle. The contract accrues each pool's emission over the period, then opens claims: miners pull their UR directly from the contract against their operator's committed payout list. Top-level miners need no settlement step — the chain pays their slot natively every cycle.

No one holds anyone else's funds. The settlement contract is the sole custodian of in-transit UR, every pool payout is a direct on-chain claim, and top-level miners are paid natively to their own keys. Operators and the owner never take custody of miners' rewards.

Earned claims are final. Once a settlement period is finalized, the tokens backing its claims are committed — no upgrade, pause, or administrative action can block or reverse them. The locked reserve is one-way by the same standard: no function can move funds out of it.

Control decentralizes over time. The network launches with the contract upgradeable behind an owner multisig — deliberate, bounded central control for early bug-fixes — and hardens in stages: a public timelock on every change, a pause-only guardian that can stop an exploit but can never move funds or block finalized claims, and, in time, on-chain governance and an immutable settlement core.
