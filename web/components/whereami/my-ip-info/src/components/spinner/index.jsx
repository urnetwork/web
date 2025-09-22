import { createSignal, onCleanup } from "solid-js"

function Spinner() {
  const [dotIndex, setDotIndex] = createSignal(0)

  const dots = 3

  // Cycle through dots to create a fading effect
  const interval = setInterval(() => {
    setDotIndex((index) => (index + 1) % dots)
  }, 300) // Adjust speed if needed

  onCleanup(() => clearInterval(interval))

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3em",
        fontSize: "1.5em",
        color: "#000", // Match the bold text color
      }}
    >
      {[...Array(dots)].map((_, i) => (
        <span
          style={{
            opacity: i === dotIndex() ? 1 : 0.2,
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          •
        </span>
      ))}
    </div>
  )
}

export default Spinner
