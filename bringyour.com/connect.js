
// parse current location to find the api

const clientVersion = '';
const googleClientId = '338638865390-cg4m0t700mq9073smhn9do81mr640ig1.apps.googleusercontent.com'
const appleClientId = 'com.bringyour.service'
const authJwtRedirect = 'https://bringyour.com/connect'

// 


// see https://developers.google.com/identity/gsi/web/guides/handle-credential-responses-js-functions
function handleGoogleCredentialResponse(response) {
     let authJwt = response.credential
     if (window.connectMount) {
          window.connectMount.activeComponent.submitAuthJwt('google', authJwt)
     }
     if (window.showConnectDialog) {
          window.showConnectDialog()
     }
}


function getByJwt() {
     let byJwtStr = localStorage.getItem('byJwt')
     return byJwtStr && JSON.parse(byJwtStr)
}

function setByJwt(byJwt) {
     localStorage.setItem('byJwt', JSON.stringify(byJwt))
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
     return html.replace(/[<>"]+/g, '')
}


// fixme
function serviceUrl(service, path) {
     let hostname = window.location.hostname
     // <env>-<service>.bringyour.com or <service>.bringyour.com
     // if service == lb, 
     //    if /sb/<serviceblock> and serviceblock == beta
     //      use /sb/<service>/beta
     //    else, use /by/<service>
     // else, use <env>-<service> or <service>

     // local-api.bringyour.com

}

function userAuthType(userAuth) {
     if (userAuth.startsWith('+')) {
          return 'phone'
     }
     else if (userAuth.includes('@')) {
          return 'email'
     }
     return 'unknown'
}


function Route(path, component) {
     this.path = path
     this.component = component
}

const topLevelRoutes = [
     new Route('/connect', new DialogInitial()),
     new Route('/connect/create', new DialogCreateNetwork()),
]

function createMount(elementId) {
     let container = document.getElementById(elementId)
     let idPrefix = elementId + '-'
     return new Mount(container, idPrefix)
}

function Mount(container, idPrefix) {
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


function DialogInitial(firstLoad) {
     const self = this

     self.render = (container) => {
          const nonce = crypto.randomUUID()

          renderInitial(container, self.id, nonce)

          // connect with apple
          AppleID.auth.init({
               clientId : appleClientId,
               scope : 'name email',
               redirectURI : authJwtRedirect,
               state : 'continue',
               nonce : nonce,
               usePopup : true
          });
          // see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple
          document.addEventListener('AppleIDSignInOnSuccess', function(event) {
               let authJwt = event.detail.authorization
               self.submitAuthJwt('apple', authJwt)
          });
          document.addEventListener('AppleIDSignInOnFailure', (event) => {
               // do nothing
          });

          // connect with google
          window.google.accounts.id.initialize({
               client_id: googleClientId,
               callback: (response, error) => {
                    if (!error) {
                         let authJwt = response.credential
                         self.submitAuthJwt('google', authJwt)
                    }
               },
          });
          if (firstLoad) {
               window.google.accounts.id.prompt();
          } else {
               window.google.accounts.id.renderButton(document.getElementById('g_id_button'), {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    width: 300
               });
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
     }


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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_login(requestBody)
               self.handleSubmitAuthJwtResponse(responseBody)
          }, 1000);
     }
     self.handleSubmitAuthJwtResponse = (responseBody) => {
          const loginUserAuthElement = self.element('login-user-auth')
          const loginButtonElement = self.element('login-button') 
          const loginSpinnerElement = self.element('login-spinner')

          if ('network' in responseBody) {
               let network = responseBody['network']
               let networkName = network['name']

               setByJwt({network: {name: networkName}})
               self.mount.render(new DialogComplete(networkName))
          }
          else if ('authAllowed' in responseBody) {
               // and existing network but different login
               let message
               if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                    message = 'Please login with Apple or Google'
               }
               else if (authAllowed.includes('apple')) {
                    message = 'Please login with Apple'
               }
               else if (authAllowed.includes('google')) {
                    message = 'Please login with Google'
               }
               else if (authAllowed.includes('password')) {
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
          }
          else {
               // a new network
               let authJwtType = responseBody['authJwtType']
               let authJwt = responseBody['authJwt']
               let userName = responseBody['userName']
               self.mount.render(new DialogCreateNetworkAuthJwt(authJwtType, authJwt, userName))
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_login(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);
     }
     self.handleSubmitResponse = (responseBody) => {
          const loginUserAuthElement = self.element('login-user-auth')
          const loginButtonElement = self.element('login-button') 
          const loginSpinnerElement = self.element('login-spinner')

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
          }
          else if ('authAllowed' in responseBody) {
               // an existing network
               let userAuth = responseBody['userAuth'] || responseBody['userAuth']
               let authAllowed = responseBody['authAllowed']
               if (authAllowed.includes('password')) {
                    self.mount.render(new DialogLoginPassword(userAuth))
               } else {
                    let message
                    if (authAllowed.includes('apple') && authAllowed.includes('google')) {
                         message = 'Please login with Apple or Google'
                    }
                    else if (authAllowed.includes('apple')) {
                         message = 'Please login with Apple'
                    }
                    else if (authAllowed.includes('google')) {
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
          }
          else {
               // a new network
               let userAuth = responseBody['userAuth']
               self.mount.render(new DialogCreateNetwork(userAuth))
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_login_password(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);
     }
     self.handleSubmitResponse = (responseBody) => {
          const loginPasswordElement = self.element('login-password')
          const loginButtonElement = self.element('login-button') 
          const loginSpinnerElement = self.element('login-spinner')

          if ('error' in responseBody) {
               let error = responseBody['error']
               let message = error['message']

               let errorElement = self.element('login-error')
               errorElement.textContent = message
               errorElement.classList.remove('d-none')

               loginPasswordElement.disabled = false
               loginButtonElement.disabled = false
               loginSpinnerElement.classList.add('d-none')
          }
          else if ('validationRequired' in responseBody) {
               let validationRequired = responseBody['validationRequired']
               let validationUserAuth = validationRequired['userAuth']

               self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
          }
          else if ('network' in responseBody) {
               let network = responseBody['network']
               let networkName = network['name']

               setByJwt({network: {name: networkName}})
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
     self.router = (url) => {
     }


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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_password_reset(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);

     }
     self.handleSubmitResponse = (responseBody) => {
          const passwordResetUserAuthElement = self.element('password-reset-user-auth')
          const passwordResetButtonElement = self.element('password-reset-button')
          const passwordResetSpinnerElement = self.element('password-reset-spinner')

          if ('error' in responseBody) {
               let error = responseBody['error']
               let message = error['message']

               let errorElement = self.element('password-reset-error')
               errorElement.textContent = message
               errorElement.classList.remove('d-none')

               passwordResetUserAuthElement.disabled = false
               passwordResetButtonElement.disabled = false
               passwordResetSpinnerElement.classList.add('d-none')
          }
          else if ('userAuth' in responseBody) {
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_password_reset(requestBody)
               self.handleResendResponse(responseBody)
          }, 1000)
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_password_set(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);

     }
     self.handleSubmitResponse = (responseBody) => {
          const passwordResetPasswordElement = self.element('password-reset-password')
          const passwordResetPasswordConfirmElement = self.element('password-reset-password-confirm')
          const passwordResetButtonElement = self.element('password-reset-button')
          const passwordResetSpinnerElement = self.element('password-reset-spinner')

          if ('error' in responseBody) {
               let error = responseBody['error']

               if ('resetCodeError' in error) {
                    let errorElement = self.element('password-reset-error')
                    errorElement.innerHTML = 'Reset code expired. <a href="/connect/password-reset">Get a new code</a>.'
                    errorElement.classList.remove('d-none')
               }
               else {
                    let message = error['message']

                    let errorElement = self.element('password-reset-error')
                    errorElement.textContent = message
                    errorElement.classList.remove('d-none')                    
               }

               passwordResetPasswordElement.disabled = false
               passwordResetPasswordConfirmElement.disabled = false
               passwordResetButtonElement.disabled = false
               passwordResetSpinnerElement.classList.add('d-none')
          }
          else if ('complete' in responseBody) {
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
          }
          else if (normalizeNetworkName(networkName) != networkName) {
               validateError = 'No dashes or spaces'
          }
          if (validateError) {
               createNetworkNameErrorElement.textContent = validateError
               createNetworkNameErrorElement.classList.remove('d-none')
               createNetworkNameAvailableElement.classList.add('d-none')
               createNetworkNameSpinnerElement.classList.add('d-none')

               self.validateNetworkNameInFlight = null
          }
          else {
               self.asyncValidateNetworkName(networkName)
          }
     }
     self.asyncValidateNetworkName = (networkName) => {
          if (!self.validateNetworkNameInFlight) {
               self.validateNetworkNameInFlight = networkName

               createNetworkNameSpinnerElement.classList.remove('d-none')
               
               setTimeout(() => {
                    if (networkName == self.validateNetworkNameInFlight) {
                         self.validateNetworkNameInFlight = null

                         let requestBody = {
                              networkName: networkName
                         }

                         let responseBody = MOCK_API_auth_network_check(requestBody)
                         if (networkName == self.validatedNetworkName) {
                              self.handleValidateNetworkNameResponse(responseBody)
                         } else {
                              self.asyncValidateNetworkName(self.validatedNetworkName)
                         }
                    }
               }, 1000)
          }
     }
     self.handleValidateNetworkNameResponse = (responseBody) => {
          let conflict = responseBody['conflict']

          let validateError = null
          if (conflict) {
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
     self.router = (url) => {
     }


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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_network_create(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);
     }
     self.handleSubmitResponse = (responseBody) => {
          const createButtonElement = self.element('create-button')
          const createSpinnerElement = self.element('create-spinner')
          const createUserNameElement = self.element('create-user-name')
          const createNetworkNameElement = self.element('create-network-name')
          const createAgreeTermsElement = self.element('create-agree-terms')

          const createErrorElement = self.element('create-error')
          const createNetworkNameErrorElement = self.element('create-network-name-error')

          
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
               }
               else if ('message' in error) {
                    createErrorElement.textContent = error['message']
                    createErrorElement.classList.remove('d-none')
               }
               else {
                    createErrorElement.classList.add('d-none')
               }

               if ('networkNameMessage' in error) {
                    createNetworkNameErrorElement.textContent = error['networkNameMessage']
                    createNetworkNameErrorElement.classList.remove('d-none')
               }
               else {
                    createNetworkNameErrorElement.classList.add('d-none')
               }

          }
          else if ('validationRequired' in responseBody) {
               let validationRequired = responseBody['validationRequired']
               let validationUserAuth = validationRequired['userAuth']

               self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
          }
          else if ('network' in responseBody) {
               let network = responseBody['network']
               let networkName = network['name']

               setByJwt({network: {name: networkName}})
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_network_create(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);
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
               }
               else {
                    createErrorElement.classList.add('d-none')
               }

               if (error['userAuthConflict']) {
                    createUserAuthErrorElement.innerHTML = 'This email or phone number is already taken. <a href="/connect">Sign in</a> or <a href="/connect/password-reset">reset your password</a>.'
                    createUserAuthErrorElement.classList.remove('d-none')
               }
               else if ('userAuthMessage' in error) {
                    createUserAuthErrorElement.textContent = error['userAuthMessage']
                    createUserAuthErrorElement.classList.remove('d-none')
               }
               else {
                    createUserAuthErrorElement.classList.add('d-none')
               }
               if ('passwordMessage' in error) {
                    createPasswordErrorElement.textContent = error['passwordMessage']
                    createPasswordErrorElement.classList.remove('d-none')
               }
               else {
                    createPasswordErrorElement.classList.add('d-none')
               }
               if ('networkNameMessage' in error) {
                    createNetworkNameErrorElement.textContent = error['networkNameMessage']
                    createNetworkNameErrorElement.classList.remove('d-none')
               }
               else {
                    createNetworkNameErrorElement.classList.add('d-none')
               }

          }
          else if ('validationRequired' in responseBody) {
               let validationRequired = responseBody['validationRequired']
               let validationUserAuth = validationRequired['userAuth']

               self.mount.render(new DialogCreateNetworkValidate(validationUserAuth))
          }
          else if ('network' in responseBody) {
               let network = responseBody['network']
               let networkName = network['name']

               setByJwt({network: {name: networkName}})
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
               code: validateCode
          }

          setTimeout(() => {
               let responseBody = MOCK_API_auth_validate(requestBody)
               self.handleSubmitResponse(responseBody)
          }, 1000);
     }
     self.handleSubmitResponse = (responseBody) => {
          if ('error' in responseBody) {
               let error = responseBody['error']
               let message = error['message']

               const validateErrorElement = self.element('validate-error')
               const validateCodeElement = self.element('validate-code')
               const validateButtonElement = self.element('validate-button') 
               const validateSpinnerElement = self.element('validate-spinner')

               validateErrorElement.textContent = message
               validateErrorElement.classList.remove('d-none')
               validateCodeElement.classList.remove('d-none')
               validateCodeElement.disabled = false
               validateButtonElement.disabled = false
               validateSpinnerElement.classList.add('d-none')
          }
          else if ('network' in responseBody) {
               let network = responseBody['network']
               let networkName = network['name']

               setByJwt({network: {name: networkName}})
               self.mount.render(new DialogComplete(networkName))
          } else {
               let message = 'Something went wrong. Please try again later.'

               const validateErrorElement = self.element('validate-error')
               const validateCodeElement = self.element('validate-code')
               const validateButtonElement = self.element('validate-button') 
               const validateSpinnerElement = self.element('validate-spinner')

               validateErrorElement.textContent = message
               validateErrorElement.classList.remove('d-none')
               validateCodeElement.classList.remove('d-none')
               validateCodeElement.disabled = false
               validateButtonElement.disabled = false
               validateSpinnerElement.classList.add('d-none')
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

          setTimeout(() => {
               let responseBody = MOCK_API_auth_validate_send(requestBody)
               self.handleResendResponse(responseBody)
          }, 1000)
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
     }
     self.router = (url) => {
          if (url.pathname == '/connect/signout') {
               removeByJwt()
               self.mount.render(new DialogInitial(false))
          }
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
                         <div><input id="${id('login-user-auth')}" type="text"/></div>
                         <div id="${id('login-error')}" class="text-danger d-none"></div>
                         <div><button id="${id('login-button')}" class="btn btn-primary" type="button"><span id="${id('login-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
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
                         <div><input id="${id('login-password')}" type="password"/></div>
                         <div id="${id('login-error')}" class="text-danger d-none">Invalid email or password</div>
                         <div><button id="${id('login-button')}" class="btn btn-primary" type="button"><span id="${id('login-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
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
                         <div><input id="${id('password-reset-user-auth')}" type="text" value="${escapeHtml(userAuthStr)}"/></div>
                         <div id="${id('password-reset-error')}" class="text-danger d-none">Invalid email or phone number</div>
                         <div><button id="${id('password-reset-button')}" class="btn btn-primary" type="button"><span id="${id('password-reset-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
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
                         <div><input id="${id('password-reset-password')}" type="password"/></div>
                         <div class="info-title">Re-enter New Password</div>
                         <div><input id="${id('password-reset-password-confirm')}" type="password"/></div>
                         <div id="${id('password-reset-error')}" class="text-danger d-none">Invalid email or phone number</div>
                         <div><button id="${id('password-reset-button')}" class="btn btn-primary" type="button"><span id="${id('password-reset-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
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
     }
     else if (authJwtType == 'apple') {
          authName = 'Apple'
     }
     else {
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
                         <div><input id="${id('create-user-name')}" type="text" value="${escapeHtml(userNameStr)}"></div>
                         <div class="info-title">Choose a network name</div>
                         <div><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname"/>.bringyour.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></div>
                         <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                         <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                         <div><label><input id="${id('create-agree-terms')}" type="checkbox" value="">I agree to the <a href="/terms.html" target="_blank">BringYour terms</a>. Learn about how we use and protect your data in our <a href="">Privacy Policy</a></label></div>
                         <div id="${id('create-error')}" class="text-secondary d-none"></div>
                         <div><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
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
                         <div><input id="${id('create-user-name')}" type="text"></div>
                         <div class="info-title">Email or Phone Number</div>
                         <div><input id="${id('create-user-auth')}" type="text" value="${escapeHtml(userAuthStr)}"></div>
                         <div id="${id('create-user-auth-error')}" class="text-danger d-none"></div>
                         <div class="info-title">Password</div>
                         <div><input id="${id('create-password')}" type="password"/></div>
                         <div id="${id('create-password-error')}" class="text-secondary d-none"></div>
                         <div class="info-title">Choose a network name</div>
                         <div><input id="${id('create-network-name')}" type="text" placeholder="yournetworkname"/>.bringyour.network<span id="${id('create-network-name-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></div>
                         <div id="${id('create-network-name-error')}" class="text-secondary d-none"></div>
                         <div id="${id('create-network-name-available')}" class="text-success d-none">Available!</div>
                         <div><label><input id="${id('create-agree-terms')}" type="checkbox" value="">I agree to the <a href="/terms.html" target="_blank">BringYour terms</a>. Learn about how we use and protect your data in our <a href="">Privacy Policy</a></label></div>
                         <div id="${id('create-error')}" class="text-secondary d-none"></div>
                         <div><button id="${id('create-button')}" class="btn btn-primary" type="button"><span id="${id('create-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Create Network</span></button></div>
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
     }
     else if (userAuthType(userAuth) == 'phone') {
          title = 'Validate your phone number'
     }
     else {
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
                         <div><input id="${id('validate-code')}" type="text"></div>
                         <div id="${id('validate-error')}" class="text-danger d-none"></div>
                         <div><button id="${id('validate-button')}" class="btn btn-primary" type="button"><span id="${id('validate-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Continue</span></button></div>
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
                    <div><br>Log in to the app to use your network.</div>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <a href=""><img src="../bringyour.com/res/images/store-play.png" class="store"></a>
                    <a href=""><img src="../bringyour.com/res/images/store-app.svg" class="store"></a>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <label><input type="checkbox" value=""> You can send me occasional product updates</label>
               </div>
          </div>
          <div class="login-option">
               <div class="login-container">
                    <a href="/connect/signout">Sign out</a>
               </div>
          </div>
          <div class="login-option">
               <div id="feedback-input" class="login-container">
                    <form id="feedback-form">
                         <div class="title">Can you take a minute to give us some feedback?</div>
                         <div>I use my network for 
                              <div><label><input type="checkbox" value=""> Personal</label></div>
                              <div><label><input type="checkbox" value=""> Business</label></div>
                         </div>
                         <div>The following use cases are valuable to me 
                              <div><label><input type="checkbox" value=""> Stay anonymous and private on the internet</label></div>
                              <div><label><input type="checkbox" value=""> Have verified safe internet everywhere</label></div>
                              <div><label><input type="checkbox" value=""> Access regional and international networks</label></div>
                              <div><label><input type="checkbox" value=""> Connect with my homes, friends and family</label></div>
                              <div><label><input type="checkbox" value=""> Control the use of data and apps on my network</label></div>
                              <div><label><input type="checkbox" value=""> Block ads</label></div>
                              <div><label><input type="checkbox" value=""> Block personal data collection parties</label></div>
                              <div><label><input type="checkbox" value=""> Help stay focused by temporarily blocking overused sites and content</label></div>
                              <div><label><input type="checkbox" value=""> Access private servers from anywhere</label></div>
                              <div><label><input type="checkbox" value=""> Run custom code and servers</label></div>
                              <div><label><input type="checkbox" value=""> Prevent cyber attacks like phishing</label></div>
                              <div><label><input type="checkbox" value=""> Audit usage of my network for compliance</label></div>
                              <div><label><input type="checkbox" value=""> Implement a zero-trust or secure business environment</label></div>
                              <div><label><input type="checkbox" value=""> Visualize and understand my network data</label></div>
                         </div>
                         <div>What do you want to do with your network?</div>
                         <div><textarea placeholder="I want to ..."></textarea></div>
                         <div><button id="${id('feedback-button')}" class="btn btn-primary" type="button"><span id="${id('feedback-spinner')}" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span><span class="primary">Submit</span></button></div>
                    </form>
               </div>
               <div id="feedback-done" class="login-container">
                    <div>&#128588; Thank you for the feedback! We value your input as we prioritize what to build next.
                    <div><br><a href="https://github.com/bringyour/product/discussions" target="_blank">Give us more feedback</a></div>
               </div>
          </div>
     `

     container.innerHTML = html
}


// API mocks

function MOCK_API_auth_login(requestBody) {
     let userAuth = requestBody['userAuth']
     let authJwt = requestBody['authJwt']
     let authJwtType = requestBody['authJwtType']

     // userAuth, authJwtType, authJwt, authAllowed=[], error={suggestedUserAuth, message}
     let responseBody
     if (authJwt) {
          responseBody = {
               authJwt: authJwt,
               authJwtType: authJwtType, 
               userName: 'Brien Colwell'
               // authAllowed: [authJwtType],
               // network: {
               //      name: 'brien'
               // }
          }
     }
     else if (userAuth == 'xcolwell@gmail.com') {
          responseBody = {
               userAuth: 'xcolwell@gmail.com',
               authAllowed: ['apple']
          }
     }
     else if (userAuth == 'brien@bringyour.com') {
          responseBody = {
               userAuth: 'brien@bringyour.com',
               authAllowed: ['password', 'apple', 'google']
          }
     }
     else if (userAuth == '5103408248') {
          responseBody = {
               userAuth: '+1 510-340-8248',
               authAllowed: ['password']
          }
     }
     else if (userAuth == '510') {
          responseBody = {
               error: {
                    suggestedUserAuth: '+1 510',
                    message: 'A full phone phone number with +x country code required. It looks like your country code is +1.'
               }
          }
     }
     else if (userAuth == 'xcolwell') {
          responseBody = {
               error: {
                    suggestedUserAuth: 'xcolwell@',
                    message: 'Invalid email.'
               }
          }
     } else {
          responseBody = {
               error: {
                    message: 'Invalid email or phone number.'
               }
          }
     }

     return responseBody
}


function MOCK_API_auth_login_password(requestBody) {
     let userAuth = requestBody['userAuth']
     let password = requestBody['password']

     // userAuth, validationRequired={userAuth}, network={name}, error={message}
     let responseBody
     if (password == 'test') {
          responseBody = {
               userAuth: userAuth,
               network: {
                    name: 'brien'
               }
          }
     }
     else if (password == 'test2') {
          responseBody = {
               userAuth: userAuth,
               validationRequired: {
                    userAuth: '+1 510-340-8248'
               }
          }
     }
     else {
          responseBody = {
               userAuth: userAuth,
               error: {
                    message: 'Invalid user or password.'
               }
          }
     }

     return responseBody
}


function MOCK_API_auth_validate_send(requestBody) {
     let userAuth = requestBody['userAuth']

     let responseBody = {}

     if ('+1 510-340-8248' == userAuth) {
          responseBody = {
               userAuth: '+1 510-340-8248'
          }
     }
     else {
          responseBody = {
               error: {
                    message: 'Invalid email or phone number'
               }
          }
     }

     return responseBody
}

function MOCK_API_auth_validate(requestBody) {
     let validateCode = requestBody['code']

     let responseBody

     if (validateCode == '123456') {
          responseBody = {
               network: {
                    name: 'brien'
               }
          }
     }
     else {
          responseBody = {
               error: {
                    message: 'Invalid code'
               }
          }
     }
     return responseBody
}

function MOCK_API_auth_password_reset(requestBody) {
     let userAuth = requestBody['userAuth']

     let responseBody = {}

     if ('+1 510-340-8248' == userAuth) {
          responseBody = {
               userAuth: '+1 510-340-8248'
          }
     }
     else {
          responseBody = {
               error: {
                    message: 'Invalid email or phone number'
               }
          }
     }

     return responseBody
}

function MOCK_API_auth_password_set(requestBody) {
     // note do not send userAuth back in this for security, in the case the reset link is leaked

     // resetCode, password
     let resetCode = requestBody['resetCode']
     let password = requestBody['password']

     let responseBody

     if (resetCode == '123456') {
          responseBody = {
               error: {
                    resetCodeError: true
               }
          }
     }
     else {
          responseBody = {
               complete: true
          }
     }

     return responseBody
}

function MOCK_API_auth_network_check(requestBody) {
     let networkName = requestBody['networkName']

     let responseBody
     if (['ahellaname', 'briencolwell'].includes(networkName)) {
          responseBody = {
               conflict: false
          }
     }
     else {
          responseBody = {
               conflict: true
          }
     }

     return responseBody
}

function MOCK_API_auth_network_create(requestBody) {
     // userName, userAuth, authJwt, password, networkName, terms

     let userName = requestBody['userName']
     let authJwt = requestBody['authJwt']
     let userAuth = requestBody['userAuth']
     let password = requestBody['password']
     let networkName = requestBody['networkName']
     let terms = requestBody['terms']

     // network: {name}, validationRequired: {userAuth}, error: {message, userAuthMessage, passwordMessage, networkNameMessage}
     let responseBody

     if (authJwt) {
          responseBody = {
               network: {
                    name: 'brien'
               }
          }
     }
     else if (userAuth == 'brien@bringyour.com') {
          responseBody = {
               validationRequired: {
                    userAuth: userAuth
               }
          }
     }
     else {
          responseBody = {
               error: {
                    userAuthConflict: true
                    // message: 'Something went wrong.'
               }
          }
     }
     
     return responseBody
}
