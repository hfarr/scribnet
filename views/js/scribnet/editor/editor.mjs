'use strict'

import { renderTextFold, foldrDOM } from '../document/DOM.mjs';

import { formatDocument } from '../document/DOM.mjs';

import EditDocument from '../document/EditDocument.mjs'
import { domFunctions } from '../document/EditDocument.mjs'
import { HTMLController } from '../document/controller/index.mjs'

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

    this.characterAtCursor = ""

    this.docHistory = new DocHistory(EditDocument.newDocument())
    this.controller = new HTMLController()
    this.initStates()
    // this.editDocument = loadHTML(this.component)
    this.listeners = {}
    this.listeners[Editor.EVENT_SELECTION_CHANGE] = []
  }

  get currentDocument() {
    return this.docHistory.current
  }

  set currentDocument(editDoc) {
    this.pushNewDoc(editDoc)
    this.controller.selectAction()
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
    this.pushNewDoc(domFunctions.loadDocument(this.component), 'Load from DOM')

    // TODO Maybe not. We have a lot of quirks when it comes to loading data into an editor, e.g automatic readDOMs from the component which we may or may not want
    // this.controller.selectAction()
  }

  // @deprecated
  loadDoc(serialDoc) {

    this.pushNewDoc(EditDocument.fromSerializedDocSection(serialDoc))

    // a piece of state initialization
    this.controller.selectAction()

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
    return this.containsSelection(window.getSelection())
  }

  containsSelection(sel) {
    const containsFocus = Boolean(this.component.compareDocumentPosition(sel.focusNode) & (Node.DOCUMENT_POSITION_CONTAINED_BY))
    const containsAnchor = Boolean(this.component.compareDocumentPosition(sel.anchorNode) & (Node.DOCUMENT_POSITION_CONTAINED_BY))
    return containsAnchor && containsFocus
  }

  updateDOMSelection() {

  }

  pushNewDoc(editDocument, message) {
    this.docHistory.add(editDocument, message)
    this.controller.editDocument = editDocument
  }

  //========================

  // -- View functionality (listening for changes)
  docSelectionChange(docEvent) {

  }

  docContentChange(docEvent) {

  }

  //=========================
  //-- EditDoc "mutations" --

  /**
   * Toggle properties of the selected text
   */
  toggleBold() {
    this.pushNewDoc(this.currentDocument.toggleTag('strong'), "Toggle bold")
  }

  toggleItalic() {
    this.pushNewDoc(this.currentDocument.toggleTag('em'), "Toggle italic")
  }

  toggleHighlight() {
    this.pushNewDoc(this.currentDocument.toggleTag('mark'), "Toggle highlight")
  }
  /**
   * *Set* properties of the selected text
   */
  setBold() {
    this.pushNewDoc(this.currentDocument.applyTag('strong'), "Set bold")
  }

  setItalic() {
    this.pushNewDoc(this.currentDocument.applyTag('em'), "Set italic")
  }

  setHighlight() {
    this.pushNewDoc(this.currentDocument.applyTag('mark'), "Set highlight")
  }

  applyColor(color) {
    // TODO work on interface for tags. Pass an object for attributes? An instance of a class?
    // TODO escape the color incase someone tries something... unsafe
    this.pushNewDoc(this.currentDocument.applyTag('span', `style="background-color: ${color};"`), "Apply color")
  }

  setBlockTag(tag) {
    this.pushNewDoc(this.currentDocument.setBlockTag(tag))
  }

  enterTab() {
    this.pushNewDoc(this.currentDocument.enterTab())
  }

  enterShiftTab() {
    this.pushNewDoc(this.currentDocument.enterShiftTab())
  }

  // -- Text insertion & deletion

  write(text) {
    this.pushNewDoc(this.currentDocument.write(text), `Write: ${text}`)
    this.controller.insertAction(text)
  }
  delete() {
    this.pushNewDoc(this.currentDocument.delete(), 'Delete')
    this.controller.deleteAction()
  }
  backspace() {
    if (this.currentDocument.isCollapsed) this.currentDocument.select(this.currentDocument.cursorOffset - 1)
    this.pushNewDoc(this.currentDocument.delete(), 'Backspace')
    this.controller.deleteAction()
  }
  enterNewline() {
    this.pushNewDoc(this.currentDocument.enterNewline(), 'Enter key')
  }

  // -- Other API

  /**
   * Update the cursor in the document.
   * Side effect: Updated position reflects back to DOM
   * 
   * @param offset Offset into segment
   */
  select(anchor, focus) {
    this.currentDocument.select(anchor, focus)
    this.selectInDOM()  
    this.controller.selectAction()
  }
  

  //=========================
  //-- Statefulness ---------

  initStates() {
    // transitoryEffect always moves to 'init' state after. May not want that, or maybe can supply a "final" state as an argument.
    this.controller.setTransitoryAction('^* |', () => {
      console.debug('start, star, space!')
      this.currentDocument.select(this.currentDocument.startOffset - 2, this.currentDocument.startOffset)
      this.pushNewDoc(this.currentDocument.delete().createList())
      // tempEd = tempED.setBlockTag('ul')

      // this.controller.deleteAction()

    })

    this.controller.setTransitoryAction('(?)|', () => {
      console.debug('question mark!')
      this.currentDocument.select(this.currentDocument.startOffset - 3, this.currentDocument.startOffset)
      this.pushNewDoc(this.currentDocument.delete().write('???'))
      // tempEd = tempED.setBlockTag('ul')

      // this.controller.deleteAction()

    })
  }


  //=========================


  resolveNode(pathToNode) {
    let currentNode = this.component
    let path = pathToNode.slice()
    let index
    while (path.length > 0) {
      [ index, ...path ] = path
      // currentElement = currentElement.children[index]
      currentNode = currentNode.childNodes[index]
    }
    return currentNode
  }

  /**
   * Inverse (well..) of 'updateSelection'. Takes the currently selected text in the
   * internal EditDocument and maps it to the DOM, where it is rendered
   * 
   */
  selectInDOM(renderer) {

    const pathFinder = renderer.constructor.pathToCursorInDOM
    const [ anchorPath, anchorOffset ] = this.currentDocument.pathToAnchorBoundary(pathFinder)
    const [ focusPath, focusOffset ] = this.currentDocument.pathToFocusBoundary(pathFinder)
    const anchorNode = this.resolveNode(anchorPath)
    const focusNode = this.resolveNode(focusPath)
    window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
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

    this.controller.selectAction()
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
  get selectedText() {
    return this.currentDocument.selection()
  }

  userUpdateSelection() {
    this.userNavigated = true

    const sel = window.getSelection()
    if (!this.containsSelection(sel)) return
    this.updateSelection(sel)
  }

}