'use strict';

import EditDocument from "./Document.mjs";
function escapskies(codePoint) {
  switch (codePoint) {
    case '<': return '&lt;'
    case '>': return '&gt;'
    case '&': return '&amp;'
    case '"': return '&quot;'
    case "'": return '&#39;'
    default: return codePoint
  }
}

function escapeString(htmlRaw) {

  return [...htmlRaw].map(escapskies).join('')
}

// big custom component potential y'know
export default class EditRenderer {
  constructor(wrapperElement) {
    this.elem = wrapperElement
    this.elem.style = "white-space: pre-wrap;"

    this.indicator = document.createElement('span')
    this.indicator.style = `border-left: 0.1rem solid #b100c4;`
  }

  // TODO should escape html too. 
  render(editDocument) {
    // let result = ""
    const cursorOffset = editDocument.cursorOffset
    const docString = [...editDocument.toString()]

    const prefix = docString.slice(0, cursorOffset).map(escapskies)
    const postfix = escapskies(docString.slice(cursorOffset + 1)).map(escapskies)
    // only handles collapsed selections at the moment
    const selected = escapskies(escapeString(docString.at(cursorOffset)))
    this.indicator.innerHTML = selected
    const result = prefix.join('') + this.indicator.outerHTML + postfix.join('')

    this.elem.innerHTML = result
  }
}