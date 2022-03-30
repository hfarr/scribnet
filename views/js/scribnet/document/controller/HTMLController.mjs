import Controller from "./Controller.mjs";

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

export default class HTMLController extends Controller {

  constructor() {
    super()
    this._initActions()

    // states that transition immediately back to init
  }

  _initActions() {
    configureStartStarSpace(this.sm)
    configureQuestionMark(this.sm)

  }


}