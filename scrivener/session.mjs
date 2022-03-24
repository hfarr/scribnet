'use strict'

import { randomUUID } from 'crypto'

import session from 'express-session'
import cstore from 'cluster-store'

// see https://github.com/expressjs/session for configuring session

class User {

  constructor() {

    this.sessions = []
  }

  get activeSessions() {
    return this.sessions
  }

  createSession() {

  }
}

// TODO define login part of app here?

const sess = {
  secret: process.env.SESSION_SECRET,
}
if (process.env.NODE_ENV !== 'development') {
  console.log('TODO integrate with a proper session store')
  sess.store = undefined
}

const sessionObj = session(sess)

const sessionWrapper = (req, res, next) => {

  // golly, I don't think this is a great way to use middleware. hm!
  return sessionObj(req, res, next)
}

export default sessionObj
// export default sessionWrapper
