'use strict'
import path from 'path'
import http from 'http'
import fs from 'fs/promises'

import express, { application } from 'express'

import { staticLocation } from './static/Static.mjs'
import { Notes } from './notes/NoteController.mjs'
import RouteNoteController from './notes/NoteController.mjs'


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

const allNotesAPI = RouteNoteController.wrapNotes(notes)

console.log("Notes loaded", notes)

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
mainApp.use(staticAll)
// mainApp.use(staticAppLocation(''))


// I don't know, at the moment, the appropriate level of abstraction to handle params- like, if a router would fit the model better
// mainRouter.param('notename')
mainApp.param('notename', (req, res, next, noteName) => {
  // TODO add code to handle checking if note exists,
  // creating a new one if it doesn't...
  console.log(`Establishing ${noteName}`)
  req['noteName'] = noteName
  next()
}) 
// '/edit/:notename'
// What I'd like to do is offload the static fetching to a static app, for now, this has to suffice
// mainApp.use('/edit/:notename', staticAll) 
mainApp.get('/edit/:notename', async (req, res) => {
  console.log(`Requesting editor for ${req.params.notename}`)
  res.sendFile(path.join(SITE_ROOT, EDIT_ROOT, "index.html"))  // TODO site organization. Can I finagle static renderer to work? I don't want it to request based on the parameter.

})

/*
  ===============
  !! API Stubs !!
  ===============
*/

// mainApp.use('/api', express.json())
mainApp.use('/api', (req, res, next) => {
  res.set('Content-Type', 'text/json')
  next()
})
mainApp.use('/api', allNotesAPI.app)

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

