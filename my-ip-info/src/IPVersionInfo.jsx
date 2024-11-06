import { Show, createSignal, createEffect, Index } from "solid-js"
import { render } from "solid-js/web"
import "./App.css"
import { createStore } from "solid-js/store"
import measureRTTs from "./measure-rtts"
import GlobeComponent from "./globe/GlobeComponent"
import ipReport from "./ip-report"
import { customElement, noShadowDOM } from "solid-element"
import Spinner from "./components/spinner"

//
function IPVersionInfo(props) {
  const [apiResponseStore, apiResponseSetStore] = createStore({
    data: false,
    error: false,
  })

  const [rttsStore, rttsSetStore] = createStore({
    landmarks: [],
  })

  const [myLocation, setMyLocation] = createSignal({
    name: "?",
    coordinates: [0, 0],
  })

  async function loadAPI() {
    try {
      const response = await fetch(props.myIpInfoUrl)
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }

      const data = await response.json()

      const addRttMeasurement = (landmark, rtt) => {
        rttsSetStore("landmarks", (landmarks) => {
          const landmarkIndex = landmarks.findIndex((lm) => lm.name === landmark)
          if (landmarkIndex === -1) {
            console.error(`addRttMeasurement(): landmark ${landmark} not found`)
            return landmarks
          }
          const newLandmarks = [...landmarks]
          const updatedLandmark = {
            ...newLandmarks[landmarkIndex],
          }

          updatedLandmark.measuredRTTs = [...updatedLandmark.measuredRTTs, rtt]

          newLandmarks[landmarkIndex] = updatedLandmark
          return newLandmarks
        })
      }

      measureRTTs(data.landmarks, addRttMeasurement)

      setMyLocation({
        name: "you",
        coordinates: [data.info.location.coordinates.lon, data.info.location.coordinates.lat],
      })

      apiResponseSetStore("data", () => data)
      const landmarksWithMeasuredRTTs = data.landmarks.map((lm) => ({
        ...lm,
        measuredRTTs: [],
      }))

      // console.log("data", landmarksWithMeasuredRTTs)

      rttsSetStore(() => ({
        landmarks: landmarksWithMeasuredRTTs,
      }))
    } catch (e) {
      apiResponseSetStore("error", () => true)
      apiResponseSetStore("data", () => ({}))
    }
  }

  loadAPI()

  const defaultCentralLocation = {
    name: "you",
    coordinates: [0, 0],
  }

  let globeRef

  function formatDelta(delta) {
    if (delta > 0) {
      return `+${delta.toFixed(2)}`
    }
    return delta.toFixed(2)
  }

  return (
    <div>
      <Show when={apiResponseStore.data} fallback={<Spinner></Spinner>}>
        <Show
          when={!apiResponseStore.error}
          fallback={
            <div>
              <h1>Not Supported </h1>
            </div>
          }
        >
          <h1 class="text-2xl font-bold mb-4 min-w-full">The Basics</h1>
          <p>
            Your IP Address is <span class="font-bold">{apiResponseStore.data.info.ip}</span>
          </p>
          <p>
            Your IP is part of a block of IPs that are registered in{" "}
            <span class="font-bold">
              {apiResponseStore.data.info.location.country.name} ({apiResponseStore.data.info.location.country.code}){" "}
            </span>
            .
          </p>
          <p>
            Your IP appears to be near{" "}
            <span class="font-bold">
              {apiResponseStore.data.info.location.city}, {apiResponseStore.data.info.location.region}
            </span>
            .
          </p>
          <For each={ipReport(apiResponseStore.data.info.privacy)}>{(item, index) => <p>{item}</p>}</For>

          <h1 class="text-2xl font-bold mb-4 mt-4 min-w-full">The Performance</h1>

          <p>
            We're going to measure how far away you are from peers around the world. This will give you a sense of how fast your
            connection will be.
          </p>

          <Index each={rttsStore.landmarks}>
            {(item, i) => (
              <div>
                <h2 class="text-1xl font-bold mt-4 min-w-full">
                  {item().ip} ({item().name})
                </h2>

                <p>
                  measured {item().measuredRTTs.length > 0 ? (Math.min(...item().measuredRTTs) * 1000).toFixed(2) : "-"}ms,
                  expected {(item().rtt * 1000).toFixed(2)}ms, delta{" "}
                  {item().measuredRTTs.length > 0 ? formatDelta((Math.min(...item().measuredRTTs) - item().rtt) * 1000) : "-"}ms
                </p>
              </div>
            )}
          </Index>

          <div class="flex items-center justify-center mt-4">
            <div class="w-3/5 aspect-square mt-8 border-2">
              <GlobeComponent
                ref={globeRef}
                centralLocation={myLocation()}
                locations={apiResponseStore.data.landmarks.map((lm) => ({
                  name: lm.name,
                  coordinates: [...lm.coordinates],
                  arcColor: "#87FB67",
                }))}
              />
            </div>
          </div>
        </Show>
      </Show>
    </div>
  )
}

export default IPVersionInfo
