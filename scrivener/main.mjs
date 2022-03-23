'use strict'
import path from 'path'
import http from 'http'
import fs from 'fs/promises'

import express, { application } from 'express'
import { graphqlHTTP } from 'express-graphql'
import cookieParser from 'cookie-parser'
import jwt from 'express-jwt'

import { staticLocation } from './static/Static.mjs'
// import { Notes } from './notes/NoteController.mjs'
import Note from './notes/Note.mjs'
import RouteNoteController from './notes/NoteController.mjs'
import Authenticator from './scopes/Access.mjs'
import Dataccess from './datasystem/Dataccess.mjs'
// import datasytem, { Dataccess, Datable } from './datasystem/Datable.mjs'

const PATH = '/'
const BIND_IP = '127.0.0.1'
const BIND_PORT = 3000
const DIR_ROOT = process.env.PWD

const ADMIN_SECRET = process.env.ADMIN_SECRET
const PUBLIC_SECRET = process.env.PUBLIC_SECRET ?? 'public'
const PUBLIC_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJwdWJsaWMifQ.oja9ZXRtjPLpuVpqSmZITSHm8lA4Y_Js5_nLifQl8jo'


// TODO think about allocating a 'public' directory? for resource acquisition without needing authoriziation?
const SITE_ROOT = path.resolve('site')  
// const NOTES_ROOT = 'note'
const NOTES_ROOT = ''
const EDIT_ROOT = 'edit'

const makeStatic = staticLocation(SITE_ROOT)
// const staticApp = staticLocation('')
const mainRouter = express.Router()
const mainApp = express()
mainApp.use(mainRouter)

const staticAll = makeStatic(NOTES_ROOT)
const staticEdit = makeStatic(EDIT_ROOT)

///// load all note files (for a premier vertical slice, all notes will be loaded, there is only one set of notes, viva la revolucion)
const NOTE_FOLDER = "note-folder" 
const DATA_FOLDER = "data-folder"
const DATA_DB_FILE = `${DATA_FOLDER}/dbfile`
// mmmm yeah. This file (that is, main.mjs) is like the early editor.njk, a kinda grunge forceps
// holding open meaty internals, taking whatever steps needed to exercise a maturing code base
// const names = await fs.readdir(NOTE_FOLDER)  // yeah I could jsut use fs and not the promise version. oh well.
// const notes = Notes.newNotes()
// for (const noteName of names) {
//   notes.update
// }
const dacc = await Dataccess.initFromFile(DATA_DB_FILE)
// dacc.register(Note)
dacc.registerWithIndex(Note, "name", String)

// const pairEm = (name, promise) => Promise.all([Promise.resolve(name), promise])

// const notes = await fs.readdir(NOTE_FOLDER)
  // .then( noteNames => Promise.all(noteNames.map(name => pairEm(name, fs.readFile(`${NOTE_FOLDER}/${name}`, {encoding: "utf-8" })))) )
  // .then( notesList => Notes.fromNotesMap(new Map(notesList)) )


// I am thinking presently... yes, we don't want to organize by functionality, or by 'layer', it's all about capabilities
// and interfaces. okay. So, a "notes controller" should probably own the responsibility of storing/saving notes. that in
// turn might go to a content managing module, but again I am imagining that saving/loading, reading/writing is incidental
// to a "Note", but a "Note" still knows it saves and loads. okay. So, some class might provide saving and loading 
// capabilities and it would make sense to segment that out. As opposed to "This is the module that manages all resources,
// when you register a resource you must also update these files xyz.." so we *will* split out handling i/o to a package
// or module. Provided we don't violate capab*boundaries* (capability boundaries)
// in other words, code like we have here - "wiring up" code - does violate that boundary. We're saying "A notes 
// controller spontaneously comes into existence with this piece of data", that data being a collection of notes, but it
// the 'wiring up' is, in my mind, notionally a part of a collection of notes. which might belong to something else, for
// example *this* notes controller belongs to the "main app" which is why the main app will specify parameters for the
// notes controller, but won't over-specify the details. Helpful for me to type it out.

console.log("Notes loaded")

/////

// TODO eventually I'd like the frontend to be a little more responsive to authorization
//  if user authorization fails it might take them to a dedicated page
//  most authorization should take place on a static page, for which access to the static
//  page itself is not blocked, but content that the page loads IS, in which case there are
//  two kinda views for the page. I see this as being managed by a custom component.

// authenticator that controls access to static resources

// TODO might be nice to decouple an authenticators actions for a given path from the authenticator
//  itself. That's a bit confusing, consider this example-
//  I log in to my account. I get a userAuthenticator. Access to my resources are controlled by that
//  authenticator. If it's a page resource, say I am an Admin user, then the authenticator might
//  default to returning pages on a failure. If it's an API resource, say my user data, then the auth
//  fail responses should be in JSON. But I'd like to log in with just /one/ authenticator and then
//  the resource access guides the actions. for now, auth will send a page, and if we hit with API
//  the reader will have to work off the response code.

//////

const StaticAuthenticator = class extends Authenticator {
  constructor() {
    super()

    const setUnauthPage = string => this.unauthPage = string

    fs.readFile(`${SITE_ROOT}/unauthorized/index.html`)
      .then(buf => buf.toString())
      .then(setUnauthPage)
  }
  invalidCredentialResponse() {
    return this.unauthPage
  }
  invalidSessionResponse() {
    return this.unauthPage
  }
}
const authenticator = new StaticAuthenticator()
// const authenticator = new Authenticator()
mainRouter.use('/private', authenticator.authApp)
// mainRouter.use('/edit', authenticator.authApp)  // should actually be an API thing
mainRouter.use('/login', authenticator.authApp)
mainRouter.get('/login', (req, res) => {
  res.redirect(301, "/")
})

// supplying a redirect param essentially prevents the default action. I think it would behoove me to
// make that a part of the Authenticator, which right now offloads a lot of work to a helper function
// that assigns all the routes.
console.log(`http://localhost:3000/login?${authenticator.accessParam}&redirect=note`)

/////



/* 
  Moving forward, will have to think about routing the app
  for distinguihsing what endpoints will hit the server,
  and what will hit the static content.

  I will attempt letting that design relax into place to
  find, over time, where dev effort is wasted vs what I
  think should be intuitive. To yield an informal framework
  of a kind.
*/
mainRouter.use(staticAll)
// mainApp.use(staticAppLocation(''))


// I don't know, at the moment, the appropriate level of abstraction to handle params- like, if a router would fit the model better
// mainRouter.param('notename')
mainRouter.param('notename', (req, res, next, noteName) => {
  // TODO add code to handle checking if note exists,
  // creating a new one if it doesn't...
  console.log(`Establishing ${noteName}`)
  req['noteName'] = noteName
  next()
}) 
// '/edit/:notename'
// What I'd like to do is offload the static fetching to a static app, for now, this has to suffice
// mainApp.use('/edit/:notename', staticAll) 
mainRouter.get('/edit/:notename', async (req, res) => {
  console.log(`Requesting editor for ${req.params.notename}`)
  res.sendFile(path.join(SITE_ROOT, EDIT_ROOT, "index.html"))  // TODO site organization. Can I finagle static renderer to work? I don't want it to request based on the parameter.

})


/*
  ===============
  !! API Stubs !!
  ===============
*/

const secretCallback = (req, payload, done) => {
  if (payload['aud'] === 'public') return done(null, PUBLIC_SECRET)

  return done(null, ADMIN_SECRET)
}

const getToken = (req) => {
  if (req.headers.authorization !== undefined && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1]
  } else if (req.query?.token !== undefined) {
    return req.query.token
  } else if (req.cookies['__scrivener_token'] !== undefined) {
    return req.cookies['__scrivener_token']
  }
  
  // return PUBLIC_TOKEN 
  return null
}

console.log('secret:', ADMIN_SECRET)
// mainApp.use('/api', express.json())
// sigh

// TODO
// BOTH! I'll use JWTs AND simpler session IDs. no one can stop meeee
// https://graphql.org/graphql-js/authentication-and-express-middleware/
// https://github.com/expressjs/session
// okay for understanding, the main reason is I like the idea of JWTs to
// enable programmable access to the API and a possible "oauth" 
// situation in the future. Sessions though for users and clients 
// because we don't need the extra complexity. I have been convinced.
// as a point of order it's true that we could distribute a traditional
// API key as well and obviate JWTs entirely.
// but 
//  1) they're interesting to me
//  2) I do like the statelessness even though it's not needed. I don't
//    plan to store sessions based on JWT authentication, the JWTs will
//    authenticate on each request. if we need to revoke a token then
//    that's pretty doable too, and yes that's "stateful" to a degree.
//    see I think a simple way would be to remove the secret key (or
//    request that the dynamic source of the keys remove it). Or store
//    "revocation" information. Main point is that it's not about the
//    session, its about the authentication activity. This point isn't
//    super compelling, even to me ha. Perhaps I should contemplate
//    more.
//
// merr http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/
//  https://datatracker.ietf.org/doc/html/rfc7519
//  http://cryto.net/%7Ejoepie91/blog/2016/06/19/stop-using-jwt-for-sessions-part-2-why-your-solution-doesnt-work/
//  seems like. okay. Not "seems like". The impression I get is the
//  author agrees with JWTs as assertions of permissions. "This user
//  has these permissions". That's not a session per se it's more like
//  a permanent credential, certificate. 
//  Still suffers a revocation issue I'd say, but the validation of the
//  token, performed on the resource server, can involve communicating
//  back to the authentication server. Here the authentication server
//  can deny handing out a key, for example, because it does statefully
//  track client validity. In that case, we can imagine the token is
//  able to be turned "on and off" based on whether the authentication
//  server hands out the key or not. Lower the permission of a client,
//  toss out the key. Temporarily disable, stop handing out keys for
//  that client.
//  here the concept of "session" isn't relevant. Right? we aren't
//  talking about a "user" and as far as I know "session" isn't really
//  applicable to APIs (not that you couldn't implement that.)
//  It's a combination of sessions and tokens, which I feel is the key
//  or...
//  Not sessions. It's tokens and something else.
// and...
//  JWTs can also stand on their own. I'd like to refine this idea.
//
// more reading https://blog.logrocket.com/jwt-authentication-best-practices/#tl-dr-what-are-they-good-for
//  read this one before the cryto guy but I think it linked to cryto
//  https://developer.okta.com/blog/2017/08/17/why-jwts-suck-as-session-tokens
//  "3 or more parties involved in a request" this covers OAUTH use
//  cases I reckon. See and it hits that sweet spot of combining with
//  something stateful. A user, an API, a 3rd party application. auth
//  server can track client ids (of the application) and revoke based
//  on those, users can control the privleges. But I guess it's still..
//  just as simple, if not simpler, to simply send the client id/secret
//  each time? Fetching a token, it would seem to act identically to
//  having a username/password.
//  like, the permissions checking happens anyway when the data are
//  sent. Oh me of little faith. What advantages to JWTs make them
//  worth the tradeoffs? are there any "perfect" use cases where
//  something else isn't better? is asking these questions limiting
//  "the scope of my imagination"?
//  I guess Single Sign On? But the auth server can hand back any
//  piece of signed data, identifying a user. It's still up to each
//  resource server to check authorization.

//  from https://developer.okta.com/blog/2017/08/17/why-jwts-suck-as-session-tokens
//  again, in a comment, "JWTs were not designed for this purpose—
//  they were designed to pass signed data around between untrusted
//  parties"
//  I think there's a bit of a communication barrier. Between me and
//  the authors, those rascalls. It often feels like they're disagreeing
//  with their own points but I need some more comprehension to
//  sift through, not sure it's exactly an issue on their end but.
//  I am feeling mixed messaging. Not sure. I am tired. Sign off.

// sorry https://jwt.io, Im not friends with https://token.dev/


mainRouter.use('/api',
  cookieParser(),
  jwt({ 
    secret: secretCallback, 
    algorithms: ['HS256'],
    credentialsRequired: !(process.env.DEVELOPMENT === 'true'),
    getToken: getToken
  }),
  (req, res, next) => {
  // res.set('Content-Type', 'application/json')
  console.log('JWT Payload', req.user)
  next()
})

import gqlObj from './resources.mjs'
console.log(`DEVELOPMENT: ${process.env.DEVELOPMENT}`)
const gqlArgs = { ...gqlObj, graphiql: process.env.DEVELOPMENT === 'true' }
mainRouter.use('/api/graphql', graphqlHTTP(gqlArgs))

// mainRouter.use('/api', allNotesAPI.app)
// temp
const publicNotes = express.Router()
publicNotes.use('/', (req, res, next) =>{
  res.set('Content-Type', 'application/json')
  console.log("Request received", req.method, req.originalUrl)
  next()
})
publicNotes.use('/', express.json())
publicNotes.get('/notes', (req, res) => {
  const data = dacc.getIndexList(Note)
  res.status(200).send(data)
})
publicNotes.use('/note/:noteName', 
  (req, res, next) => {
    const replaced = req.params.noteName.replace(/%20/g, "-")
    req.params.noteName = replaced
    next()
  }, 
  express.text('utf-8')
  )
publicNotes.get('/note/:noteName', async (req, res) => {
  const data = await dacc.get(Note, req.params.noteName)
  if (data === undefined) {
    res.status(404).send({ error: `No note called '${req.params.noteName}'` })
    return
  }
  res.status(200).send(data)
})
publicNotes.put('/note/:noteName', async (req, res) => {
  const data = dacc.update(Note, req.params.noteName, req.body)

  if (data === undefined) {
    res.status(404).send(`No note called '${req.params.noteName}'`)
    return
  }

  res.status(200).send('OK')
})
publicNotes.post('/note/:noteName', async (req, res) => {
  // shenanigans would ensue if names disagreed, we override it.
  // in another world we would just post('/note') and take the
  // name from the body. Might prefer that.
  const data = { ...req.body, name: req.params.noteName }

  await dacc.create(Note, data)
  res.status(200).send('OK')
})
mainRouter.use('/api', publicNotes)

const devOnly = express.Router()
mainRouter.use('/api', devOnly)
devOnly.post('/db-reload', async (req, res) => {
  res.status(200).send('OK')
  await fs.copyFile(`${DATA_FOLDER}/dbfile.bkp`, `${DATA_FOLDER}/dbfile`)
})


// mainApp.get('/api/notes', async (req, res) => {
//   // likely need to pass url-safe over these, so we can have all valid filenames (spaces come to mind)
//   res.status(200).send( ['test', 'a-note'] )
// })

// Note that this request is also subject to 'param' above.
// One thing using a router would get us is parameter name isolation,
// right now I'm not sure if I want the "establishing" step for the
// parameter to happen both above and here
// mainApp.get('/api/note/:notename', async(req, res) => {
//   // use the loader. Prework that in the param handler?
//   res.status(200).send( { name: req.noteName, content: `<h2>${req.noteName}</h2><p>Anynote</p>` } )
// })


try {
  // mainApp.bind()
  http.createServer(mainApp).listen(BIND_PORT, BIND_IP)

} catch (e) {
  console.error(e)
}

