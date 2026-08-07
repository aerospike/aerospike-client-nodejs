'use strict'

const fs = require('fs')
const path = require('path')
const { resolvePrebuildRoot } = require('./resolve-prebuild-root')

/**
 * Resolve the native addon path for this process (platform-keyed resolution).
 *
 * Order:
 * 1. prebuilds/{platform}-{arch}/node.abi*.node in main or optional package
 * 2. build/Release/aerospike.node (local npm run build)
 * 3. lib/binding/.../aerospike.node (legacy dev layout)
 *
 * @param {string} mainPackageRoot absolute path to aerospike package root
 * @returns {string}
 */
function resolveNativeBinding (mainPackageRoot) {
  const tag = `${process.platform}-${process.arch}`
  const abi = process.versions.modules
  const prebuildRoot = resolvePrebuildRoot(mainPackageRoot)
  const prebuildDir = path.join(prebuildRoot, 'prebuilds', tag)
  const candidates = [
    path.join(prebuildDir, `node.abi${abi}.node`),
    path.join(prebuildDir, `aerospike.${abi}.node`)
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  const releasePath = path.join(mainPackageRoot, 'build', 'Release', 'aerospike.node')
  if (fs.existsSync(releasePath)) {
    return releasePath
  }

  const bindingRoot = path.join(mainPackageRoot, 'lib', 'binding')
  if (fs.existsSync(bindingRoot)) {
    for (const dir of fs.readdirSync(bindingRoot)) {
      const candidate = path.join(bindingRoot, dir, 'aerospike.node')
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }

  const tried = [
    ...candidates,
    releasePath,
    path.join(bindingRoot, '*', 'aerospike.node')
  ]
  throw new Error(
    `aerospike: no native prebuild for ${tag} (Node ABI ${abi}). Tried:\n` +
    tried.map((p) => `  ${p}`).join('\n')
  )
}

module.exports = { resolveNativeBinding }
