'use strict'

/**
 * ~TODO~
 * I beleive there is a wider reckoning for "boundaries" as they relate to Section
 * Many small, but rather substantial changes, and over all a rather substantial
 * change in posture, has changed the way I think about and work with Section.
 * 
 * For example I'm considering a move to throw away all atom-index based
 * moves (except possibly "at"). Or refurbishing the _locateAtomBoundary 
 * to properly reflect the changes. Then most functions can continue to
 * operate on boundary indices rather than character indices (which are
 * in a certain view also boundary indices)
 * 
 * 
 */

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

  split(boundaryIndex) {
    if (this.subPieces.length === 0) return [this, this]
    const [splitSecIndex, offset] = this._locateBoundary(boundaryIndex)
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
    const [left, right] = this.split(index)
    return left.join(right)
  }

  join(other) {
    if (other === undefined) return this
    return this.copyFrom(...this.subPieces, ...other.subPieces)
  }

  /**
   * Merge is the inverse of "split". 
   * Merging does not commute, A.merge(B) is not necessarily the same as B.merge(A)
   * If A.split(x) = [B,C] however, then B.merge(C) should structureEq C.merge(C) should structureEq A. (TODO test this?)
   * 
   * @param other Section to merge
   * @returns 
   */
  merge(other) {
    // TODO enable a "depth" limit to merge, so that it only merges /up to/ a point? likewise for
    //  split, only start splitting /after/ a point?
    // nah- control with the mix API

    if (other === undefined) return this
    if (other instanceof AtomicSection) return this.mergeAtomic(other) // Not sure how 'natural' this is. It is a bit awkward merging Atomic and nonAtomic Sections

    if (this.subPieces.length === 0) return this.copyFrom(...other.subPieces)
    if (other.subPieces.length === 0) return this

    // mergeBehavior hook? one that runs afte the above validations?
    // Note that with these validations we are implying that merging is not commutative. That's probably okay.

    return this.mergeBehavior(other)
  }

  /**
   * Describes behavior for merging a (Non Atomic) Section with an AtomicSection
   * 
   * In the default case, we plumb the AtomicSection down until it hits a Section
   * that can add it to its children, or merge to a segment. Generally it goes
   * all the way down to the "rightmost" atomicsection where it is merged.
   * 
   * @param {AtomicSection} other 
   * @returns 
   */
  mergeAtomic(other) {

    // expects 'other' to be Atomic
    if (this.subPieces.length === 0) return this.addSubSections(other)

    const thisRightmost = this.subPieces.at(-1)
    const mixed = thisRightmost.mix(other)
    return this.copyFrom(...this.subPieces.slice(0, -1), ...mixed)
  }

  /**
   * Describes how to merge two sections.
   * PreCondition: Both "this" and "other" have subPieces length > 0
   * Condition: returns a Section
   * 
   * Override in subclasses to get different merge behavior
   * 
   * @param {Section} other Section to merge
   */
  mergeBehavior(other) {

    const middleLeft = this.subPieces.at(-1)
    const middleRight = other.subPieces.at(0)

    const mixed = middleLeft.mix(middleRight)

    return this.copyFrom(...this.subPieces.slice(0, -1), ...mixed, ...other.subPieces.slice(1))
  }

  // Hook to set mixing behavior
  mixesWith(other) {
    return true
  }

  /**
   * Mix is a bit like "merge" except it wraps the result in an Array
   * Callers must handle array results.
   * By wrapping results in an array we don't make assumptions about the
   * parent Section that should hold the result, unlike merge which
   * has a result that is a Section.
   * Use case is say have two Section which we want to merge sometimes and
   * other times not. We'd have to use a lot of client code outside to
   * handle these cases, instead we only need to handle an Array. If we
   * mix them the array has a single value, if we don't it has two, and
   * clients treat it the same.
   * 
   * @param other Section to mix
   * @returns 
   */
  mix(other) {

    if (this.mixesWith(other))
      return this.mixBehavior(other)

    return [this, other]

  }

  mixBehavior(other) {
    return [this.merge(other)]
  }

  complexMix(other, collapse = (x) => undefined) {


    const shouldMerge = other === undefined || this.mixesWith(other)

    if (shouldMerge) {


      // auncle because if this is not undefined, then it refers to the sibling "this" ancestor
      const auncle = collapse()

      if (auncle !== undefined) return [this.merge(other), auncle]
      return [this.merge(other)]
    } else if (other instanceof AtomicSection) {
      return [this, other]
    }

    const otherLeftMost = other.sectionAt(0)
    let plugback = (nextLeft) => {
      if (nextLeft === undefined)
        return collapse(other.splice(0, 1))
      return collapse(other.splice(0, 1, nextLeft))
    }

    return [this.mix(otherLeftMost, plugback)]


    // return [ this.mix(other.sectionAt(0)), other, ...extra ]

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

  slice(start, end) {
    return this.copyFrom(...this.subPieces.slice(start, end))
  }

  addSubSections(...sections) {
    return this.insertSubSections(this.subPieces.length, ...sections)
  }

  insertSubSections(idx, ...sections) {
    return this.splice(idx, 0, ...sections)
  }

  get atoms() {
    if (this._atoms === undefined) {
      this._atoms = this.subPieces.map(section => section.atoms).flat()
    }
    return this._atoms
  }

  get length() {
    if (this._length === undefined) {
      this._length = this.subPieces.reduce((lengthSoFar, section) => lengthSoFar + section.length, 0)
    }
    return this._length
  }

  get boundariesLength() {
    if (this._bLength === undefined) {
      this._bLength = this.subPieces.reduce((lengthSoFar, section) => lengthSoFar + section.boundariesLength, 0)
      if (this._bLength === 0) this._bLength = 1
    }
    return this._bLength
  }

  empty() {
    return this.subPieces.length === 0 || this.length === 0
  }

  cutEmpty() {
    return this.copyFrom(...this.subPieces.filter(sec => !sec.empty()).map(sec => sec.cutEmpty()))
  }

  //===================================================
  /**
   * Determine the address of a boundary, given the index of a character. 
   * An address is a section and an offset.
   * Every character has two boundaries, one to it's left and one to it's
   * right. This function yields the boundary to the left (or the "right oriented" 
   * boundary).
   * The exception is the "left most" boundary, it is given in it's left
   * orientation as [0, 0]. All other boundaries return a section offset
   * greater than 0 because no right oriented boundary has a section
   * offset of 0.
   * In this case [0, 0] is the only left boundary.
   * 
   * One consequence is _locateBoundary skips length 0 Sections (Sections
   * with only one boundary), which is part of the desired behavior.
   * 
   * When the found boundary falls between two Sections _locateBoundary will
   * yield the address as the boundary on the left with index as length of that
   * section. In this way 
   * 
   * @param atomIndex Index of the boundary (ranging from 0 to length, inclusive)
   * @returns Right oriented section-offset boundary address (except [0,0] which is left oriented)
   */
  _locateAtomBoundary(atomIndex) {
    // this method needs a revisit because it mixes "boundary points" and "character points",
    // yielding the wrong addresses m' fraid
    let sectionIndex = 0
    while (atomIndex > this.subPieces[sectionIndex].length) {
      atomIndex -= this.subPieces[sectionIndex].length;
      sectionIndex++;
    }
    return [sectionIndex, atomIndex]
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

    if (atomIndex < 0) {
      // atomIndex = this.length === 0 ? 0 : (Math.floor(-atomIndex / this.length) + 1) * this.length + atomIndex
      atomIndex = this.length === 0 ? 0 : (atomIndex % this.length) + this.length
      atomIndex = atomIndex === this.length ? 0 : atomIndex
    }


    let sectionIndex = 0
    while (sectionIndex < this.subPieces.length && atomIndex >= this.subPieces[sectionIndex].length) {  // Jumps over empty subPieces
      atomIndex -= this.subPieces[sectionIndex].length; // length of a section expresses # atoms so this is still valid
      sectionIndex++;
    }
    return [sectionIndex, atomIndex]
  }


  _locateAtomBoundaryLeft(boundaryIndex) {
    // returns coordinate as a section and the atom in that section from which heading left of the atom hits the boundary given by the index
    // boundary index must be index of a boundary with a "flat view". That is boundaries are indexed between 0 and this.characters.length inclusive, ignoring "empty Section" that would otherwise count for 1 boundary
    return this._locateAtom(boundaryIndex)
  }
  _locateAtomBoundaryRight(boundaryIndex) {
    // returns coordinate as a section and the atom in that section from which heading right of the atom hits the boundary given by the index
    // boundary index must be index of a boundary with a "flat view". That is boundaries are indexed between 0 and this.characters.length inclusive, ignoring "empty Section" that would otherwise count for 1 boundary
    const atomIndex = boundaryIndex - 1
    const [secIdx, offset] = this._locateAtom(boundaryIndex - 1)
    return [secIdx, offset + 1]
    // return this._locateAtom(atomIndex - 1)
  }
  // E.g, _locateBoundaryRight(3) of the following:
  //  0 1 2 3 4 5 6 7 8 9 A B C
  //  H e l l o ,   w o r l d !
  // | | |>|<| | | | | | | | | |
  //       ^      that is the boundary index at 3
  //      ^       this is the atom to the left, of the boundary "right" oriented 
  //        ^     this is the atom to the right of the boundary, "left" oriented
  //  3, LEFT === 2, RIGHT
  //
  // when I'm doing gap squeeze, I want to do as follows:
  // AAABBB CCCDDD AAABBB     3 Context
  //       |<    >|
  //   b. left   b. right
  //  note that when giving the slice range we specify the index of the boundary
  //  from the whole and determine the section & offset you'd need to hit that
  //  boundary when you "travel" in the given orientation.
  //  This matters when the boundary falls /between subPieces/ because it can
  //  then be referred to be two sets of section/offset pairs.
  //  
  //  We have b.right(x) === b.left(x) - 1
  //
  //  taking the same logic I can apply that to any range-based maneouver, start
  //  with delete for example since it's what inspired the "gap" strategy.
  //  rather than interpret the range as a pair of indices, one inclusive one
  //  exclusive, I look at it as a pair of boundaries, between which is the 
  //  referred range. No consideration over inclusive/exclusive, all indices
  //  between the boundaries are affected.
  //
  // also wow I'm getting my names mixed up.

  /**
   * Locates which subPiece contains the boundary in this Segment, and
   * the offset of the boundary within that Section 
   * 
   * Note if this section has no subPieces then this function will error.
   * There is only one "boundary" but not attached to any subPiece.
   * This makes it a little tricky to use recursively.
   * 
   * @param {Int} boundaryIndex Index of boundary to locate
   * @returns An ordered pair of the section index and boundary index within that section
   */
  _locateBoundary(boundaryIndex) {
    let sectionIndex = 0;
    while (boundaryIndex >= this.subPieces[sectionIndex].boundariesLength) {
      boundaryIndex -= this.subPieces[sectionIndex].boundariesLength
      sectionIndex++
    }
    return [sectionIndex, boundaryIndex]
  }

  _locateBoundaryFullyQualified(boundaryIndex) {

    const [sections, indices, offset] = this._pathToLocation(boundaryIndex)
    return [indices, offset]
    // if (this.subPieces.length === 0) return [ sectionIndices, boundaryIndex ]

    // const [ sectionIndex, boundaryIndexInSection ] = this._locateBoundary(boundaryIndex)

    // return this.subPieces[sectionIndex]._locateBoundaryFullyQualified(boundaryIndexInSection, [ ...sectionIndices, sectionIndex ])

  }

  _sectionPathToBoundary(boundaryIndex) {
    const [sections, indices, offset] = this._pathToLocation(boundaryIndex)
    return sections
  }

  _pathToLocation(boundaryIndex, sections = [], indices = []) {
    if (this.subPieces.length === 0) return [sections, indices, boundaryIndex]

    const [sectionIndex, boundaryIndexInSection] = this._locateBoundary(boundaryIndex)
    const section = this.subPieces[sectionIndex]

    return section._pathToLocation(boundaryIndexInSection, [...sections, section], [...indices, sectionIndex])

  }

  /**
   * Determine the index of the sub-piece that holds the atom at the 
   * given index
   * 
   * @param atomIndex Index of atom whose container we'd like to find
   */
  _locateSection(atomIndex) {
    const [sectionIndex] = this._locateAtom(atomIndex)
    return sectionIndex
  }
  //===================================================

  /* Content mutators */
  delete(start, end = undefined) {
    if (end === undefined) end = this.length

    const [leftSectionIndex, leftOffset] = this._locateAtomBoundaryLeft(start)
    const [rightSectionIndex, rightOffset] = this._locateAtomBoundaryRight(end)
    const patchedSections = []
    if (leftSectionIndex === rightSectionIndex) {
      patchedSections.push(this.subPieces[leftSectionIndex].delete(leftOffset, rightOffset))
    } else {
      patchedSections.push(this.subPieces[leftSectionIndex].delete(leftOffset), this.subPieces[rightSectionIndex].delete(0, rightOffset))
    }

    return this.splice(leftSectionIndex, 1 + (rightSectionIndex - leftSectionIndex), ...patchedSections).cutEmpty()

  }

  // least intrusive boundary join? or perhaps. using the mix api?
  deleteBoundary(startBoundary, endBoundary = undefined) {
    // Delete boundary is a complex tree operation.
    // We need to identify the "minimally impacted subtree".
    // The minimally impacted subtree is defined as the subSection node, buried within, that is
    // the earliest common ancestor to the impacted Segments.
    // We know we are that node if we determine that the subsection of the left branch is different
    // than the subsection of the right branch.
    if (this.boundariesLength === 1) return this
    if (endBoundary === undefined) endBoundary = this.boundariesLength - 1

    const [leftSectionIndex, leftOffset] = this._locateBoundary(startBoundary)
    const [rightSectionIndex, rightOffset] = this._locateBoundary(endBoundary)

    const isEarliestCommonAncestor = leftSectionIndex !== rightSectionIndex


    if (isEarliestCommonAncestor) {

      const newLeftSection = this.subPieces[leftSectionIndex].deleteBoundary(leftOffset)
      const newRightSection = this.subPieces[rightSectionIndex].deleteBoundary(0, rightOffset)
      const patchedSections = newLeftSection.mix(newRightSection)

      return this.splice(leftSectionIndex, 1 + (rightSectionIndex - leftSectionIndex), ...patchedSections).cutEmpty()

    } else {
      // This section is a common ancestor, but not the earliest common anscestor
      const newSection = this.subPieces[leftSectionIndex].deleteBoundary(leftOffset, rightOffset)

      // no mixing required. Removing boundaries cannot create /more/ sections, we don't have to handle a case
      // where mixing produces either 1 or 2 results. The matter is that if both boundaries are contained
      // within a single child then we expect to receive a single child back, any merging is internal to it, a
      // black box to us, the parent.

      return this.splice(leftSectionIndex, 1, newSection).cutEmpty()

    }

  }

  insert(location, atoms) {
    // TODO to fit the general pattern, might use the rest operator for all "sections" and "atoms" parameters, particularly here in insert.
    // TODO also I noticed I pluralized "newSecs" below, we could support inserting creating multiple new segments. E.g in a case where 
    //    we insert, say, multiple lineBreaks in a Context and it should create multiple Contexts... leaving this as TODO because that I
    //    will handle with logic for now but I like the idea of incorporating it into the design of Sections.
    //    also we should have more handling of results as lists. It does burden clients a bit which is the issue, as they generally expect
    //    singleton results (and would have to unwrap the list each time). Maybe we do it internally to section and expose the original
    //    behavior for the interface.
    const [sectionIndex, sectionOffset] = this._locateAtom(location)
    if (sectionIndex === this.subPieces.length) {
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

  insertBoundary(boundaryLocation, atoms) {

    const [sectionIndex, boundaryOffset] = this._locateBoundary(boundaryLocation)
    const newSection = this.subPieces[sectionIndex].insertBoundary(boundaryOffset, atoms)
    return this.splice(sectionIndex, 1, newSection)

  }

  /**
   * Apply function over atoms specified by the indices
   * 
   * @param func Function to apply over index
   * @param start Start index
   * @param end End index
   */
  operate(func, start, end) {
    const [left, mid, right] = this.triSplit(start, end)
    return this.copyFrom(...left.subPieces, ...mid.map(func).subPieces, ...right.subPieces).cutEmpty()
  }


  triSplit(start, end) {
    const [startSection, rest] = [...this.split(start)]
    const [midSection, endSection] = [...rest.split(end - start)]

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
      const [lb, rb] = [i === left ? start - cumulativeLength : 0, i === right ? end - cumulativeLength : section.length]

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

  // TODO mapRangeBoundary, operateBoundary, somewhat assume that ops are applied to AtomicSegments, 
  //    as it involves splitting.
  //    if we want to target, say, a layer of Contexts that are included in the touched on Range,
  //    then we are in for hell using this method.
  //    A continuation of the everlasting story of "this tree doesn't have a good API."

  operateBoundary(func, startBoundary, endBoundary) {
    // const [ left, mid, right ] = this.triSplit(start)
    return this.operate(func, startBoundary, endBoundary)
  }
  mapRangeBoundary(func, startBoundary, endBoundary) {
    if (this.subPieces.some(sec => sec.answers(func)))
      return this.operateBoundary(func, startBoundary, endBoundary)

    const [leftSectionIndex, leftBoundaryOffset] = this._locateBoundary(startBoundary)
    const [rightSectionIndex, rightBoundaryOffset] = this._locateBoundary(endBoundary)
    const resultSections = []

    for (let i = 0; i < this.subPieces.length; i++) {

      const section = this.subPieces[i]
      // const [ lb, rb ] = [ i === leftSectionIndex ? startBoundary - cumulativeLength : 0, i === rightSectionIndex ? endBoundary - cumulativeLength : section.boundariesLength ]

      if (i < leftSectionIndex || i > rightSectionIndex) {
        resultSections.push(section)
      } else if (i > leftSectionIndex && i < rightSectionIndex) {
        resultSections.push(section.map(func));
      } else {
        const lb = i === leftSectionIndex ? leftBoundaryOffset : 0
        const rb = i === rightSectionIndex ? rightBoundaryOffset : section.boundariesLength - 1
        // resultSections.push(section.mapRangeBoundary(func, lb, rb)).flat()
        resultSections.push(section.mapRangeBoundary(func, lb, rb))
      }
    }

    return this.copyFrom(...resultSections).cutEmpty()
  }

  answers(func) {
    // Thought- this is a edging close to a visitor pattern. I can also envision like a table, where we
    // specify functions on one dimension and subclasses of section on the other. consulting the table
    // reveals whether a given section answers the call, or propogates it. Actually, in terms of 
    // patterns, that reminds me of the event handling pattern. Might use a table, reminds me of Clox
    // and the unary/binary operator table.

    // Note: For a generic "Section" this is always false. Passing the result as the answer to "targetedBy"
    //  let's the code state something about the truth value. We have that for a section,
    //  "targetedBy" implies "answers". This way a child can override only targetedBy without breaking the
    //  conditional statement. A child can override both to exercise maximum control over the logic but
    //  must be careful to maintain the truth value, i.e it would be a contradiction to return true for
    //  "targetedby" but false for "answers"
    return this.targetedBy(func);
  }

  targetedBy(func) {
    // TODO: Mix of "targetedBy" and "answers". Q: Is it the case that targetedBy implies answers in all cases? should we enforce that? what would targetedBy but not "answers" mean?
    // these are controls for influencing how "map" behaves. Assuming for now targetedBy => answers

    // if answers, call propogation stops
    //    If targtedBy (and there fore also answers), then the function is applied to <<this>> 
    //    if not targeted by, then func is mapped over the segments array
    // if not answers call propogates to children by mapping over segments and calling .map on each segment
    return false
  }

  /**
   * Apply function according to some controls.
   * If "this" doesn't "answer" the function, then mapping recurses to childSegments
   * If "this" answers and is "targetedBy", then func is applied to "this"
   * If "this" answers and is not "targetedBy", then func is applied to children directly
   * 
   * Note that in either "answers" case the call propogation stops, no more recursion
   * 
   * @param func Function to apply
   */
  map(func) {
    // TODO test the use of "controls" like this, particularly as a means to also implement "AtomicSection" map behavior
    if (this.answers(func)) {
      if (this.targetedBy(func)) {
        return func(this.copy())
      } else {
        return this.copyFrom(...this.subPieces.map(func))
      }
    }
    return this.copyFrom(...this.subPieces.map(sec => sec.map(func)))
  }


  // =====================
  // -- Experiment Zone --
  // by which I mean decent functions with pending names

  predicateSlice(pred, startBoundary, endBoundary = undefined) {
    if (endBoundary === undefined || endBoundary >= this.boundariesLength) endBoundary = this.boundariesLength - 1  // notsure this works for "most" actually, then again. No, it should be right.

    const [l, mid, r] = this.triSplit(startBoundary, endBoundary)
    if (pred(this)) {
      return mid
    }

    return [...mid.subPieces.map(section => section.predicateSlice(pred, 0))].flat()

  }

  find(predicate) {

  }

  findOnIndicesPath(predicate, path) {

  }

  find(predicate, boundary) {

    const [nextSectionIdx, nextBoundary] = this._locateBoundary(boundary)
    const nextSection = this.subPieces[nextSectionIdx]
    if (predicate(this)) {
      return [ nextSectionIdx ]
    }

    return [ nextSectionIdx, ...nextSection.find(predicate, nextBoundary) ]
  }

  /**
   * Return the sub-tree of sections above the Sections containing the start boundary, end boundary,
   * and anything between.
   * An inorder traversal of sorts that sits one level of granularity above Atoms (in AtomicSections).
   * 
   * @param {Integer} startBoundary Boundary in first section to be selected
   * @param {Integer} endBoundary Boundary in second selection to be selected
   */
  sectionSelection(startBoundary, endBoundary) {
    /**
     * TODO
     * In theory, sectionSelection is a mapRangeBoundary with an ID function.
     * In fact it should be just that. To get there mapRangeBoundary must support
     * "splitting" at a section granularity, enabling its clients to do so when
     * needed. As of now it always splits at the Atom level.
     * To put it another way mapRangeBoundary produces strict spanning trees 
     * specified by boundaries.
     * I'd like to extend it to allow spanning trees that terminate not at boundaries
     * between atoms but at any Section containing those boundaries (+ anything in 
     * between). I think we'd get a lot of benefits re-implementing it that way, and
     * I think it would be able to support many of the API functions like this one
     * for producing specific spanning trees.
     * To that point I am planning to introduce an API func for producing a spanning
     * tree based on a predicate, that will allow to target certain Segments.
     * Maybe a SpanningVisitor that can select without having to use 'instanceof'
     */
    const [ startSecIdx, startOffset ] = this._locateBoundary(startBoundary)
    const [ endSecIdx, endOffset ] = this._locateBoundary(endBoundary)


    const left = this.subPieces[startSecIdx].sectionSelection(startOffset)
    const right = this.subPieces[endSecIdx].sectionSelection(endOffset)
    const between = this.subPieces.slice(startSecIdx + 1, endSecIdx)

    return this.copyFrom(left, ...between, right)
  }

  /**
   * 
   * @param {Function} predicate Function that accepts a Section as input and returns true or false
   * @param {*} boundary Location whose path to search along
   * @returns The first Section along the path to the boundary that satisfies the predicate
   */
  findOnPathToBoundary(predicate, boundary) {
    // Useful function for querying. But what can we do with the information?
    // Forexample, say we wanted to look for a Section to modify. THat's great
    // but the client would then need to know how to specifically update that 
    // section, we need almost a way to "thread" such an action through the 
    // tree
    const sections = this._sectionPathToBoundary(boundary)
    for (const section of sections) {
      if (predicate(section)) return section
    }
    return undefined
  }

  kindSlice(kind, startBoundary, endBoundary) {

    return this.predicateSlice(section => section.constructor.name === kind, startBoundary, endBoundary)

  }

  // =====================


  boundaryToAtomBoundary(boundaryLocation) {
    // Kinda like "boundary to cursor". Multiple boundaries can "collapse" to the same "index" over the atoms, e.g two adjacent boundaries always do.

    if (this.subPieces.length === 0) return 0

    if (boundaryLocation >= this.boundariesLength) boundaryLocation = this.boundariesLength - 1
    const [sectionIndex, offset] = this._locateBoundary(boundaryLocation)
    const atomOffset = this.subPieces.slice(0, sectionIndex).reduce((p, c) => p + c.length, 0)

    return atomOffset + this.subPieces[sectionIndex].boundaryToAtomBoundary(offset)
  }

  atomSlice(startBoundary, endBoundary = undefined) {
    if (endBoundary === undefined) endBoundary = this.boundariesLength - 1
    const lb = this.boundaryToAtomBoundary(startBoundary)
    const rb = this.boundaryToAtomBoundary(endBoundary)
    return this.atoms.slice(lb, rb)
  }

  /**
   * Returns true if the given pair of boundaries are adjacent
   * 
   * Adjacency is defined as the boundaries differ by exactly 1
   * and an atom slice with them as bounds yields an empty Array
   * of atoms
   * @param {Integer} boundary1 
   * @param {Integer} boundary2 
   * @returns 
   */
  areBoundariesAdjacent(boundary1, boundary2) {

    const left = boundary1 < boundary2 ? boundary1 : boundary2
    const right = boundary1 < boundary2 ? boundary2 : boundary1

    const diff = right - left

    if (diff === 1) {
      return this.atomSlice(left, right).length === 0
    }

    return false
  }

  at(offset) {
    return this.atoms.at(offset)
  }

  sectionAt(path) {

    // supports single integer argument as well
    if (!(path instanceof Array)) {
      const idx = path
      return this.subPieces.at(idx)
    }

    if (path.length === 0) return this

    const [secIndex, ...rest] = path

    return this.subPieces[secIndex]?.sectionAt(rest)

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

  structureEq(other) {
    if (other instanceof Section) {

      if (this.subPieces.length !== other.subPieces.length) return false

      for (let i = 0; i < this.subPieces.length; i++) {
        const secThis = this.subPieces[i]
        const secOther = other.subPieces[i]

        if (!secThis.structureEq(secOther)) return false
      }
      return true;
    }
    return false;
  }

  _showBoundaries() {
    if (this.empty()) return ''
    return this.subPieces.map(sp => sp._showBoundaries()).join('|')
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

  get boundariesLength() {
    return this.subPieces.length + 1
  }

  slice(start, end) {
    return this.copyFrom(...this.subPieces.slice(start, end))
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

  merge(other) {

    if (other === undefined) return this
    if (other instanceof AtomicSection) return this.mergeAtomic(other)
    // return this.join(other)

    // Like the merge in Section, merging AtomicSection to a (non-Atomic) Section begs trouble. This copies what Section does but the other way around.
    return this.mergeBehavior(other)
  }

  // atomic
  mergeAtomic(other) {
    return this.join(other)
  }
  // non-atomic
  mergeBehavior(other) {
    const otherLeftmost = other.subPieces[0]
    return other.copyFrom(...this.mix(otherLeftmost), ...other.subPieces.slice(1))
  }

  // ============
  insert(location, atoms) {
    const newSection = this.copy()
    newSection.subPieces.splice(location, 0, ...atoms)
    return newSection
  }
  insertBoundary(boundaryLocation, atoms) {
    return this.insert(boundaryLocation, atoms)
  }
  delete(start, end = undefined) {
    const newSection = this.copy()
    if (end === undefined) end = this.length
    newSection.subPieces.splice(start, end - start)
    return newSection
  }
  deleteBoundary(start, end = undefined) {
    return this.delete(start, end)
  }

  // ============
  predicateSlice(pred, startBoundary, endBoundary) {

    if (pred(this)) return [this.slice(startBoundary, endBoundary)]

    return []
  }

  sectionSelection(start, end) {
    return this
  }

  answers(func) {
    // AtomicSection always answers because it has no Section it can pass operations on to
    return true
  }

  // map(func) {
  //   // need a way to override the behavior. So that, yes, AtomiCsection always answers.
  //   // But critically sometimes the function applies to the section (maybe... targetedBy?)
  //   // othertimes it maps over the subpieces
  //   if (this.targetedBy(func))
  //     return func(this.copy())
  //   return this.copyFrom( ...this.subPieces.map(func) )
  // }

  boundaryToAtomBoundary(boundaryLocation) {
    return boundaryLocation
  }

  _pathToLocation(boundaryIndex, sections = [], indices = []) {
    return [sections, indices, boundaryIndex]
  }

  structureEq(other) {
    return this.eq(other)
  }

  _showBoundaries() {
    return this.atoms.join('|') + '|'
  }

}

export { AtomicSection, Section }
export default Section