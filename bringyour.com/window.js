
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
    let params = new URLSearchParams(window.location.search)
    let resetCode = params.get('resetCode')
    let auth = params.get('auth')

    if (resetCode) {
        // see gen.py `dialog_connect` for where the reset component is mounted
        $('#dialog-connect').modal('show')
    } else if (auth != null) {
        $('#dialog-connect').modal('show')
    }
})
