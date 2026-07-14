#!/usr/bin/env node
'use strict'

const { execSync } = require('child_process')
const { version } = require('../package.json')

execSync(`node-gyp rebuild --addon_version=${version}`, { stdio: 'inherit' })
execSync('node scripts/relocate-prebuilds.js', { stdio: 'inherit' })
