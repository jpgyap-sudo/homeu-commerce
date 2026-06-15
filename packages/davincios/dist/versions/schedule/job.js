export const getSchedulePublishTask = ({ adminUserSlug, collections, globals })=>{
    return {
        slug: 'schedulePublish',
        handler: async ({ input, req })=>{
            const _status = input?.type === 'publish' || !input?.type ? 'published' : 'draft';
            const userID = input.user;
            let user = null;
            if (userID) {
                user = await req.DaVinciOS.findByID({
                    id: userID,
                    collection: adminUserSlug,
                    depth: 0
                });
                user.collection = adminUserSlug;
            }
            let publishSpecificLocale;
            if (input?.type === 'publish' && input.locale && req.DaVinciOS.config.localization) {
                const matchedLocale = req.DaVinciOS.config.localization.locales.find(({ code })=>code === input.locale);
                if (matchedLocale) {
                    publishSpecificLocale = input.locale;
                }
            }
            if (input.doc) {
                await req.DaVinciOS.update({
                    id: input.doc.value,
                    collection: input.doc.relationTo,
                    data: {
                        _status
                    },
                    depth: 0,
                    overrideAccess: user === null,
                    publishSpecificLocale: publishSpecificLocale,
                    user
                });
            }
            if (input.global) {
                await req.DaVinciOS.updateGlobal({
                    slug: input.global,
                    data: {
                        _status
                    },
                    depth: 0,
                    overrideAccess: user === null,
                    publishSpecificLocale: publishSpecificLocale,
                    user
                });
            }
            return {
                output: {}
            };
        },
        inputSchema: [
            {
                name: 'type',
                type: 'radio',
                defaultValue: 'publish',
                options: [
                    'publish',
                    'unpublish'
                ]
            },
            {
                name: 'locale',
                type: 'text'
            },
            ...collections.length > 0 ? [
                {
                    name: 'doc',
                    type: 'relationship',
                    relationTo: collections
                }
            ] : [],
            {
                name: 'global',
                type: 'select',
                options: globals
            },
            {
                name: 'user',
                type: 'relationship',
                relationTo: adminUserSlug
            }
        ]
    };
};

//# sourceMappingURL=job.js.map
