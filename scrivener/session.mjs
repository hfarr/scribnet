'use strict'

import { randomUUID } from 'crypto'

import session from 'express-session'

// see https://github.com/expressjs/session for configuring session
// TODO define login part of app here?

const sess = {
  resave: false,  // it's okay to be false if the store implements the touch method, which we want
  saveUninitialized: false, // note some laws require user permission before saving a session. When false, no cookie is set unless a change is made to the session
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 24*60*60*1000 }
}
if (process.env.NODE_ENV !== 'development') {
  console.log('TODO integrate with a proper session store')
  sess.cookie.secure = true
} else {
  // TODO to enable this we need to set trust proxy, since scrivener is behind a proxy
  // sess.cookie.secure = true
}

const sessionObj = session(sess)

const sessionWrapper = (req, res, next) => {

  // golly, I don't think this is a great way to use middleware. hm!
  return sessionObj(req, res, next)
}

export default sessionObj
// export default sessionWrapper
