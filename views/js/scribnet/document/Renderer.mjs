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

class HTMLRenderer extends Renderer {
  get wrapperStyling() {  // hmmmmmmmmmmmmmmmmmmmm
    return "white-space: pre-wrap;" // yeah. I think. In a shadow-dom world we'd just Not and leave it to the component, but I havent component'd renders yet.
  }



  toHTML(editDoc) {
    // Not the most elegant 'prettyprinter'
    if (editDoc === undefined) return ""
    let result = ""
    let currentBlock = undefined
    let inlineContext = ""
    const blocks = ["h1", "h2", "h3", "p"].map(s=>s.toUpperCase())

    // Extract out a tool for going from listLike->treeLike? that is, from a linear input, lift it to a tree
    // in the way we have tools for collapsing a tree down to a list
    const isBlock = segment => blocks.some(blockTag => segment.tags.includes(blockTag))
    const newBlock = () => currentBlock === undefined

    // I guess we won't use replaceAll since I would need the compiler to target es2021? Would prefer to keep it compatible-ish
    // const renderBlock = () => `<${currentBlock.toLowerCase()}>${inlineContext.replace(/\n/g, '<br>')}</${currentBlock.toLowerCase()}>`

    const cutLastNewLine = str => str.replace(/\n$/,'')
    const wrapOne = tag => (_, value) => `<${tag.toLowerCase()}>${value}</${tag.toLowerCase()}>`
    const renderBlock = () => wrapOne(currentBlock)`${inlineContext.replace(/\n/g, '<br>')}`
    const wrap = (tags, content) => tags.length === 0 ? content : wrapOne(tags[0])`${wrap(tags.slice(1), content)}`

    const closeBlock = () => {
      if (currentBlock !== undefined) {
        result += renderBlock()
        currentBlock = undefined
        inlineContext = ""
      }
    }

    for (const segment of editDoc.text.segments) {
      if (newBlock()) {
        currentBlock = segment.tags.find(t => blocks.includes(t))
      }
      const inlineTags = segment.tags.filter(t => !blocks.includes(t))
      inlineContext += wrap(inlineTags, escapeString(cutLastNewLine(segment.characters.join(''))))

      if (segment.characters.at(-1) === "\n") closeBlock()
    }
    return result
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

export { EditRenderer, HTMLRenderer }

// for testing
export { Renderer, escapeString, escapskies }