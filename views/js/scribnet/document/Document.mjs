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
  // seal the object? I don't want characters/length to be mutable.
  // Holding off for now, I don't need to enforce immutability and
  // for the time being, as fun as property attributes are, it's
  // too much to dig around that API

  static taggedSegment(tags, string) {
    
    const uniqueTags = new Set(tags)
    const seg = new Segment()
    const characters = [...string]
    seg.tags = [...uniqueTags]
    seg.length = characters.length
    seg.characters = characters
    seg.templateFn = html
    return seg
  }

  empty() {
    return this.length === 0
  }

  applyTags(tags, start = 0, end = -1) {
    // if (tags.length === 0) {
    //   return this
    // }
    // const newTags = tags.filter(t => !this.tags.includes(t))
    // lmao so. We already filter unique on tags, don't have to double enforce it so to speak.
    return this.replaceTags([...this.tags, ...tags])
  }

  replaceTags(tags) {
    const seg = Segment.taggedSegment(tags,'')
    seg.characters = this.characters
    return seg
  }

  push(...chars) {
    const newSeg = new Segment(this.tags, ...this.characters)
    newSeg.characters.push(...chars)
    newSeg.length = newSeg.characters.length
    return newSeg
  }

  slice(start, end) {
    const sliced = this.characters.slice(start, end)
    return new Segment(this.tags, ...sliced)
  }

  split(idx) {
    return ListSegment.from(this.slice(0, idx), this.slice(idx, -1))
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

  eq(other) {
    if (other instanceof Segment && this.characters === other.characters) {
      for (let i = 0; i < this.tags.length || i < other.tags.length; i++) {
        if (! (this.tags.includes(other.tags[i]) && other.tags.includes(this.tags[i]) ) ) return false
      }
      return true
    }
    return false
  }

  render() {
    return this.templateFn(this.tags)`${this.characters}`
  }
}

/**
 * ListSegment is a list of segment
 * It derives its attributes from its elements
 */
class ListSegment extends Segment {
  constructor() {
    super()
    this.segments = []
  }

  static from(first, ...rest) {
    const listSeg = new ListSegment()
    if (first === undefined || first.length === 0) {
      return listSeg
    }
    if (rest.length === 0) {
      return first
    }
    listSeg.segments = [first,...rest]
    return listSeg
  }

  static split(index) {
    const [ splitSeg, offset ] = this._locate(index)
    const [ left, right ] = splitSeg.split(offset).segments
    return [
      ListSegment.from(...[this.segments.slice(0, splitSeg)], left), 
      ListSegment.from(right, ...[this.segments.slice(splitSeg + 1)]), 
    ]
  }

  get characters() {
    if (this._characters === undefined) {
      this._characters = this.segments.reduce((charsSoFar, segment) => charsSoFar + segment.characters.join(''), "")
    }
    return this._characters
  }

  get length() {
    if (this._length === undefined) {
      this._length = this.segments.reduce((lengthSoFar, segment) => lengthSoFar + segment.length, 0)
    }
    return this._length
  }

  _locate(characterIndex) {
    let segmentIndex = 0
    while (characterIndex > this.segments[segmentIndex].length) {
      segmentIndex++;
      characterIndex -= this.segments[segmentIndex].length;
    }
    return [ segmentIndex, characterIndex ]
  }

  _normalize(idx) {
    if (idx > this.length) {
      return this.length
    }
    if (idx < 0) {
      idx = idx % this.length
      id = (idx === 0) ? 0 : idx + this.length
    }
    return idx
  }


  applyTags(tags, start, end) {
    if (tags === undefined || tags.length === 0) return this
    if (!( start < end)) return this
    if (start >= this.length) return this

    start = (start === undefined) ? 0 : start
    end = (end === undefined) ? this.length : end 
    start = this._normalize(start)
    end = this._normalize(end)

    if (start === 0 && end === this.length) {
      return ListSegment.from(this.segments.map( seg => seg.applyTags(tags) ))
    }

    let [ prefix, affected ] = this.split(start)
    let [ infix, postfix ] = affected.split(end - prefix.length)

    return ListSegment.from(prefix, infix.applyTags(tags), postfix)
  }

}

const pairComp = (p1, p2, cmp=(x,y)=>x-y) => {
  const outer = cmp(p1[0], p2[0])
  return outer === 0 ? cmp(p1[1], p2[1]) : outer
}

// tags (elements)- operate somewhat like sets. In that we are computing presence or absence.
// then along the way its set complements and unions and what-what.
// At the in-line level at least. I'm thinking we can treat applying inline tags like applying Set 
// operations, and when it comes time to render, that's when any sorting of tags
// comes into play, where we merge and do all that other nice stuff. but the
// internal state doesn't have to really reflect the end state does it now!
// block level tags are different because they affect just a single Segment, they are a Set minus
// and union, ridding the old and adding the new. perhaps, for instance, we can treat all "block"
// tags like a Union type where setting a new one overwrites the previous one.
// Inline tags then are Composite types that setting a new one simply adds it to the previous,
// replacing an earlier of the same but that has practically nil effect
// we'll consider the Set semantics more formally in an abstraction after getting a basic version
// working
function applyTag(tag, segment) {
  // yeah i'd like to implement with a set. Yet for now.
  // Only handling inline case for time being

  if (!segment.tags.includes(tag)) {
    return segment.applyTag([...segment.tags, tag])
  }
  return segment
}

// function segmentsSplit(segments, idx) {

//   let segIdx = 0
//   while (idx < )

// }

// edge case is what happens at the edges. Applying a tag partway into an offset requires splitting it
// first, then applying, so we need to start with a helper
function applyTagToSegments(tag, segments, startCoords, endCoords) { // TODO abstract Segment coords into a total ordering? so we can define comparision functions in just one place ._.
  // should this go in doc, then we scrape out the start/end parameters? just use the 'selection'? that's partially what it is for, right? hmm
  const applyApplyTag = seg => applyTag(tag, seg)
  const [prefix, infix, postfix] = [
    segments.slice(0, startCoords[0]),
    segments.slice(startCoords[0], endCoords[0] + 1),
    segments.slice(endCoords[0] + 1, -1),
  ]

  const [ startLeft, startRight ] = infix.at(0).split(startCoords[1])
  const [ endLeft, endRight ] = infix.at(-1).split(endCoords[1])
  const affected = [ startRight, infix.slice(1,-1), endLeft].map(applyApplyTag)

  return [prefix, startLeft, affected, endRight, postfix].flat()

  // if (pairComp(startCoords, endCoords) === 0) {
  //   return [...prefix, ...affected.map(applyApplyTag), ...postfix]
  // } else {
  //   if (pairComp(startCoords, endCoords) > 0) return segments

  //   const [startLeft, startRight] = segments[startCoords[0]].split(startCoords[1])
  //   const [endLeft, endRight] = segments[endCoords[0]].split(endCoords[1])

  //   const result = [
  //     segments.slice(0, startCoords[0]), startLeft,
  //     [startRight, segments.slice(startCoords[0]+1, endCoords[0]), endLeft].map(applyApplyTag),
  //     endRight, segments.slice(endCoords[0] + 1)
  //   ].flat()

  //   // I hate it, burn it now
  //   return [ 
  //     ...segments.slice(0, startCoords[0]),
  //     applyTagToSegments(tag, [ segments.at(startCoords[0]),    [0, startCoords[1]], [0, -1] ]), 
  //     ...segments.slice(1,-1),
  //     applyTagToSegments(tag, [ segments.at(endCoords[0]),      [0, 0], [0, endCoords[1] ] ]),
  //     ...segments.slice(endCoords[0] + 1)
  //   ]
  // }
}
// mmmmm I want to make EditSegments, a type for fast manipulation but slowish reads.
// Might need to engineer a way to detect which parts of a segment changed and see if I can get away with
// partial renders. I think that's feasible.

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
  // mutators
  applyTag, 
  applyTagToSegments, 

  // derivators
  charOffset, // derive cursor position in DOC from given node/nodeoffset from DOM
  segmentate, // functionally process an element into a list of segments (compose with treeTraverse)

  // templaters
  html, md,

  // builders
  loadDocument, 
  loadHTML,

  // Types
  Segment, ListSegment
}
