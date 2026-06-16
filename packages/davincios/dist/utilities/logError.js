export const logError = ({ err, DaVinciOS, davincios })=>{
    const dv = DaVinciOS || davincios;
    let level = 'error';
    if (err && typeof err === 'object' && 'name' in err && typeof err.name === 'string' && typeof dv.config.loggingLevels[err.name] !== 'undefined') {
        level = dv.config.loggingLevels[err.name];
    }
    if (level) {
        const logObject = {};
        if (level === 'info') {
            logObject.msg = typeof err === 'object' && 'message' in err ? err.message : 'Error';
        } else {
            logObject.err = err;
        }
        dv.logger[level](logObject);
    }
};

//# sourceMappingURL=logError.js.map
