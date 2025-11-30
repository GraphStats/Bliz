# Bliz

**A lightweight, Vite‑like development server and build tool built on top of esbuild.**

---

## Features

* ⚡ Fast dev server with static file serving
* 🔥 Hot‑module‑replacement (HMR) via WebSocket
* 📦 Production build using esbuild (bundling, minification, sourcemaps)
* ⚙️ Simple configuration file: `bliz.config.js`
* 💻 CLI commands: `bliz dev` and `bliz build`

---

## Installation

### Global install

```bash
npm i -g @graphstats/bliz
```

### As a dev dependency

```bash
npm i -D @graphstats/bliz
```

---

## Usage

Create a project folder and add a `bliz.config.js` if you need custom options (optional). The default entry point for the build is `src/index.js`.

### Development server

```bash
bliz dev
```

The dev server serves files from the project root (or the `root` option) on port 3000 (or the `port` option). Open [http://localhost:3000](http://localhost:3000) in your browser. When a source file changes, the server sends an HMR reload message to the client.

### Production build

```bash
bliz build
```

---

## License

MIT
**⚠️ UNDER BETA!**