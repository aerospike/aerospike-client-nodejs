declare module 'aerospike' {

    type PartialAerospikeRecordValue = null | undefined | boolean | string | number | Double | BigInt | Buffer | GeoJSON;
    type AerospikeRecordValue = PartialAerospikeRecordValue | PartialAerospikeRecordValue[] | Record<string, PartialAerospikeRecordValue>;

    type AerospikeRecord = {
        [key: string]: AerospikeRecordValue
    };

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

    enum ScalarOperations {
        WRITE,
        READ,
        INCR,
        PREPEND,
        APPEND,
        TOUCH,
        DELETE
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

    // lists.js

    // hll.js

    // maps.js

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

    // bitwise.js

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

    class OrderListOperation extends ListOperation {
        public order: number;
    }

    class SortListOperation extends ListOperation {
        public flags: ListSortFlags;
    }

    // policy.js

    // status.js

    // features.js

    // client.js

    // config.js

    // double.js
    class Double {
        constructor(value: number);
        public Double: number;
        public value(): number;
    }

    // geojson.js
    type GeoJSONType = {
        type: string,
        coordinates: Array<number[] | number>
    }

    class GeoJSON {
        constructor(json: string | object);
        public str: string;
        public static Point(lng: number, lat: number): GeoJSON;
        public static Polygon(...coordinates: number[][]): GeoJSON;
        public static Circle(lng: number, lat: number, radius: number);
        public toJSON(): GeoJSONType;
        public value(): GeoJSONType;
        public toString(): string;
    }

    // key.js

    // record.js

    export interface FilterModule {
        SindexFilterPredicate: SindexFilterPredicate,
        range(bin: string, min: number, max: number, indexType?: IndexType): RangePredicate;
        equal(bin: string, value: string): EqualPredicate;
        contains(bin: string, value: string | number, indexType: IndexType): EqualPredicate;
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
        setOrder(bin: name, order: ListOrder): OrderListOperation;
        sort(bin: string, flags: ListSortFlags): SortListOperation;
    }

    export interface InfoModule {
        parse(info: string): Record<string, any>;
        separators: Object<string, string[]>;
    }
    export interface CdtModule {
        Context: CdtContext;
    }

    export declare const filter: FilterModule;
    export declare const predexp: PredexpModule;
    export declare enum regex {
        BASIC,
        EXTENDED,
        ICASE,
        NEWLINE
    };
    export declare const info: InfoModule;
    export declare const cdt: CdtModule;
}