
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

window.notifyByJwtChanged = updateConnectButton

window.addEventListener('load', (event) => {
    let resetCode = new URLSearchParams(window.location.search).get('resetCode')

    if (resetCode) {
        $('#dialog-connect').modal('show')
    }
})
