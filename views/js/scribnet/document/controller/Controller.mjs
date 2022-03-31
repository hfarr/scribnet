
import { Segment } from '../../section/index.mjs'


/**
 * State table that has a default transition to 'init'
 */
class StateTableDefaults {

  static initialState = 'init'
  constructor() {
    this.transitions = {
      [StateTableDefaults.initialState]: {}
    }

    // action defaults has an effective meaning in the following scenario.
    // we are in a state that has no transition for the action. The action has
    // a default transition. Effectively we first transition to a dummy,
    // intermediate state, which has defined a transition for that action and
    // only that action. so "action defaults" can be thought to mean setting
    // a state that has one transition, which every state transitions TO if
    // they don't define an action, and which immediately forwards the 
    // transition.
    this.actionDefaultTransitions = {}
  }

  transition(state, action) {

    if (this.has(state)) {
      if (action in this.transitions[state]) {
        console.debug(`Transitioning from ${state} via action '${action}' to state ${this.transitions[state][action]}`)
        return this.transitions[state][action]
      } else if (action in this.actionDefaultTransitions) {
        console.debug(`Transitioning from ${state} via action '${action}' to state ${this.actionDefaultTransitions[action]} (default transition for action)`)
        return this.actionDefaultTransitions[action]
      }
    }

    console.debug(`Transitioning from ${state} via action '${action}' to state ${StateTableDefaults.initialState} (default transition)`)
    return StateTableDefaults.initialState
  }

  setTransition(state, action, to) {
    if (this.has(state)) {
      this.transitions[state][action] = to
    } else {
      this.transitions[state] = { [action]: to }
    }
  }

  has(state) {
    return state in this.transitions
  }
}

class StateMachine {

  constructor() {

    this.stateTable = new StateTableDefaults()
    this.currentState = StateTableDefaults.initialState
    this.onTransitionFuncs = {}

  }
  // --- transition states
  transition(action) {
    this.currentState = this.stateTable.transition(this.currentState, action)
    if (this.currentState in this.onTransitionFuncs) {
      this.onTransitionFuncs[this.currentState](this)
    }
  }

  transitionToInit() {
    this.currentState = StateTableDefaults.initialState
  }
  transitionToState(state) {
    if (this.stateTable.has(state)) this.currentState = state
    // else don't do anything
  }
  // ==============
  // - Table API --

  setDefaultActionTransition(action, toState) {
    this.stateTable.actionDefaultTransitions[action] = toState
  }

  setTransitionFromInit(action, toState) {
    this.stateTable.setTransition(StateTableDefaults.initialState, action, toState)
  }
  setTransitionToInit(fromState, action) {
    this.stateTable.setTransition(fromState, action, StateTableDefaults.initialState)
  }

  setTransition(fromState, action, toState) {
    this.stateTable.setTransition(fromState, action, toState)
  }
  setTransitionSelf(fromState, action) {
    this.setTransition(fromState, action, fromState)
  }

  setTransitoryEffect(state, func) {
    // TODO unsure whether I'd prefer to bundle this behavior in onTransition or not.
    // There could be times when onTransition is not Transitory though? so probably not then
    this.onTransition(state, sm => {
      func()
      sm.transition('transitory')
    })
  }

  // =============

  onTransition(toState, sideEffect) {
    this.onTransitionFuncs[toState] = sideEffect
  }

}

class QueryDoc {
  // a collection of functions that, frankly, might be better off in the Context Class suite. Or, at least,
  // only hooking into the APIs of the Context Class suite, rather than digging in to internals (we should
  // not know about _locateBoundaryFullyQualifed for example)
  // A class for programming sinners, then

  static isSelectionAtStartOfBlock(editDocument) {

    const lb = editDocument._startBoundary
    const [ sections, indices, indexInBoundary ] = editDocument.document._pathToLocation(lb)
    // TODO query API for Sections for refined control over searching for blocks. If Contexts weren't nested, and only contained Segments, 
    //  then knowing the structure of that arrangement of Sections is okay, but now knowing the internal structure of Segments introduces
    //  too much complexity to track outside of the Context classes. We could use some more querying capabilities, to answer queries such
    //  as "fetch the last Context in the chain containing the Cursor". It's two parts, the implementation, and the presentation of the
    //  query itself. I.e how would we express that question? a query DSL? I am already planning one of a sort for State Machines.
    //  For now we are tolerating this complexity only in QueryDoc which is necessarily tightly coupled to the Context Classes
    
    const lastIsSection = sections.at(-1) instanceof Segment
    const sectionNotFirst = indices.at(-1) !== 0
    if (lastIsSection && sectionNotFirst) {
      // if this is the case, then indexInBoundary is at the start of the Segment but not the start of the Context
      return false  
    }

    return indexInBoundary === 0
  }

  /**
   * Parse a path to 
   * 
   * @param {String} pathString 
   */
  static _ParsePath(pathString) {

    const blockTags = pathString.split('>').map(str => str.trim()).slice(0, -1)

    return blockTags

  }

  /**
   * Check whether the pathString matches the EditDocument.
   * A path string matches if the path to the current position
   * of the cursor (if collapsed selection) in the editDocument 
   * follows the pattern outlined in the path.
   * The return is the list of matching Contexts (which is empty
   * if the path doesn't match)
   * 
   * @param {String} pathString Path DSL String
   * @param {EditDocument} editDocument Document to match against
   * @param {Int} location 
   */
  static matchPath(pathString, editDocument, location=editDocument._focusBoundary) {
    // right I gotta parse. for now, a lazy parsing.

    const blockTags = this._ParsePath(pathString)
    const doc = editDocument.document
    const path = doc._locateBoundaryFullyQualified(location)

    // naive matching

    for (let i = 0; i < path.length; i++) {
      // const context = path[i]
      const context = doc.sectionAt(path.slice(0, i + 1))
      const contexts = []
      for (let j = 0; i + j < path.length && j < blockTags.length; j++) {
        if (path[i + j] === blockTags[j]) {
          // contexts.push[]
        } else {
          break;
        }
      }
    }
  }
}

export default class Controller {
  constructor() {
    this.sm = new StateMachine()
    this.editDocument = undefined
  }

  selectAction() {

    // check selected ^
    if (QueryDoc.isSelectionAtStartOfBlock(this.editDocument)) {
      this.sm.transition('select ^')
      return
    }

    this.sm.transition('select')
  }

  insertAction(insertedString) {
    this.sm.transition(`insert ${insertedString}`)
  }

  deleteAction(leftBound, rightBound) {
    if (QueryDoc.isSelectionAtStartOfBlock(this.editDocument)) {
      this.sm.transition('delete ^')
      return
    }
    this.sm.transition('delete')
  }

  // ========

  setTransitoryAction(state, func) {
    this.sm.setTransitoryEffect(state, func)
  }

}

export { QueryDoc, StateMachine, StateTableDefaults }
