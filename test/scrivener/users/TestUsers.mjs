'use strict'

import assert from 'assert'
import crypto from 'crypto'

import { User, Login } from "../../../scrivener/users/User.mjs"


describe('User', function() {
  describe('User', function () {


  })

  describe('Login', function () {

    it('checks password correctly', function () {

      const randomPassword = crypto.randomUUID()
      const password = 'mysecurepassword'

      const testLogin = Login.newLogin('userperson', password)

      assert(testLogin.checkPassword(password), "Expected password to be accepted")
    })
  })
})
