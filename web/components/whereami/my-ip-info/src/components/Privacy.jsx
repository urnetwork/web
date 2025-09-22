import { Index } from "solid-js"
import thumbsup from "../assets/thumbsup.svg"
import warning from "../assets/warning.svg"
function Privacy(props) {
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
      <span>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be associated with a VPN.</span>
      </span>,
    )
  }

  if (props.privacy.hosting) {
    issues.push(
      <span>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be associated with a data center.</span>
      </span>,
    )
  }

  if (props.privacy.tor) {
    issues.push(
      <span>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be known Onion router (TOR)</span>
      </span>,
    )
  }

  if (props.privacy.relay) {
    issues.push(
      <span>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be a private relay.</span>
      </span>,
    )
  }

  if (props.privacy.proxy) {
    issues.push(
      <span>
        <img class="w-4 inline align-middle" src={warning} alt="warning" />
        <span class="ml-2">Your IP is known to be a proxy.</span>
      </span>,
    )
  }

  if (issues.length > 0) {
    return (
      <div class="flex flex-col w-content">
        <Index each={issues}>{(issue) => issue()}</Index>
      </div>
    )
  }

  return (
    <>
      <div class="flex flex-row items-baseline">
        <img class="w-6" src={thumbsup} alt="thumbs up" />
        <div class="ml-3">No issues detected</div>
      </div>
    </>
  )
}

export default Privacy
