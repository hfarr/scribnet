
// Might be other kinds of APIs in the future beyond web, going to collect in here for now

// For different collections of notes (Public notes, notes belonging to each user, notes
// belonging to a group....) will all have their own controller, which will be their agent
// as far as serving content. The notes know what they'll serve at "../notes" and 
// "../note/<whatever>". The dots '..' are a stand in which Note clients will supply.
// Not a clear description so I'll try an example

// Instead of one controller having access over the entirety of the model of the app as a
// whole, I'm aiming to split each into smaller chunks. The controllers can declare what
// capabilities they're exposing and clients can learn about that. Apps can be composed
// and complicated structures can be built up from them. 
// For example, I may have a "public" controller, which might represent a domain object or
// simply a route I'm handling. I want to have a public set of notes. Rather than use logic
// to discern the subset of all notes I'll create a Note View/Controller/Model bundle which
// will be/represent the collection of public notes. Creating one of these "bundles" is 
// analagous to an instance of a class, an object in general, an aggregate data structure-
// Encapsulating the model-view-controller pattern into a first class... type, almost.
// Using routes would, ideally, become like using variables. Reading, or querying, a 
// variable would be like "getting" one of these routes, updating likewise, creating would
// be as a declaration (or more like calling a class constructor), some routes might be
// "callable" like functions. 
// Gist of the above is we have representation & usage of values bundled. This is as opposed
// to creating a "control" layer and a "model" layer then a myriad of views that might
// query against the model as a result of taking a control. 
// I'm trying to realize an observation. I'm also trying to put it into words. Struggling as
// it turns out, maybe a diagram would help

/**
  Henry's traditional view of servers and APIs 

  /route1   /route2  /route 3

          \   |   /
            Server

              |
            controllers   view  -> send something back
              |             |
        dispatch against model

  Maybe I'm retreading old ground but it's a groundbreaking realization for myself that no, we
  don't have to structure the application like that, with a giant list of routes that map
  requests to actions. That's the ultimate reality of a server, in a way, but we can logically
  isolate a route-functionality-response concept, compose those, and the rest falls out 
  naturally.
  Group the functionality together, wrapped up, its a capability. (Im really hooked on the term
  "capability" thanks to that "You can't buy integration" article published on martinfowler.com)

  Last word- controllers aren't restricted to route handlers. we instead imagine a proto 
  controller as an interface and then an HTTP controller is an implementor of that interface
  but for now I am not expressing that generality as it will come out when I change the code to
  accommodate other methods of access (CLI for example)

  Gosh I mean. I know all that, I think even Rails sort of expects that of developers. Building
  it out myself though is yielding tremendous insight. Or at worst it's just enjoyable.
*/
'use strict'
import fs from 'fs/promises'
import path from 'path'

import express from 'express'

import { authorize } from '../scopes/Access.mjs'

// right now only saves strings
const fileSaver = location => (name, data) => {
  return fs.writeFile(`${location}${path.sep}${name}`, data, 'utf-8')
}

const fileLoader = location => name => {

  return fs.readFile(`${location}${path.sep}${name}`, 'utf-8')  // utf-8 can still encode... unicode chars? eghgnnn
}

/**
 * Eventually... (key word right there)
 * can abstract into a ODL (object description language :> ) and simplify the contruction
 * of these bundles. True framework shenanigans, that would be
 */

/**
 * Debating on if I need a Note class. If Notes grow in complexity absolutey, for now
 * I think they're just raw text. In fact. I want to rename them, now, to 'RawText',
 * in which I will be stored serialized EditDocuments (ssh don't tell anyone).
 * ((don't worry they'll get bespoke treatment soon enough.))
 */
class Note {
}


/**
 * Only http requests for now, still calling it generically as NoteController
 */
class Notes {

  constructor() {
    this.notes = new Map()
  }

  static newNotes() {
    return new Notes()
  }

  static fromNotes(/* some kinda parameter identifying a resource?? idk, feels like not a Notes responsibility. Dependency injection! Accept a "NotesProducer" as a parameter. yeah. haha yeah jk unless */) {

  }

  static fromNotesMap(notes) {
    const result = Notes.newNotes()
    result.notes = notes
    return result
  }

  listNotes() {
    return [...this.notes.keys()]
  }

  /**
   * Fetch a note by name. If it doesn't exist, create a new,
   * blank note under that name 
   * (but- maybe don't create automatically. feels more
   * of a controller's responsibility, the thing that exposes
   * capabilities? like shoule /all/ Notes with any 
   * controller promise to make a new note, or do I only care
   * about that for httpControllers? well, I talked myself
   * into that way.)
   * 
   * @param noteName Name of the note
   */
  get(noteName) {
    return this.notes.get(noteName)
    // if (this.notes.has(noteName)) {
    //   return this.notes.get(noteName)
    // }
    // return undefined
  }

  create(noteName) {
    if (this.notes.has(noteName)) return false

    this.update(noteName, "")

    return true
  }

  update(noteName, newContents) {
    // thinking about cheekily bundling update/create. hmm....
    // okay I did it, but not really. made 'create' use update
    this.notes.set(noteName, newContents)
  }

  delete(noteName) {
    // last horseman of the CRUDocolypse
    return this.notes.delete(noteName)
  }

}

// gotta work out the way we will express implementing an interface
// I would like to bundle associating the data model with the access.
// Not sure what I would like to see out of that at the moment. For
// now creating a RouteNoteController is to create a Notes behind it.
// The controller, then, acting like a reference, the Note a value,
// inaccessible accept by way of the reference
// and ideally the control access scheme is hidden from the users 
// too! So when it's composed, say a "public" object that "attaches"
// a RouteNoteController (or whatever I end up calling it)- that would
// would be like attaching an express app as a subapp (because in
// fact that is what happens)
// That begs an interesting question- The controller "scheme" around
// the data is almost (don't shoot me) monadic in that we are 
// obscuring the details around manipulating the structure under the
// hood, but it only composes with other 'monads' of the same 
// wrapping type. A "HTTP" monad around a Note and an "HTTP" monad
// around a User could compose like... okay haskell time
/*
 do user <- getUser arguments
    note <- newNote
    return user.attach(note)

  then that creates a User for which visiting /user/<identifier>/notes
  accesses that 'note' object belonging to 'that' user object. They
  are wrapped by the same monad so it's fine and cool. Now, if we had
  a "CLI" monad then it might be ./scriven --user=<identifier> --notes
  performs the same action. Key generality is the composition of 
  'user' and 'note' does not know about the composition of actions
  underneath, any system that expresses "access from user this note"
  could be a wrapper monad. And key is the monads don't mix. In the
  example above that means you can't start out by defining a HTTP
  controller and finish with a CLI. What would that even *mean*?
  Pretty cool!
  Together, /user/.../notes makes a *new* type, a Controller (or CLI,
  generically a 'monad') around a user..note type without explicitly
  declaring that type. Nice nice.
  Moreover not every user has a note! Oooh. I'm getting into this idea.
  --Monad might not even be the right structure, it might be sufficient
    to use a monoid for example. As far as Im aware the only property
    we need to satisfy would be associativity but it is nice to have
    monadic laws too.

  One approach I imagine with the above- this monadic comprehension
  style could be the replacement for declaring schema.
  Schematically, user.attach(note) would be the same as 

  CREATE TABLE user COLUMNS .... FOREIGN KEY notes.noteName

  or whatever the sql is. Or! leave less structured than that. but we
  can imagine it.

  Okay. Another thought bubbled up. I can see a "JSON controller" that
  perhaps an "HTTP controller" binds. So- 
    send: {"name": "diary-10-7-1995", "content": "I think dogs are neat"} -> /user/henry/notes 
  main controller activates notes controller activates json controller
  The bound JSON controller respond on the name. It would be compatible with
  the HTTP controller, meaning we can *mix* them if we're careful.
  Above I indicated mixing wouldn't be feasible. But I don't think there's
  anything wrong with that kind of pipelining action.

  This I think would let us fluidly mix use of a "grapql" style access
  (one endpoint, data parameterizes query) and "restful" access
  (several endpoints which parameterize a query, data exclusively payload)
  (provided my rough understanding of graphql is correct) (and REST for that matter lmao).
*/
class RouteNoteController {
  constructor(notes) {
    const app = express()
    this.notes = notes

    // TODO temporary
    this.save = fileSaver('note-folder')

    // app.param('noteName', (...)=>{...}) // do we need any pre-work? Not for this probably

    // app.use(/notes?/, express.json())

    app.param('noteName', (req, res, next) => {
      if ('noteName' in req.params) {
        next()
      } else {
        res.send(400)
      }
    })

    // TODO "CRUDObject" abstraction? just make it really simple to have routes for an updateable resource? hm
    //    incorporate w/the 'monadic' approach spelled out above?

    app.get('/note/:noteName', (req, res) => {

      // maybe- check existence for the condition,
      // create if not and fetch if so? eh


      let noteText = this.notes.get(req.params.noteName)

      if (noteText === undefined) {
        // I am no longer into creating notes on the fly, this should do something else.
        // maybe we have a fallback case or do the 'not found' handling in app.param.
        // not sure. Have a generic handler for all api routes to catch 404s?
        this.notes.create(req.params.noteName)
        noteText = ""
      }

      const responseBody = {
        name: req.params.noteName,
        content: noteText
      }
      res.status(200).send(responseBody)
    })

    // TODO work out data management responsibilities. And hey! TODO! move off raw, text to the appropriate middle-ware for the data (probably mostly json)
    //    having a very "gititdone" mood right now, which I feel is appropriate for early stages
    app.use('/note/:noteName', authorize("Unauthorized!"), express.text("utf-8"));
    app.put('/note/:noteName', (req, res) => {
      let note = this.notes.get(req.params.noteName)

      if (note === undefined) {
        res.status(404).send(`No note called '${req.params.noteName}'`)
        return
      }

      // see, not 'note.Update()' would make sense, but we have to access it through the collection. The content of a note is owned by the note.
      // Leaving this thought as a nudge-do (a soft TODO I guess). Assign ownership correctly. Harder TODO- test ya stuff.
      // note.update()
      this.notes.update(req.params.noteName, req.body)
      this.save(req.params.noteName, req.body)
        .then(_ => res.status(200).send('OK'))
        .catch(_ => res.status(500).send('Oops'))
      
    })

    app.get('/notes', (req, res) => {
      const result = this.notes.listNotes()
      console.log("GET", result)
      res.status(200).send(result)
    })

    this.app = app
  }

  // static fromDirectory(directory) {
  // }

  static newNotes() {
    return new RouteNoteController(new Notes())
  }

  static wrapNotes(notes) {
    return new RouteNoteController(notes)
  }

}

export { Notes }

export default RouteNoteController


























