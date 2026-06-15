/**
 * Rollback the transaction from the req using the db adapter and removes it from the req
 */ export async function killTransaction(req) {
    const { DaVinciOS, transactionID } = req;
    if (transactionID && !(transactionID instanceof Promise)) {
        try {
            await DaVinciOS.db.rollbackTransaction(req.transactionID);
        } catch (ignore) {
        // swallow any errors while attempting to rollback
        }
        delete req.transactionID;
    }
}

//# sourceMappingURL=killTransaction.js.map
