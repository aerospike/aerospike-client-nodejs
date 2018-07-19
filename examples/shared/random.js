const crypto = require('crypto')

exports.identifier = function () {
  return crypto.randomBytes(10).toString('hex')
}

exports.int = function (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max) + 1 // range inclusive maximum
  return min + Math.floor(Math.random() * (max - min))
}

exports.float = function (min, max) {
  return min + Math.random() * (max - min)
}
