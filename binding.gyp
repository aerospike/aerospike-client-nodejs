{
  'targets': [
    {
      'target_name': 'aerospike',
      'sources': [
        'src/main/aerospike.cc',
        'src/main/client.cc',
        'src/main/client/close.cc',
        'src/main/client/get.cc',
        'src/main/client/put.cc',
        'src/main/util/async.cc',
        'src/main/util/conversions.cc',
      ],
      'link_settings': {
          'libraries': [
              '/home/vagrant/projects/citrusleaf/aerospike-client-c/aerospike/target/Linux-x86_64/lib/libaerospike.a'
          ]
      },
      'cflags': [
        '-I/home/vagrant/projects/citrusleaf/aerospike-client-c/aerospike/target/Linux-x86_64/include'
      ]
    }
  ],

}
