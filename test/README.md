Aerospike Nodejs Testing

The test cases are written using mocha. To install mocha
    
    $ sudo npm install -g mocha

The following node packages are required to run the test.
    
- superagent.
- expect.js

To install the above packages
    
    $ sudo npm install -g superagent
    $ sudo npm install -g expect.js

The config parameters to run the test cases are given through
config.json file. The following config informations are necessary for the
test to run.

    host : Server hostname (default : localhost)
    port : Server port (default : 3000)
    namespace : Namespace (default : test)
    set : Set name (default : demo)
    NoOfObjects : Number of objects (default : 1000)

To run the test cases,

    $ mocha <file_name>

Test Cases:

- put.js
- get.js
- batch_get.js
- select.js
- operate.js
- remove.js

Each test case has to be run individually.

Example:

    mocha put.js

