1.0.55 / 2016-01-15
===================

* **Improvements**
  * Update to C Client v4.0.0.
  * Documentation updates. Thanks to @mrbar42!
  * Avoid polluting global namespace. Thanks to @mrbar42!
  * Use `standard` module to enforce coding style.
  * Add `connTimeoutMs` and `tenderInterval` client configs.

* **Fixes**
  * Fix connection issues when using V8 profiler (`node --prof`)
