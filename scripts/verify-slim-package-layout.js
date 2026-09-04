#!/usr/bin/env node
'use strict'

/**
 * Verify platform-scoped optional prebuild layout:
 * - main package tarball must not ship prebuilds/
 * - optional package for this platform loads via resolvePrebuildRoot + smoke
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { resolvePrebuildRoot } = require('./resolve-prebuild-root')

const root = path.join(__dirname, '..')
const tag = `${process.platform}-${process.arch}`
const tmp = path.join(root, '.tmp-slim-verify')

function run (cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts })
}

function main () {
  const embedded = path.join(root, 'prebuilds', tag)
  if (!fs.existsSync(embedded)) {
    console.log(`skip slim layout verify: no prebuilds/${tag}`)
    return
  }

  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(tmp, { recursive: true })

  run(`node scripts/ci/split-prebuild-packages.js`, {
    env: { ...process.env, PREBUILD_SPLIT_PLATFORMS: tag }
  })

  const mainTgz = execSync('npm pack --silent', { cwd: root, encoding: 'utf8' }).trim()
  const mainPath = path.join(root, mainTgz)
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
    `npm install --ignore-scripts --no-save file:${mainPath} file:${optPath}`,
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

  const listed = execSync(`tar -tzf ${JSON.stringify(mainPath).slice(1, -1)}`, {
    encoding: 'utf8'
  })
  if (listed.includes('package/prebuilds/')) {
    console.error('slim verify failed: main tarball still contains prebuilds/')
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
