'use strict'

import { treeTraverse, traversePruneTokens, treeFoldr } from './DOM.mjs'
import { TokenVisitor } from './Token.mjs'
import { Segment, ListSegment } from './Segment.mjs'


// ========= HTML View/Controller ==========================

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

/**
 * Given a DOM node compute the cursor position as-rendered to the
 * internal cursor position
 * 
 * @param rootElement Element that holds the HTML rendering of an EditDocument
 * @param node Selected node
 * @param nodeOffset Cursor offset into the node
 * @returns Offset of the character into the text of the represented EditDocument
 */
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
  apply: tag => wrapSegment(Segment.taggedSegment([tag], string))
})
// 'const' function, basically, the function that maps all input to one value
const wrapSegment = (seg) => ({
  value: seg,
  apply: tag => wrapSegment(seg.applyTags([tag]))
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
// haha, I think it's kinda working out like that. Except 'apply' puts it into an intermediate state,
// we don't project down to "exactly which segments have what" until the end, at which point we need
// to transform the segments
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

// I like 'overdoing' it. Why the hell not
const pad = segments => {
  // const seg = segments.at(-1).push(' ')
  const seg = segments.at(-1).push('\n')
  // segments.splice(-1,1,seg)
  // Yeah I know. Very into "creating new objects" instead of "mutating"
  return [...segments.slice(0,-1), seg]
}



/**
 * Parse a piece of the DOM into a list of Segment
 * (not a ListSegment!)
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
    this.text = ListSegment.from(Segment.taggedSegment(['p'], ''))

    // Segment index, index in segment
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
    doc.text = ListSegment.from(...segments)
    return doc
  }

  get segments() {
    return this.text.segments
  }

  get length() {
    return this.text.length
  }

  get cursorOffset() {
    return this.focusOffset
  }
  get focusOffset() {
    return this.focus
  }
  get anchorOffset() {
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

  select(focusIndex, anchorIndex = undefined) {
    if (anchorIndex === undefined) anchorIndex = focusIndex
    this.focus = focusIndex
    this.anchor = anchorIndex
  }

  at(characterIndex = undefined) {
    if (characterIndex === undefined) characterIndex = this.focusOffset
    return this.text.at(characterIndex)
  }
  selection() {

    return this.text.characters.slice(this.startOffset, this.endOffset).join('')
  }

  // ----------------------

  write(string) {
  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

  toString() {
    // note that the "\n" (which again, we just use ' ', but. Maybe we should use '\n') of the last paragraph is always present
    // but not always addressable (can't click there), it's not a rendered character
    return this.text.characters.join('')
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
