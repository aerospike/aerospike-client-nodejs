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
const { ExampleResult } = require('../example')

function escapeXml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function writeJUnitReport (filePath, results) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  const tests = results.length
  const failures = results.filter(r => r.status === ExampleResult.Failed).length
  const skipped = results.filter(r => r.status === ExampleResult.Skipped).length
  const timeSec = (results.reduce((sum, r) => sum + r.durationMs, 0) / 1000).toFixed(3)

  const cases = results.map(r => {
    const duration = (r.durationMs / 1000).toFixed(3)
    if (r.status === ExampleResult.Failed) {
      return `    <testcase classname="AerospikeExample" name="${escapeXml(r.name)}" time="${duration}">\n` +
        `      <failure message="${escapeXml(r.message || 'failed')}">${escapeXml(r.message || 'failed')}</failure>\n` +
        '    </testcase>'
    }
    if (r.status === ExampleResult.Skipped) {
      return `    <testcase classname="AerospikeExample" name="${escapeXml(r.name)}" time="${duration}">\n` +
        `      <skipped message="${escapeXml(r.message || 'skipped')}"/>\n` +
        '    </testcase>'
    }
    return `    <testcase classname="AerospikeExample" name="${escapeXml(r.name)}" time="${duration}"/>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuite name="AerospikeExample" tests="${tests}" failures="${failures}" skipped="${skipped}" time="${timeSec}">\n` +
    `${cases}\n` +
    `</testsuite>\n`

  fs.writeFileSync(filePath, xml, 'utf8')
}

module.exports = { writeJUnitReport }
