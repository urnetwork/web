
function updateConnectButton() {
    let startElement = document.getElementById('start')
    startElement.classList.remove('d-none')

    let byJwt = parseByJwt()
    if (byJwt) {
        let networkName = byJwt['network_name']
        startElement.textContent = networkName + '.bringyour.network'
        startElement.classList.remove('btn-primary')
        startElement.classList.add('btn-light')
    }
    else {
        startElement.textContent = 'Connect'
        startElement.classList.add('btn-primary')
        startElement.classList.remove('btn-light')
    }
}

window.notifyByJwtChanged = updateConnectButton


let windowLoadCallbacks = []

window.addEventListener('load', (event) => {
    for (const callback of windowLoadCallbacks) {
        callback()
    }

    let resetCode = new URLSearchParams(window.location.search).get('resetCode')
    let auth = new URLSearchParams(window.location.search).get('auth')

    if (resetCode) {
        // see gen.py `dialog_connect` for where the reset component is mounted
        if (window.showConnectDialog) {
            window.showConnectDialog()
        }
    } else if (auth != null) {
        if (window.showConnectDialog) {
            window.showConnectDialog()
        }
    }
})
