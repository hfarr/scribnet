'use strict'

import Datable, { isDatable, datable } from './Datable.mjs'
import Database  from './Database.mjs'

export default class Dataccess {
  constructor() {
    // would we be better off stuffing the constructors in the Database? like "here, you track this"
    // then we can pass DBs around. hmm. Have to see where the natural boundaries of the design fall
    this.constructors = {}
    this.indices = {}

    // for now primitive incremental ID functionality
    // this attribute indicates the next ID to be used
    this.nextID = 0
  }

  static async initFromFile(filename) {
    const datacc = new Dataccess()
    const db = await Database.initFileDB(filename)

    // this is the accessor I want
    db.idAccessor = data => data[datable].id

    // this is the accessor I am using
    db.idAccessor = data => data.id
    // Why? Because Database and Dataccess communicate with a shared 
    // contract. It's a bit incoherent, Dataccess has too much knowledge.
    // Or maybe it has the right amount of knowledge. WHatever is the case
    // the coupling between the two classes is a bit abused. I think Dataccess
    // should supply an interface to Database, cleanly supplying all of the
    // capabilities Database needs. Wrap up the dependency injection.
    // Curiously- we have that. That is what I think Datable should be for.
    // Or, we could decouple Datable/Database and have Database specify
    // it's interface requirements. I'm not sure.
    // That's a TODO. I am enhancing Datasystem as a whole when I want ought
    // to shift my focus back to the capabilities I've been trying to implement
    // since like, mid january or earlier.

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

  setIndex(constructorFunc, indexField, indexType) {

    const entries = this.loadAllInstances(constructorFunc)
      .filter( ({ [indexField]: entryName }) => entryName !== undefined )
      .map( ({ [indexField]: entryName, [datable]: { id: entryVal } }) => [ entryName, entryVal ])

    this.indices[constructorFunc.name] = {
      field: indexField,
      type: indexType,
      idxMap: new Map(entries),
      set(instance) {
        const { [this.field]: indexKey, [datable]: { id } } = instance
        this.idxMap.set(indexKey, id)
      }
    }

  }


  registerWithIndex(constructorFunc, indexField, indexType) {
    this.register(constructorFunc)
    this.setIndex(constructorFunc, indexField, indexType)
  }

  getIndexList(constructorFunc) {
    if (!(constructorFunc.name in this.indices)){
      return undefined
    }
    return [...this.indices[constructorFunc.name].idxMap.keys()]
  }
  // index functions, should maybe spin out to another class
  async get(constructorFunc, indexKey) {
    if (!(constructorFunc.name in this.indices)){
      return undefined
    }
    const index = this.indices[constructorFunc.name].idxMap
    const id = index.get(indexKey, 0)
    if (id === undefined) return undefined

    // As a note: if data are recent, we may want to instead check a cache.
    // E.g save the "update time" of an item, in Dataccess. Invalidate all
    // caches of that datable, by ID. If valid cache, fetch and return that
    // instead.
    // And, with that in place, longer term when you fetch a datable it
    // will only "lazy load" it. Accessing a property on the datable  will 
    // prompt a cache check but until then it's just the metadata, id and
    // classname.
    const data = await this.db.loadByID(id)

    return this.fromPacked(data)
  }

  async has(constructorFunc, indexKey) {
    if (!(constructorFunc.name in this.indices)){
      return false
    }
    const index = this.indices[constructorFunc.name].idxMap
    const id = index.get(indexKey, 0)
    return id !== undefined
  }

  /*-------------------------------------------------
    TODO 
    I want to restrict create/update by authorization
    and more broadly, I want refined granularity for 
    accessing individual capabilities. However...
    That might be better to implement at the 
    capability level. Or not!
    I think I'll start there though. That approach
    might require hooks into the Dataccess anyway.
    Perhaps we can think of levels of restrictions.
    And different granularities. I might allow an
    entire resource, or only individual capabilities
    on that resource.
    Additionally adding the ability to "allow" at the
    capability level when requests from outside the
    server are received. At least two layers there.
    -------------------------------------------------*/

  async update(constructorFunc, indexKey, data) {
    const index = this.indices[constructorFunc.name]
    const { [index.field]: newIndexKey, ...rest } = data

    const instance = await this.get(constructorFunc, indexKey)
    if (instance === undefined) return undefined
    // update everything but the index field, in case of dire shenanigans
    // instance.data = { ...instance.data, ...rest }
    // instance = { ...instance, ...rest }
    for (const key in rest) { instance[key] = rest[key] }

    // If the update includes a change to the index key, update the index.
    // On the fence about allowing this special case. if the user wants to
    // rename, that's one thing, it causes a bit of API havoc but I'm not...
    // as worried about that? does feel maybe we should coach the user to
    // delete/recreate instead? maybe
    if (newIndexKey !== undefined && newIndexKey !== indexKey) {
      /* Removing this code makes updates idempotent
        we cannot change the index of a datable, we see it as
        part of its identity.
        a "change" would have to be a delete and a re-create
        with the same data.
        or, we provide an 'unsafe' update op that doesn't
        guarantee idempotency.
      */
      // instance[index.field] = newIndexKey
      // index.set(instance)
      // index.idxMap.delete(indexKey)
    }
    await this.saveInstance(instance)
    return instance
  }
  async create(constructorFunc, data) {
    // TODO validations: this is an "index function" so we should check that the data has an expected index field 
    //  or, we don't validate- leave it as a client decision. Perhaps offer an interface. Or multiple kinds of
    //  indices, e.g a "validating" index.
    const instance = Object.create(constructorFunc.prototype, Object.getOwnPropertyDescriptors(data))
    const { [datable]: { id } } = instance

    this.indices[constructorFunc.name].set(instance, id)

    // Here's an awkward thought- we update the index before we save the new data
    // someone tries to fetch this, it loads bunk.
    // Likely? no, possible? I think so.
    // Will I do anything about it? I doubt it, not right now. so.. TODO
    await this.saveInstance(instance)
    return instance
    // return id
  }

  /////////////////////////////
  // Data management functions
  async saveInstance(data) {
    // TODO check if it is a Datable
    return this.db.save(data.serialize())
  }

  // Alright. So, I'm thinking, rather than have intermediate dataformats
  // (the result of data.serialize(), and what we pass to data.deserialize)
  // we oughta just send 'data' to the DB. Hear me out. We have a contract
  // with the DB where we tell it how data are constructed, meta data, etc.
  // That is, we tell it how data are serialized/deserialized- really, that
  // knowledge is above the paygrade of Dataccess. What would that look
  // like? Database just takes in the Datable, and knows that it has
  // serialize/deserialize constructs.
  // we kinda still have the intermediate format, though, but it's not
  // passed through Dataccess
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
  // refresh the index?
  loadAllInstances(constructor) {
    const className = constructor.name
    const classData = this.db.all
      .filter(packedData => packedData?.class === className)
      // .filter(entry => entry[1]['class'] === className)
      .map(packedData => this.fromPacked(packedData))
    return classData
  }
}