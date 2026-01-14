
new function() {
    const self = this
    const connectSelf = self

    const clientVersion = '1.0.0-ur'
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    const googleClientId = '338638865390-cg4m0t700mq9073smhn9do81mr640ig1.apps.googleusercontent.com'
    const appleClientId = 'network.ur.service'
    const authJwtRedirect = 'https://ur.io'
    const authLoginUri = "https://api.bringyour.com/connect"

    const defaultClientTimeoutMillis = 15 * 1000
    const timeoutError = Symbol()


    self.connectMount = null

    setTimeout(function(){
        self.connectMount = self.createConnectMount()
        if (!self.connectMount) {
            console.log('[connect]mount not created')
        } else {
            self.finishConnectMount()
        }
    }, 0)

    self.createConnectMount = function() {
        let dialogs = document.querySelectorAll('#dialog-connect')
        if (dialogs.length != 1) {
            return null
        }
        let dialog = dialogs[0]

        let container = dialog.querySelector('#dialog-connect-mount')
        let idPrefix = 'dialog-connect-mount-'
        const topLevelRoutes = [
            new self.Route('/connect', new self.DialogInitial()),
            new self.Route('/connect/create', new self.DialogCreateNetwork()),
        ]
        return new self.Mount(dialog, container, idPrefix, topLevelRoutes)
    }

    self.finishConnectMount = function() {
        self.connectMount.router()

        let params = new URLSearchParams(window.location.search)
        let resetCode = params.get('resetCode')
        let auth = params.get('auth')

        let byJwtData = self.parseByJwt()
        

        if (resetCode) {
            self.connectMount.render(new self.DialogPasswordResetComplete(resetCode))
        } else if (byJwtData) {
            let networkName = byJwtData['networkName']
            self.connectMount.render(new self.DialogComplete(networkName))
        } else {
            let authAutoPrompt = (window.location.pathname == '/')
            self.connectMount.render(new self.DialogInitial(authAutoPrompt))
        }

        if (resetCode) {
            self.showConnectDialog()
        } else if (auth != null) {
            self.showConnectDialog()
        }
    }

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

    self.showConnectDialog = function() {
        if (self.connectMount) {
            // important - avoid creating multiple modal instances with multiple backdrops
            // this is needed because modals can be launched via click target or programatically
            let modal = bootstrap.Modal.getOrCreateInstance(self.connectMount.dialog, {})
            modal.show()
        } else {
            console.log("[connect]dialog not mounted")
        }
    }

    self.getByJwt = function() {
        return localStorage.getItem('byJwt')
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

    self.setByJwt = function(byJwt) {
        localStorage.setItem('byJwt', byJwt)
        self.notifyByJwtChanged()
    }

    self.removeByJwt = function() {
        localStorage.removeItem('byJwt')
        self.notifyByJwtChanged()
    }

    self.escapeHtml = function(html) {
        return html && html.replace(/[<>"]+/g, '')
    }

    self.serviceUrl = function(service, path) {
        // main
        var baseHost
        if (service == 'app') {
            baseHost = 'ur.network'
        } else {
            // FIXME other services have not been migrated yet
            baseHost = 'bringyour.com'
        }
        return `${window.location.protocol}//${service}.${baseHost}${path}`
    }

    self.withTimeout = function(p, millis, exception) {
        var timeout
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

    self.apiRequest = function(method, path, body) {
        let headers = new Headers()
        headers.append('X-Client-Version', clientVersion)

        // add authorization if present
        let byJwt = self.getByJwt()
        if (byJwt != null) {
            headers.append('Authorization', `Bearer ${byJwt}`)
        }

        let requestOptions = {
            method: method,
            headers: headers
        }
        if (body) {
            requestOptions.body = JSON.stringify(body)
        }
        let url = self.serviceUrl('api', path)
        // console.log(url)
        const request = new Request(
            url,
            requestOptions
        )
        let p = fetch(request)
            .then((response) => {
                return response.json()
            })
        return self.withTimeout(p)
    }

    self.isAndroid = function() {
        return navigator.userAgent && /Android/i.test(navigator.userAgent)
    }

    self.isChromeOs = function() {
        return navigator.userAgent && /CrOS/.test(navigator.userAgent)
    }

    self.isApple = function() {
        return navigator.userAgent && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)
    }

    self.Route = function(path, component) {
        this.path = path
        this.component = component
    }

    self.Mount = function(dialog, container, idPrefix, topLevelRoutes) {
        const self = this

        self.dialog = dialog
        self.container = container
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

    self.DialogInitial = function(firstLoad) {
        const self = this

        self.render = (container) => {
            const nonce = crypto.randomUUID()

            connectSelf.renderInitial(container, self.id, nonce)

            if (typeof AppleID !== 'undefined') {
                // connect with apple                
                // note this component doesn't have a proper de-initialization
                // clean up overlapping listeners so that there is only once active mount per document

                // see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple
                // see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple
                AppleID.auth.init({
                    clientId: appleClientId,
                    scope: 'name email',
                    redirectURI: authJwtRedirect,
                    state: 'continue',
                    nonce: nonce,
                    usePopup: true
                })

                if (window.connectAppleIDSignInOnSuccess) {
                    document.removeEventListener('AppleIDSignInOnSuccess', window.connectAppleIDSignInOnSuccess)
                }
                window.connectAppleIDSignInOnSuccess = function(event) {
                    let authJwt = event.detail.authorization.id_token
                    self.submitAuthJwt('apple', authJwt)
                    connectSelf.showConnectDialog()
                }
                document.addEventListener('AppleIDSignInOnSuccess', window.connectAppleIDSignInOnSuccess)

                if (window.connectAppleIDSignInOnFailure) {
                    document.removeEventListener('AppleIDSignInOnFailure', window.connectAppleIDSignInOnFailure)
                }
                window.connectAppleIDSignInOnFailure = function(event) {
                    // do nothing
                    console.log(`[apple]sign in failure: ${event.detail.error}`)
                }
                document.addEventListener('AppleIDSignInOnFailure', window.connectAppleIDSignInOnFailure)
            }

            if (window.google) {
                // connect with google
                // note this replaces the previously initialized mount
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: (response, error) => {
                        if (!error) {
                            let authJwt = response.credential
                            self.submitAuthJwt('google', authJwt)
                            connectSelf.showConnectDialog()
                        } else {
                            console.log(error)
                        }
                    },
                })
                
                window.google.accounts.id.renderButton(self.element('g_id_button'), {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    width: 300
                })
                
                if (firstLoad) {
                    window.google.accounts.id.prompt()
                }
            }

            const loginButtonElement = self.element('login-button')
            const loginFormElement = self.element('login-form')

            loginButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            loginFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!loginButtonElement.disabled) {
                    self.submit()
                }
            })
        }
        self.router = (url) => {
            window.location.assign(url)
        }


        // event handlers

        self.submitAuthJwt = (authJwtType, authJwt) => {
            // console.log(authJwt)

            const loginUserAuthElement = self.element('login-user-auth')
            const loginButtonElement = self.element('login-button')
            const loginSpinnerElement = self.element('login-spinner')

            loginUserAuthElement.disabled = true
            loginButtonElement.disabled = true
            loginSpinnerElement.classList.remove('d-none')

            let requestBody = {
                'auth_jwt_type': authJwtType,
                'auth_jwt': authJwt
            }

            connectSelf.apiRequest('POST', '/auth/login', requestBody)
                .then((responseBody) => {
                    self.handleSubmitAuthJwtResponse(responseBody, authJwtType, authJwt)
                })
                .catch((err) => {
                    self.handleSubmitAuthJwtResponse(null, authJwtType, authJwt)
                })

            // setTimeout(() => {
            //      let responseBody = MOCK_API_auth_login(requestBody)
            //      self.handleSubmitAuthJwtResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitAuthJwtResponse = (responseBody, authJwtType, authJwt) => {
            if (responseBody) {
                if ('network' in responseBody) {
                    let network = responseBody['network']
                    let byJwt = network['by_jwt']

                    connectSelf.setByJwt(byJwt)
                    self.mount.render(new connectSelf.DialogComplete())
                } else if ('auth_allowed' in responseBody) {
                    // and existing network but different login
                    let authAllowed = responseBody['auth_allowed']

                    let userAuth = responseBody['user_auth']
                    if (authAllowed.includes('password') && userAuth) {
                        // just take to password login instead of showing the "please continue with email ..." message
                        self.mount.render(new connectSelf.DialogLoginPassword(userAuth))
                    } else {
                        let message
                        if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                            message = 'Please continue with Apple or Google'
                        } else if (authAllowed.includes('apple')) {
                            message = 'Please continue with Apple'
                        } else if (authAllowed.includes('google')) {
                            message = 'Please continue with Google'
                        } else if (authAllowed.includes('password')) {
                            message = 'Please continue with email or phone number'
                        } else {
                            message = 'Something went wrong. Please try again later.'
                        }
                        let errorElement = self.element('login-error')
                        errorElement.textContent = message
                        errorElement.classList.remove('d-none')

                        const loginUserAuthElement = self.element('login-user-auth')
                        const loginButtonElement = self.element('login-button')
                        const loginSpinnerElement = self.element('login-spinner')

                        loginUserAuthElement.disabled = false
                        loginButtonElement.disabled = false
                        loginSpinnerElement.classList.add('d-none')
                    }
                } else {
                    // a new network
                    let userName = responseBody['user_name']
                    self.mount.render(new connectSelf.DialogCreateNetworkAuthJwt(authJwtType, authJwt, userName))
                }
            }
        }

        self.submit = () => {
            const loginUserAuthElement = self.element('login-user-auth')
            const loginButtonElement = self.element('login-button')
            const loginSpinnerElement = self.element('login-spinner')

            loginUserAuthElement.disabled = true
            loginButtonElement.disabled = true
            loginSpinnerElement.classList.remove('d-none')

            let userAuth = loginUserAuthElement.value
            let requestBody = {
                'user_auth': userAuth
            }

            connectSelf.apiRequest('POST', '/auth/login', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_login(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const loginUserAuthElement = self.element('login-user-auth')
            const loginButtonElement = self.element('login-button')
            const loginSpinnerElement = self.element('login-spinner')

            loginUserAuthElement.disabled = false
            loginButtonElement.disabled = false
            loginSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']
                    let suggestedUserAuth = error['suggested_user_auth'] || loginUserAuthElement.value
                    let message = error['message']

                    let errorElement = self.element('login-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')

                    loginUserAuthElement.value = suggestedUserAuth

                    loginUserAuthElement.disabled = false
                    loginButtonElement.disabled = false
                    loginSpinnerElement.classList.add('d-none')
                } else if ('auth_allowed' in responseBody) {
                    // an existing network
                    let userAuth = responseBody['user_auth']
                    let authAllowed = responseBody['auth_allowed']
                    if (authAllowed.includes('password')) {
                        self.mount.render(new connectSelf.DialogLoginPassword(userAuth))
                    } else {
                        let message
                        if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                            message = 'Please continue with Apple or Google'
                        } else if (authAllowed.includes('apple')) {
                            message = 'Please continue with Apple'
                        } else if (authAllowed.includes('google')) {
                            message = 'Please continue with Google'
                        } else {
                            message = 'Something went wrong. Please try again later.'
                        }
                        let errorElement = self.element('login-error')
                        errorElement.textContent = message
                        errorElement.classList.remove('d-none')

                        loginUserAuthElement.disabled = false
                        loginButtonElement.disabled = false
                        loginSpinnerElement.classList.add('d-none')
                    }
                } else {
                    // a new network
                    let userAuth = responseBody['user_auth']
                    self.mount.render(new connectSelf.DialogCreateNetwork(userAuth))
                }
            }
        }
    }


    self.DialogLoginPassword = function(userAuth) {
        const self = this

        self.render = (container) => {
            connectSelf.renderLoginPassword(container, self.id, userAuth)

            const loginButtonElement = self.element('login-button')
            const loginFormElement = self.element('login-form')
            const loginPasswordElement = self.element('login-password')

            loginButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            loginFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!loginButtonElement.disabled) {
                    self.submit()
                }
            })

            loginPasswordElement.focus()
        }
        self.router = (url) => {
            if ('/connect/password-reset' == url.pathname) {
                self.mount.render(new connectSelf.DialogPasswordReset(userAuth))
            }
        }


        // event handlers

        self.submit = () => {
            const loginPasswordElement = self.element('login-password')
            const loginButtonElement = self.element('login-button')
            const loginSpinnerElement = self.element('login-spinner')

            loginPasswordElement.disabled = true
            loginButtonElement.disabled = true
            loginSpinnerElement.classList.remove('d-none')

            let password = loginPasswordElement.value
            let requestBody = {
                'user_auth': userAuth,
                'password': password
            }

            connectSelf.apiRequest('POST', '/auth/login-with-password', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_login_password(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const loginPasswordElement = self.element('login-password')
            const loginButtonElement = self.element('login-button')
            const loginSpinnerElement = self.element('login-spinner')

            loginPasswordElement.disabled = false
            loginButtonElement.disabled = false
            loginSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']
                    let message = error['message']

                    let errorElement = self.element('login-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')

                    loginPasswordElement.disabled = false
                    loginButtonElement.disabled = false
                    loginSpinnerElement.classList.add('d-none')
                } else if ('verification_required' in responseBody) {
                    let verificationRequired = responseBody['verification_required']
                    let verificationUserAuth = verificationRequired['user_auth']

                    self.mount.render(new connectSelf.DialogCreateNetworkVerify(verificationUserAuth))
                } else if ('network' in responseBody) {
                    let network = responseBody['network']
                    let byJwt = network['by_jwt']

                    connectSelf.setByJwt(byJwt)
                    self.mount.render(new connectSelf.DialogComplete())
                } else {
                    let message = 'Something went wrong. Please try again later.'

                    let errorElement = self.element('login-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')

                    loginUserAuthElement.disabled = false
                    loginButtonElement.disabled = false
                    loginSpinnerElement.classList.add('d-none')
                }
            }
        }
    }



    self.DialogPasswordReset = function(userAuth) {
        const self = this

        self.render = (container) => {
            connectSelf.renderPasswordReset(container, self.id, userAuth)

            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetFormElement = self.element('password-reset-form')
            const passwordResetUserAuthElement = self.element('password-reset-user-auth')

            passwordResetButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            passwordResetFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!passwordResetButtonElement.disabled) {
                    self.submit()
                }
            })

            passwordResetUserAuthElement.focus()
        }
        self.router = (url) => {}


        // event handlers

        self.submit = () => {
            const passwordResetUserAuthElement = self.element('password-reset-user-auth')
            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetSpinnerElement = self.element('password-reset-spinner')

            passwordResetUserAuthElement.disabled = true
            passwordResetButtonElement.disabled = true
            passwordResetSpinnerElement.classList.remove('d-none')

            let userAuth = passwordResetUserAuthElement.value
            let requestBody = {
                'user_auth': userAuth
            }

            connectSelf.apiRequest('POST', '/auth/password-reset', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_password_reset(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)

        }
        self.handleSubmitResponse = (responseBody) => {
            const passwordResetUserAuthElement = self.element('password-reset-user-auth')
            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetSpinnerElement = self.element('password-reset-spinner')

            passwordResetUserAuthElement.disabled = false
            passwordResetButtonElement.disabled = false
            passwordResetSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']
                    let message = error['message']

                    let errorElement = self.element('password-reset-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')

                    passwordResetUserAuthElement.disabled = false
                    passwordResetButtonElement.disabled = false
                    passwordResetSpinnerElement.classList.add('d-none')
                } else if ('user_auth' in responseBody) {
                    let responseUserAuth = responseBody['user_auth']

                    self.mount.render(new connectSelf.DialogPasswordResetAfterSend(responseUserAuth))
                } else {
                    let message = 'Something went wrong. Please try again later.'

                    let errorElement = self.element('password-reset-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')

                    passwordResetUserAuthElement.disabled = false
                    passwordResetButtonElement.disabled = false
                    passwordResetSpinnerElement.classList.add('d-none')
                }
            }
        }
    }


    self.DialogPasswordResetAfterSend = function(userAuth) {
        const self = this

        self.render = (container) => {
            connectSelf.renderPasswordResetAfterSend(container, self.id, userAuth)
        }
        self.router = (url) => {
            if (url.pathname == '/connect/password-reset/resend') {
                self.resend()
            }
        }


        // event handlers

        self.resend = () => {
            let passwordResetResendLinkElement = self.element('password-reset-resend-link')
            let passwordResetResendSpinnerElement = self.element('password-reset-resend-spinner')

            passwordResetResendLinkElement.classList.add('d-none')
            passwordResetResendSpinnerElement.classList.remove('d-none')

            let requestBody = {
                'user_auth': userAuth
            }

            connectSelf.apiRequest('POST', '/auth/password-reset', requestBody)
                .then((responseBody) => {
                    self.handleResendResponse(responseBody)
                })
                .catch((err) => {
                    self.handleResendResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_password_reset(requestBody)
            //     self.handleResendResponse(responseBody)
            // }, 1000)
        }
        self.handleResendResponse = (responseBody) => {
            let passwordResetResendLinkElement = self.element('password-reset-resend-link')
            let passwordResetResendSpinnerElement = self.element('password-reset-resend-spinner')
            let passwordResetResendSentElement = self.element('password-reset-resend-sent')

            passwordResetResendLinkElement.classList.add('d-none')
            passwordResetResendSpinnerElement.classList.add('d-none')
            passwordResetResendSentElement.classList.remove('d-none')

            setTimeout(() => {
                passwordResetResendLinkElement.classList.remove('d-none')
                passwordResetResendSentElement.classList.add('d-none')
            }, 10000)
        }
    }


    self.DialogPasswordResetComplete = function(resetCode) {
        const self = this

        self.render = (container) => {
            connectSelf.renderPasswordResetComplete(container, self.id, resetCode)

            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetPasswordElement = self.element('password-reset-password')
            const passwordResetPasswordConfirmElement = self.element('password-reset-password-confirm')

            passwordResetPasswordElement.addEventListener('input', (event) => {
                self.updateButton()
            })

            passwordResetPasswordConfirmElement.addEventListener('input', (event) => {
                self.updateButton()
            })

            passwordResetButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            passwordResetButtonElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!passwordResetButtonElement.disabled) {
                    self.submit()
                }
            })

            self.updateButton()
        }
        self.router = (url) => {
            if ('/connect/password-reset' == url.pathname) {
                self.mount.render(new connectSelf.DialogPasswordReset())
            }
        }


        // event handlers

        self.updateButton = () => {
            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetPasswordElement = self.element('password-reset-password')
            const passwordResetPasswordConfirmElement = self.element('password-reset-password-confirm')

            let password = passwordResetPasswordElement.value
            let passwordConfirm = passwordResetPasswordConfirmElement.value

            let enabled = password && password == passwordConfirm

            passwordResetButtonElement.disabled = !enabled
        }

        self.submit = () => {
            const passwordResetPasswordElement = self.element('password-reset-password')
            const passwordResetPasswordConfirmElement = self.element('password-reset-password-confirm')
            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetSpinnerElement = self.element('password-reset-spinner')

            passwordResetPasswordElement.disabled = true
            passwordResetPasswordConfirmElement.disabled = true
            passwordResetButtonElement.disabled = true
            passwordResetSpinnerElement.classList.remove('d-none')

            let password = passwordResetPasswordElement.value
            let requestBody = {
                'reset_code': resetCode,
                'password': password
            }

            connectSelf.apiRequest('POST', '/auth/password-set', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_password_set(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)

        }
        self.handleSubmitResponse = (responseBody) => {
            const passwordResetPasswordElement = self.element('password-reset-password')
            const passwordResetPasswordConfirmElement = self.element('password-reset-password-confirm')
            const passwordResetButtonElement = self.element('password-reset-button')
            const passwordResetSpinnerElement = self.element('password-reset-spinner')

            passwordResetPasswordElement.disabled = false
            passwordResetPasswordConfirmElement.disabled = false
            passwordResetButtonElement.disabled = false
            passwordResetSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']

                    if ('reset_code_error' in error) {
                        let errorElement = self.element('password-reset-error')
                        errorElement.innerHTML = 'Reset code expired. <a href="/connect/password-reset">Get a new code</a>.'
                        errorElement.classList.remove('d-none')
                    } else {
                        let message = error['message']

                        let errorElement = self.element('password-reset-error')
                        errorElement.textContent = message
                        errorElement.classList.remove('d-none')
                    }

                    passwordResetPasswordElement.disabled = false
                    passwordResetPasswordConfirmElement.disabled = false
                    passwordResetButtonElement.disabled = false
                    passwordResetSpinnerElement.classList.add('d-none')
                } else {
                    self.mount.render(new connectSelf.DialogInitial(false))
                }
            } else {
                let message = 'Something went wrong. Please try again later.'

                let errorElement = self.element('password-reset-error')
                errorElement.textContent = message
                errorElement.classList.remove('d-none')

                passwordResetPasswordElement.disabled = false
                passwordResetPasswordConfirmElement.disabled = false
                passwordResetButtonElement.disabled = false
                passwordResetSpinnerElement.classList.add('d-none')
            }
        }
    }


    self.NetworkNameValidator = function(
        createUserNameElement,
        createNetworkNameElement,
        createNetworkNameErrorElement,
        createNetworkNameAvailableElement,
        createNetworkNameSpinnerElement,
        callback
    ) {
        const self = this

        self.networkEdited = false
        self.validatedNetworkName = null
        self.validateTimeout = null
        self.validateNetworkNameInFlight = null

        self.userNameOk = false
        self.networkNameOk = false


        function normalizeNetworkName(networkName) {
            return networkName.toLowerCase().replace(/[\s\-]+/gi, '')
        }


        createUserNameElement.addEventListener('input', (event) => {
            self.updateUserName()
        })


        createNetworkNameElement.addEventListener('input', (event) => {
            if (createNetworkNameElement.value == '') {
                self.networkEdited = false
            } else if (!self.networkEdited && document.activeElement == createNetworkNameElement) {
                self.networkEdited = true
            }

            let normalNetworkName = normalizeNetworkName(createNetworkNameElement.value)
            if (normalNetworkName != createNetworkNameElement.value) {
                let selectionStart = createNetworkNameElement.selectionStart
                let selectionEnd = createNetworkNameElement.selectionEnd
                createNetworkNameElement.value = normalNetworkName
                createNetworkNameElement.setSelectionRange(selectionStart, selectionEnd)
            }

            let networkName = createNetworkNameElement.value
            self.debounceValidateNetworkName(networkName)
        })


        // event handlers

        self.updateUserName = () => {
            // don't tie the network name to the user name
            // the network name is public
            // if (!self.networkEdited) {
            //     let userName = createUserNameElement.value

            //     let networkName = normalizeNetworkName(userName)
            //     createNetworkNameElement.value = networkName
            //     self.debounceValidateNetworkName(networkName)
            // }

            self.userNameOk = 0 < createUserNameElement.value.length
            callback()
        }

        self.debounceValidateNetworkName = (networkName) => {
            if (self.validateTimeout) {
                clearTimeout(self.validateTimeout)
                self.validateTimeout = null
            }
            self.validateTimeout = setTimeout(() => {
                self.validateNetworkName(networkName),
                    500
            })
        }

        self.validateNetworkName = (networkName) => {
            self.validatedNetworkName = networkName

            self.networkNameOk = false
            callback()

            let validateError = null
            if (networkName.length < 6) {
                validateError = 'Must be at least 6 characters. Make it longer.'
            } else if (normalizeNetworkName(networkName) != networkName) {
                validateError = 'No dashes or spaces'
            }
            if (validateError) {
                createNetworkNameErrorElement.textContent = validateError
                createNetworkNameErrorElement.classList.remove('d-none')
                createNetworkNameAvailableElement.classList.add('d-none')
                createNetworkNameSpinnerElement.classList.add('d-none')

                self.validateNetworkNameInFlight = null
            } else {
                self.asyncValidateNetworkName(networkName)
            }
        }
        self.asyncValidateNetworkName = (networkName) => {
            if (!self.validateNetworkNameInFlight) {
                self.validateNetworkNameInFlight = networkName

                createNetworkNameSpinnerElement.classList.remove('d-none')

                function apiRequestCallback(responseBody) {
                    if (networkName == self.validateNetworkNameInFlight) {
                        self.validateNetworkNameInFlight = null
                        if (networkName == self.validatedNetworkName) {
                            self.handleValidateNetworkNameResponse(responseBody)
                        } else {
                            self.asyncValidateNetworkName(self.validatedNetworkName)
                        }
                    }
                }

                let requestBody = {
                    'network_name': networkName
                }

                connectSelf.apiRequest('POST', '/auth/network-check', requestBody)
                    .then((responseBody) => {
                        apiRequestCallback(responseBody)
                    })
                    .catch((err) => {
                        apiRequestCallback(null)
                    })
            }
        }
        self.handleValidateNetworkNameResponse = (responseBody) => {
            // console.log(responseBody)
            let validateError
            if (!responseBody) {
                validateError = 'Something went wrong. Please try again later.'
            }
            else if (!responseBody['available']) {
                validateError = 'Not available. Must be at least 3 characters different than an existing network. Make it unique or longer.'
            }

            if (validateError) {
                createNetworkNameErrorElement.textContent = validateError
                createNetworkNameErrorElement.classList.remove('d-none')
                createNetworkNameAvailableElement.classList.add('d-none')
            } else {
                createNetworkNameErrorElement.classList.add('d-none')
                createNetworkNameAvailableElement.classList.remove('d-none')

                self.networkNameOk = true
                callback()
            }
            createNetworkNameSpinnerElement.classList.add('d-none')
        }
    }



    self.DialogCreateNetworkAuthJwt = function(authJwtType, authJwt, userName) {
        const self = this

        self.networkNameValidator = null

        self.termsOk = false

        self.render = (container) => {
            connectSelf.renderCreateNetworkAuthJwt(container, self.id, authJwtType, authJwt, userName)

            const createButtonElement = self.element('create-button')
            const createFormElement = self.element('create-form')
            const createUserNameElement = self.element('create-user-name')
            const createNetworkNameElement = self.element('create-network-name')
            const createNetworkNameSpinnerElement = self.element('create-network-name-spinner')
            const createNetworkNameErrorElement = self.element('create-network-name-error')
            const createNetworkNameAvailableElement = self.element('create-network-name-available')
            const createAgreeTermsElement = self.element('create-agree-terms')


            self.networkNameValidator = new connectSelf.NetworkNameValidator(
                createUserNameElement,
                createNetworkNameElement,
                createNetworkNameErrorElement,
                createNetworkNameAvailableElement,
                createNetworkNameSpinnerElement,
                self.updateButton
            )


            createButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            createFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!createButtonElement.disabled) {
                    self.submit()
                }
            })

            createAgreeTermsElement.addEventListener('change', (event) => {
                self.termsOk = createAgreeTermsElement.checked
                self.updateButton()
            })

            self.updateButton()
            if (createUserNameElement.value) {
                self.networkNameValidator.updateUserName()
            }
            createUserNameElement.focus()
        }
        self.router = (url) => {}


        // event handlers

        self.submit = () => {
            const createButtonElement = self.element('create-button')
            const createSpinnerElement = self.element('create-spinner')
            const createUserNameElement = self.element('create-user-name')
            const createNetworkNameElement = self.element('create-network-name')
            const createAgreeTermsElement = self.element('create-agree-terms')

            createUserNameElement.disabled = true
            createNetworkNameElement.disabled = true
            createAgreeTermsElement.disabled = true
            createButtonElement.disabled = true
            createSpinnerElement.classList.remove('d-none')

            let userName = createUserNameElement.value
            let networkName = createNetworkNameElement.value
            let terms = createAgreeTermsElement.checked
            let requestBody = {
                'auth_jwt_type': authJwtType,
                'auth_jwt': authJwt,
                'user_name': userName,
                'network_name': networkName,
                'terms': terms,
            }

            connectSelf.apiRequest('POST', '/auth/network-create', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_network_create(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const createButtonElement = self.element('create-button')
            const createSpinnerElement = self.element('create-spinner')
            const createUserNameElement = self.element('create-user-name')
            const createNetworkNameElement = self.element('create-network-name')
            const createAgreeTermsElement = self.element('create-agree-terms')

            const createErrorElement = self.element('create-error')
            const createNetworkNameErrorElement = self.element('create-network-name-error')

            createUserNameElement.disabled = false
            createNetworkNameElement.disabled = false
            createAgreeTermsElement.disabled = false
            createButtonElement.disabled = false
            createSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']

                    createUserNameElement.disabled = false
                    createNetworkNameElement.disabled = false
                    createAgreeTermsElement.disabled = false
                    createButtonElement.disabled = false
                    createSpinnerElement.classList.add('d-none')

                    if (error['user_auth_conflict']) {
                        createUserAuthErrorElement.innerHTML = 'This email or phone number is already taken. <a href="/connect">Sign in</a>.'
                        createUserAuthErrorElement.classList.remove('d-none')
                    } else if ('message' in error) {
                        createErrorElement.textContent = error['message']
                        createErrorElement.classList.remove('d-none')
                    } else {
                        createErrorElement.classList.add('d-none')
                    }

                    if ('network_name_message' in error) {
                        createNetworkNameErrorElement.textContent = error['network_name_message']
                        createNetworkNameErrorElement.classList.remove('d-none')
                    } else {
                        createNetworkNameErrorElement.classList.add('d-none')
                    }

                } else if ('verification_required' in responseBody) {
                    let verificationRequired = responseBody['verification_required']
                    let verificationUserAuth = verificationRequired['user_auth']

                    self.mount.render(new connectSelf.DialogCreateNetworkVerify(verificationUserAuth))
                } else if ('network' in responseBody) {
                    let network = responseBody['network']
                    let byJwt = network['by_jwt']

                    connectSelf.setByJwt(byJwt)
                    self.mount.render(new connectSelf.DialogComplete())
                } else {
                    let message = 'Something went wrong. Please try again later.'

                    createErrorElement.textContent = message
                    createErrorElement.classList.remove('d-none')

                    createNetworkNameErrorElement.classList.add('d-none')

                    createUserNameElement.disabled = false
                    createNetworkNameElement.disabled = false
                    createAgreeTermsElement.disabled = false
                    createButtonElement.disabled = false
                    createSpinnerElement.classList.add('d-none')
                }
            }
        }

        self.updateButton = () => {
            const createNetworkButton = self.element('create-button')

            createNetworkButton.disabled = !(
                self.networkNameValidator.networkNameOk &&
                self.networkNameValidator.userNameOk &&
                self.termsOk
            )
        }
    }


    self.DialogCreateNetwork = function(userAuth) {
        const self = this

        self.networkNameValidator = null

        self.userAuthOk = false
        self.passwordOk = false
        self.termsOk = false

        function validatePasswordEntropy(password) {
            return 12 <= password.length
        }

        self.render = (container) => {
            connectSelf.renderCreateNetwork(container, self.id, userAuth)

            const createButtonElement = self.element('create-button')
            const createFormElement = self.element('create-form')
            const createUserNameElement = self.element('create-user-name')
            const createUserAuthElement = self.element('create-user-auth')
            const createPasswordElement = self.element('create-password')
            const createPasswordErrorElement = self.element('create-password-error')
            const createNetworkNameElement = self.element('create-network-name')
            const createNetworkNameSpinnerElement = self.element('create-network-name-spinner')
            const createNetworkNameErrorElement = self.element('create-network-name-error')
            const createNetworkNameAvailableElement = self.element('create-network-name-available')
            const createAgreeTermsElement = self.element('create-agree-terms')


            self.networkNameValidator = new connectSelf.NetworkNameValidator(
                createUserNameElement,
                createNetworkNameElement,
                createNetworkNameErrorElement,
                createNetworkNameAvailableElement,
                createNetworkNameSpinnerElement,
                self.updateButton
            )


            createButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            createFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!createButtonElement.disabled) {
                    self.submit()
                }
            })

            createUserAuthElement.addEventListener('input', (event) => {
                self.updateUserAuth()
            })

            createPasswordElement.addEventListener('input', (event) => {
                let password = createPasswordElement.value

                if (validatePasswordEntropy(password)) {
                    createPasswordErrorElement.classList.add('d-none')

                    self.passwordOk = true
                    self.updateButton()
                } else {
                    createPasswordErrorElement.textContent = 'Password must be at least 65 bits of entropy (at least 12 characters, mixed case, mixed alphanumeric and non-alphanumeric).'
                    createPasswordErrorElement.classList.remove('d-none')

                    self.passwordOk = false
                    self.updateButton()
                }
            })

            createAgreeTermsElement.addEventListener('change', (event) => {
                self.termsOk = createAgreeTermsElement.checked
                self.updateButton()
            })

            self.updateButton()
            if (createUserNameElement.value) {
                self.networkNameValidator.updateUserName()
            }
            if (createUserAuthElement.value) {
                self.updateUserAuth()
            }
            createUserNameElement.focus()
        }
        self.router = (url) => {
            if ('/connect/password-reset' == url.pathname) {
                const userAuth = self.element('create-user-auth').value
                self.mount.render(new connectSelf.DialogPasswordReset(userAuth))
            }
        }


        // event handlers

        self.updateUserAuth = () => {
            const createUserAuthElement = self.element('create-user-auth')
            self.userAuthOk = 0 < createUserAuthElement.value.length
            self.updateButton()
        }

        self.submit = () => {
            const createButtonElement = self.element('create-button')
            const createSpinnerElement = self.element('create-spinner')
            const createUserNameElement = self.element('create-user-name')
            const createUserAuthElement = self.element('create-user-auth')
            const createPasswordElement = self.element('create-password')
            const createNetworkNameElement = self.element('create-network-name')
            const createAgreeTermsElement = self.element('create-agree-terms')
            const bonusReferralElement = self.element('create-bonus-referral')
            const balanceCodeElement = self.element('create-balance-code')

            createUserNameElement.disabled = true
            createUserAuthElement.disabled = true
            createPasswordElement.disabled = true
            createNetworkNameElement.disabled = true
            createAgreeTermsElement.disabled = true
            createButtonElement.disabled = true
            bonusReferralElement.disabled = true
            balanceCodeElement.disabled = true
            createSpinnerElement.classList.remove('d-none')

            let userName = createUserNameElement.value
            let userAuth = createUserAuthElement.value
            let password = createPasswordElement.value
            let networkName = createNetworkNameElement.value
            let terms = createAgreeTermsElement.checked
            let bonusReferral = bonusReferralElement.value
            let balanceCode = balanceCodeElement.value
            let requestBody = {
                'user_name': userName,
                'user_auth': userAuth,
                'password': password,
                'network_name': networkName,
                'terms': terms,
                'referral_code': bonusReferral,
                'balance_code': balanceCode,
            }

            connectSelf.apiRequest('POST', '/auth/network-create', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_network_create(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const createButtonElement = self.element('create-button')
            const createSpinnerElement = self.element('create-spinner')
            const createUserNameElement = self.element('create-user-name')
            const createUserAuthElement = self.element('create-user-auth')
            const createPasswordElement = self.element('create-password')
            const createNetworkNameElement = self.element('create-network-name')
            const createAgreeTermsElement = self.element('create-agree-terms')
            const bonusReferralElement = self.element('create-bonus-referral')
            const balanceCodeElement = self.element('create-balance-code')

            const createErrorElement = self.element('create-error')
            const createUserAuthErrorElement = self.element('create-user-auth-error')
            const createPasswordErrorElement = self.element('create-password-error')
            const createNetworkNameErrorElement = self.element('create-network-name-error')

            createUserNameElement.disabled = false
            createUserAuthElement.disabled = false
            createPasswordElement.disabled = false
            createNetworkNameElement.disabled = false
            createAgreeTermsElement.disabled = false
            createButtonElement.disabled = false
            bonusReferralElement.disabled = false
            balanceCodeElement.disabled = false
            createSpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']

                    createUserNameElement.disabled = false
                    createUserAuthElement.disabled = false
                    createPasswordElement.disabled = false
                    createNetworkNameElement.disabled = false
                    createAgreeTermsElement.disabled = false
                    createButtonElement.disabled = false
                    createSpinnerElement.classList.add('d-none')

                    if ('message' in error) {
                        createErrorElement.textContent = error['message']
                        createErrorElement.classList.remove('d-none')
                    } else {
                        createErrorElement.classList.add('d-none')
                    }

                    if (error['user_auth_conflict']) {
                        createUserAuthErrorElement.innerHTML = 'This email or phone number is already taken. <a href="/connect">Sign in</a> or <a href="/connect/password-reset">reset your password</a>.'
                        createUserAuthErrorElement.classList.remove('d-none')
                    } else if ('user_auth_message' in error) {
                        createUserAuthErrorElement.textContent = error['user_auth_message']
                        createUserAuthErrorElement.classList.remove('d-none')
                    } else {
                        createUserAuthErrorElement.classList.add('d-none')
                    }
                    if ('password_message' in error) {
                        createPasswordErrorElement.textContent = error['password_message']
                        createPasswordErrorElement.classList.remove('d-none')
                    } else {
                        createPasswordErrorElement.classList.add('d-none')
                    }
                    if ('network_name_message' in error) {
                        createNetworkNameErrorElement.textContent = error['network_name_message']
                        createNetworkNameErrorElement.classList.remove('d-none')
                    } else {
                        createNetworkNameErrorElement.classList.add('d-none')
                    }

                } else if ('verification_required' in responseBody) {
                    let verificationRequired = responseBody['verification_required']
                    let verificationUserAuth = verificationRequired['user_auth']

                    self.mount.render(new connectSelf.DialogCreateNetworkVerify(verificationUserAuth))
                } else if ('network' in responseBody) {
                    let network = responseBody['network']
                    let byJwt = network['by_jwt']

                    connectSelf.setByJwt(byJwt)
                    self.mount.render(new connectSelf.DialogComplete())
                } else {
                    let message = 'Something went wrong. Please try again later.'

                    createErrorElement.textContent = message
                    createErrorElement.classList.remove('d-none')

                    createUserAuthErrorElement.classList.add('d-none')
                    createPasswordErrorElement.classList.add('d-none')
                    createNetworkNameErrorElement.classList.add('d-none')

                    createUserNameElement.disabled = false
                    createUserAuthElement.disabled = false
                    createPasswordElement.disabled = false
                    createNetworkNameElement.disabled = false
                    createAgreeTermsElement.disabled = false
                    createButtonElement.disabled = false
                    createSpinnerElement.classList.add('d-none')
                }
            }
        }

        self.updateButton = () => {
            const createNetworkButton = self.element('create-button')

            createNetworkButton.disabled = !(
                self.networkNameValidator.networkNameOk &&
                self.networkNameValidator.userNameOk &&
                self.userAuthOk &&
                self.passwordOk &&
                self.termsOk
            )
        }
    }


    self.DialogCreateNetworkVerify = function(userAuth) {
        const self = this

        function normalizeVerifyCode(networkName) {
            return networkName.replace(/[^\da-z]+/gi, '')
        }

        self.render = (container) => {
            connectSelf.renderCreateNetworkVerify(container, self.id, userAuth)

            const verifyButtonElement = self.element('verify-button')
            const verifyFormElement = self.element('verify-form')
            let verifyCodeElement = self.element('verify-code')

            verifyButtonElement.addEventListener('click', (event) => {
                self.submit()
            })

            verifyFormElement.addEventListener('submit', (event) => {
                event.preventDefault()
                if (!verifyButtonElement.disabled) {
                    self.submit()
                }
            })

            verifyCodeElement.addEventListener('input', (event) => {
                let normalVerifyCode = normalizeVerifyCode(verifyCodeElement.value)
                if (normalVerifyCode != verifyCodeElement.value) {
                    let selectionStart = verifyCodeElement.selectionStart
                    let selectionEnd = verifyCodeElement.selectionEnd
                    verifyCodeElement.value = normalVerifyCode
                    verifyCodeElement.setSelectionRange(selectionStart, selectionEnd)
                }
            })

            verifyCodeElement.focus()
        }
        self.router = (url) => {
            if (url.pathname == '/connect/verify/resend') {
                self.resend()
            }
        }


        // event handlers

        self.submit = () => {
            const verifyCodeElement = self.element('verify-code')
            const verifyButtonElement = self.element('verify-button')
            const verifySpinnerElement = self.element('verify-spinner')

            verifyCodeElement.disabled = true
            verifyButtonElement.disabled = true
            verifySpinnerElement.classList.remove('d-none')

            let verifyCode = normalizeVerifyCode(verifyCodeElement.value)
            let requestBody = {
                'user_auth': userAuth,
                'verify_code': verifyCode
            }

            connectSelf.apiRequest('POST', '/auth/verify', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_verify(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const verifyCodeElement = self.element('verify-code')
            const verifyButtonElement = self.element('verify-button')
            const verifySpinnerElement = self.element('verify-spinner')

            verifyCodeElement.disabled = false
            verifyButtonElement.disabled = false
            verifySpinnerElement.classList.add('d-none')

            if (responseBody) {
                if ('error' in responseBody) {
                    let error = responseBody['error']
                    let message = error['message']

                    const verifyErrorElement = self.element('verify-error')

                    verifyErrorElement.textContent = message
                    verifyErrorElement.classList.remove('d-none')
                } else if ('network' in responseBody) {
                    let network = responseBody['network']
                    let byJwt = network['by_jwt']

                    connectSelf.setByJwt(byJwt)
                    self.mount.render(new connectSelf.DialogComplete())
                } else {
                    let message = 'Something went wrong. Please try again later.'

                    const verifyErrorElement = self.element('verify-error')

                    verifyErrorElement.textContent = message
                    verifyErrorElement.classList.remove('d-none')
                }
            }
        }

        self.resend = () => {
            let verifyResendLinkElement = self.element('verify-resend-link')
            let verifyResendSpinnerElement = self.element('verify-resend-spinner')

            verifyResendLinkElement.classList.add('d-none')
            verifyResendSpinnerElement.classList.remove('d-none')

            let requestBody = {
                'user_auth': userAuth
            }

            connectSelf.apiRequest('POST', '/auth/verify-send', requestBody)
                .then((responseBody) => {
                    self.handleResendResponse(responseBody)
                })
                .catch((err) => {
                    self.handleResendResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_auth_verify_send(requestBody)
            //     self.handleResendResponse(responseBody)
            // }, 1000)
        }
        self.handleResendResponse = (responseBody) => {
            let verifyResendLinkElement = self.element('verify-resend-link')
            let verifyResendSpinnerElement = self.element('verify-resend-spinner')
            let verifyResendSentElement = self.element('verify-resend-sent')

            verifyResendLinkElement.classList.add('d-none')
            verifyResendSpinnerElement.classList.add('d-none')
            verifyResendSentElement.classList.remove('d-none')

            setTimeout(() => {
                verifyResendLinkElement.classList.remove('d-none')
                verifyResendSentElement.classList.add('d-none')
            }, 10000)
        }
    }



    // local storage:
    // byFeedback
    // byProductUpdates
    // product updates checkbox change
    // feedback form submit
    self.DialogComplete = function() {
        const self = this

        self.render = (container) => {
            byJwtData = connectSelf.parseByJwt()
            let networkName = byJwtData['network_name']

            connectSelf.renderComplete(container, self.id, networkName)

            const enterButtonElement = self.element('enter-button')
            const copyAuthCodeButtonElement = self.element('copy-auth-code-button')
            const copyAuthCodeManualCodeCopyButtonElement = self.element('copy-auth-code-manual-code-copy')

            enterButtonElement.addEventListener('click', (event) => {
                self.enter()
            })

            copyAuthCodeButtonElement.addEventListener('click', (event) => {
                self.copyAuthCode()
            })

            copyAuthCodeManualCodeCopyButtonElement.addEventListener('click', (event) => {
                self.copyAuthCodeManual()
            })

            const launchAppButtonElement = self.element('launch-app-button')
            const preferencesProductUpdateElement = self.element('preferences-product-updates')
            // const feedbackButtonElement = self.element('feedback-button')
            // const feedbackFormElement = self.element('feedback-form')

            if (launchAppButtonElement) {
                launchAppButtonElement.addEventListener('click', (event) => {
                    let windowRef = null
                    if (window.safari !== undefined) {
                        // desktop Safari
                        // this is because desktop Safari does not allow async from click to open new tab
                        // see https://stackoverflow.com/questions/20696041/window-openurl-blank-not-working-on-imac-safari
                        // see https://stackoverflow.com/questions/7944460/detect-safari-browser
                        windowRef = window.open('about:blank', '_blank')
                    }
                    self.launchApp('/', windowRef)
                })
            }

            preferencesProductUpdateElement.addEventListener('change', (event) => {
                self.submitPreferences()
            })

            // feedbackButtonElement.addEventListener('click', (event) => {
            //     self.submit()
            // })

            // feedbackFormElement.addEventListener('submit', (event) => {
            //     event.preventDefault()
            //     if (!feedbackButtonElement.disabled) {
            //         self.submit()
            //     }
            // })

            // if (connectSelf.isFlagAppPreview()) {
            //     self.authRedirect()
            // }
        }
        self.router = (url) => {
            if (url.pathname == '/connect/signout') {
                connectSelf.removeByJwt()
                self.mount.render(new connectSelf.DialogInitial(false))
            }
        }


        self.authRedirect = () => {
            let params = new URLSearchParams(window.location.search)
            let redirectUriAfterAuth = params.get('redirect-uri-after-auth')
            if (params.get('auth') != null && redirectUriAfterAuth) {
                // `redirect-after-auth` must be an absolute url that starts with the app route
                let appPrefix = connectSelf.serviceUrl('app', '')
                if (redirectUriAfterAuth.startsWith(appPrefix)) {
                    // remove the redirect parameter from the history to allow back
                    window.history.replaceState({}, document.title, window.location.pathname)
                    let appRoute = redirectUriAfterAuth.substring(appPrefix.length)
                    self.launchApp(appRoute)
                }
            }
        }


        // event handlers

        self.enter = () => {
            const enterButtonElement = self.element('enter-button')
            const enterSpinnerElement = self.element('enter-spinner')
            const enterErrorElement = self.element('enter-error')
            
            enterButtonElement.disabled = true
            enterSpinnerElement.classList.remove('d-none')
            enterErrorElement.classList.add('d-none')

            let requestBody = {
                'uses': 1,
                'duration_minutes': 1.0
            }

            connectSelf.apiRequest('POST', '/auth/code-create', requestBody)
                .then((responseBody) => {
                    self.handleEnterResponse(responseBody)
                })
                .catch((err) => {
                    self.handleEnterResponse(null)
                })
        }

        self.handleEnterResponse = (responseBody) => {
            const enterButtonElement = self.element('enter-button')
            const enterSpinnerElement = self.element('enter-spinner')
            const enterErrorElement = self.element('enter-error')
            
            enterButtonElement.disabled = false
            enterSpinnerElement.classList.add('d-none')

            if (!responseBody) {
                enterErrorElement.textContent = 'Something unexpected happened.'
                enterErrorElement.classList.remove('d-none')
            } else if ('auth_code' in responseBody) {
                let url = `/c?auth_code=${responseBody['auth_code']}`

                // FIXME put the protocol detection and fallback logic in this handler
                // FIXME e.g. attempt to use protocol, then after 1s forward to store link as below

                var storeLink
                if (connectSelf.isAndroid() || connectSelf.isChromeOs()) {
                    let referrer = encodeURIComponent(url)
                    storeLink = `https://play.google.com/store/apps/details?id=com.bringyour.network&referrer=${referrer}`
                } else if (connectSelf.isApple()) {
                    // FIXME referrer
                    storeLink = 'https://apps.apple.com/us/app/urnetwork/id6741000606'
                } else {
                    storeLink = url
                }

                window.location.assign(storeLink)
            } else if ('error' in responseBody) {
                enterErrorElement.textContent = responseBody['error']['message']
                enterErrorElement.classList.remove('d-none')
            } else {
                enterErrorElement.textContent = 'Something unexpected happened.'
                enterErrorElement.classList.remove('d-none')
            }
        }

        self.copyAuthCode = () => {
            const copyAuthCodeButtonElement = self.element('copy-auth-code-button')
            const copyAuthCodeSpinnerElement = self.element('copy-auth-code-spinner')
            const copyAuthCodeErrorElement = self.element('copy-auth-code-error')
            const copyAuthCodeManualElement = self.element('copy-auth-code-manual')
            
            copyAuthCodeButtonElement.disabled = true
            copyAuthCodeSpinnerElement.classList.remove('d-none')
            copyAuthCodeErrorElement.classList.add('d-none')
            copyAuthCodeManualElement.classList.add('d-none')

            let requestBody = {
                'uses': 1,
                'duration_minutes': 1.0
            }

            connectSelf.apiRequest('POST', '/auth/code-create', requestBody)
                .then((responseBody) => {
                    self.handleCopyAuthCodeResponse(responseBody)
                })
                .catch((err) => {
                    self.handleCopyAuthCodeResponse(null)
                })
        }

        self.handleCopyAuthCodeResponse = (responseBody) => {
            const copyAuthCodeButtonElement = self.element('copy-auth-code-button')
            const copyAuthCodeSpinnerElement = self.element('copy-auth-code-spinner')
            const copyAuthCodeErrorElement = self.element('copy-auth-code-error')
            const copyAuthCodeManualElement = self.element('copy-auth-code-manual')
            const copyAuthCodeManualCodeElement = self.element('copy-auth-code-manual-code')

            const copyAuthCodeTextElement = self.element('copy-auth-code-text')
            const copyAuthCodeTextCopiedElement = self.element('copy-auth-code-text-copied')
            
            
            if (!responseBody) {
                copyAuthCodeErrorElement.textContent = 'Something unexpected happened.'
                copyAuthCodeErrorElement.classList.remove('d-none')
            } else if ('auth_code' in responseBody) {                
                let authCode = responseBody['auth_code']

                // navigator.permissions.query({ name: "clipboard-write" })
                //     .then((result) => {
                //         if (result.state === "granted" || result.state === "prompt") {
                            navigator.clipboard.writeText(authCode)
                                .then(() => {
                                    copyAuthCodeTextElement.classList.add('d-none')
                                    copyAuthCodeTextCopiedElement.classList.remove('d-none')

                                    copyAuthCodeSpinnerElement.classList.add('d-none')

                                    setTimeout(function() {
                                        copyAuthCodeTextElement.classList.remove('d-none')
                                        copyAuthCodeTextCopiedElement.classList.add('d-none')
                                        copyAuthCodeButtonElement.disabled = false
                                    }, 1000)
                                })
                                .catch((err) => {
                                    copyAuthCodeButtonElement.disabled = false
                                    copyAuthCodeSpinnerElement.classList.add('d-none')
                                    copyAuthCodeManualElement.classList.remove('d-none')

                                    copyAuthCodeManualCodeElement.value = authCode
                                })
                    //     } else {
                    //         copyAuthCodeButtonElement.disabled = false
                    //         copyAuthCodeSpinnerElement.classList.add('d-none')

                    //         copyAuthCodeErrorElement.textContent = `${err.name}: ${err.message}`
                    //         copyAuthCodeErrorElement.classList.remove('d-none')
                    //     }
                    // })
                    // .catch((err) => {
                    //     copyAuthCodeButtonElement.disabled = false
                    //     copyAuthCodeSpinnerElement.classList.add('d-none')

                    //     copyAuthCodeErrorElement.textContent = `${err.name}: ${err.message}`
                    //     copyAuthCodeErrorElement.classList.remove('d-none')
                    // })

                
            } else if ('error' in responseBody) {
                copyAuthCodeButtonElement.disabled = false
                copyAuthCodeSpinnerElement.classList.add('d-none')

                copyAuthCodeErrorElement.textContent = responseBody['error']['message']
                copyAuthCodeErrorElement.classList.remove('d-none')
            } else {
                copyAuthCodeButtonElement.disabled = false
                copyAuthCodeSpinnerElement.classList.add('d-none')

                copyAuthCodeErrorElement.textContent = 'Something unexpected happened.'
                copyAuthCodeErrorElement.classList.remove('d-none')
            }
        }

        self.copyAuthCodeManual = () => {
            const copyAuthCodeErrorElement = self.element('copy-auth-code-error')
            const copyAuthCodeManualCodeElement = self.element('copy-auth-code-manual-code')
            const copyAuthCodeManualCodeCopyElement = self.element('copy-auth-code-manual-code-copy')
            
            copyAuthCodeErrorElement.classList.add('d-none')

            copyAuthCodeManualCodeCopyElement.disabled = false

            navigator.clipboard.writeText(copyAuthCodeManualCodeElement.value)
                .then(() => {
                    copyAuthCodeManualCodeCopyElement.textContent = 'Copied'

                    setTimeout(function() {
                        copyAuthCodeManualCodeCopyElement.textContent = 'Copy'
                        copyAuthCodeManualCodeCopyElement.disabled = false
                    }, 1000)
                })
                .catch((err) => {
                    copyAuthCodeManualCodeCopyElement.disabled = false

                    copyAuthCodeErrorElement.textContent = `${err.name}: ${err.message}`
                    copyAuthCodeErrorElement.classList.remove('d-none')
                })
        }

        self.launchApp = (appRoute, windowRef) => {
            const launchAppButtonElement = self.element('launch-app-button')
            const launchAppSpinnerElement = self.element('launch-app-spinner')
            const launchAppErrorElement = self.element('launch-app-error')
            
            launchAppButtonElement.disabled = true
            launchAppSpinnerElement.classList.remove('d-none')
            launchAppErrorElement.classList.add('d-none')

            let requestBody = {
                'uses': 1,
                'duration_minutes': 1.0
            }

            connectSelf.apiRequest('POST', '/auth/code-create', requestBody)
                .then((responseBody) => {
                    self.handleLaunchAppResponse(responseBody, appRoute, windowRef)
                })
                .catch((err) => {
                    self.handleLaunchAppResponse(null, appRoute, windowRef)
                })
        }

        self.handleLaunchAppResponse = (responseBody, appRoute, windowRef) => {
            const launchAppButtonElement = self.element('launch-app-button')
            const launchAppSpinnerElement = self.element('launch-app-spinner')
            const launchAppErrorElement = self.element('launch-app-error')
            
            launchAppButtonElement.disabled = false
            launchAppSpinnerElement.classList.add('d-none')

            if (!responseBody) {
                launchAppErrorElement.textContent = 'Something unexpected happened.'
                launchAppErrorElement.classList.remove('d-none')
                if (windowRef) {
                    windowRef.close()
                }
            } else if ('auth_code' in responseBody) {
                let url = connectSelf.serviceUrl('app', `${appRoute}${appRoute.includes('?') ? '&' : '?'}auth_code=${responseBody['auth_code']}`)
                if (windowRef) {
                    windowRef.location = url
                } else {
                    if (!window.open(url, '_blank')) {
                        if (!window.open(url, '_self')) {
                            window.location.assign(url)
                        }
                    }
                }
            } else if ('error' in responseBody) {
                launchAppErrorElement.textContent = responseBody['error']['message']
                launchAppErrorElement.classList.remove('d-none')
                if (windowRef) {
                    windowRef.close()
                }
            } else {
                launchAppErrorElement.textContent = 'Something unexpected happened.'
                launchAppErrorElement.classList.remove('d-none')
                if (windowRef) {
                    windowRef.close()
                }
            }
        }

        self.submitPreferences = () => {
            const preferencesProductUpdateElement = self.element('preferences-product-updates')
            const preferencesSavedElement = self.element('preferences-saved')
            const preferencesSpinnerElement = self.element('preferences-spinner')

            preferencesProductUpdateElement.disabled = true
            preferencesSavedElement.classList.add('d-none')
            preferencesSpinnerElement.classList.remove('d-none')

            let requestBody = {
                'product_updates': preferencesProductUpdateElement.checked
            }

            connectSelf.apiRequest('POST', '/preferences/set-preferences', requestBody)
                .then((responseBody) => {
                    self.handleSubmitPreferencesResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitPreferencesResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_preferences_set(requestBody)
            //     self.handleSubmitPreferencesResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitPreferencesResponse = (responseBody) => {
            const preferencesProductUpdateElement = self.element('preferences-product-updates')
            const preferencesSavedElement = self.element('preferences-saved')
            const preferencesSpinnerElement = self.element('preferences-spinner')

            preferencesProductUpdateElement.disabled = false
            preferencesSavedElement.classList.remove('d-none')
            preferencesSpinnerElement.classList.add('d-none')
        }

        self.submit = () => {
            const feedbackButtonElement = self.element('feedback-button')
            const feedbackSpinnerElement = self.element('feedback-spinner')

            const feedbackUsePersonalElement = self.element('feedback-use-personal')
            const feedbackUseBusinessElement = self.element('feedback-use-business')
            const feedbackNeedPrivateElement = self.element('feedback-need-private')
            const feedbackNeedSafeElement = self.element('feedback-need-safe')
            const feedbackNeedGlobalElement = self.element('feedback-need-global')
            const feedbackNeedCollaborateElement = self.element('feedback-need-collaborate')
            const feedbackNeedAppControlElement = self.element('feedback-need-app-control')
            const feedbackNeedBlockDataBrokersElement = self.element('feedback-need-block-data-brokers')
            const feedbackNeedBlockAdsElement = self.element('feedback-need-block-ads')
            const feedbackNeedFocusElement = self.element('feedback-need-focus')
            const feedbackNeedConnectServersElement = self.element('feedback-need-connect-servers')
            const feedbackNeedRunServersElement = self.element('feedback-need-run-servers')
            const feedbackNeedPreventCyberElement = self.element('feedback-need-prevent-cyber')
            const feedbackNeedAuditElement = self.element('feedback-need-audit')
            const feedbackNeedZeroTrustElement = self.element('feedback-need-zero-trust')
            const feedbackNeedVisualizeElement = self.element('feedback-need-visualize')
            const feedbackNeedOtherElement = self.element('feedback-need-other')

            feedbackButtonElement.disabled = true
            feedbackSpinnerElement.classList.remove('d-none')

            feedbackUsePersonalElement.disabled = true
            feedbackUseBusinessElement.disabled = true
            feedbackNeedPrivateElement.disabled = true
            feedbackNeedSafeElement.disabled = true
            feedbackNeedGlobalElement.disabled = true
            feedbackNeedCollaborateElement.disabled = true
            feedbackNeedAppControlElement.disabled = true
            feedbackNeedBlockDataBrokersElement.disabled = true
            feedbackNeedBlockAdsElement.disabled = true
            feedbackNeedFocusElement.disabled = true
            feedbackNeedConnectServersElement.disabled = true
            feedbackNeedRunServersElement.disabled = true
            feedbackNeedPreventCyberElement.disabled = true
            feedbackNeedAuditElement.disabled = true
            feedbackNeedZeroTrustElement.disabled = true
            feedbackNeedVisualizeElement.disabled = true
            feedbackNeedOtherElement.disabled = true

            let requestBody = {
                // byJwt: getByJwt(),
                'uses': {
                    'personal': feedbackUsePersonalElement.checked,
                    'business': feedbackUseBusinessElement.checked
                },
                'needs': {
                    'private': feedbackNeedPrivateElement.checked,
                    'safe': feedbackNeedSafeElement.checked,
                    'global': feedbackNeedGlobalElement.checked,
                    'collaborate': feedbackNeedCollaborateElement.checked,
                    'app_control': feedbackNeedAppControlElement.checked,
                    'block_data_brokers': feedbackNeedBlockDataBrokersElement.checked,
                    'block_ads': feedbackNeedBlockAdsElement.checked,
                    'focus': feedbackNeedFocusElement.checked,
                    'connect_servers': feedbackNeedConnectServersElement.checked,
                    'run_servers': feedbackNeedRunServersElement.checked,
                    'prevent_cyber': feedbackNeedPreventCyberElement.checked,
                    'audit': feedbackNeedAuditElement.checked,
                    'zero_trust': feedbackNeedZeroTrustElement.checked,
                    'visualize': feedbackNeedVisualizeElement.checked,
                    'other': feedbackNeedOtherElement.value
                }
            }

            connectSelf.apiRequest('POST', '/feedback/send-feedback', requestBody)
                .then((responseBody) => {
                    self.handleSubmitResponse(responseBody)
                })
                .catch((err) => {
                    self.handleSubmitResponse(null)
                })

            // setTimeout(() => {
            //     let responseBody = MOCK_API_feedback_send(requestBody)
            //     self.handleSubmitResponse(responseBody)
            // }, 1000)
        }
        self.handleSubmitResponse = (responseBody) => {
            const feedbackInputElement = self.element('feedback-input')
            const feedbackDoneElement = self.element('feedback-done')

            feedbackInputElement.classList.add('d-none')
            feedbackDoneElement.classList.remove('d-none')
        }
    }

    self.renderInitial = function(container, id, nonce) {
        var storeLink
        if (connectSelf.isAndroid() || connectSelf.isChromeOs()) {
            storeLink = 'https://play.google.com/store/apps/details?id=com.bringyour.network'
        } else if (connectSelf.isApple()) {
            storeLink = 'https://apps.apple.com/us/app/urnetwork/id6741000606'
        } else {
            storeLink = '/c?guest'
        }

        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title">Login</div><div class="header-right"><a href="/connect/create">or create a network</a></div>
                        </div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <div id="g_id_onload"
                             data-client_id="${googleClientId}"
                             data-context="signin"
                             data-ux_mode="popup"
                             data-login_uri="${authLoginUri}"
                             data-nonce="${nonce}"
                             data-auto_select="true"
                             data-itp_support="true"
                             data-width="300"
                             data-height="39"></div>

                        <div id="${id('g_id_button')}" class="g_id_signin"
                             data-type="standard"
                             data-shape="rectangular"
                             data-theme="outline"
                             data-text="continue_with"
                             data-size="large"
                             data-logo_alignment="center"
                             data-width="300"
                             data-height="39">
                        </div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <div id="apple-container">
                             <div id="appleid-signin"
                                  data-color="white"
                                  data-border="false"
                                  data-type="continue"
                                  data-mode="center-align"
                                  data-logo-size="large"
                                  data-width="300"
                                  data-height="39"></div>
                             </div>
                   </div>
              </div>
              <div class="login-separator">- or -</div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('login-form')}">
                             <div class="info-title">Email or Phone Number</div>
                             <div><input id="${id('login-user-auth')}" type="text" class="form-control"/></div>
                             <div id="${id('login-error')}" class="text-danger d-none"></div>
                             <div class="no-title"><button id="${id('login-button')}" class="btn btn-primary" type="button"><span id="${id('login-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                        </form>
                   </div>
              </div>
              <div class="login-separator">- or -</div>
              <div class="login-option">
                   Commitment issues? <a href="${storeLink}" target="_blank">Try guest mode</a>
              </div>
              <div class="login-option">
                <div class="store"><a href="https://apps.apple.com/us/app/urnetwork/id6741000606" target="_blank"><img src="https://bringyour.com/res/images/store-app-dark.svg" class="store"></a></div>
                <div class="store"><a href="https://play.google.com/store/apps/details?id=com.bringyour.network" target="_blank"><img src="https://bringyour.com/res/images/store-play.png" class="store"></a></div>
              </div>
         `
        container.innerHTML = html
    }

    self.renderLoginPassword = function(container, id, userAuth) {
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Welcome back</div></div>
                        <div>Log in using ${self.escapeHtml(userAuth)}</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('login-form')}">
                             <div class="password-header"><div class="info-title">Password</div><div class="header-right"><a href="/connect/password-reset">Forgot your password?</a></div></div>
                             <div><input id="${id('login-password')}" type="password" class="form-control"/></div>
                             <div id="${id('login-error')}" class="text-danger d-none">Invalid email or password</div>
                             <div class="no-title"><button id="${id('login-button')}" class="btn btn-primary" type="button"><span id="${id('login-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                        </form>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderPasswordReset = function(container, id, userAuth) {
        let userAuthStr = userAuth || ''
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Forgot your password?</div></div>
                        <div>Enter your email or phone number to reset your password.</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('password-reset-form')}">
                             <div class="info-title">Email or Phone Number</div>
                             <div><input id="${id('password-reset-user-auth')}" type="text" value="${self.escapeHtml(userAuthStr)}" class="form-control"/></div>
                             <div id="${id('password-reset-error')}" class="text-danger d-none">Invalid email or phone number</div>
                             <div class="no-title"><button id="${id('password-reset-button')}" class="btn btn-primary" type="button"><span id="${id('password-reset-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                        </form>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <div>You may need to check your spam folder or unblock no-reply@ur.io</div>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderPasswordResetAfterSend = function(container, id, userAuth) {
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Forgot your password?</div></div>
                        <div>Reset link sent to ${self.escapeHtml(userAuth)}</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <div>You may need to check your spam folder or unblock no-reply@ur.io</div>
                        <div><a id="${id('password-reset-resend-link')}" href="/connect/password-reset/resend">Resend</a><div id="${id('password-reset-resend-spinner')}" class="d-none"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Resend</div><div id="${id('password-reset-resend-sent')}" class="d-none">Sent!</div></div>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderPasswordResetComplete = function(container, id, resetCode) {
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Reset your password</div></div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('password-reset-form')}">
                             <div class="info-title">New Password</div>
                             <div><input id="${id('password-reset-password')}" type="password" class="form-control"/></div>
                             <div class="info-title">Re-enter New Password</div>
                             <div><input id="${id('password-reset-password-confirm')}" type="password" class="form-control"/></div>
                             <div id="${id('password-reset-error')}" class="text-danger d-none">Invalid email or phone number</div>
                             <div class="no-title"><button id="${id('password-reset-button')}" class="btn btn-primary" type="button"><span id="${id('password-reset-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                        </form>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderCreateNetworkAuthJwt = function(container, id, authJwtType, authJwt, userName) {
        let authName
        if (authJwtType == 'google') {
            authName = 'Google'
        } else if (authJwtType == 'apple') {
            authName = 'Apple'
        } else {
            authName = 'Something'
        }

        let userNameStr = /*userName ||*/ `anon${crypto.randomUUID()}`

        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Create a network</div></div>
                        <div>${self.escapeHtml(authName)} will be the primary login.</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('create-form')}">
                             <div class="info-title d-none">Your Name</div>
                             <div class="d-none"><input id="${id('create-user-name')}" type="text" value="${self.escapeHtml(userNameStr)}" class="form-control"></div>
                             <div class="info-title">Choose a network name</div>
                             <div><div class="input-group"><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname" class="form-control network-name" aria-describedby="${id('network-addon')}"/><span class="input-group-text" id="${id('network-addon')}">.ur.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></span></div></div>
                             <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                             <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                             <div class="no-title"><label class="form-check-label"><input id="${id('create-agree-terms')}" type="checkbox" class="form-check-input" value="">I agree to the <a href="/terms" target="_blank">BringYour terms</a>. Learn about how we use and protect your data in our <a href="/privacy" target="_blank">Privacy Policy</a></label></div>
                             <div id="${id('create-error')}" class="text-danger d-none"></div>
                             <div class="no-title"><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
                        </form>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderCreateNetwork = function(container, id, userAuth) {

        // get bonus from query params
        const urlParams = new URLSearchParams(window.location.search)
        const bonusReferral = urlParams.get('bonus')
        const balanceCode = urlParams.get('balance-code')

        let userAuthStr = userAuth || ''
        let bonusReferralStr = bonusReferral ?? ''
        let balanceCodeStr = balanceCode ?? ''
        let userNameStr = `anon${crypto.randomUUID()}`
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>Create a network</div></div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('create-form')}">
                             <div class="info-title d-none">Your Name</div>
                             <div class="d-none"><input id="${id('create-user-name')}" type="text" value="${self.escapeHtml(userNameStr)}" class="form-control"></div>
                             <div class="info-title">Email or Phone Number</div>
                             <div><input id="${id('create-user-auth')}" type="text" value="${self.escapeHtml(userAuthStr)}" class="form-control"></div>
                             <div id="${id('create-user-auth-error')}" class="text-danger d-none"></div>
                             <div class="info-title">Password</div>
                             <div><input id="${id('create-password')}" type="password" class="form-control"/></div>
                             <div id="${id('create-password-error')}" class="text-secondary d-none"></div>
                             <div class="info-title">Choose a network name</div>
                             <div><div class="input-group"><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname" class="form-control network-name" aria-describedby="${id('network-addon')}"/><span class="input-group-text" id="${id('network-addon')}">.ur.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></span></div></div>
                             <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                             <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                             <div class="no-title"><label class="form-check-label"><input id="${id('create-agree-terms')}" type="checkbox" class="form-check-input" value="">A one-time message to establish your identity will be sent to you. Message and data rates may apply. I agree to the <a href="/terms" target="_blank">URnetwork terms</a>. Learn about how we use and protect your data in our <a href="/privacy" target="_blank">Privacy Policy</a></label></div>
                             <div id="${id('create-error')}" class="text-danger d-none"></div>
                             <div class="no-title"><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
                             <hr />
                             <div class="info-title">Enter referral code</div>
                             <div><input id="${id('create-bonus-referral')}" type="text" value="${self.escapeHtml(bonusReferralStr)}" class="form-control"></div>
                            <div class="info-title">Enter balance code</div>
                             <div><input id="${id('create-balance-code')}" type="text" value="${self.escapeHtml(balanceCodeStr)}" class="form-control"></div>
                        </form>
                   </div>
              </div>
         `

        container.innerHTML = html
    }



    self.renderCreateNetworkVerify = function(container, id, userAuth) {

        function userAuthType(userAuth) {
            if (userAuth.startsWith('+')) {
                return 'phone'
            } else if (userAuth.includes('@')) {
                return 'email'
            }
            return 'unknown'
        }


        let title
        if (userAuthType(userAuth) == 'email') {
            title = 'Verify your email'
        } else if (userAuthType(userAuth) == 'phone') {
            title = 'Verify your phone number'
        } else {
            title = 'Verify your email or phone number'
        }
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title"><a href="/connect"><img src="https://bringyour.com/res/images/arrow-back.svg" class="arrow-back"></a>${self.escapeHtml(title)}</div></div>
                        <div>We sent a code to ${self.escapeHtml(userAuth)}. Please enter it below.</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <form id="${id('verify-form')}">
                             <div class="password-header"><div class="info-title">Code</div><div class="header-right"><a id="${id('verify-resend-link')}" href="/connect/verify/resend">Resend</a><div id="${id('verify-resend-spinner')}" class="d-none"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Resend</div><div id="${id('verify-resend-sent')}" class="d-none">Sent!</div></div></div>
                             <div><input id="${id('verify-code')}" type="text" class="form-control"></div>
                             <div id="${id('verify-error')}" class="text-danger d-none"></div>
                             <div class="no-title"><button id="${id('verify-button')}" class="btn btn-primary" type="button"><span id="${id('verify-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                        </form>
                   </div>
              </div>
         `

        container.innerHTML = html
    }

    self.renderComplete = function(container, id, networkName) {
        let html = `
              <div class="login-option">
                   <div class="login-container">
                        <div class="login-header"><div class="title">${self.escapeHtml(networkName)}</div><div class="title">.ur.network</div></div>
                        <div>Your network is now live!</div>
                   </div>
              </div>
        `

        html += `
          <div class="login-option">
               <div class="login-container">
                    <div><button id="${id('enter-button')}" type="button" class="btn btn-primary">Enter<span id="${id('enter-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></button></div>
                    <div id="${id('enter-error')}" class="text-danger d-none"></div>
               </div>
          </div>
        `

        html += `
            <div class="login-option">
                   <div class="login-container">
                        <label class="form-check-label"><input id="${id('preferences-product-updates')}" type="checkbox" value="" class="form-check-input"> You can send me occasional product updates</label>
                        <div><span id="${id('preferences-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span id="${id('preferences-saved')}" class="text-success d-none">Preferences saved!</span></div>
                   </div>
            </div>
        `

        html += `
              <div class="login-separator">account tools</div>
              <div class="login-option">
                   <div class="login-container">
                        <div><button id="${id('copy-auth-code-button')}" type="button" class="btn btn-secondary btn-sm"><span id="${id('copy-auth-code-text')}">Copy an auth code</span><span id="${id('copy-auth-code-text-copied')}" class="d-none">Copied</span><span id="${id('copy-auth-code-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></button></div>
                        <div id="${id('copy-auth-code-error')}" class="text-danger d-none"></div>
                        <div id="${id('copy-auth-code-manual')}" class="input-group input-group-sm mb-3 d-none">
                            <input id="${id('copy-auth-code-manual-code')}" type="text" class="form-control" placeholder="Auth Code" aria-label="Auth Code" aria-describedby="${id('copy-auth-code-manual-code-copy')}" readonly>
                            <button id="${id('copy-auth-code-manual-code-copy')}" class="btn btn-outline-secondary btn-sm" type="button">Copy</button>
                        </div>
                        <div>This is used to <a href="https://docs.ur.io/provider" target="_blank">set up provider nodes</a>, <a href="https://docs.ur.io/api" target="_blank">API access</a>, and <a href="https://docs.ur.io/cli" target="_blank">command line tools</a>.</div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <div><button id="${id('launch-app-button')}" type="button" class="btn btn-secondary btn-sm">Open Client Manager<span id="${id('launch-app-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></button></div>
                        <div id="${id('launch-app-error')}" class="text-danger d-none"></div>
                   </div>
              </div>
              <div class="login-option">
                   <div class="login-container">
                        <a href="/connect/signout">Sign out</a>
                   </div>
              </div>
        `

        container.innerHTML = html
    }

}()














