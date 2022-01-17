'use strict'
import path from 'path'
import http from 'http'

import express, { application } from 'express'

import { staticLocation } from './static/Static.mjs'
import Notes from './notes/Notes.mjs'


const PATH = '/'
const BIND_IP = '127.0.0.1'
const PORT = 3000
const DIR_ROOT = process.env.PWD
// const SITE_ROOT = path.resolve('../site')
// TODO think about allocating a 'public' directory? for resource acquisition without needing authoriziation?
const SITE_ROOT = path.resolve('site')  
// const NOTES_ROOT = 'note'
const NOTES_ROOT = ''

const makeStatic = staticLocation(SITE_ROOT)
// const staticApp = staticLocation('')
const mainRouter = express.Router()
const mainApp = express()

/* 
  Moving forward, will have to think about routing the app
  for distinguihsing what endpoints will hit the server,
  and what will hit the static content.

  I will attempt letting that design relax into place to
  find, over time, where dev effort is wasted vs what I
  think should be intuitive. To yield an informal framework
  of a kind.
*/
mainApp.use(makeStatic(NOTES_ROOT))
// mainApp.use(staticAppLocation(''))

// could server render the page here..! instead, directing a static resource.
// though, I could do, for example, check if the note exists or not, and provision
// if it doesn't. I think I'd like to. TODO
mainApp.get('/edit/:notename', async (req, res) => {
  console.log(`Requesting editor for ${req.params.notename}`)
  res.send('blank')

})


try {
  // mainApp.bind()
  http.createServer(mainApp).listen(3000, BIND_IP)

} catch (e) {
  console.error(e)
}

