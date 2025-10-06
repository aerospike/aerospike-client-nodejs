import fs from 'fs'
import path from 'path'

const folder = '/your/folder/path'

const count = fs.readdirSync(folder, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory()).length

if (count !== 3) {
  throw new Error(`Expected 3 subfolders, found ${count}`)
}

console.log('Exactly 3 subfolders found')