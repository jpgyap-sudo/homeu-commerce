/** Mocked `req`, we don't need to use transactions, neither we want `createLocalReq` overhead. */ const req = {};
export class DatabaseKVAdapter {
    DaVinciOS;
    collectionSlug;
    constructor(DaVinciOS, collectionSlug){
        this.DaVinciOS = DaVinciOS;
        this.collectionSlug = collectionSlug;
    }
    async clear() {
        await this.DaVinciOS.db.deleteMany({
            collection: this.collectionSlug,
            req,
            where: {}
        });
    }
    async delete(key) {
        await this.DaVinciOS.db.deleteOne({
            collection: this.collectionSlug,
            req,
            where: {
                key: {
                    equals: key
                }
            }
        });
    }
    async get(key) {
        const doc = await this.DaVinciOS.db.findOne({
            collection: this.collectionSlug,
            joins: false,
            req,
            select: {
                data: true,
                key: true
            },
            where: {
                key: {
                    equals: key
                }
            }
        });
        if (doc === null) {
            return null;
        }
        return doc.data;
    }
    async has(key) {
        const { totalDocs } = await this.DaVinciOS.db.count({
            collection: this.collectionSlug,
            req,
            where: {
                key: {
                    equals: key
                }
            }
        });
        return totalDocs > 0;
    }
    async keys() {
        const result = await this.DaVinciOS.db.find({
            collection: this.collectionSlug,
            limit: 0,
            pagination: false,
            req,
            select: {
                key: true
            }
        });
        return result.docs.map((each)=>each.key);
    }
    async set(key, data) {
        await this.DaVinciOS.db.upsert({
            collection: this.collectionSlug,
            data: {
                data,
                key
            },
            joins: false,
            req,
            select: {},
            where: {
                key: {
                    equals: key
                }
            }
        });
    }
}
export const databaseKVAdapter = (options = {})=>{
    const collectionSlug = options.kvCollectionOverrides?.slug ?? 'DaVinciOS-kv';
    return {
        init: ({ DaVinciOS })=>new DatabaseKVAdapter(DaVinciOS, collectionSlug),
        kvCollection: {
            slug: collectionSlug,
            access: {
                create: ()=>false,
                delete: ()=>false,
                read: ()=>false,
                update: ()=>false
            },
            admin: {
                hidden: true
            },
            fields: [
                {
                    name: 'key',
                    type: 'text',
                    index: true,
                    required: true,
                    unique: true
                },
                {
                    name: 'data',
                    type: 'json',
                    required: true
                }
            ],
            lockDocuments: false,
            timestamps: false,
            ...options.kvCollectionOverrides
        }
    };
};

//# sourceMappingURL=DatabaseKVAdapter.js.map
