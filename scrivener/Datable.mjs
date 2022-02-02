'use strict';

import fs from 'fs/promises'
import path from 'path'

// TODO work out a long term location for this symbol, if it should exist at all.
// e.g should it belong to the Datable class?
//    will datable even be a class long term?
const datable = Symbol('datable')

// Golly I have so much I want to write. A lot of grief over...
// rapid decisions in favor of moving forward but with untouched
// depths of consideration that'd be more appropriate to ponder
// at a later time u_u
class Database {
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

  get length() {
    return this.dataTable.length
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
    return fs.open(this.filename, 'a+')
      .then(f => f.readFile({ encoding: 'utf8', flag: 'a+' }))
      .then(s => this.loadDBFromString(s))
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

  async save(content /* Datable */) {

    if (!(isDatable(content))) {
      throw new Error("Could not save object (Not serializeable):", content)
    }

    const lineNumber = this.locations.get(content.id)
    this.dataTable.set(content[datable].id, content)

    // for now all saves go to disk immediately
    this.saveDB()

    // would like a write buffer
    // on load, we can force a write first if the data requested is in the buffer
    // or just serve the in-memory content
  }
  load(content /* Datable */) {

  }
}

const isDatable = obj => {
  // longer term, we might enable other types to be 'datable'.
  // particularly strings and arrays.
  // maybe we chill our jets. Hmm. well. Regardless there is
  // room for enhancement.
  if (typeof obj !== 'object') return false

  // 'in' operator essentially means, for the below, obj[Symbol.hasInstance](datable)
  // if 'obj' doesn't support 'in', it won't have Symbol.hasInstance defined.
  // then that is an error of sorts. Not so good! hence the check above.
  return datable in obj
}

class Dataccess {
  constructor() {
    this.constructors = {}

    // for now primitive incremental ID functionality
    // this attribute indicates the next ID to be used
    this.nextID = 0
  }

  static async initFromFile(filename) {
    const datacc = new Dataccess()
    const db = await Database.initFileDB(filename)
    datacc.setDatabase(db)
    datacc.nextID = datacc.db.length

    return datacc
  }

  setDatabase(db) {
    this.db = db
  }

  newID() {
    return this.nextID++
  }

  /**
   * Register a class for serialization to this Dataccess
   * 
   * @param constructorFunc Class to register
   */
  register(constructorFunc) {
    const consProto = Object.getPrototypeOf(constructorFunc.prototype)

    // maybe use Object.create, and maybe match IDs to existing protos? e.g on serde
    // I'm getting a bit fast and loose with my prototype hackery, we should settle
    // on the capabilities.

    // const newProto = (class extends Datable { static sym = Symbol('datableID') }).prototype
    const idFunc = this.newID.bind(this)
    const newProto = (class extends Datable { get newID() { return idFunc() } }).prototype
    // newProto[newID] = idFunc
    // Object.setPrototypeOf(newProto, consProto)
    Object.setPrototypeOf(constructorFunc.prototype, newProto)


    // Would maybe like to identify by the symbol. Thing is I don't know if I can reproducibly
    // serialize the symbols. The trick of this is multiple 'constructors' can have the same name!
    // we hope not! I can detect that error, but I'm forebearing on that code for now. I'd rather
    // work out a serialization scheme that can robustly handle same-named constructors...
    // or maybe make it an error to call register more than once per Dataccess :S and enforce
    // one-name-one-constructor then. Hmm.
    // TODO handle the above situation.
    this.constructors[constructorFunc.name] = constructorFunc
  }

  saveInstance(datable) {
    // TODO check if it is a Datable
    const stringData = datable.serialize()
    this.db.save
  }

  loadInstance(stringData) {
    const { class: className } = JSON.parse(stringData)  // TODO unsafe, be warned. Or, verify safety. Strings are dangerous.

    if (!(className in this.constructors)) {
      throw new (class DeserializationError extends Error { })(`Cannot load instance of '${className}', the class is not registered.`)
    }
    // Create the object with the appropriate prototype (instance of a class)
    const obj = Object.create(this.constructors[className].prototype)
    obj.deserialize(stringData)

    return obj
  }

  loadAllInstances(constructor) {
    const className = constructor.name
    const classData = this.dataTable?.entries
      .filter(entry => entry[1]['class'] === className)
      .map(classEntry => this.loadInstance(classEntry[1]['data']))
    return classData
  }
}


class Datable {

  static attrs = Symbol('attributes')
  constructor() { // constructor is not called. 'Datable' in concept exists only to conveniently name the prototype

  }

  // Not likely much point to this since we don't actually.. have a Datable class! we can't reference it from the
  // instances properly since reading the 'constructor' property will return the client class.
  // if we're in a deserialization context it is client responsibility to check the data they're reading is what
  // they need.
  // I might keep this around. hmm. maybe DataAccess should own this since it has the knowledge of the constructors.
  // static deserializeFrom() {

  // }

  get [datable]() { 
    const attrs = this[Datable.attrs]
    if (attrs === undefined) {
      this[Datable.attrs] = {
        id: this.newID,
      }
    }
    return this[Datable.attrs] 
  }

  serialize() {

    const data = {}
    for (const name of Object.getOwnPropertyNames(this)) {
      if (isDatable(this[name]))
        data[name] = 'placeholder'
      else
        data[name] = this[name]

    }

    const objData = {
      id: this[datable].id,
      class: this.constructor.name, 
      data: data
    }

    return JSON.stringify(objData)
  }

  // thought: deserialized object, return an existing object if they are the same? (that is, mem location?)
  // requires ID'ing by instance. could be fruitful. but could also lead to super unexpected results. Let
  // that behavior fall out through composition of capabilities. I suppose.
  deserialize(stringData) {
    // Note bien that this deserialize function is destructive, it replaces state of an object. it doesn't produce
    // a new one. Again we might change that but I don't have the "feel" of this system yet.
    const { id: idNum, class: className, data: data } = JSON.parse(stringData)  // TODO unsafe, be warned. Or, verify safety. Strings are dangerous.
    this[Datable.attrs] = { id: idNum }

    // would be okay if className is a subclass of this.constructor
    if (className !== this.constructor.name) {
      throw new (class DeserializationError extends Error { })(`Cannot create ${this.constructor.name} from '${className}'`)
    }
    // Create the object with the appropriate prototype (instance of a class)
    // const obj = Object.create(this.constructors[className].prototype)

    // may need to use getPropertyDescriptors in case of privacy or summat
    // for (const name of Object.getOwnPropertyNames(obj)) {
    for (const prop in data)
      this[prop] = data[prop]

    // return obj
  }
}


class Document {
  constructor() {
    this.title = "My post"
    this.content = "my words"
  }

  publish() {
    console.log("nyoooom", this.title)
  }
}

let dacc = new Dataccess()
dacc.register(Document)

let doc = new Document()

// console.log(doc.serialize())
let hoc = dacc.loadInstance(doc.serialize())
console.log("done")

export { Database, Datable, Dataccess }
