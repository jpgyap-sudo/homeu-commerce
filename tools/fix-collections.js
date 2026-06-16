const fs = require("fs");
const path = require("path");
const dir = process.argv[2] || "/opt/homeu-commerce/apps/website/src/collections";
fs.readdirSync(dir).filter(f => f.endsWith(".ts")).forEach(f => {
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, "utf-8");
  const orig = c;
  c = c.replace(/import type .* from '@davincios\/cms'.*/g, "// Schema definition");
  c = c.replace(/import .* from '..\/access\/admin'.*/g, "");
  if (c !== orig) {
    fs.writeFileSync(fp, c);
    console.log("Fixed:", f);
  } else {
    console.log("Unchanged:", f);
  }
});
console.log("All done");
