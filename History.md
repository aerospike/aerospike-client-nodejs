Head
==================

* **Improvements**
  * Optionally read hosts config from `AEROSPIKE_HOSTS` env variable. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Collect TPS stats in benchmarks.
  * Update Travis CI config to test latest Node.js release & add badge. Thanks to [@revington](https://github.com/revington)!

1.0.56 / 2016-02-11
===================

* **Improvements**
  * Support `operator.incr()` operation on double values.
  * Refactor test suite to improve performance and maintainability.

* **Fixes**
  * Fix segfault when `client.connect()` is called without callback function.

* **Documentation**
  * Fix wrong method name in llist documentation. Thanks to [@srinivasiyer](https://github.com/srinivasiyer)!
  * Update build dependencies for CentOS/RHEL 6.
  * Clarify supported data types and (lack of) automatic data type conversions.
  * Update supported Node.js versions.

1.0.55 / 2016-01-15
===================

* **Improvements**
  * Update to C Client v4.0.0.
  * Documentation updates. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Avoid polluting global namespace. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Use `standard` module to enforce coding style.
  * Add `connTimeoutMs` and `tenderInterval` client configs.

* **Fixes**
  * Fix connection issues when using V8 profiler (`node --prof`)
