import { jobsCollectionSlug } from '../queues/config/collection.js';
export const deleteScheduledPublishJobs = async ({ id, slug, DaVinciOS, req })=>{
    try {
        await DaVinciOS.db.deleteMany({
            collection: jobsCollectionSlug,
            req,
            where: {
                and: [
                    // only want to delete jobs have not run yet
                    {
                        completedAt: {
                            exists: false
                        }
                    },
                    {
                        processing: {
                            equals: false
                        }
                    },
                    {
                        'input.doc.value': {
                            equals: id
                        }
                    },
                    {
                        'input.doc.relationTo': {
                            equals: slug
                        }
                    },
                    // data.type narrows scheduled publish jobs in case of another job having input.doc.value
                    {
                        taskSlug: {
                            equals: 'schedulePublish'
                        }
                    }
                ]
            }
        });
    } catch (err) {
        DaVinciOS.logger.error({
            err,
            msg: `There was an error deleting scheduled publish jobs from the queue for ${slug} document with ID ${id}.`
        });
    }
};

//# sourceMappingURL=deleteScheduledPublishJobs.js.map
