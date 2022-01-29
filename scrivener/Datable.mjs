'use strict';

import fs from 'fs/promises'

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
    return db.loadDB()
  }

  async loadDB() {
    // ;(await fs).open()

    const doLoad = s => this.loadDBFromString(s)

    // might be able to do it faster if I do a "seek/scan" type situation but we simply... won't for now.
    // the memory is temporary, the performance cost infrequent
    return fs.readFile(this.filename, { encoding: 'utf16', flag: 'a+' } )
      .then(doLoad) // 'this' within a callback here, could be pain, so I bind it outside just to be safe. I might inline the lambda if I go back and read through the promise api again

    // below: wanted to "seek" over the file encoded char by encoded char.
    // thing is, the performance gain isn't superb and while I would need
    // less memory, I will replace this with a proper database anyway.
    // and I can re-do it later if I want.
    // fs.open(this.filename, 'a+')
    //   .then(fh => {
    //     let position = 0;
    //     let buf = Buffer.alloc(2)

    //     let bytesRead = -1;
    //     while(bytesRead !== 0) {
    //       ({ bytesRead } = await fh.rea)
    //     }
  }

  loadDBFromString(string) {
    this.data = new Map()  // maps position to data at that location
    // this.storedTypes = new Map()  // metadata- the positions for all 'like types'

    const matchData = /(?<class>\w+[^{])(?<data>{[^\n]*})/g
    let ids = 0;
    let matched;

    while (matched = matchData.exec(string)) {
      const {class: className, data: data} = matched

      const position = matched.index + className.length // position of the data, not its meta data
      this.positionTable.set(position, data)
      // this.push(className, data) // eh. we'll derive it after the fact. If it's slow, I can then optimize.
      // honestly I could just serialize as  {class: '...', data:'...' } ? yeah. that would be a "Datable".
      // mmmmmmmmmmmmmmm
    }
  }

  // push(type, data) {

  //   if (!this.storedTypes.has(type)) this.storedTypes.set(type, [])
  //   this.storedTypes.get(type).push(data)
  // }
  initAll(constructor) {
    const className = constructor.name


  }


  save(content /* Datable */) {
    if (!(content instanceof Datable)) {
      throw new Error("Could not save object (Not serializeable):", content)
    } 

    const promise = fs.open(this.filename)
      .then(file => {

      })

    // return fs.
  }
  load(content /* Datable */) {

  }
}


class Datable {

  constructor() { 
    // this[dataccess] = {
    //   'serialize': () => {
    //     return 
    //   },
    //   'deserialize': () => {

    //   }
    // }
  }

  // rigid definitions. Only JSON, in future can consider other possibilities
  // Yeah, I expect these to change. For now I't convenient to define one location.
  // also thinking, I am going to build in persistence to this class too, as another
  // stop gap. for that I'll have save and load.
  // static? mmm, guess it depends. As an inherited feature, we are delcaring what can be serialized.
  // as a static, we could say, well, we can serialize whatever you hand me, and its not strictly
  // a property of the object. but it's also decoupled
  // what I might end up with is using the dataccess symbol. so you can make any class
  // serializable without the classes own knowledge or participation, since it cross cuts.
  // sticking to inheritance for now even though I think that's better suited for domain tasks
  serialize() {
    // for (const name of Object.getOwnPropertyNames(this)) {
    // }
    // mm hmm. No fine tuning today. Serialization is all properties. Refined access ,refined serialization- will be
    // a responsibility of scopes, or another "Datable" style subclassification. Properties that are hidden from
    // some but not others. Hmm hmm. Do more, revisit later. Getting distracted.
    return JSON.stringify( { name: this.constructor.name, data: this } )
  }
  deserialize(stringData) {
    // const constructorFunc = this.constructor()
    // Note bien that this deserialize function is destructive, it replaces state of an object. it doesn't produce
    // a new one. Again we might change that but I don't have the "feel" of this system yet.
    const obj = JSON.parse(stringData)  // TODO unsafe, be warned. Or, verify safety. Strings are dangerous.
    for (const name of Object.getOwnPropertyNames(this)) {
      this[name] = obj[name]
    }
  }

}