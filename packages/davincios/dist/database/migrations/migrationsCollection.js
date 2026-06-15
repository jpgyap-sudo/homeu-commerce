export const migrationsCollection = {
    slug: 'DaVinciOS-migrations',
    admin: {
        hidden: true
    },
    endpoints: false,
    fields: [
        {
            name: 'name',
            type: 'text'
        },
        {
            name: 'batch',
            type: 'number'
        }
    ],
    graphQL: false,
    lockDocuments: false
};

//# sourceMappingURL=migrationsCollection.js.map
