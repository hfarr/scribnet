'use strict'

import { renderTextFold, foldrDOM } from '../document/DOM.mjs';
import { Document } from '../document/document.mjs'

import { formatDocument } from '../document/DOM.mjs';

/**
 * Interface to programmatically access the editor component
 */
export class Editor {

  constructor(component) {
    this.component = component
    this.internalNode = undefined

    this.editDocument = new Document()
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

}