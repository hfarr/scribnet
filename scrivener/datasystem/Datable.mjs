'use strict'

// TODO work out a long term location for this symbol, if it should exist at all.
// e.g should it belong to the Datable class?
//    will datable even be a class long term?
const datable = Symbol('datable')

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

// maybe being 'datable' is more like a pointer to a struct in C
// id is the value of the pointer referencing the memory location
// in whichever scheme. In a program that's your program memory,
// and for us now that's the location in the file.
// in fact, that's kinda what we're doing isn't it? I plan to
// have "datable" members of other datables be replaced by their
// IDs in serialization. hmm!
export default class Datable {

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

  /**
   * Return the representation of the payload of this datable 
   * structured with metadata
   * 
   * @returns An "object serialization"
   */
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

    return objData
  }

  // thought: deserialized object, return an existing object if they are the same? (that is, mem location?)
  // requires ID'ing by instance. could be fruitful. but could also lead to super unexpected results. Let
  // that behavior fall out through composition of capabilities. I suppose.
  deserialize(structuredData) {
    // Note bien that this deserialize function is destructive, it replaces state of an object. it doesn't produce
    // a new one. Again we might change that but I don't have the "feel" of this system yet.
    const { id: idNum, class: className, data: data } = structuredData
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



// For testing
export { isDatable, datable }
