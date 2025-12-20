#!/usr/bin/env node
const { execSync } = require('child_process')

const [pkg] = process.argv.slice(2)

if (!pkg) {
  console.error('Usage: node check-npm-script.js <package> ')
  process.exit(1)
}

let preInstallScript = null
let installScript = null
let postInstallScript = null

try {
  preInstallScript = execSync(`npm view ${pkg} scripts.preinstall`, { encoding: 'utf8' }).trim()
  installScript = execSync(`npm view ${pkg} scripts.install`, { encoding: 'utf8' }).trim()
  postInstallScript = execSync(`npm view ${pkg} scripts.postinstall`, { encoding: 'utf8' }).trim()
  console.log(postInstallScript)
} catch (err) {
  console.error(`Failed to fetch scripts for ${pkg}:`, err.message)
  process.exit(1)
}

if (preInstallScript !== '') {
  console.log(preInstallScript)
  console.error('❌ preinstall script does not match expected value')
  process.exit(1)
}

if (installScript !== 'npm-run-all removeExtraBinaries build') {
  console.error('❌ install script does not match expected value')
  process.exit(1)
}

if (postInstallScript !== '') {
  console.error('❌ postinstall script does not match expected value')
  process.exit(1)
}

console.log('✅ install scripts match expected value')
