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
        'src/main/client/batch_exists.cc',
        'src/main/client/batch_get.cc',
        'src/main/client/close.cc',
        'src/main/client/connect.cc',
        'src/main/client/execute.cc',
        'src/main/client/exists.cc',
        'src/main/client/get.cc',
        'src/main/client/info.cc',
        'src/main/client/operate.cc',
        'src/main/client/put.cc',
        'src/main/client/query.cc',
        'src/main/client/query_foreach.cc',
        'src/main/client/query_info.cc',
        'src/main/client/remove.cc',
        'src/main/client/select.cc',
        'src/main/client/sindex_create.cc',
        'src/main/client/sindex_remove.cc',
        'src/main/client/udf_register.cc',
        'src/main/client/udf_remove.cc',
        'src/main/enums/filters.cc',
        'src/main/enums/log.cc',
        'src/main/enums/indexTypes.cc',
        'src/main/enums/operators.cc',
        'src/main/enums/policy.cc',
        'src/main/enums/status.cc',
        'src/main/enums/scanPriority.cc',
        'src/main/enums/scanStatus.cc',
        'src/main/enums/udf_languages.cc',
        'src/main/util/async.cc',
        'src/main/util/conversions.cc',
        'src/main/util/log.cc'
      ],
      'include_dirs': [
        'aerospike-client-c/include',
        'aerospike-client-c/include/ck',
		'src/include'
      ],
      'link_settings': {
        'libraries': [
          '../aerospike-client-c/lib/libaerospike.a'
        ]
      },
	  'variables': {
		'uselua': '<!(echo $USELUA)'
	  },
      'conditions': [
        ['OS=="linux"',{
          'cflags': [ '-Wall', '-g', '-Warray-bounds', '-fpermissive']
        }],
		['uselua==1',{
		  'libraries': ['-llua']
		}]
      ] 
    }
  ]
}
