import * as Buffer from "buffer";
import { EventEmitter, Stream } from "stream";

/**
 * Codes representing each of the various scalar operation types.
 */
export enum ScalarOperations {
    /**
     * Write operation code.
     */
    WRITE,
    /**
     * Read operation code.
     */
    READ,
    /**
     * Increment operation code.
     */
    INCR,
    /**
     * Prepend operation code.
     */
    PREPEND,
    /**
     * Append operation code.
     */
    APPEND,
    /**
     * Touch operation code.
     */
    TOUCH,
    /**
     * Delete operation code.
     */
    DELETE
}

/* TYPES */

/**
 * Represents a basic value in an Aerospike bin.
 */
export type PartialAerospikeBinValue = null | undefined | boolean | string | number | Double | BigInt | Buffer | GeoJSON | Array<PartialAerospikeBinValue> | object;
/**
 * Represents an object containing one or more `AerospikeBinValues` with associated string keys.
 */
export type AerospikeBins = {
    [key: string]: AerospikeBinValue
};

/**
 * Represents a complete Aerospike bin value.  Bin values can included nested lists and maps.
 */
export type AerospikeBinValue = PartialAerospikeBinValue | PartialAerospikeBinValue[] | Record<string, PartialAerospikeBinValue>;

/**
 * Represents an Aerospike Expression. Contains an op number which specifiies the operation type, and properties with values relevant to the operation.
 */
export type AerospikeExp = { op: number, [key: string]: any }[]


/**
 * Contains geolocation information releavant to the GEOJSON Aerospike type.
 */
export type GeoJSONType = {
    type: string,
    coordinates: NumberArray
}

/**
 * Represents an array which can contain number or nested number array.
 */
export type NumberArray = number | NumberArray[];

/**
 * For internal use only.
 */
export var _transactionPool = any;

/**
 * Callback used to return results in synchronous Aerospike database operations
 */
export type TypedCallback<T> = (error?: AerospikeError, result?: T) => void;


/* CLASSES */

/**
 * A record with the Aerospike database consists of one or more record "bins"
 * (name-value pairs) and meta-data, including time-to-live and generation; a
 * record is uniquely identified by it's key within a given namespace.
 *
 * @example <caption>Writing a new record with 5 bins while setting a record TTL.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let bins = {
 *   int: 123,
 *   double: 3.1415,
 *   string: 'xyz',
 *   bytes: Buffer.from('hello world!'),
 *   list: [1, 2, 3],
 *   map: {num: 123, str: 'abc', list: ['a', 'b', 'c']}
 * }
 * let meta = {
 *   ttl: 386400 // 1 day
 * }
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     return client.put(key, bins, meta)
 *     .then(() => {
 *       client.get(key)
 *       .then((record) => {
 *         console.log(record)
 *         client.close()
 *       })
 *       .catch(error => {
 *         console.log(record)
 *         client.close()
 *         return Promise.reject(error)
 *       })
 *     })
 *     .catch(error => {
 *       client.close()
 *       return Promise.reject(error)
 *     })
 *   })
 *   .catch(error => console.error('Error:', error))
 *
 * @example <caption>Fetching a single database record by it's key.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     client.put(key, {tags : ['blue', 'pink']})
 *     .then(() => {
 *       client.get(key)
 *       .then(record => {
 *         console.info('Key:', record.key)
 *         console.info('Bins:', record.bins)
 *         console.info('TTL:', record.ttl)
 *         console.info('Gen:', record.gen)
 *       })
 *       .then(() => client.close())
 *       .catch(error => {
 *         client.close()
 *         return Promise.reject(error)
 *       })
 *     })
 *     .catch(error => {
 *       client.close()
 *       return Promise.reject(error)
 *     })
 *   })
 *   .catch(error => console.error('Error:', error))
 *
 * @since v5.0.0
 *
 * @example <caption>Fetching a batch of records.</caption>
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0})
 *
 *    }
 * }
 *
 * var batchRecords = [
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key1'), bins: ['i', 's'] },
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key2'), readAllBins: true },
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key3'),
 *     ops:[
 *          op.read('blob-bin')
 *         ]}
 * ]
 * Aerospike.connect(config, function (error, client) {
 *   if (error) throw error
 *   client.batchRead(batchRecords, function (error, results) {
 *     if (error) throw error
 *     results.forEach(function (result) {
 *       console.log(result)
 *
 *     })
 *     client.close()
 *   })
 *
 * })
 *
 * @since v5.0.0
 *
 * @example <caption>Applying  functions on batch of records.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *
 *    }
 * }
 *
 * const batchType = Aerospike.batchType
 * var batchRecords = [
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key1'),
 *     bins: ['i', 's'] },
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key2'),
 *     readAllBins: true },
 *   { type: batchType.BATCH_APPLY,
 *     key: new Aerospike.Key('test', 'demo', 'key4'),
 *     policy: new Aerospike.BatchApplyPolicy({
 *         filterExpression: exp.eq(exp.binInt('i'), exp.int(37)),
 *         key: Aerospike.policy.key.SEND,
 *         commitLevel: Aerospike.policy.commitLevel.ALL,
 *         durableDelete: true
 *       }),
 *     udf: {
 *          module: 'udf',
 *          funcname: 'function1',
 *          args: [[1, 2, 3]]
 *          }
 *   },
 *   { type: batchType.BATCH_APPLY,
 *     key: new Aerospike.Key('test', 'demo', 'key5'),
 *     policy: new Aerospike.BatchApplyPolicy({
 *         filterExpression: exp.eq(exp.binInt('i'), exp.int(37)),
 *         key: Aerospike.policy.key.SEND,
 *         commitLevel: Aerospike.policy.commitLevel.ALL,
 *         durableDelete: true
 *       }),
 *     udf: {
 *          module: 'udf',
 *          funcname: 'function2',
 *          args: [[1, 2, 3]]
 *          }
 *    }
 * ]
 * Aerospike.connect(config, function (error, client) {
 *   if (error) throw error
 *   client.batchApply(batchRecords, udf, function (error, results) {
 *     if (error) throw error
 *     results.forEach(function (result) {
 *       console.log(result)
 *     })
 *   })
 * })
 */
export class AerospikeRecord {

   /**
     * Unique record identifier.
     *
     * @type {Key}
     */
    public key: Key;
    /**
     * Map of bin name to bin value.
     *
     * @type {AerospikeBins}
     */
    public bins: AerospikeBins;

    /**
     * The record's remaining time-to-live in seconds before it expires.
     *
     * @type {number}
     */
    public ttl: number;
    /**
     * Record modification count.
     *
     * @type {number}
     */
    public gen: number;

    /**
     * Construct a new Aerospike Record instance.
     */
    constructor(key: KeyOptions, bins: AerospikeBins, metadata?: RecordMetadata);
}

/**
 * Multi-record transaction (MRT) class. Each command in the MRT must use the same namespace.
 *
 * note: By default, open transactions are destroyed when the final client in a process is closed.
 * If you need your transaction to persist after the last client has been closed, provide `false` for the
 * destroy Transactions argument in {@link Client#close}.  For more information on memory management, see {@link Transaction.destroyAll}.
 *
 * @example <caption>Commit a simple transaction.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let bins = {
 *   int: 123,
 *   double: 3.1415,
 *   string: 'xyz',
 *   bytes: Buffer.from('hello world!'),
 *   list: [1, 2, 3],
 *   map: {num: 123, str: 'abc', list: ['a', 'b', 'c']}
 * }
 * let meta = {
 *   ttl: 386400 // 1 day
 * }
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * let policy = {
 *   txn: mrt
 * };
 * ;(async () => {
 *    let client = await Aerospike.connect(config)

 *    let mrt = new Aerospike.Transaction()
 *

 *
 *    await client.put(key, bins, meta, policy)
 *
 *    let get_result = await client.get(key1, policy)
 *
 *    let result = await client.commit(mrt)
 *    await client.close()
 * })();
 *
 * @example <caption>Abort a transaction.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let key1 = new Aerospike.Key('test', 'demo', 'myKey')
 * let key2 = new Aerospike.Key('test', 'demo', 'myKey')
 * 
 * let record1 = {abc: 123}
 * let record2 = {def: 456}
 * 
 * ;(async () => {
 *   let client = await Aerospike.connect(config)
 *   
 *   const policy = {
 *        txn: mrt
 *    }
 *
 *    await client.put(key4, record2, meta, policy)
 *
 *    const policyRead = {
 *        txn: mrt
 *    }
 *
 *    let get_result = await client.get(key1, policy) // Will reflect the new value recently put.
 *
 *    await client.put(key2, record2, meta, policy)
 *
 *    let result = await client.abort(mrt)
 *
 *    get_result = await client.get(key4) // Will reset to the value present before transaction started.
 *
 *    get_result = await client.get(key5) // Will reset to the value present before transaction started.
 * 
 *    await client.close()
 * })();
 *
 * @since v6.0.0
 */
export class Transaction {
    /**
     * Construct a new Aerospike Transaction instance.
     */
    public constructor(reads_capacity?: number, writes_capacity?: number);

    /**
     * Transaction state enumeration
     */
    static state = {
        /**
         * Transaction is still open.
         */
        OPEN,
        /**
         * Transaction was verified.
         */

        VERIFIED,
        /**
         * Transaction was commited.
         */
        COMMITTED,

        /**
         * Transaction was aborted.
         */
        ABORTED,
    }


    /**
     * Default multi-record transaction capacity values.
     */
    static capacity  = {
        /**
         * Contains the default reeadDefault for aerospike.Transaction
         */
        READ_DEFAULT,
        /**
         * Contains the default writeCapacity for aerospike.Transaction
         */

        WRITE_DEFAULT,
    }

    private prepareToClose(): void;
    private close(): void;
    /**
     * Destroys all open transactions
     *
     * @remarks
     * 
     * 
     * 
     * Use of this API is only necessary when the client is closed with
     * the destroyTransactions parameter set is set to false.
     * See example below for usage details.
     * 
     * To avoid using this API, close the final connected client in the process
     * with destroyTransactions set to true (default is true), and the transaction will be destroyed automatically.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     let mrt1 = new Aerospike.Transaction()
     *     let client = await Aerospike.connect(config)
     *     client.close(false, true) // `destroyTransactions is true`, mrt1 is no longer usable.
     * 
     *     let mrt2 = new Aerospike.Transaction()
     *     client = await Aerospike.connect(config)
     *     client.close(false, true) // `destroyTransactions is false`, mrt2 can still be used.
     *
     *     // In order to properly manage the memory at this point, do one of two things before the process exits:
     * 
     *     // 1: call destroyAll() to destroy all outstanding trnasactions from this process.
     *     mrt1.destroyAll()
     * 
     *     // 2: reopen and close the final connected client with destroyTransactions
     *     // client = await Aerospike.connect(config)
     *     // client.close() // Default will destory the transactions
     *     
     * })();
     * 
     * @since v6.0.0
     */
    public destroyAll(): void;
    /**
     * Get ID for this transaction
     *
     * @returns  MRT ID
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let id = mrt.getId() 
     * })();
     * 
     * @since v6.0.0
     */
    public getId(): number;

    /**
     * Get inDoubt status for this transaction.
     *
     * @returns MRT inDoubt status
     * 
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let inDoubt = mrt.getInDoubt() 
     * })();
     * 
     * @since v6.0.0
     */
    public getInDoubt(): boolean;
    /**
     *
     * Gets the expected number of record reads in the MRT. Minimum value is 16.
     *
     * @returns number of records reads in the MRT.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let readsCapacity = mrt.getReadsCapacity() 
     *     console.log(readsCapacity) // 128
     * })();
     *
     * @since v6.0.0
     */  
    public getReadsCapacity(): number;
    /**
     *
     * Gets the current state of the MRT.
     *
     * @returns MRT timeout in seconds
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let state = mrt.getState()
     *     
     * })();
     *
     */  
    public getState(): number;
    /**
     *
     * Gets the current MRT timeout value.
     *
     * @returns MRT timeout in seconds
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let timeout = mrt.getTimeout() 
     * })();
     *
     * @since v6.0.0
     */  
    public getTimeout(): number;
    /**
     *
     * Gets the expected number of record reads in the MRT. Minimum value is 16.
     *
     * @returns number of records reads in the MRT.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     let writesCapacity = mrt.getWritesCapacity() 
     *     console.log(writesCapacity) // 128
     * })();
     *
     * @since v6.0.0
     */  
    public getWritesCapacity(): number;
    /**
     *
     * Set MRT timeout in seconds. The timer starts when the MRT monitor record is created. This occurs when the first command in the MRT is executed. 
     * 
     * If the timeout is reached before a commit or abort is called, the server will expire and rollback the MRT.
     * 
     * If the MRT timeout is zero, the server configuration mrt-duration is used. The default mrt-duration is 10 seconds.
     *
     * @param timeout - MRT timeout in seconds
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let mrt = new Aerospike.Transaction()
     *     mrt.setTimeout(5) // Set timeout for 5 seconds!
     *     
     *     console.log(mrt.getTimeout()) // 5
     * })();
     *
     */  
    public setTimeout(timeout: number): void;
}

/**
 * Multi-record transaction abort status code.
 */
export enum abortStatus {
    /**
     * Abort succeeded.
     */
    OK,

    /**
     * Transaction has already been committed.
     */
    ALREADY_COMMITTED,
    /**
     * Transaction has already been aborted.
     */
    ALREADY_ABORTED,
    /**
     * Client roll back abandoned. Server will eventually abort the transaction.
     */
    ROLL_BACK_ABANDONED,

    /**
     * Transaction has been rolled back, but client transaction close was abandoned.
     * Server will eventually close the transaction.
     */
    CLOSE_ABANDONED
}


/**
 * Multi-record transaction commit status code.
 */
export enum commitStatus {
    /**
     * Commit succeeded.
     */
    OK,

    /**
     * Transaction has already been committed.
     */
    ALREADY_COMMITTED,
    /**
     * Transaction has already been aborted.
     */
    ALREADY_ABORTED,
    /**
     * Transaction verify failed. Transaction will be aborted.
     */
    VERIFY_FAILED,

    /**
     * Transaction mark roll forward abandoned. Transaction will be aborted when error is not in doubt.
     * If the error is in doubt (usually timeout), the commit is in doubt.
     */
    MARK_ROLL_FORWARD_ABANDONED,

    /**
     * Client roll forward abandoned. Server will eventually commit the transaction.
     */
    ROLL_FORWARD_ABANDONED,

    /**
     * Transaction has been rolled forward, but client transaction close was abandoned.
     * Server will eventually close the transaction.
     */
    CLOSE_ABANDONED
}




/**
 * In the Aerospike database, each record (similar to a row in a relational database) stores
 * data using one or more bins (like columns in a relational database). The major difference
 * between bins and RDBMS columns is that you don't need to define a schema. Each record can
 * have multiple bins. Bins accept the data types listed {@link  https://docs.aerospike.com/apidocs/nodejs/#toc4__anchor|here}.
 *
 * For information about these data types and how bins support them, see {@link https://docs.aerospike.com/server/guide/data-types/scalar-data-types|this}.
 *
 * Although the bin for a given record or object must be typed, bins in different rows do not
 * have to be the same type. There are some internal performance optimizations for single-bin namespaces.
 *
 */
export class Bin {
    /**
     * Construct a new Aerospike Bin instance.
     */
    public constructor(name: string, value: AerospikeBinValue, mapOrder?: maps.order);
    /**
     * Bin name.
     */
    name: string;
    /**
     * Bin name.
     */
    value: AerospikeBinValue;
}

export class BatchResult {
    /**
     * Construct a new BatchResult instance.
     */
    public constructor(status: typeof statusNamespace[keyof typeof statusNamespace], record: AerospikeRecord, inDoubt: boolean);
    /**
     * Database operation status code assoicated with the batch result.
     */  
    status: typeof statusNamespace[keyof typeof statusNamespace];
    /**
     * Aerospike Record result from a batch operation.
     */
    record: AerospikeRecord;
    /**
     * It is possible that a write transaction completed even though the client
     * returned this error. This may be the case when a client error occurs
     * (like timeout) after the command was sent to the server.
     */
    inDoubt: boolean;

}

/**
 * Aerospike Query operations perform value-based searches using
 * secondary indexes (SI). A Query object, created by calling {@link Client#query},
 * is used to execute queries on the specified namespace and set (optional).
 * Queries can return a set of records as a {@link RecordStream} or be
 * processed using Aeorspike User-Defined Functions (UDFs) before returning to
 * the client.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/query.html" title="Aerospike Queries">&uArr;Queries</a>
 * in the Aerospike technical documentation.
 *
 * To scan _all_ records in a database namespace or set, it is more efficient
 * to use {@link Scan operations}, which provide more fine-grained control over
 * execution priority, concurrency, etc.
 *
 * #### SI Filters
 *
 * With a SI, the following queries can be made:
 *
 * - [Equal query]{@link filter.equal} against string or
 *   numeric indexes
 * - [Range query]{@link filter.range} against numeric
 *   indexes
 * - [Point-In-Region query]{@link filter.geoWithinGeoJSONRegion}
 *   or [Region-Contain-Point query]{@link filter.geoContainsGeoJSONPoint} against geo indexes
 *
 * See {@link filter} for a list of all supported secondary
 * index filter.
 *
 * Before a secondary index filter can be applied, a SI needs to be
 * created on the bins which the index filter matches on. Using the Node.js
 * client, a SI can be created using {@link Client#createIndex}.
 *
 * Currently, only a single SI index filter is supported for
 * each query. To do more advanced filtering, a expressions can be
 * applied to the query using policy (see below). Alternatively, User-Defined Functions
 * (UDFs) can be used to further process the query results on the server.
 *
 * Previously, predicate filtering was used to perform secondary index queries.
 * SI filter predicates have been deprecated since server 5.2, and obsolete since
 * server 6.0.
 *
 * For more information about Predicate Filtering, please refer to the <a
 * href="https://www.aerospike.com/docs/guide/predicate.html">&uArr;Predicate
 * Filtering</a> documentation in the Aerospike Feature Guide.
 *
 * #### Selecting Bins
 *
 * Using {@link Query#select} it is possible to select a subset of bins which
 * should be returned by the query. If no bins are selected, then the whole
 * record will be returned. If the {@link Query#nobins} property is set to
 * <code>true</code> the only the record meta data (ttl, generation, etc.) will
 * be returned.
 *
 * #### Executing a Query
 *
 * A query is executed using {@link Query#foreach}. The method returns a {@link
 * RecordStream} which emits a <code>data</code> event for each record returned
 * by the query. The query can be aborted at any time by calling
 * {@link RecordStream#abort}.
 *
 * #### Applying User-Defined Functions
 *
 * User-defined functions (UDFs) can be used to filter, transform, and
 * aggregate query results. Stream UDFs can process a stream of data by
 * defining a sequence of operations to perform. Stream UDFs perform read-only
 * operations on a collection of records. Use {@link Query#setUdf} to set the
 * UDF parameters (module name, function name and optional list of arguments)
 * before executing the query using {@link Query#foreach}.
 *
 * The feature guides on
 * <a href="http://www.aerospike.com/docs/guide/udf.html">&uArr;User-Defined Functions</a> and
 * <a href="http://www.aerospike.com/docs/guide/stream_udf.html">&uArr;Stream UDFs</a>
 * contain more detailed information and examples.
 *
 * #### Query Aggregation using Stream UDFs
 *
 * Use Aerospike Stream UDFs to aggregate query results using {@link
 * Query#apply}. Aggregation queries work similar to a MapReduce system and
 * return a single result value instead of stream of records. Aggregation
 * results can be basic data types (string, number, byte array) or collection
 * types (list, map).
 *
 * Please refer to the technical documentation on
 * <a href="http://www.aerospike.com/docs/guide/aggregation.html">&uArr;Aggregation</a>
 * for more information.
 *
 * #### Executing Record UDFs using Background Queries
 *
 * Record UDFs perform operations on a single record such as updating records
 * based on a set of parameters. Using {@link Query#background} you can run a
 * Record UDF on the result set of a query. Queries using Records UDFs are run
 * in the background on the server and do not return the records to the client.
 *
 * For additional information please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * #### Query pagination
 *
 * Query pagination allows for queries return records in pages rather than all at once.
 * To enable query pagination, the query property {@link paginate} must be true
 * and the previously stated query property {@link Query.maxRecords} must be set to a
 * nonzero positive integer in order to specify a maximum page size.
 *
 * When a page is complete, {@link RecordStream} event {@link  RecordStream#on 'error'} will
 * emit a {@link Query#queryState} object containing a serialized version of the query.
 * This serialized query, if be assigned back to {@link Query#queryState}, allows the query
 * to retrieve the next page of records in the query upon calling {@link Query#foreach}.
 * If {@link Query#queryState}  is undefined, pagination is not enabled or the query has completed.
 * If {@link RecordStream#on 'error'} emits an <code>undefined</code> object, either {@link paginate}
 * is not <code>true</code>, or the query has successfully returned all the specified records.
 *
 * For additional information and examples, please refer to the {@link paginate} section
 * below.
 *
 * @see {@link Client#query} to create new instances of this class.
 * 
 * @example
 *
 * const Aerospike = require('aerospike')
 * const namespace = 'test'
 * const set = 'demo'
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var index = {
 *     ns: namespace,
 *     set: set,
 *     bin: 'tags',
 *     index: 'tags_idx',
 *     type: Aerospike.indexType.LIST,
 *     datatype: Aerospike.indexDataType.STRING
 *   }
 *   client.createIndex(index, (error, job) => {
 *     if (error) throw error
 *     job.waitUntilDone((error) => {
 *       if (error) throw error
 *
 *       var query = client.query('test', 'demo')
 *       const queryPolicy = { filterExpression: exp.keyExist('uniqueExpKey') }
 *       query.select('id', 'tags')
 *       query.where(Aerospike.filter.contains('tags', 'green', Aerospike.indexType.LIST))
 *       var stream = query.foreach(queryPolicy)
 *       stream.on('error', (error) => {
 *         console.error(error)
 *         throw error
 *       })
 *       stream.on('data', (record) => {
 *         console.info(record)
 *       })
 *       stream.on('end', () => {
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
export class Query {
    /**
     * Aerospike Client Instance
     */
    public client: Client;
    /**
     * Namespace to query.
     */
    public ns: string;
    /**
     * Name of the set to query.
     */
    public set: string;
    /**
     * Filters to apply to the query.
     *
     * *Note:* Currently, a single index filter is supported. To do more
     * advanced filtering, you need to use a user-defined function (UDF) to
     * process the result set on the server.
     */
    public filters: filter.SindexFilterPredicate[];
    /**
     * List of bin names to be selected by the query. If a query specifies bins to
     * be selected, then only those bins will be returned. If no bins are
     * selected, then all bins will be returned (unless {@link Query#nobins} is
     * set to `true`).
     */
    public selected: string[];
    /**
     * If set to `true`, the query will return only meta data, and exclude bins.
     */
    public nobins: boolean;
    /**
     * User-defined function parameters to be applied to the query executed using
     * {@link Query#foreach}.
     */
    public udf: UDF;
    /**
     * Approximate number of records to return to client.
     *
     * When {@link paginate} is <code>true</code>,
     * then maxRecords will be the page size if there are enough records remaining in the query to fill the page size.
     *
     * When {@link paginate} is <code>false</code>, this number is divided by the number of nodes involved in the scan,
     * and actual number of records returned may be less than maxRecords if node record counts are small and unbalanced across nodes.
     */
    public maxRecords?: number;
    /**
     * Specifies operations to be executed when {@link operate} is called.
     */
    public ops?: operations.Operation[];
    /**
     * If set to <code>true</code>, paginated queries are enabled. In order to receive paginated
     * results, the {@link maxRecords} property must assign a nonzero integer value.
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#foreach}.</caption>
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType;.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 10})
     *     do {
     *       const stream = query.foreach()
     *       stream.on('error', (error) => { throw error })
     *       stream.on('data', (record) => {
     *         console.log(record.bins)
     *       })
     *       await new Promise(resolve => {
     *         stream.on('end', (queryState) => {
     *           query.queryState = queryState
     *           resolve()
     *         })
     *       })
     *     } while (query.queryState !== undefined)
     *
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#results}</caption>
     *
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 11})
     *
     *     let allResults = []
     *     let results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *
     *     results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *     results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *     console.log("Records returned in total: " + allResults.length)  // Should be 30 records
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */
    public paginate?: boolean;
    /**
     * Used when querying partitions to manage the query. For internal use only.
     */
    public partFilter?: PartFilter;
    /**
     * If set to <code>true</code>, the query will return records belonging to the partitions specified
     * in {@link Query#partFilter}.
     */
    public pfEnabled?: boolean;
    /**
     * The time-to-live (expiration) of the record in seconds.
     * 
     * There are also special values that can be set in the record TTL  For details
     *
     * Note that the TTL value will be employed ONLY on background query writes.
     */
    public ttl: number;
    /**
     * If set to a valid serialized query, calling {@link Query.foreach} will allow the next page of records to be queried while preserving the progress
     * of the previous query. If set to <code>null</code>, calling {@link Query.foreach} will begin a new query.
     */
    public queryState?: number[];
    /**
     * Construct a Query instance.
     * 
     * @param client - A client instance.
     * @param ns - The namescape.
     * @param set - The name of a set.
     * @param options - Query options.
     *      * 
     */
    constructor(client: Client, ns: string, set: string, options?: QueryOptions | null);
    /**
     *
     * Checks compiliation status of a paginated query.
     *
     * If <code>false</code> is returned, there are no more records left in the query, and the query is complete.
     * If <code>true</code> is returned, calling {@link Query#foreach} will continue from the state specified by {@link Query#queryState}.
     *
     * @returns `true` if another page remains.
     */
    public hasNextPage(): boolean;
    /**
     * Sets {@link Query#queryState} to the value specified by the <code>state</code> argument.
     *
     * setter function for the {@link Query#queryState} member variable.
     *
     * @param state - serialized query emitted from the {@link RecordStream#on 'error'} event.
     */
    public nextPage(state: number[]): void;
    /**
     * Specify the begin and count of the partitions
     * to be queried by the Query foreach op.
     *
     * If a Query specifies partitions begin and count,
     * then only those partitons will be queried and returned.
     * If no partitions are specified,
     * then all partitions will be queried and returned.
     *
     * @param begin - Start partition number to query.
     * @param count - Number of partitions from the start to query.
     * @param digest - Start from this digest if it is specified.
     */
    public partitions(begin: number, count: number, digest?: Buffer | null): void;
    /**
     * Specify the names of bins to be selected by the query.
     *
     * If a query specifies bins to be selected, then only those bins
     * will be returned. If no bins are selected, then all bins will be returned.
     * (Unless {@link Query.nobins} is set to <code>true</code>.)
     *
     * @param bins - List of bin names or multiple bin names to return.
     * @return {void}
     */
    public select(bins: string[]): void;
    /**
     *
     * @param bins - A spread of bin names to return.
     * @return {void}
     */
    public select(...bins: string[]): void;
    /**
     * Applies a SI to the query.
     *
     * Use a SI to limit the results returned by the query.
     * This method takes SI created using the {@link
     * filter | filter module} as argument.
     *
     * @param predicate - The index filter to
     * apply to the function.
     *
     * @example <caption>Applying a SI filter to find all records
     * where the 'tags' list bin contains the value 'blue':</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * Aerospike.connect().then(client => {
     *   let query = client.query('test', 'demo')
     *
     *   let tagsFilter = Aerospike.filter.contains('tags', 'blue', Aerospike.indexType.LIST)
     *   query.where(tagsFilter)
     *
     *   let stream = query.foreach()
     *   stream.on('data', record => { console.info(record.bins.tags) })
     *   stream.on('error', error => { throw error })
     *   stream.on('end', () => client.close())
     * })
     *
     * @see {@link filter} to create SI filters.
     */
    public where(predicate: filter.SindexFilterPredicate): void;
    private setSindexFilter(sindexFilter: filter.SindexFilterPredicate): void;
    /**
     *
     * Set user-defined function parameters to be applied to the query.
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     */
    public setUdf(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null): void;
    /**
     * Asynchronously executes the query and returns each result item
     * through the stream.
     *
     * *Applying a Stream UDF to the query results*
     *
     * A stream UDF can be applied to the query to filter, transform and aggregate
     * the query results. The UDF parameters need to be set on the query object
     * using {@link Query#setUdf} before the query is executed.
     *
     * If a UDF is applied to the query, the resulting stream will return
     * the results of the UDF stream function. Record meta data and the record keys
     * will not be returned.
     *
     * For aggregation queries that return a single result value instead of a
     * stream of values, you should use the {@link Query#apply} method instead.
     *
     * @param policy - The Query Policy to use for this operation.
     * @param dataCb - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     * @param errorCb - Callback function called when there is an error.
     * @param endCb -  Callback function called when an operation has completed.
     *
     * @returns {@link RecordStream}
     */    
    public foreach(policy?: policy.QueryPolicy | null, dataCb?: (data: AerospikeRecord) => void, errorCb?: (error: Error) => void, endCb?: () => void): RecordStream;
    /**
     * Executes the query and collects the results into an array. On paginated queries,
     * preparing the next page is also handled automatically.
     *
     *
     * This method returns a Promise that contains the query results
     * as an array of records, when fulfilled. It should only be used if the query
     * is expected to return only few records; otherwise it is recommended to use
     * {@link Query.foreach}, which returns the results as a {@link RecordStream}
     * instead.
     *
     * If pagination is enabled, the data emitted from the {@link RecordStream#on 'error'}
     * event will automatically be assigned to {@link Query.queryState}, allowing the next page
     * of records to be queried if {@link Query.foreach} or {@link Query.results} is called.
     *
     *
     * @param policy - The Query Policy to use for this operation.
     *
     * @returns A promise that resolves with an Aerospike Record.
     */
    public results(policy?: policy.QueryPolicy | null): Promise<AerospikeRecord[]>;
    /**
     * Applies a user-defined function (UDF) to aggregate the query results.
     *
     * The aggregation function is called on both server and client (final reduce). Therefore, the Lua script files must also reside on both server and client.
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Query Policy to use for this operation.
     * 
     * @returns A promise that resolves with an Aerospike bin value.
     * 
     */
    public apply(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, policy?: policy.QueryPolicy | null): Promise<AerospikeBinValue>;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param callback - The function to call when the operation completes.
     * 
     */
    public apply(udfModule: string, udfFunction: string, callback: TypedCallback<AerospikeBinValue>): void;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param callback - The function to call when the operation completes.
     * 
     */
    public apply(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, callback?: TypedCallback<AerospikeBinValue>): void;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Query Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     * 
     */
    public apply(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[], policy?: policy.QueryPolicy | null, callback?: TypedCallback<AerospikeBinValue>): void;
    /**
     * Applies a user-defined function (UDF) on records that match the query filter.
     * Records are not returned to the client.
     *
     * When a background query is initiated, the client will not wait
     * for results from the database. Instead a {@link Job} instance will be
     * returned, which can be used to query the query status on the database.
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Write Policy to use for this operation.
     * @param queryID - Job ID to use for the query; will be assigned
     * randomly if zero or undefined.
     *
     * @returns Promise that resolves to a {@link Job} instance.
     */
    public background(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, policy?: policy.WritePolicy | null, queryID?: number | null): Promise<Job>;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param callback - The function to call when the operation completes.
     *
     */
    public background(udfModule: string, udfFunction: string, callback: TypedCallback<Job>): void;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param callback - The function to call when the operation completes.
     *
     */
    public background(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, callback?: TypedCallback<Job>): void;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Write Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     *
     */
    public background(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, policy?: policy.WritePolicy | null, callback?: TypedCallback<Job>): void;
    /**
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Write Policy to use for this operation.
     * @param queryID - Job ID to use for the query; will be assigned
     * randomly if zero or undefined.
     * @param callback - The function to call when the operation completes.
     *
     */
    public background(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[] | null, policy?: policy.WritePolicy | null, queryID?: number | null, callback?: TypedCallback<Job> | null): void;
    /**
     * Applies write operations to all matching records.
     *
     * Performs a background query and applies one or more write
     * operations to all records that match the query filter(s). Neither the
     * records nor the results of the operations are returned to the client.
     * Instead a {@link Job} instance will be returned, which can be used to query
     * the query status.
     *
     * This method requires server >= 3.7.0.
     *
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param policy - The Query Policy to use for this operation.
     * @param queryID - Job ID to use for the query; will be assigned
     * randomly if zero or undefined.
     *
     * @returns Promise that resolves to a Job instance.
     *
     * @since v3.14.0
     *
     * @example <caption>Increment count bin on all matching records using a background query</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * Aerospike.connect().then(async (client) => {
     *   const query = client.query('namespace', 'set')
     *   query.where(Aerospike.filter.range('age', 18, 42))
     *   const ops = [Aerospike.operations.incr('count', 1)]
     *   const job = await query.operate(ops)
     *   await job.waitUntilDone()
     *   client.close()
     * })
     */
    public operate(operations: operations.Operation[], policy?: policy.QueryPolicy | null, queryID?: number| null): Promise<Job>;
    /**
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param callback - The function to call when the operation completes.
     *
     * @returns Promise that resolves to a Job instance.
     */
    public operate(operations: operations.Operation[], callback?: TypedCallback<Job>): void;
    /**
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param policy - The Query Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     *
     * @returns Promise that resolves to a Job instance.
     */
    public operate(operations: operations.Operation[], policy: policy.QueryPolicy | null, callback?: TypedCallback<Job>): void;
    /**
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param policy - The Query Policy to use for this operation.
     * @param queryID - Job ID to use for the query; will be assigned
     * randomly if zero or undefined.
     * @param callback - The function to call when the operation completes.
     *
     * @returns Promise that resolves to a Job instance.
     */
    public operate(operations: operations.Operation[], policy: policy.QueryPolicy | null, queryID: number| null, callback?: TypedCallback<Job>): void;
}

export namespace cdt {

    /**
     * Codes used to distinguish CDT item types.
     */
//    export enum CdtItemTypes {
//        LIST_INDEX = 0x10,
//        LIST_RANK,
//        LIST_VALUE = 0x13,
//        MAP_INDEX = 0x20,
//        MAP_RANK,
//        MAP_KEY,
//        MAP_VALUE
//    }
    /**
     * List of {link cdt.Context} instances.
     */
    export type CdtItems = CdtContext[];

//    export class CdtItems extends Array {
//        public push(v: [number, CdtContext]);
//    }

    /**
     * Nested CDT context type.
     *
     * @see {@link lists~ListOperation#withContext|ListOperation#withContext} Adding context to list operations
     * @see {@link maps~MapOperation#withContext|Map#Operation#withContext} Adding context to map operations
     *
     * @since v3.12.0
     */
    class CdtContext {
        constructor();
        /**
         * List of {link cdt.Context} instances.
         */
        public items: CdtItems;
        private add(type: /* CdtItemTypes */ number, value: CdtContext): CdtContext;
        /**
        * Lookup list by index offset.
        *
        * @remarks If the index is negative, the resolved index starts backwards
        * from end of list. If an index is out of bounds, a parameter error will be
        * returned. Examples:
        *
        * - 0: First item.
        * - 4: Fifth item.
        * - -1: Last item.
        * - -3: Third to last item.
        *
        * @param {number} index - List index
        * @return {CdtContext} Updated CDT context, so calls can be chained.
        */
        public addListIndex(index: number): CdtContext;
        /**
         * Lookup list by base list's index offset.
         *
         * @remarks If the list at index offset is not found,
         * create it with the given sort order at that index offset.
         * If pad is true and the index offset is greater than the
         * bounds of the base list, nil entries will be inserted before the newly
         * created list.
         *
         * @param {number} index - List index
         * @param {number} order - Sort order used if a list is created
         * @param {boolean} pad - Pads list entries between index and the
         * final list entry with zeros.
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addListIndexCreate(index: number, order?: lists.order, pad?: boolean): CdtContext;
        /**
         * Lookup list by rank.
         *
         * @remarks Examples:
         *
         * - 0 = smallest value
         * - N = Nth smallest value
         * - -1 = largest value
         *
         * @param {number} rank - List rank
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addListRank(rank: number): CdtContext;
        /**
         * Lookup list by value.
         *
         * @param {any} value - List value
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addListValue(value: AerospikeBinValue): CdtContext;
        /**
         * Lookup map by index offset.
         *
         * @remarks If the index is negative, the resolved index starts backwards
         * from end of list. If an index is out of bounds, a parameter error will be
         * returned. Examples:
         *
         * - 0: First item.
         * - 4: Fifth item.
         * - -1: Last item.
         * - -3: Third to last item.
         *
         * @param {number} index - Map index
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addMapIndex(index: number): CdtContext;
        /**
         * Lookup map by rank.
         *
         * @remarks Examples:
         *
         * - 0 = smallest value
         * - N = Nth smallest value
         * - -1 = largest value
         *
         * @param {number} rank - Map rank
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addMapRank(rank: number): CdtContext;
        /**
         * Lookup map by key.
         *
         * @param {any} key - Map key
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addMapKey(key: string): CdtContext;
        /**
        * Lookup map by base map's key. If the map at key is not found,
        * create it with the given sort order at that key.
        *
        * @param {any} key - Map key
        * @param {number} order - Sort order used if a map is created
        * @return {CdtContext} Updated CDT context, so calls can be chained.
        */
        public addMapKeyCreate(key: string, order?: maps.order): CdtContext;
        /**
         * Lookup map by value.
         *
         * @param {any} value - Map value
         * @return {CdtContext} Updated CDT context, so calls can be chained.
         */
        public addMapValue(value: AerospikeBinValue): CdtContext;
        /**
         * Retrieve expression type list/map from ctx or from type.
         *
         * @param ctx - ctx value object.
         * @param type -{@link exp.type} default expression type.
         * @return {@link exp.type} expression type.
         */
        static getContextType(ctx: CdtContext, type: /* CdtItemTypes */ number): exp.type | /* CdtItemTypes */ number;
    }
    export {CdtContext as Context}

}

export class AdminPolicy extends policy.AdminPolicy {}
export class ApplyPolicy extends policy.ApplyPolicy {}
export class BasePolicy extends policy.BasePolicy {}
export class BatchPolicy extends policy.BatchPolicy {}
export class BatchApplyPolicy extends policy.BatchApplyPolicy {}
export class BatchReadPolicy extends policy.BatchReadPolicy {}
export class BatchRemovePolicy extends policy.BatchRemovePolicy {}
export class BatchWritePolicy extends policy.BatchWritePolicy {}
export class CommandQueuePolicy extends policy.CommandQueuePolicy {}
export class HLLPolicy extends policy.HLLPolicy {}
export class InfoPolicy extends policy.InfoPolicy {}
export class ListPolicy extends policy.ListPolicy {}
export class MapPolicy extends policy.MapPolicy {}
export class OperatePolicy extends policy.OperatePolicy {}
export class QueryPolicy extends policy.QueryPolicy {}
export class ReadPolicy extends policy.ReadPolicy {}
export class RemovePolicy extends policy.RemovePolicy {}
export class ScanPolicy extends policy.ScanPolicy {}
export class WritePolicy extends policy.WritePolicy {}


/**
 * The policy module defines policies and policy values that
 * define the behavior of database operations. Most {@link Client} methods,
 * including scans and queries, accept a policy object, that affects how the
 * database operation is executed, by specifying timeouts, transactional
 * behavior, etc. Global defaults for specific types of database operations can
 * also be set through the client config, when a new {@link Client} instance is
 * created.
 *
 * Different policies apply to different types of database operations:
 *
 * * {@link ApplyPolicy} - Applies to {@link Client.apply}.
 * * {@link OperatePolicy} - Applies to {@link Client.operate} as well as {@link Client.append}, {@link Client.prepend} and {@link Client.add}.
 * * {@link QueryPolicy} - Applies to {@link Query.apply}, {@link Query.background} and {@link Query.foreach}.
 * * {@link ReadPolicy} - Applies to {@link Client.exists}, {@link Client.get} and {@link Client.select}.
 * * {@link RemovePolicy} - Applies to {@link Client.remove}.
 * * {@link ScanPolicy} - Applies to {@link Scan.background} and {@link Scan.foreach}.
 * * {@link WritePolicy} - Applies to {@link Client.put}.
 * * {@link BatchPolicy} - Applies to {@link Client.batchRead} as well as the
 *   deprecated {@link Client.batchExists}, {@link Client.batchGet}, and {@link
 *   Client.batchSelect} operations. Also used when providing batchParentWrite policy to a client configuration.
 * * {@link BatchApplyPolicy} - Applies to {@link Client.batchApply}.
 * * {@link BatchReadPolicy} - Applies to {@link Client.batchRead}.
 * * {@link BatchRemovePolicy} - Applies to {@link Client.batchRemove}.
 * * {@link BatchWritePolicy} - Applies to {@link Client.batchWrite}.
 * * {@link CommandQueuePolicy} - Applies to global command queue {@link setupGlobalCommandQueue
 * Aerospike.setupGlobalCommandQueue}
 * * {@link HLLPolicy} - Applies to {@link hll|HLL} operations
 * * {@link InfoPolicy} - Applies to {@link Client.info}, {@link
 *   Client.infoAny}, {@link Client.infoAll} as well as {@link
 *   Client.createIndex}, {@link Client.indexRemove}, {@link Client.truncate},
 *   {@link Client.udfRegister} and {@link Client.udfRemove}.
 * * {@link ListPolicy} - Applies to List operations defined in {@link lists}.
 * * {@link MapPolicy} - Applies to Map operations defined in {@link maps}.
 * * {@link AdminPolicy} - Applies to {@link Client.changePassword}, {@link Client.changePassword},
 *   {@link Client.createUser}, {@link Client.createRole}, {@link Client.dropRole}, {@link Client.dropUser},
 *   {@link Client.grantPrivileges}, {@link Client.grantRoles}, {@link Client.queryRole},
 *   {@link Client.queryRoles}, {@link Client.queryUser}, {@link Client.queryUsers},
 *   {@link Client.revokePrivileges}, {@link Client.revokeRoles}, {@link Client.setQuotas},
 *   and {@link Client.setWhitelist}, .
 *
 * Base policy {@link BasePolicy} class which defines common policy
 * values that apply to all database operations
 * (except `InfoPolicy`, `AdminPolicy`, `MapPolicy` and `ListPolicy`).
 *
 * This module also defines global values for the following policy settings:
 *
 * * {@link policy.commitLevel|commitLevel} - Specifies the
 * number of replicas required to be successfully committed before returning
 * success in a write operation to provide the desired consistency guarantee.
 * * {@link policy.exists|exists} - Specifies the behavior for
 * writing the record depending whether or not it exists.
 * * {@link policy.gen|gen} - Specifies the behavior of record
 * modifications with regard to the generation value.
 * * {@link policy.key|key} - Specifies the behavior for
 * whether keys or digests should be sent to the cluster.
 * * {@link policy.readModeAP|readModeAP} - How duplicates
 * should be consulted in a read operation.
 * * {@link policy.readModeSC|readModeSC} - Determines SC read
 * consistency options.
 * * {@link policy.replica|replica} - Specifies which
 * partition replica to read from.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   hosts: '192.168.33.10:3000'
 * }
 *
 * const key = new Aerospike.Key('test', 'demo', 'k1')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     let record = {i: 1234}
 *
 *     // Override policy for put command
 *     let policy = new Aerospike.policy.WritePolicy({
 *       exists: Aerospike.policy.exists.CREATE,
 *       key: Aerospike.policy.key.SEND,
 *       socketTimeout: 0,
 *       totalTimeout: 0
 *     })
 *
 *     return client.put(key, record, {}, policy)
 *       .then(() => client.close())
 *       .catch(error => {
 *         client.close()
 *         if (error.code === Aerospike.status.ERR_RECORD_EXISTS) {
 *           console.info('record already exists')
 *         } else {
 *           return Promise.reject(error)
 *         }
 *       })
 *   })
 *   .catch(error => console.error('Error:', error))
 */
export namespace policy {

    /**
     * A policy affecting the behavior of adminstraation operations.
     *
     * Please note that `AdminPolicy` does not derive from {@link BasePolicy}.
     *
     * @since v3.0.0
     */
    export class AdminPolicy extends BasePolicy {
        /**
         * Maximum time in milliseconds to wait for the operation to complete.
         *
         * @type number
         */
        public timeout?: number;
        /**
         * Initializes a new AdminPolicy from the provided policy values.
         *
         * @param props - AdminPolicy values
         */
        constructor(props?: AdminPolicyOptions);
    }

    /**
     * Initializes a new ApplyPolicy from the provided policy values.
     *
     */
    export class ApplyPolicy extends BasePolicy {
        /**
         * Specifies the number of replicas required to be committed successfully
         * when writing before returning transaction succeeded.
         *
         * @see {@link policy.commitLevel} for supported policy values.
         */
        public commitLevel?: policy.commitLevel;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;
        /**
         * The time-to-live (expiration) of the record in seconds.
         *
         */
        public ttl?: number;
        /**
         * Initializes a new ApplyPolicy from the provided policy values.
         *
         * @param props - ApplyPolicy values
         */
        constructor(props?: ApplyPolicyOptions);
    }

    /**
     * Base class for all client policies. The base policy defines general policy
     * values that are supported by all client policies, including timeout and
     * retry handling.
     * Applies to {@link ApplyPolicy}, {@link BatchPolicy}, {@link OperatePolicy},
     * {@link QueryPolicy}, {@link ReadPolicy}, {@link RemovePolicy}, {@link ScanPolicy} and {@link WritePolicy}.
     *
     * @since v3.0.0
     */
    export class BasePolicy {
        /**
         * Use zlib compression on write or batch read commands when the command
         * buffer size is greater than 128 bytes. In addition, tell the server to
         * compress it's response on read commands. The server response compression
         * threshold is also 128 bytes.
         *
         * This option will increase cpu and memory usage (for extra compressed
         * buffers), but decrease the size of data sent over the network.
         *
         * Requires Enterprise Server version >= 4.8.
         *
         * @default: false
         * @since v3.14.0
         */
        public compress?: boolean;
        /**
         * Optional expression filter. If filter exp exists and evaluates to false, the
         * transaction is ignored. This can be used to eliminate a client/server roundtrip
         * in some cases.
         *
         * expression filters can only be applied to the following commands:
         * * {@link Client.apply}
         * * {@link Client.batchExists}
         * * {@link Client.batchGet}
         * * {@link Client.batchRead}
         * * {@link Client.batchSelect}
         * * {@link Client.exists}
         * * {@link Client.get}
         * * {@link Client.operate}
         * * {@link Client.put}
         * * {@link Client.remove}
         * * {@link Client.select}
         */
        public filterExpression?: AerospikeExp;
        /**
         * Maximum number of retries before aborting the current transaction.
         * The initial attempt is not counted as a retry.
         *
         * If <code>maxRetries</code> is exceeded, the transaction will return
         * error {@link statusNamespace.ERR_TIMEOUT|ERR_TIMEOUT}.
         *
         * WARNING: Database writes that are not idempotent (such as "add")
         * should not be retried because the write operation may be performed
         * multiple times if the client timed out previous transaction attempts.
         * It is important to use a distinct write policy for non-idempotent
         * writes which sets <code>maxRetries</code> to zero.
         *
         * @default: 2 (initial attempt + 2 retries = 3 attempts)
         */
        public maxRetries?: number;
        /**
         * Socket idle timeout in milliseconds when processing a database command.
         *
         * If <code>socketTimeout</code> is not zero and the socket has been idle
         * for at least <code>socketTimeout</code>, both <code>maxRetries</code>
         * and <code>totalTimeout</code> are checked. If <code>maxRetries</code>
         * and <code>totalTimeout</code> are not exceeded, the transaction is
         * retried.
         *
         * If both <code>socketTimeout</code> and <code>totalTimeout</code> are
         * non-zero and <code>socketTimeout</code> > <code>totalTimeout</code>,
         * then <code>socketTimeout</code> will be set to
         * <code>totalTimeout</code>. If <code>socketTimeout</code> is zero, there
         * will be no socket idle limit.
         *
         * @default 0 (no socket idle time limit).
         */
        public socketTimeout?: number;
        /**
         * Total transaction timeout in milliseconds.
         *
         * The <code>totalTimeout</code> is tracked on the client and sent to the
         * server along with the transaction in the wire protocol. The client will
         * most likely timeout first, but the server also has the capability to
         * timeout the transaction.
         *
         * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
         * is reached before the transaction completes, the transaction will return
         * error {@link statusNamespace.ERR_TIMEOUT|ERR_TIMEOUT}.
         * If <code>totalTimeout</code> is zero, there will be no total time limit.
         *
         * @default 1000
         */
        public totalTimeout?: number;
        /**
         * Multi-record command identifier. See {@link Transaction} for more information.
         * 
         * @default null (no transaction)
         */
        public txn?: Transaction;

        /**
         * Initializes a new BasePolicy from the provided policy values.
         *
         * @param props - BasePolicy values
         */
        constructor(props?: BasePolicyOptions);
    }


    /**
     * A policy affecting the behavior of batch apply operations.
     *
     * @since v5.0.0
     */
    export class BatchApplyPolicy {
        /**
          * Specifies the number of replicas required to be committed successfully
          * when writing before returning transaction succeeded.
          *
          * @see {@link policy.commitLevel} for supported policy values.
          */
        public commitLevel?: policy.commitLevel;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Optional expression filter. If filter exp exists and evaluates to false, the
         * transaction is ignored. This can be used to eliminate a client/server roundtrip
         * in some cases.
         */
        public filterExpression?: AerospikeExp;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;

        /**
         * The time-to-live (expiration) of the record in seconds.
         */
        public ttl?: number;
        /**
         * Initializes a new BatchApplyPolicy from the provided policy values.
         *
         * @param props - BatchApplyPolicy values
         */
        constructor(props?: BatchApplyPolicyOptions);
    }

    /**
     * Initializes a new BatchPolicy from the provided policy values.
     *
     * @param {Object} [props] - Policy values
     */
    export class BatchPolicy extends BasePolicy {
        /**
         * Read policy for AP (availability) namespaces.
         *
         * @default Aerospike.policy.readModeAP.ONE
         * @see {@link policy.readModeAP} for supported policy values.
         */
        public allowInline?: boolean;
        /**
         * Allow batch to be processed immediately in the server's receiving thread for SSD
         * namespaces. If false, the batch will always be processed in separate service threads.
         * Server versions &lt; 6.0 ignore this field.
         *
         * Inline processing can introduce the possibility of unfairness because the server
         * can process the entire batch before moving onto the next command.
         *
         * @default <code>false</code>
         */
        public allowInlineSSD?: boolean;
        /**
         * Determine if batch commands to each server are run in parallel threads.
         *
         * Values:
         * false: Issue batch commands sequentially.  This mode has a performance advantage for small
         * to medium sized batch sizes because commands can be issued in the main transaction thread.
         * This is the default.
         * true: Issue batch commands in parallel threads.  This mode has a performance
         * advantage for large batch sizes because each node can process the command immediately.
         * The downside is extra threads will need to be created (or taken from
         * a thread pool).
         * 
         * @default <code>false</code>
         */
        public concurrent?: boolean;
        /**
         * Should CDT data types (Lists / Maps) be deserialized to JS data types
         * (Arrays / Objects) or returned as raw bytes (Buffer).
         *
         * @default <code>true</code>
         * @since v3.7.0
         */
        public deserialize?: boolean;
        /**
         * Read policy for AP (availability) namespaces.
         *
         * @default {@link policy.readModeAP.ONE}
         * @see {@link policy.readModeAP} for supported policy values.
         */
        public readModeAP?: policy.readModeAP;
        /**
         * Read policy for SC (strong consistency) namespaces.
         *
         * @default {@link policy.readModeSC.SESSION}
         * @see {@link policy.readModeSC} for supported policy values.
         */
        public readModeSC?: policy.readModeSC;
        /**
         * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
         * efficiently operate as a read-based LRU cache where the least recently used records are expired.
         * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
         * within this interval of the record’s end of life will generate a touch.
         *
         * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
         * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
         * recent write) will result in a touch, resetting the TTL to another 10 hours.
         *
         * @default 0
         */
        public readTouchTtlPercent?: number;
        /**
         * Algorithm used to determine target node.
         * 
         * @default {@link policy.replica.MASTER}
         * @see {@link policy.replica} for supported policy values.
         */
        public replica?: policy.replica;
        /**
         * Should all batch keys be attempted regardless of errors. This field is used on both
         * the client and server. The client handles node specific errors and the server handles
         * key specific errors.
         *
         * If true, every batch key is attempted regardless of previous key specific errors.
         * Node specific errors such as timeouts stop keys to that node, but keys directed at
         * other nodes will continue to be processed.
         *
         * If false, the server will stop the batch to its node on most key specific errors.
         * The exceptions are AEROSPIKE_ERR_RECORD_NOT_FOUND and AEROSPIKE_FILTERED_OUT
         * which never stop the batch. The client will stop the entire batch on node specific
         * errors for sync commands that are run in sequence (concurrent == false). The client
         * will not stop the entire batch for async commands or sync commands run in parallel.
         *
         * Server versions &lt; 6.0 do not support this field and treat this value as false
         * for key specific errors.
         *
         * @default <code>true</code>
         */
        public respondAllKeys?: boolean;
        /**
         * Send set name field to server for every key in the batch. This is only
         * necessary when authentication is enabled and security roles are defined
         * on a per-set basis.
         *
         * @default <code>false</code>
         */
        public sendSetName?: boolean;

        /**
         * Initializes a new BatchPolicy from the provided policy values.
         *
         * @param props - BatchPolicy values
         */
        constructor(props?: BatchPolicyOptions)
    }

    export class BatchReadPolicy {
        /**
         * Optional expression filter. If filter exp exists and evaluates to false, the
         * transaction is ignored. This can be used to eliminate a client/server roundtrip
         * in some cases.
         */
        public filterExpression?: AerospikeExp;
        /**
         * Read policy for AP (availability) namespaces.
         *
         * @default {@link policy.readModeAP.ONE}
         * @see {@link policy.readModeAP} for supported policy values.
         */
        public readModeAP?: policy.readModeAP;
        /**
          * Read policy for SC (strong consistency) namespaces.
          *
          * @default {@link policy.readModeSC.SESSION}
          * @see {@link policy.readModeSC} for supported policy values.
          */
        public readModeSC?: policy.readModeSC;
        /**
         * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
         * efficiently operate as a read-based LRU cache where the least recently used records are expired.
         * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
         * within this interval of the record’s end of life will generate a touch.
         *
         * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
         * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
         * recent write) will result in a touch, resetting the TTL to another 10 hours.
         *
         * @default 0
         */
        public readTouchTtlPercent?: number;
        /**
         * Initializes a new BatchReadPolicy from the provided policy values.
         *
         * @param props - BatchReadPolicy values
         */
        constructor(props?: BatchReadPolicyOptions);
    }

    export class BatchRemovePolicy {
        /**
          * Specifies the number of replicas required to be committed successfully
          * when writing before returning transaction succeeded.
          *
          * @see {@link policy.commitLevel} for supported policy values.
          */
        public commitLevel?: policy.commitLevel;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Optional expression filter. If filter exp exists and evaluates to false, the
         * transaction is ignored. This can be used to eliminate a client/server roundtrip
         * in some cases.
         *
         */
        public filterExpression?: AerospikeExp;
        /**
         * Specifies the behavior for the generation value.
         *
         * @see {@link policy.gen} for supported policy values.
         */
        public gen?: policy.gen;
        /**
         * The generation of the record.
         */
        public generation?: number;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;

        /**
         * Initializes a new BatchRemovePolicy from the provided policy values.
         *
         * @param props - BatchRemovePolicy values
         */
        constructor(props?: BatchRemovePolicyOptions);
    }

    /**
     * A policy affecting the behavior of batch write operations.
     *
     * @since v5.0.0
     */
    export class BatchWritePolicy {
        /**
         * Specifies the number of replicas required to be committed successfully
         * when writing before returning transaction succeeded.
         *
         * @see {@link policy.commitLevel} for supported policy values.
         */
        public commitLevel?: policy.commitLevel;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Specifies the behavior for the existence of the record.
         *
         * @see {@link policy.exists} for supported policy values.
         */
        public exists?: policy.exists;
        /**
         * Optional expression filter. If filter exp exists and evaluates to false, the
         * transaction is ignored. This can be used to eliminate a client/server roundtrip
         * in some cases.
         */
        public filterExpression?: AerospikeExp;
        /**
         * Specifies the behavior for the generation value.
         *
         * @see {@link policy.gen} for supported policy values.
         */
        public gen?: policy.gen;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;
        /**
         * The time-to-live (expiration) of the record in seconds.
         */
        public ttl?: number;
        /**
         * Initializes a new BatchWritePolicy from the provided policy values.
         *
         * @param props - BatchWritePolicy values
         */
        constructor(props?: BatchWritePolicyOptions);
    }

    /**
     * A policy affecting the behavior of {@link bitwise|bitwise} operations.
     *
     * @since v3.13.0
     */
    export class BitwisePolicy extends BasePolicy {
        /**
         * Specifies the behavior when writing byte values.
         *
         * @default bitwise.writeFlags.DEFAULT
         * @see {@link bitwise.writeFlags} for supported policy values.
         */
        public writeFlags: bitwise.writeFlags;
        /**
         * Initializes a new BitwisePolicy from the provided policy values.
         *
         * @param props - BitwisePolicy values
         */
        constructor(props?: BitwisePolicyOptions);
    }

    /**
     * Policy governing the use of the global command queue.
     *
     * **Which commands are affected by the command queue?**
     *
     * Not all client commands use the command queue. Only single-key commands
     * (e.g. Put, Get, etc.), the BatchRead, BatchWrite commands, and {@link Query#foreach},
     * {@link Scan#foreach} commands use the command queue (if enabled).
     *
     * Commands that are based on the Aerospike info protocol (Index
     * Create/Remove, UDF Register/Remove, Truncate, Info), the legacy Batch
     * Get/Select/Exists commands as well as all other Query and Scan commands do
     * not use the command queue and will always be executed immediately.
     *
     * @see {@link setupGlobalCommandQueue
     * Aerospike.setupGlobalCommandQueue} - function used to initialize the global
     * command queue.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * const policy = {
     *   maxCommandsInProcess: 50,
     *   maxCommandsInQueue: 150
     * }
     * Aerospike.setupGlobalCommandQueue(policy)
     *
     * Aerospike.connect()
     *   .then(client => {
     *     let commands = []
     *     for (var i = 0; i < 100; i++) {
     *       let cmd = client.put(new Aerospike.Key('test', 'test', i), {i: i})
     *       commands.push(cmd)
     *     }
     *
     *     // First 50 commands will be executed immediately,
     *     // remaining commands will be queued and executed once the client frees up.
     *     Promise.all(commands)
     *       .then(() => console.info('All commands executed successfully'))
     *       .catch(error => console.error('Error:', error))
     *       .then(() => client.close())
     *   })
     */
    export class CommandQueuePolicy extends BasePolicy {
        /**
         * Maximum number of commands that can be processed at any point in time.
         * Each executing command requires a socket connection. Consuming too many
         * sockets can negatively affect application reliability and performance.
         * If you do not limit command count in your application, this setting
         * should be used to enforce a limit internally in the client.
         *
         * If this limit is reached, the next command will be placed on the
         * client's command queue for later execution. If this limit is zero, all
         * commands will be executed immediately and the command queue will not be
         * used. (Note: {@link Config#maxConnsPerNode} may still limit number of
         * connections per cluster node.)
         *
         * If defined, a reasonable value is 40. The optimal value will depend on
         * the CPU speed and network bandwidth.
         *
         * @default 0 (execute all commands immediately)
         */
        public maxCommandsInProcess?: number;
        /**
         * Maximum number of commands that can be stored in the global command
         * queue for later execution. Queued commands consume memory, but they do
         * not consume sockets. This limit should be defined when it's possible
         * that the application executes so many commands that memory could be
         * exhausted.
         *
         * If this limit is reached, the next command will be rejected with error
         * code <code>ERR_ASYNC_QUEUE_FULL</code>. If this limit is zero, all
         * commands will be accepted into the delay queue.
         *
         * The optimal value will depend on the application's magnitude of command
         * bursts and the amount of memory available to store commands.
         *
         * @default 0 (no command queue limit)
         */
        public maxCommandsInQueue?: number;
        /**
         * Initial capacity of the command queue. The command queue can resize
         * beyond this initial capacity.
         *
         * @default 256 (if command queue is used)
         */
        public queueInitialCapacity?: number;
      /**
       * Initializes a new CommandQueuePolicy from the provided policy values.
       *
       * @param props - CommandQueuePolicy values
       */
        constructor(props?: CommandQueuePolicyOptions);
    }

    /**
     * A policy affecting the behavior of {@link hll|HLL} operations.
     *
     * @since v3.16.0
     */
    export class HLLPolicy extends BasePolicy {
        /**
         * Specifies the behavior when writing byte values.
         *
         * @default hll.writeFlags.DEFAULT
         * @see {@link hll.writeFlags} for supported policy values.
         */
        public writeFlags: hll.writeFlags;
        /**
         * Initializes a new HLLPolicy from the provided policy values.
         *
         * @param props - HLLPolicy values
         */
        constructor(props?: HLLPolicyOptions);
    }

    /**
     * A policy affecting the behavior of info operations.
     *
     * Please note that `InfoPolicy` does not derive from {@link BasePolicy} and that
     * info commands do not support automatic retry.
     *
     * @since v3.0.0
     */
    export class InfoPolicy extends BasePolicy {
        /**
         * Ensure the request is within allowable size limits.
         */
        public checkBounds?: boolean;
        /**
         * Send request without any further processing.
         */
        public sendAsIs?: boolean;
        /**
         * Maximum time in milliseconds to wait for the operation to complete.
         */
        public timeout?: number
        /**
         * Initializes a new InfoPolicy from the provided policy values.
         *
         * @param props - InfoPolicy values
         */
        constructor(props?: InfoPolicyOptions);
    }

    /**
     * A policy affecting the behavior of list operations.
     *
     * @since v3.3.0
     */
    export class ListPolicy extends BasePolicy {
        /**
         * Sort order for the list.
         *
         * @type number
         * @default {@ link lists.order.UNORDERED}
         * @see {@link lists.order} for supported policy values.
         */
        public order?: lists.order;
        /**
         * Specifies the behavior when replacing or inserting list items.
         *
         * @type number
         * @default {@link lists.writeFlags.DEFAULT}
         * @see {@link lists.writeFlags} for supported policy values.
         */
        public writeFlags?: lists.writeFlags;
        /**
         * Initializes a new ListPolicy from the provided policy values.
         *
         * @param props - ListPolicy values
         */
        constructor(props?: ListPolicyOptions);
    }
    /**
     * A policy affecting the behavior of map operations.
     *
     * @since v3.0.0
     */
    export class MapPolicy extends BasePolicy {
        /**
         * Specifies the behavior when replacing or inserting map items.
         *
         * Map write flags require server version v4.3 or later. For earier server
         * versions, set the {@link MapPolicy.writeMode|writeMode} instead.
         *
         * @default {@link maps.writeFlags.DEFAULT}
         * @see {@link maps.writeFlags} for supported policy values.
         * @since v3.5
         */
        public order?: maps.order;
        /**
         * Specifies the behavior when replacing or inserting map items.
         *
         * Map write flags require server version v4.3 or later. For earier server
         * versions, set the {@link MapPolicy.writeMode|writeMode} instead.
         *
         * @default {@link maps.writeFlags.DEFAULT}
         * @see {@link maps.writeFlags} for supported policy values.
         * @since v3.5
         */
        public writeFlags?: maps.writeFlags;
        /**
         * Specifies the behavior when replacing or inserting map items.
         *
         * Map write mode should only be used for server versions prior to v4.3.
         * For server versions v4.3 or later, the use of {@link
         * MapPolicy.writeFlags | writeFlags} is recommended.
         *
         * @default {@link maps.writeMode.UPDATE}
         * @see {@link maps.writeMode} for supported policy values.
         * @deprecated since v3.5
         */
        public writeMode?: maps.writeMode;

        /**
         * Initializes a new MapPolicy from the provided policy values.
         *
         * @param props - MapPolicy values
         */
        constructor(props?: MapPolicyOptions);
    }

    /**
     * A policy affecting the behavior of operate operations.
     *
     * @since v3.0.0
     */
    export class OperatePolicy extends BasePolicy {
        /**
         * Specifies the number of replicas required to be committed successfully
         * when writing before returning transaction succeeded.
         *
         * @see {@link policy.commitLevel} for supported policy values.
         */
        public commitLevel?: policy.commitLevel;
        /**
         * Should CDT data types (Lists / Maps) be deserialized to JS data types
         * (Arrays / Objects) or returned as raw bytes (Buffer).
         *
         * @default <code>true</code>
         * @since v3.7.0
         */
        public deserialize?: boolean;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Specifies the behavior for the existence of the record.
         *
         * @see {@link policy.exists} for supported policy values.
         */
        public exists?: policy.exists;
        /**
         * Specifies the behavior for the generation value.
         *
         * @see {@link policy.gen} for supported policy values.
         */
        public gen?: policy.gen;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;
        /**
         * Read policy for AP (availability) namespaces.
         *
         * @default Aerospike.policy.readModeAP.ONE
         * @see {@link policy.readModeAP} for supported policy values.
         */
        public readModeAP?: policy.readModeAP;
        /**
         * Read policy for SC (strong consistency) namespaces.
         *
         * @default Aerospike.policy.readModeSC.SESSION
         * @see {@link policy.readModeSC} for supported policy values.
         */
        public readModeSC?: policy.readModeSC;
        /**
         * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
         * efficiently operate as a read-based LRU cache where the least recently used records are expired.
         * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
         * within this interval of the record’s end of life will generate a touch.
         *
         * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
         * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
         * recent write) will result in a touch, resetting the TTL to another 10 hours.
         *
         * @default 0
         */
        public readTouchTtlPercent?: number;
        /**
         * Specifies the replica to be consulted for the read operation.
         *
         * @see {@link policy.replica} for supported policy values.
         */
        public replica?: policy.replica;
        /**
         * Initializes a new OperatePolicy from the provided policy values.
         *
         * @param props - OperatePolicy values
         */
        constructor(props?: OperatePolicyOptions);
    }


    /**
     * A policy affecting the behavior of query operations.
     *
     * @since v3.0.0
     */
    export class QueryPolicy extends BasePolicy {
        /**
         * Should CDT data types (Lists / Maps) be deserialized to JS data types
         * (Arrays / Objects) or returned as raw bytes (Buffer).
         *
         * @default <code>true</code>
         * @since v3.7.0
         */
        public deserialize?: boolean;
        /**
         * Expected query duration. The server treats the query in different ways depending on the expected duration.
         * This field is ignored for aggregation queries, background queries and server versions &lt; 6.0.
         *
         * @see {@link policy.queryDuration} for supported policy values.
         * @default {@link policy.queryDuration.LONG}
         */
        public expectedDuration?: policy.queryDuration;
        /**
         * Terminate the query if the cluster is in migration state. If the query's
         * "where" clause is not defined (scan), this field is ignored.
         *
         * Requires Aerospike Server version 4.2.0.2 or later.
         *
         * @default <code>false</code>
         * @since v3.4.0
         */
        public failOnClusterChange?: boolean;
        /**
         * Timeout in milliseconds used when the client sends info commands to
         * check for cluster changes before and after the query. This timeout is
         * only used when {@link
         * QueryPolicy.failOnClusterChange | failOnClusterChange} is true and the
         * query's "where" clause is defined.
         *
         * @default 10000 ms
         * @since v3.16.5
         */
        public infoTimeout?: number;
        /**
         * Specifies the replica to be consulted for the query operation.
         *
         * @see {@link policy.replica} for supported policy values.
         */
        public replica?: policy.replica;
        /**
         * Total transaction timeout in milliseconds.
         *
         * The <code>totalTimeout</code> is tracked on the client and sent to the
         * server along with the transaction in the wire protocol. The client will
         * most likely timeout first, but the server also has the capability to
         * timeout the transaction.
         *
         * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
         * is reached before the transaction completes, the transaction will return
         * error {@link status.ERR_TIMEOUT | ERR_TIMEOUT}.
         * If <code>totalTimeout</code> is zero, there will be no total time limit.
         *
         * @default 0
         * @override
         */
        public totalTimeout?: number;
        /**
         * Initializes a new OperatePolicy from the provided policy values.
         *
         * @param props - OperatePolicy values
         */
        constructor(props?: QueryPolicyOptions);
    }

    /**
     * A policy affecting the behavior of read operations.
     *
     * @since v3.0.0
     */
    export class ReadPolicy extends BasePolicy {
        /**
         * Should CDT data types (Lists / Maps) be deserialized to JS data types
         * (Arrays / Objects) or returned as raw bytes (Buffer).
         *
         * @type boolean
         * @default <code>true</code>
         * @since v3.7.0
         */
        public deserialize?: boolean;
        /**
         * Specifies the behavior for the key.
         *
         * @type number
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;
        /**
         * Read policy for AP (availability) namespaces.
         *
         * @type number
         * @default Aerospike.policy.readModeAP.ONE
         * @see {@link policy.readModeAP} for supported policy values.
         */
        public readModeAP?: policy.readModeAP;

        /**
         * Read policy for SC (strong consistency) namespaces.
         *
         * @type number
         * @default Aerospike.policy.readModeSC.SESSION
         * @see {@link policy.readModeSC} for supported policy values.
         */
        public readModeSC?: policy.readModeSC;
        /**
         * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
         * efficiently operate as a read-based LRU cache where the least recently used records are expired.
         * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
         * within this interval of the record’s end of life will generate a touch.
         *
         * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
         * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
         * recent write) will result in a touch, resetting the TTL to another 10 hours.
         *      *
         * @type number
         * @default 0
         */
        public readTouchTtlPercent?: number;
        /**
         * Specifies the replica to be consulted for the read operation.
         *
         * @type number
         * @see {@link policy.replica} for supported policy values.
         */
        public replica?: policy.replica;

        /**
         * Initializes a new ReadPolicy from the provided policy values.
         *
         * @param props - ReadPolicy values
         */
        constructor(props?: ReadPolicyOptions);
    }

    /**
     * A policy affecting the behavior of remove operations.
     *
     * @since v3.0.0
     */
    export class RemovePolicy extends BasePolicy {
        /**
         * Specifies the number of replicas required to be committed successfully
         * when writing before returning transaction succeeded.
         *
         * @see {@link policy.commitLevel} for supported policy values.
         */
        public commitLevel?: policy.commitLevel;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Specifies the behavior for the generation value.
         *
         * @see {@link policy.gen} for supported policy values.
         */
        public gen?: policy.gen;
        /**
         * The generation of the record.
         */
        public generation?: number;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;
        /**
         * Initializes a new RemovePolicy from the provided policy values.
         *
         * @param props - RemovePolicy values
         */
        constructor(props?: RemovePolicyOptions);
    }

    /**
     * A policy affecting the behavior of scan operations.
     *
     * @since v3.0.0
     */
    export class ScanPolicy extends BasePolicy {
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Approximate number of records to return to client. This number is
         * divided by the number of nodes involved in the scan. The actual number
         * of records returned may be less than maxRecords if node record counts
         * are small and unbalanced across nodes.
         *
         * Requires server >= 4.9.
         *
         * @default 0 (do not limit record count)
         *
         * @since v3.16.0
         */
        public maxRecords?: number;
        /**
         * Limit returned records per second (RPS) rate for each server. Do not
         * apply RPS limit if <code>recordsPerSecond</code> is zero.
         *
         * Requires server >= 4.7.
         *
         * @default 0
         *
         * @since v3.14.0
         */
        public recordsPerSecond?: number;
        /**
         * Specifies the replica to be consulted for the scan operation.
         *
         * @see {@link policy.replica} for supported policy values.
         */
        public replica?: policy.replica;
        /**
         * Total transaction timeout in milliseconds.
         *
         * The <code>totalTimeout</code> is tracked on the client and sent to the
         * server along with the transaction in the wire protocol. The client will
         * most likely timeout first, but the server also has the capability to
         * timeout the transaction.
         *
         * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
         * is reached before the transaction completes, the transaction will return
         * error {@link status.ERR_TIMEOUT | ERR_TIMEOUT}.
         * If <code>totalTimeout</code> is zero, there will be no total time limit.
         *
         * @default 0
         * @override
         */
        public totalTimeout?: number;
        /**
         * Initializes a new ScanPoliy from the provided policy values.
         *
         * @param props - ScanPolicy values
         */
        constructor(props?: ScanPolicyOptions);
    }


    /**
     * A policy affecting the behavior of write operations.
     *
     * @since v3.0.0
     */
    export class WritePolicy extends BasePolicy {
        /**
         * Specifies the number of replicas required to be committed successfully
         * when writing before returning transaction succeeded.
         *
         * @see {@link policy.commitLevel} for supported policy values.
         */
        public commitLevel?: policy.commitLevel;

        /**
         * Minimum record size beyond which it is compressed and sent to the
         * server.
         */
        public compressionThreshold?: number;
        /**
         * Specifies whether a {@link
         * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
         * should be written in place of a record that gets deleted as a result of
         * this operation.
         *
         * @default <code>false</code> (do not tombstone deleted records)
         */
        public durableDelete?: boolean;
        /**
         * Specifies the behavior for the existence of the record.
         *
         * @see {@link policy.exists} for supported policy values.
         */
        public exists?: policy.exists;
        /**
         * Specifies the behavior for the generation value.
         *
         * @see {@link policy.gen} for supported policy values.
         */
        public gen?: policy.gen;
        /**
         * Specifies the behavior for the key.
         *
         * @see {@link policy.key} for supported policy values.
         */
        public key?: policy.key;

        /**
         * Initializes a new WritePolicy from the provided policy values.
         *
         * @param props - WritePolicy values
         */
        constructor(props?: WritePolicyOptions);
    }

    /**
     * Represents any valid policy type in the Aerospike CLinet.
     */
    export type AnyPolicy = BasePolicy | ApplyPolicy | BatchPolicy | OperatePolicy | QueryPolicy | ReadPolicy | RemovePolicy | ScanPolicy | WritePolicy | BatchReadPolicy | BatchRemovePolicy | BatchWritePolicy | BatchApplyPolicy | CommandQueuePolicy | HLLPolicy | InfoPolicy | ListPolicy | MapPolicy;

    /**
     * Specifies the number of replicas required to be successfully committed
     * before returning success in a write operation to provide the desired
     * consistency guarantee.
     */
    export enum commitLevel {
        /**
         * Return success only after successfully committing all replicas.
         */
        ALL,
        /**
         * Return success after successfully committing the master replica.
         */
        MASTER
    }
    /**
     * Specifies the behavior for writing the record depending whether or not it
     * exists.
     */
    export enum exists {
        /**
         * Write the record, regardless of existence.  (I.e. create or update.)
         */
        IGNORE,
        /**
         * Create a record, ONLY if it doesn't exist.
         */
        CREATE,
        /**
         * Update a record, ONLY if it exists.
         */
        UPDATE,
        /**
         * Completely replace a record, ONLY if it exists.
         */
        REPLACE,
        /**
         * Completely replace a record if it exists, otherwise create it.
         */
        CREATE_OR_REPLACE
    }
    /**
     * The generation policy specifies how to handle record writes based
     * on record generation.
     *
     * @remarks To use the <code>EQ</code> or <code>GT</code> generation policy
     * (see below), the generation value to use for the comparison needs to be
     * specified in the metadata parameter (<code>meta</code>) of the {@link
     * Client#put} operation.
     *
     *
     * @example <caption>Update record, only if generation matches</caption>
     *
     * const Aerospike = require('aerospike')
     * const key = new Aerospike.Key('test', 'test', 'myKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config).then(async (client) => {
     *   await client.put(key, { foo: 'bar' })
     *
     *   const record = await client.get(key)
     *   const gen = record.gen // Current generation of the record. (1 for new record.)
     *   // Perform some operation using record. Some other process might update the
     *   // record in the meantime, which would change the generation value.
     *   if (Math.random() < 0.1) await client.put(key, { foo: 'fox' })
     *
     *   try {
     *     // Update record only if generation is still the same.
     *     const meta = { gen }
     *     const policy = { gen: Aerospike.policy.gen.EQ }
     *     await client.put(key, { status: 'updated' }, meta, policy)
     *     console.log('Record updated successfully.')
     *   } catch (error) {
     *     if (error.code == Aerospike.status.ERR_RECORD_GENERATION) {
     *       console.error('Failed to update record, because generation did not match.')
     *     }
     *   }
     *
     *   client.close()
     * })
     */
    export enum gen {
        /**
         * Do not use record generation to restrict writes.
         */
        IGNORE,
        /**
         * Update/delete record if expected generation is equal to
         * server generation. Otherwise, fail.
         */

        EQ,
        /**
         * Update/delete record if expected generation greater than the
         * server generation. Otherwise, fail. This is useful for restore after backup.
         */
        GT
    }
    /**
     * Specifies the behavior for whether keys or digests should be sent to the
     * cluster.
     */
    export enum key {
        /**
         * Send the digest value of the key. This is the recommended
         * mode of operation. This calculates the digest and sends the digest to the
         * server. The digest is only calculated on the client, and not the server.
         */
        DIGEST,
        /**
         * Send the key, in addition to the digest value. If you want
         * keys to be returned when scanning or querying, the keys must be stored on
         * the server. This policy causes a write operation to store the key. Once the
         * key is stored, the server will keep it - there is no need to use this policy
         * on subsequent updates of the record. If this policy is used on read or
         * delete operations, or on subsequent updates of a record with a stored key,
         * the key sent will be compared with the key stored on the server. A mismatch
         * will cause <code>ERR_RECORD_KEY_MISMATCH</code> to be returned.
         */
        SEND
    }
    /**
     * The {@link policy.queryDuration|aerospike/policy.query_duration}
     * module contains a list of query duration enumerations.
     *
     * {@link policy.queryDuration|aerospike/policy.query_duration} module
     */
    export enum queryDuration {
        /**
         * The query is expected to return more than 100 records per node. The server optimizes for a
         * large record set in the following ways:
         * <ul>
         * <li>Allow query to be run in multiple threads using the server's query threading configuration.</li>
         * <li>Do not relax read consistency for AP namespaces.</li>
         * <li>Add the query to the server's query monitor.</li>
         * <li>Do not add the overall latency to the server's latency histogram.</li>
         * <li>Do not allow server timeouts.</li>
         * </ul>
         */
        LONG,
        /**
         * The query is expected to return less than 100 records per node. The server optimizes for a
         * small record set in the following ways:
         * <ul>
         * <li>Always run the query in one thread and ignore the server's query threading configuration.</li>
         * <li>Allow query to be inlined directly on the server's service thread.</li>
         * <li>Relax read consistency for AP namespaces.</li>
         * <li>Do not add the query to the server's query monitor.</li>
         * <li>Add the overall latency to the server's latency histogram.</li>
         * <li>Allow server timeouts. The default server timeout for a short query is 1 second.</li>
         * </ul>
         */
        SHORT,
        /**
         * Treat query as a LONG query, but relax read consistency for AP namespaces.
         * This value is treated exactly like LONG for server versions &lt; 7.1.
         */
        LONG_RELAX_AP
    }
    /**
     * Read policy for SC (strong consistency) namespaces.
     *
     * @remarks Determines SC read consistency options.
     *
     * @property SESSION - Ensures this client will only see an increasing sequence
     * of record versions. Server only reads from master. This is the default.
     * @property LINEARIZE - Ensures ALL clients will only see an increasing
     * sequence of record versions. Server only reads from master.
     * @property ALLOW_REPLICA - Server may read from master or any full
     * (non-migrating) replica. Increasing sequence of record versions is not
     * guaranteed.
     * @property ALLOW_UNAVAILABLE - Server may read from master or any full
     * (non-migrating) replica or from unavailable partitions. Increasing sequence
     * of record versions is not guaranteed.
     */
    export enum replica {
        /**
         * Ensures this client will only see an increasing sequence
         * of record versions. Server only reads from master. This is the default.
         */
        MASTER,
        /**
         * Ensures ALL clients will only see an increasing
         * sequence of record versions. Server only reads from master.
         */
        ANY,
        /**
         * Server may read from master or any full
         * (non-migrating) replica. Increasing sequence of record versions is not
         * guaranteed.
         */
        SEQUENCE,
        /**
         * Server may read from master or any full
         * (non-migrating) replica or from unavailable partitions. Increasing sequence
         * of record versions is not guaranteed.
         */
        PREFER_RACK
    }

    /**
     * Read policy for AP (availability) namespaces.
     *
     * @remarks How duplicates should be consulted in a read operation.
     * Only makes a difference during migrations and only applicable in AP mode.
     *
     */
    export enum readModeAP {
        /**
         * Involve a single node in the read operation.
         */
        ONE,
        /**
         * Involve all duplicates in the read operation.
         */
        ALL
    }
    /**
     * Read policy for SC (strong consistency) namespaces.
     *
     * @remarks Determines SC read consistency options.
     */
    export enum readModeSC {
        /**
         * Ensures this client will only see an increasing sequence
         * of record versions. Server only reads from master. This is the default.
         */
        SESSION,
        /**
         * Ensures ALL clients will only see an increasing
         * sequence of record versions. Server only reads from master.
         */
        LINEARIZE,
        /**
         * Server may read from master or any full
         * (non-migrating) replica. Increasing sequence of record versions is not
         * guaranteed.
         */
        ALLOW_REPLICA,
        /**
         * Server may read from master or any full
         * (non-migrating) replica or from unavailable partitions. Increasing sequence
         * of record versions is not guaranteed.
         */
        ALLOW_UNAVAILABLE
    }

    export function createPolicy(type: string, values: AnyPolicy): AnyPolicy;
}

/**
 * The Aerospike Node.js client enables you to build an application in Node.js or Typescript with an Aerospike cluster as its database.
 * The client manages the connections to the cluster and handles the transactions performed against it.
 */
export class Client extends EventEmitter {
    /**
     * A copy of the configuration with which the client was initialized.
     */
    public config: Config;
    /**
     * Add-on C++ client for internal use only.
     */
    private as_client: any;
    /**
     * Describes connection status.
     */
    private connected: boolean;
    /**
     *
     * Set to <code>true</code> to enable capturing of debug stacktraces for
     * every database command.
     *
     * @remarks The client will capture a stacktrace before each database
     * command is executed, instead of capturing the stacktrace only when an
     * error is raised. This generally results in much more useful stacktraces
     * that include stackframes from the calling application issuing the database
     * command.
     *
     * **Note:** Enabling this feature incurs a significant performance overhead for
     * every database command. It is recommended to leave this feature disabled
     * in production environments.
     *
     * By default, the client will set this flag to true, if the
     * <code>AEROSPIKE_DEBUG_STACKTRACES</code> environment variable is set (to
     * any value).
     *
     * @type {boolean}
     * @default <code>true</code>, if
     * <code>process.env.AEROSPIKE_DEBUG_STACKTRACES</code> is set;
     * <code>false</code> otherwise.
     */
    public captureStackTraces: boolean;
    /**
     * Construct a new Aerospike client instance.
     *
     * @param config - Configuration used to initialize the client.
     */
    constructor(config: ConfigOptions);
    /**
     * @hidden
     */
    private asExec(cmd: string, args?: any): any;
    /**
     * Returns a list of all cluster nodes known to the client.
     *
     * @return List of node objects
     *
     * @since v2.6.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   console.log(client.getNodes()) // [ { name: 'SAMPLEADDRESS', address: 'SAMPLENAME' }, ...]
     *   client.close()
     * })
     *
     */
    public getNodes(): Node[];
    /**
     * Adds a seed host to the cluster.
     *
     * @param hostname - Hostname/IP address of the new seed host
     * @param port - Port number; defaults to {@link Config#port} or 3000.
     *
     * @since v2.6.0
     */    
    public addSeedHost(hostname: string, port?: number): void;
    /**
     * Apply UDF (user defined function) on multiple keys.
     *
     * @remarks
     *
     * This method allows multiple sub-commands for each key in the batch.
     * This method requires server >= 6.0.0.
     *
     *
     *
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param udf - Server UDF module/function and argList to apply.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param batchApplyPolicy - UDF policy configuration parameters.
     *
     * @returns A Promise that resolves to the results of the batch operation.
     *
     *
     *
     * @since v5.0.0
     *
     * @example <caption>Simple batchApply example</caption>
     *
     * const Aerospike = require('aerospike')
     * var path = require('path');
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * const config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * // This must be a path to a UDF file
     * const scriptLocation = path.join(__dirname, 'udf-list.lua')
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(new Aerospike.Key('test', 'demo', 'key1'), {example: 30})
     *     await client.put(new Aerospike.Key('test', 'demo', 'key2'), {example: 35})
     *     await client.udfRegister(scriptLocation)
     *
     *     // Execute the UDF
     *     let batchResult = await client.batchApply([new Aerospike.Key('test', 'demo', 'key1'), new Aerospike.Key('test', 'demo', 'key2')],
     *         {
     *             module: 'udf-list',
     *             funcname: 'updateRecord',
     *             args: ['example', 45]
     *         }
     *     );
     *
     *     // Access the records
     *     batchResult.forEach(result => {
     *         // Do something
     *         console.info("New value of example bin is %o \n", result.record.bins.SUCCESS);
     *     });
     *
     *     //Additional verfication
     *     let result = await client.get(new Aerospike.Key('test', 'demo', 'key1'))
     *     console.log(result.bins) // { example: 45 }
     *     result = await client.get(new Aerospike.Key('test', 'demo', 'key2'))
     *     console.log(result.bins) // { example: 45 }
     *
     *     // Close the connection to the server
     *     await client.close();
     * })(); *
     *
     * @example <caption>Simple lua script to be used in example above</caption>
     *
     * function updateRecord(rec, binName, binValue)
     *   rec[binName] = binValue
     *   aerospike:update(rec)
     *   return binValue
     * end
     */
    public batchApply(keys: KeyOptions[], udf: UDF, batchPolicy?: policy.BatchPolicy | null, batchApplyPolicy?: policy.BatchApplyPolicy | null): Promise<BatchResult[]>;

    /**
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param udf - Server UDF module/function and argList to apply.
     * @param callback - The function to call when
     * the operation completes. Includes the results of the batch operation.
     *
     */
    public batchApply(keys: KeyOptions[], udf: UDF, callback?: TypedCallback<BatchResult[]>): void;
    /**
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param udf - Server UDF module/function and argList to apply.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     *
     */
    public batchApply(keys: KeyOptions[], udf: UDF, batchPolicy?: policy.BatchPolicy, callback?: TypedCallback<BatchResult[]>): void;
    /**
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param udf - Server UDF module/function and argList to apply.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param batchApplyPolicy - UDF policy configuration parameters.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     *
     */
    public batchApply(keys: KeyOptions[], udf: UDF, batchPolicy?: policy.BatchPolicy, batchApplyPolicy?: policy.BatchApplyPolicy, callback?: TypedCallback<BatchResult[]>): void;

    /**
     * Checks the existence of a batch of records from the database cluster.
     *
     * @param keys - An array of Keys used to locate the records in the cluster.
     * @param policy - The Batch Policy to use for this operation.
     *
     * @returns A Promise that resolves to the results of the batch operation.
     *
     * @deprecated since v2.0 - use {@link Client#batchRead} instead.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var keys = [
     *   new Key('test', 'demo', 'key1'),
     *   new Key('test', 'demo', 'key2'),
     *   new Key('test', 'demo', 'key3')
     * ]
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(keys[0], {example: 30})
     *     await client.put(keys[1], {example: 35})
     *     await client.put(keys[2], {example: 40})
     *
     *     let results = await client.batchExists(keys)
     *     results.forEach((result) => {
     *         switch (result.status) {
     *             case Aerospike.status.OK:
     *                 console.log("Record found")
     *                 break
     *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
     *                 console.log("Record not found")
     *                 break
     *             default:
     *                 // error while reading record
     *                 console.log("Other error")
     *                 break
     *         }
     *     })
     *
     *     // Close the connection to the server
     *     await client.close();
     * })();
     *
     *
     */
    public batchExists(keys: KeyOptions[], policy?: policy.BatchPolicy | null): Promise<BatchResult[]>;
    /**
     * @param keys - An array of Keys used to locate the records in the cluster.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchExists(keys: KeyOptions[], callback: TypedCallback<BatchResult[]>): void;
    /**
     * @param keys - An array of Keys used to locate the records in the cluster.
     * @param policy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */    
    public batchExists(keys: KeyOptions[], policy: policy.BatchPolicy | null , callback: TypedCallback<BatchResult[]>): void;

    /**
     *
     * Read multiple records for specified batch keys in one batch call.
     *
     * @remarks
     *
     * This method allows different namespaces/bins to be requested for each key in
     * the batch. This method requires server >= 3.6.0.
     *
     * @param records - List of {@link BatchReadRecord} instances which each contain keys and bins to retrieve.
     * @param policy - The Batch Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that resolves to the results of the batch operation.
     *
     * @since v2.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const batchType = Aerospike.batchType
     * const op = Aerospike.operations
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var batchRecords = [
     *   { type: batchType.BATCH_READ,
     *     key: new Aerospike.Key('test', 'demo', 'key1'), bins: ['example'] },
     *   { type: batchType.BATCH_READ,
     *     key: new Aerospike.Key('test', 'demo', 'key2'), readAllBins: true },
     *   { type: batchType.BATCH_READ,
     *     key: new Aerospike.Key('test', 'demo', 'key3'),
     *     ops:[
     *          op.read('example')
     *         ]},
     *   { type: batchType.BATCH_READ,
     *     key: new Aerospike.Key('test', 'demo', 'key4')}
     * ]
     *
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(batchRecords[0].key, {example: 30})
     *     await client.put(batchRecords[1].key, {example: 35})
     *     await client.put(batchRecords[2].key, {example: 40})
     *     await client.put(batchRecords[3].key, {example: 45})
     *
     *     let results = await client.batchRead(batchRecords)
     *     results.forEach((result) => {
     *
     *         switch (result.status) {
     *             case Aerospike.status.OK:
     *                 console.log("Record found")
     *                 // Since the fourth record didn't specify bins to read,
     *                 // the fourth record will return no bins, eventhough the batchRead succeeded.
     *                 console.log(result.record.bins)
     *                 break
     *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
     *                 console.log("Record not found")
     *                 break
     *             default:
     *                 // error while reading record
     *                 console.log("Other error")
     *                 break
     *         }
     *     })
     *     // Close the connection to the server
     *     await client.close();
     * })();
     */    
    public batchRead(records: BatchReadRecord[], policy?: policy.BatchPolicy): Promise<BatchResult[]>;
    /**
     * @param records - List of {@link BatchReadRecord} instances which each contain keys and bins to retrieve.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchRead(records: BatchReadRecord[], callback?: TypedCallback<BatchResult[]>): void;
    /**
     * @param records - List of {@link BatchReadRecord} instances which each contain keys and bins to retrieve.
     * @param policy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */       
    public batchRead(records: BatchReadRecord[], policy?: policy.BatchPolicy | null, callback?: TypedCallback<BatchResult[]>): void;
    /**
     *
     * Reads a batch of records from the database cluster.
     *
     * @param keys - An array of {@link Key | Keys}, used to locate the records in the cluster.
     * @param policy - The Batch Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that resolves to the results of the batch operation.
     *
     * @deprecated since v2.0 - use {@link Client#batchRead} instead.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Key = Aerospike.Key
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var keys = [
     *   new Key('test', 'demo', 'key1'),
     *   new Key('test', 'demo', 'key2'),
     *   new Key('test', 'demo', 'key3')
     * ]
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(keys[0], {example: 30})
     *     await client.put(keys[1], {example: 35})
     *     await client.put(keys[2], {example: 40})
     *
     *     let results = await client.batchGet(keys)
     *     results.forEach((result) => {
     *         switch (result.status) {
     *             case Aerospike.status.OK:
     *                 console.log("Record found")
     *                 break
     *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
     *                 console.log("Record not found")
     *                 break
     *             default:
     *                 // error while reading record
     *                 console.log("Other error")
     *                 break
     *         }
     *     })
     *
     *     // Close the connection to the server
     *     await client.close();
     * })();
     *
     */  
    public batchGet(keys: KeyOptions[], policy?: policy.BatchPolicy | null): Promise<BatchResult[]>;
    /**
     *
     * @param keys - An array of {@link Key | Keys}, used to locate the records in the cluster.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchGet(keys: KeyOptions[], callback: TypedCallback<BatchResult[]>): void;
    /**
     *
     * @param keys - An array of {@link Key | Keys}, used to locate the records in the cluster.
     * @param policy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchGet(keys: KeyOptions[], policy: policy.BatchPolicy | null, callback: TypedCallback<BatchResult[]>): void;
    /**
     * Remove multiple records.
     *
     * @remarks
     *
     * This method removes the specified records from the database.
     * This method requires server >= 6.0.0.
     *
     * @param keys - {@link Key} An array of keys, used to locate the records in the cluster.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param batchRemovePolicy Remove policy configuration parameters.
     *
     * @returns A Promise that resolves to the results of the batch operation.
     *
     * @since v5.0.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const batchType = Aerospike.batchType
     * const exp = Aerospike.exp
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var keys = [
     *     new Aerospike.Key('test', 'demo', 'key1'),
     *     new Aerospike.Key('test', 'demo', 'key2'),
     *     new Aerospike.Key('test', 'demo', 'key3')
     * ]
     *
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(keys[0], {example: 30})
     *     await client.put(keys[1], {example: 35})
     *
     *     let results = await client.batchRemove(keys)
     *     results.forEach((result) => {
     *         switch (result.status) {
     *             case Aerospike.status.OK:
     *                 console.log("Record deleted")
     *                 break
     *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
     *                 console.log("Record not found")
     *                 break
     *             default:
     *                 // error while reading record
     *                 console.log("Other error")
     *                 break
     *         }
     *     })
     *     // Close the connection to the server
     *     await client.close();
     * })();
     */
    public batchRemove(keys: KeyOptions[], batchPolicy?: policy.BatchPolicy | null, batchRemovePolicy?: policy.BatchRemovePolicy | null): Promise<BatchResult[]>;
    /**
     * @param keys - {@link Key} An array of keys, used to locate the records in the cluster.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchRemove(keys: KeyOptions[], callback?: TypedCallback<BatchResult[]>): void;
    /**
     * @param keys - {@link Key} An array of keys, used to locate the records in the cluster.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchRemove(keys: KeyOptions[], batchPolicy?: policy.BatchPolicy | null, callback?: TypedCallback<BatchResult[]>): void;
    /**
     * @param keys - {@link Key} An array of keys, used to locate the records in the cluster.
     * @param batchPolicy - The Batch Policy to use for this operation.
     * @param batchRemovePolicy Remove policy configuration parameters.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchRemove(keys: KeyOptions[], batchPolicy?: policy.BatchPolicy | null, batchRemovePolicy?: policy.BatchRemovePolicy | null, callback?: TypedCallback<BatchResult[]>): void;
    
    /**
     *
     * Reads a subset of bins for a batch of records from the database cluster.
     *
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param bins - An array of bin names for the bins to be returned for the given keys.
     * @param policy - The Batch Policy to use for this operation.
     *
     * @returns {?Promise} - If no callback function is passed, the function
     * returns a Promise that resolves to the results of the batch operation.
     *
     * @deprecated since v2.0 - use {@link Client#batchRead} instead.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const batchType = Aerospike.batchType
     * const exp = Aerospike.exp
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var keys = [
     *     new Aerospike.Key('test', 'demo', 'key1'),
     *     new Aerospike.Key('test', 'demo', 'key2'),
     *     new Aerospike.Key('test', 'demo', 'key3')
     * ]
     *
     * var bins = ['example', 'user']
     *
     * ;(async () => {
     *     // Establishes a connection to the server
     *     let client = await Aerospike.connect(config);
     *
     *     // Place some records for demonstration
     *     await client.put(keys[0], {example: 30, user: 'Doug', extra: 'unused'})
     *     await client.put(keys[1], {example: 35})
     *
     *     let results = await client.batchSelect(keys, bins)
     *     results.forEach((result) => {
     *         switch (result.status) {
     *             case Aerospike.status.OK:
     *                 console.log("Record found")
     *                 // Since the fourth record didn't specify bins to read,
     *                 // the fourth record will return no bins, eventhough the batchRead succeeded.
     *                 console.log(result.record.bins)
     *                 break
     *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
     *                 console.log("Record not found")
     *                 break
     *             default:
     *                 // error while reading record
     *                 console.log("Other error")
     *                 break
     *         }
     *     })
     *     // Close the connection to the server
     *     await client.close();
     * })();
     */
    public batchSelect(keys: KeyOptions[], bins: string[], policy?: policy.BatchPolicy): Promise<BatchSelectRecord[]>;
    /**
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param bins - An array of bin names for the bins to be returned for the given keys.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchSelect(keys: KeyOptions[], bins: string[], callback: TypedCallback<BatchSelectRecord[]>): void;
    /**
     * @param keys - An array of keys, used to locate the records in the cluster.
     * @param bins - An array of bin names for the bins to be returned for the given keys.
     * @param policy - The Batch Policy to use for this operation.
     * @param callback - The function to call when
     * the operation completes, with the results of the batch operation.
     */
    public batchSelect(keys: KeyOptions[], bins: string[], policy: policy.BatchPolicy, callback: TypedCallback<BatchSelectRecord[]>): void;
    /**
    * Read/Write multiple records for specified batch keys in one batch call.
    *
    * This method allows different sub-commands for each key in the batch.
    * This method requires server >= 6.0.0.
    *
    * @param records - List of {@link BatchWriteRecord} instances which each contain keys and bins to retrieve.
    * @param policy - The Batch Policy to use for this operation.
    *
    * @since v6.0.0
    * 
    * @example
    *
    * const Aerospike = require('aerospike')
    * const batchType = Aerospike.batchType
    * const Key = Aerospike.Key
    * const op = Aerospike.operations
    *
    * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
    * var config = {
    *   hosts: '192.168.33.10:3000',
    *   // Timeouts disabled, latency dependent on server location. Configure as needed.
    *   policies: {
    *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0}),
    *   }
    * }
    *
    * const batchRecords = [
    *     {
    *         type: batchType.BATCH_REMOVE,
    *         key: new Key("test", "demo", 'key1')
    *     },
    *     {
    *         type: batchType.BATCH_WRITE,
    *         key: new Key("test", "demo", 'key2'),
    *         ops: [
    *             op.write('example', 30),
    *             op.write('blob', Buffer.from('foo'))
    *         ],
    *         policy: new Aerospike.BatchWritePolicy({
    *             exists: Aerospike.policy.exists.IGNORE
    *         })
    *     },
    *     {
    *         type: batchType.BATCH_WRITE,
    *         key: new Key("test", "demo", 'key3'),
    *         ops: [
    *             op.write('example', 35),
    *             op.write('blob', Buffer.from('bar'))
    *         ],
    *         policy: new Aerospike.BatchWritePolicy({
    *             exists: Aerospike.policy.exists.IGNORE
    *         })
    *     }
    * ]
    *
    * const batchReadRecords = [
    *     {
    *         type: batchType.BATCH_READ,
    *         key: new Key("test", "demo", 'key1'),
    *         readAllBins: true
    *     },
    *     {
    *         type: batchType.BATCH_READ,
    *         key: new Key("test", "demo", 'key2'),
    *         readAllBins: true
    *     },
    *     {
    *         type: batchType.BATCH_READ,
    *         key: new Key("test", "demo", 'key3'),
    *         readAllBins: true
    *     }
    * ]
    *
    * ;(async () => {
    *     // Establishes a connection to the server
    *     let client = await Aerospike.connect(config);
    *
    *     // Place a record for demonstration
    *     await client.put(new Key("test", "demo", 'key1'), {example: 30, user: 'Doug', extra: 'unused'})
    *
    *     let results = await client.batchWrite(batchRecords)
    *     results.forEach((result) => {
    *         switch (result.status) {
    *             case Aerospike.status.OK:
    *                 console.log("Record found")
    *                 break
    *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
    *                 console.log("Record not found")
    *                 break
    *             default:
    *                 // error while reading record
    *                 console.log("Other error")
    *                 break
    *         }
    *     })
    *
    *     results = await client.batchWrite(batchRecords)
    *     results.forEach((result) => {
    *         switch (result.status) {
    *             case Aerospike.status.OK:
    *                 console.log("Record found")
    *                 break
    *             case Aerospike.status.ERR_RECORD_NOT_FOUND:
    *                 console.log("Record not found")
    *                 break
    *             default:
    *                 // error while reading record
    *                 console.log("Other error")
    *                 break
    *         }
    *     })
    *     // Close the connection to the server
    *     await client.close();
    * })();
    */
    public batchWrite(records: BatchWriteRecord[], policy?: policy.BatchPolicy | null): Promise<BatchResult[]>;
    /**
    * @param records - List of {@link BatchWriteRecord} instances which each contain keys and bins to retrieve.
    * @param callback - The function to call when the operation completes, Includes the results of the batch operation.
    */
    public batchWrite(records: BatchWriteRecord[], callback?: TypedCallback<BatchResult[]>): void;
    /**
    * @param records - List of {@link BatchWriteRecord} instances which each contain keys and bins to retrieve.
    * @param policy - The Batch Policy to use for this operation.
    * @param callback - The function to call when the operation completes, Includes the results of the batch operation.
    */
    public batchWrite(records: BatchWriteRecord[], policy?: policy.BatchPolicy, callback?: TypedCallback<BatchResult[]>): void;
    /**
     *
     * Closes the client connection to the cluster.
     *
     * @param releaseEventLoop - Whether to release the event loop handle after the client is closed.  Default is `false`
     *
     * @see {@link releaseEventLoop}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     * Aerospike.connect(config)
     *   .then(client => {
     *     // client is ready to accept commands
     *     console.log("Connected. Now Closing Connection.")
     *     client.close()
     *   })
     *   .catch(error => {
      *    client.close()
     *     console.error('Failed to connect to cluster: %s', error.message)
     *   })
     */
    public close(releaseEventLoop?: boolean): void;
    /**
     * Establishes the connection to the cluster.
     *
     * @remarks
     *
     * Once the client is connected to at least one server node, it will start
     * polling each cluster node regularly to discover the current cluster status.
     * As new nodes are added to the cluster, or existing nodes are removed, the
     * client will establish or close down connections to these nodes. If the
     * client gets disconnected from the cluster, it will keep polling the last
     * known server endpoints, and will reconnect automatically if the connection
     * is reestablished.
     *
     * @param callback - The function to call once the
     * client connection has been established successfully and the client is ready
     * to accept commands.
     *
     * @return {?Promise} If no callback function is passed, the function returns
     * a Promise resolving to the connected client.
     *
     * @throws {AerospikeError} if event loop resources have already been released.
     *
     * @see {@link Config#connTimeoutMs} - Initial host connection timeout in milliseconds.
     * @see {@link connect} - Initial host connection timeout in milliseconds.
     * @see {@link releaseEventLoop}
     *
     * @example <caption>A connection established using callback function.</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     * Aerospike.connect(config, (error, client) => {
     *   if (error) {
     *     console.error('Failed to connect to cluster: %s', error.message)
     *     process.exit()
     *   } else {
     *     // client is ready to accept commands
     *     console.log("Connected. Now closing connection.")
     *     client.close()
     *   }
     * })
     */
    public connect(callback?: TypedCallback<Client>): Promise<Client>;
    /**
     * Returns a deserialized CDT Context
     *
     * @param serializedContext - base64 serialized {link cdt.Context}
     *
     * @return Deserialized CDT Context
     * 
     * @see {@link contextFromBase64} for a usage example.
     *
     * @since v5.6.0
     *
     */
    public contextFromBase64(serializedContext: string): cdt.Context;
    /**
     * Returns a serialized CDT Context
     *
     * @param context - {@link cdt.Context}
     *
     * @return serialized context - base64 representation of the CDT Context
     *
     * @since v5.6.0
     *
     * @example <caption>How to use CDT context serialization</caption>
     *
     * const Aerospike = require('aerospike');
     * const Context = Aerospike.cdt.Context
     * // Define host configuration
     * let config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     *
     * Aerospike.connect(config, async (error, client) => {
     *   // Create a context
     *   let context = new Context().addMapKey('nested')
     *
     *   // Create keys for records to be written
     *   let recordKey = new Aerospike.Key('test', 'demo', 'record')
     *   let contextKey = new Aerospike.Key('test', 'demo', 'context')
     *
     *   // Put record with a CDT
     *   await client.put(recordKey, {exampleBin: {nested: {food: 'blueberry', drink: 'koolaid'}}})
     *
     *   // Test the context with client.operate()
     *   var ops = [
     *     Aerospike.maps.getByKey('exampleBin', 'food', Aerospike.maps.returnType.KEY_VALUE).withContext(context)
     *   ]
     *   let results = await client.operate(recordKey, ops)
     *   console.log(results.bins.exampleBin) // [ 'food', 'blueberry' ]
     *
     *   // Serialize CDT Context
     *   let serializedContext = client.contextToBase64(context)
     *
     *   // Put record with bin containing the serialized record
     *   await client.put(contextKey, {context: serializedContext})
     *
     *   // Get context when needed for operation
     *   let contextRecord = await client.get(contextKey)
     *
     *   // Deserialize CDT Context
     *   context = client.contextFromBase64(contextRecord.bins.context)
     *
     *   // Test the context with client.operate()
     *   ops = [
     *     Aerospike.maps.getByKey('exampleBin', 'food', Aerospike.maps.returnType.KEY_VALUE).withContext(context)
     *   ]
     *   results = await client.operate(recordKey, ops)
     *   console.log(results.bins.exampleBin) // [ 'food', 'blueberry' ]
     *
     *   // Close the client
     *   client.close()
     * })
     */
    public contextToBase64(context: cdt.Context): string;
    /**
     * Creates a blob secondary index index.
     *
     * This is a short-hand for calling {@link Client#createIndex}
     * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.BLOB</code>.
     *
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     *
     * @see {@link Client#createIndex}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   var binName = 'location'
     *   var indexName = 'locationIndex'
     *   var options = { ns: 'test',
     *                   set: 'demo',
     *                   bin: binName,
     *                   index: indexName }
     *
     *   client.createBlobIndex(options, function (error) {
     *     if (error) throw error
     *     console.info('SI %s on %s was created successfully', indexName, binName)
     *     client.close()
     *   })
     * })
     */
    public createBlobIndex(options: IndexOptions, policy?: policy.InfoPolicy | null): Promise<IndexJob>;
    /**
     * @param options - Options for creating the index.
     * @param callback - The function to call when the operation completes.
     */
    public createBlobIndex(options: IndexOptions, callback: TypedCallback<IndexJob>): void;
    /**
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     */
    public createBlobIndex(options: IndexOptions, policy: policy.InfoPolicy | null, callback: TypedCallback<IndexJob>): void;
    /**
     *
     * Creates a secondary index (SI).
     *
     * @remarks
     *
     * Calling the <code>createIndex</code> method issues an
     * index create command to the Aerospike cluster and returns immediately. To
     * verify that the index has been created and populated with all the data use
     * the {@link IndexJob} instance returned by the callback.
     *
     * Aerospike currently supports indexing of strings, integers and geospatial
     * information in GeoJSON format.
     *
     * ##### String Indexes
     *
     * A string index allows for equality lookups. An equality lookup means that if
     * you query for an indexed bin with value "abc", then only records containing
     * bins with "abc" will be returned.
     *
     * ##### Integer Indexes
     *
     * An integer index allows for either equality or range lookups. An equality
     * lookup means that if you query for an indexed bin with value 123, then only
     * records containing bins with the value 123 will be returned. A range lookup
     * means that if you can query bins within a range. So, if your range is
     * (1...100), then all records containing a value in that range will be
     * returned.
     *
     * ##### Geo 2D Sphere Indexes
     *
     * A geo 2d sphere index allows either "contains" or "within" lookups. A
     * "contains" lookup means that if you query for an indexed bin with GeoJSON
     * point element, then only records containing bins with a GeoJSON element
     * containing that point will be returned. A "within" lookup means that if you
     * query for an indexed bin with a GeoJSON polygon element, then all records
     * containing bins with a GeoJSON element wholly contained within that polygon
     * will be returned.
     *
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A Promise that will resolve to an {@link IndexJob} instance.
     *
     * @see {@link indexType} for enumeration of supported index types.
     * @see {@link indexDataType} for enumeration of supported data types.
     * @see {@link IndexJob}
     *
     * @since v2.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const Context = Aerospike.cdt.Context
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   // create index over user's recent locations
     *   let namespace = 'test'
     *   let set = 'demo'
     *   let binName = 'rloc' // recent locations
     *   let indexName = 'recentLocationsIdx'
     *   let indexType = Aerospike.indexType.LIST
     *   let dataType = Aerospike.indexDataType.GEO2DSPHERE
     *   let context = new Context().addListIndex(0)
     *   let options = { ns: namespace,
     *                   set: set,
     *                   bin: binName,
     *                   index: indexName,
     *                   type: indexType,
     *                   datatype: dataType,
     *                   context: context }
     *
     *   let policy = new Aerospike.InfoPolicy({ timeout: 100 })
     *
     *   client.createIndex(options, policy, (error, job) => {
     *     if (error) throw error
     *
     *     // wait for index creation to complete
     *     var pollInterval = 100
     *     job.waitUntilDone(pollInterval, (error) => {
     *       if (error) throw error
     *       console.info('SI %s on %s was created successfully', indexName, binName)
     *       client.close()
     *     })
     *   })
     * })
     */
    public createIndex(options: IndexOptions, policy?: policy.InfoPolicy | null): Promise<IndexJob>;
    /**
     * @param options - Options for creating the index.
     * @param callback - The function to call when the operation completes.
     */
    public createIndex(options: IndexOptions, callback: TypedCallback<IndexJob>): void;
    /**
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     */
    public createIndex(options: IndexOptions, policy: policy.InfoPolicy | null, callback: TypedCallback<IndexJob>): void;
    /**
     * Creates a SI of type Integer.
     *
     * @remarks This is a short-hand for calling {@link Client#createIndex}
     * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.NUMERIC</code>.
     *
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     *
     * @see {@link Client#createIndex}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   var binName = 'age'
     *   var indexName = 'ageIndex'
     *   var options = { ns: 'test',
     *                   set: 'demo',
     *                   bin: binName,
     *                   index: indexName }
     *
     *   client.createIntegerIndex(options, function (error) {
     *     if (error) throw error
     *     console.info('SI %s on %s was created successfully', indexName, binName)
     *     client.close()
     *   })
     * })
     */
    public createIntegerIndex(options: IndexOptions, policy?: policy.InfoPolicy | null): Promise<IndexJob>;
    /**
     * @param options - Options for creating the index.
     * @param callback - The function to call when the operation completes.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     */
    public createIntegerIndex(options: IndexOptions, callback: TypedCallback<IndexJob>): void;
    /**
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     */
    public createIntegerIndex(options: IndexOptions, policy: policy.InfoPolicy | null, callback: TypedCallback<IndexJob>): void;
    /**
     * Creates a SI of type String.
     *
     * @remarks This is a short-hand for calling {@link Client#createIndex}
     * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.STRING</code>.
     *
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     *
     * @see {@link Client#createIndex}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   var binName = 'name'
     *   var indexName = 'nameIndex'
     *   var options = { ns: 'test',
     *                   set: 'demo',
     *                   bin: binName,
     *                   index: indexName }
     *
     *   client.createStringIndex(options, function (error) {
     *     if (error) throw error
     *     console.info('SI %s on %s was created successfully', indexName, binName)
     *     client.close()
     *   })
     * })
     */
    public createStringIndex(options: IndexOptions, policy?: policy.InfoPolicy): Promise<IndexJob>;
    /**
     * @param options - Options for creating the index.
     * @param callback - The function to call when the operation completes.
     */
    public createStringIndex(options: IndexOptions, callback: TypedCallback<IndexJob>): void;
    /**
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     */
    public createStringIndex(options: IndexOptions, policy: policy.InfoPolicy, callback: TypedCallback<IndexJob>): void;
    /**
     * Creates a geospatial secondary secondary index.
     *
     * @remarks This is a short-hand for calling {@link Client#createIndex}
     * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.GEO2DSPHERE</code>.
     *
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns {?Promise} - A Promise that will resolve to an {@link IndexJob} instance.
     *
     * @see {@link Client#createIndex}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   var binName = 'location'
     *   var indexName = 'locationIndex'
     *   var options = { ns: 'test',
     *                   set: 'demo',
     *                   bin: binName,
     *                   index: indexName }
     *
     *   client.createGeo2DSphereIndex(options, function (error) {
     *     if (error) throw error
     *     console.info('SI %s on %s was created successfully', indexName, binName)
     *     client.close()
     *   })
     * })
     */
    public createGeo2DSphereIndex(options: IndexOptions, policy?: policy.InfoPolicy): Promise<IndexJob>;
    /**
     * @param options - Options for creating the index.
     * @param callback - The function to call when the operation completes.
     */
    public createGeo2DSphereIndex(options: IndexOptions, callback: TypedCallback<IndexJob>): void;
    /**
     * @param options - Options for creating the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     */
    public createGeo2DSphereIndex(options: IndexOptions, policy: policy.InfoPolicy, callback: TypedCallback<IndexJob>): void;
    /**
     *
     * Applies a User Defined Function (UDF) on a record in the database.
     * 
     * @remarks Use this function to apply a
     * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDF</a>
     * on a single record and return the result of the UDF function call. Record
     * UDFs can be used to augment both read and write behavior.
     *
     * For additional information please refer to the section on
     * <a href="https://www.aerospike.com/docs/udf/developing_record_udfs.html">&uArr;Developing Record UDFs</a>
     * in the Aerospike technical documentation.
     *
     * @param key - The key, used to locate the record in the cluster.
     * @param udfArgs - Parameters used to specify which UDF function to execute.
     * @param policy - The Apply Policy to use for this operation.
     *
     * @returns {?Promise} A Promise that resolves to the value returned by the UDF.
     *
     * @since v2.0
     *
     * @see {@link Client#udfRegister} to register a UDF module to use with <code>apply()</code>.
     * @see {@link Query#background} and {@link Scan#background} to apply a Record UDF function to multiple records instead.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * const config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     apply : new Aerospike.ApplyPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * var key = new Aerospike.Key('test', 'demo', 'value')
     *
     * var udfArgs = {
     *   module: 'my_udf_module',
     *   funcname: 'my_udf_function',
     *   args: ['abc', 123, 4.5]
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.apply(key, udfArgs, (error, result) => {
     *     if (error) throw error
     *
     *     console.log('Result of calling my_udf_function:', result)
     *   })
     * })
     */
    public apply(key: KeyOptions, udfArgs: UDF, policy?: policy.ApplyPolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key, used to locate the record in the cluster.
     * @param udfArgs - Parameters used to specify which UDF function to execute.
     * @param callback - This function will be called with the
     * result returned by the Record UDF function call.
     */
    public apply(key: KeyOptions, udfArgs: UDF, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key, used to locate the record in the cluster.
     * @param udfArgs - Parameters used to specify which UDF function to execute.
     * @param policy - The Apply Policy to use for this operation.
     * @param callback - This function will be called with the
     * result returned by the Record UDF function call.
     */
    public apply(key: KeyOptions, udfArgs: UDF, policy: policy.ApplyPolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     *
     * @param transaction - {@link Transaction} instance.
     * @param callback - This function will be called with the
     * result returned by the abort function call.
     *
     *
     * @since v6.0.0
     *
     *
     * @example <caption>Abort a transaction.</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *    }
     * }
     *
     * let key1 = new Aerospike.Key('test', 'demo', 'myKey')
     * let key2 = new Aerospike.Key('test', 'demo', 'myKey')
     * 
     * let record1 = {abc: 123}
     * let record2 = {def: 456}
     * 
     * ;(async () => {
     *   let client = await Aerospike.connect(config)
     *   
     *   const policy = {
     *        txn: mrt
     *    }
     *
     *    await client.put(key4, record2, meta, policy)
     *
     *    const policyRead = {
     *        txn: mrt
     *    }
     *
     *    let get_result = await client.get(key1, policy) // Will reflect the new value recently put.
     *
     *    await client.put(key2, record2, meta, policy)
     *
     *    let result = await client.abort(mrt)
     *
     *    get_result = await client.get(key4) // Will reset to the value present before transaction started.
     *
     *    get_result = await client.get(key5) // Will reset to the value present before transaction started.
     * 
     *    await client.close()
     * })();
     */
    public abort(transaction: Transaction, callback: Function): void;
    /**
     *
     * @param transaction - {@link Transaction} instance.
     *
     * @returns A Promise that resolves to the value returned by abort.
     *
     */
    public abort(transaction: Transaction): Promise<abortStatus>;
    /**
     *
     * @param transaction - {@link Transaction} instance.
     * @param callback - This function will be called with the
     * result returned by the commit function call.
     *
     *
     * @since v6.0.0
     *
     *
     * @example <caption>Commit a simple transaction.</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *    }
     * }
     *
     * let bins = {
     *   int: 123,
     *   double: 3.1415,
     *   string: 'xyz',
     *   bytes: Buffer.from('hello world!'),
     *   list: [1, 2, 3],
     *   map: {num: 123, str: 'abc', list: ['a', 'b', 'c']}
     * }
     * let meta = {
     *   ttl: 386400 // 1 day
     * }
     * let key1 = new Aerospike.Key('test', 'demo', 'myKey1')
     * let key2 = new Aerospike.Key('test', 'demo', 'myKey2')
     * 
     * let policy = {
     *   txn: mrt
     * };
     * ;(async () => {
     *    let client = await Aerospike.connect(config)

     *    let mrt = new Aerospike.Transaction()
     *

     *
     *    await client.put(key1, bins, meta, policy)
     *    await client.put(key2, bins, meta, policy)
     *    let get_result = await client.get(key1, policy)
     *
     *    let result = await client.commit(mrt)
     *    await client.close()
     * })();
     */
    public commit(transaction: Transaction, callback: Function): void;
    /**
     *
     * @param transaction - {@link Transaction} instance.
     *
     * @returns A Promise that resolves to the value returned by commit.
     *
     */
    public commit(transaction: Transaction): Promise<abortStatus>;

    /**
     * Checks the existance of a record in the database cluster.
     *
     * @param key - The key of the record to check for existance.
     * @param policy - The Read Policy to use for this operation.
     * 
     * @returns {?Promise} A Promise that resolves to <code>true</code> if the record exists or
     * <code>false</code> otherwise.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * let key = new Aerospike.Key('test', 'demo', 'key1')
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.exists(key)
     *       .then(exists => console.info('Key "%s" exists: %s', key.key, exists))
     *       .then(() => client.close())
     *       .catch(error => {
     *         console.error('Error checking existance of key:', error)
     *         client.close()
     *       })
     *   })
     *   .catch(error => {
     *     console.error('Error connecting to cluster:', error)
     *   })
     */
    public exists(key: KeyOptions, policy?: policy.ReadPolicy | null): Promise<boolean>;
    /**
     * @param key - The key of the record to check for existance.
     * @param callback - The function to call when the
     * operation completes; the passed value is <code>true</code> if the record
     * exists or <code>false</code> otherwise.
     */   
    public exists(key: KeyOptions, callback: TypedCallback<boolean>): void;
    /**
     * @param key - The key of the record to check for existance.
     * @param policy - The Read Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes; the passed value is <code>true</code> if the record
     * exists or <code>false</code> otherwise.
     */   
    public exists(key: KeyOptions, policy: policy.ReadPolicy | null, callback: TypedCallback<boolean>): void;
    /**
     * Checks the existance of a record in the database cluster.
     *
     * @param key - The key of the record to check for existance.
     * @param policy - The Read Policy to use for this operation.
     * 
     * @returns A Promise that resolves to an {@link AerospikeRecord} containing no bins and a {@link RecordMetadata} object.
     * If the metadata contains data, the record exists. If the metadata contains null values, then the record does not exist.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * let key = new Aerospike.Key('test', 'demo', 'key1')
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.exists(key)
     *       .then(exists => console.info('Key "%s" exists: %s', key.key, exists))
     *       .then(() => client.close())
     *       .catch(error => {
     *         console.error('Error checking existance of key:', error)
     *         client.close()
     *       })
     *   })
     *   .catch(error => {
     *     console.error('Error connecting to cluster:', error)
     *   })
     */    
    public existsWithMetadata(key: KeyOptions, policy?: policy.ReadPolicy): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record to check for existance.
     * @param callback - The function to call when the
     * operation completes; An {@link AerospikeRecord} will be passed to the callback, containing no bins and a {@link RecordMetadata} object.
     * If the metadata contains data, the record exists. If the metadata contains null values, then the record does not exist.
     */
    public existsWithMetadata(key: KeyOptions, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record to check for existance.
     * @param policy - The Read Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes; An {@link AerospikeRecord} will be passed to the callback, containing no bins and a {@link RecordMetadata} object.
     * If the metadata contains data, the record exists. If the metadata contains null values, then the record does not exist.
     */
    public existsWithMetadata(key: KeyOptions, policy: policy.ReadPolicy, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * Using the key provided, reads a record from the database cluster.
     *
     * @param key - The key used to locate the record in the cluster.
     * @param policy - The Read Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to a {@link Record}.
     *
     * @example
     * const Aerospike = require('aerospike')
     * var key = new Aerospike.Key('test', 'demo', 'key1')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.get(key, (error, record) => {
     *     if (error) throw error
     *     console.log(record)
     *     client.close()
     *   })
     * })
     *
     */
    public get(key: KeyOptions, policy?: policy.ReadPolicy): Promise<AerospikeRecord>;
    /**
     * @param key - The key used to locate the record in the cluster.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public get(key: KeyOptions, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key used to locate the record in the cluster.
     * @param policy - The Read Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public get(key: KeyOptions, policy: policy.ReadPolicy, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * Removes the specified index.
     *
     * @param namespace - The namespace on which the index was created.
     * @param index - The name of the index.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns {?Promise} A <code>Promise</code> that resolves once the operation completes.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     * Aerospike.connect(config, (error, client) => {
     *   client.indexRemove('location', 'locationIndex', (error) => {
     *     if (error) throw error
     *     client.close()
     *   })
     * })
     */
    public indexRemove(namespace: string, index: string, policy?: policy.InfoPolicy | null): Promise<void>;
    /**
     * @param namespace - The namespace on which the index was created.
     * @param index - The name of the index.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */
    public indexRemove(namespace: string, index: string, callback: TypedCallback<void>): void;
    /**
     * @param namespace - The namespace on which the index was created.
     * @param index - The name of the index.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */
    public indexRemove(namespace: string, index: string, policy: policy.InfoPolicy | null, callback: TypedCallback<void>): void;
    /**
     * Sends an info query to a specific cluster node.
     *
     * @remarks The <code>request</code> parameter is a string representing an
     * info request. If it is not specified, a default set of info values will be
     * returned.
     *
     * Please refer to the
     * <a href="http://www.aerospike.com/docs/reference/info">Info Command Reference</a>
     * for a list of all available info commands.
     *
     * @param request - The info request to send.
     * @param host - See {@link Host}. The address of the cluster host to send the request to.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to an info result string.

     * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
     *
     * @deprecated since v3.11.0 - use {@link Client#infoNode} or {@link Client#infoAny} instead.
     *
     * @example <caption>Sending a 'statistics' info query to a single host</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.info('statistics', {addr: '192.168.33.10', port: 3000}, (error, response) => {
     *     if (error) throw error
     *     console.log(response)
     *     client.close()
     *   })
     * })
     *
     */ 
    public info(request: string, host: Host | string, policy?: policy.InfoPolicy | null): Promise<string>;
    /**
     * @param request - The info request to send.
     * @param host - See {@link Host}. The address of the cluster host to send the request to.
     * @param callback - The function to call when an info response from a cluster host is received.
     */
    public info(request: string | undefined, host: Host | string, callback: TypedCallback<string>): void;
    /**
     * @param request - The info request to send.
     * @param host - See {@link Host}. The address of the cluster host to send the request to.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when an info response from a cluster host is received.
     */
    public info(request: string | undefined, host: Host | string, policy: policy.InfoPolicy | null, callback: TypedCallback<string>): void;
    /**
     * Sends an info query to a single, randomly selected cluster node.
     *
     * @remarks The <code>request</code> parameter is a string representing an
     * info request. If it is not specified, a default set of info values will be
     * returned.
     *
     * @param request - The info request to send.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to an info result string.
     * 
     * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
     *
     * @since v2.4.0
     *
     * @example <caption>Sending 'statistics' info command to random cluster node</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.infoAny('statistics', (error, response) => {
     *     if (error) throw error
     *     console.log(response)
     *     client.close()
     *   })
     * })
     *
     */
    public infoAny(request?: string | undefined, policy?: policy.InfoPolicy | null): Promise<string>;
    /**
     * @param callback - The function to call once the node
     * returns the response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoAny(callback: TypedCallback<string>): void;
    /**
     * @param request - The info request to send.
     * @param callback - The function to call once the node
     * returns the response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoAny(request?: string | undefined, callback?: TypedCallback<string>): void;
    /**
     * @param request - The info request to send.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call once the node
     * returns the response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoAny(request?: string | undefined, policy?: policy.InfoPolicy | null, callback?: TypedCallback<string>): void;
    /**
     *
     * Sends an info query to all nodes in the cluster and collects the
     * results.
     *
     * @remarks The <code>request</code> parameter is a string representing an
     * info request. If it is not specified, a default set of info values will be
     * returned.
     *
     * @param request - The info request to send.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to an {@link InfoAllResponse}.
     * 
     * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
     *
     * @since v2.3.0
     *
     * @example <caption>Sending info command to whole cluster</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   Client.infoAll('statistics', (error, response) => {
     *     if (error) throw error
     *     console.log(response)
     *     client.close()
     *   })
     * })
     *
     */
    public infoAll(request?: string | undefined, policy?: policy.InfoPolicy | null): Promise<InfoAllResponse[]>;
    /**
     * @param request - The info request to send.
     * @param callback - The function to call once all nodes have
     * returned a response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoAll(request?: string | undefined, callback?: TypedCallback<InfoAllResponse[]>): void;
    /**
     * @param request - The info request to send.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call once all nodes have
     * returned a response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoAll(request?: string | undefined, policy?: policy.InfoPolicy | null, callback?: TypedCallback<InfoAllResponse[]>): void;
    /**
     * Sends an info query to a single node in the cluster.
     *
     * @remarks The <code>request</code> parameter is a string representing an
     * info request. If it is not specified, a default set of info values will be
     * returned.
     *
     * @param request - The info request to send.
     * @param node - The node to send the request to. See {@link InfoNodeParam}.
     * @param policy - The Info Policy to use for this operation.
     * 
     * @returns A <code>Promise</code> that resolves to an info result string.
     * 
     * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
     *
     * @since v3.11.0
     *
     * @example <caption>Sending 'statistics' info command to specific cluster node</caption>
     *
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   const node = client.getNodes().pop()
     *   client.infoNode('statistics', node, (error, response) => {
     *     if (error) throw error
     *     console.log(response)
     *     client.close()
     *   })
     * })
     *
     */
    public infoNode(request: string | undefined, node: InfoNodeParam, policy?: policy.InfoPolicy | null): Promise<string>;
    /**
     * @param request - The info request to send.
     * @param node - The node to send the request to. See {@link InfoNodeParam}.
     * @param callback - The function to call once the node
     * returns the response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoNode(request: string | undefined, node: InfoNodeParam, callback: TypedCallback<string>): void;
    /**
     * @param request - The info request to send.
     * @param node - The node to send the request to. See {@link InfoNodeParam}.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call once the node
     * returns the response to the info command; if no callback function is
     * provided, the method returns a <code>Promise<code> instead.
     */
    public infoNode(request: string | undefined, node: InfoNodeParam, policy: policy.InfoPolicy | null, callback: TypedCallback<string>): void;
    /**
     * Is client connected to any server nodes.
     *
     * @param checkTenderErrors - Whether to consider a server
     * node connection that has had 5 consecutive info request failures during
     * cluster tender. Default is true.
     *
     * @returns {boolean} <code>true</code> if the client is currently connected to any server nodes.
     *
     * @since v2.0
     */
    public isConnected(checkTenderErrors?: boolean): boolean;
    /**
     * Performs multiple operations on a single record.
     *
     * @remarks Operations can be created using the methods in one of the
     * following modules:
     * * {@link operations} - General operations on all types.
     * * {@link lists} - Operations on CDT List values.
     * * {@link maps} - Operations on CDT Map values.
     * * {@link bitwise} - Operations on Bytes values.
     *
     * @param key - The key of the record.
     * @param operations - List of {@link operations.Operation | Operations} to perform on the record.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     * var ops = [
     *   op.append('a', 'xyz'),
     *   op.incr('b', 10),
     *   op.read('b')
     * ]
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.put(key, { a: 'abc', b: 42 }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, record) => {
     *       if (error) throw error
     *       console.log(record.bins) // => { b: 52 }
     *       client.close()
     *     })
     *   })
     * })
     *
     */
    public operate(key: KeyOptions, operations: operations.Operation[], metadata?: RecordMetadata | null, policy?: policy.OperatePolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record.
     * @param operations - List of {@link operations.Operation | Operations} to perform on the record.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public operate(key: KeyOptions, operations: operations.Operation[], callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param operations - List of {@link operations.Operation | Operations} to perform on the record.
     * @param metadata - Meta data.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public operate(key: KeyOptions, operations: operations.Operation[], metadata: RecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param operations - List of {@link operations.Operation | Operations} to perform on the record.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public operate(key: KeyOptions, operations: operations.Operation[], metadata: RecordMetadata | null, policy: policy.OperatePolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * Shortcut for applying the {@link
     * operations.append} operation to one or more record bins.
     *
     * @remarks This function works on bins of type string or bytes; to append
     * a new value (of any type) to a bin containing a list of existing values, use
     * the {@link lists.append} operation instead.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the
     * corresponding values to append to the bin value. The bins must contain
     * either string or byte array values and the values to append must be of the
     * same type.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     *
     * @returns A Promise that resolves to the results of the opertion.
     *
     * @see {@link Client#operate}
     * @see {@link operations.append}
     */    
    public append(key: KeyOptions, bins: AerospikeBins, metadata?: RecordMetadata | null, policy?: policy.OperatePolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the
     * corresponding values to append to the bin value. The bins must contain
     * either string or byte array values and the values to append must be of the
     * same type.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public append(key: KeyOptions, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the
     * corresponding values to append to the bin value. The bins must contain
     * either string or byte array values and the values to append must be of the
     * same type.
     * @param metadata - Meta data.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public append(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the
     * corresponding values to append to the bin value. The bins must contain
     * either string or byte array values and the values to append must be of the
     * same type.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public append(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, policy: policy.OperatePolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     *
     * Shortcut for applying the {@link operations.prepend} operation to one or more record bins.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     *
     * @returns A Promise that resolves to the results of the opertion.
     *
     * @see {@link Client#operate}
     * @see {@link operations.prepend}
     */
    public prepend(key: KeyOptions, bins: AerospikeBins, metadata?: RecordMetadata | null, policy?: policy.OperatePolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public prepend(key: KeyOptions, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
     * @param metadata - Meta data.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public prepend(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public prepend(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, policy: policy.OperatePolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * Shortcut for applying the {@link operations.add} operation to one or more record bins.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     *
     * @returns A Promise that resolves to the results of the opertion.
     *
     * @since v2.0
     *
     * @see {@link Client#operate}
     * @see {@link operations.incr}
     */
    public add(key: KeyOptions, bins: AerospikeBins, metadata?: RecordMetadata | null, policy?: policy.OperatePolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public add(key: KeyOptions, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public add(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param metadata - Meta data.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     */
    public add(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, policy: policy.OperatePolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     *
     * Alias for {@link Client#add}.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     * 
     * @returns A Promise that resolves to the results of the opertion.
     */
    public incr(key: KeyOptions, bins: AerospikeBins, metadata?: RecordMetadata, policy?: policy.OperatePolicy): Promise<AerospikeRecord>;
    /**
     *
     * Alias for {@link Client#add}.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     * 
     */       
    public incr(key: KeyOptions, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
    /**
     *
     * Alias for {@link Client#add}.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param metadata - Meta data.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     * 
     */
    public incr(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     *
     * Alias for {@link Client#add}.
     *
     * @param key - The key of the record.
     * @param bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
     * @param metadata - Meta data.
     * @param policy - The Operate Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation.
     * 
     */
    public incr(key: KeyOptions, bins: AerospikeBins, metadata: RecordMetadata | null, policy: policy.OperatePolicy | null, callback: TypedCallback<AerospikeRecord>): void;
    /**
     * Writes a record to the database cluster.
     *
     * @remarks
     * If the record exists, it modifies the record with bins provided.
     * To remove a bin, set its value to <code>null</code>.
     *
     * __Note:__ The client does not perform any automatic data type conversions.
     * Attempting to write an unsupported data type (e.g. boolean) into a record
     * bin will cause an error to be returned. Setting an <code>undefined</code>
     * value will also cause an error.
     *
     * @param key - The key of the record.
     * @param bins - A record object used for specifying the fields to store.
     * @param meta - Meta data.
     * @param policy - The Write Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to a {@link Record}.

     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * const Key = Aerospike.Key
     *
     * var key = new Key('test', 'demo', 'key1')
     * var bins = {
     *   a: 'xyz',
     *   b: 123
     * }
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.put(key, bins, (error) => {
     *     if (error) throw error
     *     client.get(key, (error, record) => {
     *       if (error) throw error
     *       console.log(record)
     *       client.close()
     *     })
     *   })
     * })
     */
    public put(key: KeyOptions, bins: AerospikeBins | Map<string, AerospikeBinValue> | Bin | AerospikeRecord, meta?: RecordMetadata | null, policy?: policy.WritePolicy | null): Promise<Key>;
    /**
     * @param key - The key of the record.
     * @param bins - A record object used for specifying the fields to store.
     * @param callback - The function to call when the operation completes with the result of the operation.
     */
    public put(key: KeyOptions, bins: AerospikeBins | Map<string, AerospikeBinValue> | Bin | AerospikeRecord, callback: TypedCallback<Key>): void;
    /**
     * @param key - The key of the record.
     * @param bins - A record object used for specifying the fields to store.
     * @param meta - Meta data.
     * @param callback - The function to call when the operation completes with the result of the operation.
     */
    public put(key: KeyOptions, bins: AerospikeBins | Map<string, AerospikeBinValue> | Bin | AerospikeRecord, meta: RecordMetadata | null, callback: TypedCallback<Key>): void;
    /**
     * @param key - The key of the record.
     * @param bins - A record object used for specifying the fields to store.
     * @param meta - Meta data.
     * @param policy - The Write Policy to use for this operation.
     * @param callback - The function to call when the operation completes with the result of the operation.
     */
    public put(key: KeyOptions, bins: AerospikeBins | Map<string, AerospikeBinValue> | Bin | AerospikeRecord, meta: RecordMetadata | null, policy: policy.WritePolicy | null, callback: TypedCallback<Key>): void;
    /**
     * Creates a new {@link Query} instance, which is used to define query
     * in the database.
     *
     * @param ns - The namespace to be queried.
     * @param options - Query parameters. See {@link Query} constructor for details.
     *
     * @returns A <code>Promise</code> that resolves to a {@link Query}.

     * @see {@link Query}
     *
     * @example
     *
     * const filter = Aerospike.filter
     *
     * var statement = {}
     * statment.filters: [filter.equal('color', 'blue')]
     *
     * var query = client.query(ns, set, statment)
     * var stream = query.execute()
     */
    public query(ns: string, options?: QueryOptions): Query;
    /**
     * @param ns - The namespace to be queried.
     * @param set - The set on which the query is to be executed.
     * @param options - Query parameters. See {@link Query} constructor for details.
     */
    public query(ns: string, set: string | null, options?: QueryOptions): Query;
    /**
     *
     * Removes a record with the specified key from the database cluster.
     *
     * @param key - The key of the record.
     * @param policy - The Remove Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to the {@link Key} of the removed record.

     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     remove : new Aerospike.RemovePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * const Key = Aerospike.Key
     *
     * var key = new Key('test', 'demo', 'key1')
     * var bins = {
     *   a: 'xyz',
     *   b: 123
     * }
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.put(key, bins, (error) => {
     *     if (error) throw error
     *     client.remove(key, (error) => {
     *       if (error) throw error
     *       console.log("Record removed")
     *       client.close()
     *     })
     *   })
     * })
     */
    public remove(key: KeyOptions, policy?: policy.RemovePolicy | null): Promise<Key>;
    /**
     * @param key - The key of the record.
     * @param callback - The function to call when the operation completes with the results of the operation.
     */
    public remove(key: KeyOptions, callback: TypedCallback<Key>): void;
    /**
     * @param key - The key of the record.
     * @param policy - The Remove Policy to use for this operation.
     * @param callback - The function to call when the operation completes with the results of the operation.
     */
    public remove(key: KeyOptions, policy: policy.RemovePolicy | null, callback: TypedCallback<Key>): void;
    /**
     *
     * Removes a seed host from the cluster.
     *
     * @param hostname - Hostname/IP address of the seed host
     * @param port - Port number; defaults to {@link Config#port} or 3000.
     *
     * @since v2.6.0
     */
    public removeSeedHost(hostname: string, port?: number): void;
    /**
     * Creates a new {@link Scan} instance in order to execute a database
     * scan using the Scan API.
     *
     * @see {@link Scan} constructor for options that can be used to initialize a
     * new instance.
     *
     * @param ns - The namescape.
     * @param options - Scan parameters. See {@link Scan} constructor for details.
     *
     * @returns A <code>Promise</code> that resolves to a {@link Query}.
     * 
     * @since v2.0
     */
    public scan(ns: string, options?: ScanOptions): Scan;
    /**
     * @param ns - The namescape.
     * @param set - The name of a set.
     * @param options - Scan parameters. See {@link Scan} constructor for details.
     * 
     * @returns A <code>Promise</code> that resolves to a {@link Query}.
     */
    public scan(ns: string, set?: string, options?: ScanOptions): Scan;
    /**
     *
     * Retrieves selected bins for a record of given key from the database cluster.
     *
     * @param key - The key of the record.
     * @param bins - A list of bin names for the bins to be returned.
     * @param policy - The Read Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves to a {@link AerospikeRecord}.
     * 
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     *
     * const Key = Aerospike.Key
     *
     * var key = new Key('test', 'demo', 'key1')
     *
     * var bins = {
     *   a: 'xyz',
     *   b: 123
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   client.put(key, bins, (error) => {
     *     if (error) throw error
     *     client.select(key, ['a', 'b'], (error, record) => {
     *       if (error) throw error
     *       console.log(record)
     *       client.close()
     *     })
     *   })
     * })
     *
     */
    public select(key: KeyOptions, bins: string[], policy?: policy.ReadPolicy | null): Promise<AerospikeRecord>;
    /**
     * @param key - The key of the record.
     * @param bins - A list of bin names for the bins to be returned.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public select(key: KeyOptions, bins: string[], callback: TypedCallback<AerospikeRecord>): void;
    /**
     * @param key - The key of the record.
     * @param bins - A list of bin names for the bins to be returned.
     * @param policy - The Read Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     */
    public select(key: KeyOptions, bins: string[], policy: policy.ReadPolicy | null, callback: TypedCallback<AerospikeRecord>): void;

    /**
     * Removes records in specified namespace/set efficiently.
     *
     * @remarks This method is many orders of magnitude faster than deleting
     * records one at a time. It requires server 3.12 or later.
     *
     * @param ns - Required namespace.
     * @param set - Optional set name. Set to <code>null</code> to delete
     * all sets in namespace.
     * @param beforeNanos - Optionally delete records before given last
     * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
     * specified, the value must be before the current time. Pass in 0 to delete
     * all records in namespace/set regardless of last udpate time.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A <code>Promise</code> that resolves when the truncate is complete.
     * 
     * @see https://www.aerospike.com/docs/reference/info#truncate
     */
    public truncate(ns: string, set: string | null, beforeNanos: number, policy?: policy.InfoPolicy | null): Promise<void>;

    /**
     * @param ns - Required namespace.
     */
    public truncate(ns: string, callback: TypedCallback<void>): void;
    /**
     * @param ns - Required namespace.
     * @param set - Optional set name. Set to <code>null</code> to delete
     * all sets in namespace.
     */
    public truncate(ns: string, set: string | null, callback: TypedCallback<void>): void;
    /**
     * @param ns - Required namespace.
     * @param set - Optional set name. Set to <code>null</code> to delete
     * all sets in namespace.
     * @param beforeNanos - Optionally delete records before given last
     * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
     * specified, the value must be before the current time. Pass in 0 to delete
     * all records in namespace/set regardless of last udpate time.
     */
    public truncate(ns: string, set: string | null, beforeNanos: number, callback: TypedCallback<void>): void;
    /**
     * @param ns - Required namespace.
     * @param set - Optional set name. Set to <code>null</code> to delete
     * all sets in namespace.
     * @param beforeNanos - Optionally delete records before given last
     * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
     * specified, the value must be before the current time. Pass in 0 to delete
     * all records in namespace/set regardless of last udpate time.
     * @param policy - The Info Policy to use for this operation.
     */
    public truncate(ns: string, set: string | null, beforeNanos: number, policy: policy.InfoPolicy | null, callback: TypedCallback<void>): void;
    /**
     * Registers a UDF module with the database cluster.
     *
     * @remarks This method loads a Lua script from the local filesystem into
     * the Aerospike database cluster and registers it for use as a UDF module. The
     * client uploads the module to a single cluster node. It then gets distributed
     * within the whole cluster automatically. The callback function is called once
     * the initial upload into the cluster has completed (or if an error occurred
     * during the upload). One of the callback parameters is a {@link UdfJob}
     * instance that can be used to verify that the module has been registered
     * successfully on the entire cluster.
     *
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param udfType - Language of the UDF script. Lua is the default
     * and only supported scripting language for UDF modules at the moment; ref.
     * {@link language}.
     * @param policy - The Info Policy to use for this operation.
     *
     * @returns A Promise that resolves to a {@link Job} instance.
     * 
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * Aerospike.connect((error, client) => {
     *   if (error) throw error
     *
     *   var path = './udf/my_module.lua'
     *   client.udfRegister(path, (error, job) => {
     *     if (error) throw error
     *
     *     job.waitUntilDone(100, (error) => {
     *       if (error) throw error
     *
     *       // UDF module was successfully registered on all cluster nodes
     *
     *       client.close()
     *     })
     *   })
     * })
     */
    public udfRegister(udfPath: string, udfType?: language | null, policy?: policy.InfoPolicy | null): Promise<Job>;
    /**
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param policy - The Info Policy to use for this operation.
     * 
     * @returns A Promise that resolves to a {@link Job} instance.
     */
    public udfRegister(udfPath: string, policy?: policy.InfoPolicy | null): Promise<Job>;
    /**
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */

    public udfRegister(udfPath: string, callback: TypedCallback<Job>): void;
    /**
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param udfType - Language of the UDF script. Lua is the default
     * and only supported scripting language for UDF modules at the moment; ref.
     * {@link language}.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */
    public udfRegister(udfPath: string, udfType: language | null, callback: TypedCallback<Job>): void;
    /**
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */
    public udfRegister(udfPath: string, policy: policy.InfoPolicy | null, callback: TypedCallback<Job>): void;
    /**
     * @param udfPath - The file path to the Lua script to load into the server.
     * @param udfType - Language of the UDF script. Lua is the default
     * and only supported scripting language for UDF modules at the moment; ref.
     * {@link language}.
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes with the result of the operation.
     */
    public udfRegister(udfPath: string, udfType: language | null, policy: policy.InfoPolicy | null, callback: TypedCallback<Job>): void;
    /**
     * Returns runtime stats about the client instance.
     *
     * @returns {@link Stats | Client Stats}
     *
     * @since v3.8.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     * }
     *
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *   const stats = client.stats()
     *   console.info(stats) // => { commands: { inFlight: 0, queued: 0 },
     *                       //      nodes:
     *                       //       [ { name: 'BB94DC08D270008',
     *                       //           syncConnections: { inPool: 1, inUse: 0 },
     *                       //           asyncConnections: { inPool: 0, inUse: 0 } },
     *                       //         { name: 'C1D4DC08D270008',
     *                       //           syncConnections: { inPool: 0, inUse: 0 },
     *                       //           asyncConnections: { inPool: 0, inUse: 0 } } ] }
     *   client.close()
     * })
     *
     */
    public stats(): Stats;
    /**
     * Removes a UDF module from the cluster.
     *
     * @remarks The info command to deregister the UDF module is sent to a
     * single cluster node by the client. It then gets distributed within the whole
     * cluster automatically. The callback function is called once the initial info
     * command has succeeded (or if an error occurred). One of the callback
     * parameters is a {@link UdfJob} instance that can be used to verify that the
     * module has been removed successfully from the entire cluster.
     *
     * For server versions 4.5.0 and before, trying to delete an UDF module that
     * does not exist on the server, will return an error. Starting with server
     * version 4.5.1, the server no longer returns an error and the command will
     * succeed.
     *
     * @param udfModule - The basename of the UDF module, without the
     * local pathname but including the file extension (".lua").
     * @param policy - The Info Policy to use for this operation.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * Aerospike.connect((error, client) => {
     *   if (error) throw error
     *
     *   var module = 'my_module.lua'
     *   client.udfRemove(module, (error, job) => {
     *     if (error) throw error
     *
     *     job.waitUntilDone(100, (error) => {
     *       if (error) throw error
     *
     *       // UDF module was successfully removed from all cluster nodes
     *
     *       client.close()
     *     })
     *   })
     * })
     */
    public udfRemove(udfModule: string, policy?: policy.InfoPolicy | null): Promise<Job>;
    /**
     * @param udfModule - The basename of the UDF module, without the
     * local pathname but including the file extension (".lua").
     * @param callback - The function to call when the
     * operation completes which the result of the operation.
     * 
     */
    public udfRemove(udfModule: string, callback: TypedCallback<Job>): void;
    /**
     * @param udfModule - The basename of the UDF module, without the
     * local pathname but including the file extension (".lua").
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call when the
     * operation completes which the result of the operation.
     * 
     */
    public udfRemove(udfModule: string, policy: policy.InfoPolicy, callback: TypedCallback<Job>): void;
    /**
     * Updates log settings for the client.
     * 
     * @param logConfig - A {@link Log} instance containing a log level and/or a file descriptor. For more info, see {@link Log}
     */
    public updateLogging(logConfig: Log): void;
    /**
     * Client#changePassword
     *
     * Change a user's password.
     *
     * @param user - User name for the password change.
     * @param password - User password in clear-text format.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // User must be created before password is changed. See {@link Client#createUser} for an example.
     *     client.changePassword("khob", "TryTiger7!", ["Engineer"])
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public changePassword(user: string, password: string, policy?: policy.AdminPolicy | null): void;
    /**
     * Create user with password and roles. Clear-text password will be hashed using bcrypt before sending to server.
     *
     * @param user - User name for the new user.
     * @param password - User password in clear-text format.
     * @param roles - Optional array of role names. For more information on roles, see {@link admin.Role}.
     * @param policy - Optional {@link policy.AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     client.createUser("khob", "MightyMice55!", ["Engineer"])
     *     // Must wait a short length of time of the user to be fully created.
     *     await wait(5)
     *     const user = await client.queryUser("khob", null)
     *     console.log(user)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */    
    public createUser(user: string, password: string, roles?: Array<string> | null, policy?: policy.AdminPolicy | null): void;
    /**
     * Create user defined role with optional privileges, whitelist and read/write quotas.
     * Quotas require server security configuration "enable-quotas" to be set to true.
     *
     * @param roleName - role name
     * @param privileges - List of privileges assigned to a role.
     * @param policy - Optional {@link AdminPolicy}.
     * @param  whitelist - Optional list of allowable IP addresses assigned to role. IP addresses can contain wildcards (ie. 10.1.2.0/24).
     * @param readQuota - Optional maximum reads per second limit, pass in zero for no limit.
     * @param writeQuota - Optional maximum writes per second limit, pass in zero for no limit.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configs can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     client.createRole("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.READ_WRITE), new Aerospike.admin.Privilege(Aerospike.privilegeCode.TRUNCATE)], null)
     *     // Must wait a short length of time of the role to be fully created.
     *     await wait(5)
     *     const role = await client.queryRole("Engineer", null)
     *     console.log(role)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public createRole(roleName: string, privileges: Array<admin.Privilege>, policy?: policy.AdminPolicy | null, whitelist?: Array<string> | null, readQuota?: number | null, writeQuota?: number | null  ): void;
    /**
     * Drop user defined role.
     *
     * @param roleName - role name
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A role must be created before a role can be dropped. See {@link Client#createRole} for an example.
     *     client.dropRole("Engineer")
     *     // Must wait a short length of time of the role to be fully dropped.
     *     await wait(5)
     *     let roles = await client.queryRoles()
     *     // 'Engineer' should no longer appear in the logged list of roles
     *     console.log(roles)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public dropRole(roleName: string, policy?: policy.AdminPolicy | null): void;
    /**
     *
     * Remove a User from cluster
     *
     * @param user - User name to be dropped.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A user must be created before a user can be dropped. See {@link Client#createUser} for an example.
     *     client.dropUser("khob")
     *     // Must wait a short length of time of the role to be fully dropped.
     *     await wait(5)
     *     let users = await client.queryUsers()
     *     // 'khob' should no longer appear in the logged list of roles
     *     console.log(users)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public dropUser(user: string, policy?: policy.AdminPolicy | null): void;
    /**
     * Grant privileges to an user defined role.
     *
     * @param roleName - role name
     * @param privileges - list of privileges assigned to a role.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A role must be created before privileges can be granted. See {@link Client#createUser} for an example.
     *     client.grantPrivileges("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
     *     // Must wait a short length of time for the privilege to be granted.
     *     await wait(5)
     *     let role = await client.queryRole("Engineer")
     *     console.log(role)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public grantPrivileges(roleName: string, privileges: Array<admin.Privilege>, policy?: policy.AdminPolicy | null): void;
    /**
     *
     * Drop user defined role.
     *
     * @param user - User name for granted roles
     * @param roles - Optional array of role names. For more information on roles, see {@link admin.Role}.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A user must be created before roles can be granted. See {@link Client#createUser} for an example.
     *     client.grantRoles("khob", ["Engineer"])
     *     // Must wait a short length of time for the role to be granted
     *     await wait(5)
     *     let user = await client.queryUser("khob")
     *     console.log(user)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */
    public grantRoles(user: string, roles: Array<string>, policy?: policy.AdminPolicy | null): void;
    /**
     *
     * Retrieves an {@link admin.Role} from the database.
     *
     * @param {String} roleName - role name filter.
     * @param {Object} policy - Optional {@link AdminPolicy}.
     *
     * @returns An instance of {@link admin.Role}. For more information on roles, see {@link admin.Role}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A role must be created before a role can be queried. See {@link Client#createRole} for an example.
     *     let role = await client.queryRole("Engineer")
     *     console.log(role)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public queryRole(roleName: string, policy?: policy.AdminPolicy | null): admin.Role;
    /**
     *
     * Retrieve all roles and role information from the database.
     *
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @returns An list of {@link admin.Role} instances. For more information on roles, see {@link admin.Role}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     let roles = await client.queryRoles()
     *     console.log(roles)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */        
    public queryRoles(policy?: policy.AdminPolicy | null): Array<admin.Role>;
    /**
     * Retrieves an {@link admin.User} from the database.
     *
     * @param user - User name filter.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @returns An instance of {@link admin.User}. For more information on roles, see {@link admin.User}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     // A user must be created before a user can be queried. See {@link Client#createUser} for an example.
     *     let user = await client.queryUser("khob")
     *     console.log(user)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public queryUser(user: string, policy?: policy.AdminPolicy | null): admin.User;
    /**
     *
     * Retrieves All user and user information from the database.
     *
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @returns An list of {@link admin.User} instances. For more information on roles, see {@link admin.User}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *
     *     let users = await client.queryUsers()
     *     console.log(users)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */
    public queryUsers(policy?: policy.AdminPolicy | null): Array<admin.User>;
    /**
     *
     * Revoke privileges from an user defined role.
     *
     * @param roleName - role name
     * @param privileges - List of privileges assigned to a role.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *     // A role must be created before privileges can be revoked. See {@link Client#createRole} for an example.
     *     client.revokePrivileges("Engineer", [new Aerospike.admin.Privilege(Aerospike.privilegeCode.SINDEX_ADMIN)])
     *     // Must wait a short length of time for the privilege to be granted.
     *     await wait(5)
     *     let users = await client.queryRole("Engineer")
     *     console.log(users)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */    
    public revokePrivileges(roleName: string, privileges: Array<admin.Privilege>, policy?: policy.AdminPolicy | null): void;
    /**
     * Remove roles from user's list of roles.
     *
     * @param user - User name for revoked roles.
     * @param roles - Optional array of role names. For more information on roles, see {@link admin.Role}.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *     // A user must be created before roles can be revoked. See {@link Client#createUser} for an example.
     *     client.revokeRoles("khob", ["Engineer"])
     *     // Must wait a short length of time for the privilege to be granted.
     *     await wait(5)
     *     let user = await client.queryUser("khob")
     *     console.log(user)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     */    
    public revokeRoles(user: string, roles: Array<string>, policy?: policy.AdminPolicy | null): void;
    /**
     * Set maximum reads/writes per second limits for a role. If a quota is zero, the limit is removed.
     * Quotas require server security configuration "enable-quotas" to be set to true.
     *
     * @param roleName - role name
     * @param readQuota - maximum reads per second limit, pass in zero for no limit.
     * @param writeQuota - maximum writes per second limit, pass in zero for no limit.
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *     // Quotas must be enabled in the server configurations for quotas to be set.
     *     client.setQuotas("Engineer", 200, 300)
     *     // Must wait a short length of time for the privilegee to be granted.
     *     await wait(5)
     *     let role = await client.queryRole("Engineer")
     *     console.log(role)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */    
    public setQuotas(roleName: string, readQuota: number, writeQuota: number, policy?: policy.AdminPolicy | null): void;
    /**
     * Set IP address whitelist for a role. If whitelist is null or empty, remove existing whitelist from role.
     *
     * @param  roleName - role name
     * @param whitelist - Optional list of allowable IP addresses assigned to role.
     * IP addresses can contain wildcards (ie. 10.1.2.0/24).
     * @param policy - Optional {@link AdminPolicy}.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * function wait (ms) {
     *     return new Promise(resolve => setTimeout(resolve, ms))
     * }
     *
     * ;(async function () {
     *   let client
     *   try {
     *     client = await Aerospike.connect({
     *         hosts: '192.168.33.10:3000',
     *         policies: {
     *           write : new Aerospike.WritePolicy({socketTimeout : 1, totalTimeout : 1}),
     *         },
     *         // Must have security enabled in server configuration before user and password configurations can be used.
     *         user: 'admin',
     *         password: 'admin'
     *     })
     *     // Quotas must be enabled in the server configurations for quotas to be set.
     *     client.setWhitelist("Engineer", ["172.17.0.2"])
     *     // Must wait a short length of time for the privilegee to be granted.
     *     await wait(5)
     *     let role = await client.queryRole("Engineer")
     *     console.log(role)
     *   } catch (error) {
     *     console.error('Error:', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */   
    public setWhitelist(roleName: string, whitelist: Array<string> | null, policy?: policy.AdminPolicy | null): void;
}

/**
 * The Config class contains the settings for an Aerospike client
 * instance, including the list of seed hosts, default policies, and other
 * settings.
 *
 * @throws {TypeError} If invalid config values are passed.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let config = {
 *   hosts: '192.168.1.10,192.168.1.11',
 *   user: process.env.DATABASE_USER,
 *   password: process.env.DATABASE_PASSWORD,
 *   policies: {
 *     read: new Aerospike.ReadPolicy({
 *       totalTimeout: 0
 *     })
 *   },
 *   log: {
 *     level: Aerospike.log.INFO,
 *     file: 2 // log to stderr
 *   }
 * }
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     client.close()
 *   })
 *   .catch(error => {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *   })
 *
 *
 * // Initializes a new client configuration from the given config values.
 *
 */
export class Config {
    /**
     * Authentication mode used when user/password is defined.
     * 
     * One of the auth modes defined in {@link auth}.
     */
    public authMode?: auth;
    /**
     * Initial host connection timeout in milliseconds.
     * 
     * The client observes this timeout when opening a connection to
     * the cluster for the first time.
     * 
     * @default 1000
     */
    public connTimeoutMs?: number;
    /**
     * Expected Cluster Name.
     * 
     * If not <code>null</code>, server nodes must return this
     * cluster name in order to join the client's view of the cluster. Should
     * only be set when connecting to servers that support the "cluster-name"
     * info command.
     * 
     * @since v2.4
     */
    public clusterName?: string;
    /**
     *
     * The number of cluster tend iterations that defines the window for {@link maxErrorRate} to be surpassed. One tend iteration is defined
     * as {@link tenderInterval} plus the time to tend all nodes. At the end of the window, the error count is reset to zero and backoff state is removed on all nodes.
     *
     * @type {number}
     *
     * @default 1
     */
    public errorRateWindow?: number;
    /**
     * List of hosts with which the client should attempt to connect.
     * 
     * If not specified, the client attempts to read the host list
     * from the <code>AEROSPIKE_HOSTS</code> environment variable or else falls
     * back to use a default value of "localhost".
     *
     * @example <caption>Setting <code>hosts</code> using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:3000,192.168.0.2:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000 },
     *   { addr: '192.168.0.2', port: 3000 }
     * ]
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> with TLS name using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:example.com:3000,192.168.0.2:example.com:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port/tlsname tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000, tlsname: 'example.com' },
     *   { addr: '192.168.0.2', port: 3000, tlsname: 'example.com' }
     * ]
     * const client = await Aerospike.connect({ hosts })
     */
    public hosts: Host[] | string;    

    /**
     * Configuration for logging done by the client.
     *

     *
     * @example <caption>Enabling debug logging to a separate log file</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const fs = require('fs')
     *
     * var debuglog = fs.openSync('./debug.log', 'w')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   log: {
     *     level: Aerospike.log.DEBUG,
     *     file: debuglog
     *   }
     * }
     * Aerospike.connect(config, (err, client) => {
     *   if (err) throw err
     *   console.log("Connected. Now closing connection.")
     *   client.close()
     * })
     */
    public log?: Log;
    /**
     * Node login timeout in milliseconds.
     * 
     * @type {number}
     * @default 5000
     */
    public loginTimeoutMs?: number;
    /**
     * Maximum number of asynchronous connections allowed per server node.
     *
     * New transactions will be rejected with an {@link
     * status.ERR_NO_MORE_CONNECTIONS | ERR_NO_MORE_CONNECTIONS}
     * error if the limit would be exceeded.
     *     *
     * @default 100
     */
    public maxConnsPerNode?: number;
    /**
     * Maximum number of errors allowed per node per error_rate_window before backoff algorithm returns
     * `AEROSPIKE_MAX_ERROR_RATE` for database commands to that node. If max_error_rate is zero, there is no error limit.
     * The counted error types are any error that causes the connection to close (socket errors and client timeouts),
     * server device overload and server timeouts.
     *
     * The application should backoff or reduce the transaction load until `AEROSPIKE_MAX_ERROR_RATE` stops being returned.
     *
     * If the backoff algorithm has been activated, transactions will fail with {@link
     * status.AEROSPIKE_MAX_ERROR_RATE | AEROSPIKE_MAX_ERROR_RATE} until the {@link errorRateWindow} has passed and the
     * error count has been reset.
     *
     * @default 100
     */
    public maxErrorRate?: number;
    /**
     * Maximum socket idle time in seconds.
     *
     * Connection pools will discard sockets that have been idle
     * longer than the maximum. The value is limited to 24 hours (86400).
     *
     * It's important to set this value to a few seconds less than the server's
     * <code>proto-fd-idle-ms</code> (default 60000 milliseconds or 1 minute),
     * so the client does not attempt to use a socket that has already been
     * reaped by the server.
     *
     * Connection pools are now implemented by a LIFO stack. Connections at the
     * tail of the stack will always be the least used. These connections are
     * checked for <code>maxSocketIdle</code> once every 30 tend iterations
     * (usually 30 seconds).
     *
     *
     * @default 0 seconds
     */
    public maxSocketIdle?: number;
    /**
     * Minimum number of asynchronous connections allowed per server node.
     *
     * Preallocate min connections on client node creation. The
     * client will periodically allocate new connections if count falls below
     * min connections.
     *
     * Server <code>proto-fd-idle-ms</code> may also need to be increased
     * substantially if min connections are defined. The
     * <code>proto-fd-idle-ms</code> default directs the server to close
     * connections that are idle for 60 seconds which can defeat the purpose of
     * keeping connections in reserve for a future burst of activity.
     *
     * If server <code>proto-fd-idle-ms</code> is changed, client {@link
     * Config#maxSocketIdle} should also be changed to be a few seconds less
     * than <code>proto-fd-idle-ms</code>.
     *
     * @default 0
     */
    public minConnsPerNode?: number;
    /**
     * Configuration values for the mod-lua user path.
     *
     * If you are using user-defined functions (UDF) for processing
     * query results (i.e. aggregations), then you will find it useful to set
     * the <code>modlua</code> settings. Of particular importance is the
     * <code>modelua.userPath</code>, which allows you to define a path to where
     * the client library will look for Lua files for processing.
     *
     */
    public modlua: ModLua;

    /**
     * The password to use when authenticating to the cluster.
     */
    public password?: string;

    /**
     * Global client policies.
     *
     * The configuration defines default policies for the
     * application. Policies define the behavior of the client, which can be
     * global for all uses of a single type of operation, or local to a single
     * use of an operation.
     *
     * Each database operation accepts a policy for that operation as an
     * argument. This is considered a local policy, and is a single use policy.
     * This local policy supersedes any global policy defined.
     *
     * If a value of the policy is not defined, then the rule is to fallback to
     * the global policy for that operation. If the global policy for that
     * operation is undefined, then the global default value will be used.
     *
     * If you find that you have behavior that you want every use of an
     * operation to utilize, then you can specify the default policy as
     * {@link Config#policies}.
     *
     * For example, the {@link Client#put} operation takes a {@link
     * WritePolicy} parameter. If you find yourself setting the {@link
     * WritePolicy#key} policy value for every call to {@link Client.put}, then
     * you may find it beneficial to set the global {@link WritePolicy} in
     * {@link Config#policies}, which all operations will use.
     *     *
     * @example <caption>Setting a default <code>key</code> policy for all write operations</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     write: new Aerospike.WritePolicy({
     *       key: Aerospike.policy.key.SEND,
     *       socketTimeout : 0,
     *       totalTimeout : 0
     *     })
     *   }
     * }
     *
     * let key = new Aerospike.Key('test', 'demo', 123)
     *
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.put(key, {int: 42})
     *       .then(() => client.close())
     *       .catch(error => {
     *         throw error
     *         client.close()
     *       })
     *   })
     *   .catch(console.error)
     */
    public policies: ConfigPolicies;
    /**
     * Default port to use for any host address, that does not
     * explicitly specify a port number. Default is 3000.
     *      *
     * @since v2.4
     */
    public port: number;
    /**
     * Track server rack data.
     * 
     * This field is useful when directing read commands to the
     * server node that contains the key and exists on the same rack as the
     * client. This serves to lower cloud provider costs when nodes are
     * distributed across different racks/data centers.
     *
     * {@link rackId} config, {@link
     * policy.replica.PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @default false
     * 
     * @since 3.8.0
     */
    public rackAware?: boolean;
    /**
     *  Rack where this client instance resides.
     * 
     * {@link rackAware} config, {@link policy.replica.PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @default 0
     * 
     * @since 3.8.0
     */
    public rackId?: number;
    /**
     * Shared memory configuration.
     * 
     * This allows multiple client instances running in separate
     * processes on the same machine to share cluster status, including nodes and
     * data partition maps. Each shared memory segment contains state for one
     * Aerospike cluster. If there are multiple Aerospike clusters, a different
     * <code>key</code> must be defined for each cluster.
     * 
     * @see {@link http://www.aerospike.com/docs/client/c/usage/shm.html#operational-notes|Operational Notes}
     *
     * @example <caption>Using shared memory in a clustered setup</caption>
     *
     * const Aerospike = require('aerospike')
     * const cluster = require('cluster')
     *
     * const config = {
     *   sharedMemory: {
     *     key: 0xa5000000
     *   }
     * }
     * const client = Aerospike.client(config)
     * const noWorkers = 4
     *
     * if (cluster.isMaster) {
     *   // spawn new worker processes
     *   for (var i = 0; i < noWorkers; i++) {
     *     cluster.fork()
     *   }
     * } else {
     *   // connect to Aerospike cluster in each worker process
     *   client.connect((err) => { if (err) throw err })
     *
     *   // handle incoming HTTP requests, etc.
     *   // http.createServer((request, response) => { ... })
     *
     *   // close DB connection on shutdown
     *   client.close()
     * }
     */
    public sharedMemory?: SharedMemory;

    /**
     * Polling interval in milliseconds for cluster tender.
     * 
     * @default 1000
     */
    public tenderInterval?: number;
    /**
     * Configure Transport Layer Security (TLS) parameters for secure
     * connections to the database cluster. TLS connections are not supported as
     * of Aerospike Server v3.9 and depend on a future server release.
     * 
     * @since v2.4
     */
    public tls?: TLSInfo;
    /**
     * Whether the client should use the server's
     * <code>alternate-access-address</code> instead of the
     * <code>access-address</code>.
     *
     * @default false
     * 
     * @since v3.7.1
     */
    public useAlternateAccessAddress: boolean;
    /**
     * The user name to use when authenticating to the cluster.
     * 
     * Leave empty for clusters running without access management.
     * (Security features are available in the Aerospike Database Enterprise
     * Edition.)
     * 
     */
    public user?: string;

    /**
     * Construct an instance of the Config class.
     */
    constructor(config?: ConfigOptions);

    /**
     * Set default policies from the given policy values.
     *
     * @param policies - one or more default policies
     * @throws {TypeError} if any of the properties of the policies object is not
     * a valid policy type
     */
    public setDefaultPolicies(policies?: ConfigPolicies): void;
}

/**
 * All the decimal values with valid fractions (e.g. 123.45) will be
 * stored as double data type in Aerospike. To store decimal values with 0
 * fraction as double, the value needs to be wrapped in a `Double` class
 * instance
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Double = Aerospike.Double
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * // (1.0) must be wrapped with "Double" in order to be added to another double.
 * // (6.283) does not need to be wrapped, but it may be wrapped if convenient.
 * ops = [Aerospike.operations.incr('d', 6.283),
 *        Aerospike.operations.incr('d', new Double(1.0))]
 * const key = new Aerospike.Key('test', 'demo', 'myDouble')
 * var record = { d: 3.1415 }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, record, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error) => {
 *       if (error) throw error
 *       client.get(key, (error, record) => {
 *         console.log(record.bins.d) // => 10.4245
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
export class Double {
    /**
     *  Creates a new Double instance.
     *
     * @param value - The value of the double.
     */
    constructor(value: number);
    /**
     * Value represented as a Double.
     */
    public Double: number;
    /**
     * Returns Double value to user.
     */
    public value(): number;
}

/**
 *
 * Error raised by the client when execution of a database command fails. This
 * may be either due to an error status code returned by the server, or caused
 * by an error condition that occured on the client side.
 *
 * @example <caption>Expected output: "Error: 127.0.0.1:3000 Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE [2]"</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 *
 * let key = new Aerospike.Key('test', 'key', 'does_not_exist')
 * Aerospike.connect()
 *   .then(client => {
 *     client.get(key)
 *       .then(record => console.info(record))
 *       .catch(error => console.error(`Error: ${error.message} [${error.code}]`))
 *       .then(() => client.close())
 *   })
 */
export class AerospikeError extends Error {
    /**
     * Numeric status code returned by the server or the client.
     *     *
     * @see {@link statusNamespace} contains the full list of possible status codes.
     */
    readonly code: typeof statusNamespace[keyof typeof statusNamespace];
    /**
     * Command during which the error occurred.
     */
    readonly command: any | null;
    /**
     * C/C++ function name in which the error occurred.
     */
    readonly func?: string | null;
    /**
     * File name of the C/C++ source file in which the error occurred.
     */
    readonly file?: string | null;
    /**
     * Line number in the C/C++ source file in which the error occurred.
     *
     * @type {?number}
     */
    readonly line?: number | null;
    /**
     * It is possible that a write transaction completed even though the client
     * returned this error. This may be the case when a client error occurs
     * (like timeout) after the command was sent to the server.
     */
    readonly inDoubt?: boolean;
    /**
     * Constructs a new instace of AerospikeError.
     */
    constructor(message?: string, command?: any);
    private static fromASError(asError: AerospikeError | Error | null, command?: AerospikeError): AerospikeError;
    private static copyASErrorProperties(target: AerospikeError, source: Error): void;
    private static formatMessage(message: string, code: typeof statusNamespace[keyof typeof statusNamespace]): string;
    private setStackTrace(stack: string): void;
    /**
     * Indicates whether the error originated on the database server.
     *
     * @returns <code>true</code> if the server raised the error, <code>false</code> otherwise.
     */
    public isServerError(): boolean;
    /**
     * The {@link Client} instance associated with this error, if any.
     *
     * @since v3.7.0
     *
     * @example <caption>Closing the client connection, when an error occurs:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     * Aerospike.connect(config).then(async client => {
     *   await client.put(new Aerospike.Key('demo', 'test', 'foo'), { 'foo': 'bar' })
     *   client.close()
     * }).catch(error => {
     *   console.error('Error: %s [%i]', error.message, error.code)
     *   if (error.client) error.client.close()
     * })
     */
    get client(): Client | void;
}

/**
 * Representation of a GeoJSON value. Since GeoJSON values are JSON
 * objects they need to be wrapped in the <code>GeoJSON</code> class so that
 * the client can distinguish them from other types of objects.
 *
 * For more information, please refer to the section on
 * <a href="https://docs.aerospike.com/server/guide/data-types/geospatial" title="Aerospike Geospatial Data Type">&uArr;Geospatial Data Type</a>
 * in the Aerospike technical documentation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const Key = Aerospike.Key
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *
 *   }
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   let key = new Key('test', 'demo', 'bob')
 *   let location = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})
 *   client.put(key, {loc: location}, (error) => {
 *     if (error) throw error
 *     client.get(key, (error, record) => {
 *       if (error) throw error
 *       console.log(record.bins.loc) // => {"type":"Point","coordinates":[103.913,1.308]}
 *       client.close()
 *     })
 *   })
 * })
 *
 */
export class GeoJSON {
    /**
     * Creates a new GeoJSON instance.
     *
     * @param json - GeoJSON value; the constructor accepts
     * either a string representation of the JSON object, or a JS object.
     */
    constructor(json: string | object);
    /**
     *
     * Helper function to create a new GeoJSON geometry object
     * representing a circle with the given coordinates and radius.
     *
     * @param lng - Longitude of the center point.
     * @param lat - Latitude of the center point.
     * @param radius - Radius in meters.
     * @returns a GeoJSON representation of the circle.
     *
     * @see [Aerospike GeoJSON Extension]{@link https://www.aerospike.com/docs/guide/geospatial.html#aerospike-geojson-extension}
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const GeoJSON = Aerospike.GeoJSON
     *
     * let point = GeoJSON.Circle(103.913, 1.308, 5000)
     */
    static Circle: {
        new (lng: number, lat: number, radius: number);
    };
    /**
     *
     * Helper function to create a new GeoJSON object representing the
     * point with the given coordinates.
     *
     * @param lng - Longitude
     * @param lat - Latitude
     * 
     * @returns a GeoJSON representation of the point
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const GeoJSON = Aerospike.GeoJSON
     *
     * let point = GeoJSON.Point(103.913, 1.308)
     */
    static Point: {
        new (lng: number, lat: number);
    };
    /**
     *
     * Helper function to create a new GeoJSON object representing the
     * polygon with the given coordinates.
     *
     * @param coordinates - one or more coordinate pairs (lng, lat)
     * describing the polygon.
     * 
     * @returns a GeoJSON representation of the polygon.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const GeoJSON = Aerospike.GeoJSON
     *
     * let polygon = GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])
     */
    static Polygon: {
        new (...coordinates: number[][]);
    };
    public str?: string;
    /**
     * Returns the GeoJSON value as a JS object.
     *
     */
    public toJSON(): GeoJSONType;
    /**
     * Returns the GeoJSON value as a string
     *
     */
    public toString(): string;
    /**
     * Alias for {@link GeoJSON#toJSON}. Returns the GeoJSON value as a JS object.
     *
     * @return {Object}
     */
    public value(): GeoJSONType;

}
/**
 * Return type of {@link UdfJob.info} and {@link IndexJob.info}
 */
export interface SindexInfo {
    /**
     * Percentage indicating the progress of secondary index populate phase.
     */
    load_pct: number;
}

/**
 * Job class for waiting for UDF module registration/deregistration
 * to complete across an entire Aerospike cluster.
 * 
 *
 * @see {@link Client#udfRegister}
 * @see {@link Client#udfRemove}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let path = './udf/my_module.lua'
 *
 * Aerospike.connect()
 *   .then(client => {
 *     client.udfRegister(path)
 *     .then(job => job.wait())
 *     .then(() => {
 *       console.info('UDF module %s was registered successfully', path)
 *       client.close()
 *     })
 *     .catch(error => {
 *       console.error('Error registering UDF module:', error)
 *       client.close()
 *     })
 *   })
 *   .catch(error => console.error('Error connecting to cluster:',  error))
 */
export class UdfJob extends Job<SindexInfo> {
    /**
     * Path to UDF.
     */
    udfModule: string;
    /**
     * UDF Command type. Acceptable values are {@link REGISTER} and {@link UNREGISTER}
     */
    command: string;
    /**
     * UDF Register command code.
     */
    static REGISTER: string;
    /**
     * UDF un-register command code.
     */
    static UNREGISTER: string;
    /**
     * Constructs a new UdfJob instance.
     */
    constructor(client: Client, namespace: string, indexName: string);
}

/**
 * Potentially long-running index creation job.
 *
 * @see {@link Client#createIndex}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 *
 * let binName = 'food'
 * let indexName = 'foodIndex'
 * let options = {
 *   ns: 'test',
 *   set: 'demo',
 *   bin: binName,
 *   index: indexName,
 *   datatype: Aerospike.indexDataType.STRING
 * }
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     client.put(new Aerospike.Key('test', 'demo', 'mykey1'), {location: "Kale"})
 *     .then((result) => {
 *       client.createIndex(options)
 *       .then(job => job.wait())
 *       .then(() => {
 *         console.info('secondary index (SI) %s on %s was created successfully', indexName, binName)
 *         client.indexRemove('test', indexName)
 *         .then(() => {
 *           client.close()
 *         })
 *         .catch(error => {
 *           console.error('Error removing index:', error)
 *           client.close()
 *         })
 *       })
 *       .catch(error => {
 *         console.error('Error creating index:', error)
 *         client.close()
 *       })
 *     })
 *     .catch(error => {
 *         console.error('Error writing record:', error)
 *         client.close()
 *       })
 *   })
 *   .catch(error => console.error('Error connecting to cluster:',  error))
 */
export class IndexJob extends Job<SindexInfo> {
    /**
     * Namespace for the Job.
     */
    public namespace: string;
    /**
     * Name of the Secondary Index.
     */
    public indexName: string;
    /**
     * Constructs
     */
    constructor(client: Client, namespace: string, indexName: string);
}

/**
 * Details the progress of a {@link Job}.
 */
export interface JobInfoResponse {
    /**
     * progress percentage of the job.
     */
    progressPct: number;
    /**
     * number of scanned records.
     */
    recordsRead: number;
    /**
     * current completion status. See {@link jobStatus} for possible values.
     */
    status: jobStatus;
}

/**
 * Potentially long-running background job.
 *
 * @see {@link Scan#background}
 * @see {@link Query#background}
 */
export class Job<T = JobInfoResponse> {
    /**
     * Client instance managing the {@link Job}
     */;
    public client: Client;
    /**
     * Identification number asssociated with the Job.
     */
    public jobID: number;
    /**
     * Database operation associated with the Job. `query` and `scan` are the possible values`
     */
    public module: string;
    /**
     * Constructs a new Job instance
     */
    constructor(client: Client, jobID: number, module: string);
    /**
     * For internal use only.
     */
    private static safeRandomJobID(): number;
    /**
     * Repeatedly execute the given status function until it either indicates that
     * the job has completed or returns an error.
     *
     */
    private static pollUntilDone(statusFunction: () => Promise<boolean>, pollInterval?: number): Promise<void>;
    /**
     * For internal use only.
     */
    private hasCompleted(info: JobInfoResponse): boolean;
    /**
     * Fetch job info once to check if the job has completed.
     */
    private checkStatus(): Promise<boolean>;
    /**
     *
     * Check the progress of a background job running on the database.
     *
     * @param policy - The Info Policy to use for this operation.
     *
     * @return A Promise that resolves to the job info.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * }
     * Aerospike.connect(config, (error, client) => {
     *   if (error) throw error
     *
     *   var scan = client.scan('test', 'demo')
     *   scan.background('myUdfModule', 'myUdfFunction', (error, job) => {
     *     if (error) throw error
     *     var timer = setInterval(() => {
     *       job.info((error, info) => {
     *         if (error) throw error
     *         console.info('scan status: %d (%d%% complete, %d records scanned)', info.status, info.progressPct, info.recordsRead)
     *         if (info.status === Aerospike.jobStatus.COMPLETED) {
     *           console.info('scan completed!')
     *           clearInterval(timer)
     *           client.close()
     *         }
     *       })
     *     }, 1000)
     *   })
     * })
     */
    public info(policy?: policy.InfoPolicy): Promise<JobInfoResponse>;
    /**
     * @param callback - The function to call with the job info response.
     */
    public info(callback: TypedCallback<T>): void;
    /**
     * @param policy - The Info Policy to use for this operation.
     * @param callback - The function to call with the job info response.
     */
    public info(policy: policy.InfoPolicy, callback: TypedCallback<JobInfoResponse>): void;
    /**
     *
     * Wait until the task has been completed.
     *
     * @param pollInterval - Interval in milliseconds to use when polling the cluster nodes.  Default is 1000 (ms)
     *
     * @return A Promise that resolves once the job is completed.
     */
    public wait(pollInterval?: number): Promise<void>;
    /**
     * @param callback - The function to call when the task has completed.
     */
    public wait(callback: TypedCallback<void>): void;
    /**
     * @param pollInterval - Interval in milliseconds to use when polling the cluster nodes.  Default is 1000 (ms)
     * @param callback - The function to call when the task has completed.
     */
    public wait(pollInterval: number, callback: TypedCallback<void>): void;
    /**
     *
     * Alias for {@link wait}.  See {@link wait} for usage examples and more.
     *
     * @param pollInterval - Interval in milliseconds to use when polling the cluster nodes.  Default is 1000 (ms)
     *
     * @return A Promise that resolves to the job info.
     */
    public waitUntilDone(pollInterval?: number): Promise<void>;
    /**
     * @param callback - The function to call with the job info response.
     */
    public waitUntilDone(callback: TypedCallback<void>): void;
    /**
     * @param pollInterval - Interval in milliseconds to use when polling the cluster nodes.  Default is 1000 (ms)
     * @param callback - The function to call with the job info response.
     */
    public waitUntilDone(pollInterval: number, callback: TypedCallback<void>): void;
}

/**
 * @class Key
 *
 * A key uniquely identifies a record in the Aerospike database within a given namespace.
 *
 * @remarks
 *
 * ###### Key Digests
 * In your application, you must specify the namespace, set and the key itself
 * to read and write records. When a key is sent to the database, the key value
 * and its set are hashed into a 160-bit digest. When a database operation
 * returns a key (e.g. Query or Scan operations) it might contain either the
 * set and key value, or just the digest.
 *
 * @param ns - The Namespace to which the key belongs.
 * @param set - The Set to which the key belongs.
 * @param key - The unique key value. Keys can be
 * strings, integers or an instance of the Buffer class.
 * @param  digest - The digest value of the key.
 *
 * @example <caption>Creating a new {@link Key} instance</caption>
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * var key1 = new Key('test', 'demo', 12345)
 * var key2 = new Key('test', 'demo', 'abcde')
 * var key3 = new Key('test', 'demo', Buffer.from([0x62,0x75,0x66,0x66,0x65,0x72]))
 */
export class Key implements KeyOptions {
    /**
     * The Namespace to which the key belongs.
     */
    public ns: string;
    /**
     * he Set to which the key belongs.
     */
    public set: string;
    /**
     * The unique key value. Keys can be
     * strings, integers or an instance of the Buffer class.
     */
    public key: string | number | Buffer;
    /**
     * The digest value of the key.
     */
    public digest: Buffer | undefined;
    /**
     * Constructs a new Key instance.
     * 
     * @param ns - The Namespace to which the key belongs.
     * @param set - The Set to which the key belongs.
     * @param key - The unique key value. Keys can be
     * strings, integers or an instance of the Buffer class.
     * @param  digest - The digest value of the key.
     */
    constructor(ns?: string | null, set?: string | null, key?: string | number | Buffer | BigInt | null, digest?: Buffer | null);
    private static fromASKey(keyObj: KeyOptions): Key;
    /**
     * Compare the equality of two keys.
     * 
     * @param other - {#Key} or {@link KeyOptions} Object for comparison.
     */
    public equals(other: KeyOptions): boolean;
}


export interface RecordMetadata {
    /**
     * The record's remaining time-to-live in seconds, before the record will
     * expire and be removed by the server.
     */
    ttl?: number;
    /**
     * Record modification count.
     */
    gen?: number;
}

/**
 * Stream of database records (full or partial) returned by {@link Query} or {@link Scan} operations.
 *
 * @remarks *Note:* Record stream currently does not support Node.js'
 * <code>Stream#pause</code> and <code>Stream#resume</code> methods, i.e. it
 * always operates in flowing mode. That means data is read from the Aerospike
 * database and provided to your application as fast as possible. If no data
 * event handlers are attached, then data will be lost.
 *
 * #### Aborting a Query/Scan
 *
 * A query or scan operation can be aborted by calling the {@link
 * RecordStream#abort} method at any time. It is no possible to continue a
 * record stream, once aborted.
 *
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   var recordsSeen = 0
 *   var scan = client.scan('test', 'demo')
 *   var stream = scan.foreach()
 *
 *   stream.on('error', (error) => {
 *     console.error(error)
 *     throw error
 *   })
 *   stream.on('data', (record) => {
 *     recordsSeen++
 *     console.log(record)
 *     if (recordsSeen > 1000) {
 *       stream.abort() // We've seen enough!
 *     }
 *   })
 *   stream.on('end', () => {
 *     console.info(stream.aborted ? 'scan aborted' : 'scan completed')
 *     client.close()
 *   })
 * })
 */
export class RecordStream extends Stream {
  /**
   * <code>true</code> if the scan has been aborted by the user; <code>false</code> otherwise.
   * @see {@link RecordStream#abort}
   */
    public aborted: boolean;
    /**
     * A {@link Client} instance.
     */
    public client: Client;
    public writable: false;
    public readable: true;
    public _read(): void;
    /**
     * Aborts the query/scan operation.
     *
     * Once aborted, it is not possible to resume the stream.
     *
     * @since v2.0
     */
    public abort(): void;
    /**
     * @event 'data'
     * @param listener - Function executed when data is received.
     * Aerospike record incl. bins, key and meta data.
     * Depending on the operation, all, some or no bin values will be returned.
     */    
    public on(event: 'data', listener: (record: AerospikeRecord) => void): this;
    /**
     * @event 'error'
     * @param listener - Function executed upon receipt of an error.
     */    
    public on(event: 'error', listener: (error: AerospikeError) => void): this;
    /**
     * @event 'end'
     * @param listener - Function executed upon query end.
     * If set to a valid serialized query, calling {@link Query.foreach} will allow the 
     * next page of records to be queried while preserving the progress
     * of the previous query. If set to <code>null</code>, calling {@link Query.foreach} will begin a new query.
     */    
    public on(event: 'end', listener: (state: number[]) => void): this;
}

// scan.js
export interface ScanOptions {
    /**
     * List of bin names to select. See
     * {@link Scan#select}.
     */
    select?: string[];
    /**
     * Whether only meta data should be
     * returned. See {@link Scan#nobins}.
     */
    nobins?: boolean;
    /**
     * Whether all cluster nodes
     * should be scanned concurrently. See {@link Scan#concurrent}.
     */
    concurrent?: boolean;
    /**
     * The time-to-live (expiration) of the record in seconds.
     * See {@link Scan#ttl}.
     */
    ttl?: number;
    /**
     * Enables pagination.
     */
    paginate?: boolean;
      /**
       * If set to a valid serialized scan, calling {@link Scan#foreach} will allow the next page of records to be queried while preserving the progress
       * of the previous scan. If set to <code>null</code>, calling {@link Scan#foreach} will begin a new scan.
       */
    scanState?: number[];

}
/**
 *
 * @deprecated since server 6.0
 *
 * @remarks The scan object created by calling {@link Client#scan} is used
 * for executing record scans on the specified namespace and set (optional).
 * Scans can return a set of records as a {@link RecordStream} or apply an
 * Aerospike UDF (user-defined function) on each of the records on the server.
 *
 * #### Scan is obsolete in server 6.0
 * Use query methods implemented by {@link Client#query}.
 * For more information, please refer to the section on
 * <a href="https://docs.aerospike.com/server/guide/scan#historical-evolution-of-scan-features">&uArr;Historical evolution of scan features</a>
 * in the Aerospike technical documentation.
 *
 * #### Selecting Bins
 *
 * Using {@link Scan#select} it is possible to select a subset of bins which
 * should be returned by the query. If no bins are selected, then the whole
 * record will be returned. If the {@link Scan#nobins} property is set to
 * <code>true</code> the only the record meta data (ttl, generation, etc.) will
 * be returned.
 *
 * #### Executing a Scan
 *
 * A scan is executed using {@link Scan#foreach}. The method returns a {@link
 * RecordStream} which emits a <code>data</code> event for each record returned
 * by the scan. The scan can be aborted at any time by calling
 * {@link RecordStream#abort}.
 *
 * #### Executing Record UDFs using Background Scans
 *
 * Record UDFs perform operations on a single record such as updating records
 * based on a set of parameters. Using {@link Scan#background} you can run a
 * Record UDF on the result set of a scan. Scans using Records UDFs are run
 * in the background on the server and do not return the records to the client.
 *
 * For additional information please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * #### Scan pagination
 *
 * Scan pagination allows for queries return records in pages rather than all at once.
 * To enable scan pagination, the scan property {@link Scan#paginate} must be true
 * and the previously stated scan policy {@link ScanPolicy#maxRecords} must be set to a
 * nonzero positive integer in order to specify a maximum page size.
 *
 * When a page is complete, {@link RecordStream} event {@link RecordStream#on 'error'} will
 * emit a {@link Scan#scanState} object containing a serialized version of the scan.
 * This serialized scan, if be assigned back to {@link Scan#scanState}, allows the scan
 * to retrieve the next page of records in the scan upon calling {@link Scan#foreach}.
 * If {@link RecordStream#on 'error'} emits an <code>undefined</code> object, either {@link Scan#paginate}
 * is not <code>true</code>, or the scan has successfully returned all the specified records.
 *
 * For additional information and examples, please refer to the {@link Scan#paginate} section
 * below.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters.
 * @param {Array<string>} [options.select] - List of bin names to select. See
 * {@link Scan#select}.
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Scan#nobins}.
 * @param {boolean} [options.concurrent=false] - Whether all cluster nodes
 * should be scanned concurrently. See {@link Scan#concurrent}.
 * @param {boolean} [options.ttl=0] - The time-to-live (expiration) of the record in seconds.
 * See {@link Scan#ttl}.
 *
 *
 * @see {@link Client#scan} to create new instances of this class.
 *
 * @since v2.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   const scan = client.scan('test', 'demo')
 *   let recordsSeen = 0
 *   const stream = scan.foreach()
 *   stream.on('error', (error) => { throw error })
 *   stream.on('end', () => client.close())
 *   stream.on('data', (record) => {
 *     console.log(record)
 *     recordsSeen++
 *     if (recordsSeen > 100) stream.abort() // We've seen enough!
 *   })
 * })
 */
export class Scan {
    /**
     * Client instance.
     */
    public client: Client;
    /**
     * Namespace to scan.
     */
    public ns: string;
    /**
     * Name of the set to scan.
     */
    public set: string;
    /**
     * List of bin names to be selected by the scan. If a scan specifies bins to
     * be selected, then only those bins will be returned. If no bins are
     * selected, then all bins will be returned (unless {@link Scan#nobins} is
     * set to <code>true</code>).
     *
     * @see Use {@link Scan#select} to specify the bins to select.
     */
    public selected?: string[];
    /**
     * If set to <code>true</code>, the scan will return only meta data, and exclude bins.
     *
     */
    public nobins?: boolean;
      /**
       * If set to <code>true</code>, all cluster nodes will be scanned in parallel.
       *
       */
    public concurrent?: boolean;
    /**
     * 
     */
    public udf?: UDF;
    /**
     * 
     */
    public ops?: operations.Operation[];
    /**
     * 
     */
    public ttl?: number;
    /**
     * If set to <code>true</code>, paginated queries are enabled. In order to receive paginated
     * results, the {@link ScanPolicy#maxRecords} property must assign a nonzero integer value.
     *
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Scan#foreach}.</caption>
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const scan = client.scan('test', 'demo', {paginate: true})
     *     do {
     *       const stream = scan.foreach({maxRecords: 11})
     *       stream.on('error', (error) => { throw error })
     *       stream.on('data', (record) => {
     *         console.log(record.bins)
     *       })
     *       await new Promise(resolve => {
     *         stream.on('end', (scanState) => {
     *           scan.nextPage(scanState)
     *           console.log(scan.scanState)
     *           resolve()
     *         })
     *       })
     *     } while (scan.hasNextPage())
     *
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Scan#foreach}.</caption>
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const scan = client.scan('test', 'demo', {paginate: true})
     *     let allResults = []
     *     let results = await scan.results({maxRecords: 11})
     *     allResults = [...allResults, ...results]
     *
     *
     *     results = await scan.results({maxRecords: 11})
     *     allResults = [...allResults, ...results]
     *
     *     results = await scan.results({maxRecords: 11})
     *     allResults = [...allResults, ...results]
     *
     *     console.log("Records returned in total: " + allResults.length)  // Should be 30 records
     *
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */
    public paginate?: boolean;
    /**
     * If set to <code>true</code>, the scan will return only those belongs to partitions.
     *
     */
    private pfEnabled?: boolean;
  /**
   * If set to a valid serialized scan, calling {@link Scan#foreach} will allow the next page of records to be queried while preserving the progress
   * of the previous scan. If set to <code>null</code>, calling {@link Scan#foreach} will begin a new scan.
   */
    public scanState?: number[];
    /**
     * Constructs a new Scan instance.
     */
    constructor(client: Client, ns: string, set: string, options?: ScanOptions);
    /**
     * Checks compiliation status of a paginated scan.
     *
     * @remarks If <code>false</code> is returned, there are no more records left in the scan, and the scan is complete.
     * If <code>true</code> is returned, calling {@link Scan#foreach} will continue from the state specified by {@link Scan#scanState}.
     *
     * @returns `True` if a next page exists, `false` otherwise
     */
    public hasNextPage(): boolean;
    /**
     * Sets {@link Scan#scanState} to the value specified by the <code>state</code> argument.
     *
     * @remarks setter function for the {@link Scan#scanState} member variable.
     *
     * @param state - serialized scan emitted from the {@link RecordStream#on 'error'} event.
     */
    public nextPage(state: number[]): void;
    /**
     *
     * Specify the begin and count of the partitions
     * to be scanned by the scan foreach op.
     *
     * @remarks If a scan specifies partitions begin and count,
     * then only those partitons will be scanned and returned.
     * If no partitions are specified,
     * then all partitions will be scanned and returned.
     *
     * @param begin - Start partition number to scan.
     * @param count - Number of partitions from the start to scan.
     * @param digest - Start from this digest if it is specified.
     */
    public partitions(begin: number, count: number, digest?: Buffer)
    /**
     *
     * Specify the names of bins to be selected by the scan.
     *
     * @remarks If a scan specifies bins to be selected, then only those bins
     * will be returned. If no bins are selected, then all bins will be returned.
     * (Unless {@link Scan#nobins} is set to <code>true</code>.)
     *
     * @param bins - List of bin names to return.
     */
    public select(bins: string[]): void;
    /**
     * Specify the names of bins to be selected by the scan.
     *
     * @remarks If a scan specifies bins to be selected, then only those bins
     * will be returned. If no bins are selected, then all bins will be returned.
     * (Unless {@link Scan#nobins} is set to <code>true</code>.)
     *
     * @param bins - Spread of bin names to return.
     */
    public select(...bins: string[]): void;
    /**
     * Perform a read-write background scan and apply a Lua user-defined
     * function (UDF) to each record.
     *
     * @remarks When a background scan is initiated, the client will not wait
     * for results from the database. Instead a {@link Job} instance will be
     * returned, which can be used to query the scan status on the database.
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Scan Policy to use for this operation.
     * @param scanID - Job ID to use for the scan; will be assigned
     * randomly if zero or undefined.
     *
     * @returns A Promise that resolves to a Job instance.
     */
    public background(udfModule: string, udfFunction: string, udfArgs?: AerospikeBinValue[], policy?: policy.ScanPolicy, scanID?: number): Promise<Job>;
    /**
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param callback - The function to call when the operation completes.
     */
    public background(udfModule: string, udfFunction: string, callback: TypedCallback<Job>): void;
    /**
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param callback - The function to call when the operation completes.
     */    
    public background(udfModule: string, udfFunction: string, udfArgs: AerospikeBinValue[], callback: TypedCallback<Job>): void;
    /**
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Scan Policy to use for this operation.
     * @param callback - The function to call when the operation completes.
     */    
    public background(udfModule: string, udfFunction: string, udfArgs: AerospikeBinValue[], policy: policy.ScanPolicy, callback: TypedCallback<Job>): void;
    /**
     *
     * @param udfModule - UDF module name.
     * @param udfFunction - UDF function name.
     * @param udfArgs - Arguments for the function.
     * @param policy - The Scan Policy to use for this operation.
     * @param scanID - Job ID to use for the scan; will be assigned
     * randomly if zero or undefined.
     * @param callback - The function to call when the operation completes.
     */    
    public background(udfModule: string, udfFunction: string, udfArgs: AerospikeBinValue[], policy: policy.ScanPolicy, scanID: number, callback: TypedCallback<Job>): void;
    /**
     * Applies write operations to all matching records.
     *
     * @remarks Performs a background scan and applies one or more write
     * operations to all records. Neither the records nor the results of the
     * operations are returned to the client. Instead a {@link Job} instance will
     * be returned, which can be used to query the scan status.
     *
     * This method requires server >= 3.7.0.
     *
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param policy - The Scan Policy to use for this operation.
     * @param scanID - Job ID to use for the scan; will be assigned
     * randomly if zero or undefined.
     *
     * @returns A Promise that resolves to a Job instance.
     *
     * @since v3.14.0
     *
     * @example <caption>Increment count bin on all records in set using a background scan</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0})
     *    }
     * }
     *
     * Aerospike.connect(config).then(async (client) => {
     *   const scan = client.scan('namespace', 'set')
     *   const ops = [Aerospike.operations.incr('count', 1)]
     *   const job = await scan.operate(ops)
     *   await job.waitUntilDone()
     *   client.close()
     * })
     */    
    public operate(operations: operations.Operation[], policy?: policy.ScanPolicy, scanID?: number): Promise<Job>;
    /**
     * @param operations - List of write
     * operations to perform on the matching records.
     * @param policy - The Scan Policy to use for this operation.
     * @param scanID - Job ID to use for the scan; will be assigned
     * randomly if zero or undefined.
     * @param callback - The function to call when the operation completes.
     */
    public operate(operations: operations.Operation[], policy: policy.ScanPolicy, scanID: number, callback: TypedCallback<Job>): void;
    /**
     *
     * Performs a read-only scan on each node in the cluster. As the scan
     * iterates through each partition, it returns the current version of each
     * record to the client.
     *
     * @param policy - The Scan Policy to use for this operation.
     * @param dataCb - The function to call when the
     * operation completes with the results of the operation; if no callback
     * function is provided, the method returns a <code>Promise<code> instead.
     * @param errorCb - Callback function called when there is an error.
     * @param endCb -  Callback function called when an operation has completed.
     */    
    public foreach(policy?: policy.ScanPolicy | null, dataCb?: (data: AerospikeRecord) => void, errorCb?: (error: Error) => void, endCb?: () => void): RecordStream;
}

/**
 *
 * The info protocol provides access to configuration and
 * statistics for the Aerospike server. This module provides the {@link
 * info.parse | parse} utility function for parsing the info
 * data returned by the Aerospike server.
 *
 * @see {@link Client#info}
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var cmd = 'build\nfeatures'
 *   client.infoAny(cmd, (err, infoStr) => {
 *     if (err) {
 *       console.error('error retrieving info for cmd "%s": %s [%d]',
   *       cmd, err.message, err.code)
 *     } else {
 *       var info = Aerospike.info.parse(infoStr)
 *       console.log(info) // => { build: '3.12.0',
 *                         //      features: [
 *                         //        'cdt-list',
 *                         //        'pipelining',
 *                         //        'geo',
 *                         //        ...,
 *                         //        'udf' ] }
 *     }
 *     client.close()
 *   })
 * })
 */
export namespace info {
    /**
     *
     * Parses the info string returned from a cluster node into key-value pairs.
     *
     * @param info - The info string returned by the cluster node.
     * 
     * @returns key-value pairs in an {@link Record}
     *
     * @since v2.6
     */
    export function parse(info: string): Record<string, any>;
}

/**
 * The {@link features} module contains a list of the
 * feature strings used by the Aerospike server.
 *
 */
export namespace features {
    /**
     * CDT_MAP feature string.
     */
    export const CDT_MAP: 'cdt-map';
    /**
     * CDT_LIST feature string.
     */
    export const CDT_LIST: 'cdt-list';
    /**
     * BLOB_BITS feature string.
     */
    export const BLOB_BITS: 'blob-bits';
}

export const Record: typeof AerospikeRecord;
export function print(err: Error, result: any): void;
/**
 *
 * Release event loop resources held by the module, which could keep
 * the Node.js event loop from shutting down properly.
 *
 * @remarks This method releases some event loop resources held by the
 * Aerospike module and the Aerospike C client library, such as libuv handles
 * and timers. If not released, these handles will prevent the Node.js event
 * loop from shutting down, i.e. it will keep your application from
 * terminating.
 *
 * The Aerospike module keeps an internal counter of active {@link Client}
 * instances, i.e. instances which have not been <code>close()</code>'d yet. If
 * a client is closed and the counter reaches zero, this method will be called
 * automatically, unless {@link Client#close} is called with
 * <code>releaseEventLoop</code> set to <code>false</code>. (The default is
 * <code>true</code>.)
 *
 * If an application needs to create multiple client instance, i.e. to connect
 * to multiple, different clusters, the event loop resources will be managed
 * automatically, as long as at least once client instance is active at any
 * given time, until the application terminates.
 *
 * If, however, there could be one or more intermittent time periods, during
 * which no client is active (i.e. the internal client counter reaches zero),
 * then the clients need to be closed with <code>releaseEventLoop</code> set
 * to <code>false</code> and the event loop needs to be released explicitly by
 * calling <code>releaseEventLoop()</code>.
 */
export function releaseEventLoop(): void;
/**
 * Creates a new {@link Client} instance.
 *
 * @param {Config} [config] - The configuration for the client.
 */
export function client(config?: ConfigOptions): Client;
/**
 * Creates a new {@link Client} instance and connects to the Aerospike cluster.
 *
 * @param config - The configuration for the client.
 *
 * @return A Promise resolving to the connected client.
 * 
 * @example <caption>Connection can be established using the aerospike namespace.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (err, client) => {
 *   console.log("Connected. Closing now.")
 *   client.close()
 * })
 *
 * @example <caption>Connection can also be established using the {@link Client} module.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * const client = Aerospike.client(config)
 * client.connect((err) => {
 *   console.log("Connected. Closing now.")
 *   client.close()
 * })
 *
 * @example <caption>A connection established using callback function.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     console.log("Connected. Now closing connection.")
 *     client.close()
 *   }
 * })
 *
 * @example <caption>A connection established by returning a Promise.</caption>
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     console.log("Connected. Now Closing Connection.")
 *     client.close()
 *   })
 *   .catch(error => {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *   })
 */
export function connect(config?: ConfigOptions): Promise<Client>;
/**
 * @param callback - The function to call, once the client is connected to the cluster successfully.
 */
export function connect(callback: TypedCallback<Client>): Client;
/**
 * @param config - The configuration for the client.
 * @param callback - The function to call, once the client is connected to the cluster successfully.
 */
export function connect(config: ConfigOptions, callback: TypedCallback<Client>): Client;
/**
 * Sets the global, default log level and destination. The default log settings
 * are used for all new client instances, unless different log settings are
 * supplied in the client's configuration.
 *
 * The global log settings are also used to control the logging of the Aerospike
 * C client SDK which is included in the <code>aerospike</code> native add-on.
 * The C client SDK log settings are global and cannot be set separately per
 * {@link Client} instance.
 *
 * @param {Object} logInfo - {@link Log} object cotaining a {@link Log.level} and a {@link Log.file}.
 *
 * @since v3.1.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.setDefaultLogging({
 *   level: Aerospike.log.TRACE
 * })
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     console.log("Connected. Now closing connection.")
 *     client.close()
 *   }
 * })
 */
export function setDefaultLogging(logInfo: Log): void;
/**
 * Configures the global command queue. (Disabled by default.)
 *
 * @remarks Note that there is only one instance of the command queue that
 * is shared by all client instances, even client instances connected to
 * different Aerospike clusters. The <code>setupGlobalCommandQueue</code>
 * method must be called before any client instances are connected.
 *
 * @param policy - Set of policy values governing the
 * behaviour of the global command queue.
 *
 * @see {@link CommandQueuePolicy} for more information about the use of the
 * command queue.
 */
export function setupGlobalCommandQueue(policy: policy.CommandQueuePolicy): void;

/* INTERFACES */

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface AdminPolicyOptions extends BasePolicyOptions {
    /**
     * Maximum time in milliseconds to wait for the operation to complete.
     *
     * @type number
     */
    timeout?: number;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface ApplyPolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @see {@link policy.commitLevel} for supported policy values.
     */
    commitLevel?: policy.commitLevel;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
    /**
     * The time-to-live (expiration) of the record in seconds.
     *
     */
    ttl?: number;
}
/**
 * Option specification for {@ link BasePolicy} class values.
 */
export interface BasePolicyOptions {
    /**
     * Use zlib compression on write or batch read commands when the command
     * buffer size is greater than 128 bytes. In addition, tell the server to
     * compress it's response on read commands. The server response compression
     * threshold is also 128 bytes.
     *
     * This option will increase cpu and memory usage (for extra compressed
     * buffers), but decrease the size of data sent over the network.
     *
     * Requires Enterprise Server version >= 4.8.
     *
     * @default: false
     * @since v3.14.0
     */
    compress?: boolean;
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     *
     * expression filters can only be applied to the following commands:
     * * {@link Client.apply}
     * * {@link Client.batchExists}
     * * {@link Client.batchGet}
     * * {@link Client.batchRead}
     * * {@link Client.batchSelect}
     * * {@link Client.exists}
     * * {@link Client.get}
     * * {@link Client.operate}
     * * {@link Client.put}
     * * {@link Client.remove}
     * * {@link Client.select}
     */
    filterExpression?: AerospikeExp;
    /**
     * Maximum number of retries before aborting the current transaction.
     * The initial attempt is not counted as a retry.
     *
     * If <code>maxRetries</code> is exceeded, the transaction will return
     * error {@link statusNamespace.ERR_TIMEOUT|ERR_TIMEOUT}.
     *
     * WARNING: Database writes that are not idempotent (such as "add")
     * should not be retried because the write operation may be performed
     * multiple times if the client timed out previous transaction attempts.
     * It is important to use a distinct write policy for non-idempotent
     * writes which sets <code>maxRetries</code> to zero.
     *
     * @default: 2 (initial attempt + 2 retries = 3 attempts)
     */
    maxRetries?: number;
    /**
     * Socket idle timeout in milliseconds when processing a database command.
     *
     * If <code>socketTimeout</code> is not zero and the socket has been idle
     * for at least <code>socketTimeout</code>, both <code>maxRetries</code>
     * and <code>totalTimeout</code> are checked. If <code>maxRetries</code>
     * and <code>totalTimeout</code> are not exceeded, the transaction is
     * retried.
     *
     * If both <code>socketTimeout</code> and <code>totalTimeout</code> are
     * non-zero and <code>socketTimeout</code> > <code>totalTimeout</code>,
     * then <code>socketTimeout</code> will be set to
     * <code>totalTimeout</code>. If <code>socketTimeout</code> is zero, there
     * will be no socket idle limit.
     *
     * @default 0 (no socket idle time limit).
     */
    socketTimeout?: number;
    /**
     * Total transaction timeout in milliseconds.
     *
     * The <code>totalTimeout</code> is tracked on the client and sent to the
     * server along with the transaction in the wire protocol. The client will
     * most likely timeout first, but the server also has the capability to
     * timeout the transaction.
     *
     * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
     * is reached before the transaction completes, the transaction will return
     * error {@link statusNamespace.ERR_TIMEOUT|ERR_TIMEOUT}.
     * If <code>totalTimeout</code> is zero, there will be no total time limit.
     *
     * @default 1000
     */
    totalTimeout?: number;
    /**
     * Multi-record command identifier. See {@link Transaction} for more information.
     * 
     * @default null (no transaction)
     */
    txn?: Transaction;

}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BatchApplyPolicyOptions {
    /**
      * Specifies the number of replicas required to be committed successfully
      * when writing before returning transaction succeeded.
      *
      * @see {@link policy.commitLevel} for supported policy values.
      */
    commitLevel?: policy.commitLevel;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     */
    filterExpression?: AerospikeExp;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;

    /**
     * The time-to-live (expiration) of the record in seconds.
     */
    ttl?: number;
}


/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BatchPolicyOptions extends BasePolicyOptions {
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @default Aerospike.policy.readModeAP.ONE
     * @see {@link policy.readModeAP} for supported policy values.
     */
    allowInline?: boolean;
    /**
     * Allow batch to be processed immediately in the server's receiving thread for SSD
     * namespaces. If false, the batch will always be processed in separate service threads.
     * Server versions &lt; 6.0 ignore this field.
     *
     * Inline processing can introduce the possibility of unfairness because the server
     * can process the entire batch before moving onto the next command.
     *
     * @default <code>false</code>
     */
    allowInlineSSD?: boolean;
    /**
     * Determine if batch commands to each server are run in parallel threads.
     *
     * Values:
     * false: Issue batch commands sequentially.  This mode has a performance advantage for small
     * to medium sized batch sizes because commands can be issued in the main transaction thread.
     * This is the default.
     * true: Issue batch commands in parallel threads.  This mode has a performance
     * advantage for large batch sizes because each node can process the command immediately.
     * The downside is extra threads will need to be created (or taken from
     * a thread pool).
     * 
     * @default <code>false</code>
     */
    concurrent?: boolean;
    /**
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @default <code>true</code>
     * @since v3.7.0
     */
    deserialize?: boolean;
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @default {@link policy.readModeAP.ONE}
     * @see {@link policy.readModeAP} for supported policy values.
     */
    readModeAP?: policy.readModeAP;
    /**
     * Read policy for SC (strong consistency) namespaces.
     *
     * @default {@link policy.readModeSC.SESSION}
     * @see {@link policy.readModeSC} for supported policy values.
     */
    readModeSC?: policy.readModeSC;
    /**
     * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
     * efficiently operate as a read-based LRU cache where the least recently used records are expired.
     * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
     * within this interval of the record’s end of life will generate a touch.
     *
     * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
     * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
     * recent write) will result in a touch, resetting the TTL to another 10 hours.
     *
     * @default 0
     */
    readTouchTtlPercent?: number;
    /**
     * Algorithm used to determine target node.
     * 
     * @default {@link policy.replica.MASTER}
     * @see {@link policy.replica} for supported policy values.
     */
    replica?: policy.replica;
    /**
     * Should all batch keys be attempted regardless of errors. This field is used on both
     * the client and server. The client handles node specific errors and the server handles
     * key specific errors.
     *
     * If true, every batch key is attempted regardless of previous key specific errors.
     * Node specific errors such as timeouts stop keys to that node, but keys directed at
     * other nodes will continue to be processed.
     *
     * If false, the server will stop the batch to its node on most key specific errors.
     * The exceptions are AEROSPIKE_ERR_RECORD_NOT_FOUND and AEROSPIKE_FILTERED_OUT
     * which never stop the batch. The client will stop the entire batch on node specific
     * errors for sync commands that are run in sequence (concurrent == false). The client
     * will not stop the entire batch for async commands or sync commands run in parallel.
     *
     * Server versions &lt; 6.0 do not support this field and treat this value as false
     * for key specific errors.
     *
     * @default <code>true</code>
     */
    respondAllKeys?: boolean;
    /**
     * Send set name field to server for every key in the batch. This is only
     * necessary when authentication is enabled and security roles are defined
     * on a per-set basis.
     *
     * @default <code>false</code>
     */
    sendSetName?: boolean;
}
/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BatchReadPolicyOptions {
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     */
    filterExpression?: AerospikeExp;
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @default {@link policy.readModeAP.ONE}
     * @see {@link policy.readModeAP} for supported policy values.
     */
    readModeAP?: policy.readModeAP;
    /**
      * Read policy for SC (strong consistency) namespaces.
      *
      * @default {@link policy.readModeSC.SESSION}
      * @see {@link policy.readModeSC} for supported policy values.
      */
    readModeSC?: policy.readModeSC;
    /**
     * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
     * efficiently operate as a read-based LRU cache where the least recently used records are expired.
     * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
     * within this interval of the record’s end of life will generate a touch.
     *
     * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
     * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
     * recent write) will result in a touch, resetting the TTL to another 10 hours.
     *
     * @default 0
     */
    readTouchTtlPercent?: number;
}

/**
 * Interface used for creating BatchRead record objects.
 */
export interface BatchReadRecord {
    /**
     * List of bins to retrieve.
     */
    bins?: string[];
    /**
     * A {@link key} uniquely identifies a record in the Aerospike database within a given namespace.
     */
    key: Key;
    /**
     * List of {@link operations|operations}
     */
    ops?: operations.Operation[]
    /**
     * The Batch Policy to use for this operation.
     */
    policy?: BatchPolicyOptions;
    /**
     * Whether to retrieve all bins or
     * just the meta data of the record. If true, ignore <code>bins</code> and read
     * all bins; if false and <code>bins</code> is specified, read specified bins;
     * if false and <code>bins</code> is not specified, read only record meta data
     * (generation, expiration, etc.)
     */
    readAllBins?: boolean;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BatchRemovePolicyOptions {
    /**
      * Specifies the number of replicas required to be committed successfully
      * when writing before returning transaction succeeded.
      *
      * @see {@link policy.commitLevel} for supported policy values.
      */
    commitLevel?: policy.commitLevel;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     *
     */
    filterExpression?: AerospikeExp;
    /**
     * Specifies the behavior for the generation value.
     *
     * @see {@link policy.gen} for supported policy values.
     */
    gen?: policy.gen;
    /**
     * The generation of the record.
     */
    generation?: number;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BatchWritePolicyOptions {
    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @see {@link policy.commitLevel} for supported policy values.
     */
    commitLevel?: policy.commitLevel;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Specifies the behavior for the existence of the record.
     *
     * @see {@link policy.exists} for supported policy values.
     */
    exists?: policy.exists;
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     */
    filterExpression?: AerospikeExp;
    /**
     * Specifies the behavior for the generation value.
     *
     * @see {@link policy.gen} for supported policy values.
     */
    gen?: policy.gen;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
    /**
     * The time-to-live (expiration) of the record in seconds.
     */
    ttl?: number;
}

/**
 * Interface used for creating BatchWrite record objects.
 */
export interface BatchWriteRecord {
    /**
     * Type of Batch operation
     */
    type: batchType;
    /**
     * A {@link key} uniquely identifies a record in the Aerospike database within a given namespace.
     */
    key: Key;
    /**
     * List of bins to retrieve.
     */
    bins?: string[];
    /**
     * Whether to retrieve all bins or
     * just the meta data of the record. If true, ignore <code>bins</code> and read
     * all bins; if false and <code>bins</code> is specified, read specified bins;
     * if false and <code>bins</code> is not specified, read only record meta data
     * (generation, expiration, etc.)
     */
    readAllBins?: boolean;
    /**
     * List of {@link operations|operations}
     */
    ops?: operations.Operation[]
    /**
     * The Batch Policy to use for this operation.
     */
    policy?: BatchWritePolicyOptions;
}


/**
 * Interface used for creating BatchSelect record objects.
 */
export interface BatchSelectRecord {
    status: typeof statusNamespace[keyof typeof statusNamespace];
    key: KeyOptions;
    meta?: RecordMetadata;
    bins?: AerospikeBins;
}


/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface BitwisePolicyOptions extends BatchPolicyOptions {
    /**
     * Specifies the behavior when writing byte values.
     *
     * @default bitwise.writeFlags.DEFAULT
     * @see {@link bitwise.writeFlags} for supported policy values.
     */
    writeFlags: bitwise.writeFlags;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface CommandQueuePolicyOptions extends BasePolicyOptions {
    /**
     * Maximum number of commands that can be processed at any point in time.
     * Each executing command requires a socket connection. Consuming too many
     * sockets can negatively affect application reliability and performance.
     * If you do not limit command count in your application, this setting
     * should be used to enforce a limit internally in the client.
     *
     * If this limit is reached, the next command will be placed on the
     * client's command queue for later execution. If this limit is zero, all
     * commands will be executed immediately and the command queue will not be
     * used. (Note: {@link Config#maxConnsPerNode} may still limit number of
     * connections per cluster node.)
     *
     * If defined, a reasonable value is 40. The optimal value will depend on
     * the CPU speed and network bandwidth.
     *
     * @default 0 (execute all commands immediately)
     */
    maxCommandsInProcess?: number;
    /**
     * Maximum number of commands that can be stored in the global command
     * queue for later execution. Queued commands consume memory, but they do
     * not consume sockets. This limit should be defined when it's possible
     * that the application executes so many commands that memory could be
     * exhausted.
     *
     * If this limit is reached, the next command will be rejected with error
     * code <code>ERR_ASYNC_QUEUE_FULL</code>. If this limit is zero, all
     * commands will be accepted into the delay queue.
     *
     * The optimal value will depend on the application's magnitude of command
     * bursts and the amount of memory available to store commands.
     *
     * @default 0 (no command queue limit)
     */
    maxCommandsInQueue?: number;
    /**
     * Initial capacity of the command queue. The command queue can resize
     * beyond this initial capacity.
     *
     * @default 256 (if command queue is used)
     */
    queueInitialCapacity?: number;
}

export interface ConfigOptions {
    /**
     * Authentication mode used when user/password is defined.
     * 
     * One of the auth modes defined in {@link auth}.
     */
    authMode?: auth;
    /**
     * Initial host connection timeout in milliseconds.
     * 
     * The client observes this timeout when opening a connection to
     * the cluster for the first time.
     * 
     * @default 1000
     */
    connTimeoutMs?: number;
    /**
     * Expected Cluster Name.
     * 
     * If not <code>null</code>, server nodes must return this
     * cluster name in order to join the client's view of the cluster. Should
     * only be set when connecting to servers that support the "cluster-name"
     * info command.
     * 
     * @since v2.4
     */
    clusterName?: string;
    /**
     *
     * The number of cluster tend iterations that defines the window for {@link maxErrorRate} to be surpassed. One tend iteration is defined
     * as {@link tenderInterval} plus the time to tend all nodes. At the end of the window, the error count is reset to zero and backoff state is removed on all nodes.
     *
     * @type {number}
     *
     * @default 1
     */
    errorRateWindow?: number;
    /**
     * List of hosts with which the client should attempt to connect.
     * 
     * If not specified, the client attempts to read the host list
     * from the <code>AEROSPIKE_HOSTS</code> environment variable or else falls
     * back to use a default value of "localhost".
     *
     * @example <caption>Setting <code>hosts</code> using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:3000,192.168.0.2:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000 },
     *   { addr: '192.168.0.2', port: 3000 }
     * ]
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> with TLS name using a string:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = '192.168.0.1:example.com:3000,192.168.0.2:example.com:3000'
     * const client = await Aerospike.connect({ hosts })
     *
     * @example <caption>Setting <code>hosts</code> using an array of hostname/port/tlsname tuples:</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const hosts = [
     *   { addr: '192.168.0.1', port: 3000, tlsname: 'example.com' },
     *   { addr: '192.168.0.2', port: 3000, tlsname: 'example.com' }
     * ]
     * const client = await Aerospike.connect({ hosts })
     */
    hosts?: Host[] | string;    

    /**
     * Configuration for logging done by the client.
     *

     *
     * @example <caption>Enabling debug logging to a separate log file</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * const fs = require('fs')
     *
     * var debuglog = fs.openSync('./debug.log', 'w')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   log: {
     *     level: Aerospike.log.DEBUG,
     *     file: debuglog
     *   }
     * }
     * Aerospike.connect(config, (err, client) => {
     *   if (err) throw err
     *   console.log("Connected. Now closing connection.")
     *   client.close()
     * })
     */
    log?: Log;
    /**
     * Node login timeout in milliseconds.
     * 
     * @type {number}
     * @default 5000
     */
    loginTimeoutMs?: number;
    /**
     * Maximum number of asynchronous connections allowed per server node.
     *
     * New transactions will be rejected with an {@link
     * status.ERR_NO_MORE_CONNECTIONS | ERR_NO_MORE_CONNECTIONS}
     * error if the limit would be exceeded.
     *     *
     * @default 100
     */
    maxConnsPerNode?: number;
    /**
     * Maximum number of errors allowed per node per error_rate_window before backoff algorithm returns
     * `AEROSPIKE_MAX_ERROR_RATE` for database commands to that node. If max_error_rate is zero, there is no error limit.
     * The counted error types are any error that causes the connection to close (socket errors and client timeouts),
     * server device overload and server timeouts.
     *
     * The application should backoff or reduce the transaction load until `AEROSPIKE_MAX_ERROR_RATE` stops being returned.
     *
     * If the backoff algorithm has been activated, transactions will fail with {@link
     * status.AEROSPIKE_MAX_ERROR_RATE | AEROSPIKE_MAX_ERROR_RATE} until the {@link errorRateWindow} has passed and the
     * error count has been reset.
     *
     * @default 100
     */
    maxErrorRate?: number;
    /**
     * Maximum socket idle time in seconds.
     *
     * Connection pools will discard sockets that have been idle
     * longer than the maximum. The value is limited to 24 hours (86400).
     *
     * It's important to set this value to a few seconds less than the server's
     * <code>proto-fd-idle-ms</code> (default 60000 milliseconds or 1 minute),
     * so the client does not attempt to use a socket that has already been
     * reaped by the server.
     *
     * Connection pools are now implemented by a LIFO stack. Connections at the
     * tail of the stack will always be the least used. These connections are
     * checked for <code>maxSocketIdle</code> once every 30 tend iterations
     * (usually 30 seconds).
     *
     *
     * @default 0 seconds
     */
    maxSocketIdle?: number;
    /**
     * Minimum number of asynchronous connections allowed per server node.
     *
     * Preallocate min connections on client node creation. The
     * client will periodically allocate new connections if count falls below
     * min connections.
     *
     * Server <code>proto-fd-idle-ms</code> may also need to be increased
     * substantially if min connections are defined. The
     * <code>proto-fd-idle-ms</code> default directs the server to close
     * connections that are idle for 60 seconds which can defeat the purpose of
     * keeping connections in reserve for a future burst of activity.
     *
     * If server <code>proto-fd-idle-ms</code> is changed, client {@link
     * Config#maxSocketIdle} should also be changed to be a few seconds less
     * than <code>proto-fd-idle-ms</code>.
     *
     * @default 0
     */
    minConnsPerNode?: number;
    /**
     * Configuration values for the mod-lua user path.
     *
     * If you are using user-defined functions (UDF) for processing
     * query results (i.e. aggregations), then you will find it useful to set
     * the <code>modlua</code> settings. Of particular importance is the
     * <code>modelua.userPath</code>, which allows you to define a path to where
     * the client library will look for Lua files for processing.
     *
     */
    modlua?: ModLua;

    /**
     * The password to use when authenticating to the cluster.
     */
    password?: string;

    /**
     * Global client policies.
     *
     * The configuration defines default policies for the
     * application. Policies define the behavior of the client, which can be
     * global for all uses of a single type of operation, or local to a single
     * use of an operation.
     *
     * Each database operation accepts a policy for that operation as an
     * argument. This is considered a local policy, and is a single use policy.
     * This local policy supersedes any global policy defined.
     *
     * If a value of the policy is not defined, then the rule is to fallback to
     * the global policy for that operation. If the global policy for that
     * operation is undefined, then the global default value will be used.
     *
     * If you find that you have behavior that you want every use of an
     * operation to utilize, then you can specify the default policy as
     * {@link Config#policies}.
     *
     * For example, the {@link Client#put} operation takes a {@link
     * WritePolicy} parameter. If you find yourself setting the {@link
     * WritePolicy#key} policy value for every call to {@link Client.put}, then
     * you may find it beneficial to set the global {@link WritePolicy} in
     * {@link Config#policies}, which all operations will use.
     *     *
     * @example <caption>Setting a default <code>key</code> policy for all write operations</caption>
     *
     * const Aerospike = require('aerospike')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   policies: {
     *     write: new Aerospike.WritePolicy({
     *       key: Aerospike.policy.key.SEND,
     *       socketTimeout : 0,
     *       totalTimeout : 0
     *     })
     *   }
     * }
     *
     * let key = new Aerospike.Key('test', 'demo', 123)
     *
     * Aerospike.connect(config)
     *   .then(client => {
     *     return client.put(key, {int: 42})
     *       .then(() => client.close())
     *       .catch(error => {
     *         throw error
     *         client.close()
     *       })
     *   })
     *   .catch(console.error)
     */
    policies?: ConfigPolicies;
    /**
     * Default port to use for any host address, that does not
     * explicitly specify a port number. Default is 3000.
     *      *
     * @since v2.4
     */
    port?: number;
    /**
     * Track server rack data.
     * 
     * This field is useful when directing read commands to the
     * server node that contains the key and exists on the same rack as the
     * client. This serves to lower cloud provider costs when nodes are
     * distributed across different racks/data centers.
     *
     * {@link rackId} config, {@link
     * policy.replica.PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @default false
     * 
     * @since 3.8.0
     */
    rackAware?: boolean;
    /**
     *  Rack where this client instance resides.
     * 
     * {@link rackAware} config, {@link policy.replica.PREFER_RACK} replica policy, and server
     * rack configuration must also be set to enable this functionality.
     *
     * @default 0
     * 
     * @since 3.8.0
     */
    rackId?: number;
    /**
     * Shared memory configuration.
     * 
     * This allows multiple client instances running in separate
     * processes on the same machine to share cluster status, including nodes and
     * data partition maps. Each shared memory segment contains state for one
     * Aerospike cluster. If there are multiple Aerospike clusters, a different
     * <code>key</code> must be defined for each cluster.
     * 
     * @see {@link http://www.aerospike.com/docs/client/c/usage/shm.html#operational-notes|Operational Notes}
     *
     * @example <caption>Using shared memory in a clustered setup</caption>
     *
     * const Aerospike = require('aerospike')
     * const cluster = require('cluster')
     *
     * const config = {
     *   sharedMemory: {
     *     key: 0xa5000000
     *   }
     * }
     * const client = Aerospike.client(config)
     * const noWorkers = 4
     *
     * if (cluster.isMaster) {
     *   // spawn new worker processes
     *   for (var i = 0; i < noWorkers; i++) {
     *     cluster.fork()
     *   }
     * } else {
     *   // connect to Aerospike cluster in each worker process
     *   client.connect((err) => { if (err) throw err })
     *
     *   // handle incoming HTTP requests, etc.
     *   // http.createServer((request, response) => { ... })
     *
     *   // close DB connection on shutdown
     *   client.close()
     * }
     */
    sharedMemory?: SharedMemory;

    /**
     * Polling interval in milliseconds for cluster tender.
     * 
     * @default 1000
     */
    tenderInterval?: number;
    /**
     * Configure Transport Layer Security (TLS) parameters for secure
     * connections to the database cluster. TLS connections are not supported as
     * of Aerospike Server v3.9 and depend on a future server release.
     * 
     * @since v2.4
     */
    tls?: TLSInfo;
    /**
     * Whether the client should use the server's
     * <code>alternate-access-address</code> instead of the
     * <code>access-address</code>.
     *
     * @default false
     * 
     * @since v3.7.1
     */
    useAlternateAccessAddress?: boolean;
    /**
     * The user name to use when authenticating to the cluster.
     * 
     * Leave empty for clusters running without access management.
     * (Security features are available in the Aerospike Database Enterprise
     * Edition.)
     * 
     */
    user?: string;

}

/**
 * Global client policies.
 *
 * @remarks The configuration defines default policies for the
 * application. Policies define the behavior of the client, which can be
 * global for all uses of a single type of operation, or local to a single
 * use of an operation.
 *
 * Each database operation accepts a policy for that operation as an
 * argument. This is considered a local policy, and is a single use policy.
 * This local policy supersedes any global policy defined.
 *
 * If a value of the policy is not defined, then the rule is to fallback to
 * the global policy for that operation. If the global policy for that
 * operation is undefined, then the global default value will be used.
 *
 * If you find that you have behavior that you want every use of an
 * operation to utilize, then you can specify the default policy as
 * {@link Config#policies}.
 *
 * For example, the {@link Client#put} operation takes a {@link
 * WritePolicy} parameter. If you find yourself setting the {@link
 * WritePolicy#key} policy value for every call to {@link Client.put}, then
 * you may find it beneficial to set the global {@link WritePolicy} in
 * {@link Config#policies}, which all operations will use.
 *
 *
 * @example <caption>Setting a default <code>key</code> policy for all write operations</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     write: new Aerospike.WritePolicy({
 *       key: Aerospike.policy.key.SEND,
 *       socketTimeout : 0,
 *       totalTimeout : 0
 *     })
 *   }
 * }
 *
 * let key = new Aerospike.Key('test', 'demo', 123)
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     return client.put(key, {int: 42})
 *       .then(() => client.close())
 *       .catch(error => {
 *         throw error
 *         client.close()
 *       })
 *   })
 *   .catch(console.error)
 */
export interface ConfigPolicies {
    /**
     * Apply policy. For more information, see {@link policy.ApplyPolicy | ApplyPolicy}
     */
    apply?: policy.ApplyPolicy;
    /**
     * Batch policy. For more information, see {@link policy.BasePolicy | BasePolicy}
     */
    batch?: policy.BasePolicy;
    /**
     * Batch parent write policy. For more information, see {@link policy.BatchPolicy | BatchPolicy}
     */
    batchParentWrite?: policy.BatchPolicy;
    /**
     * Info policy. For more information, see {@link policy.InfoPolicy | InfoPolicy}
     */
    info?: policy.InfoPolicy;
    /**
     * Operate policy. For more information, see {@link policy.OperatePolicy | OperatePolicy}
     */
    operate?: policy.OperatePolicy;
    /**
     * Read policy. For more information, see {@link policy.ReadPolicy | ReadPolicy}
     */
    read?: policy.ReadPolicy;
    /**
     * Remove policy. For more information, see {@link policy.RemovePolicy | RemovePolicy}
     */
    remove?: policy.RemovePolicy;
    /**
     * Scan policy. For more information, see {@link policy.ScanPolicy | ScanPolicy}
     */
    scan?: policy.ScanPolicy;
    /**
     * Query policy. For more information, see {@link policy.QueryPolicy | QueryPolicy}
     */
    query?: policy.QueryPolicy;
    /**
     * Write policy. For more information, see {@link policy.WritePolicy | WritePolicy}
     */
    write?: policy.WritePolicy;

}


export interface ConnectionStats {
    /**
     * Connections residing in
     * pool(s) for this node. There can be multiple pools per node.
     * This value is a summary of those pools for this node.
     */
    inPool: number;
    /**
     * Connections actively being
     * used in database transactions for this node.
     */
    inUse: number;
    /**
     * Total number of node connections opened since node creation.
     */
    opened: number;
    /**
     * Total number of node connections closed since node creation.
     */
    closed: number;
}


export interface EventLoopStats {
    /**
     * Approximate number of commands
     * actively being proccessed.
     */
    inFlight: number;
    /**
     * Approximate number of commands queued
     * on the global command queue, that have not yet been started.
     */
    queued: number;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface HLLPolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the behavior when writing byte values.
     *
     * @default hll.writeFlags.DEFAULT
     * @see {@link hll.writeFlags} for supported policy values.
     */
    writeFlags: hll.writeFlags;
}
/**
 * The address of the cluster host to send a request to.
 */
export interface Host {
    /**
     * The IP address or host name of the host.
     */
    addr: string;
    /**
     * The port of the host.
     */
    port?: number;
    /**
     * name to use when verifying the TLS certificate for TLS encrypted server connections.
     */
    tlsname?: string;
}

/**
 * A key uniquely identifies a record in the Aerospike database within a given namespace.
 *
 * ###### Key Digests
 * In your application, you must specify the namespace, set and the key itself
 * to read and write records. When a key is sent to the database, the key value
 * and its set are hashed into a 160-bit digest. When a database operation
 * returns a key (e.g. Query or Scan operations) it might contain either the
 * set and key value, or just the digest.
 *
 * @example <caption>Creating a new {@link Key} instance</caption>
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * var key1 = new Key('test', 'demo', 12345)
 * var key2 = new Key('test', 'demo', 'abcde')
 * var key3 = new Key('test', 'demo', Buffer.from([0x62,0x75,0x66,0x66,0x65,0x72])) */
export interface KeyOptions {
    /**
     * The Namespace to which the key belongs.
     */
    ns: string;
    /**
     * The Set to which the key belongs.
     */
    set: string;
    /**
     * The unique key value. Keys can be
     * strings, integers or an instance of the Buffer class.
     */
    key?: string | number | Buffer;
    /**
     * The digest value of the key.
     */
    digest?: Buffer;
}

/**
 * Options for creating an index.
 */
export interface IndexOptions {
    /**
     * The name of the bin which values are to be indexed.
     */
    bin: string;
    /**
     * The namespace on which the index is to be created.
     */
    ns: string;
    /**
     * The set on which the index is to be created.
     */
    set: string;
    /**
     * The name of the index to be created.
     */
    index: string;
    /**
     * Type of index to be
     * created based on the type of values stored in the bin. This option needs to
     * be specified if the bin to be indexed contains list or map values and the
     * individual entries of the list or keys/values of the map should be indexed.
     * 
     * See {@link indexType} for accepted values.
     */
    type?: indexType;
    /**
     * The data type of the index to be created, e.g. Numeric, String or Geo. Not necessary to specify when using APIs 
     * such as {@link Client#createIntegerIndex}, {@link Client#createStringIndex}, or {@link Client#createBlobIndex}.
     */
    datatype?: indexDataType;
    /**
     * The {@link cdt.Context} on which the index is to be created.
     */
    context?: cdt.Context;
}

/**
 * Response to {@link Client.infoAll} command
 */
export interface InfoAllResponse {
    /**
     * The node that send the info response
     */
    host: InfoNode;
    /**
     * The response string with the requested info.
     */
    info: string;
}

/**
 * Representation of Node from {@link Client.infoAll}
 */
export interface InfoNode {
    /**
     * The name of the node.
     */
    node_id: string;
}

/**
 * Defines node parameter type for use in {@link Client.infoNode}
 */
export interface InfoNodeParam {
    /**
     * The name of the node.
     */
    name: string;
}

/**
 * Option specification for {@link policy.AdminPolicy} class values.
 */
export interface InfoPolicyOptions extends BasePolicyOptions {
    /**
     * Ensure the request is within allowable size limits.
     */
    checkBounds?: boolean;
    /**
     * Send request without any further processing.
     */
    sendAsIs?: boolean;
    /**
     * Maximum time in milliseconds to wait for the operation to complete.
     */
    timeout?: number
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface ListPolicyOptions extends BasePolicyOptions {
    /**
     * Sort order for the list.
     *
     * @type number
     * @default {@ link lists.order.UNORDERED}
     * @see {@link lists.order} for supported policy values.
     */
    order?: lists.order;
    /**
     * Specifies the behavior when replacing or inserting list items.
     *
     * @type number
     * @default {@link lists.writeFlags.DEFAULT}
     * @see {@link lists.writeFlags} for supported policy values.
     */
    writeFlags?: lists.writeFlags;
}
/**
 * Configuration for logging done by the client.
 */
export interface Log {
    /**
     * Log level; see {@link log} for details.
     */
    level?: log;
    /**
     * File descriptor returned by
     * <code>fs.open()</code> or one of <code>process.stdout.fd</code> or
     * <code>process.stderr.fd</code>.
     */
    file?: number;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface MapPolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * Map write flags require server version v4.3 or later. For earier server
     * versions, set the {@link MapPolicy.writeMode|writeMode} instead.
     *
     * @default {@link maps.writeFlags.DEFAULT}
     * @see {@link maps.writeFlags} for supported policy values.
     * @since v3.5
     */
    order?: maps.order;
    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * Map write flags require server version v4.3 or later. For earier server
     * versions, set the {@link MapPolicy.writeMode|writeMode} instead.
     *
     * @default {@link maps.writeFlags.DEFAULT}
     * @see {@link maps.writeFlags} for supported policy values.
     * @since v3.5
     */
    writeFlags?: maps.writeFlags;
    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * Map write mode should only be used for server versions prior to v4.3.
     * For server versions v4.3 or later, the use of {@link
     * MapPolicy.writeFlags | writeFlags} is recommended.
     *
     * @default {@link maps.writeMode.UPDATE}
     * @see {@link maps.writeMode} for supported policy values.
     * @deprecated since v3.5
     */
    writeMode?: maps.writeMode;
}
/**
 * Configuration values for the mod-lua user path.
 * 
 * If you are using user-defined functions (UDF) for processing
 * query results (i.e. aggregations), then you will find it useful to set
 * the <code>modlua</code> settings. Of particular importance is the
 * <code>modelua.userPath</code>, which allows you to define a path to where
 * the client library will look for Lua files for processing.

 *
 * @property {string} [modlua.userPath] - Path to user Lua scripts.
 */
export interface ModLua {
    /**
     * Path to user Lua scripts.
     */
    userPath?: string;
}

/**
 * Aerospike Node information.
 */
export interface Node {
    /**
     * Name of the Aerospike Node.
     */
    name: string;
    /**
     * Address of the Aeropsike Node.
     */
    address: string;
}

/**
 * Aerospike Node Stats.
 */
export interface NodeStats {
    /**
     * name of the Aerospike Node.
     */
    name: string;
    /**
     * Connections stats for Synchronous Connections on this Node..
     * 
     * @remarks The Aerospike Node.js does not use synchronous connections.
     */
    syncConnections: ConnectionStats;
    /**
     * Connection stats for Asynchronous Connections on this Node.
     */
    asyncConnections: ConnectionStats;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface OperatePolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @see {@link policy.commitLevel} for supported policy values.
     */
    commitLevel?: policy.commitLevel;
    /**
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @default <code>true</code>
     * @since v3.7.0
     */
    deserialize?: boolean;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Specifies the behavior for the existence of the record.
     *
     * @see {@link policy.exists} for supported policy values.
     */
    exists?: policy.exists;
    /**
     * Specifies the behavior for the generation value.
     *
     * @see {@link policy.gen} for supported policy values.
     */
    gen?: policy.gen;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @default Aerospike.policy.readModeAP.ONE
     * @see {@link policy.readModeAP} for supported policy values.
     */
    readModeAP?: policy.readModeAP;
    /**
     * Read policy for SC (strong consistency) namespaces.
     *
     * @default Aerospike.policy.readModeSC.SESSION
     * @see {@link policy.readModeSC} for supported policy values.
     */
    readModeSC?: policy.readModeSC;
    /**
     * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
     * efficiently operate as a read-based LRU cache where the least recently used records are expired.
     * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
     * within this interval of the record’s end of life will generate a touch.
     *
     * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
     * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
     * recent write) will result in a touch, resetting the TTL to another 10 hours.
     *
     * @default 0
     */
    readTouchTtlPercent?: number;
    /**
     * Specifies the replica to be consulted for the read operation.
     *
     * @see {@link policy.replica} for supported policy values.
     */
    replica?: policy.replica;
}

/**
 * Interface used to specify which partition a query starts on and how many partitions to query.
 */
export interface PartFilter {
    /**
     * Parition in which the query will begin.
     */
    begin?: number;
    /**
     * Number of partitions to filter.
     */
    count?: number;
    /**
     * Digest in which the query will begin from.
     */
    digest?: Buffer;
}

/**
 * Options when defining a privilege.
 */
export interface PrivilegeOptions {
    /**
     * Namespace scope.  Apply permission to this null terminated namespace only.
     * If string length is zero, the privilege applies to all namespaces.
     */
    namespace?: string;
    /**
     * Set name scope.  Apply permission to this null terminated set within namespace only.
     * If string length is zero, the privilege applies to all sets within namespace.
     */
    set?: string;
}

/**
 * Interface used for providing options to a new {@link Query} class instance.
 */
export interface QueryOptions {
    /**
     * User-defined function parameters to be applied to the query executed using
     * {@link Query#foreach}.
     */
    udf?: UDF;
    /**
     * Filters to apply to the query.
     *
     * *Note:* Currently, a single index filter is supported. To do more
     * advanced filtering, you need to use a user-defined function (UDF) to
     * process the result set on the server.
     */
    filters?: filter.SindexFilterPredicate[];
    /**
     * List of bin names to be selected by the query. If a query specifies bins to
     * be selected, then only those bins will be returned. If no bins are
     * selected, then all bins will be returned (unless {@link Query#nobins} is
     * set to `true`).
     */
    select?: string[];
    /**
     * If set to `true`, the query will return only meta data, and exclude bins.
     */
    nobins?: boolean;
    /**
     * Approximate number of records to return to client.
     *
     * When {@link paginate} is <code>true</code>,
     * then maxRecords will be the page size if there are enough records remaining in the query to fill the page size.
     *
     * When {@link paginate} is <code>false</code>, this number is divided by the number of nodes involved in the scan,
     * and actual number of records returned may be less than maxRecords if node record counts are small and unbalanced across nodes.
     */
    maxRecords?: number;
    /**
     * If set to <code>true</code>, paginated queries are enabled. In order to receive paginated
     * results, the {@link maxRecords} property must assign a nonzero integer value.
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#foreach}.</caption>
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType;.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 10})
     *     do {
     *       const stream = query.foreach()
     *       stream.on('error', (error) => { throw error })
     *       stream.on('data', (record) => {
     *         console.log(record.bins)
     *       })
     *       await new Promise(resolve => {
     *         stream.on('end', (queryState) => {
     *           query.queryState = queryState
     *           resolve()
     *         })
     *       })
     *     } while (query.queryState !== undefined)
     *
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#results}</caption>
     *
     *
     * const Aerospike = require('./lib/aerospike');
     * // Define host configuration
     * let config = {
     *   hosts: '34.213.88.142:3000',
     *   policies: {
     *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *   }
     * };
     *
     * var batchRecords = []
     * for(let i = 0; i < 30; i++){
     *   batchRecords.push({
     *     type: Aerospike.batchType.BATCH_WRITE,
     *     key: new Aerospike.Key('test', 'demo', 'key' + i),
     *     ops:[Aerospike.operations.write('exampleBin', i)]
     *   })
     * }
     *
     *
     * ;(async function() {
     *   try {
     *     client = await Aerospike.connect(config)
     *     await client.truncate('test', 'demo', 0)
     *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
     *
     *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 11})
     *
     *     let allResults = []
     *     let results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *
     *     results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *     results = await query.results()
     *     allResults = [...allResults, ...results]
     *
     *     console.log("Records returned in total: " + allResults.length)  // Should be 30 records
     *   } catch (error) {
     *     console.error('An error occurred at some point.', error)
     *     process.exit(1)
     *   } finally {
     *     if (client) client.close()
     *   }
     * })()
     *
     */
    paginate?: boolean;
    /**
     * The time-to-live (expiration) of the record in seconds.
     * 
     * There are also special values that can be set in the record TTL  For details
     *
     * Note that the TTL value will be employed ONLY on background query writes.
     */
    ttl?: number;
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface QueryPolicyOptions extends BasePolicyOptions {
    /**
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @default <code>true</code>
     * @since v3.7.0
     */
    deserialize?: boolean;
    /**
     * Expected query duration. The server treats the query in different ways depending on the expected duration.
     * This field is ignored for aggregation queries, background queries and server versions &lt; 6.0.
     *
     * @see {@link policy.queryDuration} for supported policy values.
     * @default {@link policy.queryDuration.LONG}
     */
    expectedDuration?: policy.queryDuration;
    /**
     * Terminate the query if the cluster is in migration state. If the query's
     * "where" clause is not defined (scan), this field is ignored.
     *
     * Requires Aerospike Server version 4.2.0.2 or later.
     *
     * @default <code>false</code>
     * @since v3.4.0
     */
    failOnClusterChange?: boolean;
    /**
     * Timeout in milliseconds used when the client sends info commands to
     * check for cluster changes before and after the query. This timeout is
     * only used when {@link
     * QueryPolicy.failOnClusterChange | failOnClusterChange} is true and the
     * query's "where" clause is defined.
     *
     * @default 10000 ms
     * @since v3.16.5
     */
    infoTimeout?: number;
    /**
     * Specifies the replica to be consulted for the query operation.
     *
     * @see {@link policy.replica} for supported policy values.
     */
    replica?: policy.replica;
    /**
     * Total transaction timeout in milliseconds.
     *
     * The <code>totalTimeout</code> is tracked on the client and sent to the
     * server along with the transaction in the wire protocol. The client will
     * most likely timeout first, but the server also has the capability to
     * timeout the transaction.
     *
     * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
     * is reached before the transaction completes, the transaction will return
     * error {@link status.ERR_TIMEOUT | ERR_TIMEOUT}.
     * If <code>totalTimeout</code> is zero, there will be no total time limit.
     *
     * @default 0
     * @override
     */
    totalTimeout?: number;
}
/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface ReadPolicyOptions extends BasePolicyOptions {
    /**
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @type boolean
     * @default <code>true</code>
     * @since v3.7.0
     */
    deserialize?: boolean;
    /**
     * Specifies the behavior for the key.
     *
     * @type number
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @type number
     * @default Aerospike.policy.readModeAP.ONE
     * @see {@link policy.readModeAP} for supported policy values.
     */
    readModeAP?: policy.readModeAP;

    /**
     * Read policy for SC (strong consistency) namespaces.
     *
     * @type number
     * @default Aerospike.policy.readModeSC.SESSION
     * @see {@link policy.readModeSC} for supported policy values.
     */
    readModeSC?: policy.readModeSC;
    /**
     * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
     * efficiently operate as a read-based LRU cache where the least recently used records are expired.
     * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
     * within this interval of the record’s end of life will generate a touch.
     *
     * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
     * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
     * recent write) will result in a touch, resetting the TTL to another 10 hours.
     *      *
     * @type number
     * @default 0
     */
    readTouchTtlPercent?: number;
    /**
     * Specifies the replica to be consulted for the read operation.
     *
     * @type number
     * @see {@link policy.replica} for supported policy values.
     */
    replica?: policy.replica;
}
/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface RemovePolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @see {@link policy.commitLevel} for supported policy values.
     */
    commitLevel?: policy.commitLevel;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Specifies the behavior for the generation value.
     *
     * @see {@link policy.gen} for supported policy values.
     */
    gen?: policy.gen;
    /**
     * The generation of the record.
     */
    generation?: number;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
}

/**
 * Role defintion.
 */
export interface RoleOptions {
    /**
     * Role name
     */
    name: string;
    /**
     * Maximum reads per second limit.
     */
    readQuota: number;
    /**
     * Maximum writes per second limit.
     */
    writeQuota: number;
    /**
     * Array of allowable IP address strings.
     */
    whitelist: number[];
    /**
     * Length of privileges array.
     */
    privileges: admin.Privilege[];
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface ScanPolicyOptions extends BasePolicyOptions {
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Approximate number of records to return to client. This number is
     * divided by the number of nodes involved in the scan. The actual number
     * of records returned may be less than maxRecords if node record counts
     * are small and unbalanced across nodes.
     *
     * Requires server >= 4.9.
     *
     * @default 0 (do not limit record count)
     *
     * @since v3.16.0
     */
    maxRecords?: number;
    /**
     * Limit returned records per second (RPS) rate for each server. Do not
     * apply RPS limit if <code>recordsPerSecond</code> is zero.
     *
     * Requires server >= 4.7.
     *
     * @default 0
     *
     * @since v3.14.0
     */
    recordsPerSecond?: number;
    /**
     * Specifies the replica to be consulted for the scan operation.
     *
     * @see {@link policy.replica} for supported policy values.
     */
    replica?: policy.replica;
    /**
     * Total transaction timeout in milliseconds.
     *
     * The <code>totalTimeout</code> is tracked on the client and sent to the
     * server along with the transaction in the wire protocol. The client will
     * most likely timeout first, but the server also has the capability to
     * timeout the transaction.
     *
     * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
     * is reached before the transaction completes, the transaction will return
     * error {@link status.ERR_TIMEOUT | ERR_TIMEOUT}.
     * If <code>totalTimeout</code> is zero, there will be no total time limit.
     *
     * @default 0
     * @override
     */
    totalTimeout?: number;

}
/**
 * Interface used to configure shared memory.
 */
export interface SharedMemory {
    /**
     * Whether to enable/disable usage of
     * shared memory.
     */
    enable?: boolean;
    /**
     * Identifier for the shared memory segment
     * associated with the target Aerospike cluster; the same key needs to be
     * used on all client instances connecting to the same cluster.
     */
    key: number;
    /**
     * Sets the max. number of server nodes in the cluster - this value is required to size the shared
     * memory segment. Ensure that you leave a cushion between actual server node
     * cound and <code>maxNodes</code> so that you can add new nodes without
     * rebooting the client.
     */
    maxNodes?: number;
    /**
     * Sets the max. number of namespaces used in the cluster - this value is required to size the shared
     * memory segment. Ensure that you leave a cushion between actual namespace
     * count and <code>maxNamespaces</code> so that you can add new namespaces
     * without rebooking the client.
     */
    maxNamespaces?: number;
    /**
     * Expiration time in seconds for the lock on the shared memory segment; if the cluster
     * status has not been updated after this many seconds another client instance
     * will take over the shared memory cluster tending.
     */
    takeoverThresholdSeconds?: number;
}

/**
 * Aerospike statistics, including Node and event loop statistics.
 */
export interface Stats {
    /**
     * Statistics relating to the event loop.
     */
    commands: EventLoopStats;
    /**
     * Statistics relating to individual Node usage.
     */
    nodes: NodeStats[];
}

/**
 * Configure Transport Layer Security (TLS) parameters for secure
 * connections to the database cluster. TLS connections are not supported as
 * of Aerospike Server v3.9 and depend on a future server release.
 * 
 * @since v2.4
 * 
 */
export interface TLSInfo
 {
    /**
     * Enable TLS for socket connections to
     * cluster nodes. By default TLS is enabled only if the client configuration
     * includes a <code>tls</code> section.
     */
    enable?: boolean;
    /**
     * Path to a trusted CA certificate file. By
     * default TLS will use system standard trusted CA certificates.
     */
    cafile?: string;
    /**
     * Path to a directory of trusted certificates.
     * See the OpenSSL SSL_CTX_load_verify_locations manual page for more
     * information about the format of the directory.
     */
    capath?: string;
    /**
     * Specifies enabled protocols. The format is
     * the same as Apache's SSLProtocol documented at
     * https://httpd.apache.org/docs/current/mod/mod_ssl.html#sslprotocol. If not
     * specified, the client will use "-all +TLSv1.2". If you are not sure what
     * protocols to select this option is best left unspecified.     
     */
    protocols?: string;
    /**
     * Specifies enabled cipher suites. The
     * format is the same as OpenSSL's Cipher List Format documented at
     * https://www.openssl.org/docs/manmaster/apps/ciphers.html. If not specified
     * the OpenSSL default cipher suite described in the ciphers documentation
     * will be used. If you are not sure what cipher suite to select this option
     * is best left unspecified.
     */
    cipherSuite?: string;
    /**
     * Path to a certificate blacklist file.
     * The file should contain one line for each blacklisted certificate. Each
     * line starts with the certificate serial number expressed in hex. Each
     * entry may optionally specify the issuer name of the certificate. (Serial
     * numbers are only required to be unique per issuer.) Example records:
     * <code><br>867EC87482B2 /C=US/ST=CA/O=Acme/OU=Engineering/CN=Test Chain CA<br>
     * E2D4B0E570F9EF8E885C065899886461</code>
     */
    certBlacklist?: string;
    /**
     * Path to the client's key for mutual
     * authentication. By default, mutual authentication is disabled.
     */
    keyfile?: string;
    /**
     * Decryption password for the
     * client's key for mutual authentication. By default, the key is assumed
     * not to be encrypted.
     */
    keyfilePassword?: string;
    /**
     * Path to the client's certificate chain
     * file for mutual authentication. By default, mutual authentication is
     * disabled.
     */
    certfile?: string;
    /**
     * Enable CRL checking for the
     * certificate chain leaf certificate. An error occurs if a suitable CRL
     * cannot be found. By default CRL checking is disabled.
     */
    crlCheck?: boolean;
    /**
     * Enable CRL checking for the
     * entire certificate chain. An error occurs if a suitable CRL cannot be
     * found. By default CRL checking is disabled.
     */
    crlCheckAll?: boolean;
    /**
     * Log session information for
     * each connection.
     */
    logSessionInfo?: boolean;
    /**
     * Use TLS connections only for login authentication. All other communication with the server will be done
     * with non-TLS connections. Default: false (Use TLS connections for all
     * communication with the server.)
     */
    forLoginOnly?: boolean;
}

/**
 *  Parameters used to specify which UDF function to execute.
 */
export interface UDF {
    /**
     * The name of the UDF module that was registered with the cluster.
     */
    module: string;
    /**
     * The name of the UDF function within the module.
     */
    funcname: string;
    /**
     * List of arguments to pass to the UDF function.
     */
    args?: AerospikeBinValue[];
}

/**
 * Contains user roles and other user related information
 */
export interface UserOptions {
    /**
     * Number of currently open connections.
     */
    connsInUse: number;
    /**
     * Name of the {@link admin.User}.
     */
    name: string;
    /**
     * Array of read statistics. Array may be null.
     * Current statistics by offset are:
     * <ul>
     * <li>0: read quota in records per second</li>
     * <li>1: single record read transaction rate (TPS)</li>
     * <li>2: read scan/query record per second rate (RPS)</li>
     * <li>3: number of limitless read scans/queries</li>
     * </ul>
     * Future server releases may add additional statistics.
     */
    readInfo: number[];
    /**
     * Array of write statistics. Array may be null.
     * Current statistics by offset are:
     * <ul>
     * <li>0: write quota in records per second</li>
     * <li>1: single record write transaction rate (TPS)</li>
     * <li>2: write scan/query record per second rate (RPS)</li>
     * <li>3: number of limitless write scans/queries</li>
     * </ul>
     * Future server releases may add additional statistics.
     */
    writeInfo: number[];
    /**
     * Array of assigned role names.
     */
    roles: string[];
}

/**
 * Option specification for {@ link AdminPolicy} class values.
 */
export interface WritePolicyOptions extends BasePolicyOptions {
    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @see {@link policy.commitLevel} for supported policy values.
     */
    commitLevel?: policy.commitLevel;

    /**
     * Minimum record size beyond which it is compressed and sent to the
     * server.
     */
    compressionThreshold?: number;
    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @default <code>false</code> (do not tombstone deleted records)
     */
    durableDelete?: boolean;
    /**
     * Specifies the behavior for the existence of the record.
     *
     * @see {@link policy.exists} for supported policy values.
     */
    exists?: policy.exists;
    /**
     * Specifies the behavior for the generation value.
     *
     * @see {@link policy.gen} for supported policy values.
     */
    gen?: policy.gen;
    /**
     * Specifies the behavior for the key.
     *
     * @see {@link policy.key} for supported policy values.
     */
    key?: policy.key;
}

/* ENUMS */


/**
 * Authentication mode when user/password is defined.
 *
 * Note: The Node.js client's TLS support is currently limited to Linux, and
 * therefore secure, external authentication (e.g. LDAP) is only supported on
 * Linux as well. External authentication can be used on macOS or Windows but
 * it will _not_ be secure! 
 *
 * @example <caption>Using external authentication mode, e.g. to use LDAP authentication</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   user: process.env.ADMIN_USER,
 *   password: process.env.ADMIN_PASSWORD,
 *   authMode: Aerospike.auth.EXTERNAL
 * }
 *
 *
 * @example <caption>Using PKI authentication mode</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   hosts: [
 *       { addr: 'bob-cluster-a', port: process.env.PORT}
 *   ],
 *   tls: {
 *      cafile: process.env.CAFILE,
 *      keyfile: process.env.KEYFILE,
 *      certfile: process.env.CERT,
 *   }
 *   authMode: Aerospike.auth.AUTH_PKI,
 * }
 *
 *
 * Aerospike.connect(config).then(async (client) => {
 *   const info = await client.infoAny().then(Aerospike.info.parse)
 *   console.info(info)
 *   client.close()
 * })
 */
export enum auth {
    /**
     * Use internal authentication only. Hashed password is stored on the server. Do not send clear password. This is the
     * default.
     */
    INTERNAL,
    /**
     * Use external authentication (like LDAP).
     * Specific external authentication is configured on server. If TLS is enabled,
     * send clear password on node login via TLS. Throws exception, if TLS is not
     * enabled.
     */
    EXTERNAL,
    /**
     * Use external authentication (like
     * LDAP). Specific external authentication is configured on server. Send
     * clear password on node login whether or not TLS is enabled. This mode
     * should only be used for testing purposes because it is not secure
     * authentication.
     */
    EXTERNAL_INSECURE,
    /**
     * Use PKI authentication.
     * Authentication and authorization is based on a certificate.  No user name or
     * password needs to be configured.  Requires mTLS and a client certificate.
     */
    AUTH_PKI
}

/**
 * Identifies batch record type with designated enumerated type
 */
export enum batchType {
    /**
     * Indicates that a {@link Record} instance is used in a batch for read operations.
     */
    BATCH_READ,
    /**
     * Indicates that a {@link Record} instance is used in a batch for write operations.
     */
    BATCH_WRITE,
    /**
     * Indicates that a {@link Record} instance is used in a batch for applying record.
     */
    BATCH_APPLY,
    /**
     * Indicates that a {@link Record} instance is used in a batch for removal operations.
     */
    BATCH_REMOVE,
    /**
     * Indicates that a {@link Record} instance is used in a batch for transaction verfication operations.
     */
    BATCH_TXN_VERIFY,
    /**
     * Indicates that a {@link Record} instance is used in a batch for transaction rolling operations.
     */
    BATCH_TXN_ROLL
}

/**
 * Specifies secondary index data types.
 */
export enum indexDataType {
    /*
     * Values contained in the SI are strings.
     */   
    STRING,
    /*
     * Values contained in the SI are integers.
     */
    NUMERIC,
    /**
     * Values contained in the SI are GeoJSON values (points or polygons).
     */
    GEO2DSPHERE,
    /*
     * Values contained in the SI are blobs (Buffer in Node.js).
     */
    BLOB
}

/**
 * Specifies the collection datatype the secondary index should be built on. DEFAULT implies the value is not a collection datatype.z       
 */
export enum indexType {
    /**
     * Default Secondary Index type for bins
     * containing scalar values (i.e. integer, string).
     */
    DEFAULT,
    /**
     * Secondary index for bins containing
     * <a href="https://aerospike.com/docs/server/guide/data-types/cdt-list" title="Aerospike List Data Type">&uArr;Lists</a>;
     * The index will be built over the individual entries of the list.
     */
    LIST,
    /**
     * SI for bins containing
     * <a href="https://aerospike.com/docs/server/guide/data-types/cdt-map" title="Aerospike Maps Data Type">&uArr;Maps</a>;
     * The index will be built over the individual keys of the map entries.
     */
    MAPKEYS,
    /**
     * SI for bins containing
     * <a href="https://aerospike.com/docs/server/guide/data-types/cdt-map" title="Aerospike Maps Data Type">&uArr;Maps</a>;
     * The index will be built over the individual values of the map entries.
     */
    MAPVALUES
}

/**
 * Enumerations represented the completion status of a Job in Aerospike.
 */
export enum jobStatus {
    /**
     * The job status is undefined. This is likely due to the
     * status not being properly checked.
     */
    UNDEF,
    /**
     * The job is currently running.
     */
    INPROGRESS,
    /**
     * The job is completed successfully.
     */
    COMPLETED
}

/**
 * Specifies language used in UDFs (User defined Functions).
 */
export enum language {
    /**
     * Lua (only supported UDF type at the moment)
     */
    LUA
}

/**
 * Enumeration of log levels
 */
export enum log {
    /**
     * Turn off logging
     */
    OFF = -1,
    /**
     * Log messages at ERROR level
     */
    ERROR,
    /**
     * Log messages at WARN level or below
     */
    WARN,
    /**
     * Log messages at INFO level or below
     */
    INFO,
    /**
     * Log messages at DEBUG level or below
     */
    DEBUG,
    /**
     * Log messages at TRACE level or below
     */
    TRACE
}

/**
 * Permission codes define the type of permission granted for a user's role.
 */
export enum privilegeCode {
    /**
     * User can edit/remove other users.
     */
    USER_ADMIN,
    /**
     * User can perform systems administration functions on a database that do not involve user administration.
     */
    SYS_ADMIN,
    /**
     * User can perform UDF and SINDEX administration actions.
     */
    DATA_ADMIN,
    /**
     * User can perform user defined function (UDF) administration actions.
     */
    UDF_ADMIN,
    /**
     * User can perform secondary index administration actions.
     */
    SINDEX_ADMIN,
    /**
     * User can read data.
     */
    READ,
    /**
     * User can read and write data.
     */
    READ_WRITE,
    /**
     * User can read and write data through user defined functions.
     */
    READ_WRITE_UDF,
    /**
     * User can write data.
     */
    WRITE,
    /**
     * User can truncate data only.
     */
    TRUNCATE
}

/**
 * POSIX regex compilation flags.
 *
 */
export enum regex {
    /** 
     * Use basic regular expression syntax.
     */
    BASIC,
    /** 
     * Use extended regular expression syntax. 
     */
    EXTENDED,
    /** 
     * Ignore case when matching.
     *  */
    ICASE,
    /** 
     * Anchors do not match at newline characters in the string.
     */
    NEWLINE
}

/**
 * Enumeration of special TTL (time-to-live) values.
 *
 * Instead of specifying a TTL in seconds, you can set the TTL
 * to one of these special values when creating or updating a record.
 */
export enum ttl {
    /**
     * Use the default TTL value specified in {@link policy} for a given operation type.
     */
    CLIENT_DEFAULT = -3,
    /**
     * Use the default TTL value for the
     * namespace of the record.
     */
    DONT_UPDATE,
    /**
     * Never expire the record.
     */
    NEVER_EXPIRE,
    /**
     * Update the record without changing the
     * record's TTL value. Requires server 3.10.1 or later.
     */
    NAMESPACE_DEFAULT
}

/* NAMESPACES */

export namespace admin {

    /**
     *
     * Aerospike User Privileges. Inclues a permission code, namespace, and set.
     *
     */
    export class Privilege {
        /**
         * Constructs a new Privilege instance.
         */
        constructor(code: privilegeCode, options?: PrivilegeOptions);
        /**
         * Permission code used to define the type of permission granted for a user's role.
         * 
         */
        code: privilegeCode;
        /**
         * Namespace in which the Privilege will apply.
         */
        namespace: string;
        /**
         * Set in which the Privilege will apply
         */
        set: string;
    }

    /**
     *
     * Aerospike Database Role.  Includes quota, whitelisting, and privilege configurations. 
     *
     */
    export class Role {
        /**
         * Constructs a new User instance.
         */
        constructor(options: RoleOptions);
        /**
         * Name of the Role.
         */
        name: string;
        /**
         * Allowed number of read transactions per second.
         */
        readQuota: number;
        /**
         * Allowed number of write transactions per second.
         */
        writeQuota: number;
        /**
         * list of allowable IP addresses or null. IP addresses can contain wildcards (ie. 10.1.2.0/24).
         */
        whitelist: number[];
        /**
         * List of privileges granted to the role. For more info on Privileges: see {@link Privilege | here.}
         */
        privileges: Privilege[];
    }

    /**
     * Contains user roles and other user related information
     *
     */
    export class User {
        /**
         * Constructs a new User instance.
         */
        constructor(options: UserOptions);
        /**
         * Number of currently open connections.
         */
        connsInUse: number;
        /**
         * Name of the User.
         */
        name: string;
        /**
         * List of read statistics. List may be null. Current statistics by offset are:
         * 
         * 0: read quota in records per second
         * 1: single record read transaction rate (TPS)
         * 2: read scan/query record per second rate (RPS)
         * 3: number of limitless read scans/queries
         * 
         * Future server releases may add additional statistics.
         */
        readInfo: number[];
        /**
         * List of write statistics. List may be null. Current statistics by offset are:
         * 
         * 0: write quota in records per second
         * 1: single record write transaction rate (TPS)
         * 2: write scan/query record per second rate (RPS)
         * 3: number of limitless write scans/queries
         * 
         * Future server releases may add additional statistics.
         */
        writeInfo: number[];
        /**
         * List of assigned roles.
         */
        roles: string[];
    }        
}
/**
 * Bitwise write flags.
 *
 * @see {@link policy.BitwisePolicy}
 */
export namespace bitwise {
    /**
     * Bitwise write flags.
     */
    export enum writeFlags {
        /**
         * Allow create or update. Default.
         */
        DEFAULT,
        /**
         * If the bin already exists, the operation
         * will be denied. If the bin does not exist, a new bin will be created.
         */
        CREATE_ONLY,
        /**
         * If the bin already exists, the bin will be
         * overwritten. If the bin does not exist, the operation will be denied.
         */
        UPDATE_ONLY,
        /**
         * Do not raise error if operation is denied.
         */
        NO_FAIL,
        /**
         *  Allow other valid operations to be committed if
         * this operations is denied due to flag constraints.
         */
        PARTIAL = 8
    }
    /**
     * Bitwise resize flags.
     */
    export enum resizeFlags {
        /**
         * Default.
         */
        DEFAULT,
        /**
         * Add/remove bytes from the beginning instead
         * of the end.
         */
        FROM_FRONT,
        /**
         * Only allow the bitmap size to increase.
         */
        GROW_ONLY,
        /**
         * Only allow the bitmap size to decrease.
         */
        SHRINK_ONLY = 4
    }
    /**
     * Bitwise overflow action.
     *
     * @remarks Action to take when a bitwise {@link
     * bitwise.add | add}/{@link
     * bitwise.subtract | subtract} operation results in
     * overflow/underflow.
     *
     */
    export enum overflow {
        /**
         * Fail operation with error. Default.
         */
        FAIL,
        /**
         * If add/subtract overflows/underflows, set to
         * max/min value. Example: MAXINT + 1 = MAXINT.
         */
        SATURATE = 2,
        /**
         * If add/subtract overflows/underflows, wrap the
         * value. Example: MAXINT + 1 = -1.
         */
        WRAP = 4
    }
    /**
     * bitwise~BitwiseOperation
     *
     * Use the methods in the {@link bitwise | bitwise}
     * module to create bitwise operations for use with the {@link Client#operate}
     * command.
     */
    export class BitwiseOperation extends operations.Operation {
        /**
         * Applies a {@link policy.BitwisePolicy} to the operation.
         *
         * @param policy - Policy to apply to the operation.
         */
        withPolicy(policy: policy.BitwisePolicy): BitwiseOperation;
    }

    /**
     *
     * Bitwise operation variant that can overflow/underflow.
     *
     * @see bitwise.add
     * @see bitwise.subtract
     */
    export class OverflowableBitwiseOp extends BitwiseOperation {
        /**
         * Specifies the action to take when the operation overflows/underflows.
         *
         * @param action - {@link bitwise.overflow | overflow
         * action} to apply to the operation.
         */
        public overflowAction: bitwise.overflow;
        /**
         * Sets the action to take when the operation overflows/underflows.
         *
         * @param action - {@link bitwise.overflow | overflow
         * action} to apply to the operation.
         */
        public onOverflow(action: bitwise.overflow): OverflowableBitwiseOp;
    }

    /**
     * Create byte "resize" operation.
     * 
     * @remarks Server resizes bitmap to byte size according to flags.
     * Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param size - Number of bytes to resize the byte value to.
     * @param flags - Optional {@link bitwise.resizeFlags|resize flags}. Default is {@link bitwise.resizeFlags.DEFAULT}.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function resize(bin: string, size: number, flags?: bitwise.resizeFlags): BitwiseOperation;
    /**
     * Create byte "insert" operation.
     * 
     * @remarks Server inserts value bytes into bitmap. Server does not return
     * a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param byteOffset - Offset in bytes.
     * @param value - Bytes to insert.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function insert(bin: string, byteOffset: number, value: Buffer): BitwiseOperation;
    /**
     * Create byte "remove" operation.
     * @remarks Server removes bytes from bitmap. Server does not return a
     * value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param byteOffset - Offset in bytes.
     * @param byteSize - Number of bytes to remove
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function remove(bin: string, byteOffset: number, byteSize: number): BitwiseOperation;
    /**
     * Create bit "set" operation.
     * 
     * @remarks Server sets value on bitmap. Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits to set.
     * @param value - Value to set.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @throws TypeError unless value is an integer or a Buffer.
     */
    export function set(bin: string, bitOffset: number, bitSize: number, value: number | Buffer): BitwiseOperation;
    /**
     * Create bit "or" operation.
     * 
     * @remarks Server performs bitwise "or" on value and bitmap. Server does
     * not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits.
     * @param value - Value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function or(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    /**
     * Create bit "exclusive or" operation.
     * 
     * @remarks Server performs bitwise "xor" on value and bitmap. Server does
     * not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits.
     * @param value - Value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function xor(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    /**
     * Create bit "and" operation.
     * 
     * @remarks Server performs bitwise "and" on value and bitmap. Server does
     * not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits.
     * @param value - Value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function and(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    /**
     * Create bit "not" operation.
     * 
     * @remarks Server negates bitmap. Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function not(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
    /**
     * Create bit "left shift" operation.
     * @remarks Server shifts left bitmap. Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits to shift.
     * @param shift - Distance to shift bits.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function lshift(bin: string, bitOffset: number, bitSize: number, shift: number): BitwiseOperation;
    /**
     * Create bit "right shift" operation.
     * @remarks Server shifts right bitmap. Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits to shift.
     * @param shift - Distance to shift bits.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function rshift(bin: string, bitOffset: number, bitSize: number, shift: number): BitwiseOperation;
    /**
     * Create bit "add" operation.
     * @remarks Server adds value to bitmap. Server does not return a value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits; must be <= 64.
     * @param value - Value to add.
     * @param sign - Sign indicates if bits should be treated as a signed
     * number.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see {@link bitwise~OverflowableBitwiseOp#onOverflow|OverflowableBitwiseOp#onOverflow}
     * can used to control how the operation executes, when the addition results
     * in an overflow/underflow.
     */
    export function add(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
    /**
     * Create bit "subtract" operation.
     * @remarks Server subtracts value from bitmap. Server does not return a
     * value.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits; must be <= 64.
     * @param value - Value to subtract.
     * @param sign - Sign indicates if bits should be treated as a signed
     * number.
     * @returns {OverflowableBitwiseOp} Operation that can be passed to the {@link
     * Client#operate} command.
     *
     * @see {@link bitwise~OverflowableBitwiseOp#onOverflow|OverflowableBitwiseOp#onOverflow}
     * can used to control how the operation executes, when the addition results
     * in an overflow/underflow.
     */
    export function subtract(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
    /**
     * Create bit "get" operation.
     * @remarks Server returns bits from bitmap.
     *
     * @param {string} bin - The name of the bin. The bin must contain a byte value.
     * @param {number} bitOffset - Offset in bits.
     * @param {number} bitSize - Number of bits to return.
     * @returns {BitwiseOperation} Operation that can be passed to the {@link
     * Client#operate} command.
     */
    export function get(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
    /**
     * Create bit "get integer" operation.
     * @remarks Server returns integer from bitmap.
     *
     * @param {string} bin - The name of the bin. The bin must contain a byte value.
     * @param {number} bitOffset - Offset in bits.
     * @param {number} bitSize - Number of bits to return.
     * @param {boolean} sign - Sign indicates if bits should be treated as a
     * signed.
     * @returns {BitwiseOperation} Operation that can be passed to the {@link
     * Client#operate} command.
     */
    export function getInt(bin: string, bitOffset: number, bitSize: number, sign: boolean): BitwiseOperation;
    /**
     * Create bit "left scan" operation.
     * @remarks Server returns integer bit offset of the first specified value
     * bit in bitmap.
     *
     * @param {string} bin - The name of the bin. The bin must contain a byte value.
     * @param {number} bitOffset - Offset in bits.
     * @param {number} bitSize - Number of bits.
     * @param {boolean} value - value to scan for, "0" (false) or "1" (true).
     * @returns {BitwiseOperation} Operation that can be passed to the {@link
     * Client#operate} command.
     */
    export function lscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
    /**
     * Create bit "right scan" operation.
     * 
     * @remarks Server returns integer bit offset of the last specified value
     * bit in bitmap.
     *
     * @param bin - The name of the bin. The bin must contain a byte value.
     * @param bitOffset - Offset in bits.
     * @param bitSize - Number of bits.
     * @param value - value to scan for, "0" (false) or "1" (true).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function rscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
}
/**
 *
 * Use the methods in the {@link hll|hll}
 * module to create HLL operations for use with the {@link Client#operate}
 * command.
 */
export namespace hll {

/**
 * HLL write flags.
 *
 * @property {number} DEFAULT - Allow create or update. Default.
 * @property {number} CREATE_ONLY - If the bin already exists, the operation
 * will be denied. If the bin does not exist, a new bin will be created.
 * @property {number} UPDATE_ONLY - If the bin already exists, the bin will be
 * overwritten. If the bin does not exist, the operation will be denied.
 * @property {number} NO_FAIL - Do not raise error if operation is denied.
 * @property {number} ALLOW_FOLD - Allow the resulting set to be the minimum of
 * provided index bits. For {@link
 * hll.getIntersectCount | getIntersectCount} and {@link
 * hll.getSimilarity |getSimilarity }, allow the usage of less
 * precise HLL algorithms when min hash bits of all participating sets do not
 * match.
 *
 * @see {@link HLLPolicy}
 */
    export enum writeFlags {
        /**
         * DEFAULT - Allow create or update. Default.
         */
        DEFAULT,
        /**
         * If the bin already exists, the operation
         * will be denied. If the bin does not exist, a new bin will be created.
         */
        CREATE_ONLY,
        /**
         * If the bin already exists, the bin will be
         * overwritten. If the bin does not exist, the operation will be denied.
         */
        UPDATE_ONLY,
        /**
         * Do not raise error if operation is denied.
         */
        NO_FAIL = 4,
        /**
         * Allow the resulting set to be the minimum of
         * provided index bits. For {@link
         * hll.getIntersectCount | getIntersectCount} and {@link
         * hll.getSimilarity|getSimilarity}, allow the usage of less
         * precise HLL algorithms when min hash bits of all participating sets do not
         * match.
         */
        ALLOW_FOLD = 8
    }

    export class HLLOperation extends operations.Operation {
        public withPolicy(policy: policy.HLLPolicy): HLLOperation;
    }

    /**
     * Creates a new HLL or re-initializes an existing HLL. Re-initialization
     * clears existing contents.
     *
     * The <code>init</code> operation supports the following {@link hll.writeFlags | HLL Policy write flags}:
     * * <code>CREATE_ONLY</code>
     * * <code>UPDATE_ONLY</code>
     * * <code>NO_FAIL</code>
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param indexBits - Number of index bits. Must be between 4 and 16 inclusive.
     * @param  minhashBits - Number of minhash bits. If specified, must
     * be between 4 and 51 inclusive.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function init(bin: string, indexBits: number, minhashBits?: number): HLLOperation;
    /**
     * Adds elements to the HLL set. If the bin does not exist, create the HLL with
     * the <code>indexBits</code> and <code>minhashBits</code> parameters.
     *
     * Returns an integer indicating number of entries that caused HLL to update a
     * register.
     *
     * The <code>add</code> operation supports the following {@link hll.writeFlags | HLL Policy write flags}:
     * * <code>CREATE_ONLY</code>
     * * <code>NO_FAIL</code>
     *
     * Not specifying the bit count, implies <code>UPDATE_ONLY</code>.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - Entries to be added to the HLL set.
     * @param indexBits - Number of index bits. If specified, must
     * be between 4 and 16 inclusive.
     * @param minhashBits - Number of minhash bits. If specified, must
     * be between 4 and 51 inclusive.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function add(bin: string, list: AerospikeBinValue[], indexBits?: number, minhashBits?: number): HLLOperation;
    /**
     * Sets a union of the specified HLLs with the HLL bin value (if it exists)
     * back into the HLL bin.
     *
     * The <code>setUnion</code> operation supports the following {@link hll.writeFlags | HLL Policy write flags}:
     * * <code>CREATE_ONLY</code>
     * * <code>UPDATE_ONLY</code>
     * * <code>ALLOW_FOLD</code>
     * * <code>NO_FAIL</code>
     *
     * If <code>ALLOW_FOLD</code> is not set, all provided HLLs and the target bin
     * (if it exists) must have matching index bits and minhash bits. If
     * <code>ALLOW_FOLD</code> is set, server will union down to the minimum index
     * bits of all provided HLLs and the target bin (if it exists). Additionally,
     * if minhash bits differs on any HLL, the resulting union will have 0 minhash
     * bits.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - List of HLL objects (of type Buffer).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function setUnion(bin: string, list: AerospikeBinValue[]): HLLOperation;
    /**
     * Updates the cached count (if stale), and returns the estimated number of
     * elements in the HLL bin.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function refreshCount(bin: string): HLLOperation;
    /**
     * Folds the index bit count to the specified value. This can only be applied
     * when the min hash count on the HLL bin is 0.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param indexBits - Number of index bits. Must be between 4 and 16 inclusive.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function fold(bin: string, indexBits: number): HLLOperation;
    /**
     * Returns the estimated number of elements in the HLL bin.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function getCount(bin: string): HLLOperation;
    /**
     * Returns an HLL object, which is the union of all specified HLL objects in
     * the list with the HLL bin.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - List of HLL objects (of type Buffer).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function getUnion(bin: string, list: AerospikeBinValue[]): HLLOperation;
    /**
     * Returns the estimated number of elements that would be contained by the
     * union of these HLL objects.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - List of HLL objects (of type Buffer).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function getUnionCount(bin: string, list: AerospikeBinValue[]): HLLOperation;
    /**
     * Returns the estimated number of elements that would be contained by the
     * intersection of these HLL objects.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - List of HLL objects (of type Buffer).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function getIntersectCount(bin: string, list: AerospikeBinValue[]);
    /**
     * Returns the estimated similarity of these HLL objects. Return type is double.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @param list - List of HLL objects (of type Buffer).
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     */
    export function getSimilarity(bin: string, list: AerospikeBinValue[]): HLLOperation;
    /**
     * Returns the index and min hash bit counts used to create the HLL bin as a
     * list of integers.
     *
     * @param bin - The name of the bin. The bin must contain an HLL value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function describe(bin: string): HLLOperation;        
}

/**
 * This module defines operations on the List data type. Create
 * list operations used by the {@link Client#operate} command.
 *
 * For more information, please refer to the
 * <a href="http://www.aerospike.com/docs/guide/cdt-list.html">&uArr;Lists</a>
 * and <a href="http://www.aerospike.com/docs/guide/cdt-list.html">&uArr;List Operations</a>
 * documentation in the Aerospike Feature Guide.
 *
 * #### List Index
 *
 * List operations support negative indexing.  If the index is negative, the
 * resolved index starts backwards from end of list.
 *
 * Index/Range examples:
 *
 *  - Index 0: First item in list.
 *  - Index 4: Fifth item in list.
 *  - Index -1: Last item in list.
 *  - Index -3: Third to last item in list.
 *  - Index 1 Count 2: Second and third items in list.
 *  - Index -3 Count 3: Last three items in list.
 *  - Index -5 Count 4: Range between fifth to last item to second to last item inclusive.
 *
 * If an index is out of bounds, a parameter error will be returned. If a range
 * is partially out of bounds, the valid part of the range will be returned.
 *
 * #### CDT Context - Operating on Nested Lists
 *
 * To operate on nested lists, use the {@link
 * lists~ListOperation#withContext ListOperation#withContext}
 * function to set the context for a list operation.
 *
 * @see {@link Client#operate}
 */
export namespace lists {

    /**
     * List order.
     * 
     * @remarks The order determines what kind of indices the Aerospike server
     * maintains for the list.     
     * 
     */
    export enum order {
        /**
         * List is not ordered.  This is the default.
         */
        UNORDERED,
        /**
         * List is ordered.
         */
        ORDERED
    }
    /**
     * List return type.
     * @remarks The return type determines what data of the selected items the
     * get and remove operations return in the result of the {@link Client#operate}
     * command. It is optional to specify the return type for remove operations;
     * default is <code>NONE</code>. For get operations the return type parameter
     * is required.
     */
    export enum returnType {
        /**
         * Do not return a result.
         */
        NONE,
        /**
         * Return key index order.
         */
        INDEX,
        /**
         * Return reverse key order.
         */
        REVERSE_INDEX,
        /**
         * Return value order.
         */
        RANK,
        /**
         * Return reverse value order.
         */
        REVERSE_RANK,
        /**
         * Return count of items selected.
         */
        COUNT,
        /**
         * Return value for single key read and value list for range read.
         */
        VALUE = 7,
        /**
         * Return true if count > 0.
         */
        EXISTS = 13,
        /**
         * Invert meaning of list command and return values. Let's take {@link removeByIndexRange} for example.
         *
         *
         * With INVERTED enabled, the keys outside of the specified index range will be
         * removed and returned.
         */
        INVERTED = 0x10000,
    }
    /**
     * List sort flags.
     */
    export enum sortFlags {
        /**
         * Default.  Preserve duplicate values when sorting list.
         */
        DEFAULT,
        /**
         * Drop duplicate values when sorting list.
         */
        DROP_DUPLICATES = 2
    }

    /**
     * List write bit flags.
     */
    export enum writeFlags {
        /**
         * Default.  Allow duplicate values and insertions at any index.
         */
        DEFAULT,
        /**
         * Only add unique values.
         */
        ADD_UNIQUE,
        /**
         * Enforce list boundaries when inserting.  Do not allow values to be inserted
         * at index outside current list boundaries.
         */
        INSERT_BOUNDED,
        /**
         * Do not raise error if a list item fails due to write flag constraints.
         */
        NO_FAIL,
        /**
         * Allow other valid list items to be committed if a list item fails due to
         * write flag constraints.
         */
        PARTIAL
    }

    /**
     * Use the methods in the {@link lists}
     * namespace to create list operations for use with the {@link Client#operate}
     * command.
     */
    export class ListOperation extends operations.Operation {
        /**
         * Set the return type for certain list operations.
         * 
         * The return type only affects <code>getBy\*</code> and
         * <code>removeBy\*</code> list operations.
         *
         * @param {number} returnType - The {@link lists.returnType|return type} indicating what data of the
         * selected items to return.
         *
         * @example <caption>Fetch the first three list elements and return the values</caption>
         *
         * const Aerospike = require('aerospike')
         * const lists = Aerospike.lists
         * const key = new Aerospike.Key('test', 'demo', 'listsTest')
         * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
         * var config = {
         *   hosts: '192.168.33.10:3000',
         *   // Timeouts disabled, latency dependent on server location. Configure as needed.
         *   policies: {
         *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
         *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
         *   }
         * }
         * Aerospike.connect(config).then(async client => {
         *   await client.put(key, { list: [32, 5, 85, 16, 22] })
         *   const ops = [
         *     lists.getByValueRange('list', 10, 30)
         *       .andReturn(lists.returnType.VALUE)
         *   ]
         *   const result = await client.operate(key, ops)
         *   console.log('Result:', result.bins.list) // => Result: [ 16, 22 ]
         *   client.close()
         * })
         */
        public andReturn(returnType: lists.returnType): ListOperation;
        /**
         * By setting the context, the list operation will be executed on a
         * nested list, instead of the bin value itself.
         *
         * @since v3.12.0
         *
         * @example <caption>Fetch the 1st element of the 2nd nested list</caption>
         *
         * const Aerospike = require('aerospike')
         * const lists = Aerospike.lists
         * const key = new Aerospike.Key('test', 'demo', 'listsTest')
         * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
         * var config = {
         *   hosts: '192.168.33.10:3000',
         *   // Timeouts disabled, latency dependent on server location. Configure as needed.
         *   policies: {
         *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
         *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
         *   }
         * }
         * Aerospike.connect(config).then(async (client) => {
         *   await client.put(key, { list: [[32, 5, 85], [16, 22]] })
         *   const ops = [
         *     lists.get('list', 0)
         *       .withContext((ctx) => ctx.addListIndex(1))
         *   ]
         *   const result = await client.operate(key, ops)
         *   console.log('Result:', result.bins.list) // => Result: 16
         *   client.close()
         * })
         *
         * @example <caption>Fetch the last element of the nested list stored under the 'nested' map key</caption>
         *
         * const Aerospike = require('aerospike')
         * const lists = Aerospike.lists
         * const Context = Aerospike.cdt.Context
         * const key = new Aerospike.Key('test', 'demo', 'listsTest')
         * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
         * var config = {
         *   hosts: '192.168.33.10:3000',
         *   // Timeouts disabled, latency dependent on server location. Configure as needed.
         *   policies: {
         *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
         *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
         *   }
         * }
         * Aerospike.connect(config).then(async (client) => {
         *   await client.put(key, { map: { nested: [32, 5, 85, 16, 22] } })
         *   const context = new Context().addMapKey('nested')
         *   const ops = [
         *     lists.get('map', -1)
         *       .withContext(context)
         *   ]
         *   const result = await client.operate(key, ops)
         *   console.log('Result:', result.bins.map) // => Result: 22
         *   client.close()
         * })
         */
        public withContext(contextOrFunction: cdt.Context | Function): ListOperation;
        /**
         * Inverts the selection of items for certain list operations.
         * 
         * For <code>getBy\*</code> and <code>removeBy\*</code> list
         * operations, calling the <code>invertSelect</code> method on the
         * <code>ListOperation</code> has the effect of inverting the selection of
         * list elements that the operation affects.
         *
         * @throws {AerospikeError} if the operation is not invertible.
         *
         * @example <caption>Remove all tags except for yellow from the record</caption>
         *
         * const Aerospike = require('aerospike')
         * const lists = Aerospike.lists
         * const key = new Aerospike.Key('test', 'demo', 'listsTest')
         * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
         * var config = {
         *   hosts: '192.168.33.10:3000',
         *   // Timeouts disabled, latency dependent on server location. Configure as needed.
         *   policies: {
         *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
         *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
         *   }
         * }
         * Aerospike.connect(config).then(async client => {
         *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
         *   const ops = [
         *     lists.removeByValue('tags', 'yellow')
         *       .invertSelection()
         *   ]
         *   await client.operate(key, ops)
         *   const record = await client.get(key)
         *   console.log('Result:', record.bins.tags) // => Result: [ 'yellow' ]
         *   client.close()
         * })
         */
        public invertSelection(): void;
    }

    /**
     * List operation variant that can be inverted
     */
    export class InvertibleListOp extends ListOperation {
        /**
         * Signifies if Operation will be inverted.
         */
        public inverted: boolean;
        /**
         * Sets {@link InvertibleListOp.inverted} to `true`.
         */
        public invertSelection(): InvertibleListOp;
    }

    /**
     * Creates list create operation.
     *
     * @param bin - bin name.
     * @param order - list order.
     * @param pad - If true, the context is allowed to be beyond list boundaries. In that case, nil
     * list entries will be inserted to satisfy the context position.
     * @param persistIndex - If true, persist list index. A list index improves lookup performance,
     * but requires more storage. A list index can be created for a top-level ordered list only. Nested and
     * unordered list indexes are not supported.
     * @param ctx - optional path to nested list. If not defined, the top-level list is used.
     *
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'listKey')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     * Aerospike.connect(config).then(async client => {
     *   let ops = [
     *     lists.create('list', lists.order.ORDERED, false, true)
     *   ]
     *   let result = await client.operate(key, ops)
     *   console.log(result.bins)                    // => { list: null }
     *   let record = await client.get(key)
     *   console.log(record.bins)                    // => { list: [] }
     *
     *   await client.remove(key)
     *   client.close()
     * })
     */
    export function create(bin: string, order?: lists.order, pad?: boolean, persistIndex?: boolean, ctx?: cdt.Context): ListOperation;
    /**
     * Sets the list order to <code>ORDERED</code> or <code>UNORDERED</code>
     * 
     * @remarks This operation does not return any result.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param order - The new {@link lists.order|list order}.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @since v3.4.0
     */
    export function setOrder(bin: string, order: lists.order): ListOperation;
    /**
     * Sort the list according to flags.
     * @remarks This operation does not return any result.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param flags - The {@link lists.sortFlags|sort flags} to use.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @since v3.4.0
     */
    export function sort(bin: string, flags: lists.sortFlags): ListOperation;
    /**
     * Appends an element to the end of a list.
     * 
     * @remarks This operation returns the element count of the list after the
     * operation.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param value - The value to be appended.
     * @param policy - Optional list policy.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.append('tags', 'orange'),
     *   op.read('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => [ 'blue', 'yellow', 'pink', 'orange' ]
     *       client.close()
     *     })
     *   })
     * })
     */
    export function append(bin: string, value: AerospikeBinValue, policy?: policy.ListPolicy): ListOperation;
    /**
     * Appends a list of elements to the end of a list.
     * @remarks This operation returns the element count of the list after the
     * operation.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param list - Array of elements to be appended.
     * @param policy - Optional list policy.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.appendItems('tags', ['orange', 'green']),
     *   op.read('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => [ 'blue', 'yellow', 'pink', 'orange', 'green' ]
     *       client.close()
     *     })
     *   })
     * })
     */
    export function appendItems(bin: string, list: AerospikeBinValue[], policy?: policy.ListPolicy): ListOperation;
    /**
     * Inserts an element at the specified index.
     * @remarks This operation returns the element count of the list after the
     * operation.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - List index at which the new element should be inserted.
     * @param value - The value to be appended.
     * @param policy - Optional list policy.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     * var ops = [
     *   lists.insert('tags', 2, 'orange'),
     *   op.read('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => [ 'blue', 'yellow', 'orange', 'pink' ]
     *       client.close()
     *     })
     *   })
     * })
     */
    export function insert(bin: string, index: number, value: AerospikeBinValue, policy?: policy.ListPolicy): ListOperation;
    /**
     * Inserts a list of elements at the specified index.
     * 
     * @remarks This operation returns the element count of the list after the
     * operation.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - List index at which the new elements should be inserted.
     * @param list - Array of elements to be inserted.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.insertItems('tags', 2, ['orange', 'green']),
     *   op.read('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => [ 'blue', 'yellow', 'orange', 'green', 'pink' ]
     *       client.close()
     *     })
     *   })
     * })
     */
    export function insertItems(bin: string, index: number, list: AerospikeBinValue[], policy?: policy.ListPolicy): ListOperation;
    /**
     * Removes and returns the list element at the specified index.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - List index of the element to be removed.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const op = Aerospike.operations
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.pop('tags', 1)
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => yellow
     *       client.get(key, (error, record) => {
     *         if (error) throw error
     *         console.log(record.bins.tags) // => { [ 'blue', 'pink' ] }
     *         client.close()
     *       })
     *     })
     *   })
     * })
     */
    export function pop(bin: string, index: number): ListOperation;
/**
 * Removes and returns the list elements in the specified range.
 *
 * @param bin - The name of the bin. The bin must contain a List value.
 * @param index - Index of the first element in the range.
 * @param count - Number of elements in the range; if not specified, the range extends to the end of the list.
 * @returns Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * var ops = [
 *   lists.popRange('tags', 0, 2)
 * ]
 *
 * Aerospike.client(config).connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, result) => {
 *       if (error) throw error
 *       console.log(result.bins.tags) // => [ 'blue', 'yellow' ]
 *       client.get(key, (error, record) => {
 *         if (error) throw error
 *         console.log(record.bins.tags) // => { [ 'pink' ] }
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
    export function popRange(bin: string, index: number, count?: number): ListOperation;
/**
 * Removes the list element at the specified index.
 * 
 * @remarks This operation returns the number of elements removed from the
 * list.
 *
 * @param bin - The name of the bin. The bin must contain a List value.
 * @param index - Index of the element to be removed
 * @returns Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * var ops = [
 *   lists.remove('tags', 1)
 * ]
 *
 * Aerospike.client(config).connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error) => {
 *       if (error) throw error
 *       client.get(key, (error, record) => {
 *         if (error) throw error
 *         console.log(record.bins.tags) // => { [ 'blue', 'pink' ] }
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
    export function remove(bin: string, index: number): ListOperation;
/**
 * Removes the list elements in the specified range.
 * 
 * @remarks This operation returns the number of elements removed from the
 * list.
 *
 * @param bin - The name of the bin. The bin must contain a List value.
 * @param index - Index of the first element in the range.
 * @param count - Number of elements in the range; if not specified, the range extends to the end of the list.
 * @returns Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * var ops = [
 *   lists.removeRange('tags', 0, 2)
 * ]
 *
 * Aerospike.client(config).connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error) => {
 *       if (error) throw error
 *       client.get(key, (error, record) => {
 *         if (error) throw error
 *         console.log(record.bins.tags) // => { [ 'pink' ] }
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
    export function removeRange(bin: string, index: number, count?: number): ListOperation;
/**
 * Removes a single list element identified by its index from the list.
 * @remarks This operation returns the data specified by <code>returnType</code>.
 *
 * @param bin - The name of the bin. The bin must contain a List value.
 * @param index - Zero-based index of the item to remove.
 * @param returnType - The {@link lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 *
 * @example <caption>Remove the 2nd item in the list and return its value</caption>
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'listsTest')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * Aerospike.connect(config).then(async client => {
 *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
 *   const ops = [
 *     lists.removeByIndex('tags', 1)
 *       .andReturn(lists.returnType.VALUE)
 *   ]
 *   const result = await client.operate(key, ops)
 *   console.log('Result:', result.bins.tags) // => Result: yellow
 *   const record = await client.get(key)
 *   console.log('Record:', record.bins.tags) // => Record: [ 'blue', 'pink' ]
 *   client.close()
 * })
 */
    export function removeByIndex(bin: string, index: number, returnType?: lists.returnType): ListOperation;
    /**
     * Removes the list elements identified by the index range from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the first element in the range.
     * @param [count] - Number of elements in the range; if not specified,
     * the range extends to the end of the list.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByIndexRange(bin: string, index: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes one or more items identified by a single value from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param value - The list value to remove.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByValue(bin: string, value: AerospikeBinValue, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes one or more items identified by a list of values from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param values - An array of list values to remove.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByValueList(bin: string, values: AerospikeBinValue[], returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes one or more items identified by a range of values from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param begin - Start values in the range (inclusive). If set to
     * <code>null</code>, the range includes all values less than the
     * <code>end</code> value.
     * @param end - End value in the range (exclusive). If set to
     * <code>null</code>, the range includes all values greater than or equal to the
     * <code>begin</code> value.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByValueRange(bin: string, begin: number | null, end: number | null, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes list items nearest to value and greater, by relative rank.
     * 
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * Examples for ordered list [0, 4, 5, 9, 11, 15]:
     *
     * * (value, rank, count) = [removed items]
     * * (5, 0, 2) = [5, 9]
     * * (5, 1, 1) = [9]
     * * (5, -1, 2) = [4, 5]
     * * (3, 0, 1) = [4]
     * * (3, 3, 7) = [11, 15]
     * * (3, -3, 2) = []
     *
     * Without count:
     *
     * * (value, rank) = [removed items]
     * * (5, 0) = [5, 9, 11, 15]
     * * (5, 1) = [9, 11, 15]
     * * (5, -1) = [4, 5, 9, 11, 15]
     * * (3, 0) = [4, 5, 9, 11, 15]
     * * (3, 3) = [11, 15]
     * * (3, -3) = [0, 4, 5, 9, 11, 15]
     *
     * Requires Aerospike Server v4.3.0 or later.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param value - Find list items nearest to this value and greater.
     * @param rank - Rank of the items to be removed relative to the given value.
     * @param count - Number of items to remove. If undefined, the range
     * includes all items nearest to value and greater, until the end.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'listKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config).then(async client => {
     *   await client.put(key, { list: [0, 4, 5, 9, 11, 15] })
     *   let result = await client.operate(key, [
     *     lists.removeByValueRelRankRange('list', 3, 3)
     *       .andReturn(lists.returnType.VALUE)])
     *   console.log(result.bins.list) // => [ 11, 15 ]
     *   let record = await client.get(key)
     *   console.log(record.bins.list) // => [ 0, 4, 5, 9 ]
     *   client.close()
     * })
     */
    export function removeByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes a single item identified by its rank value from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param rank - Rank of the item to remove.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByRank(bin: string, rank: number, returnType?: lists.returnType): ListOperation;
    /**
     * Removes one or more items in the specified rank range from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param rank - Starting rank.
     * @param count - Number of items to remove; if undefined, the range
     * includes all items starting from <code>rank</code>.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function removeByRankRange(bin: string, rank: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Removes all the elements from the list.
     * @remarks This operation returns no result.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.clear('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error) => {
     *       if (error) throw error
     *       client.get(key, (error, record) => {
     *         if (error) throw error
     *         console.log(record.bins.tags) // => { [ ] }
     *         client.close()
     *       })
     *     })
     *   })
     * })
     */
    export function clear(bin: string): ListOperation;
    /**
     * Sets the list element at the specified index to a new value.
     * @remarks This operation returns no result.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the element to be replaced.
     * @param value - The new value to assigned to the list element.
     * @param policy - Optional list policy.
     * @return Operation that can be passed to the {@link Client#operate} command.
     *
     * @console.log
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency varies with hardware selection. Configure as needed.
     *   policies: {
     *     read : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout: 0}),
     *     write : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout: 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout: 0})
     *
     *    }
     * }
     * var ops = [
     *   lists.set('tags', 1, 'green')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error) => {
     *       if (error) throw error
     *       client.get(key, (error, record) => {
     *         if (error) throw error
     *         console.log(record.bins) // => { tags: [ 'blue', 'green', 'pink' ] }
     *         client.close()
     *       })
     *     })
     *   })
     * })
     */
    export function set(bin: string, index: number, value: AerospikeBinValue, policy?: policy.ListPolicy): ListOperation;
    /**
     * Removes all list elements that are not within the specified range.
     * @remarks This operation returns the number of list elements removed.
     *
     * @param {string} bin - The name of the bin. The bin must contain a List value.
     * @param {number} index - Index of the first element in the range.
     * @param {number} count - Number of elements in the range.
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.trim('tags', 1, 1)
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error) => {
     *       if (error) throw error
     *       client.get(key, (error, record) => {
     *         if (error) throw error
     *         console.log(record.bins.tags) // => { ['yellow'] }
     *         client.close()
     *       })
     *     })
     *   })
     * })
     */
    export function trim(bin: string, index: number, count: number): ListOperation;
    /**
     * Returns the list element at the specified index.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the element to be returned.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.get('tags', 0)
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins) // => { tags: 'blue' }
     *       client.close()
     *
     *     })
     *   })
     * })
     */
    export function get(bin: string, index: number): ListOperation;
    /**
     * Returns the list element in the specified range.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the first element in the range.
     * @param count - Number of elements in the range; if not specified, the range extends to the end of the list.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.getRange('tags', 1)
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => { [ 'yellow', 'pink' ] }
     *       client.close()
     *
     *     })
     *   })
     * })
     */
    export function getRange(bin: string, index: number, count?: number): ListOperation;
    /**
     * Retrieves a single list element from the list using a specified index.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Zero-based index of the item to retrieve.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     *
     * @example <caption>Retrieve the 2nd item in the list and return its value</caption>
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'listsTest')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config).then(async client => {
     *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
     *   const ops = [
     *     lists.getByIndex('tags', 1)
     *       .andReturn(lists.returnType.VALUE)
     *   ]
     *   const result = await client.operate(key, ops)
     *   console.log('Result:', result.bins.tags) // => Result: yellow
     *   client.close()
     * })
     */
    export function getByIndex(bin: string, index: number, returnType?: lists.returnType): ListOperation;
    /**
     * Retrieves the list elements identified by the index range from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the first element in the range.
     * @param count - Number of elements in the range; if not specified,
     * the range extends to the end of the list.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByIndexRange(bin: string, index: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Retrieves one or more items identified by a single value from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param value - The list value to retrieve.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByValue(bin: string, value: AerospikeBinValue, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Retrieves one or more items identified by a list of values from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param values - An array of list values to retrieve.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByValueList(bin: string, values: AerospikeBinValue[], returnType?: lists.returnType): InvertibleListOp;
    /**
     * Retrieves one or more items identified by a range of values from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param begin - Start values in the range (inclusive). If set to
     * <code>null</code>, the range includes all values less than the
     * <code>end</code> value.
     * @param end - End value in the range (exclusive). If set to
     * <code>null</code>, the range includes all values greater than or equal to the
     * <code>begin</code> value.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByValueRange(bin: string, begin: number | null, end: number | null, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Retrieves list items nearest to value and greater, by relative rank.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * Examples for ordered list [0, 4, 5, 9, 11, 15]:
     *
     * * (value, rank, count) = [selected items]
     * * (5, 0, 2) = [5, 9]
     * * (5, 1, 1) = [9]
     * * (5, -1, 2) = [4, 5]
     * * (3, 0, 1) = [4]
     * * (3, 3, 7) = [11, 15]
     * * (3, -3, 2) = []
     *
     * Without count:
     *
     * * (value, rank) = [selected items]
     * * (5, 0) = [5, 9, 11, 15]
     * * (5, 1) = [9, 11, 15]
     * * (5, -1) = [4, 5, 9, 11, 15]
     * * (3, 0) = [4, 5, 9, 11, 15]
     * * (3, 3) = [11, 15]
     * * (3, -3) = [0, 4, 5, 9, 11, 15]
     *
     * Requires Aerospike Server v4.3.0 or later.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param value - Find list items nearest to this value and greater.
     * @param rank - Rank of the items to be retrieved relative to the given value.
     * @param count - Number of items to retrieve. If undefined, the
     * range includes all items nearest to value and greater, until the end.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'listKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config).then(async client => {
     *   await client.put(key, { list: [0, 4, 5, 9, 11, 15] })
     *   await client.operate(key, [ lists.setOrder('list', lists.order.ORDERED) ])
     *   let result = await client.operate(key, [
     *     lists.getByValueRelRankRange('list', 5, -1, 2)
     *       .andReturn(lists.returnType.VALUE)])
     *   console.log(result.bins.list) // => [ 4, 5 ]
     *   client.close()
     * })
     */
    export function getByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Retrieves a single item identified by its rank value from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param rank - Rank of the item to retrieve.
     * @param returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByRank(bin: string, rank: number, returnType?: lists.returnType): ListOperation;
    /**
     * Retrieves one or more items in the specified rank range from the list.
     * @remarks This operation returns the data specified by <code>returnType</code>.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param rank - Starting rank.
     * @param count - Number of items to retrieve. If undefined, the
     * range includes all items starting from <code>rank</code>.
     * @param  returnType - The {@link lists.returnType|return type}
     * indicating what data of the removed item(s) to return (if any).
     * @returns {lists~ListOperation} List operation that can be
     * used with the {@link Client#operate} command.
     *
     * @see Use {@link lists~ListOperation#invertSelection|ListOperation#invertSelection} to
     * invert the selection of items affected by this operation.
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link lists~ListOperation#andReturn|ListOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.4.0
     */
    export function getByRankRange(bin: string, rank: number, count?: number, returnType?: lists.returnType): InvertibleListOp;
    /**
     * Increments the value at the given list index and returns the new value after
     * increment.
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @param index - Index of the list element to increment.
     * @param value - Value to increment the element by.  Default is 1.
     * @param policy - Optional list policy.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @since v2.4
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     *
     * var ops = [
     *   lists.increment('counters', 1, 3)
     * ]
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { counters: [1, 2, 3] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result['bins']['counters']) // => 5
     *       client.get(key, (error, record) => {
     *         if (error) throw error
     *         console.log(record['bins']['counters']) // => { [1, 5, 3] }
     *         client.close()
     *       })
     *     })
     *   })
     * })
     */
    export function increment(bin: string, index: number, value?: number, policy?: policy.ListPolicy): ListOperation;
    /**
     * Returns the element count of the list
     *
     * @param bin - The name of the bin. The bin must contain a List value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const lists = Aerospike.lists
     * const key = new Aerospike.Key('test', 'demo', 'mykey1')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * var ops = [
     *   lists.size('tags')
     * ]
     *
     * Aerospike.client(config).connect((error, client) => {
     *   if (error) throw error
     *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
     *     if (error) throw error
     *     client.operate(key, ops, (error, result) => {
     *       if (error) throw error
     *       console.log(result.bins.tags) // => { 3 }
     *       client.close()
     *     })
     *   })
     * })
     */
    export function size(bin: string): ListOperation;
}

export namespace maps {


    /**
     * Map storage order.
     */
    export enum order {
        /**
         * Map is not ordered.  This is the default.
         */
        UNORDERED,
        /**
         * Order map by key.
         */
        KEY_ORDERED,
        /**
         * Order map by key, then value.
         */
        KEY_VALUE_ORDERED = 3
    }
    /**
     * Map write mode.
     *
     * @remarks Write mode is used to determine the criteria for a successful operation.
     *
     * Map write mode should only be used for server versions prior to v4.3. For
     * server versions v4.3 or later, the use of {@link maps.writeFlags|writeFlags} is recommended.
     *
     *
     * @deprecated since v3.5.0
     */
    export enum writeMode {
        /**
         * If the key already exists, the item will be
         * overwritten. If the key does not exist, a new item will be created. This is
         * the default write mode.
         */
        UPDATE,
        /**
         * If the key already exists, the item will be
         * overwritten. If the key does not exist, the write will fail.
         */
        UPDATE_ONLY,
        /**
         * If the key already exists, the write will
         * fail. If the key does not exist, a new item will be created.
         */
        CREATE_ONLY
    }
    
    /**
     * Map write flags.
     *
     * @remarks Write flags are used to determine the criteria for a successful operation.
     *
     * Map write flags require server version v4.3 or later. For earier server
     * versions, set the {@link maps.writeMode|writeMode} instead.
     *
     *
     * @since v3.5.0
     */
    export enum writeFlags {
        /**
         * Allow create or update. Default.
         */
        DEFAULT,
        /**
         * If the key already exists, the item will be
         * denied.  If the key does not exist, a new item will be created.
         */
        CREATE_ONLY,
        /**
         * If the key already exists, the item will be
         * overwritten. If the key does not exist, the item will be denied.
         */
        UPDATE_ONLY,
        /**
         * Do not raise error, if map item is denied due
         * to write flag constraints.
         */
        NO_FAIL,
        /**
         * Allow other valid map items to be committed, if
         * a map item is denied due to write flag constraints.
         */
        PARTIAL
    }
    
    export enum returnType {
        /**
         * Do not return a result; this is the default.
         */
        NONE,
        /**
         * Return key index order. (0 = first key, 1 =
         * second key, ...)
         */
        INDEX,
        /**
         * Return reverse key order. (0 = last key,
         * -1 = second last key, ...)
         */
        REVERSE_INDEX,
        /**
         * Return value order. (0 = smallest value, 1 =
         * second smallest value, ...)
         */
        RANK,
        /**
         * Return reverse value order. (0 = largest
         * value, -1 = second largest value, ...)
         */
        REVERSE_RANK,
        /**
         * Return count of items selected.
         */
        COUNT,
        /**
         * Return key for single key read and key list for
         * range read.
         */
        KEY,
        /**
         * Return value for single key read and value list
         * for range read.
         */
        VALUE,
        /**
         * Return map items keys and values as an Array.
         * i.e. [key1, value1, key2, value2, ...].
         */
        KEY_VALUE,
        /**
         * Return true if count > 0.
         */
        EXISTS = 13,
        /**
         * Return an unordered map.
         */
        UNORDERED_MAP = 16,
        /**
         * Return an ordered map.
         */
        ORDERED_MAP,
        /**
         * Invert meaning of map command and return values. Let's take {@link removeByKeyRange} for example.
         *
         *
         * With INVERTED enabled, the keys outside of the specified key range will be
         * removed and returned.
         */
        INVERTED = 0x10000,
    }

    export class MapOperation extends operations.Operation {
        andReturn(returnType: maps.returnType): MapOperation;
        public withContext(contextOrFunction: cdt.Context | Function): MapOperation;
    }
    /**
     * Sets map policy attributes.
     *
     * This operation does not return any result.
     *
     * @param bin - The name of the bin. The bin must contain a Map value.
     * @param policy - The map policy.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function setPolicy(bin: string, policy: policy.MapPolicy): MapOperation;
    /**
     * Creates map create operation.
     *
     * @param bin - bin name.
     * @param order - map order.
     * @param persistIndex - if true, persist map index. A map index improves lookup performance, but requires more storage.
     * A map index can be created for a top-level ordered map only. Nested and unordered map indexes are not supported.
     * @param ctx - optional path to nested map. If not defined, the top-level map is used.
     *
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const maps = Aerospike.maps
     * const key = new Aerospike.Key('test', 'demo', 'mapKey')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     *
     * Aerospike.connect(config).then(async client => {
     *   let ops = [
     *     maps.create('map', maps.order.KEY_ORDERED, true)
     *   ]
     *   let result = await client.operate(key, ops)
     *   console.log(result.bins)                    // => { map: null }
     *   let record = await client.get(key)
     *   console.log(record.bins)                    // => { map: {} }
     *
     *   await client.remove(key)
     *   client.close()
     * })
     */
    export function create(bin: string, order?: maps.order, persistIndex?: boolean, ctx? : cdt.Context);
    /**
     * Writes a key/value item to the map.
     *
     * @remarks Depending on the map policy and whether an entry with the same
     * key already exists in the map, a new key will be added to the map or the
     * existing entry with the same key will be updated. If the bin does not yet
     * contain a map value, a new map may be created.
     *
     * This operation returns the new size of the map.
     *
     * @param bin - The name of the bin. If the bin exists, it must
     * contain a Map value; if it does not yet exist, a new Map may be created
     * depending on the map policy's write mode.
     * @param key - Map key to write.
     * @param value - Map value to write.
     * @param policy - The map policy.
     * 
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function put(bin: string, key: string, value: AerospikeBinValue, policy?: policy.MapPolicy): MapOperation;
/**
 * Writes each entry of the given map to the map bin on the server.
 *
 * @remarks For each item, depending on the map policy and whether an entry with the same
 * key already exists in the map, a new entry will be added to the map or the
 * existing entry with the same key will be updated. If the bin does not yet
 * contain a map value, a new map may be created.
 *
 * This operation returns the new size of the map.
 *
 * @param bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param items - One or more key value pairs to write to the map.
 * @param policy - The map policy.
 * @returns Operation that can be passed to the {@link Client#operate} command.
 */
    export function putItems(bin: string, items: AerospikeBins | Map<string, AerospikeBinValue>, policy?: policy.MapPolicy): MapOperation;
/**
 * Increments the map entry identified by the given key by the value
 * <code>incr</code>. Valid only for numeric values.
 *
 * @remarks If a map entry with the given key does not exist, the map
 * policy's write mode determines whether a new entry will be created same as
 * for the {@link maps.put|put} command. This operation may
 * create a new map if the map bin is currently empty.
 *
 * This operation returns the new value of the map entry.
 *
 * @param bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param key - The map key.
 * @param incr - The value to increment the map entry by. Use negative
 * value to decrement map entry.
 * @param policy - The map policy.
 * @returns Operation that can be passed to the {@link Client#operate} command.
 */

    export function increment(bin: string, key: string, incr?: number, policy?: policy.MapPolicy): MapOperation;
/**
 * Decrements the map entry identified by the given key by the value
 * <code>decr</code>. Valid only for numeric values.
 *
 * @remarks If a map entry with the given key does not exist, the map
 * policy's write mode determines whether a new entry will be created same as
 * for the {@link maps.put|put} command. This operation may
 * create a new map if the map bin is currently empty.
 *
 * This operation returns the new value of the map entry.
 *
 * @param bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param key - The map key.
 * @param decr - The value to decrement the map entry by.
 * @param policy - The map policy.
 * @returns Operation that can be passed to the {@link Client#operate} command.
 *
 * @deprecated since v4.0.0 - use increment function with negative value instead.
 */
    export function decrement(bin: string, key: string, decr: number, policy?: policy.MapPolicy): MapOperation;
    /**
     * Removes all items in the map.
     *
     * @remarks This operation does not return any result.
     *
     * @param bin - The name of the bin. If the bin exists, it must
     * contain a Map value; if it does not yet exist, a new Map may be created
     * depending on the map policy's write mode.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function clear(bin: string): MapOperation;
    /**
     * Removes a single item identified by key from the map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param key - The map key.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByKey(bin: string, key: string, returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items identified by key from the map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param keys - An array of map keys.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByKeyList(bin: string, keys: string[], returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items identified by a range of keys from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param {string} bin - The name of the bin, which must contain a Map value.
     * @param {?any} begin - Start key in the range (inclusive). If set to
     * <code>null</code>, the range includes all keys less than the
     * <code>end</code> key.
     * @param {?any} end - End key in the range (exclusive). If set to
     * <code>null</code>, the range includes all keys greater than or equal to the
     * <code>begin</code> key.
     * @param {number} [returnType] - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByKeyRange(bin: string, begin: string | null, end: string | null, returnType?: maps.returnType): MapOperation;
    /**
     * Removes map items nearest to key and greater, by index, from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * Examples for map { a: 17, e: 2, f: 15, j: 10 }:
     *
     * * (value, index, count) = [removed items]
     * * ('f', 0, 1) = { f: 15 }
     * * ('f', 1, 2) = { j: 10 }
     * * ('f', -1, 1) = { e: 2 }
     * * ('b', 2, 1) = { j: 10 }
     * * ('b', -2, 2) = { a: 17 }
     *
     * Without count:
     *
     * * (value, index) = [removed items]
     * * ('f', 0) = { f: 15, j: 10 }
     * * ('f', 1) = { j: 10 }
     * * ('f', -1) = { e: 2, f: 15, j: 10 }
     * * ('b', 2) = { j: 10 }
     * * ('b', -2) = { a: 17, e: 2, f: 15, j: 10 }
     *
     * Requires Aerospike Server v4.3.0 or later.
     *
     * @param {string} bin - The name of the bin, which must contain a Map value.
     * @param {any} key - Find map items nearest to this key and greater.
     * @param {number} index - Index of items to be removed relative to the given key.
     * @param {number} [count] - Number of items to remove. If undefined, the range
     * includes all items nearest to key and greater, until the end.
     * @param {number} [returnType] - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const maps = Aerospike.maps
     * const key = new Aerospike.Key('test', 'demo', 'mapKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config)
     *   .then(async client => {
     *     await client.put(key, { map: { a: 17, e: 2, f: 15, j: 10 } })
     *     let result = await client.operate(key, [
     *       maps.removeByKeyRelIndexRange('map', 'f', -1, 1)
     *         .andReturn(maps.returnType.KEY_VALUE)])
     *     console.info(result.bins.map) // => [ 'e', 2 ]
     *     let record = await client.get(key)
     *     console.info(record.bins.map) // => { a: 17, f: 15, j: 10 }
     *     client.close()
     *   })
     */
    export function removeByKeyRelIndexRange(bin: string, key: string, index: number, count?: number, returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items identified by a single value from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param value - The map value.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByValue(bin: string, value: AerospikeBinValue, returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items identified by a list of values from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param values - An array of map values.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByValueList(bin: string, values: AerospikeBinValue[], returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items identified by a range of values from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param begin - Start values in the range (inclusive). If set to
     * <code>null</code>, the range includes all values less than the
     * <code>end</code> value.
     * @param end - End value in the range (exclusive). If set to
     * <code>null</code>, the range includes all values greater than or equal to the
     * <code>begin</code> value.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByValueRange(bin: string, begin: number | null, end: number | null, returnType?: maps.returnType): MapOperation;
    /**
     * Removes map items nearest to value and greater, by relative rank.
     *
     * This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * Examples for map { e: 2, j: 10, f: 15, a: 17 }:
     *
     * * (value, rank, count) = [removed items]
     * * (11, 1, 1) = { a: 17 }
     * * (11, -1, 1) = { j: 10 }
     *
     * Without count:
     *
     * * (value, rank) = [removed items]
     * * (11, 1) = { a: 17 }
     * * (11, -1) = { j: 10, f: 15, a: 17 }
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param value - Find map items nearest to this value and greater.
     * @param rank - Rank of items to be removed relative to the given value.
     * @param count - Number of items to remove. If undefined, the range
     * includes all items nearest to value and greater, until the end.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const maps = Aerospike.maps
     * const key = new Aerospike.Key('test', 'demo', 'mapKey')
     *
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config)
     *   .then(async client => {
     *     await client.put(key, { map: { e: 2, j: 10, f: 15, a: 17 } })
     *     let result = await client.operate(key, [
     *       maps.removeByValueRelRankRange('map', 11, -1)
     *         .andReturn(maps.returnType.KEY_VALUE)])
     *     console.info(result.bins.map) // => [ 'j', 10, 'f', 15, 'a', 17 ]
     *     let record = await client.get(key)
     *     console.info(record.bins.map) // => { e: 2 }
     *     client.close()
     *   })
     */
    export function removeByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: maps.returnType): MapOperation;
    /**
     * Removes a single item identified by its index value from the map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param {string} bin - The name of the bin, which must contain a Map value.
     * @param {number} index - Index of the entry to remove.
     * @param {number} [returnType] - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByIndex(bin: string, index: number, returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items in the specified index range from the
     * map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param index - Starting index.
     * @param count - Number of items to delete. If undefined, the range
     * includes all items starting from <code>index</code>.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByIndexRange(bin: string, index: number, count?: number | null, returnType?: maps.returnType): MapOperation;
    /**
     * Removes a single item identified by its rank value from the map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param rank - Rank of the item to remove.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByRank(bin: string, rank: number, returnType?: maps.returnType): MapOperation;
    /**
     * Removes one or more items in the specified rank range from the map.
     *
     * @remarks This operation returns the removed data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param rank - Starting rank.
     * @param count - Number of items to delete. If undefined, the range
     * includes all items starting from <code>rank</code>.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the affected item(s) to return (if any).
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function removeByRankRange(bin: string, rank: number, count?: number | null, returnType?: maps.returnType): MapOperation;
    /**
     *  Returns the size of the map.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function size(bin: string): MapOperation;
    /**
     * Retrieves a single item identified by key from the map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param key - The map key.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByKey(bin: string, key: string, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves map items identified by keys list.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param keys - The map keys.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByKeyList(bin: string, keys: string[], returnType?: maps.returnType)
    /**
     * Retrieves one or more items identified by a range of keys from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param begin - Start key in the range (inclusive). If set to
     * <code>null</code>, the range includes all keys less than the
     * <code>end</code> key.
     * @param end - End key in the range (exclusive). If set to
     * <code>null</code>, the range includes all keys greater than or equal to the
     * <code>begin</code> key.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByKeyRange(bin: string, begin: string | null, end: string | null, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves map items nearest to key and greater, by index, from the
     * map.
     *
     * @remarks This operation returns the selected data specified by
     * <code>returnType</code>.
     *
     * Examples for map { a: 17, e: 2, f: 15, j: 10 }:
     *
     * * (value, index, count) = [selected items]
     * * ('f', 0, 1) = { f: 15 }
     * * ('f', 1, 2) = { j: 10 }
     * * ('f', -1, 1) = { e: 2 }
     * * ('b', 2, 1) = { j: 10 }
     * * ('b', -2, 2) = { a: 17 }
     *
     * Without count:
     *
     * * (value, index) = [selected items]
     * * ('f', 0) = { f: 15, j: 10 }
     * * ('f', 1) = { j: 10 }
     * * ('f', -1) = { e: 2, f: 15, j: 10 }
     * * ('b', 2) = { j: 10 }
     * * ('b', -2) = { a: 17, e: 2, f: 15, j: 10 }
     *
     * Requires Aerospike Server v4.3.0 or later.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param key - Find map items nearest to this key and greater.
     * @param index - Index of items to be retrieved relative to the given key.
     * @param count - Number of items to retrieve. If undefined, the
     * range includes all items nearest to key and greater, until the end.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns  Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const maps = Aerospike.maps
     * const key = new Aerospike.Key('test', 'demo', 'mapKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *   }
     * }
     * Aerospike.connect(config)
     *   .then(async client => {
     *     await client.put(key, { map: { a: 17, e: 2, f: 15, j: 10 } })
     *     let result = await client.operate(key, [
     *       maps.getByKeyRelIndexRange('map', 'b', 2, 1)
     *         .andReturn(maps.returnType.KEY_VALUE)])
     *     console.info(result.bins.map) // => [ 'j', 10 ]
     *     client.close()
     *   })
     */
    export function getByKeyRelIndexRange(bin: string, key: string, index: number, count?: number, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves one or more items identified by a single value from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param {string} bin - The name of the bin, which must contain a Map value.
     * @param {any} value - The map value.
     * @param {number} [returnType] - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByValue(bin: string, value: AerospikeBinValue, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves map items identified by values from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param values - The map values.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByValueList(bin: string, values: AerospikeBinValue[], returnType?: maps.returnType)
    /**
     * Retrieves one or more items identified by a range of values from
     * the map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param begin - Start values in the range (inclusive). If set to
     * <code>null</code>, the range includes all values less than the
     * <code>end</code> value.
     * @param end - End value in the range (exclusive). If set to
     * <code>null</code>, the range includes all values greater than or equal to the
     * <code>begin</code> value.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByValueRange(bin: string, begin: number | null, end: number | null, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves map items nearest to value and greater, by relative rank.
     *
     * @remarks This operation returns the selected data specified by
     * <code>returnType</code>.
     *
     * Examples for map { e: 2, j: 10, f: 15, a: 17 }:
     *
     * * (value, rank, count) = [selected items]
     * * (11, 1, 1) = { a: 17 }
     * * (11, -1, 1) = { j: 10 }
     *
     * Without count:
     *
     * * (value, rank) = [selected items]
     * * (11, 1) = { a: 17 }
     * * (11, -1) = { j: 10, f: 15, a: 17 }
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param value - Find map items nearest to this value and greater.
     * @param rank - Rank of items to be retrieved relative to the given value.
     * @param count - Number of items to retrieve. If undefined, the
     * range includes all items nearest to value and greater, until the end.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     *
     * @since v3.5.0
     *
     * @example
     *
     * const Aerospike = require('aerospike')
     * const maps = Aerospike.maps
     * const key = new Aerospike.Key('test', 'demo', 'mapKey')
     * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
     * var config = {
     *   hosts: '192.168.33.10:3000',
     *   // Timeouts disabled, latency dependent on server location. Configure as needed.
     *   policies: {
     *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
     *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
     *
     *   }
     * }
     * Aerospike.connect(config)
     *   .then(async client => {
     *     await client.put(key, { map: { e: 2, j: 10, f: 15, a: 17 } })
     *     let result = await client.operate(key, [
     *       maps.getByValueRelRankRange('map', 11, 1, 1)
     *         .andReturn(maps.returnType.KEY_VALUE)])
     *     console.info(result.bins.map) // => [ 'a', 17 ]
     *     client.close()
     *   })
     */
    export function getByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves a single item identified by it's index value from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param index - Index of the entry to remove.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByIndex(bin: string, index: number, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves one or more items in the specified index range from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param index - Starting index.
     * @param count - Number of items to delete. If undefined, the range
     * includes all items starting from <code>index</code>.
     * @param {number} [returnType] - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByIndexRange(bin: string, index: number, count?: number | null, returnType?: maps.returnType): MapOperation;
    /**
     *  Retrieves a single item identified by it's rank value from the map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param rank - Rank of the entry to remove.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByRank(bin: string, rank: number, returnType?: maps.returnType): MapOperation;
    /**
     * Retrieves one or more items in the specified rank range from the
     * map.
     *
     * @remarks This operation returns the data specified by
     * <code>returnType</code>.
     *
     * @param bin - The name of the bin, which must contain a Map value.
     * @param rank - Starting rank.
     * @param count - Number of items to delete; if not specified, the
     * range includes all items starting from <code>rank</code>.
     * @param returnType - The {@link maps.returnType|return type}
     * indicating what data of the selected item(s) to return.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see Instead of passing <code>returnType</code>, you can also use
     * {@link maps~MapOperation#andReturn|MapOperation#andReturn} to
     * select what data to return.
     */
    export function getByRankRange(bin: string, rank: number, count?: number | null, returnType?: maps.returnType): MapOperation;

}

export namespace exp {
    /**
     *
     * The {@link exp/bit|aerospike/exp/bit} module defines functions
     * for expressions on the Blob datatype.
     */
    export namespace bit {
        /**
         * Create an expression that performs bit resize operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param flags - bit resize flags value.
         * @param byteSize - Number of bytes the resulting blob should occupy.
         * @param policy - bit policy value.
         * 
         * @return blob - bin byteSize bytes.
         */
        export const reSize: (bin: AerospikeExp, flags: bitwise.resizeFlags, byteSize: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit insert operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Blob expression containing the bytes to insert.
         * @param byteOffset - Byte index of where to insert the value.
         * @param policy - bit policy value.
         * 
         * @return blob - bin resulting blob containing the inserted bytes.
         */
        export const insert: (bin: AerospikeExp, value: AerospikeExp, byteOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit remove operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param byteSize - Number of bytes to remove.
         * @param byteOffset - Byte index of where to remove from.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes removed.
         */
        export const remove: (bin: AerospikeExp, byteSize: AerospikeExp, byteOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit set operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Blob expression containing bytes to write.
         * @param bitSize - Number of bytes to overwrite.
         * @param bitOffset - Bit index of where to start writing.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes overwritten.
         */
        export const set: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit or operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Blob expression containing bytes to write.
         * @param bitSize - Number of bytes to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const or: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit xor operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Blob expression containing bytes to write.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const xor: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit and operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Blob expression containing bytes to write.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */       
        export const and: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit not operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const not: (bin: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs an bit lshift operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param shift - Number of bits to shift by.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const lShift: (bin: AerospikeExp, shift: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit rshift operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param shift - Number of bits to shift by.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const rShift: (bin: AerospikeExp, shift: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit add operation.
         * Note: integers are stored big-endian.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param action - bit overflow action value.
         * @param value - Integer expression for value to add.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const add: (bin: AerospikeExp, action: bitwise.overflow, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit add operation.
         * Note: integers are stored big-endian.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param action - bit overflow action value.
         * @param value - Integer expression for value to subtract.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const subtract: (bin: AerospikeExp, action: bitwise.overflow, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit add operation.
         * Note: integers are stored big-endian.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Integer expression for value to set.
         * @param bitSize - Number of bits to be operated on.
         * @param bitOffset - Bit index of where to start operation.
         * @param policy - bit policy value.
         * 
         * @return blob bin resulting blob with the bytes operated on.
         */
        export const setInt: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp, policy?: policy.BitwisePolicy) => AerospikeExp;
        /**
         * Create an expression that performs bit get operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param bitSize - Number of bits to read from the blob bin.
         * @param bitOffset - The bit index of where to start reading from.
         * 
         * @return blob bin bit_size bits rounded up to the nearest byte size.
         */
        export const get: (bin: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs bit count operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param bitSize - Number of bits to read from the blob bin.
         * @param bitOffset - The bit index of where to start reading from.
         * 
         * @return integer value number of bits set to 1 in the bit_size region.
         */
        export const count: (bin: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs bit lscan operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Boolean expression, true searches for 1, false for 0.
         * @param bitSize - Number of bits to read from the blob bin.
         * @param bitOffset - The bit index of where to start reading from.
         * 
         * @return integer value Index of the left most bit starting from __offset set to value.
         */
        export const lScan: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs bit rscan operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param value - Boolean expression, true searches for 1, false for 0.
         * @param bitSize - Number of bits to read from the blob bin.
         * @param bitOffset - The bit index of where to start reading from.
         * @return integer value Index of the right most bit starting from __offset set to value.
         */
        export const rScan: (bin: AerospikeExp, value: AerospikeExp, bitSize: AerospikeExp, bitOffset: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs bit get_int operation.
         *
         * @param bin - A blob bin expression to apply this function to.
         * @param sign - Boolean value, true for signed, false for unsigned.
         * @param bitSize - Number of bits to read from the blob bin.
         * @param bitOffset - The bit index of where to start reading from.
         * @return integer value Index of the left most bit starting from offset set to value.
         */
        export const getInt: (bin: AerospikeExp, sign: boolean, bitSize: AerospikeExp, bitOffset: AerospikeExp) => AerospikeExp;
    }
    /**
     * aerospike/exp/hll
     *
     * The {@link exp/hll|aerospike/exp/hll} module defines functions
     * for expressions on the HyperLogLog datatype.
     */
    export namespace hll {
        /**
         * Create expression that creates a new HLL or resets an existing HLL with minhash bits.
         *
         * @param bin - A bin expression to apply this function to.
         * @param mhBitCount - Number of min hash bits. Must be between 4 and 51 inclusive.
         * @param indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
         * @param policy - hll policy value.
         * 
         * @return Returns the resulting hll bin.
         */
        export const initMH: (bin: AerospikeExp, mhBitCount: number, indexBitCount: number, policy?: policy.HLLPolicy) => AerospikeExp;
        /**
         * Create expression that creates a new HLL or resets an existing HLL.
         *
         * @param bin - A bin expression to apply this function to.
         * @param indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
         * @param policy - hll policy value.
         * @return Returns the resulting hll bin.
         */
        export const init: (bin: AerospikeExp, indexBitCount: number, policy?: policy.HLLPolicy) => AerospikeExp;
        /**
         * Create an expression that performs operations hll addMh.
         *
         * @param bin - A bin expression to apply this function to.
         * @param mhBitCount - Number of min hash bits. Must be between 4 and 51 inclusive.
         * @param indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
         * @param list - A list expression of elements to add to the HLL.
         * @param policy - hll policy value.
         * @return Returns the resulting hll bin after adding elements from list.
         */
        export const addMH: (bin: AerospikeExp, mhBitCount: number, indexBitCount: number, list: AerospikeExp, policy?: policy.HLLPolicy) => AerospikeExp;
        /**
         * Create an expression that performs operations hll add.
         *
         * @param bin - A bin expression to apply this function to.
         * @param indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
         * @param list - A list expression of elements to add to the HLL.
         * @param policy - hll policy value.
         * @return Returns the resulting hll bin after adding elements from list.
         */
        export const add: (bin: AerospikeExp, indexBitCount: number, list: AerospikeExp, policy?: policy.HLLPolicy) => AerospikeExp;
        /**
         * Create an expression that performs operations hll update.
         *
         * @param bin - A bin expression to apply this function to.
         * @param list A list expression of elements to add to the HLL.
         * @param policy - hll policy value.
         * @return Returns the resulting hll bin after adding elements from list.
         */
        export const update: (bin: AerospikeExp, list: AerospikeExp, policy?: policy.HLLPolicy) => AerospikeExp;
        /**
         * Create an expression that performs operations hll get count.
         *
         * @param bin - A bin expression to apply this function to.
         * @return The estimated number of unique elements in an HLL.
         */
        export const getCount: (bin: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs operations hll get union.
         *
         * @param bin - A bin expression to apply this function to.
         * @param list - A list expression of HLLs to union with.
         * @return HLL bin representing the set union.
         */
        export const getUnion: (bin: AerospikeExp, list: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs operations hll get union count.
         *
         * @param bin - A bin expression to apply this function to.
         * @param list - A list expression of HLLs to union with.
         * @return Estimated number of elements in the set union.
         */
        export const getUnionCount: (bin: AerospikeExp, list: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs operations hll get inersect count.
         *
         * @param bin - A bin expression to apply this function to.
         * @param list - A list expression of HLLs to intersect with.
         * @return Estimated number of elements in the set intersection.
         */
        export const getIntersectCount: (bin: AerospikeExp, list: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs operations hll get similarity.
         *
         * @param bin - A bin expression to apply this function to.
         * @param list - A list expression of HLLs to calculate similarity with.
         * @return Estimated similarity between 0.0 and 1.0.
         */
        export const getSimilarity: (bin: AerospikeExp, list: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that performs operations hll describe.
         *
         * @param bin - A bin expression to apply this function to.
         * @return A list containing the index_bit_count and minhash bit count.
         */
        export const describe: (bin: AerospikeExp) => AerospikeExp;
        /**
         * Create an expression that checks if the HLL bin contains all keys in
         *  list..
         *
         * @param bin - A bin expression to apply this function to.
         * @param list - A list expression of keys to check if the HLL may contain them.
         * @return 1 bin contains all of list, 0 otherwise.
         */  
        export const mayContain: (bin: AerospikeExp, list: AerospikeExp) => AerospikeExp;
    }

    namespace listsExp {
        /**
         * Create expression that returns list size.
         *
         * @param bin - List bin or list value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return (integer expression)
         */
        export const size: (bin: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list items identified by value and returns selected
         * data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValue: (bin: AerospikeExp, value: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list items identified by value range and returns selected
         * data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param end - End value expression.
         * @param begin - Begin value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */       
        export const getByValueRange: (bin: AerospikeExp, begin: AerospikeExp, end: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list items identified by values and returns selected
         * data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param value - Values list expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */        
        export const getByValueList: (bin: AerospikeExp, value: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list items nearest to value and greater by relative rank
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param value - Values list expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */        
        export const getByRelRankRangeToEnd: (bin: AerospikeExp, value: AerospikeExp, rank: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that selects list items nearest to value and greater by relative rank with a
         * count limit and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param value - Values list expression.
         * @param rank - Rank integer expression.
         * @param count Count integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */       
        export const getByRelRankRange: (bin: AerospikeExp, value: AerospikeExp, rank: AerospikeExp, count: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that selects list item identified by index
         * and returns selected data specified by returnType.
         *
         *
         * @param bin - List bin or list value expression.
         * @param index - Index integer expression.
         * @param valueType expression value type.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (valueType expression)
         */       
        export const getByIndex: (bin: AerospikeExp, index: AerospikeExp, valueType: type, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
            /**
         * Create expression that selects list items starting at specified index to the end of list
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param index - Index integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */      
        export const getByIndexRangeToEnd: (bin: AerospikeExp, index: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that selects "count" list items starting at specified index
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param count Count integer expression.
         * @param index - Index integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */       
        export const getByIndexRange: (bin: AerospikeExp, index: AerospikeExp, count: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list item identified by rank
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param valueType expression value type.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (valueType expression)
         */        
        export const getByRank: (bin: AerospikeExp, rank: AerospikeExp, valueType: type, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects list items starting at specified rank to the last ranked item
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */        
        export const getByRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
   /**
         * Create expression that selects "count" list items starting at specified rank
         * and returns selected data specified by returnType.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param count Count integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */       
        export const getByRankRange: (bin: AerospikeExp, rank: AerospikeExp, count: AerospikeExp, returnType: lists.returnType, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that appends value to end of list.
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param {Object} policy Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */       
        export const append: (bin: AerospikeExp, value: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that appends list items to end of list.
         *
         * @param bin - List bin or list value expression.
         * @param value List items expression.
         * @param policy - Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const appendItems: (bin: AerospikeExp, value: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
  /**
         * Create expression that inserts value to specified index of list.
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param idx - Index integer expression.
         * @param policy - Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const insert: (bin: AerospikeExp, value: AerospikeExp, idx: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
   /**
         * Create expression that inserts each input list item starting at specified index of list.
         *
         * @param bin - List bin or list value expression.
         * @param value List items expression.
         * @param idx - Index integer expression.
         * @param policy - Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */       
        export const insertItems: (bin: AerospikeExp, value: AerospikeExp, idx: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
  /**
         * Create expression that increments list[index] by value.
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param idx - Index integer expression.
         * @param policy - Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const increment: (bin: AerospikeExp, value: AerospikeExp, idx: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that sets item value at specified index in list.
         *
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param idx - Index integer expression.
         * @param policy - Optional list write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const set: (bin: AerospikeExp, value: AerospikeExp, idx: AerospikeExp, policy?: policy.ListPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes all items in list.
         *
         * @param bin - List bin or list value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const clear: (bin: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that sorts list.
         *
         * @param bin - List bin or list value expression.
         * @param order - Sort order flags.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const sort: (bin: AerospikeExp, order: lists.sortFlags, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes list items identified by value.
         *
         * @param bin - List bin or list value expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const removeByValue: (bin: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
        /**
         * Create expression that removes list items identified by values.
         *
         * @param bin - List bin or list value expression.
         * @param values - Values list expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const removeByValueList: (bin: AerospikeExp, values: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
                  /**
         * Create expression that removes list items identified by value range
         * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
         * If end is infinity, the range is greater than equal to begin.
         *
         * @param bin - List bin or list value expression.
         * @param end End value expression.
         * @param begin Begin value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const removeByValueRange: (bin: AerospikeExp, end: AerospikeExp, begin: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
                  /**
         * Create expression that removes list items nearest to value and greater by relative rank.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */
        export const removeByRelRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that removes list items nearest to value and greater by relative rank with a
         * count limit.
         *
         * @param bin - List bin or list value expression.
         * @param count Count integer expression.
         * @param rank - Rank integer expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */       
        export const removeByRelRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
  
          /**
         * Create expression that removes list item identified by index.
         *
         * @param bin - List bin or list value expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */      
        export const removeByIndex: (bin: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes list items starting at specified index to the end of list.
         *
         * @param bin - List bin or list value expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const removeByIndexRangeToEnd: (bin: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
           /**
         * Create expression that removes "count" list items starting at specified index.
         *
         * @param bin - List bin or list value expression.
         * @param count Count integer expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */       
        export const removeByIndexRange: (bin: AerospikeExp, count: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes list item identified by rank.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const removeByRank: (bin: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes list items starting at specified rank to the last ranked item.
         *
         * @param bin - List bin or list value expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const removeByRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that removes "count" list items starting at specified rank.
         *
         * @param bin - List bin or list value expression.
         * @param count Count integer expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (list expression)
         */        
        export const removeByRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
    }

    /**
     *
     * @remarks The {@link exp/maps|aerospike/exp/maps} module defines functions
     * for expressions on the Map datatype.
     */
    namespace mapsExp {
        /**
         * Create expression that writes key/val item to map bin.
         *
         * @param bin - Map bin or map value expression.
         * @param value - Value expression.
         * @param key - Key expression.
         * @param policy - Optional map write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (map expression)
         */
        export const put: (bin: AerospikeExp, value: AerospikeExp, key: AerospikeExp, policy?: policy.MapPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
        /**
         * Create expression that writes each map item to map bin.
         *
         * @param bin Target map bin or map value expression.
         * @param map Source map expression.
         * @param policy - Optional map write policy.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (map expression)
         */
        export const putItems: (bin: AerospikeExp, map: AerospikeExp, policy?: policy.MapPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
        /**
         * Create expression that increments values by incr for all items identified by key.
         * Valid only for numbers.
         *
         *
         * @param bin - Map bin or map value expression.
         * @param value Increment value number expression.
         * @param key - Key expression.
         * @param policy - Optional map write policy.
         * @param ctx - Optional context path for nested CDT.
         *
         *
         * @return {@link AerospikeExp} (map expression)
         */
        export const increment: (bin: AerospikeExp, value: AerospikeExp, key: AerospikeExp, policy?: policy.MapPolicy | null, ctx?: cdt.Context | null) => AerospikeExp;
        /**
         * Create expression that removes all items in map.
         *
         * @param bin - Map bin or map value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (map expression)
         */
        export const clear: (bin: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
        /**
         * Create expression that removes map item identified by key.
         *
         * @param bin - Map bin or map value expression.
         * @param key - Key expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.

         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByKey: (bin: AerospikeExp, key: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items identified by keys.
         *
         * @param bin - Map bin or map value expression.
         * @param keys List expression of keys to remove.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         *
         */
        export const removeByKeyList: (bin: AerospikeExp, keys: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items identified by key range
         * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
         * If end is infinity, the range is greater than equal to begin.
         *
         * @param bin - Map bin or map value expression.
         * @param end End value expression.
         * @param begin Begin value expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByKeyRange: (bin: AerospikeExp, end: AerospikeExp, begin: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items nearest to key and greater by index.
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param key - Key expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByKeyRelIndexRangeToEnd: (bin: AerospikeExp, idx: AerospikeExp, key: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items nearest to key and greater by index with a count limit.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param idx - Index integer expression.
         * @param key - Key expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByKeyRelIndexRange: (bin: AerospikeExp, count: AerospikeExp, idx: AerospikeExp, key: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items identified by value.
         *
         * @param bin - Map bin or map value expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByValue: (bin: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items identified by values.
         *
         * @param bin - Map bin or map value expression.
         * @param values Values list expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByValueList: (bin: AerospikeExp, values: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;

        /**
         * Create expression that removes map items identified by value range
         * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
         * If end is infinity, the range is greater than equal to begin.
         *
         * @param bin - Map bin or map value expression.
         * @param end End value expression.
         * @param begin Begin value expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByValueRange: (bin: AerospikeExp, end: AerospikeExp, begin: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items nearest to value and greater by relative rank.
         *
         * @param bin - Map bin or map value expression.
         * @param rank - Rank integer expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByValueRelRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items nearest to value and greater by relative rank with a
         * count limit.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param rank - Rank integer expression.
         * @param value - Value expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByValueRelRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map item identified by index.
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByIndex: (bin: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items starting at specified index to the end of map.
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByIndexRangeToEnd: (bin: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes "count" map items starting at specified index.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param idx - Index integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByIndexRange: (bin: AerospikeExp, count: AerospikeExp, idx: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map item identified by rank.
         *
         * @param bin - Map bin or map value expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByRank: (bin: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes map items starting at specified rank to the last ranked item.
         *
         * @param bin - Map bin or map value expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that removes "count" map items starting at specified rank.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param rank - Rank integer expression.
         * @param ctx - Optional context path for nested CDT.
         * @param returnType Optional Return type. Valid values are returnType.NONE or returnType.INVERTED.
         * @return {@link AerospikeExp} (map expression)
         */
        export const removeByRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, ctx?: cdt.Context | null, returnType?: maps.returnType) => AerospikeExp;
        /**
         * Create expression that returns map size.
         *
         * @param bin - Map bin or map value expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (integer expression)
         */
        export const size: (bin: AerospikeExp, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map item identified by key
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param key - Key expression.
         * @param valueType expression value type.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */
        export const getByKey: (bin: AerospikeExp, key: AerospikeExp, valueType: type, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items identified by key range
         * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
         * If end is infinity, the range is greater than equal to begin.
         * Expression returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param end End key expression.
         * @param begin Begin key expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */
        export const getByKeyRange: (bin: AerospikeExp, end: AerospikeExp, begin: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items identified by keys
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param keys Keys list expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */
        export const getByKeyList: (bin: AerospikeExp, keys: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items nearest to key and greater by index
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param key - Key expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByKeyRelIndexRangeToEnd: (bin: AerospikeExp, idx: AerospikeExp, key: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items nearest to key and greater by index with a count limit.
         * Expression returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param idx - Index integer expression.
         * @param key - Key expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByKeyRelIndexRange: (bin: AerospikeExp, count: AerospikeExp, idx: AerospikeExp, key: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items identified by value
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param value - Value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValue: (bin: AerospikeExp, value: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items identified by value range
         * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
         * If end is infinity, the range is greater than equal to begin.
         * Expression returns selected data specified by returnType.
         *
         *
         * @param bin - Map bin or map value expression.
         * @param end End value expression.
         * @param begin Begin value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValueRange: (bin: AerospikeExp, end: AerospikeExp, begin: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;

          /**
         * Create expression that selects map items identified by values
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param returnType - Return type.
         * @param values Values list expression.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValueList: (bin: AerospikeExp, values: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items nearest to value and greater by relative rank.
         * Expression returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param rank Rank integer expression.
         * @param value - Value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValueRelRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items nearest to value and greater by relative rank with a
         * count limit. Expression returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param rank Rank integer expression.
         * @param value - Value expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByValueRelRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, value: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map item identified by index
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param valueType expression value type.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByIndex: (bin: AerospikeExp, idx: AerospikeExp, valueType: type, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items starting at specified index to the end of map
         * and returns selected data specified by returnType.
         *
         *
         * @param bin - Map bin or map value expression.
         * @param idx - Index integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByIndexRangeToEnd: (bin: AerospikeExp, idx: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects "count" map items starting at specified index
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param count Count integer expression.
         * @param idx - Index integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByIndexRange: (bin: AerospikeExp, count: AerospikeExp, idx: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map item identified by rank
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param rank - Rank integer expression.
         * @param valueType expression value type.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp} (expression)
         */
        export const getByRank: (bin: AerospikeExp, rank: AerospikeExp, valueType: type, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects map items starting at specified rank to the last ranked item
         * and returns selected data specified by returnType.
         *
         * @param bin - Map bin or map value expression.
         * @param rank - Rank integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */
        export const getByRankRangeToEnd: (bin: AerospikeExp, rank: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
          /**
         * Create expression that selects "count" map items starting at specified rank
         * and returns selected data specified by returnType.
         *
         *
         * @param bin - Map bin or map value expression.
         * @param count - Count integer expression.
         * @param rank - Rank integer expression.
         * @param returnType - Return type.
         * @param ctx - Optional context path for nested CDT.
         * @return {@link AerospikeExp}
         */
        export const getByRankRange: (bin: AerospikeExp, count: AerospikeExp, rank: AerospikeExp, returnType: maps.returnType, ctx?: cdt.Context | null) => AerospikeExp;
    }

    namespace operationsExp {
        /**
         * For interal use only.
         */
        enum ExpOperations {
            WRITE = 1280,
            READ
        }
        /**
         * class for all expression operations executed with the {@link
         * Client#operate} command.
         *
         * Operations can be created using the methods with the following modules:
         * * {@link exp} - General expression on all types.
         */
        export class ExpOperation extends operations.Operation {
            /**
             * Aerospike Expression to be evaluated by this operation.
             */
            public exp: AerospikeExp;
            /**
             * @param Expression read flags or write flags. <code>flags</code> must be an integer. See {@link exp.expReadFlags} or {@link exp.expWriteFlags} for more information.

             */
            public flags: number;
            constructor(op: ExpOperations, bin: string, exp: AerospikeExp, flags: number, props?: Record<string, AerospikeBinValue>);
        }
        /**
         * Read the value of the bin.
         *
         * @param bin - The name of the bin.
         * @param exp - The expression to evaluate
         * @param flags - Expression read flags. <code>flags</code> must be an integer. See {@link exp.expReadFlags} for more information.
         * @returns {Operation} Operation that can be passed to the {@link Client#operate} command.
         */
        export const read: (bin: string, exp: AerospikeExp, flags?: number) => ExpOperation;
        /**
         * Update the value of the bin.
         *
         * @param bin - The name of the bin.
         * @param exp - The expression to evaluate
         * @param flags - Expression write flags. <code>flags</code> must be an integer. See {@link exp.expWriteFlags} for more information.
         * @returns {Operation} Operation that can be passed to the {@link Client#operate} command.
         */
        export const write: (bin: string, exp: AerospikeExp, flags?: number) => ExpOperation;
    }
    
    export {mapsExp as maps, listsExp as lists, operationsExp as operations}
    
    /**
     * @readonly
     * @remarks Expression read bit flags. Use BITWISE OR to combine flags.
     */
    export enum expReadFlags {
      /**
       * Default.
       */
        DEFAULT,
      /**
       * Ignore failures caused by the expression resolving to unknown or a non-bin type.
       */
        EVAL_NO_FAIL = 16
    }

    /**
     * @readonly
     * @remarks Expression write bit flags. Use BITWISE OR to combine flags.
     */
    export enum expWriteFlags {
        DEFAULT,
        /**
         * If bin does not exist, a new bin will be created.
         */
        CREATE_ONLY,
        /**
         * If bin exists, the bin will be overwritten.
         */
        UPDATE_ONLY,
        /**
         * If expression results in nil value, then delete the bin.
         */
        ALLOW_DELETE = 4,
        /**
         *  Do not raise error if operation is denied.
         */
        POLICY_NO_FAIL = 8,
        /**
         * Ignore failures caused by the expression resolving to unknown or a non-bin type.
         */
        EVAL_NO_FAIL = 16
    }

    /**
     * The {@link exp|exp} module provides functions to
     * create expressions for use in key operations via the {@link
     * Client#operate} command.
     * 
     * For more information on Aerospike datatypes, See {@link https://aerospike.com/docs/server/guide/data-types/overview | here.}
     * 
     */
    export enum type {
        /**
         * Null value data type.
         */
        NIL,
        // BOOL - no boolean type in src/main/enums/exp_enum.cc#L127
        /**
         * Integer data type.
         */
        INT = 2,
        /**
         * String data type.
         */
        STR,
        /**
         * List Collection data type. For more info on Collection datatypes, see {@link https://aerospike.com/docs/server/guide/data-types/cdt | here.}
         */
        LIST,
        /**
         * Map Collection data type. For more info on Collection datatypes, see {@link https://aerospike.com/docs/server/guide/data-types/cdt | here.}
         */
        MAP,
        /**
         * Bytes data type. For more info on Bytes/Blob datatypes, see {@link https://aerospike.com/docs/server/guide/data-types/blob | here} for more info on Collection datatypes.
         */
        BLOB,
        /**
         * Float data type. Corresponds to Aerospike Double data type. For more info on Double/Float, see {@link https://aerospike.com/docs/server/guide/data-types/scalar-data-types}
         */
        FLOAT,
        /**
         * {@link GeoJSON} data type. For more info on the GeoJSON aerospike type, see {@link https://aerospike.com/docs/server/guide/data-types/geospatial | here.}
         */
        GEOJSON,
        /**
         * {@link hll} data type.  For more info on the HyperLogLog aerospike type, see {@link https://aerospike.com/docs/server/guide/data-types/hll | here.}
         */
        HLL,
        /**
         * Automatically matches to the data type of the targeted data.
         */
        AUTO,
        /**
         * Error data type.
         */
        ERROR
    }

    // Types for expresssions
    type _valueExp<T> = (value: T) => AerospikeExp;
    type _keyTypeExp = () => AerospikeExp;
    type _binTypeExp = (binName: string) => AerospikeExp;
    type _metaExp = () => AerospikeExp;
    type _nilExp = () => AerospikeExp;
    type _infExp = () => AerospikeExp;
    type _wildcardExp = () => AerospikeExp
    type _cmpExp = (left: AerospikeExp, right: AerospikeExp) => AerospikeExp;
    type _VAExp = (...expr: AerospikeExp[]) => AerospikeExp;
    type _shiftExp = (expr: AerospikeExp, shift: AerospikeExp) => AerospikeExp;
    type _logExp = (num: AerospikeExp, base: AerospikeExp) => AerospikeExp;
    type _powExp = (base: AerospikeExp, exponent: AerospikeExp) => AerospikeExp;


    // Scalar expressions
    /**
     * Create boolean value.
     *
     *
     * @param value - value boolean value.
     */
    export const bool: _valueExp<boolean>;
    /**
     * Create 64 bit signed integer value.
     *
     *
     * @param value - value integer value.
     * @return {@link AerospikeExp}
     */
    export const int: _valueExp<number>;
    /**
     * Create 64 bit unsigned integer value.
     *
     *
     * @param value - value unsigned integer value.
     * @return {@link AerospikeExp}
     */
    export const uint: _valueExp<number>;
    /**
     * Create 64 bit floating point value.
     *
     *
     * @param value - floating point value.
     * @return {@link AerospikeExp}
    */
    export const float: _valueExp<number>;
    /**
     * Create string value.
     *
     *
     * @param value - string value.
     * @return {@link AerospikeExp}
     */
    export const str: _valueExp<string>;
    /**
     * Create byte array value.
     * *
     *
     * @param value - byte array value.
     * @param size - number of bytes.
     * @return {@link AerospikeExp}
     */
    export const bytes: (value: string[] | Buffer, size?: number) => AerospikeExp;
    /**
     * Create geojson value.
     *
     *
     * @param value - geojson value.
     * @return {@link AerospikeExp}
     */
    export const geo: _valueExp<GeoJSON>;
    /**
     * Create list value.
     *
     *
     * @param value - list value
     * @return {@link AerospikeExp}
     */
    export const list: _valueExp<AerospikeBinValue[]>;
    /**
     * Create map value.
     *
     *
     * @param value - map value
     * @return {@link AerospikeExp}
     */
    export const map: _valueExp<Record<string, AerospikeBinValue>>;
    /**
     * Create 'nil' value.
     *
     *
     * @return {@link AerospikeExp}
     */
    export const nil: _nilExp;
    /**
     * Create 'inf' value.
     *
     * @return {@link AerospikeExp}
     */
    export const inf: _infExp;
    /**
     * Create 'wildcard' value.
     *
     * @return {@link AerospikeExp}
     */
    export const wildcard: _wildcardExp;
    /**
     * Create expression that returns the key as an integer. Returns 'unknown' if
     * the key is not an integer.
     *
     * @return {@link AerospikeExp}
     */
    export const keyInt: _keyTypeExp;
    /**
     * Create expression that returns the key as an string. Returns 'unknown' if
     * the key is not a string.
     *
     *
     * @return {@link AerospikeExp}
     */
    export const keyStr: _keyTypeExp;
    /**
     * Create expression that returns the key as an blob. Returns 'unknown' if
     * the key is not an blob.
     *
     *
     * @return {@link AerospikeExp}
     */
    export const keyBlob: _keyTypeExp;
    /**
     * Create expression that returns if the primary key is stored in the record meta
     * data as a boolean expression. This would occur when "policy write key" is
     * SEND on record write.
     *
     *
     * @return {@link AerospikeExp}
     */
    export const keyExist: _keyTypeExp;
    /**
     * Create expression that returns a bin as a boolean value. Returns 'unknown'
     * if the bin is not a boolean.
     *
     *
     * @param binName - Bin name.
     * @return boolean bin
     */
    export const binBool: _binTypeExp;
    /**
     * Create expression that returns a bin as a signed integer. Returns 'unknown'
     * if the bin is not an integer.
     *
     *
     * @param binName - Bin name.
     * @return integer bin
     */
    export const binInt: _binTypeExp;
    /**
     * Create expression that returns a bin as a float. Returns 'unknown' if the bin
     * is not an float.
     *
     *
     * @param binName - Bin name.
     * @return float bin
     */
    export const binFloat: _binTypeExp;
    /**
     * Create expression that returns a bin as a string. Returns 'unknown' if the
     * bin is not an string.
     *
     *
     * @param binName - Bin name.
     * @return string bin
     */
    export const binStr: _binTypeExp;
    /**
     * Create expression that returns a bin as a blob. Returns 'unknown' if the bin
     * is not an blob.
     *
     *
     * @param binName - Bin name.
     * @return blob bin
     */
    export const binBlob: _binTypeExp;
    /**
     * Create expression that returns a bin as a geojson. Returns 'unknown' if the
     * bin is not geojson.
     *
     *
     * @param {string} binName Bin name.
     * @return geojson bin
     */
    export const binGeo: _binTypeExp;
    /**
     * Create expression that returns a bin as a list. Returns 'unknown' if the bin
     * is not an list.
     *
     *
     * @param binName - Bin name.
     * @return list bin
     */
    export const binList: _binTypeExp;
    /**
     * Create expression that returns a bin as a map. Returns 'unknown' if the bin
     * is not an map.
     *
     *
     * @param binName - Bin name.
     * @return map bin
     */
    export const binMap: _binTypeExp;
    /**
     * Create expression that returns a bin as a HyperLogLog (hll). Returns
     * 'unknown' if the bin is not a HyperLogLog (hll).
     *
     *
     * @param binName - Bin name.
     * @return hll bin
     */
    export const binHll: _binTypeExp;
    /**
     * Create expression that returns the type of a bin as a integer.
     * @param binName - Bin name.
     * @returns returns the bin_type as an as_bytes_type.

     */
    export const binType: _binTypeExp;
    /**
     * Create expression that returns if bin of specified name exists.
     *
     * @param binName - Bin name.
     * @returns `True` if the bin exists, false otherwise.
     */
    export const binExists: _binTypeExp;
    /**
     * Create expression that returns record set name string. This expression usually
     * evaluates quickly because record meta data is cached in memory.
     *
     *
     * @returns Name of the set this record belongs to.
     */
    export const setName: _metaExp;
    /**
     * Create expression that returns record size on disk. If server storage-engine is
     * memory, then zero is returned. This expression usually evaluates quickly
     * because record meta data is cached in memory.
     * Requires server version between 5.3.0 inclusive and 7.0 exclusive.
     * Use {@link recordSize} for server version 7.0+.
     *
     *
     * @return {@link AerospikeExp} integer value Uncompressed storage size of the record.
     */
    export const deviceSize: _metaExp;
    /**
     * Create expression that returns record last update time expressed as 64 bit
     * integer nanoseconds since 1970-01-01 epoch.
     *
     *
     * @return {@link AerospikeExp} integer value When the record was last updated.
     */
    export const lastUpdate: _metaExp;
    /**
     * Create expression that returns milliseconds since the record was last updated.
     * This expression usually evaluates quickly because record meta data is cached
     * in memory.
     *
     *
     * @return {@link AerospikeExp} integer value Number of milliseconds since last updated.
     */
    export const sinceUpdate: _metaExp;
    /**
     * Create expression that returns record expiration time expressed as 64 bit
     * integer nanoseconds since 1970-01-01 epoch.
     *
     *
     * @return integer value Expiration time in nanoseconds since 1970-01-01.
     */
    export const voidTime: _metaExp;
    /**
     * Create expression that returns record expiration time (time to live) in integer
     * seconds.
     *
     *
     * @return {@link AerospikeExp} integer value Number of seconds till the record will expire,
     *                         returns -1 if the record never expires.
     */
    export const ttl: _metaExp;
    /**
     * Create expression that returns if record has been deleted and is still in
     * tombstone state. This expression usually evaluates quickly because record
     * meta data is cached in memory.
     *
     *
     * @return {@link AerospikeExp} - value True if the record is a tombstone, false otherwise.
     */
    export const isTombstone: _metaExp;
    /**
     * Create expression that returns record size in memory when either the
     * storage-engine is memory or data-in-memory is true, otherwise returns 0.
     * This expression usually evaluates quickly because record meta data is cached
     * in memory.
     * Requires server version between 5.3.0 inclusive and 7.0 exclusive.
     * Use {@link recordSize} for server version 7.0+.
     *
     *
     * @return {@link AerospikeExp} integer value memory size of the record.
     */
    export const memorySize: _metaExp;
    /**
     * Create expression that returns the record size. This expression usually evaluates
     * quickly because record meta data is cached in memory.
     * Requires server version 7.0+. This expression replaces {@link deviceSize} and
     * {@link memorySize} since those older expressions are equivalent on server version 7.0+.
     *
     *
     * @return {@link AerospikeExp} integer value size of the record in Megabytes.
     */
    export const recordSize: _metaExp;
    /**
     * Create expression that returns record digest modulo as integer.
     *
     *
     * @param expr - Divisor used to divide the digest to get a remainder.
     * @return integer value Value in range 0 and mod (exclusive).
     */
    export const digestModulo: _VAExp;

    export const eq: _cmpExp;
    /**
     * Create equals (==) expression.
     *
     *
     * @param left - left expression in comparison.
     * @param right - right expression in comparison.
     * @return boolean value
     */
    export const ne: _cmpExp;
    /**
     * Create not equal (!=) expression.
     *
     *
     * @param left - left expression in comparison.
     * @param right - right expression in comparison.
     * @return boolean value
     */
    export const gt: _cmpExp;
/**
 * Create a greater than or equals (>=) expression.
 *
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {@link AerospikeExp} - boolean value
 */
    export const ge: _cmpExp;
/**
 * Create a less than (<) expression.
 *
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {@link AerospikeExp} - boolean value
 */
    export const lt: _cmpExp;
/**
 * Create a less than or equals (<=) expression.
 *
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {@link AerospikeExp} - boolean value
 */

    export const le: _cmpExp;
/**
 * Create expression that performs a regex match on a string bin or value
 * expression.
 *
 *
 * @param {number} options POSIX regex flags defined in regex.h.
 * @param {string} regex POSIX regex string.
 * @param cmpStr String expression to compare against.
 * @return {@link AerospikeExp} - boolean value
 */
    export const cmpRegex: (options: regex, regex: string, cmpStr: AerospikeExp) => AerospikeExp;
/**
 * Create a point within region or region contains point expression.
 *
 *
 * @param left - left expression in comparison.
 * @param right - right expression in comparison.
 * @return boolean value
 */
    export const cmpGeo: _cmpExp;
/**
 * Create "not" (!) operator expression.
 *
 *
 * @param expr - Boolean expression to negate.
 * @return boolean value
 */
    export const not: (expr: AerospikeExp) => AerospikeExp;

/**
 * Create "and" (&&) operator that applies to a variable number of expressions.
 *
 *
 * @param expr - Variable number of boolean expressions. Supports the spread operator.
 * @return boolean value
 */
    export const and: _VAExp;
/**
 * Create "or" (||) operator that applies to a variable number of expressions.
 *
 *
 * @param expr - Variable number of boolean expressions. Supports the spread operator.
 * @return boolean value
 */
    export const or: _VAExp;
/**
 * Create expression that returns true if only one of the expressions are true.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of boolean expressions. Supports the spread operator.
 * @return {@link AerospikeExp} - boolean value
 */
    export const exclusive: _VAExp;
/**
 * Create "add" (+) operator that applies to a variable number of expressions.
 * Return the sum of all arguments.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer or float expressions.  Supports the spread operator.
 * @return {@link AerospikeExp} integer or float value
 */
    export const add: _VAExp;
/**
 * Create "subtract" (-) operator that applies to a variable number of expressions.
 * If only one argument is provided, return the negation of that argument.
 * Otherwise, return the sum of the 2nd to Nth argument subtracted from the 1st
 * argument. All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer or float expressions.  Supports the spread operator.
 * @return {@link AerospikeExp} integer or float value
 */
    export const sub: _VAExp;
/**
 * Create "multiply" (*) operator that applies to a variable number of expressions.
 * Return the product of all arguments. If only one argument is supplied, return
 * that argument. All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer or float expressions.  Supports the spread operator.
 * @return {@link AerospikeExp} integer or float value
 */
    export const mul: _VAExp;
/**
 * Create "divide" (/) operator that applies to a variable number of expressions.
 * If there is only one argument, returns the reciprocal for that argument.
 * Otherwise, return the first argument divided by the product of the rest.
 * All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer or float expressions.  Supports the spread operator.
 * @return {@link AerospikeExp} integer or float value
 */
    export const div: _VAExp;
/**
 * Create "pow" operator that raises a "base" to the "exponent" power.
 * All arguments must resolve to floats.
 * Requires server version 5.6.0+.
 *
 *
 * @param base - Base value.
 * @param exponent - Exponent value.
 * @return {@link AerospikeExp} float value
 */
    export const pow: _powExp;
/**
 * Create "log" operator for logarithm of "num" with base "base".
 * All arguments must resolve to floats.
 * Requires server version 5.6.0+.
 *
 *
 * @param num - Number.
 * @param base - Base value.
 * @return float value
 */
    export const log: _logExp;
/**
 * Create "modulo" (%) operator that determines the remainder of "numerator"
 * divided by "denominator". All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 * @param expr - Number to apply modulo to.
 * @return integer value
 */
    export const mod: _VAExp;
/**
 * Create operator that returns absolute value of a number.
 * All arguments must resolve to integer or float.
 * Requires server version 5.6.0+.
 *
 * @param expr - Number to calcuate absolute value from.
 * @return number value
 */
    export const abs: _VAExp;
/**
 * Create expression that rounds a floating point number down to the closest integer value.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Floating point value to round down.
 * @return float-value
 */
    export const floor: _VAExp;
/**
 * Create expression that rounds a floating point number up to the closest integer value.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Floating point value to round up.
 * @return integer-value
 */
    export const ceil: _VAExp;
/**
 * Create expression that converts a float to an integer.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer to convert to a float
 * @return  float value
 */
    export const toInt: _VAExp;
/**
 * Create expression that converts an integer to a float.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer to convert to a float
 * @return float value
 */
    export const toFloat: _VAExp;
/**
 * Create integer "and" (&) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer expressions. Compatible with spread operator.
 * @return integer value
 */
    export const intAnd: _VAExp;
/**
 * Create integer "or" (|) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer expressions. Compatible with spread operator.
 * @return integer value
 */
    export const intOr: _VAExp;
/**
 * Create integer "xor" (^) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer expressions. Compatible with spread operator.
 * @return integer value
 */
    export const intXor: _VAExp;
/**
 * Create integer "not" (~) operator.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer expression.
 * @return integer value
 */
    export const intNot: _VAExp;
/**
 * Create integer "left shift" (<<) operator.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer expression.
 * @param shift - Number of bits to shift by.
 * @return integer value
 */
    export const intLshift: _shiftExp;
/**
 * Create integer "logical right shift" (>>>) operator.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer expression.
 * @param shift - Number of bits to shift by.
 * @return integer value
 */
    export const intRshift: _shiftExp;
/**
 * Create integer "arithmetic right shift" (>>) operator.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Integer expression.
 * @param  shift -  Number of bits to shift by.
 * @return integer value
 */
    export const intArshift: _shiftExp;
/**
 * Create expression that returns count of integer bits that are set to 1.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - {@link AerospikeExp} integer
 * @return integer value
 */
    export const intCount: _VAExp;
/**
 * Create expression that scans integer bits from left (most significant bit) to
 * right (least significant bit), looking for a search bit value. When the
 * search value is found, the index of that bit (where the most significant bit is
 * index 0) is returned. If "search" is true, the scan will search for the bit
 * value 1. If "search" is false it will search for bit value 0.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - {@link AerospikeExp} integer
 * @return integer value
 */
    export const intLscan: _VAExp;
/**
 * Create expression that scans integer bits from right (least significant bit) to
 * left (most significant bit), looking for a search bit value. When the
 * search value is found, the index of that bit (where the most significant bit is
 * index 0) is returned. If "search" is true, the scan will search for the bit
 * value 1. If "search" is false it will search for bit value 0.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - {@link AerospikeExp} integer
 * @return integer value
 */
    export const intRscan: _VAExp;
/**
 * Create expression that returns the minimum value in a variable number of expressions.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param  expr - Variable number of integer or float expressions. Compatible with spread operator.
 * @return integer or float value
 */
    export const min: _VAExp;
/**
 * Create expression that returns the maximum value in a variable number of expressions.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of integer or float expressions.
 * @return integer or float value
 */
    export const max: _VAExp;
/**
 * Conditionally select an expression from a variable number of expression pairs
 * followed by default expression action. Requires server version 5.6.0+.
 *
 *
 * @param expr - spread of expressions.
 * @return  first action expression where bool expression is true or action-default.
 */
    export const cond: _VAExp;
/**
 * Define variables and expressions in scope.
 * Requires server version 5.6.0+.
 *
 *
 * @param expr - Variable number of expression def followed by a scoped
 *  expression. Supports the spread operator
 * @return result of scoped expression.
 */
    const letValue: _VAExp; // Your implementation
    export { letValue as let }; // Export as `let`
/**
 * Assign variable to an expression that can be accessed later.
 * Requires server version 5.6.0+.
 *
 *
 * @param varName - Variable name.
 * @param  expr - The variable is set to the result of expr.
 * @return A variable name expression pair.
 */
    export const def: (varName: string, expr: AerospikeExp) => AerospikeExp;
/**
 * Retrieve expression value from a variable.
 * Requires server version 5.6.0+.
 *
 *
 * @param varName - Variable name.
 * @return value stored in variable.
 */
    export const _var: (varName: string) => AerospikeExp;
}
/**
 * @remarks This module provides functions to easily define operations to
 * be performed on a record via the {@link Client#operate} command.
 *
 * @see {@link Client#operate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record.bins) // => { b: 52 }
 *       client.close()
 *     })
 *   })
 * })
 */
export namespace operations {
    /**
     * operations~Operation
     * @protected
     * Base class for all operations executed with the {@link
     * Client#operate} command.
     *
     * Operations can be created using the methods in one of the following modules:
     * * {@link operations} - General operations on all types.
     * * {@link lists} - Operations on CDT List values.
     * * {@link maps} - Operations on CDT Map values.
     * * {@link bitwise} - Operations on Bytes values.
     *
     */
    export class Operation {
        /**
         * Code which determines the operations to be performed on the bins of a record.
         */
        public op: ScalarOperations;
        /**
         * The bin the operation will be performed on.
         */
        public bin: string;
        /**
         * Value used in the operation.
         */
        public value?: AerospikeBinValue;
        /**
         * The time-to-live (expiration) of the record in seconds.
         *
         * There are also special values that can be set in the record ttl:
         * <ul>
         * <li> {@link ttl.NAMESPACE_DEFAULT}: Use the server default ttl from the namespace.</li>
         * <li>{@link ttl.NEVER_EXPIRE}: Do not expire the record.</li>
         * <li> {@link ttl.DONT_UPDATE}: Keep the existing record ttl when the record is updated.</li>
         * <li> {@link ttl.CLIENT_DEFAULT}: Use the default client ttl in as_policy_operate.</li>
         * </ul>
         */
        public ttl?: number;
     }
    /**
     * Read the value of the bin.
     *
     * @param bin - The name of the bin.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function read(bin: string): Operation;
    /**
     * Update the value of the bin.
     *
     * @param bin - The name of the bin.
     * @param value - The value to set the bin to.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function write(bin: string, value: AerospikeBinValue): Operation;
    /**
     * Increment the value of the bin by the given value.
     *
     * @remarks The bin must contain either an Integer or a Double, and the
     * value must be of the same type.
     *
     * @param bin - The name of the bin.
     * @param value - The <code>number</code>|{@link Double} value to increment the bin by.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function add(bin: string, value: number | Double): Operation;
    /**
     * Alias for the {@link operations.add} operation.
     */
    export function incr(bin: string, value: number | Double): Operation;
    /**
     * Append the value to the bin.
     *
     * @remarks The bin must contain either String or a Byte Array, and the
     * value must be of the same type.
     *
     * @param bin - The name of the bin.
     * @param value - The value to append to the bin.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function append(bin: string, value: string | Buffer): Operation;
    /**
     * Prepend the value to the bin.
     *
     * @remarks The bin must contain either String or a Byte Array, and the
     * value must be of the same type.
     *
     * @param bin - The name of the bin.
     * @param value - The value to prepend to the bin.
     * @returns Operation that can be passed to the {@link Client#operate} command.
     */
    export function prepend(bin: string, value: string | Buffer): Operation;
    /**
     * Update the TTL (time-to-live) for a record.
     *
     * @remarks If the optional `ttl` parameter is not specified, the server
     * will reset the record's TTL value to the default TTL value for the
     * namespace.
     *
     * @param ttl - The new relative TTL to set for the record, when it is touched. Default is {@link ttl.NAMESPACE_DEFAULT}
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @see {@link ttl} for "special" TTL values.
     */
    export function touch(ttl: number): Operation;
    /**
     * Deletes the record.
     *
     * @remarks Returns true on success. Otherwise an error occurred.
     *
     * @returns Operation that can be passed to the {@link Client#operate} command.
     *
     * @since v3.14.0
     */
    function deleteOp(): Operation;
    export {deleteOp as delete}

}


/**
 * This namespace provides functions to create secondary index (SI) filter
 * predicates for use in query operations via the {@link Client#query} command.
 *
 * @see {@link Query}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Context = Aerospike.cdt.Context
 *
 * Aerospike.connect().then(async (client) => {
 *   // find any records that have a recent location within 1000m radius of the specified coordinates
 *   let geoFilter = Aerospike.filter.geoWithinRadius('recent', 103.8, 1.305, 1000, Aerospike.indexType.LIST, new Context().addListIndex(0))
 *   let query = client.query('test', 'demo')
 *   query.where(geoFilter)
 *
 *   let results = await query.results()
 *   for (let record in results) {
 *     console.log(record.bins.recent)
 *   }
 *   client.close()
 * })
 */
export namespace filter {
    /**
     * For internal use only.
     */
    enum Predicates {
        EQUAL,
        RANGE
    }

    /**
     * Secondary Index filter predicate to limit the scope of a {@link Query}.
     *
     * Filter predicates must be instantiated using the methods in the {@link filter} namespace.
     */
    export class SindexFilterPredicate {
        protected constructor (
            predicate: Predicates,
            bin: string,
            dataType: indexDataType,
            indexType: indexType,
            props?: Record<string, AerospikeBinValue>
        );
        public predicate: Predicates;
        public bin: string;
        public datatype: indexDataType;
        public type: indexType;
    }

    /**
     * Filter predicated returned by {@link contains} and {@link equal} for use in Secondary Index queries.
     */
    class EqualPredicate extends SindexFilterPredicate {
        constructor(bin: string, value: string | number, dataType: indexDataType, indexType: indexType);
        public val: string | number;
    }

    /**
     * Filter predicate returned by {@link geoWithinGeoJSONRegion}, {@link geoContainsGeoJSONPoint}, {@link geoWithinRadius}, and {@link geoContainsPoint} for use in Secondary Index queries.
     */
    class RangePredicate extends SindexFilterPredicate {
        constructor(bin: string, min: number, max: number, dataType: indexDataType, indexType: indexType);
        public min: number;
        public max: number;
    }
    /**
     * Filter predicate returned by {@link range} for use in Secondary Index queries.
     */
    class GeoPredicate extends SindexFilterPredicate {
        constructor (bin: string, value: GeoJSON, indexType: indexType);
        public val: GeoJSON;
    }

    /**
     * Filter for list/map membership.
     *
     * The filter matches records with a bin that has a list or map
     * value that contain the given string or integer.
     *
     * @param bin - The name of the bin.
     * @param value - The value that should be a member of the
     * list or map in the bin.
     * @param indexType - One of {@link indexType},
     * i.e. LIST, MAPVALUES or MAPKEYS.
     * @param ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     *
     * @since v2.0
     */
    export function contains(bin: string, value: AerospikeBinValue, indexType?: indexType, ctx?: cdt.Context): filter.EqualPredicate;
    /**
     * String/integer equality filter.
     *
     * The filter matches records with a bin that matches a specified
     * string or integer value.
     *
     * @param {string} bin - The name of the bin.
     * @param {string} value - The filter value.
     * @param ctx - The {@link cdt.Context} of the index.
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     */
    export function equal(bin: string, value: AerospikeBinValue, ctx?: cdt.Context): filter.EqualPredicate;
    /**
     * Geospatial filter that matches points within a given GeoJSON
     * region.
     * 
     * Depending on the index type, the filter will match GeoJSON
     * values contained in list or map values as well (requires Aerospike server
     * version >= 3.8).
     *
     * @param bin - The name of the bin.
     * @param value - GeoJSON region value.
     * @param indexType - One of {@link indexType}, i.e. LIST or MAPVALUES.
     * @param ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     *
     * @since v2.0
     */
    export function geoWithinGeoJSONRegion(bin: string, value: GeoJSON | GeoJSONType, indexType?: indexType, ctx?: cdt.Context): filter.GeoPredicate;
    /**
     * Geospatial filter that matches regions that contain a given GeoJSON point.
     * 
     * Depending on the index type, the filter will match GeoJSON
     * regions within list or map values as well (requires server
     * >= 3.8).
     *
     * @param bin - The name of the bin.
     * @param value - GeoJSON point value.
     * @param indexType - One of {@link indexType}, i.e. LIST or MAPVALUES.
     * @param {Object} ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     *
     * @since v2.0
     */
    export function geoContainsGeoJSONPoint(bin: string, value: GeoJSON | GeoJSONType, indexType?: indexType, ctx?: cdt.Context): filter.GeoPredicate;
    /**
     * Geospatial filter that matches points within a radius from a given point.
     * 
     * Depending on the index type, the filter will match GeoJSON
     * values contained in list or map values as well (requires Aerospike server
     * version >= 3.8).
     *
     * @param bin - The name of the bin.
     * @param lng - Longitude of the center point.
     * @param lat - Latitude of the center point.
     * @param radius - Radius in meters.
     * @param indexType - One of {@link indexType}, i.e. LIST or MAPVALUES.
     * @param ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     *
     * @since v2.0
     */
    export function geoWithinRadius(bin: string, lng: number, lat: number, radius: number, indexType?: indexType, ctx?: cdt.Context): filter.GeoPredicate;
    /**
     * Geospatial filter that matches regions that contain a given lng/lat coordinate.
     * 
     * Depending on the index type, the filter will match GeoJSON
     * regions within list or map values as well (requires server
     * >= 3.8).
     *
     * @param bin - The name of the bin.
     * @param lng - Longitude of the point.
     * @param lat - Latitude of the point.
     * @param indexType - One of {@link indexType}, i.e. LIST or MAPVALUES.
     * @param ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     *
     * @since v2.0
     */
    export function geoContainsPoint(bin: string, lng: number, lat: number, indexType?: indexType, ctx?: cdt.Context): filter.GeoPredicate;
    /**
     * Integer range filter.
     * 
     * The filter matches records with a bin value in the given
     * integer range. The filter can also be used to match for integer values
     * within the given range that are contained with a list or map by specifying
     * the appropriate index type.
     *
     * @param bin - The name of the bin.
     * @param min - Lower end of the range (inclusive).
     * @param max - Upper end of the range (inclusive).
     * @param indexType - One of {@link indexType}, i.e. LIST or MAPVALUES.
     * @param ctx - The {@link cdt.Context} of the index.
     * 
     * @returns Secondary Index filter predicate, that can be applied to queries using {@link Query#where}.
     */
    export function range(bin: string, min: number, max: number, indexType?: indexType, ctx?: cdt.Context): filter.RangePredicate;
}


declare namespace statusNamespace {
    /**
     * Multi-record transaction failed.
     */
    export const AEROSPIKE_TXN_FAILED = -17;
    /**
     * Multi-record transaction failed.
     */
    export const TXN_FAILED = -17;
    /**
     * One or more keys failed in a batch.
     */
    export const AEROSPIKE_BATCH_FAILED = -16;
    /**
     * One or more keys failed in a batch.
     */
    export const BATCH_FAILED = -16;
    /**
     * No response received from server.
     */
    export const AEROSPIKE_NO_RESPONSE = -15;
    /**
     * No response received from server.
     */
    export const NO_RESPONSE = -15;
    /**
     * Max errors limit reached.
     */
    export const AEROSPIKE_MAX_ERROR_RATE = -14;
    /**
     * Max errors limit reached.
     */
    export const MAX_ERROR_RATE = -14;
    /**
     * Abort split batch retry and use normal node retry instead.
     * Used internally and should not be returned to user.
     */
    export const AEROSPIKE_USE_NORMAL_RETRY = -13;
    /**
     * Abort split batch retry and use normal node retry instead.
     * Used internally and should not be returned to user.
     */
    export const USE_NORMAL_RETRY = -13;
    /**
     * Max retries limit reached.
     */
    export const AEROSPIKE_ERR_MAX_RETRIES_EXCEEDED = -12;
    /**
     * Max retries limit reached.
     */
    export const ERR_MAX_RETRIES_EXCEEDED = -12;
    /**
     * Async command delay queue is full.
     */
    export const AEROSPIKE_ERR_ASYNC_QUEUE_FULL = -11;
    /**
     * Async command delay queue is full.
     */
    export const ERR_ASYNC_QUEUE_FULL = -11;
    /**
     * Synchronous connection error.
     */
    export const AEROSPIKE_ERR_CONNECTION = -10;
    /**
     * Synchronous connection error.
     */
    export const ERR_CONNECTION = -10;
    /**
     * TLS related error
     */
    export const AEROSPIKE_ERR_TLS_ERROR = -9;
    /**
     * TLS related error
     */
    export const ERR_TLS_ERROR = -9;
    /**
     * Node invalid or could not be found.
     */
    export const AEROSPIKE_ERR_INVALID_NODE = -8;
    /**
     * Node invalid or could not be found.
     */
    export const ERR_INVALID_NODE = -8;
    /**
     * Asynchronous connection error.
     */
    export const AEROSPIKE_ERR_NO_MORE_CONNECTIONS = -7;
    /**
     * Asynchronous connection error.
     */
    export const ERR_NO_MORE_CONNECTIONS = -7;
    /**
     * Asynchronous connection error.
     */
    export const AEROSPIKE_ERR_ASYNC_CONNECTION = -6;
    /**
     * Asynchronous connection error.
     */
    export const ERR_ASYNC_CONNECTION = -6;
    /**
     * Query or scan was aborted in user's callback.
     */
    export const AEROSPIKE_ERR_CLIENT_ABORT = -5;
    /**
     * Query or scan was aborted in user's callback.
     */
    export const ERR_CLIENT_ABORT = -5;
    /**
     * Host name could not be found in DNS lookup.
     */
    export const AEROSPIKE_ERR_INVALID_HOST = -4;
    /**
     * Host name could not be found in DNS lookup.
     */
    export const ERR_INVALID_HOST = -4;
    /**
     * No more records available when parsing batch, scan or query records.
     */
    export const AEROSPIKE_NO_MORE_RECORDS = -3;
    /**
     * No more records available when parsing batch, scan or query records.
     */
    export const NO_MORE_RECORDS = -3;
    /**
     * Invalid client API parameter.
     */
    export const AEROSPIKE_ERR_PARAM = -2;
    /**
     * Invalid client API parameter.
     */
    export const ERR_PARAM = -2;
    /**
     * Generic client API usage error.
     */
    export const AEROSPIKE_ERR_CLIENT = -1;
    /**
     * Generic client API usage error.
     */
    export const ERR_CLIENT = -1;
    /**
     * Generic success.
     */
    export const AEROSPIKE_OK = 0;
    /**
     * Generic success.
     */
    export const OK = 0;
    /**
     * Generic error returned by server.
     */
    export const AEROSPIKE_ERR_SERVER = 1;
    /**
     * Generic error returned by server.
     */
    export const ERR_SERVER = 1;
    /**
     * Record does not exist in database. May be returned by read, or write
     * with policy AS_POLICY_EXISTS_UPDATE.
     */
    export const AEROSPIKE_ERR_RECORD_NOT_FOUND = 2;
    /**
     * Record does not exist in database. May be returned by read, or write
     * with policy AS_POLICY_EXISTS_UPDATE.
     */
    export const ERR_RECORD_NOT_FOUND = 2;
    /**
     * Generation of record in database does not satisfy write policy.
     */
    export const AEROSPIKE_ERR_RECORD_GENERATION = 3;
    /**
     * Generation of record in database does not satisfy write policy.
     */
    export const ERR_RECORD_GENERATION = 3;
    /**
     * Request protocol invalid, or invalid protocol field.
     */
    export const AEROSPIKE_ERR_REQUEST_INVALID = 4;
    /**
     * Request protocol invalid, or invalid protocol field.
     */
    export const ERR_REQUEST_INVALID = 4;
    /**
     * Record already exists. May be returned by write with policy
     * AS_POLICY_EXISTS_CREATE.
     */
    export const AEROSPIKE_ERR_RECORD_EXISTS = 5;
    /**
     * Record already exists. May be returned by write with policy
     * AS_POLICY_EXISTS_CREATE.
     */
    export const ERR_RECORD_EXISTS = 5;
    /**
     * Bin already exists on a create-only operation.
     */
    export const AEROSPIKE_ERR_BIN_EXISTS = 6;
    /**
     * Bin already exists on a create-only operation.
     */
    export const ERR_BIN_EXISTS = 6;
    /**
     * A cluster state change occurred during the request. This may also be
     * returned by scan operations with the fail_on_cluster_change flag set.
     */
    export const AEROSPIKE_ERR_CLUSTER_CHANGE = 7;
    /**
     * A cluster state change occurred during the request. This may also be
     * returned by scan operations with the fail_on_cluster_change flag set.
     */
    export const ERR_CLUSTER_CHANGE = 7;
    /**
     * The server node is running out of memory and/or storage device space
     * reserved for the specified namespace.
     */
    export const AEROSPIKE_ERR_SERVER_FULL = 8;
    /**
     * The server node is running out of memory and/or storage device space
     * reserved for the specified namespace.
     */
    export const ERR_SERVER_FULL = 8;
    /**
     * Request timed out.  Can be triggered by client or server.
     */
    export const AEROSPIKE_ERR_TIMEOUT = 9;
    /**
     * Request timed out.  Can be triggered by client or server.
     */
    export const ERR_TIMEOUT = 9;
    /**
     * Operation not allowed in current configuration.
     */
    export const AEROSPIKE_ERR_ALWAYS_FORBIDDEN = 10;
    /**
     * Operation not allowed in current configuration.
     */
    export const ERR_ALWAYS_FORBIDDEN = 10;
    /**
     * Partition is unavailable.
     */
    export const AEROSPIKE_ERR_CLUSTER = 11;
    /**
     * Partition is unavailable.
     */
    export const ERR_CLUSTER = 11;
    /**
     * Bin modification operation can't be done on an existing bin due to its
     * value type.
     */
    export const AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE = 12;
    /**
     * Bin modification operation can't be done on an existing bin due to its
     * value type.
     */
    export const ERR_BIN_INCOMPATIBLE_TYPE = 12;
    /**
     * Record being (re-)written can't fit in a storage write block.
     */
    export const AEROSPIKE_ERR_RECORD_TOO_BIG = 13;
    /**
     * Record being (re-)written can't fit in a storage write block.
     */
    export const ERR_RECORD_TOO_BIG = 13;
    /**
     * Too many concurrent requests for one record - a "hot-key" situation.
     */
    export const AEROSPIKE_ERR_RECORD_BUSY = 14;
    /**
     * Too many concurrent requests for one record - a "hot-key" situation.
     */
    export const ERR_RECORD_BUSY = 14;
    /**
     * Scan aborted by user.
     */
    export const AEROSPIKE_ERR_SCAN_ABORTED = 15;
    /**
     * Scan aborted by user.
     */
    export const ERR_SCAN_ABORTED = 15;
    /**
     * Sometimes our doc, or our customers' wishes, get ahead of us. We may have
     * processed something that the server is not ready for (unsupported feature).
     */
    export const AEROSPIKE_ERR_UNSUPPORTED_FEATURE = 16;
    /**
     * Sometimes our doc, or our customers' wishes, get ahead of us. We may have
     * processed something that the server is not ready for (unsupported feature).
     */
    export const ERR_UNSUPPORTED_FEATURE = 16;
    /**
     * Bin not found on update-only operation.
     */
    export const AEROSPIKE_ERR_BIN_NOT_FOUND = 17;
    /**
     * Bin not found on update-only operation.
     */
    export const ERR_BIN_NOT_FOUND = 17;
    /**
     * The server node's storage device(s) can't keep up with the write load.
     */
    export const AEROSPIKE_ERR_DEVICE_OVERLOAD = 18;
    /**
     * The server node's storage device(s) can't keep up with the write load.
     */
    export const ERR_DEVICE_OVERLOAD = 18;
    /**
     * Record key sent with transaction did not match key stored on server.
     */
    export const AEROSPIKE_ERR_RECORD_KEY_MISMATCH = 19;
    /**
     * Record key sent with transaction did not match key stored on server.
     */
    export const ERR_RECORD_KEY_MISMATCH = 19;
    /**
     * Namespace in request not found on server.
     */
    export const AEROSPIKE_ERR_NAMESPACE_NOT_FOUND = 20;
    /**
     * Namespace in request not found on server.
     */
    export const ERR_NAMESPACE_NOT_FOUND = 20;
    /**
     * Sent too-long bin name (should be impossible in this client) or exceeded
     * namespace's bin name quota.
     */
    export const AEROSPIKE_ERR_BIN_NAME = 21;
    /**
     * Sent too-long bin name (should be impossible in this client) or exceeded
     * namespace's bin name quota.
     */
    export const ERR_BIN_NAME = 21;
    /**
     * Operation not allowed at this time.
     */
    export const AEROSPIKE_ERR_FAIL_FORBIDDEN = 22;
    /**
     * Operation not allowed at this time.
     */
    export const ERR_FAIL_FORBIDDEN = 22;
    /**
     * Map element not found in UPDATE_ONLY write mode.
     */
    export const AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND = 23;
    /**
     * Map element not found in UPDATE_ONLY write mode.
     */
    export const ERR_FAIL_ELEMENT_NOT_FOUND = 23;
    /**
     * Map element exists in CREATE_ONLY write mode.
     */
    export const AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS = 24;
    /**
     * Map element exists in CREATE_ONLY write mode.
     */
    export const ERR_FAIL_ELEMENT_EXISTS = 24;
    /**
     * Attempt to use an Enterprise feature on a Community server or a server
     * without the applicable feature key.
     */
    export const AEROSPIKE_ERR_ENTERPRISE_ONLY = 25;
    /**
     * Attempt to use an Enterprise feature on a Community server or a server
     * without the applicable feature key.
     */
    export const ERR_ENTERPRISE_ONLY = 25;
    /**
     * The operation cannot be applied to the current bin value on the server.
     */
    export const AEROSPIKE_ERR_OP_NOT_APPLICABLE = 26;
    /**
     * The operation cannot be applied to the current bin value on the server.
     */
    export const ERR_OP_NOT_APPLICABLE = 26;
    /**
     * The transaction was not performed because the filter expression was
     * false.
     */
    export const AEROSPIKE_FILTERED_OUT = 27;
    /**
     * The transaction was not performed because the filter expression was
     * false.
     */
    export const FILTERED_OUT = 27;
    /**
     * Write command loses conflict to XDR.
     */
    export const AEROSPIKE_LOST_CONFLICT = 28;
    /**
     * Write command loses conflict to XDR.
     */
    export const LOST_CONFLICT = 28;
    /**
     * Write can't complete until XDR finishes shipping.
     */
    export const AEROSPIKE_XDR_KEY_BUSY = 32;
    /**
     * Write can't complete until XDR finishes shipping.
    */
    export const XDR_KEY_BUSY = 32;
    /**
     * There are no more records left for query.
     */
    export const AEROSPIKE_QUERY_END = 50;
    /**
     * There are no more records left for query.
     */
    export const QUERY_END = 50;
    /**
     * Security functionality not supported by connected server.
     */
    export const AEROSPIKE_SECURITY_NOT_SUPPORTED = 51;
    /**
     * Security functionality not supported by connected server.
     */
    export const SECURITY_NOT_SUPPORTED = 51;
    /**
     * Security functionality not enabled by connected server.
     */
    export const AEROSPIKE_SECURITY_NOT_ENABLED = 52;
    /**
     * Security functionality not enabled by connected server.
     */
    export const SECURITY_NOT_ENABLED = 52;
    /**
     * Security type not supported by connected server.
     */
    export const AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED = 53;
    /**
     * Security type not supported by connected server.
     */
    export const SECURITY_SCHEME_NOT_SUPPORTED = 53;
    /**
     * Administration command is invalid.
     */
    export const AEROSPIKE_INVALID_COMMAND = 54;
    /**
     * Administration command is invalid.
     */
    export const INVALID_COMMAND = 54;
    /**
     * Administration field is invalid.
     */
    export const AEROSPIKE_INVALID_FIELD = 55;
    /**
     * Administration field is invalid.
     */
    export const INVALID_FIELD = 55;
    /**
     * Security protocol not followed.
     */
    export const AEROSPIKE_ILLEGAL_STATE = 56;
    /**
     * Security protocol not followed.
     */
    export const ILLEGAL_STATE = 56;
    /**
     * User name is invalid.
     */
    export const AEROSPIKE_INVALID_USER = 60;
    /**
     * User name is invalid.
     */
    export const INVALID_USER = 60;
    /**
     * User was previously created.
     */
    export const AEROSPIKE_USER_ALREADY_EXISTS = 61;
    /**
     * User was previously created.
x     */
    export const USER_ALREADY_EXISTS = 61;
    /**
     * Password is invalid.
     */
    export const AEROSPIKE_INVALID_PASSWORD = 62;
    /**
     * Password is invalid.
     */
    export const INVALID_PASSWORD = 62;
    /**
     * Password has expired.
     */
    export const AEROSPIKE_EXPIRED_PASSWORD = 63;
    /**
     * Password has expired.
     */
    export const EXPIRED_PASSWORD = 63;
    /**
     * Forbidden password (e.g. recently used)
     */
    export const AEROSPIKE_FORBIDDEN_PASSWORD = 64;
    /**
     * Forbidden password (e.g. recently used)
     */
    export const FORBIDDEN_PASSWORD = 64;
    /**
     * Security credential is invalid.
     */
    export const AEROSPIKE_INVALID_CREDENTIAL = 65;
    /**
     * Security credential is invalid.
     */
    export const INVALID_CREDENTIAL = 65;
    /**
     * Login session expired.
     */
    export const AEROSPIKE_EXPIRED_SESSION = 66;
    /**
     * Login session expired.
     */
    export const EXPIRED_SESSION = 66;
    /**
     * Role name is invalid.
     */
    export const AEROSPIKE_INVALID_ROLE = 70;
    /**
     * Role name is invalid.
     */
    export const INVALID_ROLE = 70;
    /**
     * Role already exists.
     */
    export const AEROSPIKE_ROLE_ALREADY_EXISTS = 71;
    /**
     * Role already exists.
     */
    export const ROLE_ALREADY_EXISTS = 71;
    /**
     * Privilege is invalid.
     */
    export const AEROSPIKE_INVALID_PRIVILEGE = 72;
    /**
     * Privilege is invalid.
     */
    export const INVALID_PRIVILEGE = 72;
    /**
     * Invalid IP whitelist.
     */
    export const AEROSPIKE_INVALID_WHITELIST = 73;
    /**
     * Invalid IP whitelist.
     */
    export const INVALID_WHITELIST = 73;
    /**
     * Quotas not enabled on server.
     */
    export const AEROSPIKE_QUOTAS_NOT_ENABLED = 74;
    /**
     * Quotas not enabled on server.
     */
    export const QUOTAS_NOT_ENABLED = 74;
    /**
     * Invalid quota.
     */
    export const AEROSPIKE_INVALID_QUOTA = 75;
    /**
     * Invalid quota.
     */
    export const INVALID_QUOTA = 75;
    /**
     * User must be authentication before performing database operations.
     */
    export const AEROSPIKE_NOT_AUTHENTICATED = 80;
    /**
     * User must be authentication before performing database operations.
     */
    export const NOT_AUTHENTICATED = 80;
    /**
     * User does not possess the required role to perform the database operation.
     */
    export const AEROSPIKE_ROLE_VIOLATION = 81;
    /**
     * User does not possess the required role to perform the database operation.
     */
    export const ROLE_VIOLATION = 81;
    /**
     * Command not allowed because sender IP not whitelisted.
     */
    export const AEROSPIKE_NOT_WHITELISTED = 82;
    /**
     * Command not allowed because sender IP not whitelisted.
     */
    export const NOT_WHITELISTED = 82;
    /**
     * Quota exceeded.
     */
    export const AEROSPIKE_QUOTA_EXCEEDED = 83;
    /**
     * Quota exceeded.
     */
    export const QUOTA_EXCEEDED = 83;
    /**
     * Generic UDF error.
     */
    export const AEROSPIKE_ERR_UDF = 100;
    /**
     * Generic UDF error.
     */
    export const ERR_UDF = 100;
    /**
     * MRT record blocked by a different transaction.
     */
    export const AEROSPIKE_MRT_BLOCKED = 120;
    /**
     * MRT record blocked by a different transaction.
     */
    export const MRT_BLOCKED = 120;
    /**
     * MRT read version mismatch identified during commit.
     * Some other command changed the record outside of the transaction.
     */
    export const AEROSPIKE_MRT_VERSION_MISMATCH = 121;
    /**
     * MRT read version mismatch identified during commit.
     * Some other command changed the record outside of the transaction.
     */
    export const MRT_VERSION_MISMATCH = 121;
    /**
     * MRT deadline reached without a successful commit or abort.
     */
    export const AEROSPIKE_MRT_EXPIRED = 122;
    /**
     * MRT deadline reached without a successful commit or abort.
     */
    export const MRT_EXPIRED = 122;
    /**
     * MRT write command limit (4096) exceeded.
     */
    export const AEROSPIKE_MRT_TOO_MANY_WRITES = 123;
    /**
     * MRT write command limit (4096) exceeded.
     */
    export const MRT_TOO_MANY_WRITES = 123;
    /**
     * MRT was already committed.
     */
    export const AEROSPIKE_MRT_COMMITTED = 124;
    /**
     * MRT was already committed.
     */
    export const MRT_COMMITTED = 124;
    /**
     * MRT was already aborted.
     */
    export const AEROSPIKE_MRT_ABORTED = 125;
    /**
     * MRT was already aborted.
     */
    export const MRT_ABORTED = 125;
    /**
     * Batch functionality has been disabled.
     */
    export const AEROSPIKE_ERR_BATCH_DISABLED = 150;
    /**
     * Batch functionality has been disabled.
     */
    export const ERR_BATCH_DISABLED = 150;
    /**
     * Batch max requests have been exceeded.
     */
    export const AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED = 151;
    /**
     * Batch max requests have been exceeded.
     */
    export const ERR_BATCH_MAX_REQUESTS_EXCEEDED = 151;
    /**
     * All batch queues are full.
     */
    export const AEROSPIKE_ERR_BATCH_QUEUES_FULL = 152;
    /**
     * All batch queues are full.
     */
    export const ERR_BATCH_QUEUES_FULL = 152;
    /**
     * Invalid/Unsupported GeoJSON
     */
    export const AEROSPIKE_ERR_GEO_INVALID_GEOJSON = 160;
    /**
     * Invalid/Unsupported GeoJSON
     */
    export const ERR_GEO_INVALID_GEOJSON = 160;
    /**
     * Index found.
     */
    export const AEROSPIKE_ERR_INDEX_FOUND = 200;
    /**
     * Index found.
     */
    export const ERR_INDEX_FOUND = 200;
    /**
     * Index not found
     */
    export const AEROSPIKE_ERR_INDEX_NOT_FOUND = 201;
    /**
     * Index not found
     */
    export const ERR_INDEX_NOT_FOUND = 201;
    /**
     * Index is out of memory
     */
    export const AEROSPIKE_ERR_INDEX_OOM = 202;
    /**
     * Index is out of memory
     */
    export const ERR_INDEX_OOM = 202;
    /**
     * Unable to read the index.
     */
    export const AEROSPIKE_ERR_INDEX_NOT_READABLE = 203;
    /**
     * Unable to read the index.
     */
    export const ERR_INDEX_NOT_READABLE = 203;
    /**
     * Generic secondary index error.
     */
    export const AEROSPIKE_ERR_INDEX = 204;
    /**
     * Generic secondary index error.
     */
    export const ERR_INDEX = 204;
    /**
     * Index name is too long.
     */
    export const AEROSPIKE_ERR_INDEX_NAME_MAXLEN = 205;
    /**
     * Index name is too long.
     */
    export const ERR_INDEX_NAME_MAXLEN = 205;
    /**
     * System already has maximum allowed indices.
     */
    export const AEROSPIKE_ERR_INDEX_MAXCOUNT = 206;
    /**
     * System already has maximum allowed indices.
     */
    export const ERR_INDEX_MAXCOUNT = 206;
    /**
     * Query was aborted.
     */
    export const AEROSPIKE_ERR_QUERY_ABORTED = 210;
    /**
     * Query was aborted.
     */
    export const ERR_QUERY_ABORTED = 210;
    /**
     * Query processing queue is full.
     */
    export const AEROSPIKE_ERR_QUERY_QUEUE_FULL = 211;
    /**
     * Query processing queue is full.
     */
    export const ERR_QUERY_QUEUE_FULL = 211;
    /**
     * Secondary index query timed out on server.
     */
    export const AEROSPIKE_ERR_QUERY_TIMEOUT = 212;
    /**
     * Secondary index query timed out on server.
     */
    export const ERR_QUERY_TIMEOUT = 212;
    /**
     * Generic query error.
     */
    export const AEROSPIKE_ERR_QUERY = 213;
    /**
     * Generic query error.
     */
    export const ERR_QUERY = 213;
    /**
     * UDF does not exist.
     */
    export const AEROSPIKE_ERR_UDF_NOT_FOUND = 1301;
    /**
     * UDF does not exist.
     */
    export const ERR_UDF_NOT_FOUND = 1301;
    /**
     * LUA file does not exist.
     */
    export const AEROSPIKE_ERR_LUA_FILE_NOT_FOUND = 1302;
    /**
     * LUA file does not exist.
     */
    export const ERR_LUA_FILE_NOT_FOUND = 1302;
    /**
     * Produces a human-readable error message for the given status code.
     */
    export function getMessage(code: typeof statusNamespace[keyof typeof statusNamespace]): string;
}

export {statusNamespace as status}
