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

class CallTable {
  constructor() {
    this.callTable = {
      [Segment.name]: function(func) { return /tag/i.test(func.name) },  // test if 'tag' is a substring of the function name, case insensitive
      [Context.name]: ['updateBlock'],
      [Doc.name]: []
    }
  }

  checkTable (subclass, func) {
    const entry = callTable[subclass.name]
    if (typeof entry === 'function') {
      return entry(func)
    } else {
      return entry.includes(func.name)
    }
  }
}

class Segment extends AtomicSection {
  constructor() {
    super()
    this.tags = []
  }
  static copy() {
    const clone = super.copy()
    clone.tags = this.tags
    return clone
  }

  answers(func) {
    // TODO would like to make this polymorphic yknow. But I don't want to put it back in "Section". Need some multi inheritance. Maybe I should inject it on the constructor.
    return checkTable(this.constructor.name, func)  
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

}

class Context extends Section {
  constructor() {
    super()
    this.block = 'p'
  }

  static copy() {
    const clone = super.copy()
    clone.block = this.block
    return clone
  }

  set block(tag) {
    if (BLOCKS.includes(tag.toLowerCase())) this.blockTag = tag.toLowerCase()
  }
  get block() {
    return this.blockTag
  }

}

class Doc extends Section {

  split(index) {
    // TODO Might lift this into Section, as another operation. Combined with a "Join" operation. Maybe.
    const [ left, right ] = super.split(index)
    return this.copyFrom( ...left.subPieces, ...right.subPieces )
  }

  applyTags(tags, start, end) {
    this.operate((seg) => seg.applyTags(tags), start, end)
  }
  removeTags(tags, start, end) {
    this.operate((seg) => seg.removeTags(tags), start, end)
  }
  toggleTags(tags, start, end) {
    this.operate((seg) => seg.toggleTags(tags), start, end)
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

export { Doc, Context, Segment }