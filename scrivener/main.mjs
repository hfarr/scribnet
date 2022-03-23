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

