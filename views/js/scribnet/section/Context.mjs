/**
  - Context is a view over ListSegment
  - Context informs when blocks nest, should merge, end, etc.
  - Dedicated context understanding extracts responsibility from, e.g,
     renders from tracking when a block ends
  - Present "block" tracking is managed by looking for a "\n" which is
    understood to terminate a block. Normal user input does not have
    any newlines at all, it's a hidden piece of segments. Still
    selectable. And still deletable.
  - Looking at newlines is insufficient for complicated actions that
    alter the structure of the document.
  - Putting that Burden on segment decoheres its purpose to manage the
    "linear" view of the document, which it does very well. Adding
    block tracking on top of that is possible but, again, not cohesive
  - Rather, we'll couple the notion with a dual data structure.
  - Even if we put block tracking in Segment we are setting ourselves
    up for a complicated future where Segments not only have to merge
    blocks when appropriate but also pay attention to nesting.
  - For a linear structure that's impractical and would demand a 
    redesign
  - One model to approach this thinking is Segments are like a tokenized
    form of the document that we access to manipulate directly
  - then a Context is a tree that tracks segments and pays attention to
    operations, lifting "linear" operations (like deleting across blocks)
    into tree based actions where it's handled at the right level of
    abstraction
  - With this model we can think of it like parsing. Key understanding is
    typically you don't modify the Token list when parsing, except maybe
    to implement syntactic sugar. But when you do that it doesn't happen
    at the level of the token, it happens at the higher AST level when
    composing them into expressions.
  - This is similar except we need to comprehensively take edits applied
    to the "tokens" (ListSegment) and appropriately update the higher
    level data structure. And I'd like to avoid applying the edits to the
    higher level structure, it should be more responsive. 
  The goal:
    Extract out a useful pattern for "Edits to lower level representation
    reflect comprehsnively in higher level representation"
  Tricky piece: 
    Segments do not generally contain enough information to statically
    understand them as a list (unlike viewing source code for example).
    In a sense the segment "language" is regular and doesn't support
    nesting. 
  An answer:
    Get around that by nto trying to "parse" something that doesn't hold
    the higher level semantics by instead understanding the *deltas* to it
    as transitions from one ListSegment to another but also from one Context
    to another. Both respond, Context can then be aware when Segments need
    manipulating. 
    
  A static Segment on its own doesn't have enough information and we are not
  planning to overload it with scoping information.
  Although, maybe we should? 
  But maybe that's just what Context is doing. I'm not sure what it will
  look like yet, design wise. This is the gist and my initial brain dump
  on the matter to get my first thoughts out and processed.
 */

/**
 * TODO there is an abundance of common functionality we could abstract factor
 * out. "List of varying sized components" supporting a few operations- determine
 * index within a component, split, insert, delete, etc etc.
 * Not feeling it /immediately/ but it should be within grasp.
 */

import Section from "./Section.mjs"
import { AtomicSection } from "./Section.mjs"

// in my post fix comments below Im talking about "blocks holding contexts". I mean to say that for these
// block elements some of them are only appropriate for certain Contexts. this way I can safely assume
// certain facts about that Context such as what kind of children it has, and I can contextually handle
// different scenarios.
const BLOCKS = ['p', 'div', 'h1', 'h2', 'h3', 'pre', 'ul', 'ol', 'li'] // any block at all
const MIXED_BLOCKS = ['div','li'] // blocks that hold only Contexts in practice, but theoretically 'mix' blocks and Segments
const CONTEXT_BLOCKS = [] // blocks that hold contexts

// I don't particularly /want/ 'div's, I don't expect to render them. They're here to be a default for MixedContext.
// TODO consider pulling a situation where '.from' returns a list. If that list is a singleton then all is the same,
//  if not then we still must handle it. Will allow for situations like these where if we get Context.from(...) then
//  the args are a mix of Context and Segments, we don't necessarily want to prescriptively nest them in a 
// MixedContext because it will pop a <div> around that assortment. 
// I'll do that for now. I might find that behavior preferable down the line. But I might also prefer the option to
// choose if and when we want to have multiple results or not. Fast and loose.


const filterInline = tag => !BLOCKS.includes(tag)
const isBlock = tag => BLOCKS.includes(tag.toLowerCase())

// Boundary constants. I did some long hand writing on these, may bring in to comments.
const [ LEFT, RIGHT ] = [ 0, 1 ]

// Given a boundary, identified by the index to it's immediate right, determine it's address
// in terms of "index, orientation" ordered pair. That is, "toRight" is the pair where the
// orientation is RIGHT, "toLeft" where the orientation is LEFT.
const convertIndexToRight = idx => [ idx - RIGHT, RIGHT ]
const convertIndexToLeft = idx => [ idx - LEFT, LEFT ]

class Segment extends AtomicSection {
  constructor() {
    super()
    this.tags = []
  }
  static createSegment(tags, string) {
    const result = this.from(...string)
    result.tags = Array.isArray(tags) ? tags : [ tags ]
    return result
  }
  // static from(...)
  copy() {
    const clone = super.copy()
    clone.tags = this.tags
    return clone
  }

  targetedBy(func) {
    // TODO would like to make this polymorphic yknow. But I don't want to put it back in "Section". Need some multi inheritance. Maybe I should inject it on the constructor.
    return table.check(this.constructor, func)  
  }

  mixesWith(other) {
    return other instanceof Segment && this._eqTags(other)
  }

  ////////
  _filterTags(tags) {
    const unique = new Set(tags.map(str => str.toLowerCase()).filter(filterInline))
    return [...unique]
  }
  _eqTags(otherSegment) {
    const thisTags = new Set(this.tags)
    const otherTags = new Set(otherSegment.tags)
    const thisContainsOtherTags = otherSegment.tags.every(t => thisTags.has(t))
    const otherContainsThisTags = this.tags.every(t => otherTags.has(t))
    return thisContainsOtherTags && otherContainsThisTags
  }

  /* TODO I could argue these don't need to clone, since they're operating on clones. That might not be a given, though.
      Might be worth letting them be mutators. But I'm also just happy to consume memory for now.
  */
  applyTags(tags) {
    return this.replaceTags([...this.tags, ...tags])
  }
  removeTags(tags) {
    return this.replaceTags(this.tags.filter(t => !tags.includes(t))) // I am passing an iterator, not a list, but replaceTags handles that because _filterTags handles it
  }
  toggleTags(tags) {
    return this.replaceTags([
      ...this.tags.filter(t => !tags.includes(t)),
      ...tags.filter(t => !this.tags.includes(t))
    ])
  }
  replaceTags(tags) {
    const seg = this.copy()   
    seg.tags = this._filterTags(tags)
    return seg
  }
  hasTag(tag) {
    return this.tags.includes(tag.toLowerCase())
  }

  applyTag(tag) { return this.applyTags( [tag] ) }
  removeTag(tag) { return this.removeTags( [tag] ) }
  toggleTag(tag) { return this.toggleTags( [tag] ) }
  replaceTag(tag) { return this.replaceTags( [tag] ) }

  get characters() {
    return this.atoms
  }

  get totalCursorPositions() {
    // boundariesLength minus an overcount of 0
    return this.boundariesLength
  }

  cursorToBoundary(cursorPosition) {
    if (cursorPosition < this.totalCursorPositions) return cursorPosition
  
    return 0
  }

  toString() {
    return this.characters.join('')
  }

}

class Context extends Section {

  constructor() {
    super()
    this.block = this.constructor.defaultBlockTag

    this.indentationAmount = 0
  }

  static defaultBlockTag = 'p'

  static from(...sections) {
    if (sections.some(sec => sec instanceof Context)) return MixedContext.from(...sections)
      // sections = sections.map(sec => sec instanceof Context ? sec : Context.from(sec))

    return super.from(...sections)
  }

  static createContext(blockTag, ...segments) {
    const constructor = MIXED_BLOCKS.includes(blockTag.toLowerCase()) ? MixedContext : Context
    const result = constructor.from(...segments)
    return result.updateBlock(blockTag) // not strictly necessary, we could modify .block here. Trying to stick to a pattern though of preferring "mutative" methods
  }

  copy() {
    const clone = super.copy()
    clone.block = this.block
    clone.indentationAmount = this.indentationAmount
    return clone
  }

  /**
   * Determines whether this Section is considered "empty".
   * Contexts are always non-empty, even if they have 0
   * sub sections. 
   * TODO change the name to something less confusing, so that
   *  "empty" <=> length === 0
   * 
   * @returns false
   */
  empty() {
    return false
  }

  insert(location, string) {
    if (this.subPieces.length === 0) return this.copyFrom(Segment.from(...string))

    return super.insert(location, string)

  }

  insertBoundary(boundaryLocation, atoms) {
    if (this.segments.length === 0) {
      const result = this.addSubSections(Segment.from())
      return result.insertBoundary(boundaryLocation, atoms)
    }
    return super.insertBoundary(boundaryLocation, atoms)
  }


  // ---------------------------
  //  Context Specific functions

  contextBreakAt(location) {

    const [ left, right ] = this.split(location)

    return [ left, right.updateBlock('p') ]
  }

  updateBlock(blockTag) {
    const result = this.copy()
    result.block = blockTag
    return result
  }

  indent(amount=1) {

    const result = this.copy()
    result.indentation += amount
    return result

  }
  
  updateAttributes(options) {
    const { blockTag = this.block, indentDelta = 0 } = options
    const result = this.copy()

    result.block = blockTag
    result.indentation += indentDelta

    return result

  }

  set block(tag) {
    if (BLOCKS.includes(tag.toLowerCase())) this.blockTag = tag.toLowerCase()
  }
  get block() {
    return this.blockTag
  }

  get segments() {
    return this.subPieces
  }

  get indentation() {
    return this.indentationAmount
  }
  set indentation(newAmount) {
    if (newAmount >= 0) {
      this.indentationAmount = newAmount
    } else {
      this.indentationAmount = 0
    }
  }

  get characters() {
    return this.atoms
  }

  get totalCursorPositions() {
    return this.boundariesLength - this.overCount()
    // if (this._numCursorPos === undefined) {
    //   if (this.subPieces.every(sec => sec instanceof AtomicSection)) {
    //     this._numCursorPos = 1 + this.length
    //   } else {
    //     this._numCursorPos = this.subPieces.reduce((prev, sec) => prev + sec.totalCursorPositions, 0)
    //   }
    // }
    // return this._numCursorPos
    
  }

  cursorToBoundary(cursorPosition, favorLeft=true) {

    let offset = cursorPosition
    let boundary = 0

    const allSegChild = this.subPieces.every(sec => sec instanceof Segment)
    const cursorPosMod = allSegChild && !favorLeft ? 1 : 0
    const resultMod = allSegChild && !favorLeft ? this.subPieces.length - 1 : 0

    for (const sec of this.subPieces) {
      // const cursorPosModifier = sec instanceof Segment ? modifier : 0
      if ( offset < sec.totalCursorPositions - cursorPosMod )
        return boundary + sec.cursorToBoundary(offset)

      boundary += sec.boundariesLength
      offset -= (sec instanceof Segment) ? sec.length : sec.totalCursorPositions
    }

    return boundary - resultMod

  }

  toString() {
    return this.characters.join('') + "\n"
  }

}

class MixedContext extends Context {

  static defaultBlockTag = 'div'

  static from(...sections) {
    return Section.from.bind(MixedContext)(...sections.map(sec => sec instanceof Segment ? Context.from(sec) : sec))
  }

  contextBreakAt(location) {
    const [ sectionIndex, offset ] = this._locateBoundary(location)

    const newContexts = this.subPieces[sectionIndex].contextBreakAt(offset)

    return [ this.splice(sectionIndex, 1, ...newContexts) ]
  }
}

// TODO Consider to add another Context subclass that is a "Context containing
// only Segment children". There are a number of situations where we are testing
// if all subPieces are Segment or not and that has a code smell to it.

class NakedContext extends Context {

  static QUALIFIED_LEAP = 3 // arbitrary number. TODO- the "path" produced by locateBoundaryFullyQUalified is simple,
  // To simple for NakedContext. see, a naked context doesn't "count" so in effect it's children "expand" to fill it's
  // space in the level that it occupies. But those children /are not counted/ in the subpieces of the parent of the
  // naked context. so for now i'm introducing this kludgy "control" step which will need to be processed by whoever
  // consumes the path. It introduces a noxious interdependency. I'd like to keep it straight forwarded, and I Don't
  // presently have the energy to invest in a better data structure (say, produce an "instruction set" like byte code
  // with agreed upon interfaces).
  // this instruction will be to replace the slot in the path with the next index value (0 if none) plus the boundary
  // index produced here. It's also an instruction to add in any other NakedContext subPiece lengths encountered
  // earlier.
  // or. I can make an executive decision. we'll process mixed siblings by wrapping Segments not in NakedContext but in
  // default Context. a <p>. I can't presently justify complicated machinery to handle this niche case, not for the 
  // promised reward. The upside (allowing mixed blocks/inline in the OUTPUT, just not in the behind-the-scenes) doesn't
  // feel worth it to me.
  // that might change in the future. For now... putting this dog to rest. I'll leave the class here as a monument to
  // hubris or something.

  updateBlock(blockTag) {
    const result = Context.createContext(blockTag, ...this.subPieces)
    result.indentationAmount = this.indentationAmount
    return result
  }
  updateAttributes(options) {
    const result = super.updateAttributes(options)
    if (options.blockTag !== undefined || options.blockTag !== '') {
      return result.updateBlock(options.blockTag)
    }
    return result
  }
  _locateBoundaryFullyQualified(boundaryIndex, sectionIndices=[]) {
    // nearly identical to _locateBoundaryFullyQualified in typical Section. The difference is we
    // do not consider a NakedContext "part" of the path, so we leave off appending the "index".
    // it's children are considered sort of "direct" children to 

    if (this.subPieces.length === 0) return [ sectionIndices, boundaryIndex ]

    const [ sectionIndex, boundaryIndexInSection ] = this._locateBoundary(boundaryIndex)

    return this.subPieces[sectionIndex]._locateBoundaryFullyQualified(boundaryIndexInSection, sectionIndices)

  }
  set block(tag) {}
  get block() { return '' }
}

class Gap extends Section {
  // maybe Gap should have a block tag. Then at least when we merge we can "preserve" the block tag from the context.
  empty() {
    return false
  }
  get length() {
    return 0
  }

  split() {
    return [ this, this ]
  }

  join(other) {
    if (other instanceof Gap)
      return Context.from(new Segment())

    return other
  }

  // merge(otherSections) {
  //   if (otherSections.length === 0) return [ this ]
  // merge(other) {

  //   if (other instanceof Gap) 
  //     return [ this, Context.from(new Segment()), this ]  // TODO should segment retain styling? hmmm! that would be a bit of a pain

  //   return [ this, other ]

  // }

  get boundariesLength() {
    return 0
  }
}

class Doc extends Section {

  static createSection(tag, ...subPieces) {
    
  }

  static parseSerialDoc(serializedDoc) {
    // throws error if JSON.parse throws error
    let serialDocObj = JSON.parse(serializedDoc)
    // const result = Object.create(this.prototype, Object.getOwnPropertyDescriptors(serialDocObj))

    // result.subPieces = [ ...serialDocObj.map(Context.parseContext) ]

    return this.parse(serialDocObj)

  }

  static isBlock(tag) {
    return isBlock(tag)
  }

  write(string, location=undefined) {
    // TODO implement
    if ( this.empty() )
      return this.addSubSections(Context.from(new Segment())).insert(0, string)

    location = location ?? this.length

    return this.insert(location, string)
  }

  delete(start, end) {
    // Delete override to join Contexts
    // Context joining is a signature trait of using Doc to manage, rather than just having
    // a list of Context. a wrapping Section that understands, well, the Context.

    // Boundary work to determine if boundaries are crossed
    const [ leftSectionIndex, _ ] = this._locateAtomBoundaryLeft(start)
    const [ rightSectionIndex, __ ] = this._locateAtomBoundaryRight(end)

    const result = this.insertSubSections(rightSectionIndex + 1, new Gap()).insertSubSections(leftSectionIndex, new Gap())
    const boundDelete = super.delete.bind(result)
    return boundDelete(start, end).mergeTwoGaps()

  }

  updateBlock(blockTag, boundaryLocation) {

    return this.updateBlockAttributes({ blockTag }, boundaryLocation, boundaryLocation)
  }

  updateBlocks(blockTag, startBoundary, endBoundary) {
    
    return this.updateBlockAttributes({ blockTag }, startBoundary, endBoundary)
  }

  indent(amount, startBoundary, endBoundary) {
    return this.updateBlockAttributes({ indentDelta: amount }, startBoundary, endBoundary)
  }

  /**
   * Bulk update attributes of contexts over a range
   * 
   * @param {ContextOptions} options Options to update attributes of a Context
   * @param {*} startBoundary Beginning of range to update
   * @param {*} endBoundary End of range to update
   * @returns 
   */
  updateBlockAttributes(options, startBoundary, endBoundary) {
    const [ leftSectionIndex, leftOffset ] = this._locateBoundary(startBoundary)
    const [ rightSectionIndex, rightOffset ] = this._locateBoundary(endBoundary)

    const patchedContexts = this.contexts.filter((_, index) => index >= leftSectionIndex && index <= rightSectionIndex)
      .map( ctx => ctx.updateAttributes(options))

    return this.splice(leftSectionIndex, (rightSectionIndex - leftSectionIndex) + 1, ...patchedContexts)

  }

  writeBoundary(string, cursorLocation=undefined) {
    if (cursorLocation === undefined) cursorLocation = this.boundariesLength

    if ( this.empty() )
      return this.addSubSections(Context.from(new Segment())).insert(0, string)
    
    return super.insertBoundary(cursorLocation, string)

  }

  deleteBoundary(startBoundary, endBoundary) {
    return super.deleteBoundary(startBoundary, endBoundary)
    // const [ leftSectionIndex, _ ] = this._locateBoundary(startBoundary)
    // const [ rightSectionIndex, __ ] = this._locateBoundary(endBoundary)

  }

  contextBreakAt(location) {
    const [ secIndex, boundaryOffset ] = this._locateBoundary(location)
    
    const newContexts = this.contexts[secIndex].contextBreakAt(boundaryOffset)
    return this.splice(secIndex, 1, ...newContexts)
    
    // return this.splitInterior(location)
  }

  mergeTwoGaps() {
    // would like to put this in the Gap class but we don't have any Section methods (yet) that would be appropriate to override
    // maybe gap extends Context? mmm. mmm. Such a method would need to return a list of Section.

    // these gaps are more like "bookends". We insert them, then kinda "press" them towards each other, squeezing out "merger". An apple press or something. A contraction.
    let left, right
    left = this.subPieces.findIndex( x => x instanceof Gap )
    right = this.subPieces.findIndex( (x, i) => x instanceof Gap && i > left )

    let merger = this.subPieces[left]
    for ( let i = left + 1; i < right + 1; i++ ) {
      merger = merger.join(this.subPieces[i])
    }

    return this.splice(left, right - left + 1, merger)
    
    // TODO would like to generalize this pattern (joining adjacent Section) into Sections
    //    call it "Squeeze". Love our non-commutative binary operator friends (join could be considered a non commutative binary operation).
    //    and... what do we get when we apply a binary operation over a range of elements...? that's right, reduction! a fold! functors! er.. foldables!

  }

  // --------
  cursorToBoundary(cursorPosition, favorLeft=true) {

    // offset counts by cursor positions, boundary counts up by boundaries
    let offset = cursorPosition
    let boundary = 0

    for (const ctx of this.contexts) {
      if (offset < ctx.totalCursorPositions)
        return boundary + ctx.cursorToBoundary(offset, favorLeft)

      boundary += ctx.boundariesLength
      offset -= ctx.length + 1
    }
    return 0
  }

  boundaryToCursor(boundary) {

  }

  /**
   * Computes the cursor positions by summing the length (in
   * atoms) plus the number of contexts. 
   *
   * Roughly, a cursor can exist 
   * - between each atom (this.length - 1 positions)
   * - at an extra position between each context 
   *   (this.contexts - 1 positions) 
   * - at the beginning and end (2 positions)
   * yielding the sum formula.
   * 
   * @returns Total number of "cursor positions" in this Doc
   */
  totalCursorPositions() {
    // Total
    return this.length + this.contexts.length
  }

  selection(cursorStart, cursorEnd) {
    // TODO should we add new lines for Context? Otherwise all selections are this "flat" result. Probably should. . . . later.
    const lb = this.cursorToBoundary(cursorStart)
    const rb = this.cursorToBoundary(cursorEnd)

    return this.atomSlice(lb, rb).join('')
  }

  // _locateBoundary()

  // -------------------

  get characters() {
    return this.atoms
  }

  get contexts() {
    return this.subPieces
  }

  applyTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.applyTags(tags) }, start, end)
  }
  removeTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.removeTags(tags) }, start, end)
  }
  toggleTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.toggleTags(tags) }, start, end)
  }

  selectionHasTag(tag, start, end) {
    const any = this.predicateSlice( sec => sec instanceof Segment && sec.hasTag(tag), start, end )
    return any.length > 0
  }
  selectionEntirelyHasTag(tag, start, end) {
    const allMinOne = this.predicateSlice( sec => sec instanceof Segment, start, end )
    return allMinOne.length > 0 && allMinOne.every(sec => sec.hasTag(tag))
  }

  toString() {
    return this.characters.join('')
  }

  get boundariesLength() {
    if (this._boundariesLength === undefined) {
      this._boundariesLength = this.subPieces.reduce((lengthSoFar, section) => lengthSoFar + section.boundariesLength, 0)
    }
    return this._boundariesLength
  }


  get totalCursorPositions() {
    return this.boundariesLength - this.overCount()
    // if (this._numCursorPos === undefined) {
    //   this._numCursorPos = this.subPieces.reduce( (prev, sec) => prev + sec.totalCursorPositions, 0 )
    // }
    // return this._numCursorPos
  }

}
/* 
 on map/operate,
  I want a pattern that captures "answering". we can imagine AtomicSegments are the terminal Sections 
  that answer to any functional application. For a Segment though, unless I make Segments as Atoms 
  then Context as an AtomicSegment, I don't have a way to say "okay, from Doc, which has Contexts, 
  which has Segment, operate 'applyTag'" because it would 'applyTag' to the atoms. In this case that's
  the characters but the characters don't have the tag, the Segment does! 
  
  In this scenario I want "Context" to /ignore/ that call and Segment to *answer* it. The call
  propogation terminates with Segment and doesn't pass to its subPieces (which may or may not be atoms
  from the perspective of the caller, the point is it doesn't matter since the recursion stopped).

  This gives me the flexibility I want without needing to do all the logic coding individually, I want
  that functional feel (tm). This is a decent case for mutli-inheritance, or a metaprogramming mechanism
  where every section tries to "answer" the call but only if it has that function as a property does it
  succeed, otherwise propogate. That option gives me the opt-in semantics and easy syntactics of easily
  specifying which subclasses answer which calls just be writing a function of the name. Maybe still
  use "operate" as the backbone.

  Oh, also, I'd like to parameterize the functional higher order function that operate uses. Right now
  its a "generalization" (or.. specification, maybe) over "map". well. yeah. Specialization of map.
  but t'would be nice to also do e.g filter, reduce.... fold...
 */


// Data tools
// visitor pattern maybe? well we can use this "registration" pattern to inject behavior
function registerStatic(constructor, func) {
  constructor[func.name] = func.bind(constructor)
}
function register(constructor, func) {
  constructor.prototype[func.name] = func
}

function registerStaticCurry(func) { return function(constructor) { registerStatic(constructor, func ) } }
function registerCurry(func) { return function(constructor) { register(constructor, func ) } }

const contextClasses = [ Doc, Context, Segment ]

// Parse tools
const childType = {
  [Doc.name]: Context,
  [Context.name]: Segment,
  [Segment.name]: null
}
function parse(serialObj) {
  const result = Object.create(this.prototype, Object.getOwnPropertyDescriptors(serialObj))
  if (childType[this.name] !== null)
    result.subPieces = [ ...result.subPieces.map(childType[this.name].parse) ]
  return result
}
// function registerParse(constructor) { constructor.parse = parse.bind(constructor) }
// function registerParse(constructor) { register(constructor, parse) }
const registerParse = registerStaticCurry(parse)
contextClasses.forEach(registerParse)

// Gradnularity Mapping

function countSegChildren() {
  // if (this instanceof Segment) return 0
  if (this.subPieces.length === 0) return 0
  return this.predicateSlice( sec => sec instanceof Segment, 0).length
}
function overCount() {
  if (this instanceof Segment) return 0
  if (this.subPieces.every(sec => sec instanceof Segment)) return this.subPieces.length > 0 ? this.subPieces.length - 1 : 0
  return this.subPieces.reduce((prev, sec) => prev + sec.overCount(), 0)
}

contextClasses.forEach(registerCurry(countSegChildren))
contextClasses.forEach(registerCurry(overCount))

function cursorToBoundaryFavorLeft(cursorPosition) {
  if (this instanceof Segment) return cursorPosition
  let position = cursorPosition
  let boundary = 0

  for (const sec of this.subPieces) {
    if (position < sec.totalCursorPositions) {
      return boundary + sec.cursorToBoundaryFavorLeft(position)
    }
    boundary += sec.boundariesLength
    position -= (sec instanceof Segment) ? sec.length : sec.totalCursorPositions
  }
  return boundary + position
}
function cursorToBoundaryFavorRight(cursorPosition) {
  if (this instanceof Segment) return cursorPosition
  let position = cursorPosition
  let boundary = 0
  let boundaryLeft = 0

  for (const sec of this.subPieces) {
    if (position < sec.totalCursorPositions) {
      boundaryLeft = boundary + sec.cursorToBoundaryFavorRight(position)
      break;
    }
    boundary += sec.boundariesLength
    position -= (sec instanceof Segment) ? sec.length : sec.totalCursorPositions
  }

  if (boundaryLeft === 0) boundaryLeft = boundary + position

  if (this.subPieces.every(sec => sec instanceof Segment)) {
    const boundariesKernel = (b1, b2) => this.atomSlice(b1,b2).length === 0
    while (boundaryLeft + 1 < this.boundariesLength && boundariesKernel(boundaryLeft, boundaryLeft + 1))
      boundaryLeft += 1
  }
  return boundaryLeft
}

contextClasses.forEach(registerCurry(cursorToBoundaryFavorLeft))
contextClasses.forEach(registerCurry(cursorToBoundaryFavorRight))


class Table {
  constructor() {
    this.callTable = {
      [Segment.name]: function(func) { return /tag/i.test(func.name) },  // test if 'tag' is a substring of the function name, case insensitive
      [Context.name]: ['updateBlock'],
      [Doc.name]: []
    }
  }

  check (subclass, func) {
    const entry = this.callTable[subclass.name]
    if (typeof entry === 'function') {
      return entry(func)
    } else {
      return entry.includes(func.name)
    }
  }
}

const table = new Table()

export { Doc, Context, MixedContext, Segment, Gap }



/**
 * 
 * Traditional array slicing can conceptually treat "start" and "end"
 * arguments as referring to the "spaces" between elements. As opposed
 * to treating arguments as indices. We can uniquely correspond 
 * indicies to the "boundary" by mapping a value referring to a given
 * index to refer to the boundary to the "Left" of that index.
 * Visualized as follows, given this array of characters "abcdefgh"
 *
 *    a b c d e f g h
 *   |-|-|-|-|-|-|-|-|
 * 
 * A pipe is a "boundary" and a hyphen is an "index". At any index we
 * can refer to the boundary on its left or on its right using a 2
 * dimensioned coordinate. We see that each "interior" boundary has 
 * two unique addresses in this coordinate system. For example, the
 * boundary between b and c can be referred to by either
 *    (1, RIGHT) or (2, LEFT)
 * Boundaries at the extremes have 1 unique address, (0, LEFT) and
 * (array.length - 1, RIGHT) respectively. Note that we could consider
 * boundaries with their own numbering, ranging from 0 to array.length
 * (inclusive) and indices as they are traditionally, 0 to 
 * array.length - 1 but the __combined notation lets us piggy back off
 * results for either under one system__        <-- dunno if I like the wording, I'm trying to hit on a core idea here but the words aren't coming to me.
 * 
 * The Section system is a means of working with overlapping sets of
 * lists (lists of lists) that ultimately boils down to the "list"
 * produced by an in-order traversal of the leaf nodes. We have an 
 * informal notion of "layers".
 * 
 * There are natural "boundaries" between adjacent lists as there are
 * between the atomic elements at the leaves. Suppose we have this list 
 * of Context within a Doc:
 * 
 *   AaaBbbCcc DddEeeFff GggHhh
 *  |---------|---------|------|
 * 
 * We can delete a slice from, say, index 6 to 12.
 * 
 *   AaaBbb Ccc Ddd EeeFff GggHhh
 *  |------*---|---*------|------|
 * 
 * to yield,

 *   AaaBbb EeeFff GggHhh
 *  |------|------|------|
 * 
 * which operates as expected on the "lowest" layer, of the atoms.
 * Section is designed to facilitate this use case. Crucially just as
 * in normal arrays we operate on indices without the boundary 
 * abstraction. Section recursively operates on all the intervening
 * layers (here we just show the one, of Context) cutting them apart,
 * deleting empty Section, and stitching it back up to the top in a
 * natural way.
 * 
 * The challenge arises because we seek to have a different behavior
 * for Context specifically.
 * -------------------------------------------------------------------
 * 
 * A | can be referred to either by the index on its right and the key 
 * LEFT (meaning "left of index") or the index on its left and the key
 * RIGHT (meaning "right of index")

 * viewed as below:
 *
 *   AaaBbbCcc DddEeeFff GggHhh
 *  |---------|---------|------|
 *            ^         ^
 *          start      end
 *
 * In a Section this delete maneouver is fine. We end up removing the 
 * mid section in its entirety. A Doc with Contexts requires
 * disambiguating intervention. This follows from these reasons:
 * - Context can be empty
 * 
 *   AaaBbbCcc  DddEeeFff  GggHhh
 *  |---------||---------||------|
 *              \_______/

 * should yield an empty mid section

 *   AaaBbbCcc           GggHhh
 *  |---------||<empty>||------|
 */

/**
 * The Gap abstraction
 * Context-level abstraction. A "Gap" represents the absence of a Section. It takes 
 * up no space, but is nevertheless "not empty"
 * 
 * Idea: 
 * - After a delete, contexts without a "Gap" between them merge.
 * - Two adjacent gaps produce a new Context
 * - Context Gap Context remains untouched
 * 
 * This removes the need to logically detect when a boundary is crossed during a 
 * delete operation. After applying the delete, in addition to cutEmpty the 
 * merge operations are performed. Context merging with a Gap produces a Context,
 * Gap pair (i.e no change), Gap merge with Gap produces an empty Context,
 * Gap to Context produces Gap, Context (i.e no change). Context - Context as 
 * normal, combining their contents. Covers all the cases. No "edge case" because 
 * we adopt an abstraction that accounts for them.
 * 
 * Challenges:
 *    Gap, as a concept, is not intuitive. It is "empty" (meaning any "locate" 
 *    operation should not identify the Gap as containing, e.g, an atom). Such
 *    methods must correctly "skip" gaps (on both sides, mind). Meanwhile they
 *    are still susceptible to standard delete operation.
 *  
 */