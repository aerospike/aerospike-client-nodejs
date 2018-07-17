const crypto = require('crypto')

exports.identifier = function () {
  return crypto.randomBytes(10).toString('hex')
}

exports.float = function (min, max) {
  return min + Math.random() * (max - min)
}
