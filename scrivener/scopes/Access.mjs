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

const checkAuthorized = sessionSecret => {
  if (sessionSecret !== undefined) {  // We have a cookie
    return Authenticator.authorize(sessionSecret)
  }
  return false
}

const authenticator = authenticator => (req, res, next) => {
  const sessionSecret = req.cookies[COOKIE_NAME]
  const { accessSecret, redirect } = req.query

  if (checkAuthorized(sessionSecret)) {
    if (redirect !== undefined) {
      res.redirect(302, redirect)
    } else {
      next()
    }
    return
  }
  if (accessSecret !== undefined && authenticator.urlLogin(accessSecret)) {
    const tok = authenticator.generateToken()
    res.cookie(COOKIE_NAME, tok, { httpOnly: true })

    // may not want to redirect for a capability URL. or use a smarter redirect mechanism.
    if (redirect !== undefined) {
      res.redirect(302, redirect)
      return
    }
    // Maybe default to an a redirect specified by authenticator? Probably 'next' is best, more
    // composable.
    next()
    return
  }
  // should probably distinguish 401, 403
  res.status(401)
  res.send(authenticator.invalidCredentialResponse())
  return
}

export const authorize = (invalidResponse = "Unauthorized") => (req, res, next) => {
  if (req.cookies === undefined) {
    cookieParser()(req, res, ()=>{})
  }

  const sessionSecret = req.cookies[COOKIE_NAME]
  if (checkAuthorized(sessionSecret)) {
    next()
    return
  }
  res.status(401).send(invalidResponse)
}

// probably what's tricky with scopes and not individualizing
// is you can share your access with anyone. Unless we obscure
// the credential from local, i.e, if you are granted access
// to a scope you have to "sign" it with personal credentials,
// so it becomes the same risk as anywhere else.
export const authenticate = (secret) => {

}

const SECRET = Buffer.from('super secure')

// TODO okay. With a move to a static "Authenticator" a lot of code doesn't make sense now.
// For example each authenticator instance has its own login token but they all create new
// sessions on a global list of sessions. Not getting closer to my vision on how Auth can be
// hooked up so I'm leaving as is. Presently Authorization is a binary state, you either are
// or are not authorized, without any association to identity. This is sufficient for now.
// N.B  I should sort through the vocabularly between Authorize and Authenticate which are
//      different ideas. 
// Moreover I need to take a good think about what I want this to look like. I like the idea
// of flexibility creating/revoking capability URLs. And I to create a system that supports
// a simple interface for a data & access model. Im not on track for either of those as I'm
// still also concerned with the front end. For now I'm okay with the binary model.
export default class Authenticator {

  constructor() {

    // this.sessions = {}
    // stateless sessions. if the client has the cookie they can access the resources. Simplistic. 
    // Do a security analysis at some point.
    // this.activeTokens = new Map()
    // this.accessKey = createAccessKey()

    // Issues with a map- checking for presence of key in the map is non constant.
    // fetching from the map is really an authorization step. instead we might want
    // to look at a hash n' verify, then fetch from the database
    this.scopes = new Map()

    // console.log("Login url", `http://localhost:3000/scrivener/?accessSecret=${this.accessKey.toString()}`)

    this.authApp = express()
    this.authApp.use(cookieParser(), authenticator(this))
    // tokenAuth(this)
  }

  addScope(scope) {

  }

  //-------------

  routeAuthority() {

    return (req, res, next) => {

    }
  }
}

// Decisions for simplicity. KISS I guess.

// 1) Attach authentication middleware to the root
// 2) Don't mess around with generating routes (for *now*)
// 3) Authorize access for a resource in the route middleware.
//    Successive handlers will assume the user is authorized.

/* okay. The verification flow (authentication) will look like this

  In order to... well, show that I am listening to my own concerns about
  timing attacks, authentication has to be a completely distinct step from
  authorization. By which I mean if a user authenticates successfully vs
  the flow would have, in my first impression, continued on to accessing
  the resources. Instead I'm going to issue a token in response to the
  authorization request. The token can then be traded in for resource 
  access.
  Gotta say though, wouldn't tokens be vulnerable to timing attacks too?
  won't we still have to verify? yes, and the distinction is maybe that...
  we are a little more in control there.
  I could be off base but this sounds right. Requests will all carry the
  session information, for our purposes a token that accesses a set of
  permissions. The token has to be verified.
  also- huh! https://www.w3.org/TR/2021/REC-webauthn-2-20210408/
  imagine that, a bit of a lil search around turns up something useful.
  That URL is the latest version but this one https://www.w3.org/TR/webauthn-2/
  updates when a new webauthn is published.
  see also the editors draft (as of jan 2022, this is draft) https://w3c.github.io/webauthn/

  Okay. I'm implementing the Relying Party. Im not sure that's in scope for
  the document. Though... heh. Should read it.

  First blush. This is a w3c rec, it's about the browser side of the ordeal.
  securely creating credentials. Important but possibly beyond what I'm
  trying to do right now, which is grant credentials based on a capability
  URL. In my case the server is handing over the information the client
  needs to authorize later, but I see it making sense if the browser were
  to create credentials and we then use that. hmm.

  re: above with time safe equals. I think we're fine (be gentle) so long 
  as the use of the secret information is an input to key verification
  only. If more resources are accessed *after* that, lenghening the request,
  are we good? Or does that fall under Not Good because a request takes
  different amounts of time based on valid or invalid credentials? I'm
  confused because that seems like the request /has/ to. You can't serve
  resources until you are sure the user is authenticated/authorized for
  them. But if they aren't then you cut them off earlier. Still feels
  vulnerable to an attack even if the instructions verifying the secret
  are identical. hm.
  maybe its okay because- ALL invalid checks fit the "constant time"
  criteria (meaning, the time taken to verify credentials is not 
  dependent on the secret). Really its stricter. Golden rule:
    Secret information may only be used in an input to an instruction if 
    that input has no impact on what resources will be used and for how long.
  Where I think I'm /ok/ is in the secret information is not used after its
  checked. That is, we pass a "constant time gate". If the attacker gets
  closer to guessing the password it doesn't affect the time it takes them
  to get blocked by the gate. If they guess correctly, going through the
  gate takes the same amount of time, then it can take as long as it needs
  past the gate because only hte gate guard looks at the credentials.
  right? I'm getting paranoid about.. everything.
  
  which parts of WebAuthn would I be responsible for, working on the side
  of the relying party, and what's for the browser? What does the JS client
  code need to do?
  ex. Do I write the "Authenticator" (I'd think not)?
  An authenticator is abstract. It could be e.g a hardware device, 2fa
  app, and I'm guessing it covers my plans- cookie tokens.
  Yeah, mine would be a "platform authenticator" vs a "roaming" one. 
  Platform operates here to mean "part of the client device" i.e the browser
  (right?)
  okay- this https://www.w3.org/TR/webauthn-2/#sctn-spec-roadmap is a clearer
  call to action outlining my involvement as a "Web author"
  It additionally links out to mdn https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
  okay- concerned because it precludes, apparently, passwords. which is.
  kinda what I want. rrrrgh

  Relevance for the relying party
  Relying party operations https://www.w3.org/TR/webauthn-2/#sctn-rp-operations
  introduction of https://www.w3.org/TR/webauthn-2/#sctn-api
  security considerations https://www.w3.org/TR/webauthn-2/#sctn-security-considerations-rp

  implement a "simplistic authenticator", push a one-time url to discord
  that can be used to register and get credentials on the browser.
  clear cookies, need a new one, can request.
  piggybacks on discord
  
  discord auth heh. I like it, it would be an option. You know. I'm kinda getting
  into this spec.
*/


