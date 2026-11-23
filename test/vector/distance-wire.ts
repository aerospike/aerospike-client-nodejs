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

'use strict'

/* global describe, it */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';

const { Vector, exp } = Aerospike

const QUERY = Vector.ofFloat32([1, 2])

describe('Vector distance wire encoding #noserver', function () {
  // Never connected (so never closed): expressionToBase64 only packs the expression.
  const client = Aerospike.client({ hosts: '127.0.0.1:3000' })

  for (const [name, metric] of Object.entries(Aerospike.vectorDistanceMetric)) {
    it(`encodes ${name} as [52, ${metric}, query, bin]`, function () {
      const distance = exp.vectorDistance(metric as number, QUERY, exp.binVector('v'))
      const bytes = Buffer.from(client.expressionToBase64(distance), 'base64')
      const query = QUERY.toBytes()
      // 4-element array, op 52, the metric as a positive fixint, then the
      // query as a blob: a fixstr whose first byte is the blob type (4).
      const head = Buffer.concat([Buffer.from([0x94, 52, metric as number, 0xa0 | (query.length + 1), 4]), query])
      expect(bytes.subarray(0, head.length).toString('hex')).to.equal(head.toString('hex'))
    })
  }
})
