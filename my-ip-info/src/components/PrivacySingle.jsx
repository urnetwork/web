import { Index } from "solid-js"
import thumbsup from "../assets/thumbsup.svg"
import warning from "../assets/warning.svg"
function PrivacySingle(props) {
  // "privacy": {
  //         "vpn": false,
  //         "proxy": false,
  //         "tor": false,
  //         "relay": false,
  //         "hosting": true,
  //         "service": ""
  //     }

  // return "no privacy issues detected"

  const issues = []

  if (props.privacy.vpn) {
    issues.push(
      <div>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be associated with a VPN.</span>
      </div>,
    )
  }

  if (props.privacy.hosting) {
    issues.push(
      <div>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be associated with a data center.</span>
      </div>,
    )
  }

  if (props.privacy.tor) {
    issues.push(
      <div>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be known Onion router (TOR)</span>
      </div>,
    )
  }

  if (props.privacy.relay) {
    issues.push(
      <div>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be a private relay.</span>
      </div>,
    )
  }

  if (props.privacy.proxy) {
    issues.push(
      <div>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be a proxy.</span>
      </div>,
    )
  }

  if (issues.length > 0) {
    return <Index each={issues}>{(issue) => <>{<div>{issue}</div>}</>}</Index>
  }

  return (
    <>
      <div>
        <img class="w-6 inline align-middle" src={thumbsup} alt="thumbs up" />
        <span class="ml-3">No issues detected</span>
      </div>
    </>
  )
}

export default PrivacySingle
