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

/* global expect, describe, it, context */

import Aerospike, { Client, AdminPolicy, admin, ConfigOptions } from 'aerospike';
import * as helper from './test_helper';
import { expect, assert } from 'chai'; 

function getRandomInt (max: number) {
  return Math.floor(Math.random() * max)
}
function randomString (num: number) {
  return getRandomInt(num)
}

function wait (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

context('admin commands', async function () {



	it('Fails to connect when providing password alongside AUTH_PKI', async function () {
		const config: ConfigOptions = {
			hosts: helper.config.hosts,
			user: 'example',
			password: 'password350',
			authMode: Aerospike.auth.AUTH_PKI,
		}

		try{
			let dummyClient = await Aerospike.client(config)
			
		}
		catch(error: any){
			console.log(error)
	        expect(error.message).to.eql("Password authentication is disabled for PKI-only users. Please authenticate using your certificate.")
	        expect(error.code).to.eql(64)
		}


	})

})