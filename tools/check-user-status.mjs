import { execSync } from "child_process";

const sql = "SELECT id, email, role FROM customers ORDER BY id;";
try {
  const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -A -t", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("Customers in DB:");
  console.log(out || "(none)");
} catch (e) {
  console.error("Error:", e.message);
}
