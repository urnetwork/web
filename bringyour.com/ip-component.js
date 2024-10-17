
// ur.io framer integration

setTimeout(function() {
	new function() {
		let self = this

		let rootElement = document.querySelector('div[aria-label="ip-address-root"]')

		if (rootElement) {
			// 	load the ip address component
			let someDiv = document.createElement('div')
			someDiv.textContent = 'IP Address'

			rootElement.replaceChildren(someDiv)
		}
	}()
}, 0)
