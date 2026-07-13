#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const prebuildsDir = path.join(root, 'prebuilds')
const abi = process.versions.modules
const platform = process.platform
const arch = process.arch
const destDir = path.join(prebuildsDir, `${platform}-${arch}`)
const dest = path.join(destDir, `aerospike.${abi}.node`)

function findSource () {
  const releasePath = path.join(root, 'build', 'Release', 'aerospike.node')
  if (fs.existsSync(releasePath)) {
    return releasePath
  }

  const bindingRoot = path.join(root, 'lib', 'binding')
  if (!fs.existsSync(bindingRoot)) {
    return null
  }

  for (const dir of fs.readdirSync(bindingRoot)) {
    const candidate = path.join(bindingRoot, dir, 'aerospike.node')
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const src = findSource()
if (!src) {
  console.error('relocate-prebuilds: no aerospike.node found under build/Release or lib/binding')
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(src, dest)
console.log(`relocate-prebuilds: ${src} -> ${dest}`)
