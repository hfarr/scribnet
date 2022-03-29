'use strict';


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
  constructor() {
    this.elem = undefined
    // this.setEditDoc(editDocument)
  }

  setWrapper(elem) {
    this.elem = elem
    this.elem.style = this.wrapperStyling
  }

  setEditDoc(editDocument) {
    if (editDocument === undefined) return
    this.editDocument = editDocument
    this.editDocument.addSelectListener(editDoc => this.render(editDoc))
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
  doesntHaveElem() {
    return this.elem === undefined
  }
  canRender() {
    return this.canShowHTML() && this.elem !== undefined
  }
  toHTML(_editDoc) {
    return "<mark>Renderer superclass—use a subclass!</mark>"
  }
  render(editDoc) {
    if (this.doesntHaveElem()) return
    // this.elem.innerHTML = ""
    // this.elem.insertAdjacentHTML('afterbegin',this.toHTML(editDoc))  // thinking about doing this. Maybe Element.setHTML once it's widely supported.
    this.elem.innerHTML = this.toHTML(editDoc)
  }
}

const wrapOne = (tag, value) => `<${tag.toLowerCase()}>${value}</${tag.toLowerCase()}>`
const wrapOneAttributes = (tag, attributes, value) => {
  const formattedAttributes = []
  for ( const [name, value ] of Object.entries(attributes)) 
    formattedAttributes.push(`${name}="${value}"`)

  if (formattedAttributes.length === 0) return wrapOne(tag, value)
  
  const attribution = formattedAttributes.join(' ')

  return `<${tag.toLowerCase()} ${attribution}>${value}</${tag.toLowerCase()}>`
  
}
const wrapMany = (tags, content) => tags.length === 0 ? content : wrapOne(tags[0], wrapMany(tags.slice(1), content))


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
  toHTML(editDoc) {
    if (editDoc === undefined) return ""

    const docString = [...editDoc.toString()]
    const prefix = docString.slice(0, editDoc.startOffset).map(escapskies)

    let result = ""
    if (editDoc.isCollapsed) {
      const selected = escapeString(editDoc.at())
      const postfix = docString.slice(editDoc.endOffset + 1).map(escapskies)
      result = prefix.join('') + this.indicator(selected) + postfix.join('')
    } else {
      const selString = escapeString(editDoc.selection())
      const postfix = docString.slice(editDoc.endOffset).map(escapskies)
      result = prefix.join('') + this.marker(selString) + postfix.join('')
    }

    return result
  }
}

export { EditRenderer }

// for testing
export { Renderer, escapeString, escapskies, wrapOne, wrapOneAttributes, wrapMany }