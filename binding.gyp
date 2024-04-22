{
  'variables': {
    'build_arch%': '<(target_arch)',
    'conditions': [
      ['target_arch=="x64"', {
        'build_arch%': 'x86_64'
      },'OS=="linux"', {
        'build_arch%': 'aarch64'
      }]
    ]
  },
  'targets': [
    {
      'target_name': 'aerospike-core-client',
      'type': 'none',
      'hard_dependency': 1,
      'conditions': [
        ['OS!="win"', {
          'actions': [
            {
              'action_name': 'Validating Aerospike C Client dependency',
              'inputs': [],
              'conditions': [
                ['OS=="linux"',{
                  'outputs': [
                    'aerospike-client-c/target/Linux-<(build_arch)/include/aerospike/aerospike.h',
                    'aerospike-client-c/target/Linux-<(build_arch)/lib/aerospike.lib'
                  ],
                }],
                ['OS=="mac"',{
                  'outputs': [
                    'aerospike-client-c/target/Darwin-<(build_arch)/include/aerospike/aerospike.h',
                    'aerospike-client-c/target/Darwin-<(build_arch)/lib/aerospike.lib'
                  ],
                }],
              ],
              'action': [
                'scripts/validate-c-client.sh'
              ]
            }
          ]
        }],
        ['OS=="win"', {
          'actions': [
            {
              'action_name': 'Installing Aerospike C Client dependency',
              'inputs': [],
              'outputs': [
                'aerospike-client-c-output/include/aerospike/aerospike.h',
                'aerospike-client-c-output/lib/aerospike.lib'
              ],
              'action': [
                'pwsh', 'scripts/build-c-client.ps1',
                    '-Configuration', "$(ConfigurationName)",
                    '-NodeLibFile', "<(node_root_dir)/<(target_arch)/node.lib"
              ]
            }
          ]
        }],
      ]
    },
    {
      'target_name': 'aerospike',
      'dependencies': [
        'aerospike-core-client'
      ],
      'sources': [
        'src/main/aerospike.cc',
        'src/main/client.cc',
        'src/main/config.cc',
        'src/main/events.cc',
        'src/main/cdt_ctx.cc',
        'src/main/operations.cc',
        'src/main/exp_operations.cc',
        'src/main/scalar_operations.cc',
        'src/main/list_operations.cc',
        'src/main/map_operations.cc',
        'src/main/bit_operations.cc',
        'src/main/hll_operations.cc',
        'src/main/policy.cc',
        'src/main/query.cc',
        'src/main/scan.cc',
        'src/main/expressions.cc',
        'src/main/async.cc',
        'src/main/command.cc',
        'src/main/commands/apply_async.cc',
        'src/main/commands/batch_exists.cc',
        'src/main/commands/batch_get.cc',
        'src/main/commands/batch_select.cc',
        'src/main/commands/batch_read_async.cc',
        'src/main/commands/batch_remove.cc',
        'src/main/commands/batch_apply.cc',
        'src/main/commands/batch_write_async.cc',
        'src/main/commands/change_password.cc',
        'src/main/commands/exists_async.cc',
        'src/main/commands/get_async.cc',
        'src/main/commands/index_create.cc',
        'src/main/commands/index_remove.cc',
        'src/main/commands/info_any.cc',
        'src/main/commands/info_foreach.cc',
        'src/main/commands/info_host.cc',
        'src/main/commands/info_node.cc',
        'src/main/commands/job_info.cc',
        'src/main/commands/operate_async.cc',
        'src/main/commands/privilege_grant.cc',
        'src/main/commands/privilege_revoke.cc',
        'src/main/commands/put_async.cc',
        'src/main/commands/query_async.cc',
        'src/main/commands/query_apply.cc',
        'src/main/commands/query_background.cc',
        'src/main/commands/query_foreach.cc',
        'src/main/commands/query_pages.cc',
        'src/main/commands/query_role.cc',
        'src/main/commands/query_roles.cc',
        'src/main/commands/query_user.cc',
        'src/main/commands/query_users.cc',
        'src/main/commands/role_create.cc',
        'src/main/commands/role_drop.cc',
        'src/main/commands/role_grant.cc',
        'src/main/commands/role_revoke.cc',
        'src/main/commands/role_set_quotas.cc',
        'src/main/commands/role_set_whitelist.cc',
        'src/main/commands/remove_async.cc',
        'src/main/commands/scan_async.cc',
        'src/main/commands/scan_background.cc',
        'src/main/commands/scan_pages.cc',
        'src/main/commands/select_async.cc',
        'src/main/commands/truncate.cc',
        'src/main/commands/user_create.cc',
        'src/main/commands/user_drop.cc',
        'src/main/commands/udf_register.cc',
        'src/main/commands/udf_remove.cc',
        'src/main/enums/predicates.cc',
        'src/main/enums/bitwise_enum.cc',
        'src/main/enums/hll_enum.cc',
        'src/main/enums/maps.cc',
        'src/main/enums/lists.cc',
        'src/main/enums/index.cc',
        'src/main/enums/policy_enum.cc',
        'src/main/enums/status.cc',
        'src/main/enums/job_status.cc',
        'src/main/enums/udf_languages.cc',
        'src/main/enums/ttl.cc',
        'src/main/enums/config_enum.cc',
        'src/main/enums/exp_enum.cc',
        'src/main/enums/batch_type.cc',
        'src/main/enums/query_duration.cc',
        'src/main/enums/privilege_code.cc',
        'src/main/enums/exp_read_flags.cc',
        'src/main/enums/exp_write_flags.cc',
        'src/main/stats.cc',
        'src/main/util/conversions.cc',
        'src/main/util/conversions_batch.cc',
        'src/main/util/log.cc',
      ],
      'configurations': {
        'Release': {
            "cflags": [
              "-Wno-deprecated-declarations -Wno-cast-function-type",
            ],
            "xcode_settings": {
              "OTHER_CFLAGS": [
                "-Wno-deprecated-declarations",
              ]
            },
            'msvs_disabled_warnings': [4996],
          }
      },
      'conditions': [
        ['OS=="linux"',{
          'libraries': [
            '../aerospike-client-c/target/Linux-<(build_arch)/lib/libaerospike.a',
            '-lz'
          ],
          'defines': [
            'AS_USE_LIBUV'
          ],
          'include_dirs': [
            'aerospike-client-c/target/Linux-<(build_arch)/include',
            'aerospike-client-c/src/include',
            'src/include',
            "<!(node -e \"require('nan')\")",
          ],          
          'cflags': [ '-Wall', '-g', '-Warray-bounds', '-fpermissive', '-fno-strict-aliasing', '-fPIC'],
        }],
        ['OS=="mac"',{
          'libraries': [
            '../aerospike-client-c/target/Darwin-<(build_arch)/lib/libaerospike.a',
            '-lz'
          ],
          'defines': [
            'AS_USE_LIBUV'
          ],
          'include_dirs': [
            'aerospike-client-c/target/Darwin-<(build_arch)/include',
            'aerospike-client-c/src/include',
            'src/include',
            "<!(node -e \"require('nan')\")",
          ],          
          'cflags': [ '-Wall', '-g', '-Warray-bounds', '-fpermissive', '-fno-strict-aliasing', '-fPIC'],
          'xcode_settings': {
            'MACOSX_DEPLOYMENT_TARGET': '<!(sw_vers -productVersion | cut -d. -f1-2)'
          },
        }],
        ['OS=="win"', {
          'libraries': [
            '../aerospike-client-c-output/lib/aerospike.lib',
            '../aerospike-client-c-output/lib/pthreadVC2.lib',
          ],
          'defines': [
            'AS_USE_LIBUV',
            'AS_SHARED_IMPORT',
            '_TIMESPEC_DEFINED',
          ],
          'include_dirs': [
            'aerospike-client-c-output/include',
            'src/include',
            "<!(node -e \"require('nan')\")",
          ],
          'msvs_settings': {
            'VCCLCompilerTool': {
              'DisableSpecificWarnings': ['4200']
            }
          },
        }],
      ]
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [ "<(module_name)" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/<(module_name).node" ],
          "destination": "<(module_path)"
        }
      ]
    }
  ]
}
