package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// see https://benhoyt.com/writings/go-routing/


var routes = []Route {
	newRoute("GET", "/"),
    newRoute("GET", "/contact"),
    newRoute("GET", "/api/widgets"),
    newRoute("POST", "/api/widgets"),
    newRoute("POST", "/api/widgets/([^/]+)"),
    newRoute("POST", "/api/widgets/([^/]+)/parts"),
    newRoute("POST", "/api/widgets/([^/]+)/parts/([0-9]+)/update"),
    newRoute("POST", "/api/widgets/([^/]+)/parts/([0-9]+)/delete"),
    newRoute("GET", "/([^/]+)"),
    newRoute("GET", "/([^/]+)/admin"),
    newRoute("POST", "/([^/]+)/image"),
}

func newRoute(method string, pattern string) Route {
    return Route{
    	method,
    	// regexp.MustCompile("^" + pattern + "$"),
    	pattern,
    }
}

type Route struct {
	method string
	// regex *regexp.Regexp
	pattern string
}

func main() {
	// test loop through each pattern

	request1 := "POST /foo/bar/gah/12345"

	regexps := make([]*regexp.Regexp, len(routes))
	for i := 0; i < len(routes); i += 1 {
		regexps[i] = regexp.MustCompile("^" + routes[i].method + " " + routes[i].pattern + "$")
	}
	time0 := time.Now()
	for j := 0; j < 1024 * 1024; j += 1 {
		for i := 0; i < len(regexps); i += 1 {
			regexps[i].FindStringSubmatch(request1)
		}
	}
	time1 := time.Now()
	fmt.Printf("Approach 1: %dms\n", time1.Sub(time0).Milliseconds())


	// test use one super pattern
	parts := make([]string, 0)
	offsets := make([]int, len(routes) + 1)
	offsets[0] = 0
	for i := 0; i < len(routes); i += 1 {
		requestPattern := "(" + routes[i].method + " " + routes[i].pattern + ")"
		regexp := regexp.MustCompile(requestPattern)
		offsets[i + 1] = offsets[i] + regexp.NumSubexp()

		parts = append(parts, requestPattern)
	}
	regexp := regexp.MustCompile("^" + strings.Join(parts, "|") + "$")
	time2 := time.Now()
	for j := 0; j < 1024 * 1024; j += 1 {
		regexp.FindStringSubmatch(request1)
	}
	time3 := time.Now()
	fmt.Printf("Approach 2: %dms\n", time3.Sub(time2).Milliseconds())




}
