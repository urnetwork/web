
// ur.io framer integration


new function() {
	let self = this

	setTimeout(function() {
		let rootElement = document.querySelector('div[aria-label="ip-address-root"]')

		if (rootElement) {
			// 	load the ip address component
			let someDiv = document.createElement('div')
			someDiv.textContent = 'IP Address'

			rootElement.replaceChildren(someDiv)
		}
	}, 0)
}()
