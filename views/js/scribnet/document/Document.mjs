

// atoms and ranges. an atom could be a string or element


/**
 * rendering might be more updating just a portion
 * Most edit operations will be to apply a styling
 * to some segment of text, type characters. Less
 * likely is to cover broad ranges. We can probably
 * make the common case quick or during a render only
 * udpate affected segments
 * 
 * segment contains both or neither, unaffected
 * segment contains one or other, affected
 */


// generic n dim grid
class OffsetList {

  constructor() {
    this.length = 0
    this.sublists = []
    this.cursor = 0
    this.offset = 0
  }

  get list() {
    return this.offsetLists(this.cursor)
  }

  setIndex (index) {

    this.cursor = 0
    this.offset = index
    while (this.offset - this.subLists[this.cursor] > 0) {
      this.offset -= this.list.length
      this.cursor++
    }
  }
}




export class Document {

  constructor() {
    this.root = null;
    this.characters = []
  }

  static newDocument() {
    const doc = new Document()
    doc.previous = null
  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

}

