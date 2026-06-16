import fs from 'fs';
const c = fs.readFileSync('C:/Users/user/.homeu-commerce/scripts/vendor/davincios-ui/dist/exports/client/chunk-B52EQI3B.js', 'utf-8');
const imports = c.match(/from\s*['"][^'"]+['"]/g) || [];
const unique = [...new Set(imports)];
unique.sort();
for (const imp of unique) {
  console.log(imp);
}
