#!/usr/bin/env node
'use strict'

/**
 * Split merged CI prebuilds/ into per-platform optional npm packages under
 * packages/prebuild-{platform}-{arch}/.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const platforms = require('../prebuild-platforms.json')
const version = require('../../package.json').version

const srcRoot = path.join(root, 'prebuilds')
const tags = process.env.PREBUILD_SPLIT_PLATFORMS
  ? process.env.PREBUILD_SPLIT_PLATFORMS.split(',').map((s) => s.trim()).filter(Boolean)
  : platforms

if (!fs.existsSync(srcRoot)) {
  console.error('split-prebuild-packages: missing prebuilds/ at repo root')
  process.exit(1)
}

for (const tag of tags) {
  const srcDir = path.join(srcRoot, tag)
  if (!fs.existsSync(srcDir)) {
    console.error(`split-prebuild-packages: missing ${srcDir}`)
    process.exit(1)
  }

  const pkgRoot = path.join(root, 'packages', `prebuild-${tag}`)
  const destDir = path.join(pkgRoot, 'prebuilds', tag)
  fs.rmSync(pkgRoot, { recursive: true, force: true })
  fs.mkdirSync(destDir, { recursive: true })

  for (const name of fs.readdirSync(srcDir)) {
    fs.cpSync(path.join(srcDir, name), path.join(destDir, name), { recursive: true })
  }

  for (const name of fs.readdirSync(destDir)) {
    const m = name.match(/^aerospike\.(\d+)\.node$/)
    if (!m) continue
    const linkName = `node.abi${m[1]}.node`
    const linkPath = path.join(destDir, linkName)
    if (!fs.existsSync(linkPath)) {
      fs.symlinkSync(name, linkPath)
    }
  }

  const [osName, ...cpuParts] = tag.split('-')
  const cpu = cpuParts.join('-')
  const pkg = {
    name: `@aerospike/prebuild-${tag}`,
    version,
    description: `Aerospike Node native prebuilds for ${tag}`,
    license: 'Apache-2.0',
    os: [osName],
    cpu: [cpu],
    files: ['prebuilds/']
  }
  fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
  console.log(`split-prebuild-packages: ${tag} -> ${pkgRoot}`)
}

console.log('split-prebuild-packages: ok')
