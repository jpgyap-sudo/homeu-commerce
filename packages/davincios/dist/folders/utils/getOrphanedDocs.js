import { combineWhereConstraints } from '../../utilities/combineWhereConstraints.js';
import { formatFolderOrDocumentItem } from './formatFolderOrDocumentItem.js';
export async function getOrphanedDocs({ collectionSlug, folderFieldName, req, where }) {
    const { DaVinciOS, user } = req;
    const noParentFolderConstraint = {
        or: [
            {
                [folderFieldName]: {
                    exists: false
                }
            },
            {
                [folderFieldName]: {
                    equals: null
                }
            }
        ]
    };
    const orphanedFolders = await DaVinciOS.find({
        collection: collectionSlug,
        limit: 0,
        overrideAccess: false,
        req,
        sort: DaVinciOS.collections[collectionSlug]?.config.admin.useAsTitle,
        user,
        where: where ? combineWhereConstraints([
            noParentFolderConstraint,
            where
        ]) : noParentFolderConstraint
    });
    return orphanedFolders?.docs.map((doc)=>formatFolderOrDocumentItem({
            folderFieldName,
            isUpload: Boolean(DaVinciOS.collections[collectionSlug]?.config.upload),
            relationTo: collectionSlug,
            useAsTitle: DaVinciOS.collections[collectionSlug]?.config.admin.useAsTitle,
            value: doc
        })) || [];
}

//# sourceMappingURL=getOrphanedDocs.js.map
