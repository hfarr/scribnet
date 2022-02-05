'use strict'

import fs from 'fs/promises'
// import path from 'path'

// Golly I have so much I want to write. A lot of grief over...
// rapid decisions in favor of moving forward but with untouched
// depths of consideration that'd be more appropriate to ponder
// at a later time u_u
export default class Database {
  // filesystem DB for now. And largely in-memory I'll note.

  static async initFileDB(filename) {
    const db = new Database()
    db.filename = filename
    // Too redundant to create new objects here? (They will be created in loadDB)
    db.dataTable = new Map()  // maps position to data at that location
    db.locations = new Map()  // should keep sorted by location. It will start that way and if I control updates it will stay that way but as access gets more complicated we'll see.
    return db.loadDB()
      .then( _ => db)
  }

  get size() {
    return this.dataTable.size
  }

  get allIDs() {
    return [...this.dataTable.keys()]
  }

  /**
   * Save to file, truncating & overwriting existing file. This is destructive.
   */
  async saveDB() {
    const dataStrings = []
    for (const [ id, data ] of this.dataTable.entries()) {
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

  async save(id, content /* Datable */) {

    const lineNumber = this.locations.get(id)
    // this.dataTable.set(content[datable].id, content)
    this.dataTable.set(id, content)

    // for now all saves go to disk immediately
    return this.saveDB()

    // would like a write buffer
    // on load, we can force a write first if the data requested is in the buffer
    // or just serve the in-memory content
  }
  load(content /* Datable */) {

  }
}
