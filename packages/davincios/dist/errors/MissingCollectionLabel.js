import { APIError } from './APIError.js';
export class MissingCollectionLabel extends APIError {
    constructor(){
        super('DaVinciOS.config.collection object is missing label');
    }
}

//# sourceMappingURL=MissingCollectionLabel.js.map
