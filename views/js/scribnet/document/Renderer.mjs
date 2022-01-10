'use strict';

// import EditDocument from "./Document.mjs";
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

class Renderer {
  constructor(wrapperElement, editDocument) {
    this.elem = wrapperElement

    this.setEditDoc(editDocument)
  }

  setEditDoc(editDocument) {
    if (editDocument === undefined) return
    this.editDocument = editDocument
    this.editDocument.addSelectListener(_ => this.render())
  }
  removeEditDoc() {
    if (this.editDocument === undefined) return
    this.editDocument.removeSelectListener(this.render)
    this.editDocument = undefined
  }
  canRender() {
    return this.editDocument !== undefined
  }
}

// big custom component potential y'know
class EditRenderer extends Renderer {
  constructor(wrapperElement, editDocument) {
    super(wrapperElement, editDocument)
    
    this.elem.style = "white-space: pre-wrap;"

    this.indicator = document.createElement('span')
    this.indicator.style = `border-left: 0.1rem solid #b100c4;`

    this.marker = document.createElement('mark')
    this.marker.style = `background-color: #6667ab` // very peri, color of the year

  }

  // TODO should escape html too. 
  render() {
    if (!this.canRender()) return

    const docString = [...this.editDocument.toString()]
    const prefix = docString.slice(0, this.editDocument.startOffset).map(escapskies)

    let result = ""
    if (this.editDocument.isCollapsed) {
      const selected = escapeString(this.editDocument.at())
      this.indicator.innerHTML = selected
      const postfix = docString.slice(this.editDocument.endOffset + 1).map(escapskies)
      result = prefix.join('') + this.indicator.outerHTML + postfix.join('')
    } else {

      const selString = escapeString(this.editDocument.selection())
      this.marker.innerHTML = selString
      const postfix = docString.slice(this.editDocument.endOffset).map(escapskies)
      result = prefix.join('') + this.marker.outerHTML + postfix.join('')
    }
    this.elem.innerHTML = result

  }
}

export { EditRenderer }