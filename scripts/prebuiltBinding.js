const os = require('node:os')
const fs = require('fs')
const util = require('util')
const rm = util.promisify(fs.rm)

;(async function () {
  const platform = await os.platform()

  const arch = await os.arch()

  if (platform === 'darwin') {
    console.log('Darwin binaries')
    await rm('lib/binding/node-v137-win32-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-win32-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })

    if (arch === 'x64') {
      await rm('lib/binding/node-v137-darwin-arm64', { recursive: true, force: true })
      await rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
      await rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    } else {
      await rm('lib/binding/node-v137-darwin-x64', { recursive: true, force: true })
      await rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
      await rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    }

    await rm('lib/binding/node-v137-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v137-linux-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-linux-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-linux-x64', { recursive: true, force: true })
  } else if (platform === 'win32') {
    console.log('Windows binaries')
    await rm('lib/binding/node-v137-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v137-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })

    await rm('lib/binding/node-v137-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-linux-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v137-linux-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-linux-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-linux-x64', { recursive: true, force: true })
  } else {
    console.log('Linux binaries')
    await rm('lib/binding/node-v137-win32-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-win32-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })

    if (arch === 'x64') {
      await rm('lib/binding/node-v137-linux-arm64', { recursive: true, force: true })
      await rm('lib/binding/node-v127-linux-arm64', { recursive: true, force: true })
      await rm('lib/binding/node-v115-linux-arm64', { recursive: true, force: true })
    } else {
      await rm('lib/binding/node-v137-linux-x64', { recursive: true, force: true })
      await rm('lib/binding/node-v127-linux-x64', { recursive: true, force: true })
      await rm('lib/binding/node-v115-linux-x64', { recursive: true, force: true })
    }

    await rm('lib/binding/node-v137-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    await rm('lib/binding/node-v137-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
  }
})()
