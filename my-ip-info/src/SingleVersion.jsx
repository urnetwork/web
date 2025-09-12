import { Show, createSignal, createEffect, Index } from "solid-js"
import "./App.css"
import GlobeComponent from "./globe/GlobeComponent"
import PrivacySingle from "./components/PrivacySingle"
import LandmarksSingle from "./components/landmarks-single"
import warning from "./assets/warning.svg"

function SingleVersion(props) {
  const address = props.data.info.ip

  const country = `${props.data.info.location.country.name} (${props.data.info.location.country.code})`
  const region = `${props.data.info.location.city} (${props.data.info.location.region})`

  const myLocation = {
    name: "you",
    coordinates: [props.data.info.location.coordinates.lon, props.data.info.location.coordinates.lat],
  }

  const myLandmarks = props.data.landmarks.map((lm) => ({
    name: lm.name,
    coordinates: [...lm.coordinates],
    arcColor: "#87FB67",
  }))

  // const location = (

  // )

  // const performance = <Landmarks landmarks={props.data.landmarks} />

  return (
    <div class="text-body flex flex-col items-center gap-y-2">
      <div class="flex flex-col items-center gap-y-1 text-center">
        <h1 class="title mb-4">The Basics</h1>
        <Show when={props.warn}>
          <div>
            <img src={warning} class="w-4 inline align-middle" />
            <span class="ml-2">
              Your Internet connection seems to be only using <span class="font-bold">{props.version}</span>
            </span>
          </div>
        </Show>
        <div>
          Your IP Address is <span class="font-bold">{address}</span>
        </div>
        <div>
          Your IP is part of a block of IPs that are registered in <span class="font-bold">{country}</span>.
        </div>
        <div>
          Your IP appears to be near <span class="font-bold">{region}</span>.
        </div>
        <div class="w-full mt-4">
          <div class="w-full aspect-square border-2">
            <GlobeComponent name={props.version} centralLocation={myLocation} locations={myLandmarks} />
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-col items-center gap-y-1 text-center">
        <h1 class="title mb-4">Privacy</h1>
        <PrivacySingle privacy={props.data.info.privacy} />
      </div>
      <div class="mt-4 flex flex-col items-center gap-y-1 text-center">
        <h1 class="title mb-4">The Performance</h1>
        <div>We're going to measure how far away you are from peers around the world.</div>
        <div>This will give you a sense of how fast your connection will be.</div>
        <div class="mt-4 flex flex-col items-center gap-y-1">
          <LandmarksSingle landmarks={props.data.landmarks} />
        </div>
      </div>
    </div>
  )
}

export default SingleVersion
