

new function() {
    const self = this

    setTimeout(function(){
        self.initLinks()

        // note that if universal deep links or android deep links are working correctly
        // we will not be on the html page
        // since this script is evaluating, it means the deep link did not work
        // - on android chrome, deep links will not always work when tapping a link.
        //   we will try to upgrade to the app using the custom scheme
        // - Apple webkit pops variants of a dialog "Safari cannot open the page because the address is invalid."
        //   if the custom scheme is not registered.
        //   we do not try a custom scheme on Apple WebKit
        if (window.location && !self.isAppleWebkit()) {
            // attempt to redirect to the scheme deep link
            let params = new URLSearchParams(window.location.search)
            // any app can intercept the custom scheme
            params.delete('auth_code')
        	let deepLink = `ur://ur.io/c?${params.toString()}`
        	window.location.replace(deepLink)
        }
    }, 0)

    self.initLinks = function() {
        if (window.location) {
        	var storeLink
        	if (self.isAndroid() || self.isChromeOs()) {
        		let referrer = encodeURIComponent(window.location.href)
        		storeLink = `https://play.google.com/store/apps/details?id=com.bringyour.network&referrer=${referrer}`
            } else if (self.isApple()) {
                // FIXME referrer
                storeLink = "https://apps.apple.com/us/app/urnetwork/id6741000606"
        	} else {
        		storeLink = "/app"
        	}

            let storeLinkElements = document.querySelectorAll('a[href="https://store.ur.io"]')
            for (const storeLinkElement of storeLinkElements) {
                storeLinkElement.setAttribute("href", storeLink)
            }

            let params = new URLSearchParams(window.location.search)
            let targetLink = params.get("target")
            if (targetLink) {
                let u = URL.parse(targetLink)
                if (u) {
                    let targetLinkElements = document.querySelectorAll('a[href="https://target.ur.io"]')
                    for (const targetLinkElement of targetLinkElements) {
                        targetLinkElement.setAttribute("href", targetLink)
                    }
                }
            }
        }
    }

    self.isPlatformSupported = function() {
    	return self.isAndroid() || self.isChromeOs()
    }

    self.isAndroid = function() {
	    return navigator.userAgent && /Android/i.test(navigator.userAgent)
	}

	self.isChromeOs = function() {
		return navigator.userAgent && /CrOS/.test(navigator.userAgent)
	}

	self.isApple = function() {
	    return navigator.userAgent && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)
	}

    self.isAppleWebkit = function() {
        // see https://stackoverflow.com/questions/7944460/detect-safari-browser
        return navigator.vendor && 0 <= navigator.vendor.indexOf('Apple')
               // navigator.userAgent &&
               // navigator.userAgent.indexOf('CriOS') == -1 &&
               // navigator.userAgent.indexOf('FxiOS') == -1;
    }
}()

