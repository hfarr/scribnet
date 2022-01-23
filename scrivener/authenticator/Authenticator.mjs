/* 
  File: Authenticator.mjs

  This module implements authorization. Right now we are exclusively using URLs to access
  restrictred resources. I found this neato page that captures what I want fairly effectively
  https://www.w3.org/TR/capability-urls/

  We are doing what is /not/ recommended—using the urls as "permanent" secrets for accessing
  resources. As far as I can tell the only insecurity is when a user chooses to share the
  URL. I am not sure of vulnerabilities that could cause a URL to be stolen except by client
  side javascript? Like I am pretty sure (I would HOPE at least!) URLs between tabs are 
  secret from each other. That said this is not a longterm stance, I want to incorporate
  multiple forms and maybe even make these one-use.
  Ah, some insecurities:
   * plugins
   * links to offsite accessed from pages visited via capability url (HTTP "Referer" header)
  
  Well, that's why it's good for one-use situations. get a session cookie and you're good to
  go. My long term posture will likely be use a capability URL to grant one-time access to a
  resource. That could be a long-term session cookie or a password reset page.

  Also in the short term, we are generating access tokens from a capability URL, like a 
  Bearer token for OAUTH except I'm using cookies and not HTTP headers for authorization.

  https://oauth.net/2/
  https://oauth.net/getting-started/
  Im going to be a little podunk for now
 */
'use strict';

import crypto from 'crypto'

import express from 'express'
import cookieParser from 'cookie-parser'


// this would traditionally be a one-time URL you might send in an email to, e.g, reset a password
// here, when accessed it generates an access token for a client, but can be re-used.
const createAccessKey = () => {
  return Buffer.from(crypto.randomUUID())
}

const createSessionSecret = () => {
  return crypto.randomUUID()
}

const COOKIE_NAME = '__scrivener_sessionSecret'

function tokenAuth(authenticator) {
  // parse out cookies
  authenticator.authApp.use(cookieParser())
  authenticator.authApp.use('/', (req, res, next) => {
    const { accessSecret, redirect } = req.query
    if (accessSecret !== undefined) {
      if (authenticator.urlLogin(accessSecret)) {
        const tok = authenticator.generateToken()
        res.cookie(COOKIE_NAME, tok, { httpOnly: true })
        // TODO a better redirect? maybe in the query param.
        //  also, we might have different kinds of authorizations, this is authorization of the
        //  user. It implicitly authorizes their javascript.
        //  My gripe right now is that we don't have a way to configure auth flows, and I think
        //  I want some flexibility. For example a JS authorization without reloading a page,
        //  so the client javascript knows the secret. Hmm. Need to think on it more.
        //  This "low-friction" account style works well for my main access control use case, I
        //  think it's okay to keep it.
        //  Hmm, does "fetch" automatically use the httpOnly cookies?
        //  actually I think fetch might let us do user login without page reloads. Gotta explore.

        // may not want to redirect for a capability URL. or use a smarter redirect mechanism.
        if (redirect !== undefined) {
          res.redirect(302, redirect)
          return
        }
        // Maybe default to an a redirect specified by authenticator? Probably 'next' is best, more
        // composable.
        next()
      } else {
        res.status(403)
        res.send(authenticator.invalidCredentialResponse())
      }
      return
    }

    // otherwise...

    // TODO separate middleware?
    const sessionSecret = req.cookies[COOKIE_NAME]
    if (sessionSecret !== undefined) {  // We have a cookie
      if (authenticator.authorize(sessionSecret)) {
        next()
        return
      }
    }
    res.status(401).send(authenticator.invalidSessionResponse())
  })

}

export default class Authenticator {

  constructor() {

    // this.sessions = {}
    // stateless sessions. if the client has the cookie they can access the resources. Simplistic. 
    // Do a security analysis at some point.
    this.activeTokens = new Map()
    this.accessKey = createAccessKey()


    // console.log("Login url", `http://localhost:3000/scrivener/?accessSecret=${this.accessKey.toString()}`)

    this.authApp = express()
    tokenAuth(this)
  }

  get accessParam() {
    return `accessSecret=${this.accessKey.toString()}`
  }

  // Want to override with, like. A page.
  invalidSessionResponse() {
    return "Invalid session"
  }

  invalidCredentialResponse() {
    return "Invalid credential"
  }

  /**
   * Called when a user authenticates
   * 
   * By e.g a link or user/pass login
   */
  generateToken() {
    const token = createSessionSecret();

    // we would store the hashed token (a secret) in case of a leak. for in memory
    // I'm going to insecurely store it plain.
    // using a map, not a set, in case I wan't to put some metadata like expiration.
    this.activeTokens.set(token, "")

    return token
  }

  authorize(token) {

    // crypto secure surely :I
    return this.activeTokens.has(token)

  }

  urlLogin(loginSecret) {
    const buffer = Buffer.from(loginSecret)
    return crypto.timingSafeEqual(buffer, this.accessKey)
  }
}




