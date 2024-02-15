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

/* global expect, describe, it, context */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

function getRandomInt (max) {
  return Math.floor(Math.random() * max)
}
function randomString (num) {
  return getRandomInt(num)
}

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

context('admin commands', async function () {
  if (helper.config.user !== 'admin') {
    return
  }
  const client = helper.client
  const randomFactor = 1000000
  const waitMs = 100
  const username1 = 'username' + randomString(getRandomInt(randomFactor))
  const username2 = 'username' + randomString(getRandomInt(randomFactor))
  const username3 = 'username' + randomString(getRandomInt(randomFactor))
  const username4 = 'username' + randomString(getRandomInt(randomFactor))

  const rolename1 = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename2 = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename3 = 'rolename' + randomString(getRandomInt(randomFactor))

  const policy = new Aerospike.AdminPolicy({ timeout: 1000 })

  describe('Client#queryRole()', function () {
    it('query role', async function () {
      const result = await client.queryRole('user-admin', null)
      expect(result).to.have.property('name', 'user-admin')
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges')
    })

    it('with policy', async function () {
      const result = await client.queryRole('truncate', policy)
      expect(result).to.have.property('name', 'truncate')
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges')
    })
  })

  describe('Client#queryRoles()', function () {
    it('query roles', async function () {
      const results = await client.queryRoles(null)
      expect(results.length).to.be.above(0)
      results.forEach((result) => {
        expect(result).to.have.property('name')
        expect(result).to.have.property('readQuota', 0)
        expect(result).to.have.property('writeQuota', 0)
        expect(result).to.have.property('whitelist').that.is.an('array')
        expect(result).to.have.property('privileges')
      })
    })

    it('with policy', async function () {
      const results = await client.queryRoles(policy)
      expect(results.length).to.be.above(0)
      results.forEach((result) => {
        expect(result).to.have.property('name')
        expect(result).to.have.property('readQuota', 0)
        expect(result).to.have.property('writeQuota', 0)
        expect(result).to.have.property('whitelist').that.is.an('array')
        expect(result).to.have.property('privileges')
      })
    })
  })

  describe('Client#createRole()', function () {
    it('Creates role', async function () {
      client.createRole(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)], null)
      await wait(waitMs)
      const result = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
    })

    it('with admin policy', async function () {
      client.createRole(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)])
    })

    it('With multiple privilegeCodes', async function () {
      await client.createRole(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)], null)
      await wait(waitMs)
      const result = await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)])
    })
  })

  describe('Client#grantPrivileges()', function () {
    it('grants privilege to role', async function () {
      client.grantPrivileges(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)], null)
      await wait(waitMs)
      const result = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('with admin policy', async function () {
      client.grantPrivileges(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })
    it('with multiple privileges', async function () {
      client.grantPrivileges(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.is.an('array')
      expect(result.privileges).to.have.length(5)
      for (let i = 0; i < 5; i++) {
        expect(result.privileges[i]).to.have.property('code').that.is.a('number')
        expect(result.privileges[i]).to.have.property('namespace').that.is.a('string')
        expect(result.privileges[i]).to.have.property('set').that.is.a('string')
      }
    })
  })

  describe('Client#revokePrivileges()', function () {
    it('Revokes privilege from role', async function () {
      client.revokePrivileges(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
      await wait(waitMs)
      const result = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With admin policy', async function () {
      client.revokePrivileges(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })

    it('With mutliple privileges', async function () {
      client.revokePrivileges(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)])
    })
  })

  describe('Client#queryUser()', function () {
    it('Queries user', async function () {
      const result = await client.queryUser('admin', null)
      expect(result).to.have.property('name', 'admin')
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals(['user-admin'])
    })

    it('with policy', async function () {
      const result = await client.queryUser('admin', policy)
      expect(result).to.have.property('name', 'admin')
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals(['user-admin'])
    })
  })

  describe('Client#queryUsers()', function () {
    it('Queries users', async function () {
      const results = await client.queryUsers(null)
      results.forEach((result) => {
        expect(result).to.have.property('name').that.is.a('string')
        expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
        expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
        expect(result.connsInUse).to.be.a('number')
        expect(result).to.have.property('roles').that.is.an('array')
      })
    })
    it('With policy', async function () {
      const results = await client.queryUsers(policy)
      results.forEach((result) => {
        expect(result).to.have.property('name').that.is.a('string')
        expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
        expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
        expect(result.connsInUse).to.be.a('number')
        expect(result).to.have.property('roles').that.is.an('array')
      })
    })
  })

  describe('Client#createUser()', function () {
    it('Creates user', async function () {
      client.createUser(username1, 'password')
      await wait(waitMs)
      const result = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With policy', async function () {
      client.createUser(username2, 'password', null, policy)
      await wait(waitMs)
      const result = await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With role', async function () {
      client.createUser(username3, 'password', [rolename1])
      await wait(waitMs)
      const result = await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename1])
    })

    it('With multiple roles', async function () {
      client.createUser(username4, 'password', [rolename1, rolename2, rolename3])
      await wait(waitMs)
      const result = await client.queryUser(username4, null)
      expect(result).to.have.property('name', username4)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('connsInUse', 0)
      expect(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3])
    })
  })

  describe('Client#grantRoles()', function () {
    it('grants role to user', async function () {
      client.grantRoles(username1, [rolename1], null)
      await wait(waitMs)
      const result = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename1])
    })

    it('With policy', async function () {
      client.grantRoles(username2, [rolename2], policy)
      await wait(waitMs)
      const result = await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename2])
    })

    it('With multiple roles', async function () {
      client.grantRoles(username3, [rolename1, rolename2, rolename3], policy)
      await wait(waitMs)
      const result = await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3])
    })
  })

  describe('Client#revokeRoles()', function () {
    it('Revokes role from user', async function () {
      client.revokeRoles(username1, [rolename1], null)
      await wait(waitMs)
      const result = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With policy', async function () {
      client.revokeRoles(username2, [rolename2], policy)
      await wait(waitMs)
      const result = await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With multiple roles', async function () {
      client.revokeRoles(username3, [rolename1, rolename2, rolename3], policy)
      await wait(waitMs)
      const result = await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })
  })

  describe('Client#setWhitelist()', function () {
    it('Set whitelist', async function () {
      client.setWhitelist(rolename1, ['192.168.0.0'], null)
      await wait(waitMs)
      const result = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With policy', async function () {
      client.setWhitelist(rolename2, ['192.168.0.0'], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })

    it('With multiple addresses', async function () {
      client.setWhitelist(rolename3, ['192.168.0.0', '149.14.182.255'], policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0', '149.14.182.255'])
      expect(result).to.have.property('privileges').that.is.an('array')
      expect(result.privileges).to.have.length(3)
      for (let i = 0; i < 3; i++) {
        expect(result.privileges[i]).to.have.property('code').that.is.a('number')
        expect(result.privileges[i]).to.have.property('namespace').that.is.a('string')
        expect(result.privileges[i]).to.have.property('set').that.is.a('string')
      }
    })
  })

  describe('Client#setQuotas()', function () {
    it('Sets quotas', async function () {
      client.setQuotas(rolename1, 100, 150, null)
      await wait(waitMs)
      const result = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 100)
      expect(result).to.have.property('writeQuota', 150)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With policy', async function () {
      client.setQuotas(rolename2, 150, 250, policy)
      await wait(waitMs)
      const result = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 150)
      expect(result).to.have.property('writeQuota', 250)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })
  })

  describe('Client#dropRole()', function () {
    it('Drops role', async function () {
      client.dropRole(rolename1, null)
      await wait(waitMs)
      try {
        await client.queryRole(rolename1, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_ROLE)
      }
    })

    it('With policy', async function () {
      client.dropRole(rolename2, policy)
      await wait(waitMs)
      try {
        await client.queryRole(rolename2, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_ROLE)
      }
    })
  })

  describe('Client#changePassword()', function () {
    it('Changes password for user', async function () {
      client.changePassword(username1, 'password350', null)
      await wait(waitMs + 30000)
      const config = {
        hosts: helper.config.hosts,
        user: username1,
        password: 'password350'
      }
      const dummyClient = await Aerospike.connect(config)
      return dummyClient.close()
    })

    it('With policy', async function () {
      client.changePassword(username2, 'password250', policy)
      await wait(waitMs + 3000)

      const config = {
        hosts: helper.config.hosts,
        user: username2,
        password: 'password250'
      }

      const dummyClient = await Aerospike.connect(config)
      return dummyClient.close()
    })
  })

  describe('Client#dropUser()', function () {
    it('Drops user', async function () {
      client.dropUser(username1, null)
      await wait(waitMs)
      try {
        await client.queryUser(username1, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_USER)
      }
    })
    it('With policy', async function () {
      client.dropUser(username2, policy)
      await wait(waitMs)
      try {
        await client.queryUser(username2, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_USER)
      }
    })
  })

  client.dropRole(rolename3, null)
  client.dropUser(username4, policy)
  client.dropUser(username3, policy)
})
