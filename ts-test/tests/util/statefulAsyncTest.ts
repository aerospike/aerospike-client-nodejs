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

/* global expect */
import Aerospike from 'aerospike';

const AerospikeError = Aerospike.AerospikeError
import * as helper from '../test_helper';
import { expect } from 'chai'; 

class State {
  [key: string]: any;

  private _expectError: boolean = false;
  private error: any = null;
  set (name: any, promise: any) {
    if (this._expectError) {
      return promise.catch((error: any) => {
        this.error = error
        return this
      })
    } else {
      return promise.then((value: any) => {
        this[name] = value
        return this
      })
    }
  }

  setExpectError () {
    this._expectError = true
    return this
  }
}

export function initState  () { 
  return Promise.resolve(new State())
}
export function expectError(){
  return (state: any) => state.setExpectError()
} 

export function createRecord(bins: any) {
  return (state: any) => {
    const key = helper.keygen.string(helper.namespace, helper.set, {})()
    const meta = { ttl: 600 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })
    return state.set('key', helper.client.put(key, bins, meta, policy))
  }
}
export function operate(ops: any) {
  return (state: any) => {
    return state.set('result', helper.client.operate(state.key, Array.isArray(ops) ? ops : [ops]))
  }
} 

export function assertResultEql(expected: any) {
  return (state: any) => {
    expect(state.result.bins).to.eql(expected, 'result of operation does not match expectation')
    return state
  }
} 

export function assertResultSatisfy(matcher: any) {
  return (state: any) => {
    expect(state.result.bins).to.satisfy(matcher, 'result of operation does not satisfy expectation')
    return state
  }
} 

export function assertRecordEql(expected: any) {
  return (state: any) => {
    return helper.client.get(state.key).then((record) =>
      expect(record.bins).to.eql(expected, 'after operation, record bins do not match expectations')
    ).then(() => state)
  }
} 

export function assertError(code: any) {
  return (state: any) => {
    expect(state.error, `expected operation to raise exception with error code ${code}`)
      .to.be.instanceof(AerospikeError)
      .with.property('code', code)
    return state
  }
} 

export function cleanup (){
  return (state: any) =>{
    helper.client.remove(state.key)
  }
} 
