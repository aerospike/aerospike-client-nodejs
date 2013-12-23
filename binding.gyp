{
  'targets': [
    {
      'target_name': 'aerospike',
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
        'src/main/enums/error_codes.cc',
        'src/main/enums/policy_enums.cc',
        'src/main/enums/operators.cc',
		'src/main/enums/log_level.cc',
        'src/main/client/info.cc',
        'src/main/client/info_cluster.cc'
      ],
     'link_settings': {
          'libraries': [
              '-laerospike'
       ]
      }
    }
  ]
}
