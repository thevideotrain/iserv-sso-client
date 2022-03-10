const { Issuer, generators } = require('openid-client')

class User {
    constructor (tokenSet, ssoClient) {
        this.tokenSet = tokenSet
        this.ssoClient = ssoClient

        this.claims = this.tokenSet.claims()

        this.accessToken = this.tokenSet.access_token
        this.refreshToken = this.tokenSet.refresh_token
        this.accessTokenExpireDate = new Date(tokenSet.expires_at * 1000)
        this.roles = this.claims.roles.map(role => role.id)
        this.email = this.claims.email
        this.username = this.claims.preferred_username
    }

    getEmail () {
        return this.email
    }

    getUsername () {
        return this.username
    }

    getRoles () {     
        return this.roles
    }

    getAccessToken () {
        return this.accessToken
    }

    getRefreshToken () {
        return this.refreshToken
    }

    getAccessTokenExpireDate () {
        return this.accessTokenExpireDate
    }

    getAccessTokenExpireCountdown () {
        return ((this.getAccessTokenExpireDate().getTime() - new Date().getTime()) - 5*1000*60)
    }

    async refreshAccessToken () {
        const tokenSet = await this.ssoClient.client.refresh(this.refreshToken)
        this.tokenSet = tokenSet
        this.claims = this.tokenSet.claims()

        this.accessToken = this.tokenSet.access_token
        this.refreshToken = this.tokenSet.refresh_token
        this.accessTokenExpireDate = new Date(tokenSet.expires_at * 1000)
        this.roles = this.claims.roles.map(role => role.id)
        this.email = this.claims.email
        this.username = this.claims.preferred_username
    }
}

class SSOClient {
    constructor (options) {
        this.iserv = options.iserv.startsWith('https://') ? options.iserv : 'https://' + options.iserv
        this.clientId = options.clientId
        this.clientSecret = options.clientSecret
        this.redirectUri = options.redirectUri
    }

    async init () {
        this.issuer = new Issuer({
            issuer: this.iserv,
            authorization_endpoint: this.iserv + '/iserv/oauth/v2/auth',
            token_endpoint: this.iserv + '/iserv/oauth/v2/token',
            jwks_uri: this.iserv + '/iserv/public/jwk',
            userinfo_endpoint: this.iserv + '/iserv/public/oauth/userinfo',
        })

        this.client = new this.issuer.Client({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uris: [this.redirectUri],
            response_types: ['code']
            // id_token_signed_response_alg (default "RS256")
            // token_endpoint_auth_method (default "client_secret_basic")
        })
    }

    getRedirector () {
        const code_verifier = generators.codeVerifier()
        const code_challenge = generators.codeChallenge(code_verifier)
        const url = this.client.authorizationUrl({
            scope: 'openid email profile roles',
            resource: this.iserv,
            code_challenge,
            code_challenge_method: 'S256',
        })

        return {
            redirectUri: url,
            codeVerifier: code_verifier
        }
    }

    async fetch (req, codeVerifier) {
        try {
            const params = this.client.callbackParams(req)
            const tokenSet = await this.client.callback(this.redirectUri, params, { code_verifier: codeVerifier })

            return new User(tokenSet, this)
        } catch (err) {
            // console.error('[SSOClient] fetch error:', err)
            return 'ERR'
        }
    }
}

module.exports = SSOClient