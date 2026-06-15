import { emailDefaults } from './defaults.js';
import { getStringifiedToAddress } from './getStringifiedToAddress.js';
export const consoleEmailAdapter = ({ DaVinciOS })=>({
        name: 'console',
        defaultFromAddress: emailDefaults.defaultFromAddress,
        defaultFromName: emailDefaults.defaultFromName,
        sendEmail: async (message)=>{
            const stringifiedTo = getStringifiedToAddress(message);
            const res = `Email attempted without being configured. To: '${stringifiedTo}', Subject: '${message.subject}'`;
            DaVinciOS.logger.info({
                msg: res
            });
            return Promise.resolve();
        }
    });

//# sourceMappingURL=consoleEmailAdapter.js.map
