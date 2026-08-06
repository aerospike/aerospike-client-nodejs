'use strict'

const path = require('path')
const { resolvePrebuildRoot } = require('../scripts/resolve-prebuild-root')

module.exports = require('node-gyp-build')(
  resolvePrebuildRoot(path.join(__dirname, '..'))
)
