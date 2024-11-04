

new function() {
    const self = this

    setTimeout(function(){
        self.initLinks()

        // attempt to redirect to the deep link
    	let deepLink = `ur://${window.location.search}`
    	window.location.replace(deepLink)
    }, 0)

    self.initLinks = function() {
    	var storeLink
    	if (self.isPlatformSupported()) {
    		let referrer = encodeURIComponent(window.location.href)
    		storeLink = `https://play.google.com/store/apps/details?id=com.bringyour.network&referrer=${referrer}`
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

    self.isPlatformSupported = function() {
    	return self.isAndroid() || self.isChromeOs()
    }

    self.isAndroid = function() {
	    return /Android/i.test(navigator.userAgent)
	}

	self.isChromeOs = function() {
		return /CrOS/.test(navigator.userAgent)
	}

	self.isApple = function() {
	    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
	}
}()

