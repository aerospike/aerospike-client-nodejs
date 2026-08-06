#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { resolvePrebuildRoot } = require('./resolve-prebuild-root')

const pkgRoot = path.join(__dirname, '..')
const prebuildRoot = resolvePrebuildRoot(pkgRoot)
const abi = process.versions.modules
const prebuildDir = path.join(
  prebuildRoot,
  'prebuilds',
  `${process.platform}-${process.arch}`
)
const abiTag = `node.abi${abi}.node`
const legacyTag = `aerospike.${abi}.node`
const prebuild = [abiTag, legacyTag]
  .map((name) => path.join(prebuildDir, name))
  .find((p) => fs.existsSync(p))

if (!prebuild) {
  console.error(`missing prebuild: ${path.join(prebuildDir, abiTag)}`)
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
