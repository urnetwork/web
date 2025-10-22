import { Show, createSignal, createEffect, Index } from "solid-js"
import "./App.css"
import GlobeComponent from "./globe/GlobeComponent"
import Privacy from "./components/Privacy"
import Landmarks from "./components/landmarks"

function TableComparison(props) {
  const ipv4Address = props.v4.info.ip
  const ipv6Address = props.v6.info.ip

  const ipv4Country = `${props.v4.info.location.country.name} (${props.v4.info.location.country.code})`
  const ipv6Country = `${props.v6.info.location.country.name} (${props.v6.info.location.country.code})`
  const ipv4Region = `${props.v4.info.location.city} (${props.v4.info.location.region})`
  const ipv6Region = `${props.v6.info.location.city} (${props.v6.info.location.region})`
  const ipv4Privacy = <Privacy privacy={props.v4.info.privacy} />
  const ipv6Privacy = <Privacy privacy={props.v6.info.privacy} />

  const myIPV4Location = {
    name: "you",
    coordinates: [props.v4.info.location.coordinates.lon, props.v4.info.location.coordinates.lat],
  }

  const ipv4landmarks = props.v4.landmarks.map((lm) => ({
    name: lm.name,
    coordinates: [...lm.coordinates],
    arcColor: "#87FB67",
  }))

  const ipv4Location = (
    <div class="w-full aspect-square border-2">
      <GlobeComponent name="ipv4" centralLocation={myIPV4Location} locations={ipv4landmarks} />
    </div>
  )

  const myIPV6Location = {
    name: "you",
    coordinates: [props.v6.info.location.coordinates.lon, props.v6.info.location.coordinates.lat],
  }

  const ipv6landmarks = props.v6.landmarks.map((lm) => ({
    name: lm.name,
    coordinates: [...lm.coordinates],
    arcColor: "#87FB67",
  }))

  const ipv6Location = (
    <div class="w-full aspect-square border-2">
      <GlobeComponent name="ipv6" centralLocation={myIPV6Location} locations={ipv6landmarks} />
    </div>
  )

  const ipv4Performance = <Landmarks landmarks={props.v4.landmarks} />
  const ipv6Performance = <Landmarks landmarks={props.v6.landmarks} />

  return (
    <>
      <div class="grid grid-cols-[1fr_auto_1fr] w-full max-w-5xl content-evenly items-baseline leading-4 gap-1">
        <div class="title col-span-3 text-center p-4">
          <p>The Basics</p>
        </div>

        <div class="text-center p-2 title h-full w-full">IPV4</div>
        <div class="text-center whitespace-nowrap p-2 h-full w-full"></div>
        <div class="text-center p-2 title h-full w-full">IPV6</div>

        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv4Address}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          Address
        </div>
        <div class="text-center p-2 flex justify-center text-sm border rounded h-full w-full">{ipv6Address}</div>

        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv4Country}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          Country
        </div>
        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv6Country}</div>

        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv4Region}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          Region
        </div>
        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv6Region}</div>

        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv4Privacy}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          Privacy
        </div>
        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv6Privacy}</div>

        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv4Location}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          Location
        </div>
        <div class="text-center p-2 flex justify-center border rounded h-full w-full">{ipv6Location}</div>

        <div class="col-span-3 text-center text-xl p-4">
          <h1 class="title mb-4">The Performance</h1>
          <p>We're going to measure how far away you are from peers around the world.</p>
          <p>This will give you a sense of how fast your connection will be.</p>
        </div>

        <div class="text-center p-2 flex justify-center self-start border rounded h-full w-full">{ipv4Performance}</div>
        <div class="text-center whitespace-nowrap flex flex-col items-center justify-center item-title self-center h-full w-full">
          RTT
        </div>
        <div class="text-center p-2 flex justify-center self-start border rounded h-full w-full">{ipv6Performance}</div>
      </div>
    </>
  )
}

export default TableComparison
