'use strict'

import { foldNodes } from "./DOM.mjs"

/**
 * Something still worth considering is updating only *part* of the DOM
 * when one piece of the EditDocument changes. But I don't think that 
 * belongs in Segment anymore. It would have to be at the Document
 * level to map affected nodes to segments, apply to them only, then
 * project back out into new nodes.
 * For the time being we won't worry about that and will continue to
 * project the whole Document everytime an update calls for that (tag
 * applying, but not text insertion for example since the 
 * ContentEditable handles the rendering of the mutations already).
 */

// more evidence Tags are starting to become enough of their own concept
// it might make sense to stick 'em in a Class. For example, in here, we
// explore the concept of tag equality, for the purpose of eliminating
// duplicates. Equality or the 'eq' operation is a perfect case for the
// good object orientation
const filterUniqueTags = tags => {
  const uniqueTags = new Set(tags.map(str=>str.toUpperCase()))
  return [...uniqueTags]
}

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
export class Segment {
  // seal the object? I don't want characters/length to be mutable.
  // Holding off for now, I don't need to enforce immutability and
  // for the time being, as fun as property attributes are, it's
  // too much to dig around that API

  // TODO extract tagging functionality into its own capability

  static taggedSegment(tags, string) {
    
    const seg = new Segment()
    const characters = [...string]
    seg.tags = filterUniqueTags(tags)
    seg.characters = characters
    return seg
  }

  empty() {
    return this.length === 0
  }

  applyTags(tags, start = 0, end = -1) {
    // TODO probably should produce a ListSegment? 
    // no, I think we can keep the Segments simple for now, I don't feel compelled.
    // I want the computer to think like a person. If we apply a tag to a segment
    // it applies to all text therein, if you want something else wrap it in a
    // ListSegment first, that will split it for you.
    return this.replaceTags([...this.tags, ...tags])
  }
  removeTags(removedTags) {
    // when will we accept we should just use sets already
    const seg = this.copy()
    seg.tags = this.tags.filter(t => !filterUniqueTags(removedTags).includes(t))
    return seg
  }

  hasTag(tag) {
    if (tag === undefined) return false
    return this.tags.includes(tag.toUpperCase())
  }

  /**
   * Take the given tag and remove it if present, or add it
   * if not
   * 
   * @param tags Tags to toggle
   */
  toggleTag(tag) {
    return this.hasTag(tag) ? this.removeTags([tag]) : this.applyTags([tag])
  }

  /**
   * Take the given list of tags and this segments tags
   * and produce a new segment that "XOR"s them together
   * (effectively 'toggling' them)
   * equiv set operation: (S1 u S2) - (S1 n S2)
   * 
   * @param tags Tags to toggle
   */
  toggleTags(tags) {
    let segment = this.copy()
    filterUniqueTags(tags)
      .forEach(t => segment = segment.toggleTag(t))
    return segment
  }


  replaceTags(tags) {
    const seg = this.copy() // Segment.taggedSegment(tags,'')
    seg.tags = filterUniqueTags(tags)
    // seg.characters = this.characters
    return seg
  }

  push(...chars) {
    const newSeg = this.copy() // new Segment(this.tags, ...this.characters)
    newSeg.characters.push(...chars)
    return newSeg
  }

  copy() {
    const seg = new Segment()
    seg.tags = this.tags
    seg.characters = this.characters
    return seg
  }

  slice(start, end) {
    if (end === undefined) end = this.length
    const seg = this.copy()
    seg.characters = this.characters.slice(start, end)
    return seg
  }

  split(idx) {
    return ListSegment.from( this.slice(0, idx), this.slice(idx) )
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

  get length() {
    return this.characters.length
  }

  at(offset) {
    return this.characters.at(offset)
  }

  eq(other) {
    
    if (other instanceof Segment){ 
      if (this.characters.join('') !== other.characters.join('')) {
        return false
      }
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

}

/**
 * ListSegment is a list of segment
 * It derives its attributes from its elements
 * ListSegment is not a recursive data structure, it is intentionally
 * flat to represent the linearity of text
 */
export class ListSegment extends Segment {
  // On the subclassing - Some functionalities of Segment do not make sense in ListSegment
  // so I might either refactor the hierarchy or scrap it and just duplicate the common
  // functionality. eh. 
  // TODO Probably should refactor.

  constructor() {
    super()
    this.segments = []
  }

  // Sensing a code smell. Just pass an array to 'from'? merr
  static from(...segments) {
    const listSeg = new ListSegment()
    listSeg.segments = segments.filter(s => !s.empty())
    return listSeg
  }

  copy() {
    return ListSegment.from(...this.segments)
  }

  split(index) {
    const [ splitSegIndex, offset ] = this._locate(index)
    return ListSegment.from(...[
      ...this.segments.slice(0, splitSegIndex), 
      ...this.segments[splitSegIndex].split(offset).segments,
      ...this.segments.slice(splitSegIndex + 1)
    ]) 
  }

  get characters() {
    if (this._characters === undefined) {
      this._characters = this.segments.reduce((charsSoFar, segment) => [...charsSoFar, ...segment.characters], [])
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
      characterIndex -= this.segments[segmentIndex].length;
      segmentIndex++;
    }
    return [ segmentIndex, characterIndex ]
  }


  applyTags(tags, start, end) {
    if (tags === undefined || tags.length === 0) return this
    if (!( start < end)) return this
    if (start >= this.length) return this

    start = (start === undefined) ? 0 : start
    end = (end === undefined) ? this.length : end 
    start = this._normalize(start)
    end = this._normalize(end)

    // Technically this case shouldn't be necessary
    if (start === 0 && end === this.length) {
      return ListSegment.from(this.segments.map( seg => seg.applyTags(tags) ))
    }

    let splegment = this.split(start).split(end)
    const [ leftBound ] = splegment._locate(start)
    const [ rightBound ] = splegment._locate(end)
    const applied = splegment.segments.map( (seg, idx) => { 
      if (leftBound + 1 <= idx && idx <= rightBound) return seg.applyTags(tags)
      return seg
    })

    return ListSegment.from(...applied)

  }

  // Not very "algebraic data structure of you" they said, muttering into the void
  // "wheres the recursive constructions, hm?" they accuse

  removeTags(tags, start, end) {
    // Same work as in applyTags (might need to abstract the logic out or handle it some way)
    if (tags === undefined || tags.length === 0) return this
    if (!( start < end)) return this
    if (start >= this.length) return this

    start = (start === undefined) ? 0 : start
    end = (end === undefined) ? this.length : end 
    start = this._normalize(start)
    end = this._normalize(end)

    // Technically this case shouldn't be necessary
    if (start === 0 && end === this.length) {
      return ListSegment.from(this.segments.map( seg => seg.removeTags(tags) ))
    }

    let splegment = this.split(start).split(end)
    let [ leftBound ] = splegment._locate(start)
    let [ rightBound ] = splegment._locate(end)
    const removed = splegment.segments.map( (seg, idx) => {
      if (leftBound + 1 <= idx && idx <= rightBound) return seg.removeTags(tags)
      return seg
    })
    return ListSegment.from(...removed)
  }

  toggleTags(tags, start, end) {
    // Same work as in applyTags (might need to abstract the logic out or handle it some way)
    if (tags === undefined || tags.length === 0) return this
    if (!( start < end)) return this
    if (start >= this.length) return this

    start = (start === undefined) ? 0 : start
    end = (end === undefined) ? this.length : end 
    start = this._normalize(start)
    end = this._normalize(end)

    // Technically this case shouldn't be necessary
    if (start === 0 && end === this.length) {
      return ListSegment.from(this.segments.map( seg => seg.applyTags(tags) ))
    }

    let splegment = this.split(start).split(end)
    // let listseg = this.copy()
    let [ leftBound ] = splegment._locate(start)
    let [ rightBound ] = splegment._locate(end)
    const removeFn = tg => s => s.removeTags([tg])
    const applyFn = tg => s => s.applyTags([tg])
    const cutWith = fn => splegment.segments = splegment.segments.map( (seg, idx) => leftBound + 1 <= idx && idx <= rightBound ? fn(seg) : seg )
    for (const tag of tags) {
      if (splegment.segments.slice(leftBound, rightBound+1).every(seg => seg.hasTag(tag))) {
        cutWith(removeFn(tag))
      } else {
        cutWith(applyFn(tag))
      }
    }
    return ListSegment.from(...splegment.segments)

  }

  eq(other) {
    if (other instanceof ListSegment && this.segments.length === other.segments.length) {
      for (let i = 0; i < this.segments.length; i++) {
        if (!this.segments[i].eq(other.segments[i])) return false
      }
      return true
    }
    return false;
  }

}