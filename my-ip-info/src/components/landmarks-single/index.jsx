import { createStore } from "solid-js/store"
import { Index } from "solid-js"
import measureRTTs from "./measure-rtts"

function LandmarksSingle(props) {
  const [rttsStore, rttsSetStore] = createStore({
    landmarks: [],
  })

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

  const landmarksWithMeasuredRTTs = props.landmarks.map((lm) => ({
    ...lm,
    measuredRTTs: [],
  }))

  rttsSetStore(() => ({
    landmarks: landmarksWithMeasuredRTTs,
  }))

  measureRTTs(props.landmarks, addRttMeasurement)

  return (
    <Index each={rttsStore.landmarks}>
      {(item, i) => (
        <>
          <h2 class="font-bold">{item().ip}</h2>

          <h2 class="font-semibold">({item().name})</h2>

          <p>measured {item().measuredRTTs.length > 0 ? (Math.min(...item().measuredRTTs) * 1000).toFixed(2) : "-"}ms</p>

          <p>expected {(item().rtt * 1000).toFixed(2)}ms</p>
          <p class="mb-4">
            delta {item().measuredRTTs.length > 0 ? formatDelta((Math.min(...item().measuredRTTs) - item().rtt) * 1000) : "-"}ms
          </p>
        </>
      )}
    </Index>
  )
}

function formatDelta(delta) {
  if (delta > 0) {
    return `+${delta.toFixed(2)}`
  }
  return delta.toFixed(2)
}

export default LandmarksSingle
