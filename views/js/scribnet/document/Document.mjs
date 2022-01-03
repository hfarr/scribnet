'use strict'

import { treeTraverse, treeFoldr } from './DOM.mjs'

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

  setIndex(index) {

    this.cursor = 0
    this.offset = index
    while (this.offset - this.subLists[this.cursor] > 0) {
      this.offset -= this.list.length
      this.cursor++
    }
  }
}


// =============================================
// Would be scoped to another module likely
function renderHTML(doc) {

}


const wrapText = string => ({
  value: string,
  apply: tag => wrapSegment(new Segment(tag, ...string))
})
// 'const' function, basically, the function that maps all input to one value
const wrapSegment = (seg) => ({
  value: seg,
  apply: _ => wrapSegment(seg)
})
const wrapNull = {
  value: null,
  apply: _ => wrapNull
}

const unwrap = (wrapped) => wrapped.value
const apply = (tag) => wrapped => wrapped.apply(tag)

// see, this "wrap/unwrap" business suggests, wait for it, monads :o
// ^^ sort of, if my fuzzy recollections are collect
function segmentate(node, segments) {

  if (node.nodeType === Node.TEXT_NODE) {
    return [wrapText(node.textContent)]
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return wrapNull
  }

  return segments.flat().map(apply(node.tagName))

}

/**
 * Parse DOM into an EditDocument
 * @param rootElement Root element of the document in the DOM
 */
function loadHTML(rootElement) {
  // Convert to a list of Segments, then construct a document
  const wrappedSegments = treeTraverse(segmentate, rootElement)
  return EditDocument.fromSegments(wrappedSegments.map(unwrap))
}

function html(tag) {
  return (fragments, ...values) => {
    result = `<${tag}>`
    for (let i = 0; i < values.length; i++) {
      result += `${fragments[i]}${values[i]}`
    }
    result += `${fragments.at(-1)}</${tag}>`
    return result
  }
}

function md(tag) {

}

export { loadHTML, renderHTML }

// =============================================

/**
 * Starting with a flat representation for segments.
 * Might wish to layer a tree on top of that. But I'm thinking
 * linearly about these documents so I suspect they should be
 * modelled linearly.
 * "EditList" concept (as an idea for changing it up, borrowed from
 * a haskell assignment)
 * - EditList are composed of EditList
 * - Data type 'mutation' actions produce new lists
 * - adding text in the middle of an EditList, for example. Creates
 *   three new edit lists, one for the prefix, one for the new text,
 *   one for the postfix. Prefix and post fix are essentially 
 *   indices of the original. 
 * - Mutation is fast and cheap. Projecting back to a string is expensive.
 * - Theory is that amortized (?) over the life of the list constantly
 *   applying string operations will have a higher cost especially for
 *   larger documents. 
 * - There isn't a need to maintain an internal copy of a string and
 *   keep it updated when it isn't needed all the time
 * - Browser automatically displays edits that a user performs so we 
 *   aren't called to update the view which is key.
 * 
 * - In a different scenario we might want to maintain the "projection"
 *   onto a string if the edits performed are visible to the viewer and
 *   not made elsewhere. In such a circumstance we might like to do both.
 *   Update both. 
 * - Spitballing here, but have a homogeneous mapping (hem hem) applied
 *   to edits as the come in to complicate and decomplicate.
 */
class Segment {
  constructor(tag, ...characters) {
    this.tag = tag
    this.length = characters.length
    this.characters = characters
    this.templateFn = html
  }

  /**
   * Write characters into this segment
   * 
   * @param idx Index to write at (addressable from 0 to length)
   * @param characters Characters to write
   * @returns Amount of characters written
   */
  write(idx, ...characters) {
    this.length += characters.length
    this.characters.splice(idx, 0, ...characters)
    return characters.length
  }

  // at(...segmentCoords) {
  //   const [ segment, offset ] = segmentCoords.flat()
  //   return 
  // }
  at(offset) {
    // if (offset < 0) {
    //   offset = this.length - offset
    // }
    return this.characters.at(offset)
  }

  render() {
    return this.templateFn(tag)`${this.characters}`
  }
}

/**
 * Expensive reads, cheap(?) writes
 */
export default class EditDocument {

  constructor() {
    this.root = null;
    this.characters = []
    this.segments = [new Segment('p', '')]

    // Segment index, index in segment
    this.writeHead = [0, 0]

    this.previous = null;
  }

  static newDocument() {
    const doc = new EditDocument()
    doc.previous = null
    return doc
  }
  static fromSegments(segments) {
    const doc = EditDocument.newDocument()
    doc.segments = segments
    return doc
  }

  get length() {
    return this.segments.reduce((accum, seg) => accum + seg.length, 0)
  }

  // Maybe 'at()' always return what's currently under the cursor (or the 'focus' end of it)
  // then to get the same 'at' you'd select(charIndex), then at()
  // Maybe all these functions only support a character index to obscure the internals. In fact... yeah.
  // ha. Move over, at()
  // or not, we can let at still index. Maybe default it grabs what's under cursor.

  computeSegmentCoordinates(characterIndex) {
    let segmentIndex = 0, offset = characterIndex
    while (offset > this.segments[segmentIndex].length) {
      offset -= this.segments[segmentIndex].length
      segmentIndex++;
    }
    return segmentIndex, characterIndex
  }

  selectSegCoords(segmentIndex, offset) {
    // Might not expose this particular piece of info. At least, only to
    // package-internal or. It should be used by render/loaders.
    // At present I'm overthinking the design.
    this.writeHead = [ segmentIndex, offset ]
  }

  select(characterIndex) {
    this.writeHead = this.computeSegmentCoordinates(characterIndex)
  }

  at(characterIndex=undefined) {
    let [ segmentIndex, offset ] = this.writeHead
    if (characterIndex) {
      ([ segmentIndex, offset ] = this.computeSegmentCoordinates(characterIndex))
    }
    return this.segments[segmentIndex].at(offset)
  }

  write(string) {
    const [segment, cursorIndex] = this.writeHead
    let charsWritten = this.segments[segment].write(cursorIndex, ...string)
    this.writeHead[1] += charsWritten
  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

}

