'use strict'

import Dataccess from "./datasystem/Dataccess.mjs"

import { graphql, buildSchema } from 'graphql'


class Scope {
  constructor() {
    this.bin = {}
  }
  get(identifier) {
    return this.bin[identifier]
  }
  set(identifier, value) {
    this.bin[identifier] = value
  }
  get getter() {
    return this.get.bind(this)
  }
  get setter() {
    return this.set.bind(this)
  }

  accept(query) {
    query.visitScope(this)
  }
}

// For scopes- we want the granularity to control the scoping at nested levels. E.g you might be able to access authors["bob"]["published"]
// but not authors["bob"]["salary"]
// to that extent, how might we conceptualize limited access? do we supply a "scope schema"? that's a burden on producers/suppliers.
// Maybe for now.
const nestedAccess = (list, obj) => list.reduce( (prev, current) => { const { [current]: next={} } = prev; return next } , obj)

// For now, control by scope
const scopeWrap = scope => {

  // const get = identifier => scope[identifier]
  // const set = (identifier, value) => scope.identifier = value

  const get = scope.getter
  const set = scope.setter
  

}

const gql = (fragments, ...values) => {
  let result = fragments[0]
  for (let i = 0; i < values.length; i++) {
    result += `${values[i]}${fragments[i + 1]}`
  }
  return buildSchema(result)
}

const schema = gql`
  type Query {
    hello: String
    quoteOfTheDay: String
    random: Float!
    rollThreeDice: [Int]
  }
`

const rootValue = {
  hello() {
    return 'Hello, world! \u{1F310}'
  },
  quoteOfTheDay() {
    return Math.random() < 0.5 ? "No" : "yes"
  },
  random() {
    return Math.random()
  },
  rollThreeDice() {
    return [1, 2, 3].map(_ => 1 + Math.floor(Math.random() * 6))
  }
}

graphql({
  schema, 
  source: '{ hello }', 
  rootValue
}).then( response => console.log(response))

// No scoping for the time being. keeping it simple.
export default { schema, rootValue }
