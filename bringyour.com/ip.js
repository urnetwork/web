
// ur.io framer integration
new function() {
	let self = this

	let headerRootElement = document.querySelector('div[aria-label="header-ip-address"]')
	let rootElement = document.querySelector('div[aria-label="ip-address-root"]')

	if (headerRootElement) {
		let headerSvgUse = headerRootElement.querySelector('svg > use')
		if (headerSvgUse) {
			headerSvgUse.setAttribute('href', 'https://bringyour.com/res/images/ip-disconnected.svg')
		}

		let headerA = headerRootElement.querySelector('a')
		if (headerA) {
			headerA.textContent = '1.2.3.4'
		}
	}

	if (rootElement) {
		// load the ip address component
	}
}()
