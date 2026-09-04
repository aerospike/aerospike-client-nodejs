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

const { ExampleSkipError } = require('./errors')

const ExampleResult = {
  Passed: 'Passed',
  Skipped: 'Skipped',
  Failed: 'Failed'
}

async function runExampleWithFixture ({
  name,
  runExample,
  fixture,
  context
}) {
  const { client, args, console } = context
  const errorCountBefore = console.errorCount
  const started = Date.now()

  try {
    console.info(`${name} Begin`)
    if (fixture.setup) {
      await fixture.setup(client, args)
    }
    await runExample(context)
    if (fixture.validate) {
      await fixture.validate(client, args)
    }
    console.info(`${name} End`)

    if (console.errorCount > errorCountBefore) {
      return result(name, ExampleResult.Failed, 'example logged one or more errors', started)
    }
    return result(name, ExampleResult.Passed, '', started)
  } catch (err) {
    if (err instanceof ExampleSkipError) {
      console.warn(`${name} SKIPPED: ${err.message}`)
      return result(name, ExampleResult.Skipped, err.message, started)
    }
    console.error(`${name} FAILED: ${err.message}`)
    return result(name, ExampleResult.Failed, err.message, started)
  } finally {
    if (fixture.cleanup) {
      try {
        await fixture.cleanup(client, args)
      } catch (cleanupErr) {
        console.error(`${name} cleanup failed: ${cleanupErr.message}`)
      }
    }
  }
}

function result (name, status, message, started) {
  return {
    name,
    status,
    message,
    durationMs: Date.now() - started
  }
}

module.exports = {
  ExampleResult,
  runExampleWithFixture
}
