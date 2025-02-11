package index

import (
	"encoding/json"
	"fmt"

	"github.com/urnetwork/whereami/landmarks"
	"github.com/urnetwork/whereami/myinfo"
)

type Location struct {
	Name        string    `json:"name"`
	Coordinates []float64 `json:"coordinates"`
}

func landmarksAndRTTsToLocation(info myinfo.MyInfo, lms []landmarks.LandmarkAndRTT) string {

	locations := []Location{
		{
			Name:        "You",
			Coordinates: []float64{info.Location.Coordinates.Longitude, info.Location.Coordinates.Latitude},
		},
	}

	for _, lm := range lms {
		locations = append(locations, Location{
			Name:        lm.Name,
			Coordinates: lm.Coordinates,
		})
	}

	d, _ := json.Marshal(locations)

	return string(d)

}

func createArcs(lms []landmarks.LandmarkAndRTT) string {

	type arcJSON struct {
		Source string `json:"source"`
		Target string `json:"target"`
		Color  string `json:"color"`
		Label  string `json:"label"`
	}

	arcs := []arcJSON{}

	for _, lm := range lms {
		arcs = append(arcs, arcJSON{
			Source: "You",
			Target: lm.Name,
			Color:  "gray",
			Label:  fmt.Sprintf("%.2f ms", lm.RTT*1000.0),
		})
	}

	d, _ := json.Marshal(arcs)

	return string(d)
}
