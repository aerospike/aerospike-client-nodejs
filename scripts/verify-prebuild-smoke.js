#!/usr/bin/env node
'use strict'

if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE
}

const fs = require('fs')
const path = require('path')
const { resolveNativeBinding } = require('./resolve-native-binding')

const pkgRoot = path.join(__dirname, '..')
let prebuild
try {
  prebuild = resolveNativeBinding(pkgRoot)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

if (process.platform === 'win32') {
  const prebuildDir = path.dirname(prebuild)
  const dlls = fs.readdirSync(prebuildDir).filter((name) => name.toLowerCase().endsWith('.dll'))
  if (dlls.length === 0) {
    console.error(`win32 prebuild dir has no DLLs next to ${path.basename(prebuild)}`)
    process.exit(1)
  }
}

require(path.join(pkgRoot, 'lib', 'aerospike.js'))
console.log('ok')
