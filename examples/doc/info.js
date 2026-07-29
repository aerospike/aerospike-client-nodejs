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

async function runExample ({ client, console }) {
  const build = await client.infoAny('build')
  console.info(`infoAny build: ${build.split('\n')[0]}`)

  const responses = await client.infoAll('edition')
  for (const row of responses) {
    if (row.info) {
      console.info(`infoAll edition from node: ${row.info.trim()}`)
    }
  }
}

module.exports = { name: 'Info', runExample }
