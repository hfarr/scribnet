'use strict'

import { renderTextFold, foldrDOM } from '../document/DOM.mjs';
import { Document } from '../document/Document.mjs'

import { formatDocument } from '../document/DOM.mjs';

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

    this.editDocument = new Document()
    this.listeners = {}
    this.listeners[Editor.EVENT_SELECTION_CHANGE] = []
  }

  /**
   * Normalize HTML in DOM without impacting render view
   */
  reformat() {

    this.readDOM()
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

  //------------------------

  setSelection(start, end) {
    // const editorNodes = treeFoldr((cur,prev) => [cur,...prev], [], this.component)
    // let startNode, endNode, startOffset, endOffset, previous
    // for (const node of editorNodes) {
    //   let textDifference = 0
    //   if (node.nodeType === Node.TEXT_NODE) {
    //     textDifference = node.textContent.length
    //   } else {
    //     if (node.tag)
    //   }
    // }
    const [ startNode=this.component, startOffset=0 ] = offsetToDOM(this.component, start)
    const [ endNode=this.component, endOffset=1 ] = offsetToDOM(this.component, end)
    window.getSelection().setBaseAndExtent(startNode, startOffset, endNode, endOffset)

    console.debug(startNode, startOffset)
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