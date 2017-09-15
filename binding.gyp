{
  'targets': [
    {
      'target_name': 'aerospike-client-c',
      'type': 'none',
      'hard_dependency': 1,
      'actions': [
        {
          'action_name': 'run scripts/aerospike-client-c.sh',
          'inputs': [
          ],
          'outputs': [
            'aerospike-client-c/lib/libaerospike.a',
            'aerospike-client-c/include'
          ],
          'action': ['scripts/aerospike-client-c.sh']
        }
      ]
    },
    {
      'target_name': 'aerospike',
      'dependencies': [
        'aerospike-client-c'
      ],
      'sources': [
        'src/main/aerospike.cc',
        'src/main/client.cc',
        'src/main/config.cc',
        'src/main/events.cc',
        'src/main/operations.cc',
        'src/main/policy.cc',
        'src/main/query.cc',
        'src/main/scan.cc',
        'src/main/async.cc',
        'src/main/cluster.cc',
        'src/main/commands/apply_async.cc',
        'src/main/commands/batch_exists.cc',
        'src/main/commands/batch_get.cc',
        'src/main/commands/batch_select.cc',
        'src/main/commands/batch_read_async.cc',
        'src/main/commands/exists_async.cc',
        'src/main/commands/get_async.cc',
        'src/main/commands/info.cc',
        'src/main/commands/info_foreach.cc',
        'src/main/commands/job_info.cc',
        'src/main/commands/operate_async.cc',
        'src/main/commands/put_async.cc',
        'src/main/commands/query_async.cc',
        'src/main/commands/query_apply.cc',
        'src/main/commands/query_background.cc',
        'src/main/commands/query_foreach.cc',
        'src/main/commands/remove_async.cc',
        'src/main/commands/scan_async.cc',
        'src/main/commands/scan_background.cc',
        'src/main/commands/select_async.cc',
        'src/main/commands/truncate.cc',
        'src/main/commands/index_create.cc',
        'src/main/commands/index_remove.cc',
        'src/main/commands/udf_register.cc',
        'src/main/commands/udf_remove.cc',
        'src/main/enums/predicates.cc',
        'src/main/enums/log.cc',
        'src/main/enums/maps.cc',
        'src/main/enums/index.cc',
        'src/main/enums/policy.cc',
        'src/main/enums/status.cc',
        'src/main/enums/scanPriority.cc',
        'src/main/enums/job_status.cc',
        'src/main/enums/udf_languages.cc',
        'src/main/enums/ttl.cc',
        'src/main/util/conversions.cc',
        'src/main/util/log.cc'
      ],
      'include_dirs': [
        'aerospike-client-c/include',
        'src/include'
      ],
      'link_settings': {
        'libraries': [
          '../aerospike-client-c/lib/libaerospike.a',
          '-lz'
        ]
      },
      'variables': {
        'isnode': '<!(hash node 2> /dev/null; echo $?)',
        'isnodejs': '<!(hash nodejs 2> /dev/null; echo $?)'
      },
      'conditions': [
        ['OS=="linux"',{
          'cflags': [ '-Wall', '-g', '-Warray-bounds', '-fpermissive']
        }],
        ['OS=="mac"',{
          'xcode_settings': {
            'MACOSX_DEPLOYMENT_TARGET': '<!(sw_vers -productVersion | cut -d. -f1-2)'
          }
        }],
        ['isnode==0',{
          'include_dirs': [
            "<!(node -e \"require('nan')\")"
          ],
        }],
        ['isnodejs == 0',{
          'include_dirs': [
                "<!(nodejs -e \"require('nan')\")"
          ],
        }]
     ]
    }
  ]
}
