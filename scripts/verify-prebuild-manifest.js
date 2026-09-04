#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const abis = ['115', '127', '137', '141']
const platforms = [
  'linux-x64',
  'linux-arm64',
  'darwin-x64',
  'darwin-arm64',
  'win32-x64'
]

let missing = false

function listDir (dir) {
  if (!fs.existsSync(dir)) {
    return '(directory missing)'
  }
  const entries = fs.readdirSync(dir)
  return entries.length ? entries.join(', ') : '(empty)'
}

for (const platform of platforms) {
  const prebuildDir = path.join(root, 'prebuilds', platform)
  for (const abi of abis) {
    const prebuild = path.join(prebuildDir, `node.abi${abi}.node`)
    if (!fs.existsSync(prebuild)) {
      console.error(`missing prebuild: ${prebuild}`)
      console.error(`available in ${prebuildDir}: ${listDir(prebuildDir)}`)
      missing = true
    }
  }

  if (platform === 'win32-x64') {
    const dlls = fs.existsSync(prebuildDir)
      ? fs.readdirSync(prebuildDir).filter((name) => name.toLowerCase().endsWith('.dll'))
      : []
    if (dlls.length === 0) {
      console.error(`missing win32 DLLs in ${prebuildDir}`)
      console.error(`available in ${prebuildDir}: ${listDir(prebuildDir)}`)
      missing = true
    }
  }
}

if (missing) {
  const prebuildsRoot = path.join(root, 'prebuilds')
  console.error(`prebuilds tree under ${prebuildsRoot}:`)
  if (fs.existsSync(prebuildsRoot)) {
    for (const entry of fs.readdirSync(prebuildsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        console.error(`  ${entry.name}/: ${listDir(path.join(prebuildsRoot, entry.name))}`)
      } else {
        console.error(`  ${entry.name}`)
      }
    }
  } else {
    console.error('  (prebuilds directory missing)')
  }
  process.exit(1)
}

console.log('prebuild manifest ok')
