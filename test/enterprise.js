// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

/* global expect, it, context */

const helper = require('./test_helper')

const keygen = helper.keygen.string(helper.namespace, helper.set, { prefix: 'test/enterprise/' })
const recgen = helper.recgen
const valgen = helper.valgen

context('Enterprise server features', function () {
  helper.skipUnlessEnterprise(this)

  const client = helper.client

  context('compression', function () {
    helper.skipUnlessVersion('>= 4.8.0', this)

    // Client/server requests/responses > 128 bytes should get compressed; but
    // note that the server only applies compression if it saves at least 32
    // bytes, so payloads close to the 128 byte threshold might not get
    // compressed. In any case, we can't really verify whether compression was
    // applied at the protocol level since that's handled by the C client
    // library. So best we can do is to ensure normal put/get requests still
    // work as expected.
    it('should compress the request to the server', async function () {
      const key = keygen()
      const record = recgen.record({ string: valgen.string({ length: { min: 1024 } }) })()
      const policy = { compress: true }

      await client.put(key, record, {}, policy)
      const result = await client.get(key, policy)
      await client.remove(key)

      expect(result.bins.string).to.equal(record.string)
    })
  })

  context('durable deletes', function () {
    it('should apply the durable delete policy', async function () {
      const key = keygen()
      const record = recgen.record({ string: valgen.string() })()
      const policy = { durableDelete: true }

      await client.put(key, record)
      await client.remove(key, policy)
      expect(await client.exists(key)).to.be.false()
    })
  })
})
