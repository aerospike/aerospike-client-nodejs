'use strict'

const fs = require('fs')
const path = require('path')

/**
 * Root directory passed to node-gyp-build: embedded prebuilds/ in the main
 * package, or an @aerospike/prebuild-{platform}-{arch} optional dependency.
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
