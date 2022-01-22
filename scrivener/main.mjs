'use strict'
import path from 'path'
import http from 'http'
import fs from 'fs/promises'

import express, { application } from 'express'

import { staticLocation } from './static/Static.mjs'
import { Notes } from './notes/NoteController.mjs'
import RouteNoteController from './notes/NoteController.mjs'
import Authenticator from './authenticator/Authenticator.mjs'

const PATH = '/'
const BIND_IP = '127.0.0.1'
const PORT = 3000
const DIR_ROOT = process.env.PWD
// const SITE_ROOT = path.resolve('../site')
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
// mmmm yeah. This file (that is, main.mjs) is like the early editor.njk, a kinda grunge forceps
// holding open meaty internals, taking whatever steps needed to exercise a maturing code base
// const names = await fs.readdir(NOTE_FOLDER)  // yeah I could jsut use fs and not the promise version. oh well.
// const notes = Notes.newNotes()
// for (const noteName of names) {
//   notes.update
// }

const pairEm = (name, promise) => Promise.all([Promise.resolve(name), promise])

const notes = await fs.readdir(NOTE_FOLDER)
  .then( noteNames => Promise.all(noteNames.map(name => pairEm(name, fs.readFile(`${NOTE_FOLDER}/${name}`, {encoding: "utf-8" })))) )
  .then( notesList => Notes.fromNotesMap(new Map(notesList)) )

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
const allNotesAPI = RouteNoteController.wrapNotes(notes)

console.log("Notes loaded", notes)

/////

// TODO eventually I'd like the frontend to be a little more responsive to authorization
//  if user authorization fails it might take them to a dedicated page
//  most authorization should take place on a static page, for which access to the static
//  page itself is not blocked, but content that the page loads IS, in which case there are
//  two kinda views for the page. I see this as being managed by a custom component.
const authenticator = new Authenticator()
mainRouter.use('/private', authenticator.authApp)

console.log(`http://localhost:3000/private?${authenticator.accessParam}`)


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

// mainApp.use('/api', express.json())
mainRouter.use('/api', (req, res, next) => {
  res.set('Content-Type', 'text/json')
  next()
})
mainRouter.use('/api', allNotesAPI.app)

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
  http.createServer(mainApp).listen(3000, BIND_IP)

} catch (e) {
  console.error(e)
}

