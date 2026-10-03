/**
 * cPanel "Setup Node.js App" (Phusion Passenger) entry point.
 * Application startup file: server.js
 * Builds come from CI and are installed by deploy/server-deploy.sh (see DEPLOYMENT.md).
 * Passenger supplies PORT.
 */

// Shared hosting (CloudLinux) caps threads per account, but several libraries start
// one thread per CPU core — on a many-core server that exhausts the allowance and
// then even deploys can't start ("unable to create thread"). Cap them before anything
// loads. (V8's own pool is capped via NODE_OPTIONS, set on the app by the deploy script.)
process.env.UV_THREADPOOL_SIZE ??= "2"; // Node/libuv file & DNS pool
process.env.VIPS_CONCURRENCY ??= "1"; // sharp / libvips (Next image optimisation)
process.env.TOKIO_WORKER_THREADS ??= "2"; // Prisma query engine
try {
  const sharp = require("sharp");
  sharp.concurrency(1);
  sharp.cache(false);
} catch {
  /* sharp not installed — Next falls back to its built-in optimiser */
}

const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Braids by Peace Joy ready on port ${port}`);
  });
});
