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
        'src/main/client/close.cc',
        'src/main/client/get.cc',
        'src/main/client/exists.cc',
        'src/main/client/put.cc',
        'src/main/client/select.cc',
        'src/main/client/remove.cc',
        'src/main/client/batch_get.cc',
        'src/main/client/batch_exists.cc',
        'src/main/client/operate.cc',
        'src/main/util/async.cc',
        'src/main/util/conversions.cc',
        'src/main/util/log.cc',
        'src/main/enums/log_levels.cc',
        'src/main/enums/status_codes.cc',
        'src/main/enums/operators.cc',
        'src/main/enums/policy_values.cc',
        'src/main/client/info_cluster.cc'
      ],
      'include_dirs': [
        'aerospike-client-c/include'
      ],
      'link_settings': {
        'libraries': [
          '../aerospike-client-c/lib/libaerospike.a'
        ]
      },
      'conditions': [
        ['OS=="linux"',{
          'cflags': [ '-Wall', '-Warray-bounds' ]
        }]
      ] 
    }
  ]
}
