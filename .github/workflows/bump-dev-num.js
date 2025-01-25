const semver = require('semver')

const versionString = process.argv[2]
const promote = process.argv[3]

const version = semver.parse(versionString)

if (!version) {
  console.error('Invalid version string')
  process.exit(1)
}

if (version.prerelease.includes('dev')) {
  // Increment the dev release number
  if(promote){
    version.prerelease = ['rc', 1]; // Transition to rc with the first RC number
  }
  else {
    version.inc('prerelease', 'dev')

  }
} else if (version.prerelease.includes('rc')) {
  // Increment the RC number
  if(promote){
    version.prerelease = []
    version.inc('patch') // Bump to next minor version

  }
  else {
    version.inc('prerelease', 'rc')

  }
} else {
  // Create the first dev pre-release
  version.prerelease = ['dev', 1]; // Transition to rc with the first RC number
}

console.log(version.format())
