
import Section from "./Section.mjs"

import Segment from "./Segment.mjs"
import Context from "./Context.mjs"
import { Gap, isBlock } from "./Context.mjs"

class Doc extends Section {

  static createSection(tag, ...subPieces) {
    
  }

  static parseSerialDoc(serializedDoc) {
    // throws error if JSON.parse throws error
    let serialDocObj = JSON.parse(serializedDoc)
    // const result = Object.create(this.prototype, Object.getOwnPropertyDescriptors(serialDocObj))

    // result.subPieces = [ ...serialDocObj.map(Context.parseContext) ]

    return this.parse(serialDocObj)

  }

  static isBlock(tag) {
    return isBlock(tag)
  }

  write(string, location=undefined) {
    // TODO implement
    if ( this.empty() )
      return this.addSubSections(Context.from(new Segment())).insert(0, string)

    location = location ?? this.length

    return this.insert(location, string)
  }

  delete(start, end) {
    // Delete override to join Contexts
    // Context joining is a signature trait of using Doc to manage, rather than just having
    // a list of Context. a wrapping Section that understands, well, the Context.

    // Boundary work to determine if boundaries are crossed
    const [ leftSectionIndex, _ ] = this._locateAtomBoundaryLeft(start)
    const [ rightSectionIndex, __ ] = this._locateAtomBoundaryRight(end)

    const result = this.insertSubSections(rightSectionIndex + 1, new Gap()).insertSubSections(leftSectionIndex, new Gap())
    const boundDelete = super.delete.bind(result)
    return boundDelete(start, end).mergeTwoGaps()

  }

  updateBlock(blockTag, boundaryLocation) {

    return this.updateBlockAttributes({ blockTag }, boundaryLocation, boundaryLocation)
  }

  updateBlocks(blockTag, startBoundary, endBoundary) {
    
    return this.updateBlockAttributes({ blockTag }, startBoundary, endBoundary)
  }

  indent(amount, startBoundary, endBoundary) {
    return this.updateBlockAttributes({ indentDelta: amount }, startBoundary, endBoundary)
  }

  /**
   * Bulk update attributes of contexts over a range
   * 
   * @param {ContextOptions} options Options to update attributes of a Context
   * @param {*} startBoundary Beginning of range to update
   * @param {*} endBoundary End of range to update
   * @returns 
   */
  updateBlockAttributes(options, startBoundary, endBoundary) {
    const [ leftSectionIndex, leftOffset ] = this._locateBoundary(startBoundary)
    const [ rightSectionIndex, rightOffset ] = this._locateBoundary(endBoundary)

    const patchedContexts = this.contexts.filter((_, index) => index >= leftSectionIndex && index <= rightSectionIndex)
      .map( ctx => ctx.updateAttributes(options))

    return this.splice(leftSectionIndex, (rightSectionIndex - leftSectionIndex) + 1, ...patchedContexts)

  }

  writeBoundary(string, cursorLocation=undefined) {
    if (cursorLocation === undefined) cursorLocation = this.boundariesLength

    if ( this.empty() )
      return this.addSubSections(Context.from(new Segment())).insert(0, string)
    
    return super.insertBoundary(cursorLocation, string)

  }

  deleteBoundary(startBoundary, endBoundary) {
    return super.deleteBoundary(startBoundary, endBoundary)
    // const [ leftSectionIndex, _ ] = this._locateBoundary(startBoundary)
    // const [ rightSectionIndex, __ ] = this._locateBoundary(endBoundary)

  }

  contextSplit(boundary) {

    // TODO this exemplifies the "update(location)" pattern. we can capture it,
    // embellishing to include what func to use, how to know when to stop, etc.

    const [ index, offset ] = this._locateBoundary(boundary)
    const newSections = this.subPieces[index].contextSplit(offset)

    return this.splice(index, 1, ...newSections)
  }

  contextBreakAt(location) {
    const [ secIndex, boundaryOffset ] = this._locateBoundary(location)
    
    const newContexts = this.contexts[secIndex].contextBreakAt(boundaryOffset)
    return this.splice(secIndex, 1, ...newContexts)
    
    // return this.splitInterior(location)
  }

  mergeTwoGaps() {
    // would like to put this in the Gap class but we don't have any Section methods (yet) that would be appropriate to override
    // maybe gap extends Context? mmm. mmm. Such a method would need to return a list of Section.

    // these gaps are more like "bookends". We insert them, then kinda "press" them towards each other, squeezing out "merger". An apple press or something. A contraction.
    let left, right
    left = this.subPieces.findIndex( x => x instanceof Gap )
    right = this.subPieces.findIndex( (x, i) => x instanceof Gap && i > left )

    let merger = this.subPieces[left]
    for ( let i = left + 1; i < right + 1; i++ ) {
      merger = merger.join(this.subPieces[i])
    }

    return this.splice(left, right - left + 1, merger)
    
    // TODO would like to generalize this pattern (joining adjacent Section) into Sections
    //    call it "Squeeze". Love our non-commutative binary operator friends (join could be considered a non commutative binary operation).
    //    and... what do we get when we apply a binary operation over a range of elements...? that's right, reduction! a fold! functors! er.. foldables!

  }

  // --------
  cursorToBoundary(cursorPosition, favorLeft=true) {

    // offset counts by cursor positions, boundary counts up by boundaries
    let offset = cursorPosition
    let boundary = 0

    for (const ctx of this.contexts) {
      if (offset < ctx.totalCursorPositions)
        return boundary + ctx.cursorToBoundary(offset, favorLeft)

      boundary += ctx.boundariesLength
      offset -= ctx.length + 1
    }
    return 0
  }

  boundaryToCursor(boundary) {

  }

  /**
   * Computes the cursor positions by summing the length (in
   * atoms) plus the number of contexts. 
   *
   * Roughly, a cursor can exist 
   * - between each atom (this.length - 1 positions)
   * - at an extra position between each context 
   *   (this.contexts - 1 positions) 
   * - at the beginning and end (2 positions)
   * yielding the sum formula.
   * 
   * @returns Total number of "cursor positions" in this Doc
   */
  totalCursorPositions() {
    // Total
    return this.length + this.contexts.length
  }

  selection(cursorStart, cursorEnd) {
    // TODO should we add new lines for Context? Otherwise all selections are this "flat" result. Probably should. . . . later.
    const lb = this.cursorToBoundary(cursorStart)
    const rb = this.cursorToBoundary(cursorEnd)

    return this.atomSlice(lb, rb).join('')
  }

  // _locateBoundary()

  // -------------------

  get characters() {
    return this.atoms
  }

  get contexts() {
    return this.subPieces
  }

  applyTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.applyTags(tags) }, start, end)
  }
  removeTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.removeTags(tags) }, start, end)
  }
  toggleTags(tags, start, end) {
    return this.mapRangeBoundary(function applyTags(seg) { return seg.toggleTags(tags) }, start, end)
  }

  selectionHasTag(tag, start, end) {
    const any = this.predicateSlice( sec => sec instanceof Segment && sec.hasTag(tag), start, end )
    return any.length > 0
  }
  selectionEntirelyHasTag(tag, start, end) {
    const allMinOne = this.predicateSlice( sec => sec instanceof Segment, start, end )
    return allMinOne.length > 0 && allMinOne.every(sec => sec.hasTag(tag))
  }

  toString() {
    return this.characters.join('')
  }

  get boundariesLength() {
    if (this._boundariesLength === undefined) {
      this._boundariesLength = this.subPieces.reduce((lengthSoFar, section) => lengthSoFar + section.boundariesLength, 0)
    }
    return this._boundariesLength
  }


  get totalCursorPositions() {
    return this.boundariesLength - this.overCount()
    // if (this._numCursorPos === undefined) {
    //   this._numCursorPos = this.subPieces.reduce( (prev, sec) => prev + sec.totalCursorPositions, 0 )
    // }
    // return this._numCursorPos
  }

}

export default Doc
