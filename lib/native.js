'use strict'

const path = require('path')
const { resolveNativeBinding } = require('../scripts/resolve-native-binding')

module.exports = require(
  resolveNativeBinding(path.join(__dirname, '..'))
)
