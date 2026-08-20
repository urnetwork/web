# Protocol Research

The [URnetwork protocol](https://ur.io/protocol) can be run by any network operator. The protocol is a decentralized-native, multi-IP, multi-transport protocol (as opposed to a traditional site-to-site tunnel protocol). The goal is to scale to a network of millions of providers per network operator and deliver a best-in-class experience. The "Layer 2" design allows the most sensitive data to be private. However, for transparency and research, anonymized exports of the problem space inputs and outputs are made available.

## Anonymization technique

The payout block of the network is 7 days. The data is anonymized per block. All client ids and IP subnet hashes are replaced with simple integer counter values. Additionally city meta data is not included.

## Note to researchers/builders

The URnetwork team would like to allow users to opt into experimental algorithms via federated network operators. New network operators will be able to participate in the common incentive system via root contracts to reward their providers. Providers can participate across as many network operators as they want. The main app will support the option to enter an alternate network operator domain for all users. Access details for experimental network operators will be published when the program opens. We plan to keep this document up to date with the current default algorithm and experimental directions. For security research, please follow the [Vulnerability Disclosure Program](https://ur.xyz/vdp).


## Problems

### Performance

**Current approach: URTRANSPORT1**

The current approach is focused on accessibility so that every person in the world can connect. Multi-hop routing is done through TCP transports with a central hop. UDP transports such as H3 and DNS are supported but currently disabled because of real-world performance issues in this setup.

A multi-provider hop with a peer-to-peer stream upgrade is supported but currently disabled. The research goal is to integrate established protocols such as WebRTC, XRay, and WireGuard as stream upgrades. The matching algorithm may also distinguish between hops with and without a public IP and port to balance speed and connection quality.

Implementation: [transport.go](https://github.com/urnetwork/connect/blob/main/transport.go) and [transfer_stream_manager.go](https://github.com/urnetwork/connect/blob/main/transfer_stream_manager.go).

### Accessibility

**Current approach: UREXTENDER1**

The core network stack supports N-TLS encryption, where N is at least two. Each outer layer can use a self-signed certificate for a chosen host name to reach an intermediary IP, which forwards traffic to another hop or to an end-to-end TLS connection with the network operator domain.

Anyone can host an extender on a domain they control. Users of one extender share a common rate limit that can be adjusted case by case. Extenders can be added to a protocol grant list that allocates a percentage of incentives across participating extenders. Grant-list onboarding details will be published when available.

Implementation: [net_extender.go](https://github.com/urnetwork/connect/blob/main/net_extender.go).

### Matching clients to providers

**Current approach: UR-FP2**

The matching system loads a random sample of potential providers from memory and shuffles it according to reliability and client score to produce a list of finalists. Its protection against provider aliasing, or Sybil attacks, relies on the total reliability score being limited per IP subnet.

Implementation: [network_client_location_model.go](https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go#L2708).

### Multi-client routing

**Current approach: UR-MULTI**

A heuristic sweep manages a window of providers and locks traffic into providers in the highest available tier. Decisions are based on transfer thresholds rather than protocol inspection.

Implementation: [ip_remote_multi_client.go](https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go).

### Transfer

**Current approach: UR-TRANSFER**

A reliable transfer window is tuned for high-latency environments. Protocol retransmits into the transfer layer are disabled because the window provides reliable delivery. Traffic is distributed among available transports according to ranked performance and availability.

Implementation: [transfer.go](https://github.com/urnetwork/connect/blob/main/transfer.go).

### IP egress

**Current approach: UR-IP**

The IP stack is designed to run with minimal memory. It assumes reliable communication with the peer through the transfer layer, allowing retransmits to be optimized.

Implementation: [ip.go](https://github.com/urnetwork/connect/blob/main/ip.go).

### Points and token allocation

**Current approach: UR-PSUB2**

Points are allocated from a subsidy pool and distributed every seven days in proportion to data-transfer votes, reliability scores, and referrals. Votes prioritize traffic generated by paid subscribers to reduce manipulation of the totals. Multiplier bonuses support selected reliability and community incentives.

Implementation: [account_payout_model_plan.go](https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go).

### Permissions

**Current approach: UR-CONTRACT**

Transfer between an initiator and a companion requires a contract encrypted with the destination client's secret key. The contract contains a fixed transfer balance held in escrow and defines permissions between both parties. The companion can create paired contracts for return traffic, while multi-hop paths send stream-open and stream-close events to intermediaries.

Both parties close the contract with an acknowledged byte count after use. If either side does not close or the totals disagree, contract resolution determines the outcome. If either side reports abuse, future transfer between those parties is blocked.

Implementation: [subscription_model.go](https://github.com/urnetwork/server/blob/main/model/subscription_model.go).

### Safety

**Current approach: UR-SEC1**

The current safety layer uses port and IP block lists. It does not inspect application protocols.

Implementation: [ip_security.go](https://github.com/urnetwork/connect/blob/main/ip_security.go).

---

_This is a living document. Testnet will inform how the network evolves, and the design described here, including the incentive mechanism, may change as we iterate._
