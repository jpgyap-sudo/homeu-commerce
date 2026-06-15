import type { CollectionConfig } from '../../index.js';
import type { DaVinciOS } from '../../types/index.js';
import type { KVAdapter, KVAdapterResult, KVStoreValue } from '../index.js';
export declare class DatabaseKVAdapter implements KVAdapter {
    readonly DaVinciOS: DaVinciOS;
    readonly collectionSlug: string;
    constructor(DaVinciOS: DaVinciOS, collectionSlug: string);
    clear(): Promise<void>;
    delete(key: string): Promise<void>;
    get<T extends KVStoreValue>(key: string): Promise<null | T>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
    set(key: string, data: KVStoreValue): Promise<void>;
}
export type DatabaseKVAdapterOptions = {
    /** Override options for the generated collection */
    kvCollectionOverrides?: Partial<CollectionConfig>;
};
export declare const databaseKVAdapter: (options?: DatabaseKVAdapterOptions) => KVAdapterResult;
//# sourceMappingURL=DatabaseKVAdapter.d.ts.map
