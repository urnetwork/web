# Visual explanation: build an unblockable VPN from a bunch of personal consumer devices

This document illustrates the BringYour network, an app that gives people access to uniform internet and IP privacy. The components are [open source](https://github.com/bringyour) and run on phones, TVs, and computers. The design of the network has these goals:

- **Be safe for senders and providers**, take care of users starting with actively knowing as little about them as possible
- **Be anonymous**, so that participants do not know who is sending the traffic, due to using multiple hops in routing the traffic
- **Re-use existing internet resources**, making it hard for internet services to identify users of the network versus existing traffic
- **Use web standards** that cannot be separated from normal web traffic at the network level, so that everyone is free to participate

BringYour is **a VPN that works like home**, because it is literally made from a bunch of homes doing normal home stuff. 

Legally BringYour the company is an overlay ISP run as a revenue share, and participants are protected as part of the ISP by laws like the DMCA in the US. The network is dynamic where participants can come and go at any time.

This article illustrates and briefly explains three parts of the network:

1. **Latency Map** to find near peers
2. **Linear Path (linpath)** to find a near-linear latency sequence of hops between sender and egress
3. **Self-Healing Sender Algorithm** to continuously select egress devices based on passive network statistics

The three parts, along with a distributed contract system, come together to create a public VPN where anyone can join and send IP traffic to egress from a **destination criteria**. The network charges per used data transfer GiB and pays out part of the charge to all the hops used to send the data.


# Latency Map to find near peers

![Screenshot 2024-01-19 at 12.16.25 AM](/Users/brien/Library/CloudStorage/Dropbox/Capture/Screenshot 2024-01-19 at 12.16.25 AM.png)


| Type of destination criteria | Example                                                      |
| :--------------------------- | :----------------------------------------------------------- |
| Group                        | "Any device in a safe internet region, like EU, Nordic, California" |
| Country/Region/City          | "Any device in Switzerland"                                  |
| Specific device              | "A TV device shared with me"                                 |



A challenge is how can a sender quickly orient itself on the network to find:

- Nearby peers
- A starting point to find a linear path from itself to a destination

The solution used by BringYour is for each node to maintain a map of ping values to a known set of **extenders**. The sender pings a small random subset of extenders (3-5), while providers (the egress hops) continually ping as many extenders as possible. It is in the interest of providers to have accurate pings to as many extenders as possible to be able to pair with more senders.

The high dimensional vector of ping values is reduced to lower dimensions, called the **latency map**. Closeness of two nodes on the latency map is done with least squares.

The sender maintains its small set of ping values as a location fingerprint to enumerate linear paths. The ping times are the only location information BringYour uses for routing decisions. In this way the network is resilient to participants from centralized networks like Starlink, since users phsyically close to each other may not be close to each other in the latency map.



# **Linear Path (linpath)** to find a near-linear latency sequence of hops between sender and egress



![Screenshot 2024-01-19 at 12.15.22 AM](/Users/brien/Library/CloudStorage/Dropbox/Capture/Screenshot 2024-01-19 at 12.15.22 AM.png)

A sender directly sending data to an egress over the internet is the fastest route, but doesn't hide the sender's identity. BringYour uses an approach called linear path (linpath) to add additional hops to achieve **anonymous internet**. The goals of the linear path are:

- Randomize the hop selection with unpredictable choices
- Maintain as near to a direct path between sender and egress. In other words minimize the latency delta between the direct path and the linear path.

## Randomize the hop selection with unpredictable choices

By design, each hop should not know whether it is the first or nth. This is done by each hop maintaining a NAT dynamically controlled by the network, so that each hop only receives from one prior and sends to one after without knowing *how many* prior or after.

However, if one wanted to spy on a target, and the selection of hops was predictable, the approach would be to force yourself to be the first hop by working the selection process backwards. The linear path selection is made unpredictable by using a bisection approach, so that:

- The first hop is derived from log_2(n) previous decisions
- Each decision is made using a probability field based on the destination
- Hops are spaced across as many regions as possible

Given that the destination can change quite radically (e.g. Any device in a safe internet region), deriving the first hop should be harder as more provider devices join the network.

If providers share information, it would be possible to statistically derive the first hop if enough collaborators are chosen in a linear path. Since collaborators are correlated with nearness, hops are spaced across as many regions as possible. The number of hops a sender chooses can be seen as an estimate of how much information sharing occurs on the network.

For a completely independent network, three hops would be sufficient. Three is the current default.

| Hop             | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| Sender          | Knows who they are                                           |
| First Midpoint  | Knows they are not the egress, but not whether they are first or second |
| Second Midpoint | Knows they are not the egress, but not whether they are first or second |
| Egress          | Knows they are the egress                                    |



## Maintain as near to a direct path between sender and egress

BringYour uses a linear path finding algorithm that recursively bisects the path, randomly choosing the midpoint weighted by closeness to the true midpoint. Each bisection adds a latency error (the height of the triangle between start, end, and mid). The total latency error is the sum of the bisection errors. 



# Self-Healing sender algorithm to continuously select egress devices based on passive network statistics

Low loss, medium loss, high loss

![Screenshot 2024-01-19 at 12.18.12 AM](/Users/brien/Library/CloudStorage/Dropbox/Capture/Screenshot 2024-01-19 at 12.18.12 AM.png)



The sender wants to maximize the packet flow, and will use the approach below to route packets through linpaths to reinforce the linpaths that route the most packets. The are two degerate cases of a linpath:

- **Drop**. This can happen at any time if any device in the linpath goes offline.
- **Partial block**. Some subset of traffic routes for some time, but the application logic fails and reconnects.

Both of these cases will self-select out using passive network statistics if either:

- The expected capacity of a new linpath is greater than the degenerate traffic. 
- There is another linpath that is routing more than the degenerate traffic.

## Linpath Enumeration

The BringYour network allows random enumeration of the linpaths from sender to egress devices that match a destination criteria.  The enumeration looks like:

```
linpath = next_linpath(visited_linpaths, destination_criteria)
if linpath is nil {
	visited_linpaths = []
	linpath = next_linpath(visited_linpaths)
}
if linpath is not nil {
	visited_linpaths.add(linpath)
}
```

next_linpath returns a randomly selected linpath such that for any hop [i], linpath[i] does not equal any other linpath[i] in the visited list.

The BringYour network only considers devices that have passed an initial routing check to include in the linpath. The linpath also contains an estimate of capacity for the entire path, which  is the min of the capacity estimate for each device on the path.

## Egress Window

The sender choice algorithm maintains a window of egress devices that grows to match a target size determine by network retries. A retry is an IP packet sent to the same (dst, dst_port, protocol) with a different (src, src_port).

The window target size is chosen using locally maintained statistics for the (src, src_port, dst, dst_port, protocol, egress_id) packets:

```
connection_tuples = connection_tuples_for_dst(dst, egress_window, connect_stats_window)
target_egress_window_size = base_window_size + expand_step * length(connection_tuples) / reconnect_threshold
```

New egress devices are added using the linpath enumeration.

```
n = target_egress_window_size - len(egress_window)
if 0 < n {
	egress_window.extend(enumerate_up_to_n_linpaths(n))
}
```

The egress window gives a grace period to each new egress device before it can be removed. The device in the egress window with the minimum transfer is removed at a regular interval until the window is within [base_window_size, max_window_size]. Devices with no transfer in a longer interval are removed until the window is base_window_size.


## Egress Choice

Connection tuples must maintain an affinity to a single egress device. For a new connection tuple, the choice of egress device uses local statistics. The egress devices are weighted by net traffic and net traffic to dst, and randomly chosen based on those weights.

```
p_net = net_transfer(egress, transfer_stats_window) / net_transfer(egress_window, transfer_stats_window)
p_net_to_dst = net_transfer_to_dst(egress, dst, transfer_stats_window) / net_transfer_to_dst(egress_window, dst, transfer_stats_window)
p = (1 - dst_weight) * p_net + dst_weight * p_net_to_dst 
```

## Reasonable Values

Below are the default values used in the current version of the network.

```base_window_size = 5
max_window_size = 10
reconnect_stats_window = 120s
reconnect_threshold = 3
expand_step = 2
transfer_stats_window = 15s
dst_weight = 0.5
```



## Conclusion

There is much more to do to improve this, so please get in touch with any feedback. You can also sign up to use BringYour to support this work.