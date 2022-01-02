
/**
 * Test a string to see if it is entirely "collapsible" whitespace.
 * Collapsible whitespace is whitespace that, when adjacent to other
 * collapsible whitespace, reduces to one piece of whitespace at 
 * render time.
 * 
 * @param string String to test
 * @returns True if the string consists of 'breaking' spaces
 */
function allCollapsible(string) {

  // string consists of all whitespace that aren't &nbsp;
  // this doesn't work for new lines
  return /^[^\P{White_Space}\u{00A0}]*$/u.test(string)
}

function trimLeading(string) {
  return string.replace(/^[^\P{White_Space}\u{00A0}]+/u, '')
}
function trimTrailing(string) {
  return string.replace(/[^\P{White_Space}\u{00A0}]+$/u, '')
}

function trimBreaking(string) {
  return trimLeading(trimTrailing(string))
}

function collapseBreaking(string) {
  return string.replaceAll(/[^\P{White_Space}\u{00A0}]+/gu, ' ')
}

export class Token {
  static TOKEN_TEXT = 1
  static TOKEN_LINEBREAK = 2
  static TOKEN_BLOCK = 3
  static TOKEN_INLINE = 4

  static whitespace = /[^\P{White_Space}\u{00A0}]+/u

  constructor(type) {
    this.type = type
  }

  get string() {
    return this.text
    // switch (this.type) {
    //   case Token.TOKEN_TEXT: {
    //     // console.debug(this.token)
    //     return trimBreaking(collapseBreaking(this.text))
    //   }
    //   default: return this.text
    // }
  }

  hasTrailingWhitespace() {
    if (this.type === Token.TOKEN_TEXT) {

      return Token.whitespace.test(this.text.at(-1))
    }
    return false
  }
  hasLeadingWhitespace() {
    if (this.type === Token.TOKEN_TEXT) {
      return Token.whitespace.test(this.text.at(0))
    }
    return false
  }

  static tokenText(node, text) {
    const token = new Token(Token.TOKEN_TEXT)
    token.text = text
    token.node = node
    // if (allCollapsible(text)) {
    //   token.text = ""
    // }
    return token
  }

  static tokenLinebreak(node) {
    const token = new Token(Token.TOKEN_LINEBREAK)
    token.node = node
    token.text = "\n"
    return token
  }

  static tokenBlock(node) {
    const token = new Token(Token.TOKEN_BLOCK)
    token.node = node
    token.text = "\n\n"
    return token
  }

  static tokenInline(node) {
    const token = new Token(Token.TOKEN_INLINE)
    token.node = node
    token.text = ""
    return token
  }

  static tokenEmpty(node) {
    const token = new Token(Token.TOKEN_TEXT)
    token.node = node
    token.text = ""
    return token
  }

static tokenize(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return Token.tokenText(node, node.textContent)
  }

  switch (node?.tagName) {
    case 'BR': return Token.tokenLinebreak(node)
    case 'H1':
    case 'H2':
    case 'H3':
    case 'P': {
      // return [Token.tokenBlock(), ...children, Token.tokenBlock()]
      return Token.tokenBlock(node)
    }
    case 'STRONG':
    case 'EM':
    case 'SPAN': {
      return Token.tokenInline(node)
    }
    default: return Token.tokenEmpty(node)
  }
}

static joinTokens(tokenList) {

  // if (tokenList.at(-1).node.nextElementSibling?.tagName === 'BR') {
    // console.debug(tokenList.at(-1).node)
    // tokenList.push(Token.tokenLinebreak(tokenList.at(-1).node.nextElementSibling))
  // }

  let previous = undefined
  const result = []
  for (const token of tokenList) {
    const idx = tokenList.indexOf(token)
    switch (token.type) {
      case Token.TOKEN_LINEBREAK: /*{
        if (previous.type === this.TOKEN_BLOCK && previous.hasTrailingWhitespace()) {
          // result.push(Token.tokenInline())
          token.text="  "
        }
        result.push(token);
        previous = token;
        break;
      }*/
      case Token.TOKEN_TEXT: {
        if (previous) {
          // if (previous.type === Token.TOKEN_INLINE && token.hasLeadingWhitespace()) {
          //   previous.text = " "
          // }

          result.push(token)
          previous = token;
        }

        break;
      }
      case Token.TOKEN_BLOCK: {

        if (!previous) {
          token.text = ""
          result.push(token)
          previous = token

        } else if (previous.type !== Token.TOKEN_BLOCK) {
          result.push(token)
          previous = token
        }

        break;
      }
      // case Token.TOKEN_INLINE: {
      //   if (previous?.type !== Token.TOKEN_INLINE) {
      //     if (previous.hasTrailingWhitespace() && !allCollapsible(previous.text)) {
      //       token.text = " "
      //     }
      //     result.push(token)
      //     previous = token
      //   }

      //   break;
      // }
      default: {}
    }
  }

  return result.map(token => token.string).join('')
}
}