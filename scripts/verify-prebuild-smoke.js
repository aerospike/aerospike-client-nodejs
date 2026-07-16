#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const pkgRoot = path.join(__dirname, '..')
const abi = process.versions.modules
const prebuildDir = path.join(
  pkgRoot,
  'prebuilds',
  `${process.platform}-${process.arch}`
)
const prebuild = path.join(prebuildDir, `node.abi${abi}.node`)

if (!fs.existsSync(prebuild)) {
  console.error(`missing prebuild: ${prebuild}`)
  if (fs.existsSync(prebuildDir)) {
    console.error('available:', fs.readdirSync(prebuildDir).join(', '))
  } else {
    console.error(`missing directory: ${prebuildDir}`)
  }
  process.exit(1)
}

if (process.platform === 'win32') {
  const dlls = fs.readdirSync(prebuildDir).filter((name) => name.toLowerCase().endsWith('.dll'))
  if (dlls.length === 0) {
    console.error(`win32 prebuild dir has no DLLs next to ${path.basename(prebuild)}`)
    process.exit(1)
  }
}

require(path.join(pkgRoot, 'lib', 'aerospike.js'))
console.log('ok')
