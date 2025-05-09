import { createSignal, createEffect, Show } from "solid-js"
import "./Widget.css"
import { customElement, noShadowDOM } from "solid-element"
import Spinner from "./components/spinner"
import Dot from "./components/dot"
//
function Widget(props) {
  const [myIPv4, setMyIPv4] = createSignal(Spinner)
  const [myIPv6, setMyIPv6] = createSignal(Spinner)

  const [ipv4Privacy, setIpV4Privacy] = createSignal(null)
  const [ipv6Privacy, setIpV6Privacy] = createSignal(null)
  const [pulseColor, setPulseColor] = createSignal("#D6E4F4")

  createEffect(() => {
    if (!ipv4Privacy() && !ipv6Privacy()) {
      setPulseColor("#D6E4F4")
      return
    }

    let isPrivate = true

    let connected = false

    const v4 = ipv4Privacy()
    if (v4) {
      isPrivate &&= !v4.hosting
      isPrivate &&= !v4.proxy
      isPrivate &&= !v4.relay
      isPrivate &&= !v4.tor
      isPrivate &&= !v4.relay

      connected ||= v4.connected_to_network
    }
    console.log("after v4", isPrivate)

    const v6 = ipv6Privacy()
    if (v6) {
      isPrivate &&= !v6.hosting
      isPrivate &&= !v6.proxy
      isPrivate &&= !v6.relay
      isPrivate &&= !v6.tor
      isPrivate &&= !v6.relay

      connected ||= v6.connected_to_network
    }

    if (connected) {
      setPulseColor("#87FB67")
    } else {
      setPulseColor(isPrivate ? "#FF6C58" : "red")
    }
  })

  function fetchWithTimeout(url, options = {}, timeout = 5000) {
    // Create an AbortController to handle the timeout
    const controller = new AbortController()
    const { signal } = controller

    // Set a timeout to automatically abort the request
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Perform the fetch request with the abort signal
    return fetch(url, { ...options, signal })
      .then((response) => {
        clearTimeout(timeoutId) // Clear the timeout if request completes successfully
        return response
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          throw new Error(`Request timed out after ${timeout}ms`)
        }
        throw error
      })
  }

  async function fetchIPV4() {
    try {
      const response = await fetchWithTimeout("https://api-v4.bringyour.com/my-ip-info")
      if (!response.ok) {
        setMyIPv4(null)
      }

      const data = await response.json()
      console.log(data)
      setMyIPv4(data.info.ip)
      setIpV4Privacy({
        ...data.info.privacy,
        connected_to_network: data.connected_to_network,
      })
    } catch (e) {
      setMyIPv4(null)
      throw e
    }
  }

  fetchIPV4()

  async function fetchIPV6() {
    try {
      const response = await fetchWithTimeout("https://api-v6.bringyour.com/my-ip-info")
      if (!response.ok) {
        setMyIPv6(null)
      }
      const data = await response.json()
      setMyIPv6({
        ...data.info.ip,
        connected_to_network: data.connected_to_network,
      })
      setIpV6Privacy(data.info.privacy)
    } catch (e) {
      setMyIPv6(null)
      throw e
    }
  }

  fetchIPV6()

  return (
    <div class="flex items-center gap-x-2.5 max-w-fit">
      <div class="h-5 w-5">
        <Dot color={pulseColor()} />
      </div>
      <div class="flex flex-col items-start justify-center fixed-150px leading-4">
        <Show when={myIPv4}>
          <p class="text-xl text-navitem">{myIPv4}</p>
        </Show>
        <Show when={myIPv6} style="line-height: 1em;">
          <p class="text-xs text-navitem">{myIPv6}</p>
        </Show>
      </div>
    </div>
  )
}

customElement(
  "my-ip-widget",
  {
    // href: {
    //   type: String,
    //   attribute: "href",
    // },
  },
  function (props, options) {
    noShadowDOM()
    return <Widget {...props}></Widget>
  },
)

export default Widget
