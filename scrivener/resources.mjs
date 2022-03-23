'use strict'
// import crypto from 'crypto';

import { graphql, buildSchema, execute } from 'graphql'

import Dataccess from "./datasystem/Dataccess.mjs"
import Note from './notes/Note.mjs'

class Scope {
}

class SchemaConstructor {
  constructor() { // a Dataccess
    // this.schematics = []
    this.types = []
    this.funcs = {}
    this.queries = []
    this.mutations = []
  }

  set(unstructList) {
    unstructList.forEach(item => this.register(item))
    return this
  }

  register(schematic) {
    // this.schematics.push(schematic)
    const { types, funcs, queries, mutations } = schematic
    this.types.push(...types)
    this.queries.push(...queries)
    this.mutations.push(...mutations)
    this.funcs = { ...this.funcs, ...funcs }
  }

  fmtTypes() {
    return this.types.join('')
  }
  fmtQueries() {
    return this.queries.join('\n')
  }
  fmtMutations() {
    return this.mutations.join('\n')
  }
  rootObj() {
    return this.funcs
  }

}

// since this... it's expected that "dataccess" implements indexing.
// right now the coupling is pretty tight. The ask- should we move
// the 'typing' information, including the index field, etc.- here
// as well?
// that would more heavily declare the use of dataccess. then the
// destructuring would happen here too.
// eh. I'm too tired with the internals, not enough knowin how well
// the system supports my usecase- since i'm not using it!

// maybe instead of taking "dataccess" it should take in "index" or,
// rather, we'll have an 'Index' class implement DataInterface 
// rather than the entirety of Dataccess
const DataInterface = dataccess => (constructorFunc, indexField) => {
  // const bind = fname => dataccess[fname].bind(dataccess, constructorFunc)
  const typeName = constructorFunc.name
  // const deserialize = ({ [indexField]: indexKey, data }) => ;
  const serialize = instance => ({ [indexField]: instance[indexField], data: JSON.stringify(instance) })
  return {
    [`create${typeName}`]: async function ({ input }) {
      if (process.env.DEVELOPMENT === 'true') console.log(`create${typeName}`, input)
      try {
        const data = JSON.parse(input.data)
        const instance = await dataccess.create(constructorFunc, data)
        return serialize(instance)
      } catch (err) {
        console.log(err)
        throw new Error("Can't parse json")
      }
    },
    [`get${typeName}`]: async function ({ [`${indexField}`]: val }) {
      if (process.env.DEVELOPMENT === 'true') console.log(`get${typeName}`, val)
      const instance = await dataccess.get(constructorFunc, val)
      if (instance === undefined) throw new Error(`Instance of ${constructorFunc.name} not found`)
      return serialize(instance)
    },
    [`update${typeName}`]: async function ({ [`${indexField}`]: val, input }) {
      if (process.env.DEVELOPMENT === 'true') console.log(`update${typeName}`, val, input.data)
      // const data = JSON.parse(input)
      // const instance = dataccess.update(constructorFunc, val, data)
      const data = JSON.parse(input.data)
      const instance = await dataccess.update(constructorFunc, val, data)
      if (instance === undefined) throw new Error(`Instance of ${constructorFunc.name} not found`)
      return serialize(instance)
    },
  }
}

class Unstructured {
  // Must be Datable
  // constructor(interfaceTemplate) {
  constructor(dataccess) {
    this.dataTemplate = DataInterface(dataccess)
    this.dataccess = dataccess
    this.getters = {}
    this.unstructures = []
  }

  get list() {
    return this.unstructures
  }
  getter(constructorFunc) {
    return this.getters[constructorFunc.name]
  }

  of(constructorFunc, indexField, indexType) {
    const typeName = constructorFunc.name
    const indexTypeName = indexType.name

    // this.dataccess.registerWithIndex(constructorFunc, indexField, indexType)  // mmm
    this.dataccess.register(constructorFunc)
    this.dataccess.setIndex(constructorFunc, indexField, indexType)

    // Under the layers we have an opaque ID system. Clients don't know about it.
    // The index field will map to an ID in a given context (scope)~~ or roughly this idea.
    // I am lost in my reasoning about where responsibilities fall, again, and have, again,
    // resorted to writing overlong comments. At the moment it's the query capabilities. In
    // the interest of delivering *something*, a vertical slice if I will, I'm going with
    // a basic model for declaring an index. The index will internally map to IDs and...
    // likely I'll use some pretty inefficient operations for accessing. Such as keeping
    // all data in memory :S
    // A Q: where would the querying be specified? At the moment I'm thinking when the 
    // Dataccess is specified... it may not know the particulars of how queries specify the
    // interface of using a type and its index, so the responsibility of, e.g, creating the
    // GQL schemas would still fall outside. hum
    // even now... index tracking, load that onto a Datable? or Dataccess, which has the
    // correct "context"? What does that mean exactly to have the right context?
    const funcs = this.dataTemplate(constructorFunc, indexField)
    this.unstructures.push({
      types: [
        gql`
          input ${typeName}Input {
            data: String
          }`,
        gql`
          type ${typeName} {
            ${indexField}: ${indexTypeName}
            data: String
          }`
      ],
      queries: [
        gql`get${typeName}(${indexField}: ${indexTypeName}): ${typeName}`
      ],
      mutations: [
        gql`create${typeName}(input: ${typeName}Input): ${typeName}`,
        gql`update${typeName}(${indexField}: ${indexTypeName}, input: ${typeName}Input): ${typeName}`
      ],
      funcs: funcs
    })
    this.getters[typeName] = indexKey => funcs[`get${typeName}`]({ [indexField]: indexKey })
  }
}

// const promises = list => Promise.all(list.map(i => Promise.resolve(i)))
// const promises = list => Promise.all([ Promise.resolve(list[0]), list[1]])

// TODO This is more like a "Global Aggregator" as it aggregates all Datables. This is an implicit behavior because it offloads the work to Dataccess, which has global access to data.
// TODO We will support arbitrary aggregators so items can group other items on a smaller scale. The principle is close to the principle of scopes.
class Aggregate {
  constructor(dataccess) {
    this.dataccess = dataccess
    this.unstructures = []
  }
  get list() {
    return this.unstructures
  }
  pushup(query, funcObj) {
    this.unstructures.push({
      types: [],
      queries: [query],
      mutations: [],
      funcs: funcObj
    })
  }
  of(constructorFunc, plural, getter/*, indexType*/) {
    // const query = gql`${plural}: [${indexType.name}]`
    const query = gql`${plural}: [${constructorFunc.name}]!`
    const numericGet = gql`${plural}Get(index: Int): ${constructorFunc.name}`
    // const func = { [plural]: async () => Promise.all(dataccess.getIndexList(constructorFunc).map(name => dataccess.get(constructorFunc,name).then(inst => ({name, data: JSON.stringify(inst)})))) } //promises({name, dataccess.get(constructorFunc, name)]))) }
    // const func = { [plural]: async () => dataccess.getIndexList(constructorFunc).map(async name=> ({name, data: JSON.stringify(await dataccess.get(constructorFunc, name))})) }
    const func = { [plural]: async () => Promise.all(dataccess.getIndexList(constructorFunc).map(getter)) }
    const funcGet = { [`${plural}Get`]: async ({ index }) => getter(dataccess.getIndexList(constructorFunc).at(index)) } // TODO I need an interface for aggregating data in Dataccess
    this.pushup(query, func)
    this.pushup(numericGet, funcGet)
  }
}


const gql = (fragments, ...values) => {
  let result = fragments[0]
  for (let i = 0; i < values.length; i++) {
    result += `${values[i]}${fragments[i + 1]}`
  }
  return result
}

const DATA_FOLDER = "data-folder"
const DATA_DB_FILE = `${DATA_FOLDER}/dbfile`
const dataccess = await Dataccess.initFromFile(DATA_DB_FILE)

const unstruct = new Unstructured(dataccess)
const aggregate = new Aggregate(dataccess)
unstruct.of(Note, "name", String)
aggregate.of(Note, 'notes', unstruct.getter(Note))

const sc = new SchemaConstructor()
sc.set(unstruct.list)
  .set(aggregate.list)

// const extraQueries = [
//   gql`notes: [Note]`
// ]

const schemaStr = gql`
  ${sc.fmtTypes()}
  type Mutation {
    ${sc.fmtMutations()}
  }
  type Query {
    ${sc.fmtQueries()}
  }`

const root = {
  ...sc.rootObj(),
  // notes() { dataccess.getIndexList(Note) }
}
const schema = buildSchema(schemaStr)




function authenticatePreStep(execArgs) {

  if (process.env.DEVELOPMENT === 'true') {
    // console.log('GQL Execuction args:', execArgs)
    // console.log('Authenticated user:', execArgs.contextValue.user)

    const isAdmin = execArgs.contextValue.user?.admin ?? false
    console.log("Is admin request:", isAdmin)
    // if (isAdmin) console.log("Admin request")
  }

  return execute(execArgs)
}

/*
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
  rollDice({ numDice, numSides = 6 }) {
    const diceGenerator = function* (max) {
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
  createMessage({ input: { content, author } }) {
    const id = crypto.randomBytes(10).toString('hex')
    fakeDB.message[id] = { id, content, author }
    return fakeDB.message[id]
  },
  updateMessage({ id, input: { content, author } }) {
    if (fakeDB.message[id] === undefined) {
      throw new Error('No message exists with id ' + id)
    }
    // mandates specifying both fields, when if we only want to update the content we would only want to supply the content :thinking:
    // for the "unstructured data" this behavior defers to Datable. There I think it (already) persists existing data if the properties
    // aren't specified as part of the input
    fakeDB.message[id] = { ...fakeDB.message[id], content, author }
    return fakeDB.message[id]
  }
}*/

// No scoping for the time being. keeping it simple.
// export default { schema: schema2, rootValue: rootValue2 }

// export default { schema, rootValue }

const graphqlHTTPOptions = { schema: schema, rootValue: root, customExecuteFn: authenticatePreStep }

export default graphqlHTTPOptions
