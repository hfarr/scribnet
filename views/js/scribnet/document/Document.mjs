'use strict'

import { treeTraverse, traversePruneTokens, treeFoldr } from './DOM.mjs'
import { TokenVisitor } from './Token.mjs'

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

const fnConst = v => _ => v

// this fella maps a selected character in the editor to an edit document
// assuming the editor is showing an HTML view
class MapToHTMLEditDocIdx extends TokenVisitor {
  visitLinebreak = fnConst(1)
  visitBlock = fnConst(1)
  // the problem child of the 0th order Token kinds
  visitInline = fnConst(0)
  visitText(token) {
    return token.string.length
  }
}
const htmlMapper = new MapToHTMLEditDocIdx()

function charOffset(rootElement, node, nodeOffset) {
  
  const tokens = treeTraverse(traversePruneTokens(node), rootElement)
  console.debug(tokens)
  
  // return htmlMapper.visitList(tokens).slice(2).reduce((p,c)=>c+p,0) + nodeOffset - node.textContent.length
  return htmlMapper.visitList(tokens).reduce((p,c)=>c+p,0) + nodeOffset - node.textContent.length
}


// Would be scoped to another module likely
function renderHTML(doc) {
  
}


const wrapText = string => ({
  value: string,
  apply: tag => wrapSegment(new Segment([tag], ...string))
})
// 'const' function, basically, the function that maps all input to one value
const wrapSegment = (seg) => ({
  value: seg,
  apply: tag => wrapSegment(seg.reTag([tag, ...seg.tags]))
})
const wrapNull = {
  value: null,
  apply: _ => wrapNull
}

// Maybe 'apply' is like the 'transform' operation that happens on inline elements. For example,
// imagine **Some _te|xt_ is ni|ce**. User selets from | to | and <C-b>, what happens?
// it "applies" the 'bold' operation, but it crosses segments. so it has to apply to the partial
// segments, by first splitting them and applying as appropriate to each one. Outcome is
// **Some _te_**_xt_ is ni**ce**. We have to express it as splitting and stitching.
// Or, just splitting, any cross-boundary apply is going to split. if a cross boundary apply 
// produces, say, neighboring <strong>elements we could merge them but it's not necessary
// when an element is completely covered and an op is applied, no splitting happens- it just
// applies the fmt. which could be an 'inverse' op of italic to unitalic, bold to unbold,
// or an existing italic becoming a 'bold italic' or vice versa.
// the last of these is what happens when we load the document and have nested elements too,
// because apply() is called on all the nested elems with their parents. we can track it.
// but can we get a two-for-one deal and use Transformation logic?
//........ can I work in linear algebra transforms? :o
// might be hard to use the apply logic in both places, since right now segments will re-order the
// tags based on appearance. So if you have <strong>. . . <em> . . . <strong> </strong></em></strong>
// you'll get "STRONG" "STRONG EM" though, in this case, that *is* kinda what we want. hm. Need to
// think about the linearity of this and how it kinda reflects the tree structure. because beneath
// it all it's still a tree, right? gotta ponder.
const apply = (tag) => wrapped => wrapped.apply(tag)
const unwrap = (wrapped) => wrapped.value

// see, this "wrap/unwrap" business suggests, wait for it, monads :o
// ^^ sort of, if my fuzzy recollections are collect
// have to refine this, atm <strong><em>hi!</em></strong> becomes {tag:"EM", string:"hi!"} gotta wrap in 'open' and 'close' indicators
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
 * Parse a piece of the DOM into an edit document
 * @param rootElement DOM Element
 */
function loadHTML(element) {
  // Convert to a list of Segments, then construct a document
  
  const wrappedSegments = treeTraverse(segmentate, element)
  return EditDocument.fromSegments(wrappedSegments.map(unwrap))
}

/**
 * Given the root of a document parse into an EditDocument
 * This differs from loadHTML as rootElement tag is excluded from
 * the resulting segments 
 * @param rootElement Root element of a document
 */
function loadDocument(rootElement) {
  return EditDocument.fromSegments([...rootElement.children].map(loadHTML))
}

function html(tags) {
  return (fragments, ...values) => {
    result = tags.map(t=>`<${t}>`)
    for (let i = 0; i < values.length; i++) {
      result += `${fragments[i]}${values[i]}`
    }
    tags.reverse()
    result += `${fragments.at(-1)}${[tags.map(t=>`</${t}>`)]}`
    return result
  }
}

function md(tag) {

}

export const domFunctions = { loadDocument, loadHTML, renderHTML, charOffset }

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
  constructor(tags, ...characters) {
    const uniqueTags = new Set(tags)
    this.tags = [...uniqueTags]
    this.length = characters.length
    this.characters = characters
    this.templateFn = html
  }

  reTag(tags) {
    const newSeg = new Segment(tags)
    newSeg.characters = this.characters
    newSeg.length = this.length
    return newSeg
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
    return this.templateFn(this.tags)`${this.characters}`
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
    return [ segmentIndex, offset ]
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

