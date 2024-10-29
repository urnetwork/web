

new function() {
    const self = this

    setTimeout(function(){
        self.initStoreLinks()
    }, 0)

    self.initStoreLinks = function() {
    	var storeLink
    	if (self.isAndroid()) {
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

    self.isAndroid = function() {
	    return /Android/i.test(navigator.userAgent)
	}

	self.isApple = function() {
	    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
	}
}()

