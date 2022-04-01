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

import Segment from "./Segment.mjs"

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

  targetedBy(func) {
    const targetedByFuncs = ['updateBlock']

    return targetedByFuncs.includes(func.name)
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

  contextSplit(location) {

    // const [ index, offset ] = this._locateBoundary(location)
    // const newSections = this.subPieces[index].contextSplit(offset)

    // return this.splice(index, 1, ...newSections)

    return this.contextBreakAt(location)

  }

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

  contextSplit(boundary) {

    const [ index, offset ] = this._locateBoundary(boundary)
    const nextContext = this.subPieces[index]

    if (nextContext instanceof MixedContext)
      return [ this.splice(index, 1, ...nextContext.contextSplit(offset)) ]

    // instance is a Context that is not mixed

    //        |         split 
    // LI
    // H1 P P P P P
    // =>
    // LI         LI
    // H1 P P lP  rP P P

    const [ ctxLeft, ctxRight ] = nextContext.contextSplit(offset)
    const left = this.slice(0, index).addSubSections(ctxLeft)
    const right = this.slice(index + 1).splice(0,0,ctxRight)
    // const left = this.slice(0, index).addSubSections(ctxLeft)
    // const right = this.slice(index + 1).addSubSections(ctxRight)

    return [ left, right ]

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


export { Context, MixedContext, Gap, filterInline, isBlock }

export default Context



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