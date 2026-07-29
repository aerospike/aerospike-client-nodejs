#!/usr/bin/env node
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

const path = require('path')
const { loadSettings } = require('./settings')
const { createConsole } = require('./console')
const { createConnectedClient, createExampleContext } = require('./context')
const { runExampleWithFixture, ExampleResult } = require('./example')
const { resolveExampleNames, getExample, names } = require('./registry')
const { writeJUnitReport } = require('./results/junit')
const { populateServerCapabilities } = require('./serverCapabilities')

function printUsage () {
  console.error(`Usage: node run.js [--settings path] [--report-junit path] <ExampleName|all> [more...]

Registered examples: ${names.join(', ')}, all`)
}

function parseArgs (argv) {
  const positional = []
  let settingsPath = null
  let reportJUnit = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--settings') {
      settingsPath = argv[++i]
      continue
    }
    if (arg === '--report-junit') {
      reportJUnit = argv[++i]
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }
    positional.push(arg)
  }

  if (positional.length === 0) {
    printUsage()
    process.exit(1)
  }

  return { settingsPath, reportJUnit, exampleNames: resolveExampleNames(positional) }
}

function printSummary (results) {
  for (const result of results) {
    const suffix = result.message ? `: ${result.message}` : ''
    console.info(`${result.name} ${result.status}${suffix} (${result.durationMs}ms)`)
  }

  const failed = results.filter(r => r.status === ExampleResult.Failed)
  const skipped = results.filter(r => r.status === ExampleResult.Skipped)
  const passed = results.filter(r => r.status === ExampleResult.Passed)

  console.info(`Summary: ${passed.length} passed, ${skipped.length} skipped, ${failed.length} failed`)
  if (results.length !== names.length) {
    console.error(`Registry size mismatch: ran ${results.length}, registry has ${names.length}`)
    return 1
  }
  return failed.length > 0 ? 1 : 0
}

async function main () {
  const { settingsPath, reportJUnit, exampleNames } = parseArgs(process.argv.slice(2))
  const settings = loadSettings(settingsPath)
  const args = {
    host: settings.host,
    port: settings.port,
    namespace: settings.namespace,
    set: settings.set,
    totalTimeout: settings.totalTimeout,
    user: settings.user,
    password: settings.password
  }

  const console = createConsole()
  let client

  try {
    client = await createConnectedClient(args)
    await populateServerCapabilities(client, args)
    const context = createExampleContext(client, args, console)
    const results = []

    for (const exampleName of exampleNames) {
      const definition = getExample(exampleName)
      if (!definition) {
        console.error(`Invalid example: ${exampleName}`)
        results.push({
          name: exampleName,
          status: ExampleResult.Failed,
          message: 'example not found in registry',
          durationMs: 0
        })
        continue
      }

      const result = await runExampleWithFixture({
        name: definition.name,
        runExample: definition.runExample,
        fixture: definition.fixture,
        context
      })
      results.push(result)
    }

    if (reportJUnit) {
      writeJUnitReport(path.resolve(reportJUnit), results)
    }

    const exitCode = printSummary(results)
    process.exit(exitCode)
  } catch (err) {
    console.error(`Error: ${err.message}`)
    console.error(err.stack)
    process.exit(1)
  } finally {
    if (client) {
      client.close()
    }
  }
}

main()
