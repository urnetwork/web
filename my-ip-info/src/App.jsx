import "./App.css"
import { onMount, createSignal } from "solid-js"
import { customElement, noShadowDOM } from "solid-element"
import GridComparison from "./GridComparison"
import Spinner from "./components/spinner"
import SingleVersion from "./SingleVersion"
//
function App(props) {
  let myElement

  const [infoComponent, setInfoComponent] = createSignal(
    <div class="flex flex-col items-center">
      <div class="title">Detecting your IP Settings</div>
      <div class="mt-4">
        <Spinner />
      </div>
    </div>,
  )

  async function loadAPI(url, setters, name) {
    try {
      const response = await fetch(url, { cache: "no-cache" })
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }

      const data = await response.json()

      return data
    } catch (e) {
      console.log(e)
      return undefined
    }
  }

  async function loadBoth() {
    const myIpV4InfoUrl = "https://ipv4-whereami.api.ics.ur.network/api/my-ip-info"
    const myIpV6InfoUrl = "https://ipv6-whereami.api.ics.ur.network/api/my-ip-info"

    const v4 = await loadAPI(myIpV4InfoUrl)
    const v6 = await loadAPI(myIpV6InfoUrl)

    console.log(myElement.clientHeight)
    if (v4 && v6) {
      if (window.innerWidth > 768) {
        setInfoComponent(<GridComparison v4={v4} v6={v6} />)
        return
      }

      setInfoComponent(
        <div>
          <div class="title border-b w-full text-center mb-2">IPV4</div>
          <SingleVersion data={v4} version="IPV4" />
          <div class="title border-b w-full text-center mt-6 mb-2">IPV6</div>
          <SingleVersion data={v6} version="IPV6" />
        </div>,
      )
      return
    }

    if (v4) {
      setInfoComponent(<SingleVersion data={v4} version="IPV4" warn={true} />)
      return
    }

    if (v6) {
      setInfoComponent(<SingleVersion data={v6} version="IPV6" warn={true} />)
      return
    }

    setInfoComponent(
      <div class="flex flex-col items-center">
        <div class="title">Error</div>
        <div class="mt-4">Failed to detect your IP settings</div>
      </div>,
    )
  }

  loadBoth()

  return (
    <div
      class="text-body"
      ref={(el) => {
        myElement = el
      }}
    >
      {infoComponent}
    </div>
  )
}

customElement("my-ip-info", {}, function (props, options) {
  noShadowDOM()
  return <App></App>
})

export default App
