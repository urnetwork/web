

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
     let validateCode = requestBody['validateCode']

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

function MOCK_API_preferences_set(requestBody) {
     return {}
}

function MOCK_API_feedback_send(requestBody) {
     console.log(requestBody)
     return {}
}
