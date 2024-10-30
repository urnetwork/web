

new function() {
    const self = this

    setTimeout(function(){
        self.initStoreLinks()

        // attempt to redirect to the deep link
        let u = URL.parse(window.location.href)
    	let deepLink = `ur://${u.search}`
    	window.location.replace(deepLink)
    }, 0)

    self.initStoreLinks = function() {
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

