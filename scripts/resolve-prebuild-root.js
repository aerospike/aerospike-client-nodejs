'use strict'

const fs = require('fs')
const path = require('path')

/**
 * Root directory for platform-keyed native resolution: embedded prebuilds/ in
 * the main package, or an @aerospike/prebuild-{platform}-{arch} optional dep.
 *
 * @param {string} mainPackageRoot absolute path to aerospike package root
 * @returns {string}
 */
function resolvePrebuildRoot (mainPackageRoot) {
  const tag = `${process.platform}-${process.arch}`
  const embedded = path.join(mainPackageRoot, 'prebuilds', tag)
  if (fs.existsSync(embedded)) {
    return mainPackageRoot
  }

  const optionalName = `@aerospike/prebuild-${tag}`
  let dir = mainPackageRoot
  while (true) {
    const optionalRoot = path.join(dir, 'node_modules', optionalName)
    if (fs.existsSync(path.join(optionalRoot, 'package.json'))) {
      return optionalRoot
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  try {
    const pkgJson = require.resolve(`${optionalName}/package.json`, {
      paths: [mainPackageRoot]
    })
    return path.dirname(pkgJson)
  } catch (_) {
    return mainPackageRoot
  }
}

module.exports = { resolvePrebuildRoot }
