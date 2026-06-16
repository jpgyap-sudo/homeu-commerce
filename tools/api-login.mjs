import http from "http";

const data = JSON.stringify({ email: "jpgyap@gmail.com", password: "DaVinciOS" });

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/customers/login",
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
      if (res.statusCode === 200) {
        try {
          const j = JSON.parse(body);
          if (j.token || j.user) console.log("LOGIN SUCCESSFUL!");
          if (j.token) console.log("Token:", j.token.substring(0, 30) + "...");
        } catch {}
      }
    });
  }
);
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
