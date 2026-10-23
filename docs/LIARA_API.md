# Liara API — Official OpenAPI Specifications & Verified Contracts

> **Status:** All endpoints below have been verified directly against Liara's official OpenAPI 3.0 specifications published at **https://developers.liara.ir** (`spec/paas.yaml`, `spec/me.yaml`, `spec/billing.yaml`, `spec/dns.yaml`, `spec/dbaas.yaml`).

## Official Base URLs

| Service | Base URL | Authentication |
|---|---|---|
| **PaaS** (Apps, Deployments, Disks, Envs) | `https://api.liara.ir` | `Authorization: Bearer <token>` |
| **DBaaS** (Managed Databases) | `https://api.liara.ir` | `Authorization: Bearer <token>` |
| **Billing & Accounts** | `https://api.liara.ir` | `Authorization: Bearer <token>` |
| **DNS Management** | `https://dns-service.liara.ir` | `Authorization: Bearer <token>` |
| **Object Storage** | `https://storage-service.liara.ir` | S3 API / Access Key & Secret |
| **AI (Chat Completions & Models)** | `https://api.liara.ir` | OpenAI-compatible bearer token |

Team scoping: include query parameter `?team=<teamId>` or header `x-team-id: <teamId>` (as specified in Liara OpenAPI specs).

---

## Verified Endpoints & Schemas

### 1. Account & Billing
- `GET /v1/me`: Returns user profile (`user.email`), console configuration, and available plan matrices (`plans.projects`).
- `GET /v1/billing`: Returns current balance (`user.balance`) and account type.

### 2. Applications (Projects)
- `GET /v1/projects`: List all applications owned by the user/team.
- `GET /v1/projects/{name}`: Get detailed app status, scale (0 or 1), port, domains, and the complete environment variables list (`project.envs: [{ key, value, encrypted, _id }]`).
- `POST /v1/projects`: Create a new application.
  - Schema: `{ name: string, platform: string, planID: string, readOnlyRootFilesystem?: boolean, network?: string }`
- `DELETE /v1/projects/{name}`: Delete an application.

### 3. Application Lifecycle & Operations
- `POST /v1/projects/{name}/actions/scale`: Start or stop an application.
  - Body: `{ scale: 1 }` (turn on / start) or `{ scale: 0 }` (turn off / stop).
- `POST /v1/projects/{name}/actions/restart`: Restart application containers.
- `POST /v1/projects/{name}/resize`: Change hardware plan / scale resources.
  - Body: `{ planID: string }`

### 4. Environment Variables
- `POST /v1/projects/update-envs`: Batch update, set, or unset environment variables.
  - Body:
    ```json
    {
      "project": "<appName>",
      "variables": [
        { "key": "DATABASE_URL", "value": "postgres://..." },
        { "key": "PORT", "value": "3000" }
      ]
    }
    ```
  - Note: Setting or unsetting environment variables triggers an automatic container restart.

### 5. Observability (Logs & Metrics)
- `GET /v1/projects/{name}/logs`: Retrieve recent application logs.
  - Parameter: `since` (ISO timestamp).
- `GET /v1/projects/{name}/metrics/summary`: Retrieve CPU usage series and summary metrics.
- `GET /v1/projects/{name}/metrics/cpu` & `/memory`: Dedicated time-series reports.

### 6. Deployments
- `POST /v2/projects/{name}/sources`: Deploy source code archive (.tar.gz).
- `POST /v2/projects/{name}/releases`: Deploy Docker image release.
- `GET /v1/projects/{name}/releases`: List deployment releases.
- **CLI Fallback:** `liara deploy --app <name> --api-token <token> --platform <platform> --port <port> --no-app-logs` remains supported for automated local folder packaging.

### 7. Domains & SSL
- `GET /v1/domains`: List all domains.
- `POST /v1/domains`: Register custom domain in Liara (`{ name: domain }`).
- `POST /v1/domains/set-project`: Attach domain to project (`{ domain: domainId, project: appName }`).
- `POST /v1/domains/provision-ssl-certs`: Provision Let's Encrypt SSL certificate.

### 8. DNS Service (`https://dns-service.liara.ir`)
- `GET /api/v1/zones`: List DNS zones.
- `POST /api/v1/zones`: Create DNS zone.
- `GET /api/v1/zones/{zone}/check`: Check nameservers status.
- `GET /api/v1/zones/{zone}/dns-records`: List DNS records.
- `POST /api/v1/zones/{zone}/dns-records`: Add DNS record.
- `PUT /api/v1/zones/{zone}/dns-records/{id}`: Update DNS record.
- `DELETE /api/v1/zones/{zone}/dns-records/{id}`: Delete DNS record.

### 9. Managed Databases (DBaaS)
- `GET /v1/databases`: List managed databases (PostgreSQL, MySQL, MongoDB, Redis, etc.).
- `POST /v1/databases`: Provision managed database.
- `POST /v1/databases/{id}/actions/scale`: Power on or power off database.
- `POST /v1/databases/{id}/resize`: Resize database hardware plan.
