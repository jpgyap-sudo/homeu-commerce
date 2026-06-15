import { FileUploadError } from '../errors/index.js';
import { saveBufferToFile } from './saveBufferToFile.js';
export const uploadFiles = async (DaVinciOS, files, req)=>{
    try {
        await Promise.all(files.map(async ({ buffer, path })=>{
            await saveBufferToFile(buffer, path);
        }));
    } catch (err) {
        DaVinciOS.logger.error(err);
        throw new FileUploadError(req.t);
    }
};

//# sourceMappingURL=uploadFiles.js.map
