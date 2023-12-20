
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
        startElement.textContent = 'Get Connected'
        startElement.classList.add('btn-primary')
        startElement.classList.remove('btn-light')
    }
}

/**
 * LocalStorage data cannot be accessed by a subdomain. So, the JWT saved by https://bringyour.com is not accessible to
 * the user when they visit https://app.bringyour.com. We don't want to force them to re-authenticate.
 *
 * The solution is to use (cross-origin communication)[https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage]
 * to send the JWT via an invisible iframe. The iframe handles storing the JWT in localstorage.
 */
function sendJwtToSubdomain() {
    let byJwt = getByJwt()
    let targetWindow = document.getElementById("app-iframe").contentWindow
    targetWindow.postMessage(JSON.stringify({'byJwt': byJwt}), "https://app.bringyour.com")
}

function notifyByJwtChanged() {
    updateConnectButton()
    sendJwtToSubdomain()
}

window.notifyByJwtChanged = notifyByJwtChanged

window.addEventListener('load', (event) => {
    let resetCode = new URLSearchParams(window.location.search).get('resetCode')

    if (resetCode) {
        $('#dialog-connect').modal('show')
    }
})
