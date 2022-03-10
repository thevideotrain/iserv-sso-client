# iserv-sso-client

An inofficial client for IServ Oauth2 / Single-Sign-On / OpenID Connect

# How to use

First you'll need to create a IServ SSO Application. This is documented [here](https://doku.iserv.eu/manage/system/sso/)

You should set **Vertrauenswürdig** to **Ja** and choose the scopes **E-Mail, OpenID, Profil, Rollen**

Copy the **Client-ID** and **Client-Geheimnis** you'll need this for your app.

# Example App using Express
```js
const SSOClient = require('iserv-sso-client') // Import SSO Module
const express = require('express') // Web Server
const session = require('express-session') // Needed to store codeVerifier in session
const app = express() // Create Web Server

app.use(session({
  secret: 'ENTER RANDOM LETTERS HERE',
  resave: false,
  saveUninitialized: true
})) // Activate Session

// Create new SSO Client
const ssoClient = new SSOClient({
    iserv: 'mein-iserv.de', // It is important to type the url like this without a slash at the end and no https:// in the beginning
    clientId: 'YOUR CLIENT ID HERE',
    clientSecret: 'YOUR CLIENT SECRET/GEHEIMNIS HERE',
    redirectUri: 'http://localhost/openid-granted',
})

async function main() {

await ssoClient.init() // Initialize SSO Client (IMPORTANT: Use await here)

app.get('/', (req, res) => {
    res.redirect('/login')
})

app.get('/login', (req, res) => {
    const redirector = ssoClient.getRedirector() // Get Redirector
    req.session.codeVerifier = redirector.codeVerifier // Store codeVerifier in session
    res.redirect(redirector.redirectUri) // Redirect client
})

app.get('/openid-granted', async (req, res) => {
    const codeVerifier = req.session.codeVerifier // Get codeVerifier from session

    const user = await ssoClient.fetch(req, codeVerifier) // Fetch User (IMPORTANT: Use await here)
    
    if (user === 'ERR') return res.send('An error occured') // If an error occured, return error message (IMPORTANT: If no error handling is implemented, your app will crash)
    
    res.send(`
        <h1>Hi, ${user.getUsername()}</h1>
        <p>Your email is ${user.getEmail()}</p>
        <p>Your roles are ${user.getRoles()}</p>
        <p>You'll need to refresh your access token in: ${user.getAccessTokenExpireCountdown()}ms</p>
    `) // Send UserData
})

app.listen(80, () => console.log('Listening on port 80'))

}

main()
```

**For this script we use the callback /openid-granted so you need to set** _http://localhost/openid-granted_ **as the Redirect URL in your code and your IServ SSO Application**
**You also need to change the CLIENT ID and CLIENT SECRET**

# Refreshing an access token
In the callback after you've got the User I recommend to use setInterval to request an new access token every 55 Minutes

```js
setInterval(async () => {
    await user.refreshAccessToken()
}, 55 * 60 * 1000)
```

[Docs](https://github.com/thevideotrain/iserv-sso-client/wiki//)