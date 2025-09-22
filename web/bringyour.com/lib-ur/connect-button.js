
new function() {
    const self = this

    setTimeout(function(){
        self.notifyByJwtChanged()
    }, 0)

    self.notifyByJwtChanged = function() {
        let buttonElements = document.querySelectorAll('div[data-bs-target="#dialog-connect"]')
        for (const buttonElement of buttonElements) {
            let pElement = buttonElement.querySelector('p')
            if (pElement) {
                let byJwt = self.parseByJwt()
                if (byJwt) {
                    let networkName = byJwt['network_name']
                    pElement.urRestoreTextContent = pElement.textContent
                    pElement.textContent = networkName /*+ '.ur.network'*/
                } else if (pElement.urRestoreTextContent) {
                    pElement.textContent = pElement.urRestoreTextContent
                }
            }
        }
    }


    self.parseByJwt = function() {
        let byJwtStr = localStorage.getItem('byJwt')
        return byJwtStr && self.parseJwt(byJwtStr)
    }

    // see https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
    self.parseJwt = function(jwt) {
        var base64Url = jwt.split('.')[1]
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        return JSON.parse(jsonPayload)
    }
}()
