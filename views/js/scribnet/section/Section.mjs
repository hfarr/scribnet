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

  copyFrom(...pieces) {
    // .... probably can name this better. this is a "copy" then a "from". ha. doesn't capture the intent-
    // it creates a new Section, then sets the pieces, but that new section is specifically a *copy*. any
    // inheritors override copy when they have subclass specific state to copy. This method serves to
    // capture that pattern.
    const result = this.copy()
    result.subPieces = pieces
    return result
  }

  split(index) {
    const [ splitSecIndex, offset ] = this._locateBoundary(index)
    const splitSections = this.subPieces[splitSecIndex].split(offset, this.constructor)
    // return this.splice(splitSecIndex, 1, ...splitSections.subPieces)
    // TODO work out whether we want to go with 'wrapping'. Splicing is great, but it also has a flattening effect.
    //    this change might need to be made there. As an example, say we have
    //    [ AtomicSec, AtomicSec, Sec, AtomicSec, AtomicSec ] then splitting on "Sec" will apply
    //    split on "sec" then spread out its internals in the wrapper. I think we want it to 
    //    produce two "sec" each taking half. which I think is close to how we originally
    //    implemented split.
    // const splitSections = this.subPieces[splitSecIndex].split(offset, this.constructor).subPieces
    // return this.splice(splitSecIndex, 1, ...splitSections.subPieces)
    return [
      this.copyFrom(...this.subPieces.slice(0, splitSecIndex), splitSections[0]),
      this.copyFrom(splitSections[1], ...this.subPieces.slice(splitSecIndex + 1))
    ]
  }

  /**
   * Acts to split the Section, but joins the resulting pieces
   * 
   * @param index Index to split
   * @returns new Section, with interior subpieces split
   */
  splitInterior(index) {
    const [ left, right ] = this.split(index)
    return left.join(right)
  }

  join(other) {
    return this.copyFrom( ...this.subPieces, ...other.subPieces )
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

  addSubSections(...sections) {
    return this.splice(this.subPieces.length, 0, ...sections)
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
    return this.copyFrom(...this.subPieces.filter(sec => !sec.empty()))
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

  /**
   * Determine the index of the sub-piece that holds the atom at the 
   * given index
   * 
   * @param atomIndex Index of atom whose container we'd like to find
   */
  _locateSection(atomIndex) {
    const [ sectionIndex ] = this._locateAtom(atomIndex)
    return sectionIndex
  }
  //===================================================

  /* Content mutators */
  delete(start, end) {
    const [ startSection, _, __, endSection ] = [ ...this.split(start), ...this.split(end) ]
    // TODO should update splice to work on atoms, not sections ?
    const result = this.copyFrom(...startSection.subPieces, ...endSection.subPieces).cutEmpty()

    return result
  }

  insert(location, atoms) {
    // TODO to fit the general pattern, might use the rest operator for all "sections" and "atoms" parameters, particularly here in insert.
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
    const [ left, mid, right ] = this.triSplit(start, end)
    return this.copyFrom(...left.subPieces, ...mid.map(func).subPieces, ...right.subPieces).cutEmpty()
  }


  triSplit(start, end) {
    const [ startSection, rest ] = [ ...this.split(start) ]
    const [ midSection, endSection ] = [ ...rest.split(end - start) ]

    return [startSection, midSection, endSection]
  }

  // TODO the name of mapRange is not very suggestive of what it does. Would like to change it,
  // perhaps as "map interior". It's use is to apply a map function but targeting an internal
  // row of nested Section, not strictly the atoms (which map offers)
  mapRange(func, start, end) {

    // nyeah, TODO trying to maneouver this so that we don't need to run the base case on the /parent/ of the answering segment
    // if (this.answers(func))
    //   return Section.from(...this.triSplit(func, start, end)).cutEmpty()
    // the below also assumes that the subPieces are homogeneous- that is, it assumes if one answers 'func', they all will
    if (this.subPieces.some(sec => sec instanceof AtomicSection || sec.answers(func))) 
      return this.operate(func, start, end)
    
    const left = this._locateSection(start)
    const right = this._locateSection(end)

    const resultSections = []
    
    // TODO... better way to handle telescoping ranges. or, slinky ranges. I like slinky ranges, fun term.
    for (let i = 0, cumulativeLength = 0; i < this.subPieces.length; cumulativeLength += this.subPieces[i].length, i++) {

      const section = this.subPieces[i]
      const [ lb, rb ] = [ i === left ? start - cumulativeLength : 0, i === right ? end - cumulativeLength : section.length ]

      /* TODO we can, potentially, group these into one step. that is, allow mapRange to handle 
        all of these, for example calling map range with a range that is out of bounds would 
        just pass the original back, or if fully immersed in the range, then it would map.
        In fact, without any changes, this already covers the "map" and "mapRange" cases.
      */
      if (i < left || i > right)
        resultSections.push(section)
      else if (i > left && i < right)
        resultSections.push(section.map(func));
      else 
        resultSections.push(section.mapRange(func, lb, rb))
    }
    
    return this.copyFrom(...resultSections).cutEmpty()
    
  }

  answers(func) {
    // Thought- this is a edging close to a visitor pattern. I can also envision like a table, where we
    // specify functions on one dimension and subclasses of section on the other. consulting the table
    // reveals whether a given section answers the call, or propogates it. Actually, in terms of 
    // patterns, that reminds me of the event handling pattern. Might use a table, reminds me of Clox
    // and the unary/binary operator table.
    return false;
  }

  /**
   * Apply function to all entries
   * 
   * @param func Function to apply
   */
  map(func) {
    if (this.answers(func))
      return func(this.copy())

    return this.copyFrom(...this.subPieces.map( sec => sec.map(func)))
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

  split(index) {
    return [
      this.copyFrom(...this.subPieces.slice(0, index)), 
      this.copyFrom(...this.subPieces.slice(index)) 
    ]
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
    if (this.answers(func))
      return func(this.copy())
    return this.copyFrom( ...this.subPieces.map(func) )
  }

}

export { AtomicSection, Section }
export default Section