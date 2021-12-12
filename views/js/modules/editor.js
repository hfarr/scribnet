'use strict';

import { Document } from './document/document.mjs'

// Thinking the editor maybe doesn't directly implement HTMLElement and instead acts as a composeable piece of functionality
// Can play around with that later

// Other design note - Views. Export as html, markdown, that will replace rendering.
// Have to disable the DOM default rendering somehow? Intercept it, override it?

// Design thought - cancel inputs by default if the kind of input is not explicitly handled ***
// Leery about this because we'd like to gracefully handle whatever comes our way. At the same
// time I'd like to make edits myself without interference. If an edit comes in that doesn't
// update the model predictably then I don't want anything to re-render.

class Editor extends HTMLElement {

  constructor() {
    super()

    // I'm concerned about overriding attributes, or attributes that 
    // State
    this.editDoc = new Document()
    this.data = { counter: 0 }


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

  beforeInput(inputEvent) {
    // console.debug('InputEvent', inputEvent)
    // return;

    if (window.InputEvent && typeof InputEvent.prototype.getTargetRanges === "function") {

      const targetRanges = inputEvent.getTargetRanges()
      let r0 = targetRanges[0]
      // Start container is the textnode containing the starting caret
      // end container is the textnode containing the end
      if (r0) {
        // console.debug(r0.startContainer === r0.endContainer)
        console.log(r0)
        // console.log(r0.startContainer)
        // console.log(r0.endContainer)
      }
    }
    
    // inputEvent.preventDefault();  // Cancels the input. Should check event is cancelable before calling. Align to our edit system for this.
  }


  afterInput(inputEvent) {
    // console.log(`Input data: ${inputEvent.data}`)
    // console.log(`Input type: ${inputEvent.inputType}`)

  }

  onClick(mouseEvent) {

    this.editDoc.setActiveBlock(Array.from(this.children).indexOf(mouseEvent.target))

  }


  keyDown(keyPressEvent) {
    /* e.g ctrl-b: wrap or unwrap text in <strong></strong> */
    /* all editor inputs like this will be processed elsewhere, but I think we can get away with a few */
    // console.log(keyPressEvent)
  }

  connectedCallback() {
    console.debug("Editor added to DOM");

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