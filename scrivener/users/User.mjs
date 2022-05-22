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

  // constructor(username, password) {
  //   this.username = username
  //   this.password = password
  // }

  static newLogin(username, password) {
    const hash = crypto.createHash('sha256')
    const salt = crypto.randomBytes(32)

    hash.update(password)
    hash.update(salt)
    const hashed = hash.digest()

    return new Login(username, salt, hashed)
  }

  set password(password) {
    if (this.username === null) {
      return
    }

    const hash = crypto.createHash('sha256')
    const salt = crypto.randomBytes(32)

    hash.update(password)
    hash.update(salt)
    const hashed = hash.digest()

    this.salt = salt;
    this.hash = hashed;

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