
class Token {

  constructor(type, lexeme, column) {
    this.type = type
    this.lexeme = lexeme
    this.column = column
  }

}




// e.g Doc microlang

/**

  Doc           ->    Context *
  Context       ->    Tag < ( Context | Segment ) * >
  Tag           ->    
  Segment       ->    ' string '
  string        ->    .*                  /*
 
 */


const tokenize = (string, tokenREs) => {
  const tokens = []
  let idx = 0

  while (idx !== string.length) {
    let errorFlag = true

    for (const re of tokenREs) {
      const { 0: match, index, groups } = re.exec(string.slice(idx)) ?? {}
      if (index === 0 && match.length > 0) {

        if (groups !== undefined) {
          const type = Object.getOwnPropertyNames(groups)[0]
          tokens.push(new Token(type, groups[type], idx))
        }
        idx += match.length

        errorFlag = false
        break
      }
    }

    if (errorFlag)
      throw Error("String not accepted by tokens")
  }

  // end of input token
  tokens.push(new Token('EOI', '', string.length))

  return tokens
}


class Parser {

  static tokenREs = []

  constructor(string) {
    this.originalString = string
    this.current = 0
    this.tokens = tokenize(string, this.constructor.tokenREs)
    this.otherInit()
  }

  otherInit() {

  }

  parse() {
    // subclass implementation
    return null
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance()
    this.error(this.peek(), message)
  }
  advance() {
    if (!this.isAtEnd())
      this.current++
    return this.previous()
  }

  check(type) {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }
  isAtEnd() {
    return this.peek().type === 'EOI'
  }

  peek() {
    return this.tokens[this.current]
  }

  previous() {
    return this.tokens[this.current - 1]
  }

  error(token, message) {

    const msg = `Column ${token.column}: ${message}`

    throw Error(msg)
  }

}


class AST {

  constructor() {

  }

}

// ==============



export { Parser }