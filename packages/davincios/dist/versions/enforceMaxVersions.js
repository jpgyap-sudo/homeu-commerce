export const enforceMaxVersions = async ({ id, collection, global: globalConfig, max, DaVinciOS, req })=>{
    const entityType = collection ? 'collection' : 'global';
    const slug = collection ? collection.slug : globalConfig?.slug;
    try {
        const where = {};
        let oldestAllowedDoc;
        if (collection) {
            where.parent = {
                equals: id
            };
            const query = await DaVinciOS.db.findVersions({
                collection: collection.slug,
                limit: 1,
                page: max + 1,
                pagination: false,
                req,
                sort: '-updatedAt',
                where
            });
            [oldestAllowedDoc] = query.docs;
        } else if (globalConfig) {
            const query = await DaVinciOS.db.findGlobalVersions({
                global: globalConfig.slug,
                limit: 1,
                page: max + 1,
                pagination: false,
                req,
                sort: '-updatedAt',
                where
            });
            [oldestAllowedDoc] = query.docs;
        }
        if (oldestAllowedDoc?.updatedAt) {
            const deleteQuery = {
                updatedAt: {
                    less_than_equal: oldestAllowedDoc.updatedAt
                }
            };
            if (collection) {
                deleteQuery.parent = {
                    equals: id
                };
            }
            const deleteVersionsArgs = {
                req,
                where: deleteQuery
            };
            if (globalConfig) {
                deleteVersionsArgs.globalSlug = slug;
            } else {
                deleteVersionsArgs.collection = slug;
            }
            await DaVinciOS.db.deleteVersions(deleteVersionsArgs);
        }
    } catch (err) {
        DaVinciOS.logger.error(err);
        DaVinciOS.logger.error(`There was an error cleaning up old versions for the ${entityType} ${slug}`);
    }
};

//# sourceMappingURL=enforceMaxVersions.js.map
