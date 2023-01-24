const fs = require('fs')

function createDir (folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true })

    console.log('Folder Created Successfully: ' + folder)
  }
}

createDir('./lib/binding/openssl@1')
createDir('./lib/binding/openssl@3')