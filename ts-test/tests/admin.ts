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

  if (helper.config.user != 'admin') {
    return
  }

  const client: Client = helper.client
  const randomFactor: number = 1000000
  const waitMs: number = 100
  const username1: string = 'username' + randomString(getRandomInt(randomFactor))
  const username2: string = 'username' + randomString(getRandomInt(randomFactor))
  const username3: string = 'username' + randomString(getRandomInt(randomFactor))
  const username4: string = 'username' + randomString(getRandomInt(randomFactor))
  const username5: string = 'username' + randomString(getRandomInt(randomFactor))
  const username6: string = 'username' + randomString(getRandomInt(randomFactor))
  const username7: string = 'username' + randomString(getRandomInt(randomFactor))
  const username8: string = 'username' + randomString(getRandomInt(randomFactor))

  const rolename1: string = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename2: string = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename3: string = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename4: string = 'rolename' + randomString(getRandomInt(randomFactor))
  const rolename5: string = 'rolename' + randomString(getRandomInt(randomFactor))

  const policy: AdminPolicy = new Aerospike.AdminPolicy({ timeout: 1000 })

  describe('Client#queryRole()', function () {
    it('query role', async function () {
      const result: admin.Role = await client.queryRole('user-admin', null)
      expect(result).to.have.property('name', 'user-admin')
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges')
    })

    it('with policy', async function () {
      const result: admin.Role = await client.queryRole('truncate', policy)
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
      results.forEach((result: admin.Role) => {
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
      results.forEach((result: admin.Role) => {
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
      await client.createRole(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)], null)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
    })

    it('with admin policy', async function () {
      await client.createRole(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)], policy)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)])
    })

    it('With multiple privilegeCodes', async function () {
      await await client.createRole(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)], null)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)])
    })
  })

  describe('Client#grantPrivileges()', function () {
    it('grants privilege to role', async function () {
      await client.grantPrivileges(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)], null)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('with admin policy', async function () {
      await client.grantPrivileges(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result: admin.Role = await await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })
    it('with multiple privileges', async function () {
      await client.grantPrivileges(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result: admin.Role = await await client.queryRole(rolename3, null)
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
      await client.revokePrivileges(rolename1, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
      await wait(waitMs)
      const result: admin.Role = await await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With admin policy', async function () {
      await client.revokePrivileges(rolename2, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ)], policy)
      await wait(waitMs)
      const result: admin.Role = await await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })

    it('With mutliple privileges', async function () {
      await client.revokePrivileges(rolename3, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], policy)
      await wait(waitMs)
      const result: admin.Role = await await client.queryRole(rolename3, null)
      expect(result).to.have.property('name', rolename3)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals([])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN), new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE_UDF), new Aerospike.admin.Privilege(Aerospike.privilegeCode.WRITE)])
    })
  })

  describe('Client#queryUser()', function () {
    it('Queries user', async function () {
      const result: admin.User = await client.queryUser('admin', null)
      expect(result).to.have.property('name', 'admin')
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals(['user-admin'])
    })

    it('with policy', async function () {
      const result: admin.User = await client.queryUser('admin', policy)
      expect(result).to.have.property('name', 'admin')
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals(['user-admin'])
    })
  })

  describe('Client#queryUsers()', function () {
    it('Queries users', async function () {
      const results: admin.User[] = await client.queryUsers(null)
      results.forEach((result: admin.User) => {
        expect(result).to.have.property('name').that.is.a('string')
        expect(result).to.have.property('readInfo').that.is.an('array')
        expect(result).to.have.property('writeInfo').that.is.an('array')
        expect(result.connsInUse).to.be.a('number')
        expect(result).to.have.property('roles').that.is.an('array')
      })
    })
    it('With policy', async function () {
      const results: admin.User[] = await client.queryUsers(policy)
      results.forEach((result: admin.User) => {
        expect(result).to.have.property('name').that.is.a('string')
        expect(result).to.have.property('readInfo').that.is.an('array')
        expect(result).to.have.property('writeInfo').that.is.an('array')
        expect(result.connsInUse).to.be.a('number')
        expect(result).to.have.property('roles').that.is.an('array')
      })
    })
  })

  describe('Client#createUser()', function () {
    it('Creates user', async function () {
      await client.createUser(username1, 'password')
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With policy', async function () {
      await client.createUser(username2, 'password', null, policy)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With role', async function () {
      await client.createUser(username3, 'password', [rolename1])
      await wait(waitMs)
      const result = await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename1])
    })

    it('With multiple roles', async function () {
      await client.createUser(username4, 'password', [rolename1, rolename2, rolename3])
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username4, null)
      expect(result).to.have.property('name', username4)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('connsInUse', 0)
      expect(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3])
    })
  })

  describe('Client#createPKIUser()', function () {
    it('Creates user', async function () {
      await client.createPKIUser(username5)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username5, null)
      expect(result).to.have.property('name', username5)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With policy', async function () {
      await client.createPKIUser(username6, null, policy)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username6, null)
      expect(result).to.have.property('name', username6)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With role', async function () {
      await client.createPKIUser(username7, [rolename1])
      await wait(waitMs)
      const result = await client.queryUser(username7, null)
      expect(result).to.have.property('name', username7)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename1])
    })

    it('With multiple roles', async function () {
      await client.createPKIUser(username8, [rolename1, rolename2, rolename3])
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username8, null)
      expect(result).to.have.property('name', username8)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('connsInUse', 0)
      expect(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3])
    })
  })

  describe('Client#grantRoles()', function () {
    it('grants role to user', async function () {
      await client.grantRoles(username1, [rolename1], null)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename1])
    })

    it('With policy', async function () {
      await client.grantRoles(username2, [rolename2], policy)
      await wait(waitMs)
      const result: admin.User = await await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([rolename2])
    })

    it('With multiple roles', async function () {
      await client.grantRoles(username3, [rolename1, rolename2, rolename3], policy)
      await wait(waitMs)
      const result: admin.User = await await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.has.members([rolename1, rolename2, rolename3])
    })
  })

  describe('Client#revokeRoles()', function () {
    it('Revokes role from user', async function () {
      await client.revokeRoles(username1, [rolename1], null)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username1, null)
      expect(result).to.have.property('name', username1)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With policy', async function () {
      await client.revokeRoles(username2, [rolename2], policy)
      await wait(waitMs)
      const result: admin.User = await client.queryUser(username2, null)
      expect(result).to.have.property('name', username2)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })

    it('With multiple roles', async function () {
      await client.revokeRoles(username3, [rolename1, rolename2, rolename3], policy)
      await wait(waitMs)
      const result: admin.User = await await client.queryUser(username3, null)
      expect(result).to.have.property('name', username3)
      expect(result).to.have.property('readInfo').that.deep.equals([0, 0, 0, 0])
      expect(result).to.have.property('writeInfo').that.deep.equals([0, 0, 0, 0])
      expect(result.connsInUse).to.be.a('number')
      expect(result).to.have.property('roles').that.deep.equals([])
    })
  })

  describe('Client#setWhitelist()', function () {
    it('Set whitelist', async function () {
      await client.setWhitelist(rolename1, ['192.168.0.0'], null)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With policy', async function () {
      await client.setWhitelist(rolename2, ['192.168.0.0'], policy)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename2, null)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 0)
      expect(result).to.have.property('writeQuota', 0)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)])
    })

    it('With multiple addresses', async function () {
      await client.setWhitelist(rolename3, ['192.168.0.0', '149.14.182.255'], policy)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename3, null)
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
      await client.setQuotas(rolename1, 100, 150, null)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename1, null)
      expect(result).to.have.property('name', rolename1)
      expect(result).to.have.property('readQuota', 100)
      expect(result).to.have.property('writeQuota', 150)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE)])
    })

    it('With policy', async function () {
      await client.setQuotas(rolename2, 150, 250, policy)
      await wait(waitMs)
      const result: admin.Role = await client.queryRole(rolename2, null)
      const privilege: admin.Privilege = new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)
      expect(result).to.have.property('name', rolename2)
      expect(result).to.have.property('readQuota', 150)
      expect(result).to.have.property('writeQuota', 250)
      expect(result).to.have.property('whitelist').that.deep.equals(['192.168.0.0'])
      expect(result).to.have.property('privileges').that.deep.equals([privilege])
    })
  })

  describe('Client#dropRole()', function () {
    it('Drops role', async function () {
      await client.dropRole(rolename1, null)
      await wait(waitMs)
      try {
        await client.queryRole(rolename1, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error: any) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_ROLE)
      }
    })

    it('With policy', async function () {
      await client.dropRole(rolename2, policy)
      await wait(waitMs)
      try {
        await client.queryRole(rolename2, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error: any) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_ROLE)
      }
    })
  })

  describe('Client#setPassword()', function () {
    it('Changes password for user', async function () {
      let password = 'pass' + randomString(getRandomInt(randomFactor))
      await client.setPassword(username1, password, null)
      await wait(waitMs) 
      const config: ConfigOptions = {
        hosts: helper.config.hosts,
        user: username1,
        password: password
      }
      const dummyClient = await Aerospike.connect(config)
      return dummyClient.close()
    })

    it('With policy', async function () {
      let password = 'pass'+ randomString(getRandomInt(randomFactor))
      try{
        await client.setPassword(username2, password, policy)
      }
      catch(error: any){
        console.log(error)
      }
      await wait(waitMs)

      const config: ConfigOptions = {
        hosts: helper.config.hosts,
        user: username2,
        password: password
      }

      const dummyClient = await Aerospike.connect(config)
      return dummyClient.close()
    })
  })

  describe('Client#changePassword()', function () {
    it('Changes password for user', async function () {
      let password = 'pass'+ randomString(getRandomInt(randomFactor))
      await client.setPassword(username1, password)
      await client.createRole(rolename4, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.USER_ADMIN)])
      await client.grantRoles(username1, [rolename4])

      await wait(waitMs)

      let config: ConfigOptions = {
        hosts: helper.config.hosts,
        user: username1,
        password: password
      }

      let dummyClient = await Aerospike.connect(config)

      password = 'pass'+ randomString(getRandomInt(randomFactor))

      await dummyClient.changePassword(username1, password)
      await dummyClient.close()

      config = {
        hosts: helper.config.hosts,
        user: username1,
        password: password
      }

      dummyClient = await Aerospike.connect(config)
      await dummyClient.close()

    })

    it('With policy', async function () {
      let password = 'pass'+ randomString(getRandomInt(randomFactor))
      await client.setPassword(username2, password, null)
      await client.createRole(rolename5, [new Aerospike.admin.Privilege(Aerospike.privilegeCode.USER_ADMIN)])
      await client.grantRoles(username2, [rolename5])

      await wait(waitMs)

      let config: ConfigOptions = {
        hosts: helper.config.hosts,
        user: username2,
        password: password
      }

      let dummyClient = await Aerospike.connect(config)

      password = 'pass'+ randomString(getRandomInt(randomFactor))

      await dummyClient.changePassword(username2, password, policy)
      await dummyClient.close()

      config = {
        hosts: helper.config.hosts,
        user: username2,
        password: password
      }

      dummyClient = await Aerospike.connect(config)
      await dummyClient.close()

    })
  })

  describe('Client#dropUser()', function () {
    it('Drops user', async function () {
      await client.dropUser(username1, null)
      await wait(waitMs)
      try {
        await client.queryUser(username1, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error: any) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_USER)
      }
    })

    it('With policy', async function () {
      await client.dropUser(username2, policy)
      await wait(waitMs)
      try {
        await client.queryUser(username2, policy)
        // Should fail, assert failure if error is not returned.
        expect(1).to.equal(2)
      } catch (error: any) {
        expect(error).to.exist.and.have.property('code', Aerospike.status.INVALID_USER)
      }
    })

  })

  context('Negative tests', function () {

    describe('Client#changePassword()', function () {
      it('fails with invalid user', async function () {
        try {
          await client.changePassword(7 as any, 'b')
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid password', async function () {
        try {
          await client.changePassword('a', 11 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Password must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }

      })

      it('fails with invalid policy', async function () {
        try {
          await client.changePassword('a', 'b', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.changePassword('a', 'b', {}, 19 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

    })

    describe('Client#createUser()', function () {
      it('fails with invalid user', async function () {
        try {
          await client.createUser(7 as any, 'b')
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid password', async function () {
        try {
          await client.createUser('a', 11 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Password must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }

      })

      it('fails with invalid roles', async function () {
        try {
          await client.createUser('a', 'b', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("roles must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with roles array with invalid values', async function () {
        try {
          await client.createUser('a', 'b', [15 as any] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Roles object invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.createUser('a', 'b', [], 19 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.createUser('a', 'b', [], {}, 26 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })

    describe('Client#createPKIUser()', function () {
      it('fails with invalid user', async function () {
        try {
          await client.createPKIUser(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })


      it('fails with invalid roles', async function () {
        try {
          await client.createPKIUser('a', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("roles must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with roles array with invalid values', async function () {
        try {
          await client.createPKIUser('a', [15 as any] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Roles object invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.createPKIUser('a', [], 45 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.createPKIUser('a', [], {}, 19 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })

    describe('Client#createRole()', function () {
      it('fails with invalid roleName', async function () {
        try {
          await client.createRole(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })


      it('fails with invalid privileges array', async function () {
        try {
          await client.createRole('c', 25 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("privileges must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with privileges array with invalid values', async function () {
        try {
          await client.createRole('c', [25 as any] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Privileges array invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.createRole('c', [], 30 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid whitelist', async function () {
        try {
          await client.createRole('c', [], {}, {} as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("whitelist must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with whitelist array with invalid values', async function () {
        try {
          await client.createRole('c', [], {}, [10 as any])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Whitelist array invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid readQuota', async function () {
        try {
          await client.createRole('c', [], {}, [], [] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("read quota must be a number")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid writeQuota', async function () {
        try {
          await client.createRole('c', [], {}, [], 19, [] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("write quota must be a number")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.createRole('c', [], {}, [], 19, 20, [] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })

    describe('Client#dropRole()', function () {
      it('fails with invalid role name', async function () {
        try {
          await client.dropRole(7 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })


      it('fails with invalid policy', async function () {
        try {
          await client.dropRole('a', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.dropRole('a', {}, 19 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })

    describe('Client#dropUser()', function () {
      it('fails with invalid user', async function () {
        try {
          await client.dropUser(7 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })


      it('fails with invalid policy', async function () {
        try {
          await client.dropUser('a', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.dropUser('a', {}, 19 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })

    describe('Client#grantPrivileges()', function () {
      it('fails with invalid role name', async function () {
        try {
          await client.grantPrivileges(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid privileges', async function () {
        try {
          await client.grantPrivileges('a', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Privileges must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with privileges array with invalid values', async function () {
        try {
          await client.grantPrivileges('a', [25 as any] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Privileges array invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.grantPrivileges('a', [], 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.grantPrivileges('a', [], {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })


    describe('Client#grantRoles()', function () {
      it('fails with invalid role name', async function () {
        try {
          await client.grantRoles(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid privileges', async function () {
        try {
          await client.grantRoles('a', 15 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Roles must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.grantRoles('a', [], 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.grantRoles('a', [], {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   


    describe('Client#queryRole()', function () {
      it('fails with invalid role name', async function () {
        try {
          await client.queryRole(7 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.queryRole('a', 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.queryRole('a', {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   

    describe('Client#queryRoles()', function () {

      it('fails with invalid policy', async function () {
        try {
          await client.queryRoles('a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.queryRoles({}, 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   

    describe('Client#queryUser()', function () {
      it('fails with invalid user', async function () {
        try {
          await client.queryUser(7 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("User must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.queryUser('a', 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.queryUser('a', {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   

    describe('Client#queryUsers()', function () {

      it('fails with invalid policy', async function () {
        try {
          await client.queryUsers('a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.queryUsers({}, 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   

    describe('Client#revokePrivileges()', function () {
      it('fails with invalid role name', async function () {
        try {
          await client.revokePrivileges(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid privileges', async function () {
        try {
          await client.revokePrivileges('a', 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Privileges must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.revokePrivileges('a', [], 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.revokePrivileges('a', [], {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   


    describe('Client#revokeRoles()', function () {
      it('fails with invalid user name', async function () {
        try {
          await client.revokeRoles(7 as any, [])
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("user name must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid roles', async function () {
        try {
          await client.revokeRoles('a', 14 as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Roles must be an array")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with roles array with invalid values', async function () {
        try {
          await client.revokeRoles('a', [14 as any] as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Roles object invalid")
          expect(error.code).to.eql(-2)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.revokeRoles('a', [], 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.revokeRoles('a', [], {}, 'a' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   


    describe('Client#setQuotas()', function () {
      it('fails with invalid user name', async function () {
        try {
          await client.setQuotas(7 as any, 10, 10)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Role must be a string")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid readQuota', async function () {
        try {
          await client.setQuotas('a', [] as any, 20)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("read quota must be a number")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid writeQuota', async function () {
        try {
          await client.setQuotas('a', 10, 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("write quota must be a number")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid policy', async function () {
        try {
          await client.setQuotas('a', 10, 10, 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {

          expect(error.message).to.eql("Policy must be an object")
          expect(error instanceof TypeError).to.eql(true)
        }
      })

      it('fails with invalid callback', async function () {
        try {
          await client.setQuotas('a', 10, 10, {}, 'b' as any)
          // Should fail, assert failure if error is not returned.
          assert.fail("AN ERROR SHOULD BE THROWN HERE")
        } catch (error: any) {
          expect(error.message).to.eql("this.callback.bind is not a function")
          expect(error instanceof TypeError).to.eql(true)
        }
      })
    })   

  })

  describe('Client#setWhitelist()', function () {
    it('fails with invalid user name', async function () {
      try {
        await client.setWhitelist(7 as any, [])
        // Should fail, assert failure if error is not returned.
        assert.fail("AN ERROR SHOULD BE THROWN HERE")
      } catch (error: any) {

        expect(error.message).to.eql("Role must be a string")
        expect(error instanceof TypeError).to.eql(true)
      }
    })

    it('fails with invalid whitelist', async function () {
      try {
        await client.setWhitelist('a', 'b' as any)
        // Should fail, assert failure if error is not returned.
        assert.fail("AN ERROR SHOULD BE THROWN HERE")
      } catch (error: any) {

        expect(error.message).to.eql("Whitelist must be an array")
        expect(error instanceof TypeError).to.eql(true)
      }
    })

    it('fails with whitelist array with invalid values', async function () {
      try {
        await client.setWhitelist('c', [25 as any] as any)
        // Should fail, assert failure if error is not returned.
        assert.fail("AN ERROR SHOULD BE THROWN HERE")
      } catch (error: any) {

        expect(error.message).to.eql("Whitelist array invalid")
        expect(error.code).to.eql(-2)
      }
    })

    it('fails with invalid policy', async function () {
      try {
        await client.setWhitelist('a', [], 'b' as any)
        // Should fail, assert failure if error is not returned.
        assert.fail("AN ERROR SHOULD BE THROWN HERE")
      } catch (error: any) {

        expect(error.message).to.eql("Policy must be an object")
        expect(error instanceof TypeError).to.eql(true)
      }
    })

    it('fails with invalid callback', async function () {
      try {
        await client.setWhitelist('a', [], {}, 'b' as any)
        // Should fail, assert failure if error is not returned.
        assert.fail("AN ERROR SHOULD BE THROWN HERE")
      } catch (error: any) {
        expect(error.message).to.eql("this.callback.bind is not a function")
        expect(error instanceof TypeError).to.eql(true)
      }
    })
  })  


  client.dropRole(rolename3, null)
  client.dropUser(username8, policy)
  client.dropUser(username7, policy)
  client.dropUser(username6, policy)
  client.dropUser(username5, policy)
  client.dropUser(username4, policy)
  client.dropUser(username3, policy)


})