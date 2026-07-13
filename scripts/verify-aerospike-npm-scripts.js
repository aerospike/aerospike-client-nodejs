#!/usr/bin/env node
const { execSync } = require('child_process')

const [pkg] = process.argv.slice(2)

if (!pkg) {
  console.error('Usage: node verify-aerospike-npm-scripts.js <package>')
  process.exit(1)
}

function readScript (name) {
  try {
    return execSync(`npm view ${pkg} scripts.${name}`, { encoding: 'utf8' }).trim()
  } catch (err) {
    if (String(err.message).includes('Scripts')) {
      return ''
    }
    throw err
  }
}

const lifecycleScripts = ['preinstall', 'install', 'postinstall']
for (const name of lifecycleScripts) {
  const value = readScript(name)
  if (value !== '') {
    console.error(`❌ unexpected ${name} script on published package: ${value}`)
    process.exit(1)
  }
}

console.log('✅ published package has no install lifecycle scripts')
