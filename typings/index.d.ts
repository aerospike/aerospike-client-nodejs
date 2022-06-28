declare module "status" {
    export const ERR_INVALID_NODE: any;
    export const ERR_NO_MORE_CONNECTIONS: any;
    export const ERR_ASYNC_CONNECTION: any;
    export const ERR_CLIENT_ABORT: any;
    export const ERR_INVALID_HOST: any;
    export const NO_MORE_RECORDS: any;
    export const ERR_PARAM: any;
    export const ERR_CLIENT: any;
    export const OK: any;
    export const ERR_SERVER: any;
    export const ERR_RECORD_NOT_FOUND: any;
    export const ERR_RECORD_GENERATION: any;
    export const ERR_REQUEST_INVALID: any;
    export const ERR_RECORD_EXISTS: any;
    export const ERR_BIN_EXISTS: any;
    export const ERR_CLUSTER_CHANGE: any;
    export const ERR_SERVER_FULL: any;
    export const ERR_TIMEOUT: any;
    export const ERR_ALWAYS_FORBIDDEN: any;
    export const ERR_CLUSTER: any;
    export const ERR_BIN_INCOMPATIBLE_TYPE: any;
    export const ERR_RECORD_TOO_BIG: any;
    export const ERR_RECORD_BUSY: any;
    export const ERR_SCAN_ABORTED: any;
    export const ERR_UNSUPPORTED_FEATURE: any;
    export const ERR_BIN_NOT_FOUND: any;
    export const ERR_DEVICE_OVERLOAD: any;
    export const ERR_RECORD_KEY_MISMATCH: any;
    export const ERR_NAMESPACE_NOT_FOUND: any;
    export const ERR_BIN_NAME: any;
    export const ERR_FAIL_FORBIDDEN: any;
    export const ERR_FAIL_ELEMENT_NOT_FOUND: any;
    export const ERR_FAIL_ELEMENT_EXISTS: any;
    export const ERR_ENTERPRISE_ONLY: any;
    export const ERR_FAIL_ENTERPRISE_ONLY: any;
    export const ERR_OP_NOT_APPLICABLE: any;
    export const FILTERED_OUT: any;
    export const LOST_CONFLICT: any;
    export const QUERY_END: any;
    export const SECURITY_NOT_SUPPORTED: any;
    export const SECURITY_NOT_ENABLED: any;
    export const SECURITY_SCHEME_NOT_SUPPORTED: any;
    export const INVALID_COMMAND: any;
    export const INVALID_FIELD: any;
    export const ILLEGAL_STATE: any;
    export const INVALID_USER: any;
    export const USER_ALREADY_EXISTS: any;
    export const INVALID_PASSWORD: any;
    export const EXPIRED_PASSWORD: any;
    export const FORBIDDEN_PASSWORD: any;
    export const INVALID_CREDENTIAL: any;
    export const INVALID_ROLE: any;
    export const ROLE_ALREADY_EXISTS: any;
    export const INVALID_PRIVILEGE: any;
    export const NOT_AUTHENTICATED: any;
    export const ROLE_VIOLATION: any;
    export const ERR_UDF: any;
    export const ERR_BATCH_DISABLED: any;
    export const ERR_BATCH_MAX_REQUESTS_EXCEEDED: any;
    export const ERR_BATCH_QUEUES_FULL: any;
    export const ERR_GEO_INVALID_GEOJSON: any;
    export const ERR_INDEX_FOUND: any;
    export const ERR_INDEX_NOT_FOUND: any;
    export const ERR_INDEX_OOM: any;
    export const ERR_INDEX_NOT_READABLE: any;
    export const ERR_INDEX: any;
    export const ERR_INDEX_NAME_MAXLEN: any;
    export const ERR_INDEX_MAXCOUNT: any;
    export const ERR_QUERY_ABORTED: any;
    export const ERR_QUERY_QUEUE_FULL: any;
    export const ERR_QUERY_TIMEOUT: any;
    export const ERR_QUERY: any;
    export const ERR_UDF_NOT_FOUND: any;
    export const ERR_LUA_FILE_NOT_FOUND: any;
    export function getMessage(code: any): string;
}
declare module "error" {
    export = AerospikeError;
    class AerospikeError extends Error {
        private static fromASError;
        private static copyASErrorProperties;
        private static formatMessage;
        private constructor();
        code: number;
        command: any | null;
        func: string | null;
        file: string | null;
        line: number | null;
        inDoubt: boolean;
        private setStackTrace;
        isServerError(): boolean;
        get client(): any;
    }
}
declare module "policies/command_queue_policy" {
    export = CommandQueuePolicy;
    class CommandQueuePolicy {
        constructor(props?: {
            maxCommandsInProcess?: number | undefined;
            maxCommandsInQueue?: number | undefined;
            queueInitialCapacity?: number | undefined;
        } | undefined);
        maxCommandsInProcess: number;
        maxCommandsInQueue: number;
        queueInitialCapacity: number;
    }
}
declare module "event_loop" {
    export function releaseEventLoop(): void;
    export function registerASEventLoop(): void;
    export function referenceEventLoop(): void;
    export function unreferenceEventLoop(): void;
    export function setCommandQueuePolicy(policy: any): void;
}
declare module "geojson" {
    export = GeoJSON;
    function GeoJSON(json: any): GeoJSON;
    class GeoJSON {
        constructor(json: any);
        str: string | undefined;
        toJSON(): any;
        toString(): string;
        value(): any;
    }
    namespace GeoJSON {
        function Point(lng: number, lat: number): GeoJSON;
        function Polygon(...args: number[][]): GeoJSON;
        function Circle(lng: number, lat: number, radius: number): GeoJSON;
    }
}
declare module "filter" {
    export function range(bin: string, min: number, max: number, indexType?: number | undefined): any;
    export function equal(bin: string, value: string): any;
    export function contains(bin: string, value: (string | number), indexType: number): any;
    export function geoWithinGeoJSONRegion(bin: string, value: GeoJSON, indexType?: number | undefined): any;
    export function geoContainsGeoJSONPoint(bin: string, value: GeoJSON, indexType?: number | undefined): any;
    export function geoWithinRadius(bin: string, lon: any, lat: number, radius: number, indexType?: number | undefined): any;
    export function geoContainsPoint(bin: string, lon: any, lat: number, indexType?: number | undefined): any;
    export class SindexFilterPredicate {
        constructor(predicate: any, bin: any, dataType: any, indexType: any, props: any);
        predicate: any;
        bin: any;
        datatype: any;
        type: any;
    }
    import GeoJSON = require("geojson");
}
declare module "cdt_context" {
    export = CdtContext;
    class CdtContext {
        static getContextType(ctx: CdtContext, type: number): number;
        items: any[];
        addListIndex(index: number): CdtContext;
        addListRank(rank: number): CdtContext;
        addListValue(value: any): CdtContext;
        addMapIndex(index: number): CdtContext;
        addMapRank(rank: number): CdtContext;
        addMapKey(key: any): CdtContext;
        addMapValue(value: any): CdtContext;
        private add;
    }
}
declare module "exp" {
    export function bool(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function int(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function uint(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function float(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function str(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function bytes(value: any, size: any): {
        [x: number]: any;
        op: any;
    }[];
    export function geo(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export function nil(): {
        op: any;
        value: null;
    }[];
    export function keyInt(): {
        [x: number]: any;
        op: any;
    }[];
    export function keyStr(): {
        [x: number]: any;
        op: any;
    }[];
    export function keyBlob(): {
        [x: number]: any;
        op: any;
    }[];
    export function keyExist(): AerospikeExp;
    export function binBool(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binInt(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binFloat(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binStr(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binBlob(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binGeo(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binList(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binMap(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binHll(binName: any): {
        [x: number]: any;
        op: any;
    }[];
    export function binType(binName: any): ({
        op: any;
        strVal: any;
    } | {
        op: any;
        count: number;
    })[];
    export function binExists(binName: string): boolean;
    export function setName(): {
        op: any;
        count: number;
    }[];
    export function deviceSize(): {
        op: any;
        count: number;
    }[];
    export function lastUpdate(): {
        op: any;
        count: number;
    }[];
    export function sinceUpdate(): {
        op: any;
        count: number;
    }[];
    export function voidTime(): {
        op: any;
        count: number;
    }[];
    export function ttl(): {
        op: any;
        count: number;
    }[];
    export function isTombstone(): {
        op: any;
        count: number;
    }[];
    export function memorySize(): {
        op: any;
        count: number;
    }[];
    export function digestModulo(): {
        op: any;
        count: number;
    }[];
    export function eq(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function ne(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function gt(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function ge(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function lt(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function le(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function cmpRegex(options: number, regex: string, cmpStr: AerospikeExp): AerospikeExp;
    export function cmpGeo(left: any, right: any): {
        op: any;
        count: number;
    }[];
    export function not(expr: AerospikeExp): AerospikeExp;
    export function and(...expr: any[]): never[];
    export function or(...expr: any[]): never[];
    export function exclusive(...expr: any[]): never[];
    export function add(...expr: any[]): never[];
    export function sub(...expr: any[]): never[];
    export function mul(...expr: any[]): never[];
    export function div(...expr: any[]): never[];
    export function pow(...params: any[]): any[];
    export function log(...params: any[]): any[];
    export function mod(...params: any[]): any[];
    export function abs(...params: any[]): any[];
    export function floor(...params: any[]): any[];
    export function ceil(...params: any[]): any[];
    export function toInt(...params: any[]): any[];
    export function toFloat(...params: any[]): any[];
    export function intAnd(...expr: any[]): never[];
    export function intOr(...expr: any[]): never[];
    export function intXor(...expr: any[]): never[];
    export function intNot(...params: any[]): any[];
    export function intLshift(...params: any[]): any[];
    export function intRshift(...params: any[]): any[];
    export function intArshift(...params: any[]): any[];
    export function intCount(...params: any[]): any[];
    export function intLscan(...params: any[]): any[];
    export function intRscan(...params: any[]): any[];
    export function min(...expr: any[]): never[];
    export function max(...expr: any[]): never[];
    export function cond(...expr: any[]): never[];
    function _let(...expr: any[]): never[];
    export function def(varName: string, expr: AerospikeExp): AerospikeExp;
    function _var(varName: string): AerospikeExp;
    export namespace lists {
        function size(bin: any, ctx?: any): any;
        function getByValue(bin: any, value: any, returnType: any, ctx?: any): any;
        function getByValueRange(bin: any, begin: any, end: any, returnType: any, ctx?: any): any;
        function getByValueList(bin: any, value: any, returnType: any, ctx?: any): any;
        function getByRelRankRangeToEnd(bin: any, value: any, rank: any, returnType: any, ctx?: any): any;
        function getByRelRankRange(bin: any, value: any, rank: any, count: any, returnType: any, ctx?: any): any;
        function getByIndex(bin: any, index: any, valueType: any, returnType: any, ctx?: any): any;
        function getByIndexRangeToEnd(bin: any, index: any, returnType: any, ctx?: any): any;
        function getByIndexRange(bin: any, index: any, count: any, returnType: any, ctx?: any): any;
        function getByRank(bin: any, rank: any, valueType: any, returnType: any, ctx?: any): any;
        function getByRankRangeToEnd(bin: any, rank: any, returnType: any, ctx?: any): any;
        function getByRankRange(bin: any, rank: any, count: any, returnType: any, ctx?: any): any;
        function append(bin: any, value: any, policy?: any, ctx?: any): any;
        function appendItems(bin: any, value: any, policy?: any, ctx?: any): any;
        function insert(bin: any, value: any, idx: any, policy?: any, ctx?: any): any;
        function insertItems(bin: any, value: any, idx: any, policy?: any, ctx?: any): any;
        function increment(bin: any, value: any, idx: any, policy?: any, ctx?: any): any;
        function set(bin: any, value: any, idx: any, policy?: any, ctx?: any): any;
        function clear(bin: any, ctx?: any): any;
        function sort(bin: any, order: number, ctx?: any): any;
        function removeByValue(bin: any, value: any, ctx?: any): any;
        function removeByValueList(bin: any, values: any, ctx?: any): any;
        function removeByValueRange(bin: any, end: any, begin: any, ctx?: any): any;
        function removeByRelRankRangeToEnd(bin: any, rank: any, value: any, ctx?: any): any;
        function removeByRelRankRange(bin: any, count: any, rank: any, value: any, ctx?: any): any;
        function removeByIndex(bin: any, idx: any, ctx?: any): any;
        function removeByIndexRangeToEnd(bin: any, idx: any, ctx?: any): any;
        function removeByIndexRange(bin: any, count: any, idx: any, ctx?: any): any;
        function removeByRank(bin: any, rank: any, ctx?: any): any;
        function removeByRankRangeToEnd(bin: any, rank: any, ctx?: any): any;
        function removeByRankRange(bin: any, count: any, rank: any, ctx?: any): any;
    }
    export namespace maps {
        export function put(bin: any, value: any, key: any, policy?: any, ctx?: any): any;
        export function putItems(bin: any, map: any, policy?: any, ctx?: any): any;
        export function increment_1(bin: any, value: any, key: any, policy?: any, ctx?: any): any;
        export { increment_1 as increment };
        export function clear_1(bin: any, ctx?: any): any;
        export { clear_1 as clear };
        export function removeByKey(bin: any, key: any, ctx?: any): any;
        export function removeByKeyList(bin: any, keys: any, ctx?: any): any;
        export function removeByKeyRange(bin: any, end: any, begin: any, ctx?: any): any;
        export function removeByKeyRelIndexRangeToEnd(bin: any, idx: any, key: any, ctx?: any): any;
        export function removeByKeyRelIndexRange(bin: any, count: any, idx: any, key: any, ctx?: any): any;
        export function removeByValue_1(bin: any, value: any, ctx?: any): any;
        export { removeByValue_1 as removeByValue };
        export function removeByValueList_1(bin: any, values: any, ctx?: any): any;
        export { removeByValueList_1 as removeByValueList };
        export function removeByValueRange_1(bin: any, end: any, begin: any, ctx?: any): any;
        export { removeByValueRange_1 as removeByValueRange };
        export function removeByValueRelRankRangeToEnd(bin: any, rank: any, value: any, ctx?: any): any;
        export function removeByValueRelRankRange(bin: any, count: any, rank: any, value: any, key: any, ctx?: any): any;
        export function removeByIndex_1(bin: any, idx: any, ctx?: any): any;
        export { removeByIndex_1 as removeByIndex };
        export function removeByIndexRangeToEnd_1(bin: any, idx: any, ctx?: any): any;
        export { removeByIndexRangeToEnd_1 as removeByIndexRangeToEnd };
        export function removeByIndexRange_1(bin: any, count: any, idx: any, ctx?: any): any;
        export { removeByIndexRange_1 as removeByIndexRange };
        export function removeByRank_1(bin: any, rank: any, ctx?: any): any;
        export { removeByRank_1 as removeByRank };
        export function removeByRankRangeToEnd_1(bin: any, rank: any, ctx?: any): any;
        export { removeByRankRangeToEnd_1 as removeByRankRangeToEnd };
        export function removeByRankRange_1(bin: any, count: any, rank: any, ctx?: any): any;
        export { removeByRankRange_1 as removeByRankRange };
        export function size_1(bin: any, ctx?: any): any;
        export { size_1 as size };
        export function getByKey(bin: any, key: any, valueType: any, returnType: any, ctx?: any): any;
        export function getByKeyRange(bin: any, end: any, begin: any, returnType: any, ctx?: any): any;
        export function getByKeyList(bin: any, keys: any, returnType: any, ctx?: any): any;
        export function getByKeyRelIndexRangeToEnd(bin: any, idx: any, key: any, returnType: any, ctx?: any): any;
        export function getByKeyRelIndexRange(bin: any, count: any, idx: any, key: any, returnType: any, ctx?: any): any;
        export function getByValue_1(bin: any, value: any, returnType: any, ctx?: any): any;
        export { getByValue_1 as getByValue };
        export function getByValueRange_1(bin: any, end: any, begin: any, returnType: any, ctx?: any): any;
        export { getByValueRange_1 as getByValueRange };
        export function getByValueList_1(bin: any, values: any, returnType: any, ctx?: any): any;
        export { getByValueList_1 as getByValueList };
        export function getByValueRelRankRangeToEnd(bin: any, rank: any, value: any, returnType: any, ctx?: any): any;
        export function getByValueRelRankRange(bin: any, count: any, rank: any, value: any, returnType: any, ctx?: any): any;
        export function getByIndex_1(bin: any, idx: any, valueType: any, returnType: any, ctx?: any): any;
        export { getByIndex_1 as getByIndex };
        export function getByIndexRangeToEnd_1(bin: any, idx: any, returnType: any, ctx?: any): any;
        export { getByIndexRangeToEnd_1 as getByIndexRangeToEnd };
        export function getByIndexRange_1(bin: any, count: any, idx: any, returnType: any, ctx?: any): any;
        export { getByIndexRange_1 as getByIndexRange };
        export function getByRank_1(bin: any, rank: any, valueType: any, returnType: any, ctx?: any): any;
        export { getByRank_1 as getByRank };
        export function getByRankRangeToEnd_1(bin: any, rank: any, returnType: any, ctx?: any): any;
        export { getByRankRangeToEnd_1 as getByRankRangeToEnd };
        export function getByRankRange_1(bin: any, count: any, rank: any, returnType: any, ctx?: any): any;
        export { getByRankRange_1 as getByRankRange };
    }
    export namespace bit {
        export function reSize(bin: any, flags: number, byteSize: number, policy?: any): any;
        export function insert_1(bin: any, value: any, byteOffset: any, policy?: any): any;
        export { insert_1 as insert };
        export function remove(bin: any, byteSize: number, byteOffset: any, policy?: any): any;
        export function set_1(bin: any, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export { set_1 as set };
        export function or(bin: any, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function xor(bin: any, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function and(bin: any, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function not(bin: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function lShift(bin: any, shift: number, bitSize: any, bitOffset: any, policy?: any): any;
        export function rShift(bin: any, shift: number, bitSize: any, bitOffset: any, policy?: any): any;
        export function add(bin: any, action: number, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function subtract(bin: any, action: number, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function setInt(bin: any, value: any, bitSize: any, bitOffset: any, policy?: any): any;
        export function get(bin: any, bitSize: any, bitOffset: any): any;
        export function count(bin: any, bitSize: any, bitOffset: any): number;
        export function lScan(bin: any, value: any, bitSize: any, bitOffset: any): number;
        export function rScan(bin: any, value: any, bitSize: any, bitOffset: any): number;
        export function getInt(bin: any, sign: boolean, bitSize: any, bitOffset: any): any;
    }
    export namespace hll {
        export function initMH(bin: any, mhBitCount: number, indexBitCount: number, policy?: any): any;
        export function init(bin: any, indexBitCount: number, policy?: any): any;
        export function addMH(bin: any, mhBitCount: number, indexBitCount: number, list: any, policy?: any): any;
        export function add_1(bin: any, indexBitCount: number, list: any, policy?: any): any;
        export { add_1 as add };
        export function update(bin: any, list: any, policy?: any): any;
        export function getCount(bin: any): any;
        export function getUnion(bin: any, list: any): any;
        export function getUnionCount(bin: any, list: any): any;
        export function getIntersectCount(bin: any, list: any): any;
        export function getSimilarity(bin: any, list: any): any[];
        export function describe(bin: any): any;
        export function mayContain(bin: any, list: any): any;
    }
    function _val(value: any): {
        [x: number]: any;
        op: any;
    }[];
    export { _val as list, _val as map, _let as let, _var as var };
}
declare module "info" {
    export function parse(info: string): any;
    export const separators: {
        bins: (string | typeof splitBins)[];
        'bins/*': (typeof splitBins)[];
        'namespace/*': string[];
        service: string[];
        sindex: string[];
        'sindex/*': string[];
        'sindex/*/**': string[];
        'udf-list': string[];
        'get-dc-config': string[];
        sets: string[];
        'sets/*': string[];
        'sets/*/**': (string | typeof chop)[];
    };
    function splitBins(str: any): {
        stats: {};
        names: any[];
    };
    function chop(str: any): any;
    export {};
}
declare module "operations" {
    export function read(bin: string): Operation;
    export function write(bin: string, value: any): Operation;
    export function add(bin: string, value: (number | any)): Operation;
    export function incr(bin: any, value: any): any;
    export function append(bin: string, value: (string | Buffer)): Operation;
    export function prepend(bin: string, value: (string | Buffer)): Operation;
    export function touch(ttl?: number | undefined): Operation;
    function _delete(): Operation;
    export class Operation {
        protected constructor();
        op: any;
        bin: any;
    }
    export { _delete as delete };
}
declare module "lists" {
    export function setOrder(bin: string, order: number): any;
    export function sort(bin: string, flags: number): any;
    export function append(bin: string, value: any, policy?: any): any;
    export function appendItems(bin: string, list: Array<any>, policy?: any): any;
    export function insert(bin: string, index: number, value: any, policy?: any): any;
    export function insertItems(bin: string, index: number, list: Array<any>, policy: any): any;
    export function pop(bin: string, index: number): any;
    export function popRange(bin: string, index: number, count?: number | undefined): any;
    export function remove(bin: string, index: number): any;
    export function removeRange(bin: string, index: number, count?: number | undefined): any;
    export function removeByIndex(bin: string, index: number, returnType?: number | undefined): any;
    export function removeByIndexRange(bin: string, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function removeByValue(bin: string, value: any, returnType?: number | undefined): any;
    export function removeByValueList(bin: string, values: Array<any>, returnType?: number | undefined): any;
    export function removeByValueRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function removeByValueRelRankRange(bin: string, value: any, rank: number, count?: number | undefined, returnType?: number | undefined): any;
    export function removeByRank(bin: string, rank: number, returnType?: number | undefined): any;
    export function removeByRankRange(bin: string, rank: any, count?: number | undefined, returnType?: number | undefined): any;
    export function clear(bin: string): any;
    export function set(bin: string, index: number, value: any, policy?: any): any;
    export function trim(bin: string, index: number, count: number): any;
    export function get(bin: string, index: number): any;
    export function getRange(bin: string, index: number, count?: number | undefined): any;
    export function getByIndex(bin: string, index: number, returnType?: number | undefined): any;
    export function getByIndexRange(bin: string, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function getByValue(bin: string, value: any, returnType?: number | undefined): any;
    export function getByValueList(bin: string, values: Array<any>, returnType?: number | undefined): any;
    export function getByValueRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function getByValueRelRankRange(bin: string, value: any, rank: number, count?: number | undefined, returnType?: number | undefined): any;
    export function getByRank(bin: string, rank: number, returnType?: number | undefined): any;
    export function getByRankRange(bin: string, rank: any, count?: number | undefined, returnType?: number | undefined): any;
    export function increment(bin: string, index: number, value?: number | undefined, policy?: any): any;
    export function size(bin: string): any;
}
declare module "hll" {
    export function init(bin: string, indexBits: number, minhashBits?: number | undefined): any;
    export function add(bin: string, list: any[], indexBits?: number | undefined, minhashBits?: number | undefined): any;
    export function setUnion(bin: string, list: any[]): any;
    export function refreshCount(bin: string): any;
    export function fold(bin: string, indexBits: number): any;
    export function getCount(bin: string): any;
    export function getUnion(bin: string, list: any[]): any;
    export function getUnionCount(bin: string, list: any[]): any;
    export function getIntersectCount(bin: string, list: any[]): any;
    export function getSimilarity(bin: string, list: any[]): any;
    export function describe(bin: string): any;
}
declare module "maps" {
    export function setPolicy(bin: string, policy: MapPolicy): any;
    export function put(bin: string, key: any, value: any, policy?: MapPolicy): any;
    export function putItems(bin: string, items: object, policy?: MapPolicy): any;
    export function increment(bin: string, key: any, incr: number, policy?: MapPolicy): any;
    export function decrement(bin: string, key: any, decr: number, policy?: MapPolicy): any;
    export function clear(bin: string): any;
    export function removeByKey(bin: string, key: any, returnType?: number | undefined): any;
    export function removeByKeyList(bin: string, keys: Array<any>, returnType?: number | undefined): any;
    export function removeByKeyRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function removeByKeyRelIndexRange(bin: string, key: any, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function removeByValue(bin: string, value: any, returnType?: number | undefined): any;
    export function removeByValueList(bin: string, values: Array<any>, returnType?: number | undefined): any;
    export function removeByValueRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function removeByValueRelRankRange(bin: string, value: any, rank: number, count?: number | undefined, returnType?: number | undefined): any;
    export function removeByIndex(bin: string, index: number, returnType?: number | undefined): any;
    export function removeByIndexRange(bin: string, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function removeByRank(bin: string, rank: number, returnType?: number | undefined): any;
    export function removeByRankRange(bin: string, rank: any, count?: number | undefined, returnType?: number | undefined): any;
    export function size(bin: string): any;
    export function getByKey(bin: string, key: any, returnType?: number | undefined): any;
    export function getByKeyRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function getByKeyRelIndexRange(bin: string, key: any, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function getByValue(bin: string, value: any, returnType?: number | undefined): any;
    export function getByValueRange(bin: string, begin: any | null, end: any | null, returnType?: number | undefined): any;
    export function getByValueRelRankRange(bin: string, value: any, rank: number, count?: number | undefined, returnType?: number | undefined): any;
    export function getByIndex(bin: string, index: number, returnType?: number | undefined): any;
    export function getByIndexRange(bin: string, index: number, count?: number | undefined, returnType?: number | undefined): any;
    export function getByRank(bin: string, rank: number, returnType?: number | undefined): any;
    export function getByRankRange(bin: string, rank: any, count: number, returnType?: number | undefined): any;
}
declare module "bitwise" {
    export function resize(bin: string, size: number, flags?: number | undefined): BitwiseOperation;
    export function insert(bin: string, byteOffset: any, value: Buffer): BitwiseOperation;
    export function remove(bin: string, byteOffset: number, byteSize: number): BitwiseOperation;
    export function set(bin: string, bitOffset: number, bitSize: number, value: number | Buffer): BitwiseOperation;
    export function or(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    export function xor(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    export function and(bin: string, bitOffset: number, bitSize: number, value: Buffer): BitwiseOperation;
    export function not(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
    export function lshift(bin: string, bitOffset: number, bitSize: number, shift: number): BitwiseOperation;
    export function rshift(bin: string, bitOffset: number, bitSize: number, shift: number): BitwiseOperation;
    export function add(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
    export function subtract(bin: string, bitOffset: number, bitSize: number, value: number, sign: boolean): OverflowableBitwiseOp;
    export function get(bin: string, bitOffset: number, bitSize: number): BitwiseOperation;
    export function getInt(bin: string, bitOffset: number, bitSize: number, sign: boolean): BitwiseOperation;
    export function lscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
    export function rscan(bin: string, bitOffset: number, bitSize: number, value: boolean): BitwiseOperation;
    class BitwiseOperation extends Operation {
        withPolicy(policy: BitwisePolicy): BitwiseOperation;
        policy: any;
    }
    class OverflowableBitwiseOp extends BitwiseOperation {
        overflowAction: any;
        onOverflow(action: number): OverflowableBitwiseOp;
    }
    import Operation_1 = require("operations");
    import Operation = Operation_1.Operation;
    export {};
}
declare module "exp_operations" {
    export function read(bin: string, exp: any, flags: any): Operation;
    export function write(bin: string, exp: any, flags: any): Operation;
    export class ExpOperation {
        protected constructor();
        op: any;
        bin: any;
        exp: any;
        flags: any;
    }
}
declare module "policies/base_policy" {
    export = BasePolicy;
    class BasePolicy {
        constructor(props: any);
        socketTimeout: number;
        totalTimeout: number;
        maxRetries: number;
        filterExpression: any;
        compress: boolean;
    }
}
declare module "policies/apply_policy" {
    export = ApplyPolicy;
    class ApplyPolicy extends BasePolicy {
        key: number;
        commitLevel: number;
        ttl: number;
        durableDelete: boolean;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/operate_policy" {
    export = OperatePolicy;
    class OperatePolicy extends BasePolicy {
        key: number;
        gen: number;
        exists: number;
        replica: number;
        commitLevel: number;
        deserialize: boolean;
        durableDelete: boolean;
        readModeAP: number;
        readModeSC: number;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/query_policy" {
    export = QueryPolicy;
    class QueryPolicy extends BasePolicy {
        deserialize: boolean;
        failOnClusterChange: boolean;
        infoTimeout: number;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/read_policy" {
    export = ReadPolicy;
    class ReadPolicy extends BasePolicy {
        key: number;
        replica: number;
        readModeAP: number;
        readModeSC: number;
        deserialize: boolean;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/remove_policy" {
    export = RemovePolicy;
    class RemovePolicy extends BasePolicy {
        generation: number;
        key: number;
        gen: number;
        commitLevel: number;
        durableDelete: boolean;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/scan_policy" {
    export = ScanPolicy;
    class ScanPolicy extends BasePolicy {
        durableDelete: boolean;
        recordsPerSecond: number;
        maxRecords: number;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/write_policy" {
    export = WritePolicy;
    class WritePolicy extends BasePolicy {
        compressionThreshold: number;
        key: number;
        gen: number;
        exists: number;
        commitLevel: number;
        durableDelete: boolean;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/batch_policy" {
    export = BatchPolicy;
    class BatchPolicy extends BasePolicy {
        replica: number;
        readModeAP: number;
        readModeSC: number;
        concurrent: boolean;
        allowInline: boolean;
        allowInlineSSD: boolean;
        respondAllKeys: boolean;
        sendSetName: boolean;
        deserialize: boolean;
    }
    import BasePolicy = require("policies/base_policy");
}
declare module "policies/batch_apply_policy" {
    export = BatchApplyPolicy;
    class BatchApplyPolicy {
        constructor(props?: any);
        filterExpression: any;
        key: number;
        commitLevel: number;
        ttl: number;
        durableDelete: boolean;
    }
}
declare module "policies/batch_read_policy" {
    export = BatchReadPolicy;
    class BatchReadPolicy {
        constructor(props?: any);
        filterExpression: any;
        readModeAP: number;
        readModeSC: number;
    }
}
declare module "policies/batch_remove_policy" {
    export = BatchRemovePolicy;
    class BatchRemovePolicy {
        constructor(props?: any);
        filterExpression: any;
        key: number;
        commitLevel: number;
        gen: number;
        generation: number;
        durableDelete: boolean;
    }
}
declare module "policies/batch_write_policy" {
    export = BatchWritePolicy;
    class BatchWritePolicy {
        constructor(props?: any);
        filterExpression: any;
        key: number;
        commitLevel: number;
        gen: number;
        exists: number;
        durableDelete: boolean;
    }
}
declare module "policies/hll_policy" {
    export = HLLPolicy;
    class HLLPolicy {
        constructor(props?: any);
        writeFlags: number;
    }
}
declare module "policies/info_policy" {
    export = InfoPolicy;
    class InfoPolicy {
        constructor(props?: any);
        timeout: number;
        sendAsIs: boolean;
        checkBounds: boolean;
    }
}
declare module "policies/list_policy" {
    export = ListPolicy;
    class ListPolicy {
        constructor(props?: any);
        order: number;
        writeFlags: number;
    }
}
declare module "policies/map_policy" {
    export = MapPolicy;
    class MapPolicy {
        constructor(props?: any);
        order: number;
        writeMode: number;
        writeFlags: number;
    }
}
declare module "policy" {
    export function createPolicy(type: any, values: any): CommandQueuePolicy | BasePolicy | BatchApplyPolicy | BatchReadPolicy | BatchRemovePolicy | BatchWritePolicy | HLLPolicy | InfoPolicy | undefined;
    import BasePolicy = require("policies/base_policy");
    import ApplyPolicy = require("policies/apply_policy");
    import OperatePolicy = require("policies/operate_policy");
    import QueryPolicy = require("policies/query_policy");
    import ReadPolicy = require("policies/read_policy");
    import RemovePolicy = require("policies/remove_policy");
    import ScanPolicy = require("policies/scan_policy");
    import WritePolicy = require("policies/write_policy");
    import BatchPolicy = require("policies/batch_policy");
    import BatchApplyPolicy = require("policies/batch_apply_policy");
    import BatchReadPolicy = require("policies/batch_read_policy");
    import BatchRemovePolicy = require("policies/batch_remove_policy");
    import BatchWritePolicy = require("policies/batch_write_policy");
    import CommandQueuePolicy = require("policies/command_queue_policy");
    import HLLPolicy = require("policies/hll_policy");
    import InfoPolicy = require("policies/info_policy");
    import ListPolicy = require("policies/list_policy");
    import MapPolicy = require("policies/map_policy");
    export { BasePolicy, ApplyPolicy, OperatePolicy, QueryPolicy, ReadPolicy, RemovePolicy, ScanPolicy, WritePolicy, BatchPolicy, BatchApplyPolicy, BatchReadPolicy, BatchRemovePolicy, BatchWritePolicy, CommandQueuePolicy, HLLPolicy, InfoPolicy, ListPolicy, MapPolicy };
}
declare module "features" {
    export const CDT_MAP: "cdt-map";
    export const CDT_LIST: "cdt-list";
    export const BLOB_BITS: "blob-bits";
}
declare module "commands/command" {
    const _exports: Class;
    export = _exports;
}
declare module "record" {
    export = Record;
    class Record {
        private constructor();
        key: any;
        bins: any;
        ttl: any;
        gen: any;
        type: any;
        policy: any;
        readAllBins: any;
        ops: any;
        udf: any;
    }
}
declare module "commands/batch_command" {
    function _exports(asCommand: any): {
        new (): {
            convertResult(results: any): any;
        };
    };
    export = _exports;
}
declare module "commands/connect_command" {
    function _exports(asCommand: any): {
        new (client: any, callback: any): {
            ensureConnected: boolean;
        };
    };
    export = _exports;
}
declare module "commands/exists_command" {
    function _exports(asCommand: any): {
        new (): {
            convertResponse(error: any): any[];
        };
    };
    export = _exports;
}
declare module "commands/read_record_command" {
    function _exports(asCommand: any): {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(bins: any, metadata: any): any;
        };
    };
    export = _exports;
}
declare module "bigint" {
    export const BigInt: BigIntConstructor;
    export const bigIntSupported: true;
    export function isInt64(value: any): boolean;
}
declare module "key" {
    export = Key;
    function Key(ns: string, set: string, key: (string | number | Buffer), digest?: string | undefined): void;
    class Key {
        constructor(ns: string, set: string, key: (string | number | Buffer), digest?: string | undefined);
        ns: string;
        set: string;
        key: string | number | Buffer;
        digest: string | null;
        equals(other: any): any;
    }
    namespace Key {
        function fromASKey(keyObj: any): Key | null;
    }
}
declare module "commands/stream_command" {
    function _exports(asCommand: any): {
        new (stream: any, args: any): {
            stream: any;
            callback(error: any, record: any): boolean;
            convertResult(bins: any, meta: any, asKey: any): any;
        };
    };
    export = _exports;
}
declare module "commands/write_record_command" {
    function _exports(asCommand: any): {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(): any;
        };
    };
    export = _exports;
}
declare module "job" {
    export = Job;
    function Job(client: any, jobID: any, module: any): void;
    class Job {
        constructor(client: any, jobID: any, module: any);
        client: any;
        jobID: any;
        module: any;
        private hasCompleted;
        private checkStatus;
        info(policy: any, callback?: JobinfoCallback | undefined): Promise<any> | null;
        wait(pollInterval?: number | undefined, callback?: JobdoneCallback | undefined): Promise<any> | null;
        waitUntilDone: any;
    }
    namespace Job {
        function safeRandomJobID(): number;
        function pollUntilDone(statusFunction: any, pollInterval: any): Promise<any>;
    }
}
declare module "commands/query_background_command" {
    function _exports(asCommand: any): {
        new (client: any, ns: any, set: any, queryObj: any, policy: any, queryID: any, callback: any): {
            client: any;
            queryID: any;
            queryObj: any;
            convertResult(): Job;
        };
    };
    export = _exports;
    import Job = require("job");
}
declare module "commands/index" {
    class ApplyCommand {
    }
    const BatchExistsCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchExistsCommand extends BatchExistsCommand_base {
    }
    const BatchGetCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchGetCommand extends BatchGetCommand_base {
    }
    const BatchReadCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchReadCommand extends BatchReadCommand_base {
    }
    const BatchWriteCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchWriteCommand extends BatchWriteCommand_base {
    }
    const BatchApplyCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchApplyCommand extends BatchApplyCommand_base {
    }
    const BatchRemoveCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchRemoveCommand extends BatchRemoveCommand_base {
    }
    const BatchSelectCommand_base: {
        new (): {
            convertResult(results: any): any;
        };
    };
    class BatchSelectCommand extends BatchSelectCommand_base {
    }
    const ConnectCommand_base: {
        new (client: any, callback: any): {
            ensureConnected: boolean;
        };
    };
    class ConnectCommand extends ConnectCommand_base {
    }
    const ExistsCommand_base: {
        new (): {
            convertResponse(error: any): any[];
        };
    };
    class ExistsCommand extends ExistsCommand_base {
    }
    const GetCommand_base: {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(bins: any, metadata: any): any;
        };
    };
    class GetCommand extends GetCommand_base {
    }
    class IndexCreateCommand {
    }
    class IndexRemoveCommand {
    }
    class InfoAnyCommand {
    }
    class InfoForeachCommand {
    }
    class InfoHostCommand {
    }
    class InfoNodeCommand {
    }
    class JobInfoCommand {
    }
    const OperateCommand_base: {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(bins: any, metadata: any): any;
        };
    };
    class OperateCommand extends OperateCommand_base {
    }
    const PutCommand_base: {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(): any;
        };
    };
    class PutCommand extends PutCommand_base {
    }
    const QueryCommand_base: {
        new (stream: any, args: any): {
            stream: any;
            callback(error: any, record: any): boolean;
            convertResult(bins: any, meta: any, asKey: any): any;
        };
    };
    class QueryCommand extends QueryCommand_base {
    }
    class QueryApplyCommand {
    }
    const QueryBackgroundCommand_base: {
        new (client: any, ns: any, set: any, queryObj: any, policy: any, queryID: any, callback: any): {
            client: any;
            queryID: any;
            queryObj: any;
            convertResult(): import("job");
        };
    };
    class QueryBackgroundCommand extends QueryBackgroundCommand_base {
    }
    const QueryOperateCommand_base: {
        new (client: any, ns: any, set: any, queryObj: any, policy: any, queryID: any, callback: any): {
            client: any;
            queryID: any;
            queryObj: any;
            convertResult(): import("job");
        };
    };
    class QueryOperateCommand extends QueryOperateCommand_base {
    }
    const QueryForeachCommand_base: {
        new (stream: any, args: any): {
            stream: any;
            callback(error: any, record: any): boolean;
            convertResult(bins: any, meta: any, asKey: any): any;
        };
    };
    class QueryForeachCommand extends QueryForeachCommand_base {
    }
    const RemoveCommand_base: {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(): any;
        };
    };
    class RemoveCommand extends RemoveCommand_base {
    }
    const ScanCommand_base: {
        new (stream: any, args: any): {
            stream: any;
            callback(error: any, record: any): boolean;
            convertResult(bins: any, meta: any, asKey: any): any;
        };
    };
    class ScanCommand extends ScanCommand_base {
    }
    const ScanBackgroundCommand_base: {
        new (client: any, ns: any, set: any, queryObj: any, policy: any, queryID: any, callback: any): {
            client: any;
            queryID: any;
            queryObj: any;
            convertResult(): import("job");
        };
    };
    class ScanBackgroundCommand extends ScanBackgroundCommand_base {
    }
    const ScanOperateCommand_base: {
        new (client: any, ns: any, set: any, queryObj: any, policy: any, queryID: any, callback: any): {
            client: any;
            queryID: any;
            queryObj: any;
            convertResult(): import("job");
        };
    };
    class ScanOperateCommand extends ScanOperateCommand_base {
    }
    const SelectCommand_base: {
        new (client: any, key: any, args: any, callback: any): {
            key: any;
            convertResult(bins: any, metadata: any): any;
        };
    };
    class SelectCommand extends SelectCommand_base {
    }
    class TruncateCommand {
    }
    class UdfRegisterCommand {
    }
    class UdfRemoveCommand {
    }
    export { ApplyCommand as Apply, BatchExistsCommand as BatchExists, BatchGetCommand as BatchGet, BatchReadCommand as BatchRead, BatchWriteCommand as BatchWrite, BatchApplyCommand as BatchApply, BatchRemoveCommand as BatchRemove, BatchSelectCommand as BatchSelect, ConnectCommand as Connect, ExistsCommand as Exists, GetCommand as Get, IndexCreateCommand as IndexCreate, IndexRemoveCommand as IndexRemove, InfoAnyCommand as InfoAny, InfoForeachCommand as InfoForeach, InfoHostCommand as InfoHost, InfoNodeCommand as InfoNode, JobInfoCommand as JobInfo, OperateCommand as Operate, PutCommand as Put, QueryCommand as Query, QueryApplyCommand as QueryApply, QueryBackgroundCommand as QueryBackground, QueryOperateCommand as QueryOperate, QueryForeachCommand as QueryForeach, RemoveCommand as Remove, ScanCommand as Scan, ScanBackgroundCommand as ScanBackground, ScanOperateCommand as ScanOperate, SelectCommand as Select, TruncateCommand as Truncate, UdfRegisterCommand as UdfRegister, UdfRemoveCommand as UdfRemove };
}
declare module "config" {
    export = Config;
    class Config {
        constructor(config?: any);
        user: any;
        password: any;
        authMode: any;
        clusterName: string;
        port: any;
        tls: any;
        hosts: (Host[] | string);
        policies: Policies;
        log: any;
        connTimeoutMs: any;
        loginTimeoutMs: any;
        maxSocketIdle: any;
        tenderInterval: any;
        maxConnsPerNode: any;
        minConnsPerNode: any;
        modlua: any;
        sharedMemory: any;
        useAlternateAccessAddress: boolean;
        rackAware: boolean;
        rackId: any;
        setDefaultPolicies(policies: any): void;
        private [inspect];
    }
    const inspect: unique symbol;
}
declare module "index_job" {
    export = IndexJob;
    function IndexJob(client: any, namespace: any, indexName: any): void;
    class IndexJob {
        constructor(client: any, namespace: any, indexName: any);
        client: any;
        namespace: any;
        indexName: any;
        private hasCompleted;
        private info;
    }
}
declare module "record_stream" {
    export = RecordStream;
    function RecordStream(client: any): void;
    class RecordStream {
        constructor(client: any);
        aborted: boolean;
        client: any;
        writable: boolean;
        readable: boolean;
        _read(): void;
        abort(): void;
    }
}
declare module "query" {
    export = Query;
    function Query(client: Client, ns: string, set: string, options?: {
        filters?: any[] | undefined;
        select?: string[] | undefined;
        nobins?: boolean | undefined;
    } | undefined): void;
    class Query {
        constructor(client: Client, ns: string, set: string, options?: {
            filters?: any[] | undefined;
            select?: string[] | undefined;
            nobins?: boolean | undefined;
        } | undefined);
        client: any;
        ns: string;
        set: string;
        filters: any[];
        selected: string[] | undefined;
        nobins: boolean | undefined;
        udf: any;
        private pfEnabled;
        select(...args: string[]): void;
        where(predicate: any): void;
        setSindexFilter(sindexFilter: any): void;
        setUdf(udfModule: string, udfFunction: string, udfArgs?: any[] | undefined): void;
        partitions(begin: number, count: number, digest: string): void;
        partFilter: {
            begin: number;
            count: number;
            digest: string;
        } | undefined;
        foreach(policy?: QueryPolicy, dataCb?: recordCallback | undefined, errorCb?: errorCallback | undefined, endCb?: doneCallback | undefined): RecordStream;
        results(policy?: QueryPolicy): Promise<RecordObject[]>;
        apply(udfModule: string, udfFunction: string, udfArgs?: any[] | undefined, policy?: QueryPolicy, callback?: QueryaggregationResultCallback | undefined): Promise<any> | null;
        background(udfModule: string, udfFunction: string, udfArgs?: any[] | undefined, policy?: WritePolicy, queryID?: number | undefined, callback?: jobCallback | undefined): Promise<any> | null;
        operate(operations: any, policy?: QueryPolicy, queryID?: number | undefined, callback?: jobCallback | undefined): Promise<any> | null;
        ops: any;
    }
    import RecordStream = require("record_stream");
}
declare module "scan" {
    export = Scan;
    function Scan(client: Client, ns: string, set: string, options?: {
        select?: string[] | undefined;
        nobins?: boolean | undefined;
        concurrent?: boolean | undefined;
    } | undefined): void;
    class Scan {
        constructor(client: Client, ns: string, set: string, options?: {
            select?: string[] | undefined;
            nobins?: boolean | undefined;
            concurrent?: boolean | undefined;
        } | undefined);
        client: any;
        ns: string;
        set: string;
        selected: string[] | undefined;
        nobins: boolean | undefined;
        concurrent: boolean | undefined;
        private pfEnabled;
        select(...args: string[]): void;
        partitions(begin: number, count: number, digest: string): void;
        partFilter: {
            begin: number;
            count: number;
            digest: string;
        } | undefined;
        background(udfModule: string, udfFunction: string, udfArgs?: any[] | undefined, policy?: ScanPolicy, scanID?: number | undefined, callback?: jobCallback | undefined): Promise<any> | null;
        udf: {
            module: string;
            funcname: string;
            args: any[] | undefined;
        } | undefined;
        operate(operations: any, policy?: ScanPolicy, scanID?: number | undefined, callback?: jobCallback | undefined): Promise<any> | null;
        ops: any;
        foreach(policy?: ScanPolicy, dataCb?: recordCallback | undefined, errorCb?: errorCallback | undefined, endCb?: doneCallback | undefined): RecordStream;
    }
    import RecordStream = require("record_stream");
}
declare module "udf_job" {
    export = UdfJob;
    function UdfJob(client: any, udfModule: any, command: any): void;
    class UdfJob {
        constructor(client: any, udfModule: any, command: any);
        client: any;
        udfModule: any;
        command: any;
        private hasCompleted;
        private info;
    }
    namespace UdfJob {
        const REGISTER: string;
        const UNREGISTER: string;
    }
}
declare module "utils" {
    export function parseHostString(hostString: any): {
        addr: any;
        tlsname: any;
        port: number;
    };
    export function print(err: any, result: any): void;
}
declare module "client" {
    export = Client;
    function Client(config: Config): void;
    class Client {
        constructor(config: Config);
        config: Config;
        private as_client;
        private connected;
        captureStackTraces: boolean;
        private asExec;
        getNodes(): Array<{
            name: string;
            address: string;
        }>;
        addSeedHost(hostname: string, port?: number | undefined): void;
        removeSeedHost(hostname: string, port?: number | undefined): void;
        batchExists(keys: Key[], policy?: BatchPolicy, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchGet(keys: Key[], policy?: BatchPolicy, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchRead(records: {
            type: number;
            key: Key;
            bins?: string[];
            readAllBins?: boolean;
        }, policy?: BatchPolicy, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchWrite(records: {
            type: number;
            key: Key;
        }, policy?: BatchPolicy, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchApply(records: {
            type: number;
            key: Key;
        }, udf: object[], batchPolicy?: BatchPolicy, batchApplyPolicy?: any, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchRemove(records: {
            type: number;
            key: Key;
        }, batchPolicy?: BatchPolicy, batchRemovePolicy?: any, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        batchSelect(keys: Key[], bins: string[], policy?: BatchPolicy, callback?: batchRecordsCallback | undefined): Promise<any> | null;
        close(releaseEventLoop?: boolean | undefined): void;
        connect(callback?: connectCallback | undefined): Promise<any> | null;
        createIndex(options: {
            ns: string;
            set: string;
            bin: string;
            index: string;
            type?: any;
            datatype: any;
        }, policy?: InfoPolicy, callback?: jobCallback | undefined): Promise<any> | null;
        createIntegerIndex(options: {
            ns: string;
            set: string;
            bin: string;
            index: string;
            type?: any;
        }, policy?: InfoPolicy, callback?: jobCallback | undefined): Promise<any> | null;
        createStringIndex(options: {
            ns: string;
            set: string;
            bin: string;
            index: string;
            type?: any;
        }, policy?: InfoPolicy, callback?: jobCallback | undefined): Promise<any> | null;
        createGeo2DSphereIndex(options: {
            ns: string;
            set: string;
            bin: string;
            index: string;
            type?: any;
        }, policy?: InfoPolicy, callback?: jobCallback | undefined): Promise<any> | null;
        apply(key: Key, udfArgs: {
            module: string;
            funcname: string;
            args: Array<(number | string)>;
        }, policy?: ApplyPolicy, callback?: valueCallback | undefined): Promise<any> | null;
        exists(key: Key, policy?: ReadPolicy, callback?: valueCallback | undefined): Promise<any> | null;
        get(key: Key, policy?: ReadPolicy, callback?: recordCallback | undefined): Promise<any> | null;
        indexRemove(namespace: string, index: string, policy?: InfoPolicy, callback?: doneCallback | undefined): Promise<any> | null;
        info(request: string | null, host: {
            addr: string;
            port?: number | undefined;
        }, policy?: InfoPolicy, callback?: infoCallback | undefined): any;
        infoAny(request?: string | undefined, policy?: InfoPolicy, callback?: infoCallback | undefined): any;
        infoAll(request?: string | undefined, policy?: InfoPolicy, callback?: infoCallback | undefined): any;
        infoNode(request: string | null, node: {
            name: string;
        }, policy?: InfoPolicy, callback?: infoCallback | undefined): any;
        isConnected(checkTenderErrors?: boolean | undefined): boolean;
        operate(key: Key, operations: any, metadata?: any, policy?: OperatePolicy, callback?: recordCallback | undefined): any;
        incr: any;
        put(key: Key, bins: object, meta?: object, policy?: WritePolicy, callback?: writeCallback | undefined): any;
        query(ns: string, set: string, options?: object): Query;
        remove(key: Key, policy?: RemovePolicy, callback?: writeCallback | undefined): any;
        scan(ns: string, set: string, options?: object): Scan;
        select(key: Key, bins: string[], policy?: ReadPolicy, callback?: recordCallback | undefined): any;
        truncate(ns: string, set: string, beforeNanos: any, policy?: InfoPolicy, callback?: doneCallback | undefined): any;
        udfRegister(udfPath: any, udfType?: number | undefined, policy?: InfoPolicy, callback?: jobCallback | undefined): any;
        stats(): ClientStats;
        udfRemove(udfModule: string, policy?: InfoPolicy, callback?: jobCallback | undefined): any;
        updateLogging(logConfig: any): void;
    }
    import Config = require("config");
    import Query = require("query");
    import Scan = require("scan");
}
declare module "double" {
    export = Double;
    function Double(value: number): void;
    class Double {
        constructor(value: number);
        Double: number;
        value(): number;
    }
}
declare module "batch_type" {
    export const BATCH_READ: any;
    export const BATCH_WRITE: any;
    export const BATCH_APPLY: any;
    export const BATCH_REMOVE: any;
}
declare module "aerospike" {
    export const filter: typeof import("filter");
    export const exp: typeof import("exp");
    export namespace regex {
        const BASIC: number;
        const EXTENDED: number;
        const ICASE: number;
        const NEWLINE: number;
    }
    export type regex = number;
    export const info: typeof import("info");
    export const lists: typeof import("lists");
    export const hll: typeof import("hll");
    export const maps: typeof import("maps");
    export namespace cdt {
        const Context: typeof import("cdt_context");
    }
    export const bitwise: typeof import("bitwise");
    export const operations: typeof import("operations");
    export const policy: typeof import("policy");
    export const BasePolicy: typeof import("policies/base_policy");
    export const ApplyPolicy: typeof import("policies/apply_policy");
    export const BatchPolicy: typeof import("policies/batch_policy");
    export const OperatePolicy: typeof import("policies/operate_policy");
    export const QueryPolicy: typeof import("policies/query_policy");
    export const ReadPolicy: typeof import("policies/read_policy");
    export const RemovePolicy: typeof import("policies/remove_policy");
    export const ScanPolicy: typeof import("policies/scan_policy");
    export const WritePolicy: typeof import("policies/write_policy");
    export const BatchApplyPolicy: typeof import("policies/batch_apply_policy");
    export const BatchReadPolicy: typeof import("policies/batch_read_policy");
    export const BatchRemovePolicy: typeof import("policies/batch_remove_policy");
    export const BatchWritePolicy: typeof import("policies/batch_write_policy");
    export const CommandQueuePolicy: typeof import("policies/command_queue_policy");
    export const InfoPolicy: typeof import("policies/info_policy");
    export const ListPolicy: typeof import("policies/list_policy");
    export const MapPolicy: typeof import("policies/map_policy");
    export const status: typeof import("status");
    export const features: typeof import("features");
    export { AerospikeError };
    export const Client: typeof import("client");
    export const Config: typeof import("config");
    export const Double: typeof import("double");
    export const GeoJSON: typeof import("geojson");
    export const Key: typeof import("key");
    export const Record: typeof import("record");
    export type auth = number;
    export type language = number;
    export type log = number;
    export type ttl = number;
    export type jobStatus = number;
    export type indexDataType = number;
    export type indexType = number;
    export const print: typeof import("utils").print;
    export const releaseEventLoop: typeof EventLoop.releaseEventLoop;
    export function client(config?: any): import("client");
    export function connect(config?: any, callback?: connectCallback | undefined): Promise<any> | null;
    export function setDefaultLogging(logInfo: any): void;
    export function setupGlobalCommandQueue(policy: CommandQueuePolicy): void;
    export const batchType: {
        BATCH_READ: any;
        BATCH_WRITE: any;
        BATCH_APPLY: any;
        BATCH_REMOVE: any;
    };
    import AerospikeError = require("error");
    import EventLoop = require("event_loop");
}
type Host = object;
type ClientStats = any;
type doneCallback = () => any;
type errorCallback = () => any;
type recordCallback = () => any;
type valueCallback = () => any;
type writeCallback = () => any;
type batchRecordsCallback = () => any;
type connectCallback = () => any;
type infoCallback = () => any;
type infoAllCallback = () => any;
type jobCallback = () => any;
type JobdoneCallback = () => any;
type JobinfoCallback = () => any;
type QueryaggregationResultCallback = () => any;
type AerospikeExp = object;
type ApplyPolicy = object;
type BatchPolicy = object;
type InfoPolicy = object;
type OperatePolicy = object;
type ReadPolicy = object;
type RemovePolicy = object;
type ScanPolicy = object;
type QueryPolicy = object;
type WritePolicy = object;
type BitwisePolicy = object;
type MapPolicy = object;
type CommandQueuePolicy = object;
type Policies = {
    apply: ApplyPolicy;
    batch: BatchPolicy;
    info: InfoPolicy;
    operate: OperatePolicy;
    read: ReadPolicy;
    remove: RemovePolicy;
    scan: ScanPolicy;
    query: QueryPolicy;
    write: WritePolicy;
};
type Operation = object;
type Client = object;
type Key = object;
type RecordObject = object;
declare module "policies/bitwise_policy" {
    export = BitwisePolicy;
    class BitwisePolicy {
        constructor(props?: any);
        writeFlags: number;
    }
}
