const semver = require('semver');

const versionString = process.argv[2];
let version = semver.parse(versionString);

if (!version) {
  console.error("Invalid version string");
  process.exit(1);
}

if (version.prerelease.includes('dev')) {
  // Increment the dev release number
  version.inc('prerelease', 'dev');
} else if (version.prerelease.includes('rc')) {
  // Increment the RC number
  version.inc('prerelease', 'rc');
  version.prerelease[1] = 1; // Ensure dev number starts at 1
} else {
  // Assume this is a release version
  version.inc('minor'); // Bump to next minor version
  version.prerelease = ['rc', 1]; // Start RC numbers from 1
  version.format(); // Apply changes
}

console.log(version.version);
