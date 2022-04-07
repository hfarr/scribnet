
import Doc from "./Doc.mjs"
import Context from "./Context.mjs"
import Segment from "./Segment.mjs"

// Data tools
// visitor pattern maybe? well we can use this "registration" pattern to inject behavior
function registerStatic(constructor, func) {
  constructor[func.name] = func.bind(constructor)
}
function register(constructor, func) {
  constructor.prototype[func.name] = func
}

function registerStaticCurry(func) { return function (constructor) { registerStatic(constructor, func) } }
function registerCurry(func) { return function (constructor) { register(constructor, func) } }

// Granularity Mapping

function countSegChildren() {
  // if (this instanceof Segment) return 0
  if (this.subPieces.length === 0) return 0
  return this.predicateSlice(sec => sec instanceof Segment, 0).length
}
function overCount() {
  if (this instanceof Segment) return 0
  if (this.subPieces.every(sec => sec instanceof Segment)) return this.subPieces.length > 0 ? this.subPieces.length - 1 : 0
  return this.subPieces.reduce((prev, sec) => prev + sec.overCount(), 0)
}

function cursorToBoundaryFavorLeft(cursorPosition) {
  if (this instanceof Segment) return cursorPosition
  let position = cursorPosition
  let boundary = 0

  for (const sec of this.subPieces) {
    if (position < sec.totalCursorPositions) {
      return boundary + sec.cursorToBoundaryFavorLeft(position)
    }
    boundary += sec.boundariesLength
    position -= (sec instanceof Segment) ? sec.length : sec.totalCursorPositions
  }
  return boundary + position
}
function cursorToBoundaryFavorRight(cursorPosition) {
  if (this instanceof Segment) return cursorPosition
  let position = cursorPosition
  let boundary = 0
  let boundaryLeft = 0

  for (const sec of this.subPieces) {
    if (position < sec.totalCursorPositions) {
      boundaryLeft = boundary + sec.cursorToBoundaryFavorRight(position)
      break;
    }
    boundary += sec.boundariesLength
    position -= (sec instanceof Segment) ? sec.length : sec.totalCursorPositions
  }

  if (boundaryLeft === 0) boundaryLeft = boundary + position

  if (this.subPieces.every(sec => sec instanceof Segment)) {
    const boundariesKernel = (b1, b2) => this.atomSlice(b1, b2).length === 0
    while (boundaryLeft + 1 < this.boundariesLength && boundariesKernel(boundaryLeft, boundaryLeft + 1))
      boundaryLeft += 1
  }
  return boundaryLeft
}

export default function mixInFunctionality() {
  const contextClasses = [Doc, Context, Segment]

  contextClasses.forEach(registerCurry(countSegChildren))
  contextClasses.forEach(registerCurry(overCount))

  contextClasses.forEach(registerCurry(cursorToBoundaryFavorLeft))
  contextClasses.forEach(registerCurry(cursorToBoundaryFavorRight))
}

