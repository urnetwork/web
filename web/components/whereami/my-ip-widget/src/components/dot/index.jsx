function Dot(props) {
  return (
    <svg class="h-full w-full" viewBox="0 0 40 40">
      <circle cx="20" cy="20" fill="none" r="10" stroke={props.color || "#535353"} stroke-width="2">
        <animate attributeName="r" from="8" to="20" dur="1.5s" begin="0s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin="0s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="20" cy="20" fill={props.color || "#535353"} r="10"></circle>
    </svg>
  )
}

export default Dot
