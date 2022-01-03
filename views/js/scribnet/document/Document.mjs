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

  setIndex (index) {

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
    return [ wrapText(node.textContent) ]
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
    result=`<${tag}>`
    for (let i = 0; i < values.length; i++) {
      result += `${fragments[i]}${values[i]}`
    }
    result += `${fragments.at(-1)}</${tag}>`
    return result
  }
}

function md(tag) {

}

export { loadHTML }

// =============================================

/**
 * Starting with a flat representation for segments.
 * Might wish to layer a tree on top of that. But I'm thinking
 * linearly about these documents so I suspect they should be
 * modelled linearly.
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
    return this.segments.reduce((accum,seg)=>accum + seg.length, 0)
  }

  at(characterIndex) {

    let segmentIndex = 0
    while (characterIndex > this.segments[segmentIndex].length) {
      characterIndex -= this.segments[segmentIndex].length
      segmentIndex++;
    }
    return this.segments[segmentIndex][characterIndex]
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

