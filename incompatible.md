# Backward Incompatible API Changes

All notable changes to this project will be documented in this file.

## [5.0.0]

### PredicateExpression filter Replaced by new Expressions Filter
* Usage
  * New Expressions Filter

    const query = client.query(helper.namespace, helper.set)
    const queryPolicy = { filterExpression:  exp.eq(exp.binInt('a'), exp.int(9))}
    const stream = query.foreach(queryPolicy)

  * Deprecated PredicateExpression Filter

    const query = client.query(helper.namespace, helper.set)
    query.where(Aerospike.filter.equal('a', 9))
    const stream = query.foreach()

## [4.0.0]

### totalTimeout Replaced by timeout Info Policy Option
* Usage
  * New "timeout" InfoPolicy

        const subject = new Aerospike.InfoPolicy({
          timeout: 1000,
          sendAsIs: true,
          checkBounds: false
        })

  * Deprecated "totalTimeout" InfoPolicy

        const subject = new Aerospike.InfoPolicy({
          totalTimeout: 1000,
          sendAsIs: true,
          checkBounds: false
        })
