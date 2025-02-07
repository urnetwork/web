"use strict"

import { onMount, onCleanup, createSignal, createEffect } from "solid-js"
import * as d3 from "d3"
import * as topojson from "topojson-client"
import worldData from "./data/world-110m.v1.json" // Adjust the path as needed

function GlobeComponent(props) {
  let globeContainer = {
    clientWidth: 600,
    clientHeight: 600,
  }

  let el

  let svg, projection, path, zoomBehavior
  let initialScale = 50
  const [currentZoom, setCurrentZoom] = createSignal(initialScale)

  // Reactive signals for centralLocation and locations
  const [centralLocation, setCentralLocation] = createSignal(props.centralLocation)
  const [locations, setLocations] = createSignal(props.locations)

  onCleanup(() => {
    window.removeEventListener("resize", handleResize)
  })

  // Watch for prop changes
  createEffect(() => {
    if (props.centralLocation) {
      setCentralLocation(props.centralLocation)
      // adjustProjectionToFitLocations()
    }
  })

  // createEffect(() => {
  //   if (props.locations) {
  //     setLocations(props.locations)
  //     adjustProjectionToFitLocations()
  //   }
  // })

  /**
   * Sets up the globe visualization.
   */
  function setupGlobe() {
    const width = globeContainer.clientWidth
    const height = globeContainer.clientHeight
    initialScale = Math.min(width, height) / 2
    console.log("initial scale", initialScale)

    // Initialize projection to show the full globe
    projection = d3
      .geoOrthographic()
      .scale(initialScale)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate([0, 0]) // Start with rotation [0, 0] to show the full globe

    path = d3.geoPath().projection(projection)

    // Initialize SVG
    svg = d3.select(el).append("svg").style("cursor", "grab").attr("viewBox", "0 0 600 600")

    // Attach drag behavior
    makeGlobeDraggable()

    // Draw globe
    svg.append("path").datum({ type: "Sphere" }).attr("class", "globe").attr("d", path)

    // Draw land
    const countries = topojson.feature(worldData, worldData.objects.countries)
    svg.append("g").selectAll("path.land").data(countries.features).enter().append("path").attr("class", "land").attr("d", path)

    // Add graticules
    const graticule = d3.geoGraticule()
    svg.append("path").datum(graticule).attr("class", "graticule").attr("d", path)

    // Initialize zoom behavior
    initializeZoom()

    // Draw arcs and points
    drawArcs()
    highlightPoints()

    // Start the initial animation
    animateToCentralLocation()
  }

  /**
   * Initializes zoom behavior using D3's zoom.
   */
  function initializeZoom() {
    const minScale = initialScale / 10
    const maxScale = initialScale * 10

    // Create the zoom behavior first
    zoomBehavior = d3.zoom().scaleExtent([minScale, maxScale]).on("zoom", handleZoom)

    // Apply it to the SVG
    svg.call(zoomBehavior)

    // Then set the initial transform
    svg.call(zoomBehavior.transform, d3.zoomIdentity.scale(initialScale))
  }

  /**
   * Handles zoom events by updating the projection's scale.
   */
  function handleZoom(event) {
    // Add a guard clause
    if (!zoomBehavior) return

    const { transform } = event
    const clampedScale = Math.max(zoomBehavior.scaleExtent()[0], Math.min(transform.k, zoomBehavior.scaleExtent()[1]))

    projection.scale(clampedScale)
    setCurrentZoom(clampedScale)

    updateProjection()
  }

  /**
   * Updates the projection and re-renders the globe, arcs, and points.
   */
  function updateProjection() {
    path = d3.geoPath().projection(projection)
    svg.selectAll("path").attr("d", path)
    highlightPoints()
    drawArcs()
  }

  /**
   * Handles window resize events to maintain responsiveness.
   */
  function handleResize() {
    // return
    const width = globeContainer.clientWidth
    const height = globeContainer.clientHeight

    projection.translate([width / 2, height / 2])
    initialScale = Math.min(width, height) / 2

    updateProjection()
  }

  /**
   * Makes the globe draggable to rotate with rotation speed based on zoom level.
   */
  function makeGlobeDraggable() {
    const width = globeContainer.clientWidth

    svg.call(
      d3
        .drag()
        .touchable(true)
        .on("start", (event) => {
          svg.style("cursor", "grabbing")
        })
        .on("drag", (event) => {
          const rotate = projection.rotate()
          const k = width / projection.scale() / (3 * 3.14) // Adjust rotation sensitivity

          projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k])

          updateProjection()
        })
        .on("end", () => {
          svg.style("cursor", "grab")
        }),
    )
  }

  /**
   * Adjusts the projection's rotation and scale to fit all locations within the view with some margin.
   */
  function adjustProjectionToFitLocations() {
    return
    const locs = [centralLocation(), ...locations()]
    if (locs.length === 0) return

    const features = locs.map((loc) => ({
      type: "Feature",
      properties: { name: loc.name },
      geometry: { type: "Point", coordinates: loc.coordinates },
    }))

    const featureCollection = { type: "FeatureCollection", features }
    const centroid = d3.geoCentroid(featureCollection)

    let maxDistance = 0
    features.forEach((feature) => {
      const distance = d3.geoDistance(centroid, feature.geometry.coordinates)
      if (distance > maxDistance) maxDistance = distance
    })

    maxDistance = Math.min(maxDistance, Math.PI / 2)
    const marginFactor = 0.8
    const radius = Math.min(globeContainer.clientWidth, globeContainer.clientHeight) / 2
    const requiredScale = (marginFactor * radius) / Math.sin(maxDistance)

    projection.rotate([-centroid[0], -centroid[1]])
    projection.scale(requiredScale)
    path = d3.geoPath().projection(projection)

    const minScale = requiredScale / 10
    const maxScale = requiredScale * 3
    zoomBehavior.scaleExtent([minScale, maxScale])

    svg.call(zoomBehavior.transform, d3.zoomIdentity.scale(projection.scale()))
    updateProjection()
  }

  /**
   * Animates the globe from the full view to focus on the central location and other locations.
   */
  function animateToCentralLocation() {
    // Compute the target rotation and scale
    const locs = [centralLocation(), ...locations()]
    if (locs.length === 0) return

    // Compute the centroid of the locations
    const features = locs.map((loc) => ({
      type: "Feature",
      properties: { name: loc.name },
      geometry: { type: "Point", coordinates: loc.coordinates },
    }))

    const featureCollection = { type: "FeatureCollection", features }
    const centroid = d3.geoCentroid(featureCollection)

    // Compute the required scale to fit all locations
    let maxDistance = 0
    features.forEach((feature) => {
      const distance = d3.geoDistance(centroid, feature.geometry.coordinates)
      if (distance > maxDistance) maxDistance = distance
    })

    maxDistance = Math.min(maxDistance, Math.PI / 2)
    const marginFactor = 0.6
    const radius = Math.min(globeContainer.clientWidth, globeContainer.clientHeight) / 2
    const requiredScale = Math.min((marginFactor * radius) / Math.sin(maxDistance), 1200)
    console.log("required scale", requiredScale)

    // Save the current projection parameters
    const initialRotation = projection.rotate()
    const initialScale = projection.scale()

    // Define the target projection parameters
    const targetRotation = [-centroid[0], -centroid[1]]
    const targetScale = Math.min(requiredScale, zoomBehavior.scaleExtent()[1])

    // Create an interpolation function for rotation
    const interpolateRotation = d3.interpolate(initialRotation, targetRotation)

    // Create an interpolation function for scale
    const interpolateScale = d3.interpolate(initialScale, targetScale)

    // Define the transition duration
    const duration = 2000 // 2 seconds

    // Start the transition - combining rotation and scale
    d3.transition(props.name)
      .duration(duration)
      .tween("rotate", () => (t) => {
        projection.rotate(interpolateRotation(t))
        updateProjection()
      })
      .on("end", () => {
        // Update zoom transform to match the new scale
        svg.transition(props.name).duration(duration).call(zoomBehavior.transform, d3.zoomIdentity.scale(targetScale))
      })
  }

  /**
   * Highlights all visible points on the globe with labels.
   */
  function highlightPoints() {
    svg.selectAll("g.point-group").remove()

    // Central location
    addPoint(centralLocation(), true)

    // Other locations
    locations().forEach((loc) => {
      addPoint(loc, false)
    })
  }

  /**
   * Adds a point and label to the globe.
   */
  function addPoint(location, isCentral) {
    const [lon, lat] = location.coordinates
    const rotate = projection.rotate()
    const angle = d3.geoDistance([lon, lat], [-rotate[0], -rotate[1]])

    if (angle < Math.PI / 2) {
      const point = projection([lon, lat])

      const pointGroup = svg.append("g").attr("class", "point-group")

      pointGroup
        .append("circle")
        .attr("class", "point")
        .attr("cx", point[0])
        .attr("cy", point[1])
        .attr("r", isCentral ? 6 : 5)
        .attr("fill", isCentral ? "yellow" : "#EFF7BB")
        .attr("stroke-width", 1)

      pointGroup
        .append("text")
        .attr("class", "point-label")
        .attr("x", point[0])
        .attr("y", point[1] - 10)
        .text(location.name)
        .style("font-size", "14px")
        .style("stroke", "#f8f8f8")
        .style("stroke-width", "0.5px")
        .attr("text-anchor", "middle")
    }
  }

  /**
   * Draws arcs from the central location to each other location.
   */
  function drawArcs() {
    svg.selectAll("g.arc-group").remove()

    const arcGroup = svg.append("g").attr("class", "arc-group")

    locations().forEach((loc) => {
      const source = centralLocation().coordinates
      const target = loc.coordinates

      const rotate = projection.rotate()
      const sourceAngle = d3.geoDistance(source, [-rotate[0], -rotate[1]])
      const targetAngle = d3.geoDistance(target, [-rotate[0], -rotate[1]])

      if (sourceAngle > Math.PI / 2 || targetAngle > Math.PI / 2) return

      const arcData = createArc(source, target)

      arcGroup
        .append("path")
        .datum(arcData)
        .attr("class", "arc")
        .attr("d", path)
        .attr("stroke", loc.arcColor || "blue")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .attr("opacity", 0.8)
        .attr("pointer-events", "none")
    })
  }

  /**
   * Creates a GeoJSON LineString (arc) between two points using interpolation.
   */
  function createArc(source, target) {
    const interpolate = d3.geoInterpolate(source, target)
    const steps = 100
    const coordinates = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      coordinates.push(interpolate(t))
    }
    return {
      type: "LineString",
      coordinates,
    }
  }

  // Styles
  const styles = `
    .land {
      fill: #f8f8f8;
      stroke: #101010;
      stroke-width: 0.3px;
    }
    .globe {
      fill: #101010;
    }
    .graticule {
      fill: none;
      stroke: #CCCCCC60;
      stroke-width: 0.5px;
    }
    .arc {
      fill: none;
      stroke-width: 3px;
      opacity: 0.8;
    }
    .point {
      fill: #0039de;
      stroke: #f8f8f8;
      stroke-width: 1px;
      cursor: pointer;
    }
    .point-label {
      font-size: 14px;
      fill: f8f8f8;
      stroke: 101010;
      stroke-width: 0.5px;
      text-anchor: middle;
    }
  `

  return (
    <div
      style="width: 100%; height: 100%;"
      ref={(e) => {
        /*@once*/
        el = e
        onMount(() => {
          setupGlobe()
          window.addEventListener("resize", handleResize)
        })
      }}
    >
      <style>{styles}</style>
    </div>
  )
}

export default GlobeComponent
