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
  // TODO work out who should take responsibility for 'wrapperElement'. Renders is renders but perhaps it belongs.
  constructor(editDocument) {
    this.elem = undefined
    this.setEditDoc(editDocument)
  }

  setWrapper(elem) {
    this.elem = elem
    this.elem.style = this.wrapperStyling
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
  get wrapperStyling() {
    return ""
  }
  canShowHTML() {
    return this.editDocument !== undefined
  }
  canRender() {
    return this.canShowHTML() && this.elem !== undefined
  }
  toHTML() {
    return "<mark>Renderer superclass—use a subclass!</mark>"
  }
  render() {
    if (!this.canRender()) return
    this.elem.innerHTML = this.toHTML()
  }
}

// big custom component potential y'know
class EditRenderer extends Renderer {
  constructor(editDocument) {
    super(editDocument)
  }

  get wrapperStyling() {
    return "white-space: pre-wrap;" 
  }

  indicator(text) {
    return `<span style="border-left: 0.1rem solid #b100c4;">${text}</span>`
  }

  marker(text) {
    return `<mark style="background-color: #6667ab">${text}</mark>`
  }

  // TODO should escape html too. 
  toHTML() {
    if (!this.canShowHTML()) return ""

    const docString = [...this.editDocument.toString()]
    const prefix = docString.slice(0, this.editDocument.startOffset).map(escapskies)

    let result = ""
    if (this.editDocument.isCollapsed) {
      const selected = escapeString(this.editDocument.at())
      const postfix = docString.slice(this.editDocument.endOffset + 1).map(escapskies)
      result = prefix.join('') + this.indicator(selected) + postfix.join('')
    } else {
      const selString = escapeString(this.editDocument.selection())
      const postfix = docString.slice(this.editDocument.endOffset).map(escapskies)
      result = prefix.join('') + this.marker(selString) + postfix.join('')
    }

    return result
  }
}

export { EditRenderer }

// for testing
export { Renderer, escapeString, escapskies }