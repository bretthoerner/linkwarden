# Local Custom Branch & Deployment Guide (`brett`)

This document explains how custom changes are maintained, rebased against upstream, built, and deployed on this machine. Future agents working in `/home/brett/linkwarden` should follow these instructions whenever asked to update, rebase, build, or redeploy Linkwarden.

---

## 1. Git Remotes & Branch Strategy

| Remote | URL | Purpose |
| --- | --- | --- |
| `origin` | `git@github.com:linkwarden/linkwarden.git` | Upstream official Linkwarden repository |
| `github` | `git@github.com:bretthoerner/linkwarden.git` | Personal fork |

* **Custom Branch:** `brett` (tracks `github/brett`).
* **Commit Strategy:** Keep all custom changes squashed into a single commit (or a small, clean set of commits) on `brett` rebased directly on top of `origin/main`.
* **What lives on `brett`:**
  1. **30-Day Soft-Delete Trash System:**
     * Prisma schema field `Link.deletedAt` (`DateTime?`) + index (`packages/prisma/schema.prisma` and `packages/prisma/migrations/20261106173000_add_deleted_at_to_link/migration.sql`).
     * Soft-delete on first `DELETE`, permanent delete when already in Trash or when `permanent` / `emptyTrash` is specified (`deleteLinkById.ts`, `deleteLinksById.ts`).
     * Restore endpoints (`PATCH /api/v1/links/[id]` and `PATCH /api/v1/links` via `restoreLinkById.ts`, `restoreLinksById.ts`).
     * Worker auto-cleanup (`apps/worker/workers/trashCleanup.ts` & `packages/lib/cleanupExpiredTrash.ts`) that permanently deletes trashed links older than 30 days (`TRASH_RETENTION_DAYS = 30`) along with their preserved files.
     * Sidebar link and Trash page (`apps/web/pages/links/trash.tsx`).
  2. **Inline Hover Action Icons in List View:**
     * `LinkList.tsx` passes `inline` to `LinkActions.tsx`, replacing the `bi-three-dots` dropdown in list mode with inline hover-only buttons (`Pin`, `Show Details`, `Edit`, `Trash` / `Restore` / `Delete Permanently`).
  3. **Dockerfile Build Fix:**
     * Installs `monolith` from its GitHub release tag (`https://github.com/Y2Z/monolith.git --tag v2.10.1`) because `monolith` was yanked from `crates.io`.

---

## 2. Production Deployment on This Host

Linkwarden runs in Docker via Docker Compose, managed by systemd:

* **Systemd service:** `/etc/systemd/system/linkwarden.service`
  * Runs `/usr/bin/docker-compose up -d` inside `/opt/linkwarden`.
* **Compose file:** `/opt/linkwarden/docker-compose.yml` (requires `sudo` to view/edit).
* **Containers:**
  * `linkwarden-linkwarden-1` (`127.0.0.1:3000->3000/tcp`, mounts `/opt/linkwarden/data` to `/data/storage`)
  * `linkwarden-postgres-1` (`postgres:16-alpine`)
* **Custom Image Tag:** `ghcr.io/linkwarden/linkwarden:brett`
  * Ensure `/opt/linkwarden/docker-compose.yml` references `image: ghcr.io/linkwarden/linkwarden:brett`:
    ```bash
    sudo sed -i 's|ghcr.io/linkwarden/linkwarden:latest|ghcr.io/linkwarden/linkwarden:brett|' /opt/linkwarden/docker-compose.yml
    ```

---

## 3. Rebase, Rebuild, and Redeploy Workflow

Run all commands from `/home/brett/linkwarden`:

### Step 1: Fetch Upstream & Rebase `brett` onto `origin/main`

```bash
cd /home/brett/linkwarden
git checkout brett
git fetch origin

# Update local main reference as well
git branch -f main origin/main

# Rebase custom commit(s) onto latest upstream main
git rebase origin/main
```

> **Note on Prisma Migrations during Rebase:**
> * Never delete or rename `packages/prisma/migrations/20261106173000_add_deleted_at_to_link/migration.sql` once it has been applied to the production database in `/opt/linkwarden`, as Prisma tracks applied migration names in `_prisma_migrations`.
> * If `packages/prisma/schema.prisma` has conflicts during rebase, keep `deletedAt DateTime?` and `@@index([deletedAt])` on the `Link` model.

### Step 2: Push Rebased Branch to Personal Fork (`github`)

```bash
git push --force-with-lease github brett:brett
```

### Step 3: Build the Local Docker Image

```bash
docker build -t ghcr.io/linkwarden/linkwarden:brett .
```

*(Note: On Arch Linux, `docker-buildx` must be installed (`sudo pacman -S docker-buildx`) for BuildKit support).*

### Step 4: Restart the Service & Verify

```bash
sudo systemctl restart linkwarden.service
```

If `systemctl restart linkwarden.service` does not recreate the container after an image rebuild, force-recreate it directly via `docker-compose`:

```bash
sudo docker-compose -f /opt/linkwarden/docker-compose.yml up -d --force-recreate linkwarden
```

Verify the container is healthy and migrations succeeded:

```bash
docker ps --filter name=linkwarden
docker logs --tail 50 linkwarden-linkwarden-1
```
