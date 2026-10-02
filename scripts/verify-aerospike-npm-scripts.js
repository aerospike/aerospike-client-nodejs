#!/usr/bin/env node
'use strict'

/**
 * Assert the published aerospike package.json has no install lifecycle scripts.
 *
 * Do not use `npm view ... scripts.install` as source of truth: npm infers
 * `install: node-gyp rebuild` in the packument when a gypfile is detected
 * (npm#8714), even if package.json itself has no install script.
 *
 * Source of truth is the packed/installed package.json (`gypfile: false`
 * plus no preinstall/install/postinstall).
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const [pkg] = process.argv.slice(2)

if (!pkg) {
  console.error('Usage: node verify-aerospike-npm-scripts.js <package|tarball|dir>')
  process.exit(1)
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function packageJsonFromTarball (tgz) {
  const raw = execFileSync('tar', ['-xOf', tgz, 'package/package.json'], {
    encoding: 'utf8'
  })
  return JSON.parse(raw)
}

function resolvePackageJson (spec) {
  if (spec.endsWith('.tgz') && fs.existsSync(spec)) {
    return packageJsonFromTarball(path.resolve(spec))
  }
  const resolved = path.resolve(spec)
  if (fs.existsSync(resolved)) {
    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      return readJson(path.join(resolved, 'package.json'))
    }
    if (path.basename(resolved) === 'package.json') {
      return readJson(resolved)
    }
  }
  try {
    return readJson(require.resolve(`${spec}/package.json`, { paths: [process.cwd()] }))
  } catch (err) {
    console.error(`Cannot resolve package.json for ${spec}: ${err.message}`)
    process.exit(1)
  }
}

const pkgJson = resolvePackageJson(pkg)
const lifecycleScripts = ['preinstall', 'install', 'postinstall']
for (const name of lifecycleScripts) {
  const value = pkgJson.scripts && pkgJson.scripts[name]
  if (value) {
    console.error(`❌ unexpected ${name} script on published package: ${value}`)
    process.exit(1)
  }
}

if (pkgJson.gypfile !== false) {
  console.error('❌ published package.json must set gypfile: false so npm does not infer install: node-gyp rebuild')
  process.exit(1)
}

console.log('✅ published package.json has no install lifecycle scripts (gypfile: false)')
