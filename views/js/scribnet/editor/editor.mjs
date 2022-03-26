'use strict'

import { renderTextFold, foldrDOM } from '../document/DOM.mjs';

import { formatDocument } from '../document/DOM.mjs';
import { treeFoldr, foldElements } from '../document/DOM.mjs';

import EditDocument from '../document/EditDocument.mjs'
import { domFunctions } from '../document/EditDocument.mjs'

class DocHistory {

  constructor(firstDocument) {
    this.lengthLimit = 100
    this.history = [ ]
    this.meta = [ ]
    this.add(firstDocument)

  }

  get current() {
    return this.history.at(-1)
  }

  add(newDoc, message = 'No mesage') {
    const { startOffset, endOffset, _startBoundary, _endBoundary } = newDoc
    this.history.push(newDoc)
    this.meta.push({ doc: newDoc, message, startOffset, endOffset, _startBoundary, _endBoundary } )
    if (this.history.length > this.lengthLimit) {
      this.history.shift()
      this.meta.shift()
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
    this.docHistory.add(domFunctions.loadDocument(this.component), 'Load from DOM')

  }

  loadDoc(serialDoc) {

    this.docHistory.add(EditDocument.fromSerializedDocSection(serialDoc))

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
    this.docHistory.add(this.currentDocument.toggleTag('strong'), "Toggle bold")
  }

  toggleItalic() {
    this.docHistory.add(this.currentDocument.toggleTag('em'), "Toggle italic")
  }

  toggleHighlight() {
    this.docHistory.add(this.currentDocument.toggleTag('mark'), "Toggle highlight")
  }
  /**
   * *Set* properties of the selected text
   */
  setBold() {
    this.docHistory.add(this.currentDocument.applyTag('strong'), "Set bold")
  }

  setItalic() {
    this.docHistory.add(this.currentDocument.applyTag('em'), "Set italic")
  }

  setHighlight() {
    this.docHistory.add(this.currentDocument.applyTag('mark'), "Set highlight")
  }

  applyColor(color) {
    // TODO work on interface for tags. Pass an object for attributes? An instance of a class?
    // TODO escape the color incase someone tries something... unsafe
    this.docHistory.add(this.currentDocument.applyTag('span', `style="background-color: ${color};"`), "Apply color")
  }

  setBlockTag(tag) {
    this.docHistory.add(this.currentDocument.setBlockTag(tag))
  }

  indentBlock(amount) {
    this.docHistory.add(this.currentDocument.indentBlock(amount))
  }

  /**
   * Text insertion & deletion
   */
  write(text) {
    this.docHistory.add(this.currentDocument.write(text), `Write: ${text}`)
  }
  delete() {
    this.docHistory.add(this.currentDocument.delete(), 'Delete')
  }
  backspace() {
    if (this.currentDocument.isCollapsed) this.currentDocument.select(this.currentDocument.cursorOffset - 1)
    this.docHistory.add(this.currentDocument.delete(), 'Backspace')
  }
  enterNewline() {
    this.docHistory.add(this.currentDocument.enterNewline(), 'Enter key')
  }

  // -----------------------

  /**
   * Inverse (well..) of 'updateSelection'. Takes the currently selected text in the
   * internal EditDocument and maps it to the DOM, where it is rendered
   * 
   */
  selectInDOM() {
    // const [ anchorNode, anchorOffset ] = offsetToDOM(this.component, this.currentDocument.anchorOffset)
    // const [ focusNode, focusOffset ] = offsetToDOM(this.component, this.currentDocument.focusOffset)
    // window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)

    const { anchorOffsetComputer, focusOffsetComputer } = this.currentDocument.offsetsInDOMComputers
    window.getSelection().setBaseAndExtent(...anchorOffsetComputer(this.component), ...focusOffsetComputer(this.component))
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
  updateSelection(selection) {


    // const domFocusOffset = domFunctions.charOffset(this.component, selection.focusNode, selection.focusOffset)
    // this.currentDocument.select(domFocusOffset)

    const domFocusBoundary = domFunctions.cursorOffset(this.component, selection.focusNode, selection.focusOffset)
    // this.currentDocument.selectBoundary(domFocusOffset)
    this.currentDocument.select(domFocusBoundary)


    if (!selection.isCollapsed) {

      // const domAnchorOffset = domFunctions.charOffset(this.component, selection.anchorNode, selection.anchorOffset)
      // this.currentDocument.select(domFocusOffset, domAnchorOffset)

      const domAnchorBoundary = domFunctions.cursorOffset(this.component, selection.anchorNode, selection.anchorOffset)
      // this.currentDocument.selectBoundary(domAnchorBoundary, domFocusBoundary)
      this.currentDocument.select(domAnchorBoundary, domFocusBoundary)

    }
  }

  at(index = undefined) {
    return this.currentDocument.at(index)
  }
  get charOffset() {
    return this.currentDocument.cursorOffset
  }
  get cursorOffset() {
    if (!this.containsWindowSelection()) return undefined

    const sel = window.getSelection()
    const cursorOffset = domFunctions.cursorOffset(this.component, sel.focusNode, sel.focusOffset)
    return cursorOffset
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
    this.updateSelection(sel)
    // console.debug(this.currentDocument.at())


    // --------------------------------------------------------------
    // below this line we don't need. We can find selectedText this way
    // which is neat, cool, so happy 4 u.
    // in the Way of All Things though it should be grabbing selected
    // text from the internal document

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

    console.debug('cursor offset', this.cursorOffset, 'character index', this.currentDocument.cursorOffset)

  }

}