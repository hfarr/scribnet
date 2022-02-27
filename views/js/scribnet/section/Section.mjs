'use strict'

class Section {

  constructor() {
    this.subsections = []
  }

  static from(...sections) {
    const section = new Section()
    section.subsections = sections
    return section
  }

  copy() {
    return Section.from(...this.subsections)
  }

  split(index) {
    const [ splitSecIndex, offset ] = this._locateBoundary(index)
    const splitSections = this.subsections[splitSecIndex].split(offset).sections
    return this.splice(splitSecIndex, 1, ...splitSections)
  }

  splice(start, length, ...sections) {
    // Tricky bit about splice is it operates on segments entirely
    // caution is warranted. Most methods operate on the index of
    // characters. There is value in manipulating the ListSegment
    // at its own comfortable level of abstraction.
    const newSection = this.copy()
    newSection.sections.splice(start, length, ...sections)
    return newSection
  }

  get atoms() {
    if (this._atoms === undefined) {
      this._atoms = this.subsections.map(section => section.atoms ).flat()
    }
    return this._atoms
  }

  get length() {
    if (this._length === undefined) {
      this._length = this.subsections.reduce((lengthSoFar, section) => lengthSoFar + section.length, 0)
    }
    return this._length
  }

  empty() {
    return this.length === 0
  }

  cutEmpty() {
    return Section.from(...this.subsections.filter(sec => !sec.empty()))
  }

  //===================================================
  // TODO REVISE or... at least clarify
  _locateBoundary(atomIndex) {
    // this method needs a revisit because it mixes "boundary points" and "character points",
    // yielding the wrong addresses m' fraid
    let sectionIndex = 0
    while (atomIndex > this.segments[sectionIndex].length) {
      atomIndex -= this.segments[sectionIndex].length;
      sectionIndex++;
    }
    return [ sectionIndex, atomIndex ]
  }

  /**
   * Determine the address of a character.
   * The main implementation difference between this and _locateBoundary is using >= in
   * the comparison instead of >, so that when the characteroffset reaches the length of
   * a segment (an invalid offset) it rolls over to the next segment, yielding an 
   * address of that segment and offset 0. In this way it completely ignores empty 
   * segments, unlike boundaries which respect at least one empty segment.
   * @param characterIndex 
   * @return Address of the character in terms of segment and character offset
   */
  _locateAtom(characterIndex) {
    let segmentIndex = 0
    while (segmentIndex < this.segments.length && characterIndex >= this.segments[segmentIndex].length) {  // Jumps over empty segments
      characterIndex -= this.segments[segmentIndex].length; // length of a segment expresses # characters so this is still valid
      segmentIndex++;
    }
    return [ segmentIndex, characterIndex ]
  }
  //===================================================

  /* Content mutators */
  delete(start, end) {
    const splitSec = this.split(start).split(end).cutEmpty()
    const [ [lb], [rb] ] = [ splitSec._locateAtom(start), splitSec._locateAtom(end) ]
    const result = splitSec.splice(lb, rb - lb)
    return result
  }

  insert(location, atoms) {
    const [ sectionIndex, sectionOffset ] = this._locateAtom(location)
    const newSecs = this.subsections[sectionIndex].insert(sectionOffset, atoms)
    const result = this.splice(sectionIndex, 1, newSecs)
    return result
  }

  /**
   * Apply function over atoms specified by the indices
   * 
   * @param func Function to apply over index
   * @param start Start index
   * @param end End index
   */
  operate(func, start, end) {
    const splitSection = this.split(start).split(end).cutEmpty()
    const [ [startIndex], [endIndex] ] = [ splitSection._locateAtom(start), splitSection._locateAtom(end) ]
    const affectedSection = Section.from(...this.subsections.slice(startIndex, endIndex))
    return splitSection.splice(sectionIndex, endIndex - startIndex, affectedSection.map(func) )
  }

  /**
   * Apply function to all entries
   * 
   * @param func Function to apply
   */
  map(func) {
    return Section.from(...this.subsections.map(func))
  }

  at(offset) {
    return this.atoms.at(offset)
  }

  eq(other) {
    if (other instanceof Section) {
      for (let i = 0; i < this.length; i++) {
        const atomEq = this.at(i) === other.at(i)
        if (!atomEq) return false
      }
      return true
    }
    return false;
  }
}

export default Section