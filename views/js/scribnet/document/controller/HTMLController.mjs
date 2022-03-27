import Controller from "./Controller.mjs";

function configureStartStarSpace(sm) {

  sm.setTransitionFromInit('select ^', '^|')
  sm.setTransitionFromInit('delete ^', '^|')
  sm.setTransition('^|', 'insert *', '^*|')
  sm.setTransitionSelf('^|', 'select ^')
  sm.setTransition('^*|', 'insert  ', '^* |')
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

  setTransitoryEffect(state, func) {
    this.sm.onTransition(state, sm => {
      func()
      sm.transitionToInit()
    })
  }

}