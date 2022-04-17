import crypto from 'crypto'

class User {
  constructor() {

  }

  static newUser(username, password) {

  }
}

class Login {

  constructor(username, salt, hash) {
    this.username = username
    this.salt = salt
    this.hash = hash
  }

  static newLogin(username, password) {
    const hash = crypto.createHash('sha256')
    const salt = crypto.randomBytes(32)

    hash.update(password)
    hash.update(salt)
    const hashed = hash.digest()

    return new Login(username, salt, hashed)
  }

  checkPassword(password) {
    const hash = crypto.createHash('sha256')
    hash.update(password)
    hash.update(this.salt)

    const candidate = hash.digest()

    return crypto.timingSafeEqual(this.hash, candidate)
  }
}

export { User, Login }