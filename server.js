/**
 * cPanel "Setup Node.js App" (Phusion Passenger) entry point.
 * Application startup file: server.js
 * Build first (locally or in CI): `npm run build`, then upload the project
 * including the `.next` folder. Passenger supplies PORT.
 */
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Braidsbypeacejoy API ready on port ${port}`);
  });
});
