// Simple script to be run INSIDE the website container
const bcrypt = require("bcryptjs");
const hash = bcrypt.hashSync("DaVinciOS", 10);
console.log(hash);
