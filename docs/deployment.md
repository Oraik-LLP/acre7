# Deploy Acre7 with Dokploy and Cloudflare

The public demo and the live floor-plan reader are distinct. The five Cedar House panoramas are prepared images; uploading a plan currently produces a structured room/opening analysis only. It does not generate a new overhead image or room panoramas yet.

## Dokploy application

1. Open the Acre7 application in Dokploy. In **General**, confirm its source is the GitHub repository `Oraik-LLP/acre7` on branch `main`.
2. Under **Build Type**, choose **Dockerfile**. Set **Dockerfile Path** to `Dockerfile` and **Docker Context Path** to `.` (repository root). Save the application settings.
3. Under **Environment**, add the runtime variables listed below. Keep real API keys here only.
4. In **General**, check **Auto Deploy**. With the GitHub App connected, pushes to the selected `main` branch can trigger a deployment. If it is off, use the **Deploy** button after each push.
5. In **Domains**, add `acres7.oraik.co` with path `/`, container port **3000**, HTTPS on, and a Let's Encrypt certificate. The domain port routes through Dokploy's proxy; it does not need to be exposed from the host as a public port.
6. Deploy and open **Deployments** and **Logs** to confirm that the container starts. Set `/api/health` as the health-check path if your Dokploy version offers one. A healthy response is `{"status":"ok","service":"acre7"}`.

The Docker image builds Next.js as a standalone Node server and listens on `0.0.0.0:3000`. It needs Node 22 only inside the image; no Node installation on the host is required.

## Environment

Add variables in Dokploy's **Environment** tab, never to the Git repository:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side floor-plan analysis credential. |
| `GEMINI_TEXT_MODEL` | Gemini analysis model, default `gemini-3.1-flash-lite-preview`. |
| `ACRE7_ANALYSIS_ENABLED` | Set to `true` only when live plan reading should accept paid requests. Production defaults to off. |
| `GROK_API_KEY` | Reserved for future live panorama generation; the current tour does not use it. |
| `IMAGE_MODEL_CHOICE` | Reserved xAI image model choice. |

Use [`env.template`](../env.template) as a name-only checklist. Do not paste API keys into build arguments or a public `NEXT_PUBLIC_` variable. The running server reads them at request time.

## Cloudflare DNS and TLS

Find the server's public IPv4 address in your VPS provider's server details (or the address used to reach your Dokploy dashboard). In Cloudflare, open the `oraik.co` zone → **DNS** → **Records** → **Add record**. Choose type **A**, name **`acres7`**, and set the target to that public IPv4 address. Save it; do not substitute the container's private address or port. If the server has a stable public hostname instead of an IP, use a CNAME record pointing to that hostname.

After DNS resolves, assign the same full hostname to the Dokploy app as described above and issue the Let's Encrypt certificate. Set the Cloudflare record to **Proxied** for the public site. In Cloudflare **SSL/TLS → Overview**, select **Full (strict)** once the origin presents a valid certificate for `acres7.oraik.co`. Cloudflare should not cache `/api/*` responses; the status and health responses explicitly set `Cache-Control: no-store`.

## Verification

- `GET /api/health` should return HTTP 200 and `status: ok`.
- `GET /api/provider-status` reports whether Gemini and xAI keys are present and whether live analysis is enabled. It never returns key values.
- `POST /api/analyze` accepts multipart form data with `floorPlan` (PNG, JPG, or PDF; max 20 MB), `materials` JSON, and optional `instructions`. It returns HTTP 503 until both a Gemini key and `ACRE7_ANALYSIS_ENABLED=true` are present in production.
- Visit `/designer`, open **Preview generated Cedar House**, select each viewpoint, enter the panoramic tour, and check fullscreen on a phone and desktop.

The analysis endpoint is public when enabled. Add an access policy or rate limit in Cloudflare before enabling it on a public domain to control provider spending. The future one-time token system is recorded in [`acre7-future-todos.md`](acre7-future-todos.md).
