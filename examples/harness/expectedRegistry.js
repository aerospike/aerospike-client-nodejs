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

/**
 * Canonical harness registry (Phase 6). Keep in sync with registry.js and README lists.
 */
const CANONICAL_EXAMPLE_NAMES = [
  'Connect',
  'ServerInfo',
  'Info',
  'PutGet',
  'Put',
  'Get',
  'Exists',
  'Add',
  'Append',
  'Prepend',
  'Delete',
  'Remove',
  'Replace',
  'Operate',
  'Batch',
  'Apply',
  'Scan',
  'ScanParallel',
  'QueryInteger',
  'QueryEqual',
  'SecondaryIndex',
  'UserDefinedFunction',
  'UdfModule',
  'DynamicConfig',
  'Metrics',
  'MrtCommit',
  'MrtAbort',
  'GeospatialMonteCarlo',
  'PathExpressions'
]

const EXPECTED_REGISTRY_SIZE = CANONICAL_EXAMPLE_NAMES.length

module.exports = {
  CANONICAL_EXAMPLE_NAMES,
  EXPECTED_REGISTRY_SIZE
}
