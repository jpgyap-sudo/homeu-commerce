import { describe, expect, it, vi } from 'vitest';
import { createLocalReq } from './createLocalReq.js';
describe('createLocalReq - URL construction', ()=>{
    const mockDaVinciOS = {
        config: {
            serverURL: undefined,
            i18n: {
                fallbackLanguage: 'en',
                supportedLanguages: {
                    en: {}
                },
                translations: {}
            },
            localization: undefined
        },
        logger: {
            error: vi.fn()
        }
    };
    it('should use req.url when provided and serverURL is undefined', async ()=>{
        const req = {
            url: 'http://example.com/api/test'
        };
        const result = await createLocalReq({
            req
        }, mockDaVinciOS);
        expect(result.url).toBe('http://example.com/api/test');
        expect(mockDaVinciOS.logger.error).not.toHaveBeenCalled();
    });
    it('should use serverURL when req.url is not provided', async ()=>{
        const DaVinciOSWithServerURL = {
            config: {
                serverURL: 'http://configured-server.com',
                i18n: {
                    fallbackLanguage: 'en',
                    supportedLanguages: {
                        en: {}
                    },
                    translations: {}
                },
                localization: undefined
            },
            logger: {
                error: vi.fn()
            }
        };
        const req = {};
        const result = await createLocalReq({
            req,
            urlSuffix: '/api'
        }, DaVinciOSWithServerURL);
        expect(result.url).toContain('http://configured-server.com/api');
        expect(DaVinciOSWithServerURL.logger.error).not.toHaveBeenCalled();
    });
    it('should prioritize req.url over serverURL', async ()=>{
        const DaVinciOSWithServerURL = {
            config: {
                serverURL: 'http://configured-server.com',
                i18n: {
                    fallbackLanguage: 'en',
                    supportedLanguages: {
                        en: {}
                    },
                    translations: {}
                },
                localization: undefined
            },
            logger: {
                error: vi.fn()
            }
        };
        const req = {
            url: 'http://actual-request.com/api/test'
        };
        const result = await createLocalReq({
            req
        }, DaVinciOSWithServerURL);
        expect(result.url).toBe('http://actual-request.com/api/test');
        expect(DaVinciOSWithServerURL.logger.error).not.toHaveBeenCalled();
    });
    it('should fall back to localhost when neither req.url nor serverURL provided', async ()=>{
        const req = {};
        const result = await createLocalReq({
            req
        }, mockDaVinciOS);
        expect(result.url).toBe('http://localhost/');
        expect(mockDaVinciOS.logger.error).not.toHaveBeenCalled();
    });
    it('should append urlSuffix to serverURL when used', async ()=>{
        const DaVinciOSWithServerURL = {
            config: {
                serverURL: 'http://configured-server.com',
                i18n: {
                    fallbackLanguage: 'en',
                    supportedLanguages: {
                        en: {}
                    },
                    translations: {}
                },
                localization: undefined
            },
            logger: {
                error: vi.fn()
            }
        };
        const req = {};
        const result = await createLocalReq({
            req,
            urlSuffix: '/api/preview'
        }, DaVinciOSWithServerURL);
        expect(result.url).toContain('/api/preview');
        expect(DaVinciOSWithServerURL.logger.error).not.toHaveBeenCalled();
    });
    it('should append urlSuffix to fallback URL when neither req.url nor serverURL provided', async ()=>{
        const req = {};
        const result = await createLocalReq({
            req,
            urlSuffix: '/api/test'
        }, mockDaVinciOS);
        expect(result.url).toBe('http://localhost/api/test');
        expect(mockDaVinciOS.logger.error).not.toHaveBeenCalled();
    });
});

//# sourceMappingURL=createLocalReq.spec.js.map
