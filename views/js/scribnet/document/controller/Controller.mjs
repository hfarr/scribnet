
// we'll keep it simple, using just an object for now
// class State {

// }

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

  onTransition(toState, sideEffect) {
    this.onTransitionFuncs[toState] = sideEffect
  }

}

class QueryDoc {

  static isSelectionAtStartOfBlock(editDocument) {

    const lb = editDocument._startBoundary
    // const [ _, indexInBoundary ] = editDocument.document._locateBoundary(lb)
    const [ _, indexInBoundary ] = editDocument.document._locateBoundaryFullyQualified(lb)

    return indexInBoundary === 0

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

  setTransitoryEffect(state, func) {
    this.sm.onTransition(state, sm => {
      func()
      sm.transition('transitory')
    })
  }

}
