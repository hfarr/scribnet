'use strict'

import { treeTraverse, traversePruneTokens, treeFoldr, offsetToDOM, boundaryOffsetToDOM } from './DOM.mjs'
import { TokenVisitor } from './Token.mjs'
// import { Segment, ListSegment } from './Segment.mjs'
import { Doc, Context, Segment } from '../section/Context.mjs'


// ========= HTML View/Controller ==========================

// this fella maps a selected character in the editor to an edit document
// assuming the editor is showing an HTML view
class MapToHTMLSegmentIdx extends TokenVisitor {
  // why is lineBreak 0 not 1? because we 'collapse' it to a newline and push it to the previous elem (in effect, it's an inline character we convert to text)
  // ^^^ likely want to verify this is the case. It's a bit awkward I'll admit. Am I admitting to awkwardness because I forgot when I am the one who coded this, or because the behavior is awkward? :shrug:
  visitLinebreak(token) { return 0 }
  visitBlock(token) { return 1} // overcompensates because we use a single "\n" char within segments to encode paragraph breaks. This char is not rendered however, it is only for encoding.
  visitInline(token) { return 0}
  visitText(token) {
    return [...token.string].length // separates string into code points as to not over-count 16byte characters
  }
}

class MapToHTMLSectionIdx extends TokenVisitor {
  visitLinebreak(token) { return 0 }
  visitBlock(token) { return 0}
  visitInline(token) { return 0}
  visitText(token) {
    return [...token.string].length // separates string into code points as to not over-count 16byte characters
  }
}
class MapToHTMLSectionCursor extends TokenVisitor {
  visitLinebreak(token) { return 0 }
  visitBlock(token) { return 1 }
  visitInline(token) { return 0 }
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

const htmlToAtomMapper = new MapToHTMLSectionIdx()
const htmlToCursorMapper = new MapToHTMLSectionCursor()

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
  const mapskies = htmlToAtomMapper.visitList(sliced).slice(1) // pesky construct still producing a '\n' at the front
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

/**
 * Compute the offset of the cursor in the DOM, as if it were a document
 * 
 * @param rootElement Element containing the document
 * @param node Node the cursor is in
 * @param nodeOffset Offset within the node of the cursor
 * @returns Offset of the cursor in an theoretical EditDocument
 */
function cursorOffset(rootElement, node, nodeOffset) {
  const tokens = treeTraverse(traversePruneTokens(node), rootElement)

  // Need to supply (inject) different collapse rules
  const sliced = tokens.slice(1)

  const mapskies = htmlToCursorMapper.visitList(sliced).slice(1) // pesky construct still producing a '\n' at the front
  const boundariesUpToNode = (mapskies.reduce((p,c) => c + p, 0)) - ([ ...node.textContent].length)

  // spread operator treats "characters" in utf16 form. nodeOffset should be given correctly in utf8 (i.e it won't slice between 0,1 on, say, "\u{1F310}".)
  const boundaryOffset = [ ...node.textContent.slice(0, nodeOffset) ].length

  return boundariesUpToNode + boundaryOffset

}

function cursorOffsetToDOM(rootElement, document, editDocOffset) {

  // return boundaryOffsetToDOM(rootElement, editDocOffset)

  // pathFinder: A function that determines a path to a cursor given a Doc and a cursorPosition
  //  (dependency injection)
  return pathFinder => { 
    let [ path, offset ] = pathFinder(document, editDocOffset)
    let curElement = rootElement
    let curIndex
    
    // while (path.length > 0) {  // we use > 1 and not > 0 since the last node in the path is a Text Node, and we want the last Element Node which should immediately precede it. so we cut it short with 1 left over.
    while (path.length > 1) {
      ([ curIndex, ...path ] = path)
      curElement = curElement.children[curIndex]
    }

    // curElement should now be pointing at Block element corresponding to the last Context before diving into Segments
    // segments may have an arbitrary amount of nesting tags, all of which can be munched through as children 0 index.
    // so we do that. Crunch through remaining Children until it's just a text node (no more children)
    while (curElement.firstElementChild) {
      curElement = curElement.firstElementChild
    }

    // hmmm... what if the text node is empty string? by the time we render a Document 
    // I don't think we';l have any non-empty Segment. I suppose I don't rule it out
    // explicitly, though.
    const textNode = curElement.childNodes[0]

    return [ textNode, offset ]
  }
}


// Would be scoped to another module likely
function renderHTML(doc) {
  // TODO remove, deprecate
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
  if (segments.length === 0) return []
  const seg = segments.at(-1).push('\n') // would love if I remembered / documented why I do things. Or refactored when I move in for changes.
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

function parseSection(node, sections) {
  if (node.nodeType === Node.TEXT_NODE) {
    return [ Segment.from(...node.textContent ) ] // "Just x"
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [] // "Nothing"
  }

  if (Doc.isBlock(node.tagName)) return [ Context.createContext(node.tagName, ...sections.flat()) ]

  return sections.flat().map(segment => segment.applyTag(node.tagName))
}

/**
 * Parse a piece of the DOM into a Section
 * 
 * @param element DOM Element
 */
function parse(element) {
  return treeTraverse(parseSection, element)[0]
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

  const childContexts = [...rootElement.children]
    .map(parse)
    .flat()
  return EditDocument.fromBlockContexts(childContexts)
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

export const domFunctions = { loadDocument, loadHTML, renderHTML, charOffset, cursorOffset }

// =============================================

class _EditDocument {

  constructor() {

    this.document = new Doc()

    this.focus = 0
    this.anchor = 0

  }

  static newDocument() {
    return new EditDocument()
  }
  static fromBlockContexts(contexts) {
    return EditDocument.fromDocSection(Doc.from(...contexts))
  }
  static fromDocSection(docSection) {
    const doc = EditDocument.newDocument()
    doc.document = docSection
    return doc
  }
  static fromSerializedDocSection(serialDocSection) {
    const doc = EditDocument.newDocument()
    try {
      // const docSection = JSON.parse(serialDocSection)
      // doc.document = Object.create(Doc.prototype, Object.getOwnPropertyDescriptors(docSection))
      doc.document = Doc.parseSerialDoc(serialDocSection)
      return doc
    } catch (e) {
      console.warn(e)
      throw e
    }
  }

  copy() {
    const doc = EditDocument.newDocument()
    doc.document = this.document
    doc.focus = this.focus
    doc.anchor = this.anchor
    return doc
  }

  /**
   * Duly note that length reports the length of the array of cursor positions
   * which is one more than the total (rendered) characters.
   * 
   * E.g if the document is "abc", these are the cursor positions, of which
   * there are four: "|abc", "a|bc", "ab|c", "abc|"
   */
  get length() {
    return this.document.length
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

  get offsetsInDOMComputers() {
    const that = this
    return { 
      anchorOffsetComputer(root, pathFinder) { return cursorOffsetToDOM(root, that.document, that.anchorOffset)(pathFinder) }, 
      focusOffsetComputer(root, pathFinder) { return cursorOffsetToDOM(root, that.document, that.focusOffset)(pathFinder) } 
    }
  }


  get _startBoundary() {
    return this.document.cursorToBoundaryFavorRight(this.startOffset)
  }
  get _endBoundary() {
    return this.document.cursorToBoundaryFavorLeft(this.endOffset)
  }

  get totalCursorPositions() {
    return this.document.totalCursorPositions
  }

  // ----- Builders ------

  applyTag(tag) {

    const newDoc = this.copy()
    newDoc.document = this.document.applyTags([tag], this._startBoundary, this._endBoundary)
    newDoc.notifySelectListeners()

    return newDoc
  }

  toggleTags(tags) {
    const newDoc = this.copy()
    newDoc.document = this.document.toggleTags(tags, this._startBoundary, this._endBoundary)
    newDoc.notifySelectListeners()
    return newDoc
  }
  toggleTag(tag) {
    // return this.toggleTags([tag], [attributes])

    const lb = this._startBoundary
    const rb = this._endBoundary
    if (this.document.selectionHasTag(tag, lb, rb) && !this.document.selectionEntirelyHasTag(tag, lb, rb)) {
      // if the selection has a mix of tagged segments and untagged segments then applyTag
      return this.applyTag(tag)
    }
    return this.toggleTags([tag])
  }

  setBlockTag(tag) {
    const lb = this._startBoundary
    const rb = this._endBoundary
    const newDoc = this.copy()
    newDoc.document = this.document.updateBlocks(tag, lb, rb)
    newDoc.notifySelectListeners()  // TODO gotta do away with this pattern... or update it... something.
    return newDoc
  }

  indentBlock(amount = 1) {
    const lb = this._startBoundary
    const rb = this._endBoundary
    const newDoc = this.copy()
    newDoc.document = this.document.indent(amount, lb, rb)
    newDoc.notifySelectListeners()  // TODO gotta do away with this pattern... or update it... something.
    return newDoc
  }

  // ----- Accessors ------

  select(anchorIndex=0, focusIndex=undefined) {
    // Honestly after reading Crafting Interpreters I can't get +1 in a bounds check out of my head (as opposed to >= ). 
    // Like I read it differently- "If the next index after anchor would be out of bounds," using + is like left shift
    // with +1 we can think of it as "nth"s, like index 0 is 1st, index 10 is 11th, index length - 1 is "length"th
    if (anchorIndex < 0 || anchorIndex + 1 > this.totalCursorPositions) anchorIndex = 0
    if (focusIndex < 0 || focusIndex + 1 > this.totalCursorPositions) focusIndex = this.totalCursorPositions - 1

    if (focusIndex === undefined) focusIndex = anchorIndex
    this.anchor = anchorIndex
    this.focus = focusIndex
  }

  at(characterIndex = undefined) {
    if (characterIndex === undefined) characterIndex = this.focusOffset
    return this.document.at(characterIndex)
  }
  selection() {

    return this.document.selection(this.startOffset, this.endOffset)
  }

  // ----------------------

  // delete, write should do notifies- but the notify system lacks the complexity
  // to deal with the separate situations a listener may like to listen to.
  // In the current iteration, all selection events are ignored by renderers under
  // editDocs, and received by all independent renderers. For now that should 
  // suffice, the use is a little awkward.
  // mmm. we can support the current iteration with the ability to 'suppress'
  // notifications to not trigger events. This lets us perform normally notifying
  // mutations in succession and only notify on the last one. This makes it a little
  // more seamless experience for clients of renderers.
  // may be better if we separate the 'outside' triggers into methods that will always
  // notify. these methods compose EditDoc operations, none of which 'notify'. This
  // would cover every situation, remove the burden to notify from EditDoc (it's not
  // an EditDocument's responsibility, per se). Yeah. A notify revamp is in order.
  // hmm. I could do that from the outside.
  // essentially, wrap all methods that need to notify- yes- in EditDocMixin. Then,
  // when any is called, it sets a flag. If the flag is set the method knows to notify.
  // if as part of that call another mutation is used the flag is already set so it
  // will not notify. might need a pair of flags really, one peticular to the method
  // received so it remembers it is the one that set the flag, or perhaps the flag is
  // in fact a counter. Each adds, each removes. If it removes and the count is 0 this
  // is the first one called, the full stack is popped, so notify.
  /**
   * Delete the currently selected text. If the selection is
   * collapsed, deletes the character to the right of the
   * cursor.
   */
  delete(notify = true ) {
    const result = this.copy()
    const from = this._startBoundary
    const to = this.isCollapsed ? this.document.cursorToBoundary(this.endOffset + 1) : this._endBoundary
    result.document = result.document.deleteBoundary(from, to)
    result.select(this.startOffset)

    if (notify) result.notifySelectListeners()  // todo changing
    return result
  }

  /**
   * Insert the string into the document at the selected
   * position. Overwrites existing selection.
   * 
   * @param string content to be written
   * @returns An edit doc with the string inserted to the right place
   */
  write(string, notify = true) {
    let result = this.copy()

    if (!this.isCollapsed) result = result.delete(false)
    result.document = result.document.writeBoundary(string, this._startBoundary)
    result.select(result.startOffset + [...string].length)

    if (notify) result.notifySelectListeners()  // todo changing
    return result
  }

  /**
   * Classically this creates a new paragraph from where the cursor is.
   * In EditDoc paragraphs are represented as block contexts in the 
   * with the Context class. We have other kinds of Context and they
   * all support a similar operation, not all are going to produce a
   * new "paragraph". Hence the name is "enterNewline".
   * 
   * Generally it splits a block context at the location creating a new
   * one directly after the previous.
   */
  enterNewline(notify = true) {
    let result = this.copy()

    if (!this.isCollapsed) result = result.delete(false)
    // a delete collapses the cursor. Then this._startBoundary === this._endBoundary
    result.document = result.document.contextBreakAt(this._startBoundary)
    result.select(result.endOffset + 1)

    // Set new Context to a paragraph.
    result.document = result.document.updateBlock('p', result._endBoundary)

    if (notify) result.notifySelectListeners()
    return result
  }

  accept(visitor, ...args) {
    return visitor.visitDocument(this, ...args)
  }

  toString() {
    // note that the "\n" (which again, we just use ' ', but. Maybe we should use '\n') of the last paragraph is always present
    // but not always addressable (can't click there), it's not a rendered character
    return this.document.toString()
  }

}

// mix in listener
// Im. Not the most fond. This has a bit of a code smell. In a sense I don't want the listening capability to interfere but. Confusing.
// I think I can do better. have a "ListenerMixinMeta". Instancing ListenerMixinMeta with a method name creates a ListenerMixin which
// when extended adds listener attachment capabilities to the method. Can supply > 1 method name too.
// so the below declaration would become
// let EditDocumentMixListener = class extends ListenerMixinMeta('select')
// Thoughts for the future at any rate.
let EditDocumentMixListener = class extends _EditDocument {
  constructor() {
    super()
    this._listenersSelect = []
  }
  copy() {
    const doc = super.copy()
    doc._listenersSelect = this._listenersSelect
    return doc
  }
  select(anchorIndex, focusIndex) {
    super.select(anchorIndex, focusIndex)
    this.notifySelectListeners()
  }
  notifySelectListeners(editDoc = this) { // May not be strictly necessary to parameterize, leaving as an option for now
    this._listenersSelect.forEach(listener => listener(editDoc))
  }
  addSelectListener(callback) {
    this._listenersSelect.push(callback)
  }
  removeSelectListener(callback) {
    if (this._listenersSelect.includes(callback)) {
      this._listenersSelect.splice(this._listenersSelect.indexOf(callback))
      return callback
    }
    return undefined
  }
}

const EditDocument = EditDocumentMixListener
export default EditDocument

// export default EditDocument;

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

  // classes
  _EditDocument,
}
