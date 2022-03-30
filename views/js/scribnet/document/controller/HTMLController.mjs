import Controller, { QueryDoc } from "./Controller.mjs";

function configureStartStarSpace(sm) {

  sm.setTransitionFromInit('select ^', '^|')
  sm.setTransitionFromInit('delete ^', '^|')
  sm.setTransition('^|', 'insert *', '^*|')
  sm.setTransitionSelf('^|', 'select ^')
  sm.setTransition('^*|', 'insert  ', '^* |')
  sm.setTransition('^* |', 'transitory', '^|')
  // sm.onTransition('^* |', sm => {
  //   console.log('Start, star, space!')
  //   sm.transitionToInit()
  // })
}

function configureQuestionMark(sm) {
  // sm.setTransitionFromInit('select ^', '^|')
  // sm.setTransitionFromInit('delete ^', '^|')
  sm.setDefaultActionTransition('insert (', '(|')
  sm.setTransition('(|', 'insert ?', '(?|')
  sm.setTransition('(?|', 'insert )', '(?)|')
  // sm.setTransitionToInit('(?)|', 'transitory') // since the default transition is "to" init we don't need to explicitly register a transition

  // sm like "sm.init.insert('(').insert('?').insert(')').to('(?)')"
  // or sm.init.insert('(?)') as an abbreviation, but still same deal: inserting state after state

  // as well, automatically configuring "context" selection
  // sm.default.select('(|')       same as "default select, if left char is (, transition to (| state"
  // sm.default.select('(?')
  // sm.default.select('(?)')
  // sm.default.select('^|')        note above in startStarSpace. ^ takes the place of "beginning of Context".
  //        pipes meaning where the cursor is in relation to the rest of the line. It's a "state machine" language that expands on regular expressions (another statemachine language if you think about it)

}

function configureEnterNewLine(sm) {
  // const sm = this.sm

  //                    ContextMultiplex (or demux really? call it a Muldem)
  // * :enterNewLine -> ContextSwitch :transitory 
  //                                              -> '*> ^|' (the "start of any context")
  //                                              -> 'li> *> ^|' (the "start of any context nested directly under an li")
  //                                              for disambiguation purposes we need to decide whether 'li> *>' means "find the first li, then the immedaite context" or 
  //                                              "scan for the all li, select the last applicable one" or something to that effect. Moreover we might want a notion of
  //                                              acting on the "path" which we presently don't support. It's in a sense another input to the query.
  //                                              NB we could also change the language to disambiguate. Here I think it's pretty clear, it seeks a pattern matching 
  //                                              contexts based on where the cursor is. It cannot mean "first li, then the immediate next context" if that immediate 
  //                                              next context doesn't contain the "cursor".
  /* 
    Now, a third pickle. The state we transition to. It's effect is to transition to another state, in that way it's like a "state switch".
    That's cool and fine, it lets us incorporate the idea of "conditional transitions" but instead of having a conditional transition on
    every state that supports that transition, they all instead transition unconditionally to a "state switch" that has the transitional
    logic. Literally a "switch statement" in some cases, more generally, pattern matching. It's job is to take the possible transitions out
    (which are specified in a query-like DSL, part of the broader SMDSL) and "match" to the correct one.
    Most cases this is great. Ideally we have a disambiguating requirement, note that giving this flexibility to the user (the programmer
    in thie case but potentially an app user) can lead to a confusing situation where a state switch has two valid transitions.
    A regex never has two valid transitions, it either has exactly 1 or it doesn't accept the string. I don't think we can force something
    similar if we open the door to n-order logic.
    I think we can accept that price for now, and revisit it later
  */

  sm.setDefaultActionTransition('enterNewLine', 'ContextSwitch')  // I'd like to come up with a better token scheme for specialty purpose states like Switches
  sm.setTransitoryEffect('ContextSwitch', () => {

    // QueryDoc.

  })
}

export default class HTMLController extends Controller {

  constructor() {
    super()
    this._initActions()

    // states that transition immediately back to init
  }

  _initActions() {
    configureStartStarSpace(this.sm)
    configureQuestionMark(this.sm)

    // configureEnterNewLine(this.sm)
    // configureTabbing(this.sm)

  }


}