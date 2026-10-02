#!/usr/bin/env node
'use strict'

/**
 * Keep package-lock.json optional @aerospike/prebuild-* stubs in sync with
 * package.json optionalDependencies (version + optional: true).
 *
 * Does not invent resolved/integrity; extra fields already present are kept.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const pkgPath = path.join(root, 'package.json')
const lockPath = path.join(root, 'package-lock.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
const optional = pkg.optionalDependencies || {}

if (!lock.packages || typeof lock.packages !== 'object') {
  console.error('sync-prebuild-lock-stubs: package-lock.json has no packages map')
  process.exit(1)
}

function insertPackage (packages, key, entry) {
  if (Object.prototype.hasOwnProperty.call(packages, key)) {
    packages[key] = entry
    return packages
  }
  const next = {}
  let inserted = false
  for (const k of Object.keys(packages)) {
    if (!inserted && k > key) {
      next[key] = entry
      inserted = true
    }
    next[k] = packages[k]
  }
  if (!inserted) next[key] = entry
  return next
}

let count = 0
for (const name of Object.keys(optional)) {
  if (!name.startsWith('@aerospike/prebuild-')) continue
  const version = optional[name]
  const key = `node_modules/${name}`
  const existing = lock.packages[key] || {}
  const { version: _version, optional: _optional, ...rest } = existing
  lock.packages = insertPackage(lock.packages, key, {
    version,
    ...rest,
    optional: true
  })
  count++
}

if (count === 0) {
  console.error('sync-prebuild-lock-stubs: no @aerospike/prebuild-* optionalDependencies')
  process.exit(1)
}

fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
console.log(`sync-prebuild-lock-stubs: updated ${count} stub(s)`)
