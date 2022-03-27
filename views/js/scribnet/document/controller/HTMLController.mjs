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

export default class HTMLController extends Controller {

  constructor() {
    super()
    this._initActions()

    // states that transition immediately back to init
  }

  _initActions() {
    configureStartStarSpace(this.sm)

  }

  setTransitoryEffect(state, func) {
    this.sm.onTransition(state, sm => {
      func()
      sm.transitionToInit()
    })
  }

}