import * as Buffer from "buffer";
import { EventEmitter, Stream } from "stream";

declare namespace Aerospike {

    type PartialAerospikeRecordValue = null | undefined | boolean | string | number | Double | BigInt | Buffer | GeoJSON;
    type AerospikeRecordValue = PartialAerospikeRecordValue | PartialAerospikeRecordValue[] | Record<string, PartialAerospikeRecordValue>;

    type AerospikeBins = {
        [key: string]: AerospikeRecordValue
    };

    // Commands

    class Command {
        readonly client: Client;
        private args: any[];
        private callback?: AddonCallback;
        readonly captureStackTraces: boolean;
        public key?: IKey;
        public ensureConnected: boolean;
        constructor(client: Client, args: any[], callback?: AddonCallback);
        private captureStackTrace(): void;
        private connected(): boolean;
        private convertError(): AerospikeError;
        private convertResult(arg1, arg2, arg3): any;
        private convertResponse(err, arg1, arg2, arg3): [AerospikeError, any];
        private execute(): Promise<any> | void;
        private executeWithCallback(callback: AddonCallback): void;
        private executeAndReturnPromise(): Promise<any>;
        private expectsPromise(): boolean;
        private asCommand(): string;
        private process(cb: AddonCallback): void;
        private sendError(message: string): void;
    }

    interface IBatchResult {
        status: Status;
        record: AerospikeRecord;
    }

    class BatchCommand extends Command {
        private convertResult(results: AerospikeRecord[]): IBatchResult[];
    }

    class ConnectCommand extends Command {
        constructor(client: Client, callback: AddonCallback);
    }

    class QueryBackgroundBaseCommand extends Command {
        public queryID: number;
        public queryObj: IQueryOptions;
        constructor(client: Client, ns: string, set: string, queryObj: IQueryOptions, policy: QueryPolicy, queryID: number, callback: AddonCallback);
        public convertResult(): Job;
    }

    class ReadRecordCommand extends Command {
        constructor(client: Client, key: IKey, args: any[]);
        public convertResult(bins: AerospikeBins, metadata: IRecordMetadata): AerospikeRecord;
    }

    class StreamCommand extends Command {
        public stream: RecordStream;
        constructor(stream: RecordStream, args: any[]);
        private callback(error?: Error, record: AerospikeRecord): boolean;
        private convertResult(bins: AerospikeBins, meta: IRecordMetadata, asKey: IKey): AerospikeRecord;
    }

    class WriteRecordCommand extends Command {
        constructor(client: Client, key: IKey, args: any[], callback: AddOperation);
        private convertResult(): IKey;
    }

    // C++ bindings
    enum Predicates {
        EQUAL,
        RANGE
    }

    enum IndexDataType {
        STRING,
        NUMERIC,
        GEO2DSPHERE
    }

    enum IndexType {
        DEFAULT,
        LIST,
        MAPKEYS,
        MAPVALUES
    }

    enum ListOrder {
        UNORDERED,
        ORDERED
    }

    enum ListSortFlags {
        DEFAULT,
        DROP_DUPLICATES
    }

    enum ListWriteFlags {
        DEFAULT,
        ADD_UNIQUE,
        INSERT_BOUNDED,
        NO_FAIL,
        PARTIAL
    }

    enum ListReturnType {
        NONE,
        INDEX,
        REVERSE_INDEX,
        RANK,
        REVERSE_RANK,
        COUNT,
        VALUE,
        INVERTED
    }

    enum MapsOrder {
        UNORDERED,
        KEY_ORDERED,
        KEY_VALUE_ORDERED = 3
    }

    enum MapsWriteMode {
        UPDATE,
        UPDATE_ONLY,
        CREATE_ONLY
    }

    enum MapsWriteFlags {
        DEFAULT,
        CREATE_ONLY,
        UPDATE_ONLY,
        NO_FAIL,
        PARTIAL
    }

    enum MapReturnType {
        NONE,
        INDEX,
        REVERSE_INDEX,
        RANK,
        REVERSE_RANK,
        COUNT,
        KEY,
        VALUE,
        KEY_VALUE
    }

    enum ScalarOperations {
        WRITE,
        READ,
        INCR,
        PREPEND,
        APPEND,
        TOUCH,
        DELETE
    }

    enum PolicyGen {
        IGNORE,
        EQ,
        GT
    }

    enum PolicyKey {
        DIGEST,
        SEND
    }

    enum PolicyExists {
        IGNORE,
        CREATE,
        UPDATE,
        REPLACE,
        CREATE_OR_REPLACE
    }

    enum PolicyReplica {
        MASTER,
        ANY,
        SEQUENCE,
        PREFER_RACK
    }

    enum PolicyReadModeAP {
        ONE,
        ALL
    }

    enum PolicyReadModeSC {
        SESSION,
        LINEARIZE,
        ALLOW_REPLICA,
        ALLOW_UNAVAILABLE
    }

    enum PolicyCommitLevel {
        ALL,
        MASTER
    }

    enum BitwiseWriteFlags {
        DEFAULT,
        CREATE_ONLY,
        UPDATE_ONLY,
        NO_FAIL,
        PARTIAL = 8
    }

    enum BitwiseResizeFlags {
        DEFAULT,
        FROM_FRONT,
        GROW_ONLY,
        SHRINK_ONLY = 4
    }

    enum BitwiseOverflow {
        FAIL,
        SATURATE = 2,
        WRAP = 4
    }

    enum HLLWriteFlags {
        DEFAULT,
        CREATE_ONLY,
        UPDATE_ONLY,
        NO_FAIL = 4,
        ALLOW_FOLD = 8
    }

    enum MapOrder {
        UNORDERED,
        KEY_ORDERED,
        KEY_VALUE_ORDERED
    }

    enum MapWriteMode {
        UPDATE,
        UPDATE_ONLY,
        CREATE_ONLY
    }

    enum MapWriteFlags {
        DEFAULT,
        CREATE_ONLY,
        UPDATE_ONLY,
        NO_FAIL = 4,
        PARTIAL = 8
    }

    enum LogLevel {
        OFF = -1,
        ERROR,
        WARN,
        INFO,
        DEBUG,
        TRACE,
        DETAIL
    }

    enum Auth {
        INTERNAL,
        EXTERNAL,
        EXTERNAL_INSECURE
    }

    enum Language {
        LUA
    }

    enum Log {
        OFF = -1,
        ERROR,
        WARN,
        INFO,
        DEBUG,
        TRACE,
        DETAIL = 4
    }

    enum TTL {
        DONT_UPDATE = -2,
        NEVER_EXPIRE,
        NAMESPACE_DEFAULT
    }

    enum JobStatus {
        UNDEF,
        INPROGRESS,
        COMPLETED
    }

    enum Status {
        AEROSPIKE_ERR_ASYNC_QUEUE_FULL = -11,
        AEROSPIKE_ERR_CONNECTION,
        AEROSPIKE_ERR_TLS_ERROR,
        AEROSPIKE_ERR_INVALID_NODE,
        AEROSPIKE_ERR_NO_MORE_CONNECTIONS,
        AEROSPIKE_ERR_ASYNC_CONNECTION,
        AEROSPIKE_ERR_CLIENT_ABORT,
        AEROSPIKE_ERR_INVALID_HOST,
        AEROSPIKE_NO_MORE_RECORDS,
        AEROSPIKE_ERR_PARAM,
        AEROSPIKE_ERR_CLIENT,
        AEROSPIKE_OK,
        AEROSPIKE_ERR_SERVER,
        AEROSPIKE_ERR_RECORD_NOT_FOUND,
        AEROSPIKE_ERR_RECORD_GENERATION,
        AEROSPIKE_ERR_REQUEST_INVALID,
        AEROSPIKE_ERR_RECORD_EXISTS,
        AEROSPIKE_ERR_BIN_EXISTS,
        AEROSPIKE_ERR_CLUSTER_CHANGE,
        AEROSPIKE_ERR_SERVER_FULL,
        AEROSPIKE_ERR_TIMEOUT,
        AEROSPIKE_ERR_ALWAYS_FORBIDDEN,
        AEROSPIKE_ERR_CLUSTER,
        AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE,
        AEROSPIKE_ERR_RECORD_TOO_BIG,
        AEROSPIKE_ERR_RECORD_BUSY,
        AEROSPIKE_ERR_SCAN_ABORTED,
        AEROSPIKE_ERR_UNSUPPORTED_FEATURE,
        AEROSPIKE_ERR_BIN_NOT_FOUND,
        AEROSPIKE_ERR_DEVICE_OVERLOAD,
        AEROSPIKE_ERR_RECORD_KEY_MISMATCH,
        AEROSPIKE_ERR_NAMESPACE_NOT_FOUND,
        AEROSPIKE_ERR_BIN_NAME,
        AEROSPIKE_ERR_FAIL_FORBIDDEN,
        AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND,
        AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS,
        AEROSPIKE_ERR_ENTERPRISE_ONLY,
        AEROSPIKE_ERR_OP_NOT_APPLICABLE,
        AEROSPIKE_FILTERED_OUT,
        AEROSPIKE_LOST_CONFLICT,
        AEROSPIKE_QUERY_END = 50,
        AEROSPIKE_SECURITY_NOT_SUPPORTED,
        AEROSPIKE_SECURITY_NOT_ENABLED,
        AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED,
        AEROSPIKE_INVALID_COMMAND,
        AEROSPIKE_INVALID_FIELD,
        AEROSPIKE_ILLEGAL_STATE,
        AEROSPIKE_INVALID_USER = 60,
        AEROSPIKE_USER_ALREADY_EXISTS,
        AEROSPIKE_INVALID_PASSWORD,
        AEROSPIKE_EXPIRED_PASSWORD,
        AEROSPIKE_FORBIDDEN_PASSWORD,
        AEROSPIKE_INVALID_CREDENTIAL,
        AEROSPIKE_INVALID_ROLE = 70,
        AEROSPIKE_ROLE_ALREADY_EXISTS,
        AEROSPIKE_INVALID_PRIVILEGE,
        AEROSPIKE_NOT_AUTHENTICATED = 80,
        AEROSPIKE_ROLE_VIOLATION,
        AEROSPIKE_ERR_UDF = 100,
        AEROSPIKE_ERR_BATCH_DISABLED = 150,
        AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED,
        AEROSPIKE_ERR_BATCH_QUEUES_FULL,
        AEROSPIKE_ERR_GEO_INVALID_GEOJSON = 160,
        AEROSPIKE_ERR_INDEX_FOUND = 200,
        AEROSPIKE_ERR_INDEX_NOT_FOUND,
        AEROSPIKE_ERR_INDEX_OOM,
        AEROSPIKE_ERR_INDEX_NOT_READABLE,
        AEROSPIKE_ERR_INDEX,
        AEROSPIKE_ERR_INDEX_NAME_MAXLEN,
        AEROSPIKE_ERR_INDEX_MAXCOUNT,
        AEROSPIKE_ERR_QUERY_ABORTED = 210,
        AEROSPIKE_ERR_QUERY_QUEUE_FULL,
        AEROSPIKE_ERR_QUERY_TIMEOUT,
        AEROSPIKE_ERR_QUERY,
        AEROSPIKE_ERR_UDF_NOT_FOUND = 1301,
        AEROSPIKE_ERR_LUA_FILE_NOT_FOUND
    }

    enum HLLWriteFlags {
        DEFAULT,
        CREATE_ONLY,
        UPDATE_ONLY,
        NO_FAIL = 4,
        ALLOW_FOLD = 8
    }

    interface IAddonUDF {
        module: string;
        funcname: string;
        args: AerospikeRecordValue[];
    }

    interface IAddonNode {
        name: string;
        address: string;
    }

    interface IEventLoopStats {
        inFlight: number;
        queued: number;
    }

    interface IAddonConnectionStats {
        inPool: number;
        inUse: number;
        opened: number;
        closed: number;
    }

    interface IAddonNodeStats {
        name: string;
        syncConnections: IAddonConnectionStats;
        asyncConnections: IAddonConnectionStats;
    }

    interface IAddonStats {
        commands: IEventLoopStats;
        nodes: IAddonNodeStats[];
    }

    interface IAddonQueryOptions {
        filters: SindexFilterPredicate[];
        predexp: PredicateExpression[];
        selected: string[];
        nobins: boolean;
        udf: IAddonUDF;
        ops: Operation[]
    }

    interface IAddonScanOptions {
        selected: string[];
        nobins: boolean;
        concurrent: boolean;
        udf: IAddonUDF;
        ops: Operation[]
    }

    interface IAddonEvent {
        name: string;
        [key: string]: any;
    }

    type AddonCallback = (error?: Error, result: any) => void;
    type AddonEventCallback = (event: IAddonEvent) => void;

    class AddonAerospikeClient {
        public addSeedHost(hostname: stirng, port: number): void;
        public applyAsync(key: IKey, udf: IAddonUDF, policy: BasePolicy, callback: AddonCallback): void;
        public batchExists(keys: IKey[], policy: BasePolicy, callback: AddonCallback): void;
        public batchGet(keys: IKey[], policy: BasePolicy, callback: AddonCallback): void;
        public batchRead(records: AerospikeRecord[], policy: BasePolicy, callback: AddonCallback): void;
        public batchSelect(keys: IKey[], bins: string[], policy: BasePolicy, callback: AddonCallback): void;
        public close(): void;
        public connect(callback: AddonCallback): void;
        public existsAsync(key: IKey, policy: BasePolicy, callback: AddonCallback): void;
        public getAsync(key: IKey, policy: BasePolicy, callback: AddonCallback): void;
        public getNodes(): IAddonNode[];
        public getStats(): IAddonStats;
        public hasPendingAsyncCommands(): boolean;
        public indexCreate(ns: string, set: string, bin: string, indexName: string, indexType: IndexType, indexDataType: IndexDataType, policy: InfoPolicy, callback: AddonCallback): void;
        public indexRemove(ns: string, indexName: string, policy: InfoPolicy, callback: AddonCallback): void;
        public infoAny(request: string, policy: InfoPolicy, callback: AddonCallback): void;
        public infoForeach(request: string, policy: InfoPolicy, callback: AddonCallback): void;
        public infoHost(request: string, host: IHost, policy: InfoPolicy, callback: AddonCallback): void;
        public infoNode(request: string, node: string, policy: InfoPolicy, callback: AddonCallback): void;
        public isConnected(): bool;
        public jobInfo(jobID: number, module: string, policy: InfoPolicy, callback: AddonCallback): void;
        public operateAsync(key: IKey, operations: Operation[], meta: IRecordMetadata, policy: OperatePolicy, callback: AddonCallback): void;
        public putAsync(key: IKey, record: AerospikeRecord, meta: IRecordMetadata, policy: WritePolicy, callback: AddonCallback): void;
        public queryApply(ns: string, set: string, options: IAddonQueryOptions, policy: QueryPolicy, callback: AddonCallback): void;
        public queryAsync(ns: string, set: string, options: IAddonQueryOptions, policy: QueryPolicy, callback: AddonCallback): void;
        public queryBackground(ns: string, set: string, options: IAddonQueryOptions, policy: QueryPolicy, queryID: number, callback: AddonCallback);
        public queryForeach(ns: string, set: string, options: IAddonQueryOptions, policy: QueryPolicy, callback: AddonCallback): void;
        public removeAsync(key: IKey, policy: RemovePolicy, callback: AddonCallback): void;
        public removeSeedHost(hostname: string, port: number): void;
        public scanAsync(ns: string, set: string, options: IAddonScanOptions, policy: ScanPolicy, scanID: number, callback: AddonCallback): void;
        public scanBackground(ns: string, set: string, options: IAddonScanOptions, policy: ScanPolicy, scanID: number, callback: AddonCallback): void;
        public selectAsync(key: string, bins: string[], policy: ReadPolicy, callback: AddonCallback): void;
        public setupEventCb(callback: AddonEventCallback): void;
        public truncate(ns: string, set: string, beforeNanos: number, policy: InfoPolicy, callback: AddonCallback): void;
        public udfRegister(filename: string, type: Language, policy: InfoPolicy, callback: AddonCallback): void;
        public udfRemove(module: string, policy: InfoPolicy, callback: AddonCallback): void;
        public updateLogging(log: ILogInfo): AddonAerospikeClient;
    }

    // filter.js
    class SindexFilterPredicate {
        public constructor (
            predicate: Predicates,
            bin: string,
            dataType: IndexDataType,
            indexType: IndexType,
            props?: Record<string, any>
        );
        public predicate: Predicates;
        public bin: string;
        public datatype: IndexDataType;
        public type: IndexType;
    }

    class EqualPredicate extends SindexFilterPredicate {
        constructor(bin: string, value: string | number, dataType: IndexDataType, indexType: IndexType);
        public val: string | number;
    }

    class RangePredicate extends SindexFilterPredicate {
        constructor(bin: string, min: number, max: number, dataType: IndexDataType, indexType: IndexType);
        public min: number;
        public max: number;
    }

    class GeoPredicate extends SindexFilterPredicate {
        constructor (bin: string, value: GeoJSON, indexType: IndexType);
        public val: GeoJSON;
    }

    // predexp.js
    class PredicateExpression {
        constructor(code: number, arg?: string | number);
        public code: number;
        public arg: undefined | string | number;
    }

    // query.js
    interface IQueryOptions {
        udf?: IAddonUDF; // query.js#581 Why udf with caps?
        concurrent?;
        percentage?;
        priority?;
        filters?;
        predexp?;
        select?: string[];
        nobins?: boolean;
    }

    class Query {
        public client: Client;
        public ns: string;
        public set: string;
        public filters: SindexFilterPredicate[];
        public predexp: PredicateExpression[];
        public selected: string[];
        public nobins: boolean;
        public udf: IAddonUDF;
        public ops?: Operation[]
        constructor(client: Client, ns: string, set: string, options?: IQueryOptions);
        public select(bins: string[]): void;
        public select(...bins: string[]): void;
        public where(predicate: SindexFilterPredicate | PredicateExpression[]): void;
        public setSindexFilter(sindexFilter: SindexFilterPredicate): void;
        public setPredexpFilter(predexpFilter: PredicateExpression[]): void;
        public setUdf(udfModule: string, udfFunction: string, udfArgs?: any[]): void;
        public foreach(policy?: QueryPolicy, dataCb?: (data: AerospikeRecord) => void, errorCb?: (error: Error) => void, endCb: () => void): RecordStream;
        public results(policy?: QueryPolicy): Promise<AerospikeRecord[]>;
        public apply(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: QueryPolicy): Promise<AerospikeRecordValue>;
        public apply(udfModule: string, udfFunction: string, callback: TypedCallback<AerospikeRecordValue>): void;
        public apply(udfModule: string, udfFunction: string, udfArgs?: any[], callback: TypedCallback<AerospikeRecordValue>): void;
        public apply(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: QueryPolicy, callback: TypedCallback<AerospikeRecordValue>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: WritePolicy, queryID?: number): Promise<Job>;
        public background(udfModule: string, udfFunction: string, callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: WritePolicy, callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: WritePolicy, queryID?: number, callback: TypedCallback<Job>): void;
        public operate(operations: Operation[], policy?: QueryPolicy, queryID?: number): Promise<Job>;
        public operate(operations: Operation[], callback: TypedCallback<Job>): void;
        public operate(operations: Operation[], policy?: QueryPolicy, callback: TypedCallback<Job>): void;
        public operate(operations: Operation[], policy?: QueryPolicy, queryID?: number, callback: TypedCallback<Job>): void;
    }

    // cdt_context.js
    enum CdtItemType {
        LIST_INDEX = 0x10,
        LIST_RANK,
        LIST_VALUE = 0x13,
        MAP_INDEX = 0x20,
        MAP_RANK,
        MAP_KEY,
        MAP_VALUE
    }

    class CdtItems extends Array {
        public push(v: [number, CdtContext]);
    }

    class CdtContext {
        public items: CdtItems;
        private add(type: CdtItemType, value: CdtContext): CdtContext;
        public addListIndex(index: number): CdtContext;
        public addListRank(rank: number): CdtContext;
        public addListValue(value: AerospikeRecordValue): CdtContext;
        public addMapIndex(index: number): CdtContext;
        public addMapRank(rank: number): CdtContext;
        public addMapKey(key: string): CdtContext;
        public addMapValue(value: AerospikeRecordValue): CdtContext;
    }

    // operations.js
    class Operation {
        constructor(op: ScalarOperations, bin: string, props?: Record<string, any>);
    }

    class WriteOperation extends Operation {
        public value: any;
    }

    class AddOperation extends Operation {
        public value: number | Double;
    }

    class AppendOperation extends Operation {
        public value: string | Buffer;
    }

    class PrependOperation extends Operation {
        public value: string | Buffer;
    }

    class TouchOperation extends Operation {
        public ttl: number;
    }

    class ListOperation extends Operation {
        public andReturn(returnType: ListReturnType): ListOperation;
        public withContext(contextOrFunction: CdtContext | Function): ListOperation;
        public invertSelection(): void;
    }

    class InvertibleListOp extends ListOperation {
        public inverted: boolean;
        public invertSelection(): InvertibleListOp;
    }

    class MapOperation extends Operation {
        andReturn(returnType: MapReturnType): MapOperation;
        public withContext(contextOrFunction: CdtContext | Function): MapOperation;
    }

    class BitwiseOperation extends Operation {
        withPolicy(policy: BitwisePolicy): BitwiseOperation;
    }

    class OverflowableBitwiseOp extends BitwiseOperation {
        public overflowAction: BitwiseOverflow;
        public onOverflow(action: BitwiseOverflow): OverflowableBitwiseOp;
    }

    // policies
    interface IBasePolicyProps {
        socketTimeout?: number;
        totalTimeout?: number;
        timeout?: number;
        maxRetries?: number;
        compress?: boolean;
        predexp?: PredicateExpression[]
    }

    class BasePolicy {
        public socketTimeout: number;
        public totalTimeout: number;
        public maxRetries: number;
        public compress: boolean;
        public predexp?: PredicateExpression[];

        constructor(props?: IBasePolicyProps);
    }

    interface IApplyPolicyProps extends IBasePolicyProps {
        key?: PolicyKey;
        commitLevel?: PolicyCommitLevel;
        ttl?: number;
        durableDelete?: boolean;
    }

    class ApplyPolicy extends BasePolicy {
        public key?: PolicyKey;
        public commitLevel?: PolicyCommitLevel;
        public ttl?: number;
        public durableDelete: boolean;
        constructor(props?: IApplyPolicyProps);
    }

    interface IBatchPolicyProps extends IBasePolicyProps {
        deserialize?: boolean;
        allowInline?: boolean;
        sendSetName?: boolean;
        readModeAP?: PolicyReadModeAP;
        readModeSC?: PolicyReadModeSC;
    }

    class BatchPolicy extends BasePolicy {
        public deserialize: boolean;
        public allowInline: boolean;
        public sendSetName: boolean;
        public readModeAP: PolicyReadModeAP;
        public readModeSC: PolicyReadModeSC;
        constructor(props?: IBatchPolicyProps)
    }

    interface IBitwisePolicyProps extends IBatchPolicyProps {
        writeFlags?: BitwiseWriteFlags
    }

    class BitwisePolicy extends BasePolicy {
        public writeFlags: BitwiseWriteFlags;
        constructor(props?: IBitwisePolicyProps);
    }

    interface ICommandQueuePolicyProps extends IBasePolicyProps {
        maxCommandsInProcess?: number;
        maxCommandsInQueue?: number;
        queueInitialCapacity?: number;
    }

    class CommandQueuePolicy extends BasePolicy {
        public maxCommandsInProcess: number;
        public maxCommandsInQueue: number;
        public queueInitialCapacity: number;
        constructor(props?: ICommandQueuePolicyProps);
    }

    interface IHLLPolicyProps extends IBasePolicyProps {
        writeFlags?: HLLWriteFlags;
    }

    class HLLPolicy extends BasePolicy {
        public writeFlags: HLLWriteFlags;
        constructor(props?: IHLLPolicyProps);
    }

    interface IInfoPolicyProps extends IBasePolicyProps {
        sendAsIs?: boolean;
        checkBounds?: boolean;
    }

    class InfoPolicy extends BasePolicy {
        public sendAsIs: boolean;
        public checkBounds: boolean;
        constructor(props?: IInfoPolicyProps);
    }

    interface IListPolicyProps extends IBasePolicyProps {
        order?: ListOrder;
        writeFlags?: ListWriteFlags;
    }

    class ListPolicy extends BasePolicy {
        public order: ListOrder;
        public writeFlags: ListWriteFlags;
        constructor(props?: IListPolicyProps);
    }

    interface IMapPolicyProps extends IBasePolicyProps {
        order?: MapOrder;
        writeMode?: MapWriteMode;
        writeFlags?: MapWriteFlags;
    }

    class MapPolicy extends BasePolicy {
        public order: MapOrder;
        public writeMode: MapWriteMode;
        public writeFlags: MapWriteFlags;
        constructor(props?: IMapPolicyProps);
    }

    interface IOperatePolicyProps extends IBasePolicyProps {
        key?: PolicyKey;
        gen?: PolicyGen;
        exists?: PolicyExists;
        replica?: PolicyReplica;
        commitLevel?: PolicyCommitLevel;
        deserialize?: boolean;
        durableDelete?: boolean;
        readModeAP?: PolicyReadModeAP;
        readModeSC?: PolicyReadModeSC;
    }

    class OperatePolicy extends BasePolicy {
        public key?: PolicyKey;
        public gen?: PolicyGen;
        public exists?: PolicyExists;
        public replica?: PolicyReplica;
        public commitLevel?: PolicyCommitLevel;
        public deserialize: boolean;
        public durableDelete: boolean;
        public readModeAP: PolicyReadModeAP;
        public readModeSC: PolicyReadModeSC;
        constructor(props?: IOperatePolicyProps);
    }

    interface IQueryPolicyProps extends IBasePolicyProps {
        deserialize?: boolean;
        failOnClusterChange?: boolean;
    }

    class QueryPolicy extends BasePolicy {
        public deserialize: boolean;
        public failOnClusterChange: boolean;
        constructor(props?: IQueryPolicyProps);
    }

    interface IReadPolicyProps extends IBasePolicyProps {
        key?: PolicyKey;
        replica?: PolicyReplica;
        readModeAP?: PolicyReadModeAP;
        readModeSC?: PolicyReadModeSC;
        deserialize?: boolean;
    }

    class ReadPolicy extends BasePolicy {
        public key?: PolicyKey;
        public replica?: PolicyReplica;
        public readModeAP: PolicyReadModeAP;
        public readModeSC: PolicyReadModeSC;
        public deserialize: boolean;
        constructor(props?: IReadPolicyProps);
    }

    interface IRemovePolicyProps extends IBasePolicyProps {
        generation?: number;
        key?: PolicyKey;
        gen?: PolicyGen;
        commitLevel?: PolicyCommitLevel;
        durableDelete?: boolean;
    }

    class RemovePolicy extends BasePolicy {
        public generation?: number;
        public key?: PolicyKey;
        public gen?: PolicyGen;
        public commitLevel?: PolicyCommitLevel;
        public durableDelete: boolean;
        constructor(props?: IRemovePolicyProps);
    }

    interface IScanPolicyProps extends IBasePolicyProps {
        durableDelete?: boolean;
        recordsPerSecond?: number;
        maxRecords?: number;
    }

    class ScanPolicy extends BasePolicy {
        public durableDelete: boolean;
        public recordsPerSecond: number;
        public maxRecords?: number; // server version >= 4.9, so probably it should be optional
        constructor(props?: IScanPolicyProps);
    }

    interface IWritePolicyProps extends IBasePolicyProps {
        compressionThreshold?: number;
        key?: PolicyKey;
        gen?: PolicyGen;
        exists?: PolicyExists;
        commitLevel?: PolicyCommitLevel;
        durableDelete?: boolean;
    }

    class WritePolicy extends BasePolicy {
        public compressionThreshold?: number;
        public key?: PolicyKey;
        public gen?: PolicyGen;
        public exists?: PolicyExists;
        public commitLevel?: PolicyCommitLevel;
        public durableDelete: boolean;
        constructor(props?: IWritePolicyProps);
    }

    // client.js
    interface IBatchReadRecord {
        key: IKey;
        bins?: string[];
        read_all_bins?: boolean;
    }

    interface IBatchSelectEntity {
        status: Status;
        key: IKey;
        meta?: IRecordMetadata;
        bins?: AerospikeBins;
    }

    interface IIndexOptions {
        ns: string;
        set: string;
        bin: string;
        index: string;
        type?: IndexType;
        datatype: IndexDataType;
    }

    interface ITypedIndexOptions {
        ns: string;
        set: string;
        bin: string;
        index: string;
        type?: IndexType;
    }

    type TypedCallback<T> = (error?: Error, result?: T) => void;

    interface IInfoNode {
        node_id: string;
    }

    interface IInfoAllResponse {
        host: IInfoNode;
        info: string;
    }

    interface IInfoNodeParam {
        name: string;
    }

    class Client extends EventEmitter {
        public config: Config;
        private as_client: AddonAerospikeClient;
        private connected: boolean;
        public captureStackTraces: boolean;
        constructor(config: IConfigOptions);
        private asExec(cmd: string, args?: any): any;
        public getNodes(): IAddonNode[];
        public addSeedHost(hostname: string, number?: number): void;
        public removeSeedHost(hostname: string, number?: number): void;
        public batchExists(keys: IKey[], policy?: BatchPolicy): Promise<IBatchResult[]>;
        public batchExists(keys: IKey[], callback: TypedCallback<IBatchResult[]>): void;
        public batchExists(keys: IKey[], policy?: BatchPolicy, callback: TypedCallback<IBatchResult[]>): void;
        public batchGet(keys: IBatchReadRecord[], policy?: BatchPolicy): Promise<AerospikeRecord[]>;
        public batchGet(keys: IBatchReadRecord[], callback: TypedCallback<AerospikeRecord[]>): void;
        public batchGet(keys: IBatchReadRecord[], policy?: BatchPolicy, callback: TypedCallback<AerospikeRecord[]>): void;
        public batchSelect(keys: IKey[], bins: string[], policy?: BatchPolicy): Promise<IBatchSelectEntity[]>;
        public batchSelect(keys: IKey[], bins: string[], callback: TypedCallback<IBatchSelectEntity[]>): void;
        public batchSelect(keys: IKey[], bins: string[], policy?: BatchPolicy, callback: TypedCallback<IBatchSelectEntity[]>): void;
        public close(releaseEventLoop?: boolean): void;
        public connect(callback?: TypedCallback<Client>): Promise<Client>;
        public createIndex(options: IIndexOptions, policy?: InfoPolicy): Promise<IndexJob>;
        public createIndex(options: IIndexOptions, callback: TypedCallback<IndexJob>): void;
        public createIndex(options: IIndexOptions, policy?: InfoPolicy, callback: TypedCallback<IndexJob>): void;
        public createIntegerIndex(options: ITypedIndexOptions, policy: InfoPolicy): Promise<IndexJob>;
        public createIntegerIndex(options: ITypedIndexOptions, callback: TypedCallback<IndexJob>): void;
        public createIntegerIndex(options: ITypedIndexOptions, policy?: InfoPolicy, callback: TypedCallback<IndexJob>): void;
        public createStringIndex(options: ITypedIndexOptions, policy: InfoPolicy): Promise<IndexJob>;
        public createStringIndex(options: ITypedIndexOptions, callback: TypedCallback<IndexJob>): void;
        public createStringIndex(options: ITypedIndexOptions, policy?: InfoPolicy, callback: TypedCallback<IndexJob>): void;
        public createGeo2DSphereIndex(options: ITypedIndexOptions, policy: InfoPolicy): Promise<IndexJob>;
        public createGeo2DSphereIndex(options: ITypedIndexOptions, callback: TypedCallback<IndexJob>): void;
        public createGeo2DSphereIndex(options: ITypedIndexOptions, policy?: InfoPolicy, callback: TypedCallback<IndexJob>): void;
        public apply(key: IKey, udfArgs: IAddonUDF, policy?: ApplyPolicy): Promise<any>;
        public apply(key: IKey, udfArgs: IAddonUDF, callback: AddonCallback): void;
        public apply(key: IKey, udfArgs: IAddonUDF, policy?: ApplyPolicy, callback: AddonCallback): void;
        public exists(key: IKey, policy?: ReadPolicy): Promise<boolean>;
        public exists(key: IKey, policy?: ReadPolicy, callback: TypedCallback<boolean>): void;
        public get(key: IKey, policy?: ReadPolicy): Promise<AerospikeRecord>;
        public get(key: IKey, policy?: ReadPolicy, callback: TypedCallback<AerospikeRecord>): void;
        public indexRemove(namespace: string, index: string, policy?: InfoPolicy): Promise<void>;
        public indexRemove(namespace: string, index: string, callback: TypedCallback<void>): void;
        public indexRemove(namespace: string, index: string, policy?: InfoPolicy, callback: TypedCallback<void>): void;
        public info(request?: string, host: IHost | string, policy?: InfoPolicy): Promise<string>;
        public info(request?: string, host: IHost | string, callback: TypedCallback<string>): void;
        public info(request?: string, host: IHost | string, policy?: InfoPolicy, callback: TypedCallback<string>): void;
        public infoAny(request?: string, policy?: InfoPolicy): Promise<string>;
        public infoAny(request?: string, callback: TypedCallback<string>): void;
        public infoAny(request?: string, policy?: InfoPolicy, callback: TypedCallback<string>): void;
        public infoAll(request?: string, policy?: InfoPolicy): Promise<IInfoAllResponse[]>;
        public infoAll(request?: string, callback: TypedCallback<IInfoAllResponse[]>): void;
        public infoAll(request?: string, policy?: InfoPolicy, callback: TypedCallback<IInfoAllResponse[]>): void;
        public infoNode(request?: string, node: IInfoNodeParam, policy?: InfoPolicy): Promise<string>;
        public infoNode(request?: string, node: IInfoNodeParam, callback: TypedCallback<string>): void;
        public infoNode(request?: string, node: IInfoNodeParam, policy?: InfoPolicy, callback: TypedCallback<string>): void;
        public isConnected(checkTenderErrors?: boolean): boolean;
        public operate(key: IKey, operations: Operation[], metadata?: IRecordMetadata, policy?: OperatePolicy): Promise<AerospikeRecord>;
        public operate(key: IKey, operations: Operation[], callback: TypedCallback<AerospikeRecord>): void;
        public operate(key: IKey, operations: Operation[], metadata?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public operate(key: IKey, operations: Operation[], metadata?: IRecordMetadata, policy: OperatePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public append(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, policy?: OperatePolicy): Promise<AerospikeRecord>;
        public append(key: IKey, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
        public append(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public append(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, policy?: OperatePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public prepend(key: IKey, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
        public prepend(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public prepend(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, policy?: OperatePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public add(key: IKey, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
        public add(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public add(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, policy?: OperatePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public incr(key: IKey, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
        public incr(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public incr(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata, policy?: OperatePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public put(key: IKey, bins: AerospikeBins, meta?: IRecordMetadata, policy?: WritePolicy): Promise<AerospikeRecord>;
        public put(key: IKey, bins: AerospikeBins, callback: TypedCallback<AerospikeRecord>): void;
        public put(key: IKey, bins: AerospikeBins, meta?: IRecordMetadata, callback: TypedCallback<AerospikeRecord>): void;
        public put(key: IKey, bins: AerospikeBins, meta?: IRecordMetadata, policy?: WritePolicy, callback: TypedCallback<AerospikeRecord>): void;
        public query(ns: string, set: string, options?: IQueryOptions): Query;
        public remove(key: IKey, policy?: RemovePolicy): Promise<IKey>;
        public remove(key: IKey, callback: TypedCallback<IKey>): void;
        public remove(key: IKey, policy?: RemovePolicy, callback: TypedCallback<IKey>): void;
        public scan(ns: string, set: string, options: IScanOptions): Scan;
        public select(key: IKey, bins: string[], policy?: ReadPolicy): Promise<AerospikeRecord>;
        public select(key: IKey, bins: string[], callback: TypedCallback<AerospikeRecord>): void;
        public select(key: IKey, bins: string[], policy?: ReadPolicy, callback: TypedCallback<AerospikeRecord>): void;
        public truncate(ns: string, set: string | null, beforeNanos: number, policy?: InfoPolicy): Promise<void>;
        public truncate(ns: string, set: string | null, beforeNanos: number, callback: TypedCallback<void>): void;
        public udfRegister(udfPath: string, udfType?: Language, policy?: InfoPolicy): Promise<Job>;
        public udfRegister(udfPath: string, callback: TypedCallback<Job>): void;
        public udfRegister(udfPath: string, udfType?: Language, callback: TypedCallback<Job>): void;
        public udfRegister(udfPath: string, udfType?: Language, policy?: InfoPolicy, callback: TypedCallback<Job>): void;
        public stats(): IAddonStats;
        public udfRemove(udfModule: string, policy?: InfoPolicy): Promise<Job>;
        public udfRemove(udfModule: string, callback: TypedCallback<Job>): void;
        public udfRemove(udfModule: string, policy?: InfoPolicy, callback: TypedCallback<Job>): void;
        public updateLogging(logConfig: ILogInfo): void;
        keyfilePassword?: string;
        certfile?: string;
        crlCheck?: boolean;
        crlCheckAll?: boolean;
        logSessionInfo?: boolean;
        forLoginOnly?: boolean;
    }

    interface IHost {
        addr: string;
        port?: number;
        tlsname?: string;
    }

    interface IConfigPolicies {
        apply?: ApplyPolicy;
        batch?: BasePolicy;
        info?: InfoPolicy;
        operate?: OperatePolicy;
        read?: ReadPolicy;
        remove?: RemovePolicy;
        scan?: ScanPolicy;
        query?: QueryPolicy;
        write?: WritePolicy;
    }

    interface IConfigLog {
        level?: Log;
        file?: number;
    }

    interface IConfigModLua {
        userPath?: string;
    }

    interface IConfigSharedMemory {
        enable?: boolean;
        key: number;
        maxNodes?: number;
        maxNamespaces?: number;
        takeoverThresholdSeconds?: number;
    }

    interface IConfigOptions {
        user?: string;
        password?: string;
        authMode?: Auth;
        clusterName?: string;
        port?: number;
        tls?: IConfigTLS;
        hosts?: IHost[] | string;
        policies?: IConfigPolicies;
        log?: IConfigLog;
        connTimeoutMs?: number;
        loginTimeoutMs?: number;
        maxSocketIdle?: number;
        tenderInterval?: number;
        maxConnsPerNode?: number;
        minConnsPerNode?: number;
        modlua?: IConfigModLua;
        sharedMemory?: IConfigSharedMemory;
        useAlternateAccessAddress?: boolean;
        rackAware?: boolean;
        rackId?: number;
    }

    class Config {
        public user?: string;
        public password?: string;
        public authMode?: Auth;
        public clusterName?: string;
        public port: number;
        public tls?: IConfigTLS;
        public hosts: IHost[] | string;
        public policies: IConfigPolicies;
        public log?: IConfigLog;
        public connTimeoutMs?: number;
        public loginTimeoutMs?: number;
        public maxSocketIdle?: number;
        public tenderInterval?: number;
        public maxConnsPerNode?: number;
        public minConnsPerNode?: number;
        public modlua: IConfigModLua;
        public sharedMemory?: IConfigSharedMemory;
        public useAlternateAccessAddress: boolean;
        public rackAware?: boolean;
        public rackId?: number;
        constructor(config?: IConfigOptions);
        public setDefaultPolicies(policies?: IConfigPolicies): void;
    }

    // double.js
    class Double {
        constructor(value: number);
        public Double: number;
        public value(): number;
    }

    // error.js
    class AerospikeError extends Error {
        readonly code: Status;
        readonly command: Command | null;
        readonly func: string | null;
        readonly file: string | null;
        readonly line: number | null;
        readonly inDoubt: boolean;
        constructor(message?: string, command: Command);
        static fromASError(asError?: AerospikeError | Error, command: Command): AerospikeError;
        static copyASErrorProperties(target: AerospikeError, source: Error): void;
        static formatMessage(message: string, code: Status): string;
        private setStackTrace(stack: string): void;
        public isServerError(): boolean;
        readonly get client(): Client | void;
    }

    // geojson.js
    type GeoJSONType = {
        type: string,
        coordinates: Array<number[] | number>
    }

    class GeoJSON {
        public str: string;
        constructor(json: string | object);
        static Point(lng: number, lat: number): GeoJSON;
        static Polygon(...coordinates: number[][]): GeoJSON;
        static Circle(lng: number, lat: number, radius: number);
        public toJSON(): GeoJSONType;
        public value(): GeoJSONType;
        public toString(): string;
    }

    // hll.js
    class HLLOperation extends Operation {
        public withPolicy(policy: HLLPolicy): HLLOperation;
    }

    // index_job.js
    interface ISindexInfoEntity {
        load_pct: number;
    }
    class IndexJob extends Job {
        public namespace: string;
        public indexName: string;
        constructor(client: Client, namespace: string, indexName: string);
        private hasCompleted(sindexInfo: ISindexInfoEntity[]): boolean;
        private info(): Promise<ISindexInfoEntity[]>
    }

    // job.js
    interface IJobInfoResponse {
        progressPct: number;
        recordsRead: number;
        status: JobStatus;
    }

    class Job {
        public client: Client;
        public jobID: number;
        public module: string;
        constructor(client: Client, jobID: number, module: string);
        static safeRandomJobID(): number;
        static pollUntilDone(statusFunction: () => Promise<boolean>, pollInterval?: number): Promise<void>;
        private hasCompleted(info: IJobInfoResponse): Promise<boolean>;
        private checkStatus(): Promise<boolean>;
        public info(policy?: InfoPolicy): Promise<IJobInfoResponse>;
        public info(callback: TypedCallback<IJobInfoResponse>): void;
        public info(policy?: InfoPolicy, callback: TypedCallback<IJobInfoResponse>): void;
        public wait(poolInterval?: number): Promise<void>;
        public wait(callback: TypedCallback<void>): void;
        public wait(pollInterval?: number, callback: TypedCallback<void>): void;
        public waitUntilDone(pollInterval?: number): Promise<void>;
        public waitUntilDone(callback: TypedCallback<void>): void;
        public waitUntilDone(pollInterval?: number, callback: TypedCallback<void>): void;
    }

    // key.js
    interface IKey {
        ns: string;
        set: string;
        key: string | number | Buffer;
        digest?: Buffer;
    }

    class Key implements IKey {
        constructor(ns: string, set: string, key: string | number | Buffer, digest?: Buffer);
        static fromASKey(keyObj: IKey): Key;
        public equals(other: IKey): boolean;
    }

    // record.js
    interface IRecordMetadata {
        ttl: number;
        gen: number;
    }

    // record_stream.js
    class RecordStream extends Stream {
        public aborted: boolean;
        public client: Client;
        public writable: boolean;
        public readable: boolean;
        public _read(): void;
        public abort(): void;
    }

    // scan.js
    interface IScanOptions {
        select?: string[];
        nobins?: boolean;
        concurrent?: boolean;
    }

    class Scan {
        public client: Client;
        public ns: string;
        public set: string;
        public selected?: string[];
        public nobins?: boolean;
        public concurrent?: boolean;
        public udf?: IAddonUDF;
        public ops?: Operation[];
        constructor(client: Client, ns: string, set: string, options?: IScanOptions);
        public select(bins: string[]): void;
        public select(...bins: string[]): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: ScanPolicy, scanID?: number): Promise<Job>;
        public background(udfModule: string, udfFunction: string, callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: ScanPolicy, callback: TypedCallback<Job>): void;
        public background(udfModule: string, udfFunction: string, udfArgs?: any[], policy?: ScanPolicy, scanID?: number, callback: TypedCallback<Job>): void;
        public operate(operations: Operation[], policy?: ScanPolicy, scanID?: number): Promise<Job>;
        public operate(operations: Operation[], policy?: ScanPolicy, scanID?: number, callback: TypedCallback<Job>): void;
        public foreach(policy?: ScanPolicy, dataCb?: (data: AerospikeRecord) => void, errorCb?: (error: Error) => void, endCb: () => void): RecordStream;
    }

    class AerospikeRecord {
        public key: IKey;
        public bins: AerospikeRecord;
        public ttl: number;
        public gen: gen;
        constructor(key: IKey, bins: AerospikeBins, metadata?: IRecordMetadata);
    }

    export interface FilterModule {
        SindexFilterPredicate: SindexFilterPredicate,
        range(bin: string, min: number, max: number, indexType?: IndexType): RangePredicate;
        equal(bin: string, value: string): EqualPredicate;
        contains(bin: string, value: string | number, indexType?: IndexType): EqualPredicate;
        geoWithinGeoJSONRegion(bin: string, value: GeoJSON, indexType?: IndexType): GeoPredicate;
        geoContainsGeoJSONPoint(bin: string, value: GeoJSON, indexType?: IndexType): GeoPredicate;
        geoWithinRadius(bin: string, lng: number, lat: number, radius: number, indexType?: IndexType): GeoPredicate;
        geoContainsPoint(bin: string, lng: number, lat: number, indexType?: IndexType): GeoPredicate;
    }

    export interface PredexpModule {
        PredicateExpression: PredicateExpression,
        and(nexpr: number): PredicateExpression;
        or(count: number): PredicateExpression;
        not(): PredicateExpression;
        integerValue(value: number): PredicateExpression;
        stringValue(value: string): PredicateExpression;
        geojsonValue(value: GeoJSON): PredicateExpression;
        integerBin(bin: string): PredicateExpression;
        stringBin(bin: string): PredicateExpression;
        geojsonBin(bin: string): PredicateExpression;
        listBin(bin: string): PredicateExpression;
        mapBin(bin: string): PredicateExpression;
        integerVar(name: string): PredicateExpression;
        stringVar(name: string): PredicateExpression;
        geojsonVar(name: string): PredicateExpression;
        recDeviceSize(): PredicateExpression;
        recLastUpdate(): PredicateExpression;
        recVoidTime(): PredicateExpression;
        recDigestModulo(mod: number): PredicateExpression;
        integerEqual(): PredicateExpression;
        integerUnequal(): PredicateExpression;
        integerGreater(): PredicateExpression;
        integerGreaterEq(): PredicateExpression;
        integerLess(): PredicateExpression;
        integerLessEq(): PredicateExpression;
        stringEqual(): PredicateExpression;
        stringUnequal(): PredicateExpression;
        stringRegex(flags?: number): PredicateExpression;
        geojsonWithin(): PredicateExpression;
        geojsonContains(): PredicateExpression;
        listIterateOr(name: string): PredicateExpression;
        listIterateAnd(name: string): PredicateExpression;
        mapKeyIterateOr(name: string): PredicateExpression;
        mapKeyIterateAnd(name: string): PredicateExpression;
        mapValIterateOr(name: string): PredicateExpression;
        mapValIterateAnd(name: string): PredicateExpression;
    }

    export interface ListsModule {
        order: ListOrder;
        sortFlags: ListSortFlags;
        writeFlags: ListWriteFlags;
        returnType: ListReturnType;
        setOrder(bin: name, order: ListOrder): ListOperation;
        sort(bin: string, flags: ListSortFlags): ListOperation;
        append(bin: string, value: AerospikeRecordValue, policy?: ListPolicy): ListOperation;
        appendItems(bin: string, list: AerospikeRecordValue[], policy?: ListPolicy): ListOperation;
        insert(bin: string, index: number, value: AerospikeRecordValue, policy?: ListPolicy): ListOperation;
        insertItems(bin: string, index: number, list: AerospikeRecordValue[], policy?: ListPolicy): ListOperation;
        pop(bin: string, index: number): ListOperation;
        popRange(bin: string, index: number, count?: number): ListOperation;
        remove(bin: string, index: number): ListOperation;
        removeRange(bin: string, index: number, count?: number): ListOperation;
        removeByIndex(bin: string, index: number, returnType?: ListReturnType): ListOperation;
        removeByIndexRange(bin: string, index: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        removeByValue(bin: string, value: AerospikeRecordValue, returnType?: ListReturnType): InvertibleListOp;
        removeByValueList(bin: string, values: AerospikeRecordValue[], returnType?: ListReturnType): InvertibleListOp;
        removeByValueRange(bin: string, begin: number | null, end: number | null, returnType?: ListReturnType): InvertibleListOp;
        removeByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        removeByRank(bin: string, rank: number, returnType?: ListReturnType): ListOperation;
        removeByRankRange(bin: string, rank: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        clear(bin: string): ListOperation;
        set(bin: string, index: number, value: AerospikeRecordValue, policy?: ListPolicy): ListOperation;
        trim(bin: string, index: number, count: number): ListOperation;
        get(bin: string, index: number): ListOperation;
        getRange(bin: string, index: number, count?: number): ListOperation;
        getByIndex(bin: string, index: number, returnType?: ListReturnType): ListOperation;
        getByIndexRange(bin: string, index: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        getByValue(bin: string, value: AerospikeRecordValue, returnType?: ListReturnType): InvertibleListOp;
        getByValueList(bin: string, values: AerospikeRecordValue[], returnType?: ListReturnType): InvertibleListOp;
        getByValueRange(bin: string, begin: number | null, end: number | null, returnType?: ListReturnType): InvertibleListOp;
        getByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        getByRank(bin: string, rank: number, returnType?: ListReturnType): ListOperation;
        getByRankRange(bin: string, rank: number, count?: number, returnType?: ListReturnType): InvertibleListOp;
        increment(bin: string, index: number, value?: number, policy?: ListPolicy): ListOperation;
        size(bin: string): ListOperation;
    }

    export interface MapsModule {
        order: MapsOrder;
        writeMode: MapsWriteMode;
        writeFlags: MapsWriteFlags;
        returnType: MapReturnType;
        MapPolicy: MapPolicy;
        setPolicy(bin: string, policy: MapPolicy): MapOperation;
        put(bin: string, key: string, value: AerospikeRecordValue, policy?: MapPolicy): MapOperation;
        putItems(bin: string, items: AerospikeBins, policy?: MapPolicy): MapOperation;
        increment(bin: string, key: string, incr?: number, policy?: MapPolicy): MapOperation;
        decrement(bin: string, key: string, decr: number, policy?: MapPolicy): MapOperation;
        clear(bin: string): MapOperation;
        removeByKey(bin: string, key: string, returnType?: MapReturnType): MapOperation;
        removeByKeyList(bin: string, keys: string[], returnType?: MapReturnType): MapOperation;
        removeByKeyRange(bin: string, begin: string | null, end: string | null, returnType?: MapReturnType): MapOperation;
        removeByKeyRelIndexRange(bin: string, key: string, index: number, count?: number, returnType?: MapReturnType): MapOperation;
        removeByValue(bin: string, value: AerospikeRecordValue, returnType?: MapReturnType): MapOperation;
        removeByValueList(bin: string, values: AerospikeRecordValue[], returnType?: MapReturnType): MapOperation;
        removeByValueRange(bin: string, begin: number | null, end: number | null, returnType?: MapReturnType): MapOperation;
        removeByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: MapReturnType): MapOperation;
        removeByIndex(bin: string, index: number, returnType?: MapReturnType): MapOperation;
        removeByIndexRange(bin: string, index: number, count?: number, returnType?: MapReturnType): MapOperation;
        removeByRank(bin: string, rank: number, returnType?: MapReturnType): MapOperation;
        removeByRankRange(bin: string, rank: number, count?: number, returnType?: MapReturnType): MapOperation;
        size(bin: string): MapOperation;
        getByKey(bin: string, key: string, returnType?: MapReturnType): MapOperation;
        getByKeyRange(bin: string, begin: string | null, end: string | null, returnType?: MapReturnType): MapOperation;
        getByKeyRelIndexRange(bin: string, key: string, index: number, count?: number, returnType?: MapReturnType): MapOperation;
        getByValue(bin: string, value: AerospikeRecordValue, returnType?: MapReturnType): MapOperation;
        getByValueRange(bin: string, begin: number | null, end: number | null, returnType?: MapReturnType): MapOperation;
        getByValueRelRankRange(bin: string, value: number, rank: number, count?: number, returnType?: MapReturnType): MapOperation;
        getByIndex(bin: string, index: number, returnType?: MapReturnType): MapOperation;
        getByIndexRange(bin: string, index: number, count?: number, returnType?: MapReturnType): MapOperation;
        getByRank(bin: string, rank: number, returnType?: MapReturnType): MapOperation;
        getByRankRange(bin: string, rank: number, count?: number, returnType?: MapReturnType): MapOperation;
    }

    export interface BitwiseModule {
        writeFlags: BitwiseWriteFlags;
        resizeFlags: BitwiseResizeFlags;
        overflow: BitwiseOverflow;
        resize(bin: string, size: number, flags?: BitwiseResizeFlags): BitwiseOperation;
        insert(bin: string, byteOffset: number, value: Buffer): BitwiseOperation;
        remove(bin: string, byteOffset: number, byteSize: number): BitwiseOperation;
        set(bin: string, bitOffset: number, bitSize: number, value: number | Buf): BitwiseOperation;
        or(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
        xor(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
        and(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
        not(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
        lshift(bin: string, bitOffset: number, bitSize: string, shift: number): BitwiseOperation;
        rshift(bin: string, bitOffset: number, bitSize: string, shift: number): BitwiseOperation;
        add(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
        subtract(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
        get(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
        getInt(bin: string, bitOffset: number, bitSize: number, sign: boolean): BitwiseOperation;
        lscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
        rscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
    }

    export interface InfoModule {
        parse(info: string): Record<string, any>;
        separators: Object<string, string[]>;
    }

    export interface CdtModule {
        Context: CdtContext;
    }

    type AnyPolicy = ApplyPolicy | BasePolicy | InfoPolicy | OperatePolicy | QueryPolicy | ReadPolicy | RemovePolicy | ScanPolicy | WritePolicy;

    export interface PolicyModule {
        gen: PolicyGen;
        exists: PolicyExists;
        replica: PolicyReplica;
        readModeAP: PolicyReadModeAP;
        readModeSC: PolicyReadModeSC;
        commitLevel: PolicyCommitLevel;
        ApplyPolicy: ApplyPolicy;
        BatchPolicy: BatchPolicy;
        CommandQueuePolicy: CommandQueuePolicy;
        InfoPolicy: InfoPolicy;
        ListPolicy: ListPolicy;
        MapPolicy: MapPolicy;
        OperatePolicy: OperatePolicy;
        QueryPolicy: QueryPolicy;
        ReadPolicy: ReadPolicy;
        RemovePolicy: RemovePolicy;
        ScanPolicy: ScanPolicy;
        WritePolicy: WritePolicy;
        createPolicy(type: string, values: AnyPolicy | Record<string, any>): AnyPolicy;
    }

    export interface StatusModule {
        ERR_ASYNC_QUEUE_FULL: Status.AEROSPIKE_ERR_ASYNC_QUEUE_FULL;
        ERR_CONNECTION: Status.AEROSPIKE_ERR_INVALID_NODE;
        ERR_INVALID_NODE: Status.AEROSPIKE_ERR_INVALID_NODE,
        ERR_NO_MORE_CONNECTIONS: Status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS;
        ERR_ASYNC_CONNECTION: Status.AEROSPIKE_ERR_ASYNC_CONNECTION;
        ERR_CLIENT_ABORT: Status.AEROSPIKE_ERR_CLIENT_ABORT;
        ERR_INVALID_HOST: Status.AEROSPIKE_ERR_INVALID_HOST;
        NO_MORE_RECORDS: Status.AEROSPIKE_NO_MORE_RECORDS;
        ERR_PARAM: Status.AEROSPIKE_ERR_PARAM;
        OK: Status.AEROSPIKE_OK;
        ERR_SERVER: Status.AEROSPIKE_ERR_SERVER;
        ERR_RECORD_NOT_FOUND: Status.AEROSPIKE_ERR_RECORD_NOT_FOUND;
        ERR_RECORD_GENERATION: Status.AEROSPIKE_ERR_RECORD_GENERATION;
        ERR_REQUEST_INVALID: Status.AEROSPIKE_ERR_REQUEST_INVALID;
        ERR_RECORD_EXISTS: Status.AEROSPIKE_ERR_RECORD_EXISTS;
        ERR_BIN_EXISTS: Status.AEROSPIKE_ERR_BIN_EXISTS;
        ERR_CLUSTER_CHANGE: Status.AEROSPIKE_ERR_CLUSTER_CHANGE;
        ERR_SERVER_FULL: Status.AEROSPIKE_ERR_SERVER_FULL;
        ERR_TIMEOUT: Status.AEROSPIKE_ERR_TIMEOUT;
        ERR_ALWAYS_FORBIDDEN: Status.AEROSPIKE_ERR_ALWAYS_FORBIDDEN;
        ERR_CLUSTER: Status.AEROSPIKE_ERR_CLUSTER;
        ERR_BIN_INCOMPATIBLE_TYPE: Status.AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE;
        ERR_RECORD_TOO_BIG: Status.AEROSPIKE_ERR_RECORD_TOO_BIG;
        ERR_RECORD_BUSY: Status.AEROSPIKE_ERR_RECORD_BUSY;
        ERR_SCAN_ABORTED: Status.AEROSPIKE_ERR_SCAN_ABORTED;
        ERR_UNSUPPORTED_FEATURE: Status.AEROSPIKE_ERR_UNSUPPORTED_FEATURE;
        ERR_BIN_NOT_FOUND: Status.AEROSPIKE_ERR_BIN_NOT_FOUND;
        ERR_DEVICE_OVERLOAD: Status.AEROSPIKE_ERR_DEVICE_OVERLOAD;
        ERR_RECORD_KEY_MISMATCH: Status.AEROSPIKE_ERR_RECORD_KEY_MISMATCH;
        ERR_NAMESPACE_NOT_FOUND: Status.AEROSPIKE_ERR_NAMESPACE_NOT_FOUND;
        ERR_BIN_NAME: Status.AEROSPIKE_ERR_BIN_NAME;
        ERR_FAIL_FORBIDDEN: Status.AEROSPIKE_ERR_FAIL_FORBIDDEN;
        ERR_FAIL_ELEMENT_NOT_FOUND: Status.AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND;
        ERR_FAIL_ELEMENT_EXISTS: Status.AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS;
        ERR_ENTERPRISE_ONLY: Status.AEROSPIKE_ERR_ENTERPRISE_ONLY;
        // TODO: Remove ERR_FAIL_ENTERPRISE_ONLY - referring to status.js#252
        ERR_FAIL_ENTERPRISE_ONLY: Status.AEROSPIKE_ERR_FAIL_ENTERPRISE_ONLY;
        ERR_OP_NOT_APPLICABLE: Status.AEROSPIKE_ERR_OP_NOT_APPLICABLE;
        FILTERED_OUT: Status.AEROSPIKE_FILTERED_OUT;
        LOST_CONFLICT: Status.AEROSPIKE_LOST_CONFLICT;
        QUERY_END: Status.AEROSPIKE_QUERY_END;
        SECURITY_NOT_SUPPORTED: Status.AEROSPIKE_SECURITY_NOT_SUPPORTED;
        SECURITY_NOT_ENABLED: Status.AEROSPIKE_SECURITY_NOT_ENABLED;
        SECURITY_SCHEME_NOT_SUPPORTED: Status.AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED;
        INVALID_COMMAND: Status.AEROSPIKE_INVALID_COMMAND;
        INVALID_FIELD: Status.AEROSPIKE_INVALID_FIELD;
        ILLEGAL_STATE: Status.AEROSPIKE_ILLEGAL_STATE;
        INVALID_USER: Status.AEROSPIKE_INVALID_USER;
        USER_ALREADY_EXISTS: Status.AEROSPIKE_USER_ALREADY_EXISTS;
        INVALID_PASSWORD: Status.AEROSPIKE_INVALID_PASSWORD;
        EXPIRED_PASSWORD: Status.AEROSPIKE_EXPIRED_PASSWORD;
        FORBIDDEN_PASSWORD: Status.AEROSPIKE_FORBIDDEN_PASSWORD;
        INVALID_CREDENTIAL: Status.AEROSPIKE_INVALID_CREDENTIAL;
        INVALID_ROLE: Status.AEROSPIKE_INVALID_ROLE;
        ROLE_ALREADY_EXISTS: Status.AEROSPIKE_ROLE_ALREADY_EXISTS;
        INVALID_PRIVILEGE: Status.AEROSPIKE_INVALID_PRIVILEGE;
        NOT_AUTHENTICATED: Status.AEROSPIKE_NOT_AUTHENTICATED;
        ROLE_VIOLATION: Status.AEROSPIKE_ROLE_VIOLATION;
        ERR_UDF: Status.AEROSPIKE_ERR_UDF;
        ERR_BATCH_DISABLED: Status.AEROSPIKE_ERR_BATCH_DISABLED;
        ERR_BATCH_MAX_REQUESTS_EXCEEDED: Status.AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED;
        ERR_BATCH_QUEUES_FULL: Status.AEROSPIKE_ERR_BATCH_QUEUES_FULL;
        ERR_GEO_INVALID_GEOJSON: Status.AEROSPIKE_ERR_GEO_INVALID_GEOJSON;
        ERR_INDEX_FOUND: Status.AEROSPIKE_ERR_INDEX_FOUND;
        ERR_INDEX_NOT_FOUND: Status.AEROSPIKE_ERR_INDEX_NOT_FOUND;
        ERR_INDEX_OOM: Status.AEROSPIKE_ERR_INDEX_OOM;
        ERR_INDEX_NOT_READABLE: Status.AEROSPIKE_ERR_INDEX_NOT_READABLE;
        ERR_INDEX: Status.AEROSPIKE_ERR_INDEX;
        ERR_INDEX_NAME_MAXLEN: Status.AEROSPIKE_ERR_INDEX_NAME_MAXLEN;
        ERR_INDEX_MAXCOUNT: Status.AEROSPIKE_ERR_INDEX_MAXCOUNT;
        ERR_QUERY_ABORTED: Status.AEROSPIKE_ERR_QUERY_ABORTED;
        ERR_QUERY_QUEUE_FULL: Status.AEROSPIKE_ERR_QUERY_QUEUE_FULL;
        ERR_QUERY_TIMEOUT: Status.AEROSPIKE_ERR_QUERY_TIMEOUT;
        ERR_QUERY: Status.AEROSPIKE_ERR_QUERY;
        ERR_UDF_NOT_FOUND: Status.AEROSPIKE_ERR_UDF_NOT_FOUND;
        ERR_LUA_FILE_NOT_FOUND: Status.AEROSPIKE_ERR_LUA_FILE_NOT_FOUND;
        getMessage(code: Status): string;
    }

    export interface HLLModule {
        writeFlags: HLLWriteFlags;
        init(bin: string, indexBits: number, minhashBits: number): HLLOperation;
        add(bin: string, list: AerospikeRecordValue[], indexBits?: number, minhashBits?: number): HLLOperation;
        setUnion(bin: string, list: AerospikeRecordValue[]): HLLOperation;
        refreshCount(bin: string): HLLOperation;
        fold(bin: string, indexBits: number): HLLOperation;
        getCount(bin: string): HLLOperation;
        getUnion(bin: string, list: AerospikeRecordValue[]): HLLOperation;
        getUnionCount(bin: string, list: AerospikeRecordValue[]): HLLOperation;
        getIntersectCount(bin: string, list: AerospikeRecordValue[]);
        getSimilarity(bin: string, list: AerospikeRecordValue[]): HLLOperation;
        describe(bin: string): HLLOperation;
    }

    interface FeaturesModule {
        CDT_MAP: string;
        CDT_LIST: string;
        BLOB_BITS: string;
    }

    interface OperationsModule {
        Operation: Operation;
        read(bin: string): Operation;
        write(bin: string, value: AerospikeRecordValue): WriteOperation;
        add(bin: string, value: number | Double): AddOperation;
        incr(bin: string, value: number | Double): AddOperation;
        append(bin: string, value: string | Buffer): AppendOperation;
        prepend(bin: string, value: string | Buffer): PrependOperation;
        touch(ttl: number): TouchOperation;
        delete(): Operation;
    }

    interface ILogInfo {
        level?: LogLevel;
        file?: Number;
    }

    export declare const filter: FilterModule;
    export declare const predexp: PredexpModule;
    export declare enum regex {
        BASIC,
        EXTENDED,
        ICASE,
        NEWLINE
    }
    export declare const info: InfoModule;
    export declare const lists: ListsModule
    export declare const hll: HLLModule;
    export declare const maps: MapsModule;
    export declare const cdt: CdtModule;
    export declare const bitwise: BitwiseModule;
    export declare const operations: OperationsModule;
    export declare const policy: PolicyModule;
    export declare const ApplyPolicy: ApplyPolicy;
    export declare const BatchPolicy: BatchPolicy;
    export declare const CommandQueuePolicy: CommandQueuePolicy;
    export declare const InfoPolicy: InfoPolicy;
    export declare const ListPolicy: ListPolicy;
    export declare const MapPolicy: MapPolicy;
    export declare const OperatePolicy: OperatePolicy;
    export declare const QueryPolicy: QueryPolicy;
    export declare const ReadPolicy: ReadPolicy;
    export declare const RemovePolicy: RemovePolicy;
    export declare const ScanPolicy: ScanPolicy;
    export declare const WritePolicy: WritePolicy;
    export declare const status: StatusModule;
    export declare const features: FeaturesModule;
    export declare const AerospikeError: AerospikeError;
    export declare const Client: Client;
    export declare const Config: Config;
    export declare const Double: Double;
    export declare const GeoJSON: GeoJSON;
    export declare const Key: Key;
    export declare const Record: AerospikeRecord;
    export declare const auth: Auth;
    export declare const language: Language;
    export declare const log: Log;
    export declare const ttl: TTL;
    export declare const jobStatus: JobStatus;
    export declare const indexDataType: IndexDataType;
    export declare const indexType: IndexType;
    export declare function print(err: Error, result: any): void;
    export declare function releaseEventLoop(): void;
    export declare function client(config: IConfigOptions): Client;
    export declare function connect(config: IConfigOptions, callback?: (error?: Error, client?: Client) => void): Promise<Client>;
    export declare function setDefaultLogging(ILogInfo: ILogInfo): void;
    export declare function setupGlobalCommandQueue(policy: CommandQueuePolicy): void;
}

export = Aerospike