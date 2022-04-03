
import { AtomicSection } from "./Section.mjs";

import { filterInline } from "./Context.mjs";

class Segment extends AtomicSection {
  constructor() {
    super()
    this.tags = []
  }
  static createSegment(tags, string) {
    const result = this.from(...string)
    result.tags = Array.isArray(tags) ? tags : [tags]
    return result
  }
  // static from(...)
  copy() {
    const clone = super.copy()
    clone.tags = this.tags
    return clone
  }

  /**
   * Determine if func targets this segment. Segments are targeted by functions that
   * contain the substring "tag", case insensitive.
   * @param {Function} func Function that will be applied if it targets Segments
   * @returns true if func targets this segment
   */
  targetedBy(func) {
    // TODO would like to make this polymorphic yknow. But I don't want to put it back in "Section". Need some multi inheritance. Maybe I should inject it on the constructor.

    // regex test: Checks if "str" has the substring "tag" ignoring the letter case
    const containsSubstringTag = str => /tag/i.test(str)

    return containsSubstringTag(func.name)
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

  applyTag(tag) { return this.applyTags([tag]) }
  removeTag(tag) { return this.removeTags([tag]) }
  toggleTag(tag) { return this.toggleTags([tag]) }
  replaceTag(tag) { return this.replaceTags([tag]) }

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

// export { Segment }

export default Segment