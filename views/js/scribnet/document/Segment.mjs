'use strict'

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
    
    const uniqueTags = new Set(tags)
    const seg = new Segment()
    const characters = [...string]
    seg.tags = [...uniqueTags]
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

  replaceTags(tags) {
    const seg = Segment.taggedSegment(tags,'')
    seg.characters = this.characters
    return seg
  }

  push(...chars) {
    const newSeg = new Segment(this.tags, ...this.characters)
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
  constructor() {
    super()
    this.segments = []
  }

  // Sensing a code smell. Just pass an array to 'from'? merr
  static from(...segments) {
    const listSeg = new ListSegment()
    listSeg.segments = segments
    return listSeg
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
    let [ leftBound ] = splegment._locate(start)
    let [ rightBound ] = splegment._locate(end)
    const applied = splegment.segments.map( (seg, idx) => { 
      if (leftBound + 1 <= idx && idx <= rightBound) return seg.applyTags(tags)
      return seg
    })

    return ListSegment.from(...applied)

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