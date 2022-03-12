'use strict'

import { renderTextFold, foldrDOM } from '../document/DOM.mjs';

import { formatDocument, offsetToDOM } from '../document/DOM.mjs';
import { treeFoldr, foldElements } from '../document/DOM.mjs';

import EditDocument from '../document/EditDocument.mjs'
import { domFunctions } from '../document/EditDocument.mjs'

class DocHistory {

  constructor(firstDocument) {
    this.lengthLimit = 100
    this.history = [ ]
    this.add(firstDocument)

  }

  get current() {
    return this.history.at(-1)
  }

  add(newDoc) {
    this.history.push(newDoc)
    if (this.history.length > this.lengthLimit) {
      this.history.shift()
    }
  }
}

/**
 * Interface to programmatically access the editor component
 */
export class Editor {

  static EVENT_SELECTION_CHANGE = 'selectionchange'

  constructor(component) {
    this.component = component
    this.internalNode = undefined

    this.cursor = 0
    this.selectedText = ""
    this.characterAtCursor = ""

    this.docHistory = new DocHistory(EditDocument.newDocument())
    // this.editDocument = loadHTML(this.component)
    this.listeners = {}
    this.listeners[Editor.EVENT_SELECTION_CHANGE] = []
  }

  get currentDocument() {
    return this.docHistory.current
  }

  /**
   * Normalize HTML in DOM without impacting render view
   */
  reformat() {

    this.formatDOM()
    this.render()

  }

  textDOM() {
    let rightmostChild = foldrDOM((cur, prev) => {
      if (prev) return prev;
      if (cur.nodeType === Node.ELEMENT_NODE) {
        return cur
      }
      if (cur.nodeType === Node.TEXT_NODE && /\S/.test(cur.textContent)) {
        return cur
      }
      return undefined
    }, undefined, hf)
    // return renderedText(hf, rightmostChild);
    return renderTextFold(hf, rightmostChild);
  }

  /**
   * Read content presently in DOM, converting to internal
   * DOC structure
   */
  readDOM() {

    // newDoc = loadHTML(this.component)
    // this.docHistory.add(domFunctions.loadHTML(this.component))
    this.docHistory.add(domFunctions.loadDocument(this.component))

  }

  formatDOM() {
    // -------------
    // use DOM tools to traverse & grep in text. i.e what renderedText does now, but owned by Editor instead
    // Right now, reads doc and stuffs the formatted HTML into a div to convey html
    const formatNode = formatDocument(this.component)
    // would create a new Document here... for now manipulating just the editor
    this.internalNode = formatNode

  }

  /**
   * Print internal state into the DOM
   */
  render() {

    this.component.innerHTML = domFunctions.renderHTML(this.currentDocument)

    // ------------------ Currently renders from an HTML node, will render from document
    if (this.internalNode) {
      this.component.innerHTML = this.internalNode.innerHTML
    }
  }

  checkText() {
    const txt = textDOM()

  }

  addListener(eventKind, func) {
    if (eventKind in this.listeners) {
      this.listeners[eventKind].push(func)
      return true
    }
    return false
  }

  notify(eventKind) {
    for (const callback of this.listeners[eventKind]) {
      callback(this)
    }
  }

  /**
   * Return the string of text starting from the root editor node up to the node
   * passed as an argument.
   * Roughly the selected text if the user selected text as described.
   * 
   * @param node A node contained within this Editor
   * @param cursorOffset Offset of the cursor within in the node
   */
  textUpTo(node, cursorOffset) {
    const text = renderTextFold(this.component, node)
    let adjustment = cursorOffset - node.textContent.length
    if (node.nodeType === Node.ELEMENT_NODE) {
      adjustment = node.innerText.length
    }
    return text.slice(0, text.length + adjustment)
  }

  containsWindowSelection() {
    const sel = window.getSelection()
    const containsFocus = Boolean(this.component.compareDocumentPosition(sel.focusNode) & (Node.DOCUMENT_POSITION_CONTAINED_BY))
    const containsAnchor = Boolean(this.component.compareDocumentPosition(sel.anchorNode) & (Node.DOCUMENT_POSITION_CONTAINED_BY))
    return containsAnchor && containsFocus
  }

  updateDOMSelection() {

  }

  //========================

  // -- View functionality (listening for changes)
  docSelectionChange(docEvent) {

  }

  docContentChange(docEvent) {

  }

  // -- EditDoc "mutations"

  /**
   * Toggle properties of the selected text
   */
  toggleBold() {
    this.docHistory.add(this.currentDocument.toggleTag('strong'))
  }

  toggleItalic() {
    this.docHistory.add(this.currentDocument.toggleTag('em'))
  }

  toggleHighlight() {
    this.docHistory.add(this.currentDocument.toggleTag('mark'))
  }
  /**
   * *Set* properties of the selected text
   */
  setBold() {
    this.docHistory.add(this.currentDocument.applyTag('strong'))
  }

  setItalic() {
    this.docHistory.add(this.currentDocument.applyTag('em'))
  }

  setHighlight() {
    this.docHistory.add(this.currentDocument.applyTag('mark'))
  }

  applyColor(color) {
    // TODO work on interface for tags. Pass an object for attributes? An instance of a class?
    // TODO escape the color incase someone tries something... unsafe
    this.docHistory.add(this.currentDocument.applyTag('span', `style="background-color: ${color};"`))
  }

  /**
   * Text insertion & deletion
   */
  write(text) {
    this.docHistory.add(this.currentDocument.write(text))
  }
  delete() {
    this.docHistory.add(this.currentDocument.delete())
  }
  backspace() {
    if (this.currentDocument.isCollapsed) this.currentDocument.select(this.currentDocument.cursorOffset - 1)
    this.docHistory.add(this.currentDocument.delete())
  }
  enterNewline() {
    this.docHistory.add(this.currentDocument.enterNewline())
  }

  // -----------------------

  /**
   * Inverse (well..) of 'updateSelection'. Takes the currently selected text in the
   * internal EditDocument and maps it to the DOM, where it is rendered
   * 
   */
  selectInDOM() {
    const [ anchorNode, anchorOffset ] = offsetToDOM(this.component, this.currentDocument.anchorOffset)
    const [ focusNode, focusOffset ] = offsetToDOM(this.component, this.currentDocument.focusOffset)
    window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
  }

  /**
   * Update the cursor in the document
   * 
   * @param offset Offset into segment
   */
  select(anchor, focus) {
    this.currentDocument.select(anchor, focus)
    this.selectInDOM()  
    // (?) Should we always do this? I think so, it's the API we expose and
    // there are not meant to be direct ways to modify the document. If
    // someone wanted to they could write extensions in JS and select in the
    // document without updating.
    // In fact, editor might even do that. we may yet need a select-no-render
  }
  

  // Another feature that makes me ask, should I abstract *now*? I don't feel I need it yet, I won't,
  // yet it should be done at some point.

  // Update methods pull info from DOM and mutate the Document
  // Set methods do the opposite
  // Editor is the interface hooking them together and those features
  // should be re-expressed as capabilities we can extract out into
  // dedicated abstractions

  /**
   * Update the position of the cursor in the internal EditDocument
   */
  updateSelection() {
    if (!this.containsWindowSelection()) {
      return
    }
    const sel = window.getSelection()
    const elements = foldElements(this.component)

    // is this function too involved in knowledge of EditDocument's internals?
    // We're in the era of taking on a bit of tech debt, to sift out interfaces
    // later

    const domFocusOffset = domFunctions.charOffset(this.component, sel.focusNode, sel.focusOffset)
    this.currentDocument.select(domFocusOffset)

    // in a given paragraph, the cursor can be positioned at length + 1 spots, indexed 0-length.
    // you can index characters 0-(length-1) but we are counting cursor positions

    if (!sel.isCollapsed) {

      const domAnchorOffset = domFunctions.charOffset(this.component, sel.anchorNode, sel.anchorOffset)
      this.currentDocument.select(domFocusOffset, domAnchorOffset)

      // const parent = sel.focusNode.parentElement
      // traverse index much?
      // const segmentIndex = elements.indexOf(parent) + [...parent.childNodes].indexOf(sel.focusNode) - 1
      // const [ idx, offset ] = [ elements.indexOf(sel.focusNode.parentElement), sel.focusOffset ]
      // yeah, long term the editor isn't going to know how to translate DOM selection to doc
      // In the interim it's okay to use this strategy, Editor assumes all EditDocs are rendering as HTML
      // and takes the responsibility.
      // idx less one because the collapsed list includes the editor element
      // this.currentDocument.selectSegCoords(segmentIndex, sel.focusOffset)
    }
      
  }

  /**
   * Called on selection change
   * @param selectionChangeEvent 
   */
  async onSelectionChange(selectionChangeEvent) {
    // TODO extract to Event handler module

    const sel = window.getSelection()

    if (!this.containsWindowSelection()) {
      return
    }
    this.updateSelection()
    // console.debug(this.currentDocument.at())


    // --------------------------------------------------------------

    const re = sel.getRangeAt(0)  // Not handling multi ranges for now

    const textUpToStart = this.textUpTo(re.startContainer, re.startOffset)
    const textUpToEnd = this.textUpTo(re.endContainer, re.endOffset) 
    const cursorOffset = this.textUpTo(sel.focusNode, sel.focusOffset).length //+ sel.focusOffset - sel.focusNode.textContent.length;
    // We don't need to grab the text up to a selection. We only need to count characters.
    // It's inefficient, but for right now I like it and will keep it around.
    // I guess it is useful for selectedText at least. Not that we don't get that 
    // information anyway when it is sent through an event.

    let selectedText = textUpToEnd.slice(textUpToStart.length)
    const codePoint = this.component.innerText.codePointAt(cursorOffset)
    this.characterAtCursor = ''
    if (codePoint) {
      this.characterAtCursor = String.fromCodePoint(codePoint)
    }

    this.cursor = cursorOffset
    this.selectedText = selectedText

    this.notify('selectionchange')

  }

}