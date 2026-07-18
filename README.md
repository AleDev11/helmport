<div align="center">

# ⚓ Helmport

**A clean, fast and secure dashboard to view and manage your homelab Docker containers.**

Built with [Astro](https://astro.build), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com). Runs on [Bun](https://bun.sh).

![Astro](https://img.shields.io/badge/Astro-SSR-BC52EE?logo=astro&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-runtime-000000?logo=bun&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

</div>

---

## ✨ Features

- **Live container overview** — every container grouped by Compose project, with state, health, and published ports at a glance.
- **Real-time resource stats** — per-container CPU, memory, network and block I/O, sampled continuously.
- **Host & disk insight** — daemon summary plus a breakdown of Docker disk usage (images, containers, volumes, build cache) with reclaimable space.
- **Safe lifecycle controls** — start / stop / restart containers. No `exec`, no deletion, by design.
- **Polished UX** — responsive, keyboard-accessible, light & dark themes, zero layout shift.
- **Secure by default** — talks to Docker through a locked-down socket proxy; the app never touches the raw socket.

## 🖼️ Screenshots

> _Add screenshots here once running (`docs/dashboard-dark.png`, `docs/dashboard-light.png`)._

## 🔒 Security model

Exposing the Docker socket is equivalent to giving root on the host. Helmport is built to minimise that risk:

| Layer | Control |
| --- | --- |
| **Socket proxy** | The app talks to [`docker-socket-proxy`](https://github.com/Tecnativa/docker-socket-proxy) over an internal network. Only `CONTAINERS`, `INFO`, `VERSION`, `SYSTEM`, `PING` and `POST` endpoints are enabled — `EXEC`, `IMAGES`, `VOLUMES`, `NETWORKS`, `SECRETS`, `SWARM`, … are all denied. |
| **App allow-list** | The API only ever performs `start` / `stop` / `restart`. Actions are whitelisted server-side; container IDs are validated. |
| **No secrets leak** | Container env vars, mounts and command lines are never sent to the browser — only display-safe fields. |
| **CSRF protection** | Astro's `checkOrigin` plus an explicit same-origin check on every mutating request. |
| **Hardened containers** | `no-new-privileges`, dropped capabilities, read-only proxy filesystem, non-root app user, loopback-only port binding. |

> **Authentication:** Helmport ships without a login screen — it is meant to sit behind your own reverse proxy or **Cloudflare Tunnel + Access** (or Authelia, Authentik, etc.). The container port is bound to `127.0.0.1` so it is never directly exposed.

## 🚀 Quick start (Docker Compose)

```bash
git clone https://github.com/AleDev11/helmport.git
cd helmport
cp .env.example .env      # optional: change HELMPORT_PORT
docker compose up -d --build
```

Then open **http://127.0.0.1:8087** (or whatever `HELMPORT_PORT` you set).

## 🧑‍💻 Local development

Requires [Bun](https://bun.sh) ≥ 1.1 and access to a Docker socket.

```bash
bun install
bun run dev        # http://localhost:4321  (uses /var/run/docker.sock directly)
```

| Command | Description |
| --- | --- |
| `bun run dev` | Start the dev server with HMR. |
| `bun run build` | Production build (`dist/`). |
| `bun run start` | Serve the production build. |
| `bun run check` | Astro + TypeScript diagnostics. |

## ⚙️ Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HELMPORT_PORT` | `8087` | Host port (compose), bound to loopback. |
| `HELMPORT_DOCKER_HOST` | _unset_ | Socket-proxy host. When set, the app connects over TCP. |
| `HELMPORT_DOCKER_PORT` | `2375` | Socket-proxy port. |
| `HELMPORT_DOCKER_SOCKET` | `/var/run/docker.sock` | Unix socket used when no host is configured (dev). |

## 🏗️ Architecture

```
Browser ──HTTP──► Astro SSR (Bun)
                   ├── /api/overview   → host info · disk usage · containers
                   ├── /api/stats      → live per-container resource samples
                   └── /api/containers/:id/action  (start | stop | restart)
                              │
                              ▼
                     docker-socket-proxy  ──ro──►  /var/run/docker.sock
                     (least-privilege gateway)
```

- **`src/lib/docker.ts`** — the only module that speaks to Docker (via `dockerode`).
- **`src/pages/api/*`** — thin, validated JSON endpoints.
- **`src/components/dashboard/*`** — React islands hydrated on the client for live updates.
- **`src/components/ui/*`** — shadcn/ui primitives.

## 🗺️ Roadmap

- [ ] Per-container logs viewer (streaming)
- [ ] Host filesystem disk usage (mounted paths)
- [ ] Historical charts (CPU / RAM over time)
- [ ] Image & volume management
- [ ] Optional built-in authentication

## 📄 License

[MIT](./LICENSE) — contributions welcome.
