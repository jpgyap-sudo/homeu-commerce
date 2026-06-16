import http from "http";

const data = JSON.stringify({
  email: "jpgyap@gmail.com",
  password: "DaVinciOS",
  name: "Admin User",
  phone: "+639175550000",
  role: "admin",
});

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/customers",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", body);
    });
  }
);
req.write(data);
req.end();
