// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

/* global expect, describe, it */

require('./test_helper')
const utils = require('../lib/utils')

describe('utils.parseHostString()', function () {
  it('parses a domain name', function () {
    var host = utils.parseHostString('aero.local')
    expect(host).to.eql({addr: 'aero.local', port: 3000})
  })

  it('parses a domain name with port', function () {
    var host = utils.parseHostString('aero.local:3333')
    expect(host).to.eql({addr: 'aero.local', port: 3333})
  })

  it('parses a domain name with TLS name and port', function () {
    var host = utils.parseHostString('aero.local:aero.tls:3333')
    expect(host).to.eql({addr: 'aero.local', tls: 'aero.tls', port: 3333})
  })

  it('parses a domain name with TLS name', function () {
    var host = utils.parseHostString('aero.local:aero.tls')
    expect(host).to.eql({addr: 'aero.local', tls: 'aero.tls', port: 3000})
  })

  it('parses an IPv4 address', function () {
    var host = utils.parseHostString('192.168.33.10')
    expect(host).to.eql({addr: '192.168.33.10', port: 3000})
  })

  it('parses an IPv4 address with port', function () {
    var host = utils.parseHostString('192.168.33.10:3333')
    expect(host).to.eql({addr: '192.168.33.10', port: 3333})
  })

  it('parses an IPv4 address with TLS name and port', function () {
    var host = utils.parseHostString('192.168.33.10:aero.tls:3333')
    expect(host).to.eql({addr: '192.168.33.10', tls: 'aero.tls', port: 3333})
  })

  it('parses an IPv4 address with TLS name', function () {
    var host = utils.parseHostString('192.168.33.10:aero.tls')
    expect(host).to.eql({addr: '192.168.33.10', tls: 'aero.tls', port: 3000})
  })

  it('parses an IPv6 address', function () {
    var host = utils.parseHostString('[fde4:8dba:82e1::c4]')
    expect(host).to.eql({addr: '[fde4:8dba:82e1::c4]', port: 3000})
  })

  it('parses an IPv6 address with port', function () {
    var host = utils.parseHostString('[fde4:8dba:82e1::c4]:3333')
    expect(host).to.eql({addr: '[fde4:8dba:82e1::c4]', port: 3333})
  })

  it('parses an IPv6 address with TLS name and port', function () {
    var host = utils.parseHostString('[fde4:8dba:82e1::c4]:aero.tls:3333')
    expect(host).to.eql({addr: '[fde4:8dba:82e1::c4]', tls: 'aero.tls', port: 3333})
  })

  it('parses an IPv6 address with TLS name', function () {
    var host = utils.parseHostString('[fde4:8dba:82e1::c4]:aero.tls')
    expect(host).to.eql({addr: '[fde4:8dba:82e1::c4]', tls: 'aero.tls', port: 3000})
  })

  it('throws an error if it cannot parse the string', function () {
    expect(function () {
      utils.parseHostString('not a valid host')
    }).to.throwException('Invalid host address')
  })
})

describe('utils.parseHostsString()', function () {
  it('parses a comma separate list of hosts', function () {
    var hosts = utils.parseHostsString('aero.local:aero.tls:3000,192.168.33.10:3000,[fde4:8dba:82e1::c4]')
    expect(hosts.length).to.be(3)
  })
})
