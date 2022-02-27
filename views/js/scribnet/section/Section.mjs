'use strict'

class Section {

  constructor() {
    this.subPieces = []
  }

  static from(...pieces) {
    const section = new this()
    section.subPieces = pieces
    return section
  }

  copy() {
    return this.constructor.from(...this.subPieces)
  }

  split(index) {
    const [ splitSecIndex, offset ] = this._locateBoundary(index)
    const splitSections = this.subPieces[splitSecIndex].split(offset, this.constructor)
    return this.splice(splitSecIndex, 1, ...splitSections.subPieces)
  }

  splice(start, length, ...sections) {
    // Tricky bit about splice is it operates on segments entirely
    // caution is warranted. Most methods operate on the index of
    // characters. There is value in manipulating the ListSegment
    // at its own comfortable level of abstraction.
    const newSection = this.copy()
    newSection.subPieces.splice(start, length, ...sections)
    return newSection
  }

  get atoms() {
    if (this._atoms === undefined) {
      this._atoms = this.subPieces.map(section => section.atoms ).flat()
    }
    return this._atoms
  }

  get length() {
    if (this._length === undefined) {
      this._length = this.subPieces.reduce((lengthSoFar, section) => lengthSoFar + section.length, 0)
    }
    return this._length
  }

  empty() {
    return this.length === 0
  }

  cutEmpty() {
    return Section.from(...this.subPieces.filter(sec => !sec.empty()))
  }

  //===================================================
  // TODO REVISE or... at least clarify
  _locateBoundary(atomIndex) {
    // this method needs a revisit because it mixes "boundary points" and "character points",
    // yielding the wrong addresses m' fraid
    let sectionIndex = 0
    while (atomIndex > this.subPieces[sectionIndex].length) {
      atomIndex -= this.subPieces[sectionIndex].length;
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
  _locateAtom(atomIndex) {
    let sectionIndex = 0
    while (sectionIndex < this.subPieces.length && atomIndex >= this.subPieces[sectionIndex].length) {  // Jumps over empty subPieces
      atomIndex -= this.subPieces[sectionIndex].length; // length of a section expresses # atoms so this is still valid
      sectionIndex++;
    }
    return [ sectionIndex, atomIndex ]
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
    const newSecs = this.subPieces[sectionIndex].insert(sectionOffset, atoms)
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
    const affectedSection = this.constructor.from(...this.subPieces.slice(startIndex, endIndex))
    return splitSection.splice(sectionIndex, endIndex - startIndex, affectedSection.map(func) )
  }

  /**
   * Apply function to all entries
   * 
   * @param func Function to apply
   */
  map(func) {
    return this.constructor.from(...this.subPieces.map(func))
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

class AtomicSection extends Section {
  constructor() {
    super()
  }
  cutEmpty() {
    return this
  }
  get atoms() {
    return this.subPieces
  }
  get length() {
    return this.subPieces.length
  }

  slice(start, end) {
    return AtomicSection.from(this.subPieces.slice(start, end))
  }

  split(index, sectionConstructor = Section) {
    return sectionConstructor.from( 
      AtomicSection.from(...this.subPieces.slice(0, index)), 
      AtomicSection.from(...this.subPieces.slice(index)) 
    )
  }

  splice(start, length, ...sections) {
    // TODO maybe- we support splicing at the level of "Section" but not "Atoms". But, if I am thinking of Sections as an "Arraylike" structure that lets you treat nested arrays like normal arrays, we should
    //  rethink our approach, and implement all the way down. That might be a longer term enhancement, then we can get into species and all of the nice metaprogramming.
    return this
  }

  // ============
  insert(location, atoms) {
    const newSection = this.copy()
    newSection.subPieces.splice(location, 0, ...atoms)
    return newSection
  }
  delete(start, end) {
    const newSection = this.copy()
    newSection.subPieces.splice(start, end - start)
    return newSection
  }

  map(func) {
    return AtomicSection.from( this.subPieces.map(func) )
  }

}

export { AtomicSection }
export default Section