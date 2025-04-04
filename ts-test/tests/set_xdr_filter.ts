// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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

import Aerospike, { Client as Cli, exp, lists} from 'aerospike';

import { expect, assert } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen

describe('set_xdr_filter tests', function () {
  const client: Cli = helper.client

  context('set_xdr_filter tests', function () { 

    let run_xdr: any = helper.skipUnlessXDR(this)

    let dc: any;
    let ns: any;

    before(async function () {
      if(run_xdr) {
        let dc_request: string = "get-config:context=xdr"
        let nodes: any = await client.getNodes()

        let node_0: any = nodes[0] // node_name in python


        let dc_response: any = await client.infoNode(dc_request, node_0)

        dc = dc_response.split("=")[2].split(";")[0]

        let ns_request: any = `get-config:context=xdr;dc=${dc}`
        let ns_response: any = await client.infoNode(ns_request, node_0)

        ns = ns_response.split("namespaces=")[1]
        
        await new Promise(resolve => setTimeout(resolve, 1000)) 
      }

      });

    

    it('Add a simple XDR filter', async function () {
      let response = await client.setXDRFilter(exp.eq(exp.binInt("bin1"), exp.int(6) ), 'dc2', 'test',  undefined)
      expect(response.trim()).to.eql((`xdr-set-filter:dc=dc2;namespace=test;exp=kwGTUQKkYmluMQY=\tok\n`).trim())
    })

    it('Set XDR filter with large expression', async function () {


          let bin1 = exp.binList("bin1")

          let exp_eq1: any = exp.eq(exp.lists.getByRelRankRange(bin1, exp.int(1), exp.int(3), exp.lists.getByIndex(bin1, exp.int(0), exp.type.INT, lists.returnType.VALUE), lists.returnType.COUNT), exp.int(2))
          let exp_eq2: any = exp.eq(exp.lists.getByValue(exp.lists.getByValueRange(bin1, exp.int(1), exp.int(7), lists.returnType.VALUE), exp.int(6), lists.returnType.VALUE), exp.list([2]))
          let exp_eq3: any = exp.eq(exp.lists.getByValueList(exp.lists.getByRelRankRangeToEnd(bin1, exp.int(1), exp.int(1), lists.returnType.VALUE), exp.list([2, 6]), lists.returnType.COUNT), exp.int(2))
          let exp_eq4: any = exp.eq(exp.lists.getByIndexRangeToEnd(exp.lists.getByIndexRange(bin1, exp.int(1), exp.int(3), lists.returnType.VALUE), exp.int(1), lists.returnType.COUNT), exp.int(1))
          let exp_eq5: any = exp.eq(exp.lists.getByRank(exp.lists.getByRankRange(bin1, exp.int(0), exp.int(1), lists.returnType.VALUE), exp.int(1), exp.type.INT, lists.returnType.RANK), exp.int(1))
          
          
          let expr: any = exp.and(exp_eq1, exp_eq2, exp_eq3, exp_eq4, exp_eq5)


          let response = await client.setXDRFilter(expr, 'dc2', 'test')

          
          expect(response.trim()).to.eql(("xdr-set-filter:dc=dc2;namespace=test;exp=lhCTAZV/AgCVGwUBA5V/AgCTEwcAk1EEpGJpbjGTUQSkYmluMQKTAZV/BACTFgcGlX8EAJQZBwEHk1EEpGJpbjGSfpECkwGVfwIAkxcFkn6SAgaVfwQAlBsHAQGTUQSkYmluMQKTAZV/AgCTGAUBlX8EAJQYBwEDk1EEpGJpbjEBkwGVfwIAkxUDAZV/BACUGgcAAZNRBKRiaW4xAQ==\tok").trim())


    })
    
    

    it('Set XDR filter with null', async function () {



          let response = await client.setXDRFilter(null, 'dc2', 'test')

          
          expect(response.trim()).to.eql(("xdr-set-filter:dc=dc2;namespace=test;exp=null\tok").trim())


    })

    it('Set XDR filter with invalid expressions', async function () {


      try{
        let response = await client.setXDRFilter( 5 as any, 'dc2', 'test')
        assert.fail("An error should have been caught!")
      }
      catch(error: any){
        expect(error.message).to.eql("Expression must be an array")
      }

      
    

    })

  })
})