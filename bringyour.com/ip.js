
// ur.io framer integration

setTimeout(function() {
	new function() {
		let self = this

		let headerRootElement = document.querySelector('div[aria-label="header-ip-address"]')

		if (headerRootElement) {
			// load the ip address header 

			// TODO
			let connectedToUrNetwork = false
			let ipAddress = '1.2.3.4'

			let headerSvg = headerRootElement.querySelector('svg')
			if (headerSvg) {
				let connectedImg = document.createElement('img')
				connectedImg.setAttribute('style', 'width:100%; height:100%')
				if (connectedToUrNetwork) {
					connectedImg.setAttribute('src', 'https://bringyour.com/res/images/ip-connected.svg')
				} else {
					connectedImg.setAttribute('src', 'https://bringyour.com/res/images/ip-disconnected.svg')
				}
				headerSvg.replaceWith(connectedImg)
			}

			let headerA = headerRootElement.querySelector('a')
			if (headerA) {
				headerA.textContent = ipAddress
			}
		}
	}()
}, 0)
