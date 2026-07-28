// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

const fs = require('fs')
const path = require('path')

const DEFAULT_SETTINGS_PATH = path.join(__dirname, '..', '.settings.json')

function loadSettings (settingsPath) {
  const filePath = settingsPath || DEFAULT_SETTINGS_PATH
  const raw = fs.readFileSync(filePath, 'utf8')
  const settings = JSON.parse(raw)

  const host = process.env.AEROSPIKE_HOST ||
    process.env.AS_HOST ||
    settings.host
  const port = parseInt(
    process.env.AEROSPIKE_PORT ||
    process.env.AS_PORT ||
    settings.port,
    10
  )

  return {
    host,
    port,
    namespace: process.env.AEROSPIKE_NAMESPACE || settings.namespace,
    set: process.env.AEROSPIKE_SET || settings.set,
    totalTimeout: settings.totalTimeout || 1000,
    user: process.env.AEROSPIKE_USER || settings.user || null,
    password: process.env.AEROSPIKE_PASSWORD || settings.password || null
  }
}

module.exports = { loadSettings, DEFAULT_SETTINGS_PATH }
