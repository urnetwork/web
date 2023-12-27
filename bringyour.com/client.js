// parse current location to find the api

const clientVersion = '1.0.0';


function getByJwt() {
    let byJwtStr = localStorage.getItem('byJwt')
    return byJwtStr
}


function parseByJwt() {
    let byJwtStr = localStorage.getItem('byJwt')
    // fixme use correct jwt parsing
    return byJwtStr && parseJwt(byJwtStr)
}


// see https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
function parseJwt(jwt) {
    // console.log(jwt)
    var base64Url = jwt.split('.')[1]
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))

    return JSON.parse(jsonPayload)
}



function setByJwt(byJwt) {
    localStorage.setItem('byJwt', byJwt)
    if (window.notifyByJwtChanged) {
        window.notifyByJwtChanged()
    }
}

function removeByJwt() {
    localStorage.removeItem('byJwt')
    if (window.notifyByJwtChanged) {
        window.notifyByJwtChanged()
    }
}


function escapeHtml(html) {
    return html && html.replace(/[<>"]+/g, '')
}


const defaultClientTimeoutMillis = 15 * 1000

const timeoutError = Symbol()

function withTimeout(p, millis, exception) {
    let timeout
    return Promise.race([
        p,
        new Promise((resolve, reject) => {
            timeout = setTimeout(
                reject,
                millis || defaultClientTimeoutMillis,
                exception || timeoutError
            )
        })
    ]).finally(() => clearTimeout(timeout))
}


// fixme
function serviceUrl(service, path) {
    let matches = window.location.host.match(/^(.*?)\.?(bringyour\.com(?:\:\d+)?)$/i)
    let envService = matches[1]
    let baseHost = matches[2]
    if (!envService || envService == 'www') {
        // main
        return `${window.location.protocol}//${service}.${baseHost}${path}`
    }
    let envServiceMatches = envService.match(/^([^\-]+)-?(.*)$/i)
    let env = envServiceMatches[1]
    let envServiceName = envServiceMatches[2]
    // fixme
    // if (envServiceName == 'lb') {
        // if the service block name is beta, use the beta route on the new service also
    // }
    return `${window.location.protocol}//${env}-${service}.${baseHost}${path}`


    // <env>-<service>.bringyour.com or <service>.bringyour.com or <env>.bringyour.com
    // if service == lb, 
    //    if /sb/<serviceblock> and serviceblock == beta
    //      use /sb/<service>/beta
    //    else, use /by/<service>
    // else, use <env>-<service> or <service>

    // local-api.bringyour.com
    // return hostname
}


function apiRequest(method, path, body) {
    let headers = new Headers()
    headers.append('X-Client-Version', clientVersion)

    // add authorization if present
    let byJwt = getByJwt()
    if (byJwt != null) {
        headers.append('Authorization', 'Bearer ' + byJwt)
    }

    let requestOptions = {
        method: method,
        headers: headers
    }
    if (body) {
        requestOptions.body = JSON.stringify(body)
    }
    let url = serviceUrl('api', path)
    // console.log(url)
    const request = new Request(
        url,
        requestOptions
    )
    let p = fetch(request)
        .then((response) => {
            return response.json()
        })
    return withTimeout(p)
}


function userAuthType(userAuth) {
    if (userAuth.startsWith('+')) {
        return 'phone'
    } else if (userAuth.includes('@')) {
        return 'email'
    }
    return 'unknown'
}


function Route(path, component) {
    this.path = path
    this.component = component
}

function createMount(elementId, topLevelRoutes) {
    let container = document.getElementById(elementId)
    let idPrefix = elementId + '-'
    return new Mount(container, idPrefix, topLevelRoutes)
}

function Mount(container, idPrefix, topLevelRoutes) {
    const self = this

    self.activeComponent = null

    self.id = (elementId) => {
        return idPrefix + elementId
    }

    self.element = (elementId) => {
        return document.getElementById(self.id(elementId))
    }

    self.render = (component) => {
        self.activeComponent = component
        component.mount = self
        component.id = self.id
        component.element = self.element
        component.render(container)
    }

    // approach inspired by https://bholmes.dev/blog/spas-clientside-routing/
    self.router = () => {
        function findLink(e) {
            let linkElement = null
            while (e) {
                if (container == e) {
                    return linkElement
                }
                if (e.tagName === 'A') {
                    linkElement = e
                }
                e = e.parentElement
            }
            return null
        }
        container.addEventListener('click', (event) => {
            const linkElement = findLink(event.target)
            // a link of same origin with no target (new tab)
            if (
                linkElement &&
                linkElement.origin === location.origin &&
                !linkElement.target
            ) {
                event.preventDefault()
                const url = new URL(linkElement.href)
                let handled = false
                for (const route of topLevelRoutes) {
                    if (url.pathname == route.path) {
                        self.render(route.component)
                        handled = true
                        break
                    }
                }
                if (!handled && self.activeComponent) {
                    self.activeComponent.router(url)
                }
            }
        })
    }
}

// launch the web app
function launchApp() {
    // TODO how to pass JWT?
    // TODO getByJwt()
    window.open(
        serviceUrl('app', '/'),
        // open a new tab
        '_blank'
    )
}
