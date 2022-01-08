'use strict'

import { treeTraverse, traversePruneTokens, treeFoldr } from './DOM.mjs'
import { TokenVisitor } from './Token.mjs'
import { Segment, ListSegment } from './Segment.mjs'

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

// =============================================

const fnConst = v => _ => v

// this fella maps a selected character in the editor to an edit document
// assuming the editor is showing an HTML view
class MapToHTMLEditDocIdx extends TokenVisitor {
  // why is lineBreak 0 not 1? because we 'collapse' it to a newline and push it to the previous elem (in effect, it's an inline character we convert to text)
  // ^^^ likely want to verify this is the case. It's a bit awkward I'll admit. Am I admitting to awkwardness because I forgot when I am the one who coded this, or because the behavior is awkward? :shrug:
  visitLinebreak(token) { return 0 }
  visitBlock(token) { return 1}
  visitInline(token) { return 0}
  visitText(token) {
    return [...token.string].length // separates string into code points as to not over-count 16byte characters
  }
}

// This is a debug mixin to get the string the token 'represents' in addition to its regular output
const mixOriginal= (tokenVisitor) => (class extends tokenVisitor {
  visitLinebreak(tok) { return [super.visitLinebreak(tok), '\n']}
  visitBlock(tok) { return [super.visitBlock(tok), '\n']}
  visitInline(tok) { return [super.visitInline(tok), '']}
  visitText(tok) { return [super.visitText(tok), tok.string]}
})

const htmlMapper = new MapToHTMLEditDocIdx()

function charOffset(rootElement, node, nodeOffset) {

  const tokens = treeTraverse(traversePruneTokens(node), rootElement)

  // Need to supply (inject) different collapse rules
  const sliced = tokens.slice(1)

  // It's awkward to do the slicing (here and above)
  // It would be ideal to have flexibility over Token "collapse" rules to handle 
  // all these cases, as right now charOffset is accounting for too much Token
  // specific behavior
  const mapskies = htmlMapper.visitList(sliced).slice(1) // pesky construct still producing a '\n' at the front
  const totalCharacters = mapskies.reduce((p,c) => c + p, 0)

  let utf8offset = 0, characterOffset = 0, nodeCharacterLength = 0
  while (utf8offset < nodeOffset) {
    utf8offset++, characterOffset++, nodeCharacterLength++
    if (node.textContent.codePointAt(utf8offset) > 0xFFFF) utf8offset++
  }
  while (utf8offset < node.textContent.length) {
    utf8offset++, nodeCharacterLength++
    if (node.textContent.codePointAt(utf8offset) > 0xFFFF) utf8offset++
  }

  // have to go from selected DOM *character* to document *cursor position*.
  // if the offset is equal to the length, then the cursor is positioned to the right
  // of the last character. if the offset is equal to 0, then the cursor is positioned
  // to the left of the first character.
  // ~but~
  // the right side of the last character is the left side of the first character in
  // the adjacent sequence! ceteris paribus we perform the same kinda computation

  // rather than apply the offset coupled with a difference, we could compute totalCharaters from applying reduce over all but the last index, as that would naturally remove 
  // nodeCharacterLength from the sum. Then again, I think I prefer making the transformation explicit. Like, first we compute the total characters for all nodes, then we apply the 
  // offset- it's more pleasing? Not a huge cost either way since we are paying for the computation of charOffset regardless which, in the worst case, is the same cost as computing
  // both charOffset and totalCharacters (charOffset being equal to totalCharacters)
  return totalCharacters + characterOffset - nodeCharacterLength
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
  apply: tag => wrapSegment(seg.applyTag([tag, ...seg.tags]))
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

// a silly little function for a silly little programmer
const compose = (f => {
  return { of: g => x=> f(g(x)) }
})

// const decompose = :(

// think of compose as a decorator applied to a function, converting it to be used in a composition form
// pad: pad the last segment in a list of segments with one space. compose: convert the function to composition form,
// so it takes as input the output from another function (we might imagine that before executing f, we apply g to its
// parameters)
const padd = compose(segments=>{
  const seg = segments.at(-1).push(' ')
  return seg
})
// I like 'overdoing' it. Why the hell not
const pad = segments => {
  // const seg = segments.at(-1).push(' ')
  const seg = segments.at(-1).push('\n')
  // segments.splice(-1,1,seg)
  // Yeah I know. Very into "creating new objects" instead of "mutating"
  return [...segments.slice(0,-1), seg]
}



/**
 * Parse a piece of the DOM into a list of Segments
 * 
 * @param element DOM Element
 */
function loadHTML(element) {
  return treeTraverse(segmentate, element).map(unwrap)
}

/**
 * Given the root of a document parse into an EditDocument
 * This differs from loadHTML as rootElement tag is excluded from
 * the resulting segments 
 * 
 * Another difference is running loadHTML on rootElement yields a list of
 * segments but its impossible to distinguish which are direct children.
 * That is needed because the direct children are all the block elements
 * and we need to pad the last segment of each block to account for the
 * implicit "character" at the end of paragraphs (that is to say we virtually
 * insert a new line, or rather, just a bit of \u{0032})
 * 
 * @param rootElement Root element of the DOM portion to convert
 */
function loadDocument(rootElement) {

  // ._.     .u.
  const childSegments = [...rootElement.children]
    .map(loadHTML)
    .map(pad)
    .flat()
  return EditDocument.fromSegments(childSegments)
}

function html(tags) {
  return (fragments, ...values) => {
    result = tags.map(t => `<${t}>`)
    for (let i = 0; i < values.length; i++) {
      result += `${fragments[i]}${values[i]}`
    }
    tags.reverse()
    result += `${fragments.at(-1)}${[tags.map(t => `</${t}>`)]}`
    return result
  }
}

function md(tag) {

}

export const domFunctions = { loadDocument, loadHTML, renderHTML, charOffset }

// =============================================


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
    this.focus = 0
    this.anchor = 0

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
  get cursorOffset() {
    return this.segments.slice(0,this.writeHead[0]).reduce((accum, seg)=>accum+seg.length, 0) + this.writeHead[1]
  }

  // hmm. I'd like to get these and cursorOffset consistent.
  get focusOffset() {
    return this.focus
  }
  get anchorOffset() {
    // let [ anchorSegment, segOffset ] = this.computeSegmentCoordinates(this.anchor)
    return this.anchor
  }
  get startOffset() {
    return this.focusOffset <= this.anchorOffset ? this.focusOffset : this.anchorOffset
  }
  get endOffset() {
    return this.focusOffset <= this.anchorOffset ? this.anchorOffset : this.focusOffset
  }
  get isCollapsed() {
    return this.focusOffset === this.anchorOffset
  }

  // ----- Builders ------

  applyTag(tag, attributes) {

  }

  // ----- Accessors ------

  // Maybe 'at()' always return what's currently under the cursor (or the 'focus' end of it)
  // then to get the same 'at' you'd select(charIndex), then at()
  // Maybe all these functions only support a character index to obscure the internals. In fact... yeah.
  // ha. Move over, at()
  // or not, we can let at still index. Maybe default it grabs what's under cursor.

  computeSegmentCoordinates(characterIndex) {
    let segmentIndex = 0, offset = characterIndex
    while (offset >= this.segments[segmentIndex].length) {
      offset -= this.segments[segmentIndex].length
      segmentIndex++;
    }
    return [segmentIndex, offset]
  }

  selectSegCoords(segmentIndex, offset) {
    // Might not expose this particular piece of info. At least, only to
    // package-internal or. It should be used by render/loaders.
    // At present I'm overthinking the design.
    this.writeHead = [segmentIndex, offset]
  }

  select(focusIndex, anchorIndex = undefined) {
    if (anchorIndex === undefined) anchorIndex = focusIndex
    this.writeHead = this.computeSegmentCoordinates(focusIndex)
    this.focus = focusIndex
    this.anchor = anchorIndex
  }

  at(characterIndex = undefined) {
    let [segmentIndex, offset] = this.writeHead
    if (characterIndex) {
      ([segmentIndex, offset] = this.computeSegmentCoordinates(characterIndex))
    }
    return this.segments[segmentIndex].at(offset)
  }
  selection(focusIndex = this.focus, anchorIndex = this.anchor) {
    const [ anchorSegment, anchorOffset ] = this.computeSegmentCoordinates(anchorIndex)
    const [ focusSegment, focusOffset ] = this.computeSegmentCoordinates(focusIndex)

    // let startSegment = focusSegment, startOffset = focusOffset
    // let endSegment = anchorSegment, endOffset = anchorOffset
    let [startSegment, startOffset, endSegment, endOffset] = [focusSegment, focusOffset, anchorSegment, anchorOffset]
    if (anchorSegment < focusSegment || (anchorSegment === focusSegment && anchorOffset < focusOffset)) {
      // 'swap' semantics? meh this is fine.
      ([startSegment, startOffset, endSegment, endOffset] = [anchorSegment, anchorOffset, focusSegment, focusOffset])
    }

    if (startSegment === endSegment) {
      return this.segments[startSegment].characters.slice(startOffset,endOffset).join('')
    }

    let result = this.segments[startSegment].characters.slice(startOffset).join('')
    for (let i = startSegment + 1; i < endSegment; i++) {
      result += this.segments[i].characters.join('')
    }
    result += this.segments[endSegment].characters.slice(0,endOffset).join('')

    return result;
    // might be broken depending on whether end precedes start (for example, if end is before start, then we sliced incorrectly)
    // hmm. Maybe should. Get start/end.
  }


  write(string) {
    const [segment, cursorIndex] = this.writeHead
    let charsWritten = this.segments[segment].write(cursorIndex, ...string)
    this.writeHead[1] += charsWritten
  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

  toString() {
    // note that the "\n" (which again, we just use ' ', but. Maybe we should use '\n') of the last paragraph is always present
    // but not always addressable (can't click there), it's not a rendered character
    return this.segments.map(s=>s.characters).flat().join('')
    // see I want so badly to write segments.map(.characters), treating '.' as a half-applied curried infix operator
  }

}


// ---------------------------
// Exports for testing
export const expose = { 

  // derivators
  charOffset, // derive cursor position in DOC from given node/nodeoffset from DOM
  segmentate, // functionally process an element into a list of segments (compose with treeTraverse)

  // templaters
  html, md,

  // builders
  loadDocument, 
  loadHTML,
}
