'use strict'

import fs from 'fs/promises'
// import path from 'path'

const DBPrivate = Symbol('DB')

class Index {
  // ...can be persisted as meta data
  // ...can be composed as "virtual indices" to implement data fetches
  constructor(className, field) {
    this.className = className
    this.field = field
  }
  get hash() {
    return `${className}:${field}`
  }
}

// Golly I have so much I want to write. A lot of grief over...
// rapid decisions in favor of moving forward but with untouched
// depths of consideration that'd be more appropriate to ponder
// at a later time u_u
export default class Database {
  // filesystem DB for now. And largely in-memory I'll note.

  constructor() {
    this[DBPrivate] = Symbol('DBInstance')

    // TODO by default says that an ID is a direct attribute on the item
    this.idAccessor = data => data.id
    // this.nextID = 0
  }
  static async initFileDB(filename) { // I smell subclass potential
    const db = new Database()
    db.filename = filename
    // Too redundant to create new objects here? (They will be created in loadDB)
    db.dataTable = new Map()  // maps position to data at that location
    db.locations = new Map()  // should keep sorted by location. It will start that way and if I control updates it will stay that way but as access gets more complicated we'll see.
    await db.loadDB()

    const max = (a, b) => a >= b ? a : b
    const maxID = db.allIDs.reduce(max, 0)
    db.nextID = maxID + 1

    return db
  }

  get size() {
    return this.dataTable.size
  }

  get allIDs() {
    return [...this.dataTable.keys()]
  }

  get all() {
    return [...this.dataTable.values()]
  }

  newID() {
    return this.nextID++
  }

  get idFunc() {
    return this.newID.bind(this)
  }

  // TODO maybe accept a "Schematica", an object that controls data & metadata?
  // This would be the injected dependency. The DB can concoct a rudimentary one,
  // or require it be supplied.
  set idAccessor(func) {
    this.accessIDOf = func
  }

  /**
   * Save to file, truncating & overwriting existing file. This is destructive.
   */
  async saveDB() {
    const dataStrings = []
    for (const [id, data] of this.dataTable.entries()) {
      dataStrings.push(JSON.stringify(data))
    }
    return fs.writeFile(this.filename, dataStrings.join('\n'), { encoding: 'utf8' })
  }

  async loadDB() {

    // might be able to do it faster if I do a "seek/scan" type situation but we simply... won't for now.
    // the memory is temporary, the performance cost infrequent
    let fileHandle
    return fs.open(this.filename, 'a+')
      .then(f => fileHandle = f)
      .then(_ => fileHandle.readFile({ encoding: 'utf8', flag: 'a+' }))
      .then(s => this.loadDBFromString(s))
      .then(_ => fileHandle.close())
  }

  loadDBFromString(string) {
    this.dataTable = new Map()
    this.locations = new Map()

    if (string.length === 0) return
    // const matchData = /(?<class>\w+[^{])(?<data>{[^\n]*})/g
    let lineNumber = 0
    const datables = string.split('\n')

    for (const raw of datables) {
      lineNumber++
      const datum = JSON.parse(raw)
      const idNumber = datum.id

      this.dataTable.set(idNumber, datum)
      this.locations.set(idNumber, lineNumber)
    }
  }

  // TODO since Dataccess (probably) needs insight into the IDs, especially for
  // ref/deref, do I move responsibility back there? Or, perhaps. And better yet,
  // I do the ref/deref from the DB. Maybe as a "Memory" class. I do like that.
  // Only thing, it isn't as 'exposed' to the outside, and we'd have a parallel
  // system of Datables relating to Datables if we do ~all~ the management on the
  // inside of the DB. The kinda thing that couples and maybe decoheres.
  // Or maybe that's OK. We aren't there yet, so worrying a little too early.
  // ...
  // Update: we have a mix going on. Database supplies the id function, but Dataccess
  // supplies the means to access it. What's left though is we don't guaranteed
  // storing the content with it's identification. It would seem to make sense that
  // DB would be in charge of that. Maybe controlling an 'id' attribute. And maybe
  // it can access meta fields as well. Mer, i might be going overboard. Gotta 
  // move on, get that vertical slice. That capability.

  async save(content) {

    // const metaAccess = this[DBPrivate]
    let id = this.accessIDOf(content)

    this.dataTable.set(id, content)

    // for now all saves go to disk immediately
    return this.saveDB()

    // would like a write buffer
    // on load, we can force a write first if the data requested is in the buffer
    // or just serve the in-memory content
  }
  async load(content) { // TODO Not destructive for now. The interface is a bit strange- pass an object to load that object? I would think that load(...) would alter it's argument. Something to be considered later on.

    return this.loadByID(this.accessIDOf(content))
  }

  async loadByID(id) {

    await this.loadDB()
    return this.dataTable.get(id)
  }
}
