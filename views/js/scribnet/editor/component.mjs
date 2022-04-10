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

// TODO we need to handle nested block elements, or make a distinction between block elements that
// nest and ones that don't. That is, recursively generate "block" contexts, where we imagine right
// now the editor only has one block context, and it is also a 'base case'.

const initialized = Symbol("initialized")

class EditorComponent extends HTMLElement {

  constructor() {
    super()

    // I'm concerned about overriding attributes. It's fragile. unfortunately I don't know if there's any handy piece
    // of state I can repurpose, like a global WeakMap
    // this.data = { counter: 0 }



    // this.contentEditable = true // being more explicit. Not trying to store data on the object, but DOM interaction.
    // Maybe extend another class that has the state? a mix in? Then it can't interfere with the DOM accidentally
    // this.setAttribute('contentEditable', true)  // might eventually become a part of "renderers" or view/controllers

    // document.addEventListener('selectionchange', async (e) => this.editor.onSelectionChange(e))
  }

  init() {
    if (initialized in this) return

    this.editor = new Editor(this);
    // this.editor.reformat()
    this.editor.readDOM()
    
    this.initListeners()
    
  }


  initListeners() {

    const beforeInput = ie => {
      // maybe, create a separate "blockOrNot" method that is async, then calls the beforeInput. blockOrNot then is
      // the handler because I think we want syncrhronous handling in case afterInput fires. Unless there is a mechanism
      // which blocks afterInput until all listeners are done. I am not sure.
      // ie.preventDefault()
      console.debug(ie)
      // this.editor.
      switch (ie.inputType) {
        case 'insertText': {
          this.editor.write(ie.data); 
          // this.render(); so long as I'm reasonably convinced this works then I'm not going 
          break;
        }
        case 'insertParagraph': {
          // Newline chars will construct paragraphs
          // this.editor.write('\n')
          this.editor.enterNewline();
          ie.preventDefault();
          this.render()
          break
        }
        case 'insertFromPaste': {
          // TODO can also get text/html, which will preserve styling from source. then we can, for example, parse it and keep compatible stylings.
          const data = ie.dataTransfer.getData('text/plain')
          if (data.length > 0)
            this.editor.write(data)
          ie.preventDefault()
          this.render()
          break
        }
        case 'deleteContentBackward': {
          this.editor.backspace(); 
          // WORKAROUND: Firefox bug causes certain input events to fail to fire when delete key is pressed. Described in htmlcontrol.html
          //  the workaround is to render it out of our EditDocument since beforeinput still fires, meaning we do capture and update.
          // However half the point of using contentEditable is because it should handle most of these bits for us. Alas
          // also applies to deleteContentForward
          ie.preventDefault();
          this.render() 
          break;
        }
        case 'deleteContentForward': {
          this.editor.delete();
          ie.preventDefault();
          this.render()
          break;
        }
        // Right now, this is preventing us from de-syncing the state. Long term 
        // we'll probably "flash" the document by having it re-read the DOM. That
        // becomes the next step in the editor history.
        default: ie.preventDefault(); 
      }

      // Debug---- TODO undo this or make it permanent.
      ie.preventDefault()
      this.render()
      //----------

      // Okay- i've just learned the power of pasting formatting. the formatting
      // from vs code comments carried over to the demo page!!
      // can I exploit that, or. At least. Handle it?

    }
    const afterInput = async (afterInput) => {

    }


    // currently, the input is not customizeable. That'll require more thunks
    // I am thinking there will be one interface to handle taking in events
    // and converting them to useful sequences. That can be customized on what
    // gets intercepted. It will handle controlling the inputs to regulate the
    // input. For example a key down event is fired repeatedly when the a key
    // is held, so one step is to fire only once between key ups.
    // The next step is mapping the events to editor actions. That will be the
    // customized part, and can finesse, for example, preventing the default
    // actions of keys (ctrl-l by default sets focus to the URL bar so we can
    // stop that)
    const keyState = {  // booleans indicating whether the key is down or not
      'ctrl-KeyB': false,
      'ctrl-KeyI': false,
      'ctrl-KeyH': false,
      'ctrl-KeyP': false,
      'ctrl-KeyT': false,
      'Tab': false,
      'shift-Tab':  false,
    }

    // Note- I need to fix ctrl-a
    // and, I can fix ctrl-a
    // I can fix it by fixing the selection mechanism to recognize the selection
    // of the entire outer element, and propogate the selection inward...
    // or! I can intercept ctrl-a and re-select the window as a selection of all
    // text. now. The "better" way? would be to fix the selection, ha.
    // ctrl-a is not the only way to induce a selection on the entire node.
    // In fact that might not be as hard as I'm thinking.

    const actionsKeyDown = {
      'ctrl-KeyB': () => { this.editor.toggleBold(); this.render() },
      'ctrl-KeyI': () => { this.editor.toggleItalic(); this.render() },
      'ctrl-KeyH': () => { this.editor.setBlockTag('h2'); this.render() },
      'ctrl-KeyP': () => { this.editor.setBlockTag('p'); this.render() },
      'Tab': () => { this.editor.enterTab(); this.render() },
      'shift-Tab': () => { this.editor.enterShiftTab(); this.render() },
    }

    const actionsKeyUp = {
      'Tab': () => { /* console.log('tab off')  */ }
    }

    const actionsKeyHeldDown = {
      'Tab': () => { this.editor.enterTab(); this.render() },
      'shift-Tab': () => { this.editor.enterShiftTab(); this.render() },
    }

    const isNavKey = (() => {
      const navKeys = new Set([ "Home", "End", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ])
      return key => navKeys.has(key)
    })()

    const keyUp = async (keyEvt) => {
      const statekey = `${keyEvt.ctrlKey ? 'ctrl-' : ''}${keyEvt.shiftKey ? 'shift-' : ''}${keyEvt.code}`
      if (isNavKey(keyEvt.code)) {
        // by the time keyUp presses, the window selection should have also updated
        this.editor.userUpdateSelection()
        return
      }

      if (statekey in keyState) {
        keyEvt.preventDefault()
        if (keyState[statekey]) {
          keyState[statekey] = false // in our interface we'd probably implement the 'check&set' in one operation
          if (statekey in actionsKeyUp) actionsKeyUp[statekey]()
          // console.debug('key up', statekey)
        }
      }
    }
    const keyDown = async (keyEvt) => {
      const statekey = `${keyEvt.ctrlKey ? 'ctrl-' : ''}${keyEvt.shiftKey ? 'shift-' : ''}${keyEvt.code}`
      mouseState.mouseReleased = false
      if ( statekey in keyState ) {
        keyEvt.preventDefault()
        if (!keyState[statekey]) {
          keyState[statekey] = true // in our interface we'd probably implement the 'check&set' in one operation
          if (statekey in actionsKeyDown) actionsKeyDown[statekey]()
          // console.debug('key down',statekey)
        } else {
          if (statekey in actionsKeyHeldDown) actionsKeyHeldDown[statekey]()
        }
      }
    }

    const mouseState = {
      // mouseIsDown: false,
      mouseReleased: false,
    }

    const mouseDown = mouseEvt => mouseEvent(mouseEvt)
    const mouseUp = mouseEvt => { mouseState.mouseReleased = true; mouseEvent(mouseEvt) }
    const mouseEvent = mouseEvt => {
      // console.log("mouse", mouseEvt)
      this.editor.userUpdateSelection()
      // console.log(this.editor.currentDocument.selection())
    }

    this.editor.evtSelChg = async (e) => {
      if (mouseState.mouseReleased) {
        // It's possible this gets trigger if we select some text, release, then use a navigation key. 
        // but in that case it just selects twice, and selection is idempotent. There's no concern
        // on my part if it happens more than once for the "same" input.
        this.editor.userUpdateSelection()
        mouseState.mouseReleased = false
        // console.log("post-up", this.editor.currentDocument.selection())
      }
    }

    this.editor.evtListeners = {
      'keydown': keyDown,
      'keyup': keyUp,
      'beforeinput': beforeInput,
      'input': afterInput,
      'mousedown': mouseDown,
      'mouseup': mouseUp,
      // 'mousemove': mouseMove,
    }

  }

  set defaultRenderer(renderer) {
    renderer.elem = this
    this._renderer = renderer;
  }

  render() {
    if (this._renderer) {
      // vvv closer to what I want me thinks
      // this.editor.currentDocument.render(this._renderer)
      this._renderer.render(this.editor.currentDocument.document)
      this.editor.selectInDOM(this._renderer) // hff not a huge fan of the interface to selecting
    }
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


  get observedAttributes() {
    return [ 'data' ]
  }

  connectedCallback() {
    // console.debug("Editor added to DOM");
    this.init()

    // this.editor.reformat()  // Doesn't update internal state
    this.editor.readDOM()   // Updates internal state - reads the DOM
    this.setAttribute("contentEditable", "true")
    

    document.addEventListener('selectionchange', this.editor.evtSelChg)
    // document.addEventListener('keydown')
    for (const key in this.editor.evtListeners) {
      this.addEventListener(key, this.editor.evtListeners[key])
    }

  }
  disconnectedCallback() {
    
    document.removeEventListener('selectionchange', this.editor.evtSelChg)
    for (const key in this.editor.evtListeners) {
      this.removeEventListener(key, this.editor.evtListeners[key])
    }
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