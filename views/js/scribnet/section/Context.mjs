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

const BLOCKS = ['p', 'h1', 'h2', 'h3', 'pre']

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

  toString() {
    return this.characters.join('')
  }

}

class Context extends Section {
  constructor() {
    super()
    this.block = 'p'
  }

  static createContext(blockTag, ...segments) {
    const result = this.from(...segments)
    return result.updateBlock(blockTag) // not strictly necessary, we could modify .block here. Trying to stick to a pattern though of preferring "mutative" methods
  }

  copy() {
    const clone = super.copy()
    clone.block = this.block
    clone.indentationAmount = this.indentationAmount
    clone.indentationWidth = this.indentationWidth
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

  updateBlock(blockTag) {
    const result = this.copy()
    result.block = blockTag
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

  // merge(other) {

  //   if (other instanceof Context) 
  //     return [ this.join(other) ]

  //   return [ this, other ]

  // }

  get characters() {
    return this.atoms
  }

  toString() {
    return this.characters.join('') + "\n"
  }

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

  static createSection(tag, ...subPiecees) {
    
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
    const [ contextIndex, _ ] = this._locateBoundary(boundaryLocation)
    const result = this.copy()
    result.subPieces.splice(contextIndex, 1, result.contexts[contextIndex].updateBlock(blockTag))
    return result
  }

  updateBlocks(blockTag, startBoundary, endBoundary) {
    const [ leftSectionIndex, leftOffset ] = this._locateBoundary(startBoundary)
    const [ rightSectionIndex, rightOffset ] = this._locateBoundary(endBoundary)

    const patchedContexts = this.contexts.filter((_, index) => index >= leftSectionIndex && index <= rightSectionIndex)
      .map( ctx => ctx.updateBlock(blockTag))

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
    return this.splitInterior(location)
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
  cursorToBoundary(cursorPosition) {

    let offset = cursorPosition
    let boundary = 0

    // position counts by cursor positions, boundary counts up by boundaries
    for (const ctx of this.contexts) {
      // if (positiion < ctx.cursorPosLength) {
      if (offset < ctx.length + 1) {
        for (const seg of ctx.segments) {
          if (offset < seg.length + 1) {
            return boundary + offset  // we add 1 to the offset to account for the skipped left-most boundary
          }   

          boundary += seg.boundariesLength
          offset -= seg.length  // cursorPositions length excludes boundary between Segments.
        }
      }
      boundary += ctx.boundariesLength
      offset -= ctx.length + 1  // so-called "cursorPositions" length, which includes bndry between Context.
    }

    // stub
    return 0
  }

  boundaryToCursor(boundary) {

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
    const [ left, middle, right ] = this.triSplit(start, end)

    const result = middle.contexts.map(ctx => ctx.segments).flat()

    return result.some(seg => seg.hasTag(tag))
  }
  selectionEntirelyHasTag(tag, start, end) {
    const [ left, middle, right ] = this.triSplit(start, end)

    // cut empty because some of the Segment are produced as empty and un-tagged
    const result = middle.cutEmpty().contexts.map(ctx => ctx.segments).flat()

    return result.every(seg => seg.hasTag(tag))
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
    return this.length + this.contexts.length
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

export { Doc, Context, Segment, Gap }



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