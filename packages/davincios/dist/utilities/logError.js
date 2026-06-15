export const logError = ({ err, DaVinciOS })=>{
    let level = 'error';
    if (err && typeof err === 'object' && 'name' in err && typeof err.name === 'string' && typeof DaVinciOS.config.loggingLevels[err.name] !== 'undefined') {
        level = DaVinciOS.config.loggingLevels[err.name];
    }
    if (level) {
        const logObject = {};
        if (level === 'info') {
            logObject.msg = typeof err === 'object' && 'message' in err ? err.message : 'Error';
        } else {
            logObject.err = err;
        }
        DaVinciOS.logger[level](logObject);
    }
};

//# sourceMappingURL=logError.js.map
