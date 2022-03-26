
// we'll keep it simple, using just an object for now
// class State {

// }

/**
 * State table that has a default transition to 'init'
 */
class StateTableDefaults {

  static initialState = Symbol('init')
  constructor() {
    this.transitions = {
      [initialState]: {}
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

    if (state in this.transitions) {
      if (action in this.transitions[state]) {
        return this.transitions[state][action]
      } else if (action in this.actionDefaultTransitions) {
        return this.actionDefaultTransitions[action]
      }
    }

    return initialState
  }

  setTransition(state, action, to) {
    if (state in this.transitions) {
      this.transitions[state][action] = to
    } else {
      this.transitions[state] = { [action]: to }
    }
  }
}

class StateMachine {

  constructor() {

    this.stateTable = new StateTableDefaults()
    this.currentState = this.stateTable.initialState
    this.onTransition = {}

  }
  // --- transition states
  transition(action) {
    this.currentState = this.stateTable.transition(this.currentState, action)
    if (this.currentState in this.onTransition) {
      this.onTransition[this.currentState](this)
    }
  }

  //---- modify table

  setTransitionFromInit(action, toState) {
    this.stateTable.setTransition(StateTableDefaults.initialState, action, toState)
  }

  setTransition(fromState, action, toState) {
    this.stateTable.setTransition(fromState, action, toState)
  }

  onTransition(toState, sideEffect) {
    this.onTransition[toState] = sideEffect
  }
}

export default class Controller {
  constructor() {
    this.sm = new StateMachine()
    this.editDocument = undefined
  }

  selectAction() {

  }

  insertAction(insertedString, lef) {
    this.sm.transition(`insert ${insertedString}`)
  }

  deleteAction(leftBound, rightBound) {
    
  }

}
