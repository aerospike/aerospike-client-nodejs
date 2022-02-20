declare module 'aerospike' {

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

    // predexp.js
    class PredicateExpression {
        constructor(code: number, arg?: string | number);
        public code: number;
        public arg: undefined | string | number;
    }

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

    export declare const filter: FilterModule;
    export declare const predexp: PredexpModule;

}