import { sanitizeConfig } from './sanitize.js';
/**
 * @description Builds and validates DaVinciOS configuration
 * @param config DaVinciOS Config
 * @returns Built and sanitized DaVinciOS Config
 */ export async function buildConfig(config) {
    if (Array.isArray(config.plugins)) {
        const sorted = [
            ...config.plugins
        ].sort((a, b)=>(a.order ?? 0) - (b.order ?? 0));
        for (const plugin of sorted){
            config = await plugin(config);
        }
    }
    return await sanitizeConfig(config);
}

//# sourceMappingURL=build.js.map
