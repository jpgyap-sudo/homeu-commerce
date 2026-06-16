import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const src = resolve(import.meta.dirname || ".", "nginx-homeu.conf");
const content = readFileSync(src, "utf-8");

// Replace the redirect to use /admin/login instead of /admin
const fixed = content.replace(
  /return 301 https:\/\/\$host\/admin;/,
  "return 301 https://$host/admin/login;"
);

// Add /admin -> /admin/login redirect
const withAdminRedirect = fixed.replace(
  /(client_max_body_size 50M;)/,
  "$1\n    # Redirect /admin to login (Docker container lacks admin/page.tsx)\n    location = /admin { return 302 /admin/login; }"
);

// Base64 encode
const b64 = Buffer.from(withAdminRedirect).toString("base64");
writeFileSync(resolve(import.meta.dirname || ".", "..", "nginx_config.b64"), b64);
console.log("Base64 config written to nginx_config.b64");
console.log("Size:", b64.length, "bytes");
