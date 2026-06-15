/**
 * complete a transaction calling adapter db.commitTransaction and delete the transactionID from req
 */ export async function commitTransaction(req) {
    const { DaVinciOS, transactionID } = req;
    await DaVinciOS.db.commitTransaction(transactionID);
    delete req.transactionID;
}

//# sourceMappingURL=commitTransaction.js.map
