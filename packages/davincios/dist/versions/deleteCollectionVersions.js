export const deleteCollectionVersions = async ({ id, slug, DaVinciOS, req })=>{
    try {
        await DaVinciOS.db.deleteVersions({
            collection: slug,
            req,
            where: {
                parent: {
                    equals: id
                }
            }
        });
    } catch (err) {
        DaVinciOS.logger.error({
            err,
            msg: `There was an error removing versions for the deleted ${slug} document with ID ${id}.`
        });
    }
};

//# sourceMappingURL=deleteCollectionVersions.js.map
