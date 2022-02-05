'use strict'

import Datable, { isDatable, datable } from './Datable.mjs'
import Database  from './Database.mjs'

export default class Dataccess {
  constructor() {
    // would we be better off stuffing the constructors in the Database? like "here, you track this"
    // then we can pass DBs around. hmm. Have to see where the natural boundaries of the design fall
    this.constructors = {}

    // for now primitive incremental ID functionality
    // this attribute indicates the next ID to be used
    this.nextID = 0
  }

  static async initFromFile(filename) {
    const datacc = new Dataccess()
    const db = await Database.initFileDB(filename)
    db.idAccessor = data => data[datable].id
    datacc.setDatabase(db)

    // const max = (a,b) => a >= b ? a : b
    // const maxID = datacc.db.allIDs.reduce(max, 0)

    // datacc.nextID = maxID + 1
    return datacc
  }

  setDatabase(db) {
    this.db = db
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

    // idFunc might depend on the underlying database, eventually. My adhoc dependency injection approach supports that.
    // In principle Datables don't manage their own metadata, it's up to the surrounding system
    const idFunc = this.db.idFunc

    // we create the prototype by extending Datable, and not just Datable.prototype, because we might
    // do things with one Datable that we don't want reflected to all of them.
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

  async saveInstance(data) {
    // TODO check if it is a Datable
    return this.db.save(data.serialize())
  }

  async loadInstance(data) {
    const loaded = await this.db.load(data)
    // Destructive. Deserialize replaces items in data.
    data.deserialize(loaded)
  }

  // TODO shoud load by ID? hm
  fromPacked(packedData) {
    const { class: className } = packedData  // TODO unsafe, be warned. Or, verify safety. Strings are dangerous.

    if (!(className in this.constructors)) {
      throw new (class DeserializationError extends Error { })(`Cannot load instance of '${className}', the class is not registered.`)
    }
    // Create the object with the appropriate prototype (instance of a class)
    const obj = Object.create(this.constructors[className].prototype)
    obj.deserialize(packedData)

    return obj
  }

  // should fetch the IDs?
  loadAllInstances(constructor) {
    const className = constructor.name
    const classData = this.db.all
      .filter(packedData => packedData?.class === className)
      // .filter(entry => entry[1]['class'] === className)
      .map(packedData => this.fromPacked(packedData))
    return classData
  }
}