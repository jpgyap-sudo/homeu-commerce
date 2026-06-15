import { sendEvent } from '../index.js';
export const serverInit = (DaVinciOS)=>{
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sendEvent({
        event: {
            type: 'server-init'
        },
        DaVinciOS
    });
};

//# sourceMappingURL=serverInit.js.map
