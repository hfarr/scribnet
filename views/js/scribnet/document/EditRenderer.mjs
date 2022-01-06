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

    this.marker = document.createElement('mark')
    this.marker.style = `background-color: #6667ab` // very peri, color of the year

  }

  // TODO should escape html too. 
  render(editDocument) {
    const docString = [...editDocument.toString()]
    const prefix = docString.slice(0, editDocument.startOffset).map(escapskies)

    let result = ""
    if (editDocument.isCollapsed) {
      const selected = escapeString(editDocument.at())
      this.indicator.innerHTML = selected
      const postfix = docString.slice(editDocument.endOffset + 1).map(escapskies)
      result = prefix.join('') + this.indicator.outerHTML + postfix.join('')
    } else {

      const selString = escapeString(editDocument.selection())
      this.marker.innerHTML = selString
      const postfix = docString.slice(editDocument.endOffset).map(escapskies)
      result = prefix.join('') + this.marker.outerHTML + postfix.join('')
    }
    this.elem.innerHTML = result

  }
}