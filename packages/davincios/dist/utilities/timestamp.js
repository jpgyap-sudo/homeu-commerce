export const timestamp = (label)=>{
    if (!process.env.DaVinciOS_TIME) {
        process.env.DaVinciOS_TIME = String(new Date().getTime());
    }
    const now = new Date();
    console.log(`[${now.getTime() - Number(process.env.DaVinciOS_TIME)}ms] ${label}`);
};

//# sourceMappingURL=timestamp.js.map
