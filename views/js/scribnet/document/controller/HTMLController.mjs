import Controller from "./Controller.mjs";

export default class HTMLController extends Controller {

  constructor() {
    super()
    this._initActions()
  }

  _initActions() {

    this.sm.setTransitionFromInit('select ^', '^|')
    this.sm.setTransition('^|', 'insert *', '^*|')
    this.sm.setTransition('^*|', 'insert  ', '^* |')
    this.sm.onTransition('^* |', sm => {
      console.log('Start, star, space!')
      sm.transitionToInit()
    })


  }

}