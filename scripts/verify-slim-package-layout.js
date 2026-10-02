#!/usr/bin/env node
'use strict'

/**
 * Verify platform-scoped optional prebuild layout:
 * - main package tarball must not ship prebuilds/ or binding.gyp
 * - packed package.json has gypfile: false and no install lifecycle scripts
 * - optional package for this platform loads via resolvePrebuildRoot + smoke
 */
const fs = require('fs')
const path = require('path')
const { execFileSync, execSync } = require('child_process')
const { resolvePrebuildRoot } = require('./resolve-prebuild-root')

const root = path.join(__dirname, '..')
const tag = `${process.platform}-${process.arch}`
const tmp = path.join(root, '.tmp-slim-verify')

function run (cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts })
}

function packMain () {
  const mainTgz = execSync('npm pack --silent', { cwd: root, encoding: 'utf8' }).trim()
  return path.join(root, mainTgz)
}

function assertPackedMainTarball (mainPath) {
  const listed = execFileSync('tar', ['-tzf', mainPath], { encoding: 'utf8' })
  const entries = listed.split(/\r?\n/)

  if (listed.includes('package/prebuilds/')) {
    console.error('slim verify failed: main tarball still contains prebuilds/')
    process.exit(1)
  }
  if (entries.includes('package/binding.gyp')) {
    console.error('slim verify failed: main tarball contains package/binding.gyp')
    process.exit(1)
  }

  const packedPkg = JSON.parse(
    execFileSync('tar', ['-xOf', mainPath, 'package/package.json'], { encoding: 'utf8' })
  )
  if (packedPkg.gypfile !== false) {
    console.error('slim verify failed: packed package.json must set gypfile: false')
    process.exit(1)
  }
  for (const name of ['preinstall', 'install', 'postinstall']) {
    if (packedPkg.scripts && packedPkg.scripts[name]) {
      console.error(`slim verify failed: packed package.json has ${name} script: ${packedPkg.scripts[name]}`)
      process.exit(1)
    }
  }
  const optional = packedPkg.optionalDependencies || {}
  const prebuildDeps = Object.keys(optional).filter((name) => name.startsWith('@aerospike/prebuild-'))
  if (prebuildDeps.length === 0) {
    console.error('slim verify failed: packed package.json missing @aerospike/prebuild-* optionalDependencies')
    process.exit(1)
  }
}

function main () {
  const mainPath = packMain()
  try {
    assertPackedMainTarball(mainPath)
  } catch (err) {
    try { fs.unlinkSync(mainPath) } catch (_) {}
    throw err
  }

  const embedded = path.join(root, 'prebuilds', tag)
  if (!fs.existsSync(embedded)) {
    fs.unlinkSync(mainPath)
    console.log(`verify-slim-package-layout: tarball layout ok; skip install/smoke (no prebuilds/${tag})`)
    return
  }

  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp, { recursive: true })

  run(`node scripts/ci/split-prebuild-packages.js`, {
    env: { ...process.env, PREBUILD_SPLIT_PLATFORMS: tag }
  })

  const optPath = path.join(
    root,
    'packages',
    `prebuild-${tag}`,
    execSync('npm pack --silent', {
      cwd: path.join(root, 'packages', `prebuild-${tag}`),
      encoding: 'utf8'
    }).trim()
  )

  const installDir = path.join(tmp, 'install')
  fs.mkdirSync(installDir, { recursive: true })
  fs.writeFileSync(
    path.join(installDir, 'package.json'),
    JSON.stringify({ name: 'slim-verify', private: true }, null, 2)
  )

  run(
    `npm install --no-save file:${mainPath} file:${optPath}`,
    { cwd: installDir }
  )

  const mainRoot = path.join(installDir, 'node_modules', 'aerospike')
  const resolved = resolvePrebuildRoot(mainRoot)
  const prebuildDir = path.join(resolved, 'prebuilds', tag)
  if (!fs.existsSync(prebuildDir)) {
    console.error('slim verify failed: prebuild dir missing at', prebuildDir)
    process.exit(1)
  }

  const entries = fs.readdirSync(prebuildDir)
  if (!entries.some((n) => n.endsWith('.node'))) {
    console.error('slim verify failed: no .node in', prebuildDir)
    process.exit(1)
  }

  process.env.ELECTRON_RUN_AS_NODE = ''
  run(`node scripts/verify-prebuild-smoke.js`, {
    cwd: mainRoot,
    env: { ...process.env, NODE_PATH: path.join(installDir, 'node_modules') }
  })

  fs.rmSync(tmp, { recursive: true, force: true })
  fs.unlinkSync(mainPath)
  fs.unlinkSync(optPath)
  console.log('verify-slim-package-layout: ok for', tag)
}

main()
