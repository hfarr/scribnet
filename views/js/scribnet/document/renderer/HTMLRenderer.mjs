
import { Renderer, escapeString, wrapOne, wrapMany, wrapOneAttributes } from "./Renderer.mjs";

import { Context, Segment } from "../../section/Context.mjs";




// TODO-accept editDoc in constructor? :S would an HTML renderer "own" that or would it be more about the specific place 
//  where rendering occurs (in a document?) hermngh
class HTMLRenderer extends Renderer {

  constructor() {
    super()
    this.indentationUnits = 'rem'
    this.indentationUnitsPerTab = 2
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