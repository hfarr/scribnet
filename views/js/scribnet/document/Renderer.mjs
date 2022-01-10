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

class HTMLRenderer extends Renderer {
  get wrapperStyling() {  // hmmmmmmmmmmmmmmmmmmmm
    return "white-space: pre-wrap;" // yeah. I think. In a shadow-dom world we'd just Not and leave it to the component, but I havent component'd renders yet.
  }



  toHTML() {
    // Not the most elegant 'prettyprinter'
    if (!this.canShowHTML()) return ""
    let result = ""
    let currentBlock = undefined
    // let inlineTags
    let inlineContext = ""
    const blocks = ["h1", "h2", "h3", "p"].map(s=>s.toUpperCase())

    // Extract out a tool for going from listLike->treeLike? that is, from a linear input, lift it to a tree
    // in the way we have tools for collapsing a tree down to a list
    const isBlock = segment => blocks.some(blockTag => segment.tags.includes(blockTag))
    const newBlock = () => currentBlock === undefined

    // const closeblock = ()=> `<${currentBlock}>${inlineContext.replaceAll('\n','<br>')}</${currentBlock}>`
    // I guess we won't use replaceAll since I would need the compiler to target es2021? Would prefer to keep it compatible-ish
    // const renderBlock = () => `<${currentBlock.toLowerCase()}>${inlineContext.replace(/\n/g, '<br>')}</${currentBlock.toLowerCase()}>`

    const wrapOne = tag => (_, value) => `<${tag.toLowerCase()}>${value}</${tag.toLowerCase()}>`
    const renderBlock = () => wrapOne(currentBlock)`${inlineContext.slice(0,-1).replace(/\n/g, '<br>')}`  // cut out last \n
    const wrap = (tags, content) => tags.length === 0 ? content : wrapOne(tags[0])`${wrap(tags.slice(1), content)}`

    const closeBlock = () => {
      if (currentBlock !== undefined) {
        result += renderBlock()
        currentBlock = undefined
        inlineContext = ""
      }
    }

    for (const segment of this.editDocument.text.segments) {
      if (newBlock()) {
        currentBlock = segment.tags.find(t => blocks.includes(t))
      }
      const inlineTags = segment.tags.filter(t => !blocks.includes(t))
      inlineContext += wrap(inlineTags, escapeString(segment.characters.join('')))

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

export { EditRenderer, HTMLRenderer }

// for testing
export { Renderer, escapeString, escapskies }