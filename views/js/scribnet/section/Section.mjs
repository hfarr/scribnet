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
    return this.subPieces.length === 0 || this.length === 0
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

    if ( atomIndex < 0 ) {
      // atomIndex = this.length === 0 ? 0 : (Math.floor(-atomIndex / this.length) + 1) * this.length + atomIndex
      atomIndex = this.length === 0 ? 0 : (atomIndex % this.length) + this.length
      atomIndex = atomIndex === this.length ? 0 : atomIndex
    }
      

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
    const [ leftSectionIndex, leftOffset ] = this._locateAtom(start)
    const [ rightSectionIndex, rightOffset ] = this._locateAtom(end)
    if (leftSectionIndex === rightSectionIndex) 
      return this.splice(leftSectionIndex, 1, this.subPieces[leftSectionIndex].delete(leftOffset, rightOffset) )

    const [ startSection, _, __, endSection ] = [ ...this.split(start), ...this.split(end) ]
    // TODO should update splice to work on atoms, not sections ?
    const result = this.copyFrom(...startSection.subPieces, ...endSection.subPieces).cutEmpty()

    return result
  }

  insert(location, atoms) {
    // TODO to fit the general pattern, might use the rest operator for all "sections" and "atoms" parameters, particularly here in insert.
    // TODO also I noticed I pluralized "newSecs" below, we could support inserting creating multiple new segments. E.g in a case where 
    //    we insert, say, multiple lineBreaks in a Context and it should create multiple Contexts... leaving this as TODO because that I
    //    will handle with logic for now but I like the idea of incorporating it into the design of Sections.
    //    also we should have more handling of results as lists. It does burden clients a bit which is the issue, as they generally expect
    //    singleton results (and would have to unwrap the list each time). Maybe we do it internally to section and expose the original
    //    behavior for the interface.
    const [ sectionIndex, sectionOffset ] = this._locateAtom(location)
    if ( sectionIndex === this.subPieces.length ) {
      // location references an atom beyond the "right edge". Literal edge case. 
      // We shift the location to reference the first "nonexistant" atom (at the imaginary index represented by the total "length")
      // and insert at the "length" of that section, which will propogate down correctly. Insert, as a function that references character
      // indicies, could work by referencing "boundary" indices, but we then have ambiguity at the border of sections. By referenceing
      // character indices we remove that ambiguity but pay the cost of this edge case.
      // In this way, any index greater than the length is treated as the length, which reduces all those "error" cases to the singular
      // edge case. Indices 0 <= x < length behave normally.
      const lastSec = this.subPieces.at(-1)
      const newSecs = lastSec.insert(lastSec.length, atoms)
      return this.splice(-1, 1, newSecs)
    }
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

/**
 * Commenting interlude
 * 
 * I'm honing my thoughts around the concept of "targeting" different regions for operations.
 * This started coming up in my mind through implementing "mapRange" as the alternative to 
 * operate. Operate, and many other operations, can be thought of as ways to manipulate the
 * underlying Atoms through overlaying stacks of varying Sections. This enables working with
 * any Section easier as the contextual state a section holds on to doesn't need to deal with
 * managing the plumbing for calls to reach the underlying data.
 * 
 * However some Sections are aware of other Sections in the stack, primary use case being the
 * Doc, Context, Segment stack I have going on. Certain operations against a Doc should
 * target other sections (like applying tags to a Segment) rather than hit the Atoms under it
 * all. 
 * 
 * Right now we have a sort of solution to that. It only applies for mapRange and map. These
 * functions check whether a section "answers" the function to be mapped, if so it applies the
 * function there (which has similar if not identical behavior to the original "operate"), 
 * else it propogates the call to lower Sections or ultimately Atoms.
 * 
 * I'd like to generalize the notion of targeting different layers. For example, the insert 
 * operation. Right now we have two, one "insert" that inserts atoms having the default 
 * behavior of Section operations which is to plumb all the way down. We also have 
 * addSubSections and more loosely 'splice' for working with the subPieces of a given section.
 * A general form would be to enable "targeting" a specific section within a layer- the
 * default target is the bottom layer of Atoms, but you could target any kind of Section 
 * instead. Then the "mapRange" and "map" would build off of this behavior and other methods
 * could too.
 * 
 * For example say we want to insert new Segment. Right now we can basically only interact
 * with Doc, and only interact with Atoms, using just a Doc instance and its method suite.
 * We could dig in, if we know the internal structure of the stack (which highly couples us
 * to that too!) and do the work. But this should be supported by the Section interface.
 * Similarly Section layers, the subPieces of a given section, may not be homogeneous,
 * although by and large they are right now. With that restriction we could think of these
 * operations as operating on a given "row" of a tree, a given depth, but I'd like to work
 * generally for any child "node" that fits the targeting requirements (Sections of a given
 * type, in this case, for example). 
 * 
 * In the future I can see myself adding more Section kinds and using them to implement
 * different kinds of logic, like say group many contexts into a "dropdown" section which
 * would render as an expandable box in a Document. This sits next to Contexts, and contains
 * Contexts, and we'd like to always target Contexts with operations that do so, like 
 * changing the block tag.
 * 
 */

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