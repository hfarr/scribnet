'use strict';

import { Editor } from './editor.mjs'

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
class EditorComponent extends HTMLElement {

  constructor() {
    super()

    // I'm concerned about overriding attributes. It's fragile. unfortunately I don't know if there's any handy piece
    // of state I can repurpose, like a global WeakMap
    this.data = { counter: 0 }

    this.editor = new Editor(this);
    this.editor.reformat()

    // this.contentEditable = true // being more explicit. Not trying to store data on the object, but DOM interaction.
    // Maybe extend another class that has the state? a mix in? Then it can't interfere with the DOM accidentally
    this.setAttribute('contentEditable', true)

    // document.addEventListener('selectionchange', async (e) => this.editor.onSelectionChange(e))
    this.editor.evtSelChg = async (e) => this.editor.onSelectionChange(e)

  }

  beforeInput(inputEvent) {

    if (window.InputEvent && typeof InputEvent.prototype.getTargetRanges === "function") {

      const targetRanges = inputEvent.getTargetRanges()
      let r0 = targetRanges[0]
      // Start container is the textnode containing the starting caret
      // end container is the textnode containing the end
      if (r0) {
        console.debug(inputEvent, r0)
        if (inputEvent.inputType === 'insertText') { 
          this.editDoc.appendAt(r0.startOffset, inputEvent.data) 
          this.activeOffset = r0.startOffset + inputEvent.data.length;
          inputEvent.preventDefault()
          this.render();
          this.updateCursor();
        }
      }
    }
  }


  afterInput(inputEvent) {

  }

  onClick(mouseEvent) {

  }


  keyDown(keyPressEvent) {
  }

  get observedAttributes() {
    return [ 'data' ]
  }

  connectedCallback() {
    // console.debug("Editor added to DOM");
    this.editor.reformat()
    
    document.addEventListener('selectionchange', this.editor.evtSelChg)

  }
  disconnectedCallback() {
    
    document.removeEventListener('selectionchange', this.editor.evtSelChg)
  }

  export(documentExporter) {
    // Inject a dependency. Doc exporter takes a doc and formats it some way. For now this will just be a json dump.

    return JSON.stringify(this.editDoc)

  }
}

if ('customElements' in window) {

  customElements.define('editor-hf', EditorComponent);
}

export default EditorComponent;