'use strict'
// import crypto from 'crypto';

import { graphql, buildSchema } from 'graphql'

import Dataccess from "./datasystem/Dataccess.mjs"

class Scope {
}

const gql = (fragments, ...values) => {
  let result = fragments[0]
  for (let i = 0; i < values.length; i++) {
    result += `${values[i]}${fragments[i + 1]}`
  }
  return result
}

const schema = buildSchema(gql`
  type RandomDie {
    numSides: Int!
    rollOnce: Int!
    roll(numRolls: Int!): [Int]
  }
  type Mutation {
    setMessage(message: String): String
  }
  type Query {
    hello: String
    quoteOfTheDay: String
    random: Float!
    rollThreeDice: [Int]
    rollDice(numDice: Int!, numSides: Int): [Int]
    getDie(numSides: Int): RandomDie
    getMessage: String
  }
`)

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
  rollDice({ numDice, numSides = 6}) {
    const diceGenerator = function*(max) { 
      while (numDice-- > 0)
        yield 1 + Math.floor(Math.random() * max) 
    }
    return [...diceGenerator(numSides)]
  },
  getDie({ numSides }) {
    return new RandomDie(numSides || 6)
  },
  setMessage({ message }) {
    fakeDB.messageOfTheDay = message
    return fakeDB.messageOfTheDay
  },
  getMessage() {
    return fakeDB.messageOfTheDay
  }
}

// some schema building tech would be nice. Deal with the concept at a higher level than a string
const schema2 = buildSchema(gql`
  # Input types- as opposed to a standard 'type' declared with the 'type' keyword
  input MessageInput {  # Fields of an input type can only be basic Scalar types, list types, and other input types: Not object types. It is a convention to use the Input suffix. It is common to have both a Input and Output type that are slightly different (MessageInput, Message)
    content: String
    author: String
  }
  type Message {
    id: ID!
    content: String
    author: String
  }
  type Query {
    getMessage(id: ID!): Message
  }
  type Mutation {
    createMessage(input: MessageInput): Message
    updateMessage(id: ID!, input: MessageInput): Message
  }
`)

const rootValue2 = {
  getMessage({ id }) {
    if (fakeDB.message[id] === undefined) {
      throw new Error('No message exists with id ' + id)
    }
    return fakeDB.message[id]
  },
  createMessage({ input: { content, author }}) {
    const id = crypto.randomBytes(10).toString('hex')
    fakeDB.message[id] = { id, content, author }
    return fakeDB.message[id]
  },
  updateMessage({ id, input: { content, author }}) {
    if (fakeDB.message[id] === undefined) {
      throw new Error('No message exists with id ' + id)
    }
    // mandates specifying both fields, when if we only want to update the content we would only want to supply the content :thinking:
    // for the "unstructured data" this behavior defers to Datable. There I think it (already) persists existing data if the properties
    // aren't specified as part of the input
    fakeDB.message[id] = { ...fakeDB.message[id], content, author }
    return fakeDB.message[id]
  }
}

// No scoping for the time being. keeping it simple.
export default { schema: schema2, rootValue: rootValue2 }

// export default { schema, rootValue }
