const fs = require('fs')

// Path to package.json
const packageJsonPath = './package.json'

// Read and parse package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// Update the install script
packageJson.scripts.install = 'npm-run-all removeExtraBinaries build'

// Write the updated package.json back
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')

console.log('Updated the install script in package.json successfully.')
