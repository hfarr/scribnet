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

import { ListSegment } from "./Segment.mjs"

const BLOCKS = ['p', 'h1', 'h2', 'h3', 'pre']

const filterInline = tag => !BLOCKS.includes(tag)

class Context {

  constructor() {
    this.block = undefined
    this.listSegment = new ListSegment()
  }

  static createContext(block) {
    const context = new Context()
    if (!context._updateBlock(block)) return undefined
    return context
  }

  copy() {
    const context = Context.createContext(this.block)
    context.listSegment = this.listSegment
    return context
  }

  get characters() {
    return this.listSegment.characters
  }
  get length() {
    return this.listSegment.length
  }

  /**
   * Update the block element used by this context
   * 
   * @param block new block the context should use
   * @returns True if the block was successfully updated, false if not
   */
  _updateBlock(block) {
    block = block.toLowerCase()
    if (!BLOCKS.includes(block)) return false

    this.block = block
    return true
  }

  setBlock(block) {
    const context = this.copy()
    context.block = block 
    return context
  }

  setListSegment(listSegment) {
    const context = this.copy()
    context.listSegment = listSegment
    return context
  }

  delete(start, end) {
    return this.setListSegment(this.listSegment.delete(start, end))
  }

  insert(location, string) {
    return this.setListSegment(this.listSegment.insert(location, string))
  }

  applyTags(tags, start, end) {
    return this.setListSegment(this.listSegment.applyTags( tags.filter(filterInline), start, end ))
  }
  removeTags(tags, start, end) {
    return this.setListSegment(this.listSegment.removeTags( tags.filter(filterInline), start, end ))
  }
  toggleTags(tags, start, end) {
    return this.setListSegment(this.listSegment.toggleTags( tags.filter(filterInline), start, end ))
  }
  tagsAt(characaterIndex) {
    return this.listSegment(characaterIndex)
  }
  eq(other) {
    if (other instanceof Context) {
      return this.listSegment.eq(other.listSegment)
    }
    return false
  }

}