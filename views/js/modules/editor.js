'use strict';

import { CursorComputer } from './document/document.mjs';
import { Document, HTMLRenderer } from './document/document.mjs'

// Thinking the editor maybe doesn't directly implement HTMLElement and instead acts as a composeable piece of functionality
// Can play around with that later

// Other design note - Views. Export as html, markdown, that will replace rendering.
// Have to disable the DOM default rendering somehow? Intercept it, override it?

// Design thought - cancel inputs by default if the kind of input is not explicitly handled ***
// Leery about this because we'd like to gracefully handle whatever comes our way. At the same
// time I'd like to make edits myself without interference. If an edit comes in that doesn't
// update the model predictably then I don't want anything to re-render.

// multiclass the renderer? Hm, no. That might make it into a separate custom component someday
// since I plan to have more components that render based on the Document.
// Maybe the renderer should attach to the Document? Probably not right now
class Editor extends HTMLElement {

  constructor() {
    super()

    // I'm concerned about overriding attributes, or attributes that 
    // State
    this.editDoc = new Document()
    this.data = { counter: 0 }
    this.renderer = new HTMLRenderer();
    this.activeNode = null;
    this.activeNodePath = [];
    this.activeOffset = null;

    this.listeners = [];

    // DOM interaction
    this.title = 'Oh!'  // setAttribute?

    // this.contentEditable = true // being more explicit. Not trying to store data on the object, but DOM interaction.
    // Maybe extend another class that has the state? a mix in? Then it can't interfere with the DOM accidentally
    this.setAttribute('contentEditable', true)

    this.addEventListener('click', this.onClick)
    this.addEventListener('onkeypress', this.keyPress)

    this.addEventListener('beforeinput', this.beforeInput)
    this.addEventListener('input', this.afterInput)
    this.addEventListener('keydown', this.keyDown)
  }

  // notify() {
  //   for (let callback of this.listeners) {
  //     callback(this);
  //   }
  // }

  updateCursor() {
    // let cursor = this.editDoc.getCursor;
    let [startNode, startOffset, endNode, endOffset] = [this.activeNode, this.activeOffset, this.activeNode, this.activeOffset];

    // let cc = new CursorComputer();
    // let [nodes, offset] = cc.getNodeAndOffset(this.editDoc)
    // console.log(nodes, offset)
    // ... todo
    // probably have to listen to mutations on the window. to set the doc cursor.
    console.debug(startNode, startOffset)
    window.getSelection().setBaseAndExtent(startNode, startOffset, endNode, endOffset)
  }

  render() {

    // Offsets into the doc that yield the Node and offset
    this.innerHTML = this.renderer.render(this.editDoc);
  }

  beforeInput(inputEvent) {
    // console.debug('InputEvent', inputEvent)
    // return;

    if (window.InputEvent && typeof InputEvent.prototype.getTargetRanges === "function") {

      const targetRanges = inputEvent.getTargetRanges()
      let r0 = targetRanges[0]
      // Start container is the textnode containing the starting caret
      // end container is the textnode containing the end
      if (r0) {
        console.debug(inputEvent, r0)
        if (inputEvent.inputType === 'insertText') { 
          this.editDoc.appendAt(r0.startOffset, inputEvent.data) 
          this.activeOffset = r0.startOffset + inputEvent.data.length; // covers pasting in and inserting just one character
          inputEvent.preventDefault()
          this.render();
          this.updateCursor();
          // if you use an element as a node, it has a width of 1. Text has a variable widht. that's why offsets were either 0 or one, in bound or out
          // this.notify();
          // window.getSelection().setPosition(r0.startContainer, r0.startOffset + 1)
        }
      }
    }
  }


  afterInput(inputEvent) {
    // console.log(`Input data: ${inputEvent.data}`)
    // console.log(`Input type: ${inputEvent.inputType}`)

  }

  onClick(mouseEvent) {

    console.debug(mouseEvent)
    this.editDoc.setActiveBlock(Array.from(this.children).indexOf(mouseEvent.target))
    this.activeNode = window.getSelection().anchorNode;

    // compute relative to the root :S
    let cur = this.activeNode;
    this.activeNodePath = []
    do {
      // :smile_with_tear
      this.activeNodePath.unshift(Array.from(cur.parentNode.childNodes).indexOf(cur))
      cur = cur.parentNode;
    } while (cur !== this)
    console.debug(this.activeNodePath)
    // the active node no longer exists because we re-write the html. like totally, so it no longer exists
    // we could compute the offsets from the "start" and from the "end" (considered as pre and reverse pre order traversals)
    // and select the active node using those offsets, but after the edit - 
    // or maybe update the Nodes in the tree rather than blanket smooshing out HTML. But I like blanket smooshing out HTML,
    // it feels more portablel. Like the HTMLRenderer doesn't need to know about the DOM.
    // We could also build a separate visitor that knows what's up

    // ah shoot. there is a bug because click events fire on the elements. they don't target nodes. so if a paragraph is broken into
    // pieces that are other nodes, <p>Text <other></other> text12</p> we can't distinguish between clicking on "Text " or " text12"
    // but we need to because. well. The simple solution. Don't take the target of the mouse event. Get the window selection.
  }


  keyDown(keyPressEvent) {
    /* e.g ctrl-b: wrap or unwrap text in <strong></strong> */
    /* all editor inputs like this will be processed elsewhere, but I think we can get away with a few */
    // console.log(keyPressEvent)
  }

  connectedCallback() {
    console.debug("Editor added to DOM");
    // this.render();

  }
  disconnectedCallback() {
    console.debug("Editor removed from DOM");
  }

  export(documentExporter) {
    // Inject a dependency. Doc exporter takes a doc and formats it some way. For now this will just be a json dump.

    return JSON.stringify(this.editDoc)

  }
}

if ('customElements' in window) {

  customElements.define('editor-hf', Editor);
}

export default Editor;