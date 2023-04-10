
const googleClientId = '338638865390-cg4m0t700mq9073smhn9do81mr640ig1.apps.googleusercontent.com'
const appleClientId = 'com.bringyour.service'
const authJwtRedirect = 'https://bringyour.com/connect'


// see https://developers.google.com/identity/gsi/web/guides/handle-credential-responses-js-functions
function handleGoogleCredentialResponse(response) {
    // console.log(response)
    let authJwt = response.credential
    if (window.connectMount) {
        window.connectMount.activeComponent.submitAuthJwt('google', authJwt)
    }
    if (window.showConnectDialog) {
        window.showConnectDialog()
    }
}


const connectTopLevelRoutes = [
    new Route('/connect', new DialogInitial()),
    new Route('/connect/create', new DialogCreateNetwork()),
]

function createConnectMount(elementId) {
    return createMount(elementId, connectTopLevelRoutes)
}


function DialogInitial(firstLoad) {
    const self = this

    self.render = (container) => {
        const nonce = crypto.randomUUID()

        renderInitial(container, self.id, nonce)

        // connect with apple
        AppleID.auth.init({
            clientId: appleClientId,
            scope: 'name email',
            redirectURI: authJwtRedirect,
            state: 'continue',
            nonce: nonce,
            usePopup: true
        })
        // see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple
        document.addEventListener('AppleIDSignInOnSuccess', function(event) {
            // see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple
            let authJwt = event.detail.authorization.id_token
            self.submitAuthJwt('apple', authJwt)
        })
        document.addEventListener('AppleIDSignInOnFailure', (event) => {
            // do nothing
        })

        // connect with google
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response, error) => {
                if (!error) {
                    let authJwt = response.credential
                    self.submitAuthJwt('google', authJwt)
                }
            },
        })
        if (firstLoad) {
            window.google.accounts.id.prompt()
        } else {
            window.google.accounts.id.renderButton(document.getElementById('g_id_button'), {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'center',
                width: 300
            })
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
    self.router = (url) => {}


    // event handlers

    self.submitAuthJwt = (authJwtType, authJwt) => {
        const loginUserAuthElement = self.element('login-user-auth')
        const loginButtonElement = self.element('login-button')
        const loginSpinnerElement = self.element('login-spinner')

        loginUserAuthElement.disabled = true
        loginButtonElement.disabled = true
        loginSpinnerElement.classList.remove('d-none')

        let requestBody = {
            authJwtType: authJwtType,
            authJwt: authJwt
        }

        apiRequest('POST', '/auth/login', requestBody)
            .catch((err) => {
                self.handleSubmitAuthJwtResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitAuthJwtResponse(responseBody)
            })

        // setTimeout(() => {
        //      let responseBody = MOCK_API_auth_login(requestBody)
        //      self.handleSubmitAuthJwtResponse(responseBody)
        // }, 1000)
    }
    self.handleSubmitAuthJwtResponse = (responseBody) => {
        const loginUserAuthElement = self.element('login-user-auth')
        const loginButtonElement = self.element('login-button')
        const loginSpinnerElement = self.element('login-spinner')

        loginUserAuthElement.disabled = false
        loginButtonElement.disabled = false
        loginSpinnerElement.classList.add('d-none')

        if (responseBody) {
            if ('network' in responseBody) {
                let network = responseBody['network']
                let networkName = network['name']

                setByJwt({
                    network: {
                        name: networkName
                    }
                })
                self.mount.render(new DialogComplete(networkName))
            } else if ('authAllowed' in responseBody) {
                // and existing network but different login
                let message
                if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                    message = 'Please login with Apple or Google'
                } else if (authAllowed.includes('apple')) {
                    message = 'Please login with Apple'
                } else if (authAllowed.includes('google')) {
                    message = 'Please login with Google'
                } else if (authAllowed.includes('password')) {
                    message = 'Please login with email or phone number'
                } else {
                    message = 'Something went wrong. Please try again later.'
                }
                let errorElement = self.element('login-auth-jwt-error')
                errorElement.textContent = message
                errorElement.classList.remove('d-none')

                loginUserAuthElement.disabled = false
                loginButtonElement.disabled = false
                loginSpinnerElement.classList.add('d-none')
            } else {
                // a new network
                let authJwtType = responseBody['authJwtType']
                let authJwt = responseBody['authJwt']
                let userName = responseBody['userName']
                self.mount.render(new DialogCreateNetworkAuthJwt(authJwtType, authJwt, userName))
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
            userAuth: userAuth
        }

        apiRequest('POST', '/auth/login', requestBody)
            .catch((err) => {
                self.handleSubmitResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitResponse(responseBody)
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
                let suggestedUserAuth = error['suggestedUserAuth'] || loginUserAuthElement.value
                let message = error['message']

                let errorElement = self.element('login-error')
                errorElement.textContent = message
                errorElement.classList.remove('d-none')

                loginUserAuthElement.value = suggestedUserAuth

                loginUserAuthElement.disabled = false
                loginButtonElement.disabled = false
                loginSpinnerElement.classList.add('d-none')
            } else if ('authAllowed' in responseBody) {
                // an existing network
                let userAuth = responseBody['userAuth'] || responseBody['userAuth']
                let authAllowed = responseBody['authAllowed']
                if (authAllowed.includes('password')) {
                    self.mount.render(new DialogLoginPassword(userAuth))
                } else {
                    let message
                    if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                        message = 'Please login with Apple or Google'
                    } else if (authAllowed.includes('apple')) {
                        message = 'Please login with Apple'
                    } else if (authAllowed.includes('google')) {
                        message = 'Please login with Google'
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
                let userAuth = responseBody['userAuth']
                self.mount.render(new DialogCreateNetwork(userAuth))
            }
        }
    }
}

function DialogLoginPassword(userAuth) {
    const self = this

    self.render = (container) => {
        renderLoginPassword(container, self.id, userAuth)

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
            self.mount.render(new DialogPasswordReset(userAuth))
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
            userAuth: userAuth,
            password: password
        }

        apiRequest('POST', '/auth/login-with-password', requestBody)
            .catch((err) => {
                self.handleSubmitResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitResponse(responseBody)
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
            } else if ('validationRequired' in responseBody) {
                let validationRequired = responseBody['validationRequired']
                let validationUserAuth = validationRequired['userAuth']

                self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
            } else if ('network' in responseBody) {
                let network = responseBody['network']
                let networkName = network['name']

                setByJwt({
                    network: {
                        name: networkName
                    }
                })
                self.mount.render(new DialogComplete(networkName))
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



function DialogPasswordReset(userAuth) {
    const self = this

    self.render = (container) => {
        renderPasswordReset(container, self.id, userAuth)

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
            userAuth: userAuth
        }

        apiRequest('POST', '/auth/password-reset', requestBody)
            .catch((err) => {
                self.handleSubmitResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitResponse(responseBody)
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
            } else if ('userAuth' in responseBody) {
                let responseUserAuth = responseBody['userAuth']

                self.mount.render(new DialogPasswordResetAfterSend(responseUserAuth))
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


function DialogPasswordResetAfterSend(userAuth) {
    const self = this

    self.render = (container) => {
        renderPasswordResetAfterSend(container, self.id, userAuth)
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
            userAuth: userAuth
        }

        apiRequest('POST', '/auth/password-reset', requestBody)
            .catch((err) => {
                self.handleSubmitResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitResponse(responseBody)
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


function DialogPasswordResetComplete(resetCode) {
    const self = this

    self.render = (container) => {
        renderPasswordResetComplete(container, self.id, resetCode)

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
            self.mount.render(new DialogPasswordReset())
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
            resetCode: resetCode,
            password: password
        }

        apiRequest('POST', '/auth/password-set', requestBody)
            .catch((err) => {
                self.handleSubmitResponse(null)
            })
            .then((responseBody) => {
                self.handleSubmitResponse(responseBody)
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

                if ('resetCodeError' in error) {
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
            } else if ('complete' in responseBody) {
                self.mount.render(new DialogInitial(false))
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
}


function NetworkNameValidator(
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
        if (!self.networkEdited) {
            let userName = createUserNameElement.value

            let networkName = normalizeNetworkName(userName)
            createNetworkNameElement.value = networkName
            self.debounceValidateNetworkName(networkName)
        }

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
                networkName: networkName
            }

            apiRequest('POST', '/auth/network-check', requestBody)
                .catch((err) => {
                    apiRequestCallback(null)
                })
                .then((responseBody) => {
                    apiRequestCallback(responseBody)
                })
        }
    }
    self.handleValidateNetworkNameResponse = (responseBody) => {
        console.log(responseBody)
        let validateError
        if (!responseBody) {
            validateError = 'Something went wrong. Please try again later.'
        }
        else if (responseBody['conflict']) {
            validateError = 'Must be at least 3 characters different than an existing network. Make it unique or longer.'
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



function DialogCreateNetworkAuthJwt(authJwtType, authJwt, userName) {
    const self = this

    self.networkNameValidator = null

    self.termsOk = false

    self.render = (container) => {
        renderCreateNetworkAuthJwt(container, self.id, authJwtType, authJwt, userName)

        const createButtonElement = self.element('create-button')
        const createFormElement = self.element('create-form')
        const createUserNameElement = self.element('create-user-name')
        const createNetworkNameElement = self.element('create-network-name')
        const createNetworkNameSpinnerElement = self.element('create-network-name-spinner')
        const createNetworkNameErrorElement = self.element('create-network-name-error')
        const createNetworkNameAvailableElement = self.element('create-network-name-available')
        const createAgreeTermsElement = self.element('create-agree-terms')


        self.networkNameValidator = new NetworkNameValidator(
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
            authJwtType: authJwtType,
            authJwt: authJwt,
            userName: userName,
            networkName: networkName,
            terms: terms
        }

        apiRequest('POST', '/auth/network-create', requestBody)
            .catch((err) => {
                handleSubmitResponse(null)
            })
            .then((responseBody) => {
                handleSubmitResponse(responseBody)
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

                if (error['userAuthConflict']) {
                    createUserAuthErrorElement.innerHTML = 'This email or phone number is already taken. <a href="/connect">Sign in</a>.'
                    createUserAuthErrorElement.classList.remove('d-none')
                } else if ('message' in error) {
                    createErrorElement.textContent = error['message']
                    createErrorElement.classList.remove('d-none')
                } else {
                    createErrorElement.classList.add('d-none')
                }

                if ('networkNameMessage' in error) {
                    createNetworkNameErrorElement.textContent = error['networkNameMessage']
                    createNetworkNameErrorElement.classList.remove('d-none')
                } else {
                    createNetworkNameErrorElement.classList.add('d-none')
                }

            } else if ('validationRequired' in responseBody) {
                let validationRequired = responseBody['validationRequired']
                let validationUserAuth = validationRequired['userAuth']

                self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
            } else if ('network' in responseBody) {
                let network = responseBody['network']
                let networkName = network['name']

                setByJwt({
                    network: {
                        name: networkName
                    }
                })
                self.mount.render(new DialogComplete(networkName))
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


function DialogCreateNetwork(userAuth) {
    const self = this

    self.networkNameValidator = null

    self.userAuthOk = false
    self.passwordOk = false
    self.termsOk = false

    function validatePasswordEntropy(password) {
        return 12 <= password.length
    }

    self.render = (container) => {
        renderCreateNetwork(container, self.id, userAuth)

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


        self.networkNameValidator = new NetworkNameValidator(
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
            self.mount.render(new DialogPasswordReset(userAuth))
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

        createUserNameElement.disabled = true
        createUserAuthElement.disabled = true
        createPasswordElement.disabled = true
        createNetworkNameElement.disabled = true
        createAgreeTermsElement.disabled = true
        createButtonElement.disabled = true
        createSpinnerElement.classList.remove('d-none')

        let userName = createUserNameElement.value
        let userAuth = createUserAuthElement.value
        let password = createPasswordElement.value
        let networkName = createNetworkNameElement.value
        let terms = createAgreeTermsElement.checked
        let requestBody = {
            userName: userName,
            userAuth: userAuth,
            password: password,
            networkName: networkName,
            terms: terms
        }

        apiRequest('POST', '/auth/network-create', requestBody)
            .catch((err) => {
                handleSubmitResponse(null)
            })
            .then((responseBody) => {
                handleSubmitResponse(responseBody)
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

                if (error['userAuthConflict']) {
                    createUserAuthErrorElement.innerHTML = 'This email or phone number is already taken. <a href="/connect">Sign in</a> or <a href="/connect/password-reset">reset your password</a>.'
                    createUserAuthErrorElement.classList.remove('d-none')
                } else if ('userAuthMessage' in error) {
                    createUserAuthErrorElement.textContent = error['userAuthMessage']
                    createUserAuthErrorElement.classList.remove('d-none')
                } else {
                    createUserAuthErrorElement.classList.add('d-none')
                }
                if ('passwordMessage' in error) {
                    createPasswordErrorElement.textContent = error['passwordMessage']
                    createPasswordErrorElement.classList.remove('d-none')
                } else {
                    createPasswordErrorElement.classList.add('d-none')
                }
                if ('networkNameMessage' in error) {
                    createNetworkNameErrorElement.textContent = error['networkNameMessage']
                    createNetworkNameErrorElement.classList.remove('d-none')
                } else {
                    createNetworkNameErrorElement.classList.add('d-none')
                }

            } else if ('validationRequired' in responseBody) {
                let validationRequired = responseBody['validationRequired']
                let validationUserAuth = validationRequired['userAuth']

                self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
            } else if ('network' in responseBody) {
                let network = responseBody['network']
                let networkName = network['name']

                setByJwt({
                    network: {
                        name: networkName
                    }
                })
                self.mount.render(new DialogComplete(networkName))
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


function DialogCreateNetworkValidate(userAuth) {
    const self = this

    function normalizeValidateCode(networkName) {
        return networkName.replace(/[^\d]+/gi, '')
    }

    self.render = (container) => {
        renderCreateNetworkValidate(container, self.id, userAuth)

        const validateButtonElement = self.element('validate-button')
        const validateFormElement = self.element('validate-form')
        let validateCodeElement = self.element('validate-code')

        validateButtonElement.addEventListener('click', (event) => {
            self.submit()
        })

        validateFormElement.addEventListener('submit', (event) => {
            event.preventDefault()
            if (!validateButtonElement.disabled) {
                self.submit()
            }
        })

        validateCodeElement.addEventListener('input', (event) => {
            let normalValidateCode = normalizeValidateCode(validateCodeElement.value)
            if (normalValidateCode != validateCodeElement.value) {
                let selectionStart = validateCodeElement.selectionStart
                let selectionEnd = validateCodeElement.selectionEnd
                validateCodeElement.value = normalValidateCode
                validateCodeElement.setSelectionRange(selectionStart, selectionEnd)
            }
        })

        validateCodeElement.focus()
    }
    self.router = (url) => {
        if (url.pathname == '/connect/validate/resend') {
            self.resend()
        }
    }


    // event handlers

    self.submit = () => {
        const validateCodeElement = self.element('validate-code')
        const validateButtonElement = self.element('validate-button')
        const validateSpinnerElement = self.element('validate-spinner')

        validateCodeElement.disabled = true
        validateButtonElement.disabled = true
        validateSpinnerElement.classList.remove('d-none')

        let validateCode = normalizeValidateCode(validateCodeElement.value)
        let requestBody = {
            userAuth: userAuth,
            validateCode: validateCode
        }

        apiRequest('POST', '/auth/validate', requestBody)
            .catch((err) => {
                handleSubmitResponse(null)
            })
            .then((responseBody) => {
                handleSubmitResponse(responseBody)
            })

        // setTimeout(() => {
        //     let responseBody = MOCK_API_auth_validate(requestBody)
        //     self.handleSubmitResponse(responseBody)
        // }, 1000)
    }
    self.handleSubmitResponse = (responseBody) => {
        const validateCodeElement = self.element('validate-code')
        const validateButtonElement = self.element('validate-button')
        const validateSpinnerElement = self.element('validate-spinner')

        validateCodeElement.disabled = false
        validateButtonElement.disabled = false
        validateSpinnerElement.classList.add('d-none')

        if (responseBody) {
            if ('error' in responseBody) {
                let error = responseBody['error']
                let message = error['message']

                const validateErrorElement = self.element('validate-error')

                validateErrorElement.textContent = message
                validateErrorElement.classList.remove('d-none')
            } else if ('network' in responseBody) {
                let network = responseBody['network']
                let networkName = network['name']

                setByJwt({
                    network: {
                        name: networkName
                    }
                })
                self.mount.render(new DialogComplete(networkName))
            } else {
                let message = 'Something went wrong. Please try again later.'

                const validateErrorElement = self.element('validate-error')

                validateErrorElement.textContent = message
                validateErrorElement.classList.remove('d-none')
            }
        }
    }

    self.resend = () => {
        let validateResendLinkElement = self.element('validate-resend-link')
        let validateResendSpinnerElement = self.element('validate-resend-spinner')

        validateResendLinkElement.classList.add('d-none')
        validateResendSpinnerElement.classList.remove('d-none')

        let requestBody = {
            userAuth: userAuth
        }

        apiRequest('POST', '/auth/validate-send', requestBody)
            .catch((err) => {
                handleResendResponse(null)
            })
            .then((responseBody) => {
                handleResendResponse(responseBody)
            })

        // setTimeout(() => {
        //     let responseBody = MOCK_API_auth_validate_send(requestBody)
        //     self.handleResendResponse(responseBody)
        // }, 1000)
    }
    self.handleResendResponse = (responseBody) => {
        let validateResendLinkElement = self.element('validate-resend-link')
        let validateResendSpinnerElement = self.element('validate-resend-spinner')
        let validateResendSentElement = self.element('validate-resend-sent')

        validateResendLinkElement.classList.add('d-none')
        validateResendSpinnerElement.classList.add('d-none')
        validateResendSentElement.classList.remove('d-none')

        setTimeout(() => {
            validateResendLinkElement.classList.remove('d-none')
            validateResendSentElement.classList.add('d-none')
        }, 10000)
    }
}



// local storage:
// byFeedback
// byProductUpdates
// product updates checkbox change
// feedback form submit
function DialogComplete(networkName) {
    const self = this
    self.render = (container) => {
        renderComplete(container, self.id, networkName)

        const preferencesProductUpdateElement = self.element('preferences-product-updates')
        const feedbackButtonElement = self.element('feedback-button')
        const feedbackFormElement = self.element('feedback-form')

        preferencesProductUpdateElement.addEventListener('change', (event) => {
            self.submitPreferences()
        })

        feedbackButtonElement.addEventListener('click', (event) => {
            self.submit()
        })

        feedbackFormElement.addEventListener('submit', (event) => {
            event.preventDefault()
            if (!feedbackButtonElement.disabled) {
                self.submit()
            }
        })
    }
    self.router = (url) => {
        if (url.pathname == '/connect/signout') {
            removeByJwt()
            self.mount.render(new DialogInitial(false))
        }
    }


    // event handlers

    self.submitPreferences = () => {
        const preferencesProductUpdateElement = self.element('preferences-product-updates')
        const preferencesSavedElement = self.element('preferences-saved')
        const preferencesSpinnerElement = self.element('preferences-spinner')

        preferencesProductUpdateElement.disabled = true
        preferencesSavedElement.classList.add('d-none')
        preferencesSpinnerElement.classList.remove('d-none')

        let requestBody = {
            auth: getByJwt(),
            productUpdates: preferencesProductUpdateElement.checked
        }

        apiRequest('POST', '/preferences/set-preferences', requestBody)
            .catch((err) => {
                handleSubmitPreferencesResponse(null)
            })
            .then((responseBody) => {
                handleSubmitPreferencesResponse(responseBody)
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
            auth: getByJwt(),
            uses: {
                personal: feedbackUsePersonalElement.checked,
                business: feedbackUseBusinessElement.checked
            },
            needs: {
                private: feedbackNeedPrivateElement.checked,
                safe: feedbackNeedSafeElement.checked,
                global: feedbackNeedGlobalElement.checked,
                collaborate: feedbackNeedCollaborateElement.checked,
                appControl: feedbackNeedAppControlElement.checked,
                blockDataBrokers: feedbackNeedBlockDataBrokersElement.checked,
                blockAds: feedbackNeedBlockAdsElement.checked,
                focus: feedbackNeedFocusElement.checked,
                connectServers: feedbackNeedConnectServersElement.checked,
                runServers: feedbackNeedRunServersElement.checked,
                preventCyber: feedbackNeedPreventCyberElement.checked,
                audit: feedbackNeedAuditElement.checked,
                zeroTrust: feedbackNeedZeroTrustElement.checked,
                visualize: feedbackNeedVisualizeElement.checked,
                other: feedbackNeedOtherElement.value
            }
        }

        apiRequest('POST', '/feedback/send-feedback', requestBody)
            .catch((err) => {
                handleSubmitResponse(null)
            })
            .then((responseBody) => {
                handleSubmitResponse(responseBody)
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



// fixme id, container
function renderInitial(container, id, nonce) {
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
                         data-login_uri="${authJwtRedirect}"
                         data-nonce="${nonce}"
                         data-callback="handleGoogleCredentialResponse"
                         data-auto_select="true"
                         data-itp_support="true"
                         data-width="300"
                         data-height="39"></div>

                    <div id="g_id_button" class="g_id_signin"
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
     `
    container.innerHTML = html
}

function renderLoginPassword(container, id, userAuth) {
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>Welcome back</div></div>
                    <div>Log in using ${escapeHtml(userAuth)}</div>
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

function renderPasswordReset(container, id, userAuth) {
    let userAuthStr = userAuth || ''
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>Forgot your password?</div></div>
                    <div>Enter your email or phone number to reset your password.</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <form id="${id('password-reset-form')}">
                         <div class="info-title">Email or Phone Number</div>
                         <div><input id="${id('password-reset-user-auth')}" type="text" value="${escapeHtml(userAuthStr)}" class="form-control"/></div>
                         <div id="${id('password-reset-error')}" class="text-danger d-none">Invalid email or phone number</div>
                         <div class="no-title"><button id="${id('password-reset-button')}" class="btn btn-primary" type="button"><span id="${id('password-reset-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                    </form>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <div>You may need to check your spam folder or unblock no-reply@bringyour.com</div>
               </div>
          </div>
     `

    container.innerHTML = html
}

function renderPasswordResetAfterSend(container, id, userAuth) {
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>Forgot your password?</div></div>
                    <div>Reset link sent to ${escapeHtml(userAuth)}</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <div>You may need to check your spam folder or unblock no-reply@bringyour.com</div>
                    <div><a id="${id('password-reset-resend-link')}" href="/connect/password-reset/resend">Resend</a><div id="${id('password-reset-resend-spinner')}" class="d-none"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Resend</div><div id="${id('password-reset-resend-sent')}" class="d-none">Sent!</div></div>
               </div>
          </div>
     `

    container.innerHTML = html
}

function renderPasswordResetComplete(container, id, resetCode) {
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title">Reset your password</div></div>
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

function renderCreateNetworkAuthJwt(container, id, authJwtType, authJwt, userName) {
    let authName
    if (authJwtType == 'google') {
        authName = 'Google'
    } else if (authJwtType == 'apple') {
        authName = 'Apple'
    } else {
        authName = 'Something'
    }

    let userNameStr = userName || ''

    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>Create a network</div></div>
                    <div>${escapeHtml(authName)} will be the primary login.</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <form id="${id('create-form')}">
                         <div class="info-title">Your Name</div>
                         <div><input id="${id('create-user-name')}" type="text" value="${escapeHtml(userNameStr)}" class="form-control"></div>
                         <div class="info-title">Choose a network name</div>
                         <div><div class="input-group"><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname" class="form-control network-name" aria-describedby="${id('network-addon')}"/><span class="input-group-text" id="${id('network-addon')}">.bringyour.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></span></div></div>
                         <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                         <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                         <div class="no-title"><label class="form-check-label"><input id="${id('create-agree-terms')}" type="checkbox" class="form-check-input" value="">I agree to the <a href="/terms" target="_blank">BringYour terms</a>. Learn about how we use and protect your data in our <a href="/privacy">Privacy Policy</a></label></div>
                         <div id="${id('create-error')}" class="text-secondary d-none"></div>
                         <div class="no-title"><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
                    </form>
               </div>
          </div>
     `

    container.innerHTML = html
}

function renderCreateNetwork(container, id, userAuth) {
    let userAuthStr = userAuth || ''
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>Create a network</div></div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <form id="${id('create-form')}">
                         <div class="info-title">Your Name</div>
                         <div><input id="${id('create-user-name')}" type="text" class="form-control"></div>
                         <div class="info-title">Email or Phone Number</div>
                         <div><input id="${id('create-user-auth')}" type="text" value="${escapeHtml(userAuthStr)}" class="form-control"></div>
                         <div id="${id('create-user-auth-error')}" class="text-danger d-none"></div>
                         <div class="info-title">Password</div>
                         <div><input id="${id('create-password')}" type="password" class="form-control"/></div>
                         <div id="${id('create-password-error')}" class="text-secondary d-none"></div>
                         <div class="info-title">Choose a network name</div>
                         <div><div class="input-group"><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname" class="form-control network-name" aria-describedby="${id('network-addon')}"/><span class="input-group-text" id="${id('network-addon')}">.bringyour.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></span></div></div>
                         <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                         <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                         <div class="no-title"><label class="form-check-label"><input id="${id('create-agree-terms')}" type="checkbox" class="form-check-input" value="">I agree to the <a href="/terms" target="_blank">BringYour terms</a>. Learn about how we use and protect your data in our <a href="/privacy">Privacy Policy</a></label></div>
                         <div id="${id('create-error')}" class="text-secondary d-none"></div>
                         <div class="no-title"><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
                    </form>
               </div>
          </div>
     `

    container.innerHTML = html
}

function renderCreateNetworkValidate(container, id, userAuth) {
    let title
    if (userAuthType(userAuth) == 'email') {
        title = 'Validate your email'
    } else if (userAuthType(userAuth) == 'phone') {
        title = 'Validate your phone number'
    } else {
        title = 'Validate your email or phone number'
    }
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title"><a href="/connect"><span class="material-symbols-outlined">arrow_back_ios_new</span></a>${escapeHtml(title)}</div></div>
                    <div>We sent a code to ${escapeHtml(userAuth)}. Please enter it below.</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <form id="${id('validate-form')}">
                         <div class="password-header"><div class="info-title">Code</div><div class="header-right"><a id="${id('validate-resend-link')}" href="/connect/validate/resend">Resend</a><div id="${id('validate-resend-spinner')}" class="d-none"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Resend</div><div id="${id('validate-resend-sent')}" class="d-none">Sent!</div></div></div>
                         <div><input id="${id('validate-code')}" type="text" class="form-control"></div>
                         <div id="${id('validate-error')}" class="text-danger d-none"></div>
                         <div class="no-title"><button id="${id('validate-button')}" class="btn btn-primary" type="button"><span id="${id('validate-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
                    </form>
               </div>
          </div>
     `

    container.innerHTML = html
}

function renderComplete(container, id, networkName) {
    let html = `
          <div class="login-option">
               <div class="login-container">
                    <div class="login-header"><div class="title">${escapeHtml(networkName)}.bringyour.network</div></div>
                    <div>Your network is now live!</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <div>Log in to the app to use your network.</div>
                    <div class="no-title">
                         <a href=""><img src="res/images/store-play.png" class="store"></a>
                         <a href=""><img src="res/images/store-app.svg" class="store"></a>
                    </div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <label class="form-check-label"><input id="${id('preferences-product-updates')}" type="checkbox" value="" class="form-check-input"> You can send me occasional product updates</label>
                    <div><span id="${id('preferences-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span id="${id('preferences-saved')}" class="text-success d-none">Preferences saved!</span></div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <a href="/connect/signout">Sign out</a>
               </div>
          </div>
          <div class="login-option">
               <div id="${id('feedback-input')}" class="login-container feedback-container">
                    <form id="${id('feedback-form')}">
                         <div class="title">Can you take a minute to give us some feedback?</div>
                         <div class="no-title">I use my network for
                              <div><label class="form-check-label"><input id="${id('feedback-use-personal')}" type="checkbox" value="" class="form-check-input"> Personal</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-use-business')}" type="checkbox" value="" class="form-check-input"> Business</label></div>
                         </div>
                         <div class="no-title">The following use cases are valuable to me 
                              <div><label class="form-check-label"><input id="${id('feedback-need-private')}" type="checkbox" value="" class="form-check-input"> Stay anonymous and private on the internet</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-safe')}" type="checkbox" value="" class="form-check-input"> Have verified safe internet everywhere</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-global')}" type="checkbox" value="" class="form-check-input"> Access regional and international networks</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-collaborate')}" type="checkbox" value="" class="form-check-input"> Connect with my homes, friends and family</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-app-control')}" type="checkbox" value="" class="form-check-input"> Control the use of data and apps on my network</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-block-data-brokers')}" type="checkbox" value="" class="form-check-input"> Block personal data collection</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-block-ads')}" type="checkbox" value="" class="form-check-input"> Block ads</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-focus')}" type="checkbox" value="" class="form-check-input"> Help stay focused by temporarily blocking overused sites and content</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-connect-servers')}" type="checkbox" value="" class="form-check-input"> Access private servers from anywhere</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-run-servers')}" type="checkbox" value="" class="form-check-input"> Run custom code and servers for a private group</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-prevent-cyber')}" type="checkbox" value="" class="form-check-input"> Prevent cyber attacks like phishing</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-audit')}" type="checkbox" value="" class="form-check-input"> Audit usage of my network for compliance</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-zero-trust')}" type="checkbox" value="" class="form-check-input"> Implement a zero-trust or secure business environment</label></div>
                              <div><label class="form-check-label"><input id="${id('feedback-need-visualize')}" type="checkbox" value="" class="form-check-input"> Visualize and understand my network data</label></div>
                         </div>
                         <div class="no-title">What do you want to do with your network?
                              <div><textarea id="${id('feedback-need-other')}" class="form-control" placeholder="I want to ..."></textarea></div>
                         </div>
                         <div class="no-title"><button id="${id('feedback-button')}" class="btn btn-primary" type="button"><span id="${id('feedback-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Submit</span></button></div>
                    </form>
               </div>
               <div id="${id('feedback-done')}" class="login-container d-none">
                    <div>&#128588; Thank you for the feedback! We value your input as we prioritize what to build next.
                    <div><br><a href="https://github.com/bringyour/product/discussions" target="_blank">Give us more feedback</a></div>
               </div>
          </div>
     `

    container.innerHTML = html
}