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
        'src/main/client/apply_async.cc',
        'src/main/client/batch_exists.cc',
        'src/main/client/batch_get.cc',
        'src/main/client/batch_select.cc',
        'src/main/client/batch_read_async.cc',
        'src/main/client/cluster.cc',
        'src/main/client/exists_async.cc',
        'src/main/client/get_async.cc',
        'src/main/client/info.cc',
        'src/main/client/info_foreach.cc',
        'src/main/client/job_info.cc',
        'src/main/client/operate_async.cc',
        'src/main/client/put_async.cc',
        'src/main/client/query_async.cc',
        'src/main/client/query_apply.cc',
        'src/main/client/query_background.cc',
        'src/main/client/query_foreach.cc',
        'src/main/client/remove_async.cc',
        'src/main/client/scan_async.cc',
        'src/main/client/scan_background.cc',
        'src/main/client/select_async.cc',
        'src/main/client/truncate.cc',
        'src/main/client/index_create.cc',
        'src/main/client/index_remove.cc',
        'src/main/client/udf_register.cc',
        'src/main/client/udf_remove.cc',
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
