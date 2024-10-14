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

/* global context, expect, describe, it */
/* eslint-disable no-unused-expressions */

import Aerospike, { Client as Cli, ConfigOptions, cdt, AerospikeError, AerospikeRecord, Node, KeyOptions } from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen

const Client: typeof Cli = Aerospike.Client
const Context: typeof cdt.Context = Aerospike.cdt.Context

describe('Client', function () {
  describe('#connect', function () {
    it('return self', function () {
      const client: Cli = new Client(helper.config)
      return client.connect()
        .then((client2: Cli) => {
          expect(client2).to.equal(client)
          client.close()
        })
    })

    it('should call the callback asynchronously', function (done) {
      const client: Cli = new Client(helper.config)
      let async = false
      client.connect((error?: Error) => {
        if (error) throw error
        expect(async).to.be.true
        client.close(false)
        done()
      })
      async = true
    })

    it('should return a Promise if callback without callback', function () {
      const client: Cli = new Client(helper.config)
      const promise: Promise<Cli> = client.connect()
      expect(promise).to.be.instanceof(Promise)
      return promise.then(() => client.close(false))
    })
  })

  describe('#close', function () {
    it('should be a no-op if close is called after connection error #noserver', function (done) {
      const client: Cli = new Client({ hosts: '127.0.0.1:0' })
      client.connect((error?: Error) => {
        expect(error?.message).to.match(/Failed to connect/)
        client.close(false)
        done()
      })
    })

    it('should be possible to call close multiple times', function (done) {
      const client: Cli = new Client(helper.config)
      client.connect((error?: Error) => {
        expect(error).to.be.null
        client.close(false)
        client.close(false)
        done()
      })
    })
    /*
    it('should allow exit when all clients are closed', async function () {
      const test: Function = async function (Aero: typeof Aerospike, config: ConfigOptions) {
        Object.assign(config, { log: { level: Aerospike.log.OFF } })
        const client: Cli = await Aero.connect(config)
        client.close()

        await new Promise<void>((resolve, reject) => {
          // beforeExit signals that the process would exit
          process.on('beforeExit', resolve)

          setTimeout(() => {
            reject('Process did not exit within 100ms') // eslint-disable-line
          }, 100).unref()
        })
      }

      await helper.runInNewProcess(test, helper.config)
    })
    */
  })

  describe('#isConnected', function () {
    context('without tender health check', function () {
      it('returns false if the client is not connected', function () {
        const client: Cli = new Client(helper.config)
        expect(client.isConnected(false)).to.be.false
      })

      it('returns true if the client is connected', function (done) {
        const client: Cli = new Client(helper.config)
        client.connect(function () {
          expect(client.isConnected(false)).to.be.true
          client.close(false)
          done()
        })
      })

      it('returns false after the connection is closed', function (done) {
        const client: Cli = new Client(helper.config)
        client.connect(function () {
          client.close(false)
          expect(client.isConnected(false)).to.be.false
          done()
        })
      })
    })

    context('with tender health check', function () {
      it("calls the Aerospike C client library's isConnected() method", function (done) {
        const client: any = new Client(helper.config)
        const orig: any = (client as any).as_client.isConnected
        client.connect(function () {
          let tenderHealthCheck = false
          client.as_client.isConnected = function () { tenderHealthCheck = true; return false }
          expect(client.isConnected(true)).to.be.false
          expect(tenderHealthCheck).to.be.true
          client.as_client.isConnected = orig
          client.close(false)
          done()
        })
      })
    })
  })

  describe('Client#getNodes', function () {
    const client: Cli = helper.client

    it('returns a list of cluster nodes', function () {
      const nodes: Node[] = client.getNodes()

      expect(nodes).to.be.an('array')
      expect(nodes.length).to.be.greaterThan(0)
      nodes.forEach(function (node) {
        expect(node.name).to.match(/^[0-9A-F]{15}$/)
        expect(node.address).to.be.a('string')
      })
    })
  })

  describe('Client#contextToBase64', function () {
    const client: Cli = helper.client
    const context: cdt.Context = new Context().addMapKey('nested')
    it('Serializes a CDT context', function () {
      expect(typeof client.contextToBase64(context)).to.equal('string')
    })
    /*
    it('Throws an error if no context is given', function () {
      expect(() => { client.contextToBase64() }).to.throw(Error)
    })
    it('Throws an error if a non-object is given', function () {
      expect(() => { client.contextToBase64('test') }).to.throw(Error)
    })
    */
  })

  describe('Client#contextFromBase64', function () {
    const client: Cli = helper.client
    const addListIndex: cdt.Context = new Context().addListIndex(5)
    const addListIndexCreate: cdt.Context = new Context().addListIndexCreate(45, Aerospike.lists.order.ORDERED, true)
    const addListRank: cdt.Context = new Context().addListRank(15)
    const addListValueString: cdt.Context = new Context().addListValue('apple')
    const addListValueInt: cdt.Context = new Context().addListValue(4500)
    const addMapIndex: cdt.Context = new Context().addMapIndex(10)
    const addMapRank: cdt.Context = new Context().addMapRank(11)
    const addMapKey: cdt.Context = new Context().addMapKey('nested')
    const addMapKeyCreate: cdt.Context = new Context().addMapKeyCreate('nested', Aerospike.maps.order.KEY_ORDERED)
    const addMapValueString: cdt.Context = new Context().addMapValue('nested')
    const addMapValueInt: cdt.Context = new Context().addMapValue(1000)
    it('Deserializes a cdt context with addListIndex', function () {
      expect(client.contextFromBase64(client.contextToBase64(addListIndex))).to.eql(addListIndex)
    })
    it('Deserializes a cdt context with addListIndexCreate', function () {
      expect(client.contextFromBase64(client.contextToBase64(addListIndexCreate))).to.eql(addListIndexCreate)
    })
    it('Deserializes a cdt context with addListRank', function () {
      expect(client.contextFromBase64(client.contextToBase64(addListRank))).to.eql(addListRank)
    })
    it('Deserializes a cdt context with addListValueString', function () {
      expect(client.contextFromBase64(client.contextToBase64(addListValueString))).to.eql(addListValueString)
    })
    it('Deserializes a cdt context with addListValueInt', function () {
      expect(client.contextFromBase64(client.contextToBase64(addListValueInt))).to.eql(addListValueInt)
    })
    it('Deserializes a cdt context with addMapIndex', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapIndex))).to.eql(addMapIndex)
    })
    it('Deserializes a cdt context with addMapRank', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapRank))).to.eql(addMapRank)
    })
    it('Deserializes a cdt context with addMapKey', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapKey))).to.eql(addMapKey)
    })
    it('Deserializes a cdt context with addMapKeyCreate', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapKeyCreate))).to.eql(addMapKeyCreate)
    })
    it('Deserializes a cdt context with addMapValueString', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapValueString))).to.eql(addMapValueString)
    })
    it('Deserializes a cdt context with addMapValueInt', function () {
      expect(client.contextFromBase64(client.contextToBase64(addMapValueInt))).to.eql(addMapValueInt)
    })
    /*
    it('Throws an error if no value is given', function () {
      expect(() => { client.contextFromBase64() }).to.throw(Error)
    })
    it('Throws an error if an non-string value is given', function () {
      expect(() => { client.contextFromBase64(45) }).to.throw(Error)
    })
    */
  })

  context.skip('cluster name', function () {
    it('should fail to connect to the cluster if the cluster name does not match', function (done) {
      const config = Object.assign({}, helper.config)
      config.clusterName = 'notAValidClusterName'
      const client = new Client(config)
      client.connect(function (err?: AerospikeError) {
        expect(err?.code).to.eq(Aerospike.status.ERR_CLIENT)
        client.close(false)
        done()
      })
    })
  })

  describe('Events', function () {
    it('client should emit nodeAdded events when connecting', function (done) {
      const client = new Client(helper.config)
      client.once('nodeAdded', (event: any) => {
        client.close()
        done()
      })
      client.connect()
    })

    it('client should emit events on cluster state changes', function (done) {
      const client = new Client(helper.config)
      client.once('event', (event: any) => {
        expect(event.name).to.equal('nodeAdded')
        client.close()
        done()
      })
      client.connect()
    })
  })

  context('callbacks', function () {
    // Execute a client command on a client instance that has been setup to
    // trigger an error; check that the error callback occurs asynchronously,
    // i.e. only after the command function has returned.
    // The get command is used for the test but the same behavior should apply
    // to all client commands.
    function assertErrorCbAsync (client?: Cli, errorCb?: Function, done?: any) {
      const checkpoints: string[] = []
      const checkAssertions = function (checkpoint: string) {
        checkpoints.push(checkpoint)
        if (checkpoints.length !== 2) return
        expect(checkpoints).to.eql(['after', 'callback'])
        if (client?.isConnected()) client?.close(false)
        done()
      }
      const key = keygen.string(helper.namespace, helper.set)()
      client?.get(key, function (err?: AerospikeError, _record?: AerospikeRecord) {
        errorCb?.(err)
        checkAssertions('callback')
      })
      checkAssertions('after')
    }

    it('callback is asynchronous in case of an client error #noserver', function (done) {
      // trying to send a command to a client that is not connected will trigger a client error
      const client = Aerospike.client()
      const errorCheck = function (err: Error) {
        expect(err).to.be.instanceof(Error)
        expect(err.message).to.equal('Not connected.')
      }
      assertErrorCbAsync(client, errorCheck, done)
    })

    it('callback is asynchronous in case of an I/O error', function (done) {
      // maxConnsPerNode = 0 will trigger an error in the C client when trying to send a command
      const config: ConfigOptions = Object.assign({ maxConnsPerNode: 0 }, helper.config)
      Aerospike.connect(config, function (err?: AerospikeError, client?: Cli) {
        if (err) throw err
        const errorCheck = function (err: AerospikeError) {
          expect(err).to.be.instanceof(Error)
          expect(err.code).to.equal(Aerospike.status.ERR_NO_MORE_CONNECTIONS)
        }
        assertErrorCbAsync(client, errorCheck, done)
      })
    })
  })

  describe('#captureStackTraces', function () {
    it('should capture stack traces that show the command being called', function (done) {
      const client: Cli = helper.client
      const key: KeyOptions = keygen.string(helper.namespace, helper.set)()
      const orig: boolean = client.captureStackTraces
      client.captureStackTraces = true
      client.get(key, function (err?: AerospikeError) {
        expect(err?.stack).to.match(/Client.get/)
        client.captureStackTraces = orig
        done()
      })
    })
  })
})
