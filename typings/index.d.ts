declare module 'aerospike' {

    export type FilterModule = {
        SindexFilterPredicate,
        range, equal, contains,
        geoWithinGeoJSONRegion, geoContainsGeoJSONPoint, geoWithinRadius, geoContainsPoint
    };
    export type PredexpModule = {
        PredicateExpression,
        and, or, not,
        integerValue, stringValue, geojsonValue,
        integerBin, stringBin, geojsonBin, listBin, mapBin,
        integerVar, stringVar, geojsonVar,
        recDeviceSize, recLastUpdate, recVoidTime, recDigestModulo,
        integerEqual, integerUnequal, integerGreater, integerGreaterEq, integerLess, integerLessEq,
        stringEqual, stringUnequal, stringRegex,
        geojsonWithin, geojsonContains,
        listIterateOr, listIterateAnd,
        mapKeyIterateOr, mapKeyIterateAnd, mapValIterateOr, mapValIterateAnd
    };

    export declare const filter: FilterModule;
    export declare const predexp: PredexpModule;

    type AerospikeRecordValue = null | undefined | boolean | string | number | Double | BigInt | Buffer | GeoJSON;
    type AerospikeRecord = {
        [key: string]: AerospikeRecordValue | Array<AerospikeRecordValue> | Record<string, AerospikeRecordValue>
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

    // filter.js
    class SindexFilterPredicate {
        public constructor (
            predicate: Predicates,
            bin: string,
            dataType: IndexDataType,
            indexType: IndexType,
            props: Record<string, any>
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

    function range(bin: string, min: number, max: number, indexType?: IndexType): RangePredicate;
    function equal(bin: string, value: string): EqualPredicate;
    function contains(bin: string, value: string | number, indexType: IndexType): EqualPredicate;
    function geoWithinGeoJSONRegion(bin: string, value: GeoJSON, indexType?: IndexType): GeoPredicate;
    function geoContainsGeoJSONPoint(bin: string, value: GeoJSON, indexType?: IndexType): GeoPredicate;
    function geoWithinRadius(bin: string, lng: number, lat: number, radius: number, indexType?: IndexType): GeoPredicate;
    function geoContainsPoint(bin: string, lng: number, lat: number, indexType?: IndexType): GeoPredicate;

    // predexp.js
    class PredicateExpression {
        constructor(code: number, arg?: string | number);
        public code: number;
        public arg: undefined | string | number;
    }

    function and(nexpr: number): PredicateExpression;
    function or(count: number): PredicateExpression;
    function not(): PredicateExpression;
    function integerValue(value: number): PredicateExpression;
    function stringValue(value: string): PredicateExpression;
    function geojsonValue(value: GeoJSON): PredicateExpression;
    function integerBin(bin: string): PredicateExpression;
    function stringBin(bin: string): PredicateExpression;
    function geojsonBin(bin: string): PredicateExpression;
    function listBin(bin: string): PredicateExpression;
    function mapBin(bin: string): PredicateExpression;
    function integerVar(name: string): PredicateExpression;
    function stringVar(name: string): PredicateExpression;
    function geojsonVar(name: string): PredicateExpression;
    function recDeviceSize(): PredicateExpression;
    function recLastUpdate(): PredicateExpression;
    function recVoidTime(): PredicateExpression;
    function recDigestModulo(mod: number): PredicateExpression;
    function integerEqual(): PredicateExpression;
    function integerUnequal(): PredicateExpression;
    function integerGreater(): PredicateExpression;
    function integerGreaterEq(): PredicateExpression;
    function integerLess(): PredicateExpression;
    function integerLessEq(): PredicateExpression;
    function stringEqual(): PredicateExpression;
    function stringUnequal(): PredicateExpression;
    function stringRegex(flags?: number): PredicateExpression;
    function geojsonWithin(): PredicateExpression;
    function geojsonContains(): PredicateExpression;
    function listIterateOr(name: string): PredicateExpression;
    function listIterateAnd(name: string): PredicateExpression;
    function mapKeyIterateOr(name: string): PredicateExpression;
    function mapKeyIterateAnd(name: string): PredicateExpression;
    function mapValIterateOr(name: string): PredicateExpression;
    function mapValIterateAnd(name: string): PredicateExpression;

    // info.js

    // lists.js

    // hll.js

    // maps.js

    // cdt_context.js

    // bitwise.js

    // operations.js

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
        coordinates: Array<Array<number> | number>
    }

    class GeoJSON {
        constructor(json: string | object);
        public str: string;
        public static Point(lng: number, lat: number): GeoJSON;
        public static Polygon(...coordinates: Array<number>): GeoJSON;
        public static Circle(lng: number, lat: number, radius: number);
        public toJSON(): GeoJSONType;
        public value(): GeoJSONType;
        public toString(): string;
    }

    // key.js

    // record.js


}