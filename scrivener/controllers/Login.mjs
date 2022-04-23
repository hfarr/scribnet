
/**
 * Right so
 * 
 * I'm not going full hog MVC patterned out- yet. We'll see if that happens.
 * I'm octave-shift building out a miniframework and the shape of it eludes
 * me yet. Kinda along for the ride as much as I am the one driving.
 * so, this is a Login Controller, a classically MVC concept, because I need
 * to manage my complexity. Time will tell if it sticks.
 * 
 * Golly I probably should consider a 'controller pattern' at some point
 * Interesting to note, too, the separate paths of access- this is a meta
 * path. It controls aspects of the App itself. Whereas user content flows
 * through a "data" path we might say, which is where I have focused more
 * of my "framework mindset" (don't laugh) (again Im not trying to be 
 * "cs student that seeks to reinvent common backend framework patterns"
 * I just genuinely find that work interesting, sometimes more so than
 * business logic.)
 */

import crypto from 'crypto'

import express from 'express'

import { Login } from '../users/User.mjs'
import Dataccess from '../datasystem/Dataccess.mjs'

const LOGIN_FILE = `./data-folder/logins`

const loginApp = express()
const dataccess = await Dataccess.initFromFile(LOGIN_FILE)
dataccess.registerWithIndex(Login, "username", String)
// dataccess.registerWithIndex(User, "username", String)


const validTokens = new Set()

async function validateUsername(username) {
  // TODO accept international usernames (basically use more inclusive unicode classes for the regex)
  const usernameRegex = /^\w(\w|\d|_|-)*$/

  const alreadyTaken = await dataccess.has(Login, username)

  if (alreadyTaken) {
    return { isValid:false, reason: "Username taken" }
  }

  if (usernameRegex.test(username) && username.length > 0 && username.length <= 16) {
    return { isValid: true }
  }

  return { isValid:false, reason: "Please enter a valid username. A valid username uses only alphanumeric characters, letters, underscores, and hyphens." }
}


loginApp.use(express.json())
loginApp.post('/', async (req, res) => {


  const { username, password } = req.body

  if (req.session.user !== undefined) {
    // res.status(200).send()
    // return
    console.log("User", req.session.user.username, "attempting to log in again. Reloading session.")

    // should maybe do code here? or we await the session reload, by wrapping in a promise?
    req.session.reload(err => {
      if (err !== undefined) 
        console.log("Session destroy err: ",err)
    })
  }

  if (username === undefined || password === undefined) {
    res.status(401).send( { message: "Failed to login" } )
    return
  }

  // not concerned with timing attacks on usernames since that information is already revealed on signup
  // only the login.checkPassword method should always take the same amount of time
  const login = await dataccess.get(Login, username)
  if (login === undefined || !login.checkPassword(password)) {
    res.status(401).send( { message: "Failed to login" } )
    return
  }

  // not a very "rich" user object, TODO fetch from DB as well
  req.session.user = { username: username }
  res.status(200).send({ message: "Login succeeded.", redirect: "/app/notes"})

})

loginApp.post('/check', async (req, res) => {
  if (req.session.user !== undefined) {
    res.status(200).send( { loggedIn: true, username: req.session.user.username } )
    return
  }

  res.status(200).send( { loggedIn: false } )
})

loginApp.post('/signup', async (req, res) => {

  const { username, password, signupkey: token } = req.body

  if (token === undefined || !validTokens.has(token)) {
    res.status(401).send({ message: "Invalid sign up token", redirect: "/" })
    return
  }

  // validate username/pw
  if (username === undefined || password === undefined || username.length === 0 || password.length === 0) {
    res.status(401).send({ message: "Please enter a user name and a password" })
    return
  }

  const { isValid: isValidUsername, reason: usernameInvalidReason } = await validateUsername(username)
  if (!isValidUsername) {
    // res.status(401).send({ message: `Reason: ${usernameInvalidReason}` })
    res.status(400).send({ message: `Reason: ${usernameInvalidReason}` })
    return
  }

  // no password checks of any kind. Yet. You're on your own for now, users.

  validTokens.delete(token)

  const login = Login.newLogin(username, password);
  await dataccess.saveInstance(login)

  res.status(201).send({ message: 'Signup successful', redirect: "/" })
})

loginApp.post('/signup/token/create', (req, res) => {

  // TODO any user can create a sign up token which, generally, no they cannot.
  // but Im apparently not in my "permissions era" so its a free for all. For now...
  if (req.session.user === undefined) {
    res.status(401).send({})
    return
  }

  const token = crypto.randomUUID()
  validTokens.add(token)

  res.status(200).send( { token: token } )

})
loginApp.get('/signup/tokens', (req, res) => {

  // TODO any user can create a sign up token which, generally, no they cannot.
  // but Im apparently not in my "permissions era" so its a free for all. For now...
  if (req.session.user === undefined) {
    res.status(401).send({})
    return
  }


  res.status(200).send( { tokens: [...validTokens] } )

})


// this is for resources.mjs, my friend
export { dataccess as dataccessLogins }

export default function LoginController() {
  return loginApp
}


