
1. ## General Description of URnetwork

URnetwork is a decentralized privacy infrastructure protocol (the “**Protocol**”) launched by BringYour, Inc. (the “**Company**”) designed to enable “whole internet encryption” by mitigating exposure of metadata inherent in the TCP/IP protocol suite. While most internet traffic is encrypted at the content layer, metadata such as source and destination IP addresses remain visible to intermediaries. The Protocol distributes user (“**User(s)**”) traffic across a global network of independent providers (“**Providers**”) using multi-hop routing and layered encryption, such that no single Provider has access to both the User’s identity and the content of communications. Providers participate in different ways by running programs written by the Company on various devices. The Protocol incorporates techniques including N-layer TLS encryption, SNI spoofing, and traffic indistinguishability to resemble standard HTTPS traffic.

The Protocol architecture separates transport, routing, matching, and settlement into distinct components. Users connect through client software that dynamically routes traffic across multiple Providers based on performance and reliability metrics. Data transfer occurs through encrypted contracts between Users and Providers, with escrowed balances, defined permissions, and post-transfer settlement based on acknowledged usage. Contracts include dispute resolution mechanisms and are deleted after a defined period. The Protocol is open source and has been operational since approximately April 2025, with reported usage of approximately 340,000 users. 

The Protocol is designed such that Users and Providers can interact directly with the Protocol without reliance on the Company or any Network Operator. However presently, many Users and Providers access the Protocol via middleware provided by the Company as a “**Network Operator**.” 

Network Operators are reliable, sophisticated Protocol operators capable of coordinating and deploying significant volumes of smart contracts. Network Operators may choose to resell that volume to consumers (whether or not as Users), or use that volume for their own purposes (e.g., as an indexer). In many cases, Network Operators allow Users to benefit from the Protocol without deploying their own contracts or software implementations. In this capacity, Network Operators deploy Protocol contracts “under the hood,” acting as a bridge between everyday Users and the Protocol. The Company anticipates that Network Operators may acquire and utilize Tokens as needed to facilitate contract deployment within the Protocol. Such activity reflects operational requirements of their services rather than any obligation or mechanism intended to influence Token markets. The Protocol does not require Network Operators to acquire Tokens from any particular source.

For example, the Company, as a Network Operator, provides a VPN service to Users which relies on a data-provision economy. The Company sells its VPN service to users based on data limits, based on data acquired by the Company via the Protocol. As VPN-using Users  consume data, the Company as Network Operator deploys or uses contracts  to acquire data via the Protocol. Network  Operators pay the Protocol for the ability to create those contracts; meaning the Protocol is an underlying form of infrastructure for the business of the Network Operator. Network Operators may choose to pass those costs along to their customers, who may or may not be Users depending on the nature of the services provided by a Network Operator. 

The Protocol is a self-operating permissionless system, which  operates independently of Network Operators. This is because the Protocol works via smart contracts and is agnostic to who the deployer of those smart contracts may be. No data can be transferred without the conditions of those smart contracts being met, whether or not a Network Operator or User deploys them.  The Protocol’s economics (that is, the price of the smart contracts) operate via two rates: a per-gigabyte transfer rate and a per-User transfer rate. These two rates capture all of the use cases that the network is usable for. For instance, the Company’s use of the Protocol to provide a VPN is a per-User model. As mentioned above, the Protocol is permissionless – anyone can utilize it provided they pay one of these two rates. 

The Company deployed the Protocol and currently holds the ability to upgrade it, allowing changes to aspects such as the available rates. The Company’s current role in Protocol upgrades is transitional, and the Protocol is intended to operate without reliance on the Company over time.

2. ## Separation of Roles

	The Company deployed the Protocol and has the ability to maintain it, although the Protocol operates wholly independently and would remain functional if the Company ceased maintaining it. The operation and utility of the Protocol do not depend on the ongoing managerial or entrepreneurial efforts of the Company.

The Company is also presently the sole Network Operator, but at or near launch will have a second, community-driven (non-Company) operator.  The Company advertises and sells its VPN services while also touting the benefits of the Protocol on its website here ([https://ur.io/](https://ur.io/)). The Company has launched a separate website ([https://ur.io/protocol](https://ur.io/protocol)) which is intended to host documentation regarding the Protocol. Finally, the Company builds and sells [software and hardware nodes](https://docs.ur.io/provider) which can serve as both network clients and Providers. \[relate only to its role as a Network Operator for use of the VPN \[AND/OR\] allow buyers to operate as a Provider\]. However, Users and Providers do *not* need to use software or hardware provided by the Company to be Users and Providers. They can directly interact with the Protocol via their own code deployments.

	The Company intends to clearly delineate and identify the difference between the Company as deployer of the Protocol, the Company as a Network Operator who uses the Protocol to operate a VPN service, and the Company as the present steward of the Protocol. 

3. ## Introduction of UR Token

Network participants include Users (consumers and developers) and Providers who supply bandwidth via software and hardware currently provided by the Company. Providers are currently compensated in USDC for network participation, with a planned transition to token-based rewards using the Token. This switch will be possible via updates to the smart contracts underlying the Protocol. 

The Protocol will be fully functional at TGE. At TGE, the Protocol will operate independently as a functional system in which the Token serves as a unit of account. Network Operators, including BringYour, may implement application-level features or pricing models that incorporate the Token, but such implementations are optional, non-exclusive, and do not define or drive the economic characteristics of the Token itself or its use on the Protocol. If any Network Operator stopped offering its services, the Token would continue to be a useful, functional, unit of account integral to the operations of the Protocol. Once deployed, the operation, utility, and usage of the Token do not depend on the ongoing managerial or entrepreneurial efforts of BringYour or any Network Operator but rather operates independently on the Protocol. 

Within the protocol, the Token is intended to function as a payment and settlement instrument. Tokens are utilized within the Protocol in connection with discrete network operations and are consumed or allocated as part of those operations. The Token is not designed to represent or provide any right to profits, income, or returns, and is intended to function solely as a means of accessing and participating in the Protocol. 

Users utilize Tokens within the Protocol by depositing Tokens into programmatic dispositions  prior to network usage (via Providers), with pricing based on data transfer and user activity. Deposited Tokens are used to fund contract-based bandwidth transactions between Users and Providers, with portions held in escrow during execution. Unused Tokens deposited into the protocol are not refunded and remain within the Protocol. Upon settlement, Tokens are distributed into a reward pool and allocated to Providers based on performance metrics. 

The Token is designed to coordinate economic activity within the Protocol by being the unit of account for the smart contracts and Provider compensation cycle. Upon completion of every block (block time is one week), 97.5% of Token used will be distributed to Providers based on parameters described below, and 2.5% will be removed from circulation to a particular address not controlled by the Company (“**absorption**”). The Company intends that Token sent to absorption will be permanently removed from circulation, but has not yet decided to fully burn the Tokens sent to absorption. To the extent that they are owned by the Protocol, they could theoretically be recovered via a Protocol upgrade (which, presently, would require the Company to perform the upgrade).[^1] Tokens directed to absorption are not redistributed and are excluded from protocol-level accounting for future contract settlement. This mechanism is designed to balance network usage and resource allocation rather than to affect Token value.

The total supply is fixed at 1,000,000,000 tokens, all minted at genesis, with no ongoing inflation. The Token is expected to be deployed on the Solana blockchain. At Token generation, the allocation will be as follows: 

| Category | % | Tokens | Vesting |
| :---- | :---- | :---- | :---- |
| Contributor Rewards (allocated proportional to points) | 20% | 200,000,000 | 1 year vest, 2 year linear unlock |
| Team & Advisors | 23% | 230,000,000 | 1 year vest, up to 2 year linear unlock |
| Equity Investors in Company | 15% | 150,000,000 | 1 year vest, 2 year linear unlock |
| Unallocated LiquidityTreasury | 2% | 20,000,000 | Linear unlock over 1 year |
| Strategic Reserve | 40% | 450,000,000 | Reserved for future use to grow or secure the protocol (0 inflation commitment) |

Approximately 2% of supply (20 million tokens) is expected to be in initial circulation for liquidity purposes. 

4. ## Distribution and Circulation of the Token

	At TGE, the Company will set aside the Tokens due for Contributor Rewards, the Team & Advisors, previous Equity Investors in the Company (who had not made any investment in Tokens), and the Strategic Reserve. The Company will work with counsel on how and whether to message to the public these allocations. 

	Those not listed above will be able to obtain the Token in two ways: 

1. Direct acquisition of the Token on secondary markets; and   
2. Receipt of the Token due to their service as Providers. 

With respect to the first, the Company plans to directly or indirectly deposit Token into a USDC-Token [DLMM on Meteora](https://www.meteora.ag/pools). The Company, in its capacity as af Network Operator, may acquire Tokens on a non-exclusive, market-driven basis to support its use of the Protocol. The Company does not anticipate that its activity will be the primary source of demand lor liquidity in the Token. Such activity is undertaken solely for consumptive purposes and not for investment or market support. But, the Protocol does not depend on the Company or any Network Operator to acquire Tokens in order to function, and Token demand is not designed to be driven by any single participant or class of participants.

With respect to the second, the Protocol will transition to the use of Token for Provider rewards. 

Network Operators can sell access to the Protocol in Token, fiat, or token-denominated terms as they wish. And as mentioned above, Network Operators may structure service tiers that incorporate Token-based participation signals or payment methods, which may be used to customize access to features within their applications. For example, the Company will have tiers for its VPN services that depend on the amount of Tokens held by a consumer. 

To reiterate the interaction between the various entities:

1.  a User may purchase Token on the open market and use it to interact with the Protocol directly (including to become a Network Operator), or they may rely on a Network Operator to access the Protocol without touching Tokens;  
2. A Provider will receive Tokens for provision of bandwidth to the Protocol; and   
3. Network Operators will acquire, retain, and spend Tokens to make their services available to their customers, who may or may not be Users depending on the nature of those services. 

5. ## Staking and Protocol Integrity Mechanisms

The Protocol does not provide passive returns or yield on Tokens. Any differences in outcomes across participants are solely a function of differences in activity, reliability, and usage within the network. The Protocol has a form of operational qualification and prioritization built in, similar to staking, which we refer to as “**Integrity Mechanisms**.” These Integrity Mechanisms signal commitment, reliability, and quality of participation within the network, which the Protocol uses to prioritize resource allocation and contract selection. These mechanisms are as follows:  

* **Network-Operator Incentivized Consumer Staking**:  Network Operators may offer service tiers that integrate Token-based authentication or participation signals, which can be used to customize access to features within their applications. For instance, the Company intends to incentivize consumers to hold Tokens in the wallet linked to the network to unlock premium features, and may eventually take payments in Token. 

* **Developer Staking**:  Developers that maintain Token balances are eligible for reduced network rates as part of a usage-based pricing structure (hard-wired into the protocol) designed to encourage sustained integration and long-term network participation. Developers who hold $UR in a wallet linked to the network unlock adjusted usage pricing on per-GB and per-User bases.

* **Provider Staking**:  The Protocol allocates opportunities for contract execution based on signals of activity, reliability, and commitment, which may include Token-related parameters. Any resulting differences in outcomes reflect differences in participation and service provision, rather than passive ownership of Tokens. Providers that lock Tokens are prioritized for contract assignment based on demonstrated commitment and reliability. Because rewards are tied to completed work, increased allocation reflects greater participation rather than passive return. Providers who holdlock $UR in their linked wallet will receive larger reward shares during the block-end reward cycle  based on an allocation weighting multiplier (*e.g.* amount of staked UR equals a 1.0x, 1.25x, 1.5x, or 2.0x multiplier). The minimum balance from the previous block sets the multipler for the current block. These adjusted weighting multipliers do not create inflation. The total epoch reward pool is fixed. Staked Providers receive larger proportional shares from the same pool. Unstaked providers still earn rewards at smaller proportional shares.

The purpose of these Integrity Mechanisms is to support reliable operation, performance, and availability of the Protocol by aligning network access and resource allocation with demonstrable participation and service quality. These mechanisms are designed such that participants who contribute meaningfully to the network—whether as consumers, developers, or providers—are able to access functionality and capacity in a manner that reflects their level of engagement with the Protocol.

Across each category of participant, these mechanisms operate to facilitate effective use of the network rather than to provide economic benefit based on passive Token ownership. For example, consumer-facing implementations by Network Operators may incorporate Token-based parameters as part of service configuration or authentication, enabling differentiated access to features within those applications. For Developers, Token-related parameters may be used within a usage-based pricing framework to support sustained integration and encourage the development of new applications and use cases on the Protocol. For Providers, Token-related parameters may be considered alongside performance metrics to inform contract assignment and resource allocation, with outcomes determined by actual service provision, reliability, and network contribution.

Importantly, the Protocol does not provide passive returns or yield based on Token holdings. Any differences in outcomes across participants reflect differences in activity, reliability, and usage within the network, rather than passive ownership. Participants who choose to utilize Token-related features within the Protocol are typically those actively engaged in operating, developing, or using the network, and these mechanisms are intended to reinforce high-quality participation and overall network efficiency.

---

[^1]:  The Company does not intend to recover or reintroduce Tokens directed to absorption, and any such action would require material changes to the Protocol.