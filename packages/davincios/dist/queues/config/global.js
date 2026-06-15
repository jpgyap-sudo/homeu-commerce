export const jobStatsGlobalSlug = 'DaVinciOS-jobs-stats';
/**
 * Global config for job statistics.
 */ export const getJobStatsGlobal = (config)=>{
    return {
        slug: jobStatsGlobalSlug,
        admin: {
            group: 'System',
            hidden: true
        },
        fields: [
            {
                name: 'stats',
                type: 'json'
            }
        ]
    };
};

//# sourceMappingURL=global.js.map
