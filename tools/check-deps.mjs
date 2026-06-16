import { execSync } from "child_process";
const mods = ["bcryptjs", "jsonwebtoken", "pg", "jose", "bcrypt"];
mods.forEach((n) => {
  try {
    const r = execSync(
      "docker exec homeu-commerce-website-1 node -e " +
        JSON.stringify("try{require('" + n + "');console.log('yes')}catch(e){console.log('no')}"),
      { encoding: "utf-8" }
    );
    console.log(n + ": " + r.trim());
  } catch (e) {
    console.log(n + ": error");
  }
});
