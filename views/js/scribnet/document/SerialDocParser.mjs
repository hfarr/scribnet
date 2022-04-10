
import { Segment, Context, MixedContext, Doc } from '../section/index.mjs'

export default class SerialDocParser {

  constructor(serialDoc) {
    this.serialDoc = serialDoc
  }

  /**
   * Direct map parsing from JSON to class instances.
   * In this kind of parsing this is an unstructured serialization of a kind.
   * The serial string is expected to be equivalent to JSON.stringify called
   * for some Doc
   * 
   * @param {String} serialString Stringified json representing a Doc
   * @returns Parsed out Doc 
   */
  parse() {

    const docObj = JSON.parse(this.serialDoc)
    return this.parseDoc(docObj)

  }

  parseDoc(obj) {

    const result = Object.create(Doc.prototype, Object.getOwnPropertyDescriptors(obj))

    result.subPieces = [...result.subPieces.map(this.parseContext.bind(this))]

    return result

  }

  parseContext(obj) {

    let childParser = this.parseSegment.bind(this)
    if (['ol','ul','li'].includes(obj.blockTag)) {  // "MixedContext"
      childParser = this.parseContext.bind(this)
    }

    const result = Context.createContext(obj.blockTag, ...obj.subPieces.map(childParser))
    return result
  }

  parseSegment(obj) {

    return Object.create(Segment.prototype, Object.getOwnPropertyDescriptors(obj))

  }
}