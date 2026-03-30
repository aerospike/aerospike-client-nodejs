// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */

import Aerospike, { WritePolicy } from '../lib/aerospike';

import { expect, assert} from 'chai'; 
import * as helper from './test_helper';

require('./test_helper')
const client = helper.client

context('connectTimeout', function () {
  describe('postive tests', function () {
    describe('requires print statements in C Client', function () {

    	// Add print statements after 
    	//
			// printf("connectTimeout before: %d", policy->connect_timeout);
			// if ((rc = get_optional_uint32_property(&policy->connect_timeout, NULL, obj,
			// 									   "connectTimeout", log)) !=
			// 	AS_NODE_PARAM_OK) {
			// 	return rc;
			// }
			// printf("connectTimeout after: %d", policy->connect_timeout);
			//

      it('sets connectTimeout timeout to specified value', async function () {
      	const writePolicy: WritePolicy = new Aerospike.policy.WritePolicy({ connectTimeout: 4243})

	    	await client.put(new Aerospike.Key(helper.namespace, helper.set, 'connectTimeout/1'), { a: 1 }, null, writePolicy)
      })
    })

  })

  describe('negative tests', function () {

    it('fails when connect timeout is string', async function () {
    	const writePolicy = new Aerospike.policy.WritePolicy({ connectTimeout: 'fail' as any })
    	try{
	    	await client.put(new Aerospike.Key(helper.namespace, helper.set, 'connectTimeout/1'), { a: 1 }, null, writePolicy )
	    	assert.fail("An error should be thrown!")
    	}
    	catch (error: any){
    		expect(error.message).to.eql('Policy object invalid')
    		expect(error.code).to.eql(Aerospike.status.ERR_PARAM)
    	}
    })

  })

  

})
