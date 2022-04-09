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
const MIXED_BLOCKS = ['div', 'li'] // blocks that hold only Contexts in practice, but theoretically 'mix' blocks and Segments
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


const findLastIndex = (arr, pred) => {
  let winner = -1;
  arr.reduceRight((prev, cur, idx) => prev ? prev : pred(cur) ? (winner = idx, true) : false, false)
  return winner
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

  convertTo(contextConstructor) {
    const clone = contextConstructor.from(...this.subPieces)
    clone.block = this.block
    clone.indentationAmount = this.indentationAmount

    return clone
  }

  targetedBy(func) {
    const targetedByFuncs = ['updateBlock']


    const containsSubstringIndent = str => /Indent/i.test(str)


    const result = targetedByFuncs.includes(func.name) 
      | containsSubstringIndent(func.name)

    return result
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

  mixBehavior(other) {

    if (other instanceof MixedContext) {

      const sections = [other, ...other._sectionPathToBoundary(0)]
      // by LAW a chain of MixedContexts terminates in a Context/Segment
      // can probably. construe this behavior out in a better way... later.


      // maybe a "detach" method in Section that can "rip out" a Section indicated by a path?

      // TODO A lot of complex logic, like this, for doing tree manipulation- we should strive to
      //    reason about as the interactions between two segments at a time. Right now I'm able
      //    to more or less easily derive the "earliest ancestor" for a 'mix' operation which is
      //    enough information for complicated tree operations yet I can't shake the sensation
      //    that I could model it a little better in smaller pieces. Really leaning into that
      //    OO, like spinning up new kinds of Contexts for example. Might be good to take that
      //    approach. Have to see, design is still.. unfolding.

      const mixedContexts = sections.filter(sec => sec instanceof MixedContext)
      const context = sections.at(mixedContexts.length) // by LAW this should be defined. TODO actually hah back that assertion up.
      const merged = this.merge(context)

      const detached = mixedContexts.map(sec => sec.splice(0, 1))
      const sliceBound = findLastIndex(detached, x => x.subPieces.length > 0)
      if (sliceBound !== -1) {
        const reAttached = detached.slice(0, sliceBound + 1)
          .reduceRight((previous, current) => current.splice(0, 0, previous))

        // LIs should combine if the ctxs are LI and second LI has a UL as it's first child
        const shouldCombineLIs = (ctx1, ctx2) => ctx1.block === 'li' && ctx2.block === 'li' && ctx2.sectionAt(0)?.block === 'ul';

        // shouldNest, nest- more idions to put in Segment perhaps? that is, hooks for customizing merge behavior?
        // TODO ^^  merges are "joins" or "nests" it would seem with some variance
        // its the difference between [ li < h1 > ul ] and [ li < h1, ul > ]. basically a comma.
        if (shouldCombineLIs(merged, reAttached)) {
          return [ merged.addSubSections(...reAttached.subPieces) ]
        }

        return [ merged, reAttached ]
      }

      return [ merged ]
    }
    return super.mixBehavior(other)
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

    const [left, right] = this.split(location)

    return [left, right.updateBlock('p')]
  }

  updateBlock(blockTag) {

    const result = this.copy()
    result.block = blockTag

    return result.updateBlockHook()
  }

  updateBlockHook() {

    if (this.block === 'ul' || this.block === 'ol') {
      return this.convertTo(ListContext)
    } else if (this.block === 'ul') {
      return this.convertTo(ListItemContext)
    }

    return this
  }

  indent(amount = 1, offset = undefined) {

    const result = this.copy()
    result.indentation += amount
    return result

  }

  inceaseIndent() {
    const result = this.copy()
    result.indentation += 1
    return result
  }
  decreaseIndent() {
    const result = this.copy()
    result.indentation -= 1
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
  }

  cursorToBoundary(cursorPosition, favorLeft = true) {

    let offset = cursorPosition
    let boundary = 0

    const allSegChild = this.subPieces.every(sec => sec instanceof Segment)
    const cursorPosMod = allSegChild && !favorLeft ? 1 : 0
    const resultMod = allSegChild && !favorLeft ? this.subPieces.length - 1 : 0

    for (const sec of this.subPieces) {
      // const cursorPosModifier = sec instanceof Segment ? modifier : 0
      if (offset < sec.totalCursorPositions - cursorPosMod)
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
    return Section.from.bind(this)(...sections.map(sec => sec instanceof Segment ? Context.from(sec) : sec))
  }

  indent(amount, offset) {
    // const [ child, nextChild, ...rest ] = this._sectionPathToBoundary(offset)
    const [ [child, nextChild], [childIndex, nextChildIndex] ] = this._pathToLocation(offset)

    if (child.block === 'li' && !(nextChild instanceof MixedContext)) {

      let newNextChild = nextChild
      while (amount-- > 0) {
        newNextChild = Context.createContext('ul', Context.createContext('li', newNextChild))
      }

      const newChild = child.splice(nextChildIndex, 1, newNextChild);
      return this.splice(childIndex, 1, newChild)
    }

    return this.splice(childIndex, 1, child.indent(amount))
  }

  contextSplit(boundary) {

    const [index, offset] = this._locateBoundary(boundary)
    const nextContext = this.subPieces[index]

    if (nextContext instanceof MixedContext)
      return [this.splice(index, 1, ...nextContext.contextSplit(offset))]

    // instance is a Context that is not mixed

    //        |         split 
    // LI
    // H1 P P P P P
    // =>
    // LI         LI
    // H1 P P lP  rP P P

    const [ctxLeft, ctxRight] = nextContext.contextSplit(offset)
    const left = this.slice(0, index).addSubSections(ctxLeft)
    const right = this.slice(index + 1).splice(0, 0, ctxRight)
    // const left = this.slice(0, index).addSubSections(ctxLeft)
    // const right = this.slice(index + 1).addSubSections(ctxRight)

    return [left, right]

  }

  contextBreakAt(location) {
    const [sectionIndex, offset] = this._locateBoundary(location)

    const newContexts = this.subPieces[sectionIndex].contextBreakAt(offset)

    return [this.splice(sectionIndex, 1, ...newContexts)]
  }

  mergeBehavior(other) {
    // prerequisite: other is NOT a MixedContext. mixBehavior above should.. take care of that.

    return this.splice(-1, 1, ...this.sectionAt(-1).mix(other))
  }
}

class ListContext extends MixedContext {


  operateBoundary(func, start, end) {

    const [ left, middle, right ] = this.triSplit(start, end)



  }

  // TODO maybe call this "increaseNesting"
  increaseIndent() {
    return Context.createContext(this.block, Context.createContext('li', this))
  }

  decreaseIndent() {
    const result = this.subPieces.map(listItem => listItem.subPieces).flat()

    return result
  }
}

class ListItemContext extends MixedContext {

  targetedBy(func) {

    // TODO ooof I am less and less of a fan of my implementation for data manipulations
    //    Sections are complex trees and don't really expose a lot of tree like interfacing
    //    then on top of that the "Context classes" (Doc, all the "Context" variations, and Segment)
    //    build out their own highly specialized logic, some of which tends to inform the 
    //    Section interface/implementation which ideally we keep separate

    if (func.name === 'increaseIndent' || func.name === 'decreaseIndent') {
      const hasNoNestedList = this.subPieces[0] !== undefined && !(this.subPieces[0] instanceof ListContext)
      return hasNoNestedList
    }
    return false
  }

  inceaseIndent() {
    const nestedChild = Context.createContext('li', Context.createContext('ul', this))
    return nestedChild
  }

  decreaseIndent() {
    const resultPieces = [ this.subPieces[0] ]

    const rest = this.slice(1)
    if (rest.subPieces.length > 0) {
      resultPieces.push(rest)
    }

    return resultPieces
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
    return [this, this]
  }

  join(other) {
    if (other instanceof Gap)
      return Context.from(new Segment())

    return other
  }

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