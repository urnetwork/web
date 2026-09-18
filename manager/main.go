package main

import (
	"os"
	
	"github.com/urnetwork/warp"
)

// this value is set via the linker, e.g.
// -ldflags "-X main.Version=$WARP_VERSION-$WARP_VERSION_CODE"
var Version string

func main() {
	configPath := "/etc/nginx/nginx.conf"
	convertedConfigPath := "/etc/nginx/nginx_host.conf"

	err, exitCode := warp.NginxWithDefaults(configPath, convertedConfigPath)
	if err != nil {
		panic(err)
	}
	os.Exit(exitCode)
}
