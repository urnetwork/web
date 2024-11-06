
// "privacy": {
//     "vpn": false,
//         "proxy": false,
//             "tor": false,
//                 "relay": false,
//                     "hosting": true,
//                         "service": ""
// }

function privacyReport(privacyData) {

    // Your IP is known to be associated with a VPN.Some content might not load.

    const res = [];

    if (privacyData.vpn) {
        res.push("Your IP is known to be associated with a VPN. Some content might not load.");
    }

    if (privacyData.hosting) {
        res.push("Your IP is known to be associated with a data center. Some content might not load.");
    }

    if (privacyData.tor) {
        res.push("Your IP is known to be known Onion router (TOR). Some content might not load.");
    }


    if (privacyData.relay) {
        res.push("Your IP is known to be a private relay. Some content might not load.");
    }

    return res;

}

export default privacyReport;