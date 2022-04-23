'use strict'
import path from 'path'
import http from 'http'
import fs from 'fs/promises'

import express, { application } from 'express'
import { graphqlHTTP } from 'express-graphql'
import cookieParser from 'cookie-parser'

import { staticLocation } from './static/Static.mjs'
import session from './session.mjs'

import LoginController from './controllers/Login.mjs'

const PATH = '/'
const BIND_IP = process.env.BIND_IP ?? '127.0.0.1'
const BIND_PORT = process.env.BIND_PORT ?? '3000'

// TODO think about allocating a 'public' directory? for resource acquisition without needing authoriziation?
const SITE_ROOT = path.resolve('site')  
// const NOTES_ROOT = 'note'
const NOTES_ROOT = ''
const EDIT_ROOT = 'edit'

const makeStatic = staticLocation(SITE_ROOT)
// const staticApp = staticLocation('')
const mainRouter = express.Router()
const mainApp = express()
mainApp.use(express.json({limit: '50mb'}))
mainApp.use(mainRouter)

const loginApp = LoginController()
const staticApp = makeStatic(NOTES_ROOT)

//////
mainRouter.use(session)
mainRouter.use(staticApp)
mainRouter.use('/api/login', loginApp)
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
mainRouter.get('/dynamic/*', (req, res) => {
  // TODO better error pages, rather than /nothing/
  // This route forbids accessing the dynamic route. This route holds pages which are rendered by 11ty but meant as client rendered templates, essentially.
  //  thus, visiting without context any such page directly is at best useless, or at worst a potential security issue
  res.status(403)
  res.end()
})
mainRouter.use('/app', (req, res, next) => {
  if (!('user' in req.session)) {
    res.status('401').end()
    return
  }
  next()
})

// mainRouter.get('/note/:notename', async (req, res) => {  // Maybe- this conflicts with established routing. so for now I will use /app to distinguish dynamic pages.
mainRouter.get('/app/note/:notename', async (req, res) => {
  // TODO this is for alpha, where everythinig is dynamic. SPA like. For full production... I want a mix of static/dynamic.
  console.log(`Dynamically serving ${req.params.notename}`)
  res.sendFile(path.join(SITE_ROOT, 'dynamic', 'note', 'index.html'))
})

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

mainRouter.use('/api',
  cookieParser(),
)

// mainRouter.use('/api', session)

import gqlObj from './resources.mjs'
console.log(`DEVELOPMENT: ${process.env.DEVELOPMENT}`)
const gqlArgs = { ...gqlObj, graphiql: process.env.DEVELOPMENT === 'true' }
mainRouter.use('/api/graphql', (req, res, next) => { req.hello = 'there'; next()})
mainRouter.use('/api/graphql', graphqlHTTP(gqlArgs))

mainRouter.get('/ping', async (req, res) => {
  
  const response = { message: 'pong' }
  if (!req.session.views) {

    req.session.views = 0
  }

  if (req.session.user) {
    response.message = `pong, ${req.session.user.username}`
  }
  response.message = response.message + ` ${++req.session.views}`

  res.status(200)
  res.send(response.message)
})


// TODO way to revoke a login
//  .... or to delete any data

const devOnly = express.Router()
mainRouter.use('/api', devOnly)
devOnly.post('/db-reload', async (req, res) => {
  res.status(200).send('OK')
  const archive = `${DATA_FOLDER}/archive`
  await fs.readdir(archive)
    .then(dir => fs.copyFile(`${DATA_FOLDER}/dbfile`, `${archive}/dbfile_${dir.length}`))
    .then( _ => fs.copyFile(`${DATA_FOLDER}/dbfile.bkp`, `${DATA_FOLDER}/dbfile`))
})


try {
  console.log(`Server starting up on ${BIND_IP}:${BIND_PORT}`)
  http.createServer(mainApp).listen(BIND_PORT, BIND_IP)
} catch (e) {
  console.error(e)
}

