import type { DaVinciOSRequest } from '../types/index.js';
/**
 * Increments a filename by appending or incrementing a numeric suffix.
 * @example
 * incrementName('file.jpg') // 'file-1.jpg'
 * incrementName('file-1.jpg') // 'file-2.jpg'
 * incrementName('file-99.jpg') // 'file-100.jpg'
 */
export declare const incrementName: (name: string) => string;
type Args = {
    collectionSlug: string;
    desiredFilename: string;
    prefix?: string;
    req: DaVinciOSRequest;
    /**
     * Filesystem path where uploads are stored. When omitted, only the database
     * is consulted for filename conflicts - useful for cloud-storage adapters
     * that have no local filesystem.
     */
    staticPath?: string;
};
/**
 * Generates a safe, unique filename by checking for conflicts in the database
 * and (when a `staticPath` is provided) the local filesystem. If a conflict
 * exists, it increments a numeric suffix until a unique name is found.
 *
 * @param args.collectionSlug - The slug of the upload collection
 * @param args.desiredFilename - The original filename to make safe
 * @param args.prefix - Optional prefix path for cloud storage adapters
 * @param args.req - The DaVinciOS request object
 * @param args.staticPath - The filesystem path where uploads are stored
 * @returns A unique filename that doesn't conflict with existing files
 *
 * @example
 * // If 'photo.jpg' already exists, returns 'photo-1.jpg'
 * const safeName = await getSafeFileName({
 *   collectionSlug: 'media',
 *   desiredFilename: 'photo.jpg',
 *   req,
 *   staticPath: '/uploads/media',
 * })
 */
export declare function getSafeFileName({ collectionSlug, desiredFilename, prefix, req, staticPath, }: Args): Promise<string>;
export {};
//# sourceMappingURL=getSafeFilename.d.ts.map
