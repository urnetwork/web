# ur.xyz content sections

Sections marked with header should be listed in the header. Keep the existing header elements outside of the section navigation. All sections should be linked in the footer.


## Whitepaper (header)

Use whitepaper/draft-factual-summary.docx


## Research (header)

Use docs/protocol/protocol-research.md


## Providers (header)

Providers are the egress IPs of the shared network. Providers run a default safe security model to reject traffic by default that will cause issues with common regulation directions like CFAA and DMCA in the US. Providers block known malicious IPs (botnets, etc). Providers route only encyrpted traffic to not expose themselves or users to unencrypted content.

Providers are ranked by speed and reliability, and register with one or more network operators. Each network operator runs its own matchmaking algorithm between users and providers.

Providers earn a share of the contract value they route.

Providers run entirely in user space and do not require root priveleges.

Link to docs to set up providers.


## Extenders (header)

Extenders create a private or shared network of ingress IPs that use a variety of techniques to improve connectivity worldwide. Extenders can forward to known trusted network operators, to other extenders, and/or to trusted partner IPs using the network operator trust signing.

| Extender Type | Usage |
|---------------|-------|
| Private | Not registered with the network operators and act as a client of the system. Users manually enter the extender IP in the client to connect via the extender. |
| Public via network operator | Registers with the network operator and receive a portion of the URnetwork protocol contract value they route. Public extenders choose the network operators they forward to. They can also forward to other extender IPs. They can also forward to extender IPs that are signed by the forwarded network operators. |

A random subset of public extenders is chosen to be exposed each block (1 week). The extenders exposure within a block depends on the calling region and time. The subset size depends on the total amount of public extenders, so that P(exposure|1 month)>X, P(exposure|3 months)>Y, P(exposure|6 month)>Z. Clients maintain a local cache of extenders, so that extenders that used to work are automatically retried.

The network operator has an API that can associate a trusted IP with a password, so that the service registers HMAC(IP, password) from IP, and the client sends HMAC(IP, password). An extender can forward to any IP that passes the trusted test. The network extender stores the IP as a salted IP hash following the general IP storage guidelines.




## Exchanges

Remove the exchanges section at the moment.

## Community (header)

Network Operators

BringYour, Inc.   https://ur.io

Discord


Brand Kit

URnetwork and the connector logo are registered US trademarks. Permission is granted for users of the protocol to use the brand kit as "powered by URnetwork", "part of the URnetwork protocol", or similar component messaging. The URnetwork trademark and logo may not be used without context in products or services to confuse users with the protocol itself or the services offered by BringYour, Inc.


## Docs (header)


## Contact

info@ur.xyz



