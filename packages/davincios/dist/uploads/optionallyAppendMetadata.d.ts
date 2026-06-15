import type { Sharp, Metadata as SharpMetadata } from 'sharp';
import type { DaVinciOSRequest } from '../types/index.js';
export type WithMetadata = ((options: {
    metadata: SharpMetadata;
    req: DaVinciOSRequest;
}) => Promise<boolean>) | boolean;
export declare function optionallyAppendMetadata({ req, sharpFile, withMetadata, }: {
    req: DaVinciOSRequest;
    sharpFile: Sharp;
    withMetadata: WithMetadata;
}): Promise<Sharp>;
//# sourceMappingURL=optionallyAppendMetadata.d.ts.map
