
import { Renderer, escapeString, wrapOne, wrapMany, wrapOneAttributes } from "./Renderer.mjs";

import { Context, Segment } from "../../section/index.mjs";



// function genInfinite0() {
//   yield 0
// }

function hideMarker(context) {
  if (context.blockTag !== 'li') return false

  let condition = context.subPieces.length > 0 && context.subPieces[0] instanceof Context
  if (condition)
    condition &&= context.subPieces[0].blockTag === 'ul'

  return condition
}

// TODO-accept editDoc in constructor? :S would an HTML renderer "own" that or would it be more about the specific place 
//  where rendering occurs (in a document?) hermngh
class HTMLRenderer extends Renderer {

  constructor() {
    super()
    this.indentationUnits = 'rem'
    this.indentationUnitsPerTab = 2
  }

  // TODO having a tough time imagining a good place to cover the intersection of DOM API, knowing which kind of document
  // the cursor will output to (HTML vs MD vs EditRenderer...), and the Context classes. A lot of different places
  // come together to solve this problem.
  // okay- Path to Cursor will wrap FQBL (fully qualified boundary location). Then it will adjust offset based on the
  // "export" document type. No knowledge of rootElement, I think I can stay satisfied with that.
  static pathToCursorInDOM( document, boundaryPosition ) {
    const [ path, offset ] = document._locateBoundaryFullyQualified(boundaryPosition)

    // for a Segment at the end we must account for each possible tag. They become part of hte path in HTML even if it's not part of the path w.r.t to our doc model.
    const section = document.sectionAt(path)
    let domPathToNode = path
    let domNodeOffset = offset

    if (section instanceof Segment) {
      // we cut the Segment from the path. It doesn't implicitly have any Tags, so it is not an element child of any Node, it would be a Text Node. Only Tags on 
      // a segment represent part of the Path that we need to hand to the DOM traverser.
      // this function is an interface from the "document" notion of a path to a "DOM" notion of a path, where in each step is an Element.
      // Contexts all have one Tag. Segments have an arbitrary amount, but they always produce at least one value on the path since the first step is to use
      // the Section notion of a path. That slice cuts out that part of the puzzle.
      const normalizePath = (doc, [ path, offset ]) => {
        // TODO might also need to update offset. it would be added the length of previous segments.
        const parentContext = doc.sectionAt(path.slice(0, -1))
        const segmentIndex = path.at(-1)
        let segOffset = 0
        let nodeOffset = offset

        let adjoinPrevious = false;
        let prevSegment = undefined;
        for ( let i = 0; i <= segmentIndex; i++ ) {
          const segment = parentContext.segments[i]
          if (segment.tags.length === 0) {
            if (adjoinPrevious) {
              segOffset++
              nodeOffset += prevSegment.length
            }
            prevSegment = segment
            adjoinPrevious = true
          } else {
            adjoinPrevious = false
            nodeOffset = offset // a reset, otherwise it accumulates way too much
          }
        }

        return [ [ ...path.slice(0, -1), segmentIndex - segOffset ], nodeOffset ]

      }

      const [ normalizedPath, normaliedOffset ] = normalizePath(document, [ path, offset ])
      const segmentTagsPath = [ ...Array(section.tags.length).fill(0) ]

      domPathToNode = [ ...normalizedPath, ...segmentTagsPath ]
      domNodeOffset = normaliedOffset
    }

    // no adjustmnets to offset for HTML
    // jk there are adjustments...
    return [ domPathToNode, domNodeOffset ]
  }

  get wrapperStyling() {  // hmmmmmmmmmmmmmmmmmmmm
    return "white-space: pre-wrap;" // yeah. I think. In a shadow-dom world we'd just Not and leave it to the component, but I havent component'd renders yet.
  }


  renderSegment(inlineSegment) {
    
    return wrapMany(inlineSegment.tags, inlineSegment.toString())

  }

  renderContext(context) {
    let result = ""
    const blockTag = context.block
    let attributes = {}

    if (context.indentation > 0) {
      attributes = {
        ...attributes,
        style: `margin-left: ${context.indentation * this.indentationUnitsPerTab}${this.indentationUnits};`
      }
    }

    // if (context.empty()) result += "<br>"
    if (context.length === 0 && !['ul','ol','li'].includes(blockTag)) result += "<br>"

    switch(blockTag) {
      case 'li': {
        if (hideMarker(context)) {
          attributes['class'] = 'hideMarker'
        } 
        // else if (context.length === 0) {
        //   result += "<br>"
        // }
      }
      // case 'ol':
      // case 'ul': 
    }

    if (context.subPieces.every(sec => sec instanceof Segment)) {
      for (const subsection of context.subPieces) result += this.renderSegment(subsection)
    } else {
      for (const subsection of context.subPieces) result += this.renderContext(subsection)
    }

    if (blockTag === '') return result

    return wrapOneAttributes(blockTag, attributes, result)

  }

  renderDoc(document) {
    let result = ""
    for (const context of document.contexts)
      result += this.renderContext(context)
    
    return result

  }

  toHTML(document) {  // Working on the document model now
    return this.renderDoc(document)
  }
}

export default HTMLRenderer