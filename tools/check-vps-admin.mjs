const http = require("http");
let d = "";
http.get("http://localhost:3000/admin/login", (res) => {
  res.on("data", (c) => { d += c; });
  res.on("end", () => {
    console.log("ADMIN PAGE CHECK:");
    console.log("  HTML size:", d.length, "bytes");
    console.log("  Has login section:", d.includes("template-minimal__wrap") && d.includes("login"));
    console.log("  Has email input:", d.includes("type=\"email\""));
    console.log("  Has password input:", d.includes("type=\"password\""));
    console.log("  Has data-theme:", d.includes("data-theme"));
    console.log("  Has RSC:", d.includes("__next_f"));
    const chunks = d.match(/\/_next\/static\/chunks\/[^"']+/g) || [];
    console.log("  Chunks referenced:", chunks.length);
    chunks.slice(0,5).forEach(c => console.log("    -", c.split("/").pop()));
  });
}).on("error", (e) => console.error("Error:", e.message));
