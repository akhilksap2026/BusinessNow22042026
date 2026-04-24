# REST API Documentation

| | |
|---|---|
| **Title** | [PRODUCT NAME] REST API |
| **Version** | v1 (v0.1 — Draft) |
| **Base URL** | `https://api.[YOURDOMAIN].com/v1` |
| **Auth** | Bearer Token (JWT) |
| **Date** | [YYYY-MM-DD] |
| **Status** | Draft |

---

## 1. Overview

The [PRODUCT NAME] REST API exposes the platform's core capabilities to first-party clients, partner integrations, and customer-built automations. All endpoints accept and return `application/json` over HTTPS.

- **Versioning strategy:** URI versioning (e.g. `/v1`, `/v2`). Breaking changes are released only as a new major version; the previous version is supported for at least [N months] after a successor ships.
- **Rate limiting policy:** [X requests per minute per API key]. Exceeding the limit returns **HTTP 429** with the headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`.
- **Idempotency:** Mutating endpoints accept an `Idempotency-Key` header so retries do not create duplicate side effects.

---

## 2. Authentication

The API uses short-lived **JWT bearer tokens**. Clients exchange user credentials (or a refresh token) for an access token, then attach it to every subsequent request.

### Obtain a token

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "••••••••"
}
```

### Pass the token

```http
Authorization: Bearer {token}
```

- **Token expiry:** [X hours] (access token); refresh tokens expire after [Y days].
- **Token rotation:** Refresh tokens are single-use; each call to `/auth/refresh-token` returns a new pair.
- **Revocation:** Tokens are invalidated on logout, password change, or admin revocation.

---

## 3. Error Handling

All errors share a single envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "issue": "must be a valid email address" }
    ],
    "request_id": "req_01HZX9V8K3M2N7Q5R6T4Y2P9B1"
  }
}
```

| Code | HTTP Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | **400** | Malformed JSON or missing required parameters. |
| `UNAUTHORIZED` | **401** | Missing, invalid, or expired access token. |
| `FORBIDDEN` | **403** | Authenticated but not allowed to perform the action. |
| `NOT_FOUND` | **404** | The requested resource does not exist or is hidden from the caller. |
| `CONFLICT` | **409** | The request conflicts with current resource state (e.g. duplicate email). |
| `VALIDATION_FAILED` | **422** | Payload was syntactically valid but failed business validation. |
| `RATE_LIMITED` | **429** | Rate-limit exceeded; retry after the `Retry-After` header value. |
| `INTERNAL_ERROR` | **500** | Unexpected server failure. Safe to retry idempotent calls with back-off. |

---

## 4. API Endpoints

### Auth

#### **POST** `/auth/register`

Create a new end-user account on the platform.

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "S3cure!Pass",
  "name": "Ada Lovelace"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | yes | Unique email address; used as the login identifier. |
| `password` | string | yes | Minimum 8 chars; must satisfy the password policy. |
| `name` | string | yes | Display name shown in the UI. |

**Response — 201 Created**
```json
{
  "id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "email": "user@example.com",
  "name": "Ada Lovelace",
  "created_at": "2026-04-24T10:15:00Z"
}
```

**Possible Errors:** 400, 409 (email already registered), 422.

---

#### **POST** `/auth/login`

Exchange credentials for a fresh access/refresh token pair.

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "S3cure!Pass"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | yes | Registered account email. |
| `password` | string | yes | Account password. |

**Response — 200 OK**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "rt_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Possible Errors:** 400, 401, 422, 429.

---

#### **POST** `/auth/logout`

Revoke the caller's current access and refresh tokens.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Request Body** — empty.

**Response — 204 No Content**

**Possible Errors:** 401.

---

#### **POST** `/auth/refresh-token`

Exchange a valid refresh token for a new access/refresh pair.

**Request Headers**
```http
Content-Type: application/json
```

**Request Body**
```json
{
  "refresh_token": "rt_01HZX9V8K3M2N7Q5R6T4Y2P9B1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `refresh_token` | string | yes | Single-use refresh token issued by `/auth/login`. |

**Response — 200 OK**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "rt_02JZX9V8K3M2N7Q5R6T4Y2P9B2",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Possible Errors:** 400, 401 (refresh token expired or already used), 422.

---

### Users

#### **GET** `/users/me`

Return the authenticated user's profile.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 200 OK**
```json
{
  "id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "email": "user@example.com",
  "name": "Ada Lovelace",
  "role": "member",
  "created_at": "2026-04-24T10:15:00Z"
}
```

**Possible Errors:** 401.

---

#### **PUT** `/users/me`

Update the authenticated user's profile.

**Request Headers**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "Ada L.",
  "avatar_url": "https://cdn.[YOURDOMAIN].com/avatars/ada.png"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Updated display name. |
| `avatar_url` | string (URL) | no | HTTPS URL to a public avatar image. |

**Response — 200 OK**
```json
{
  "id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "email": "user@example.com",
  "name": "Ada L.",
  "avatar_url": "https://cdn.[YOURDOMAIN].com/avatars/ada.png",
  "updated_at": "2026-04-24T10:30:00Z"
}
```

**Possible Errors:** 400, 401, 422.

---

#### **DELETE** `/users/me`

Permanently delete the authenticated user's account and associated data, subject to retention policy.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 204 No Content**

**Possible Errors:** 401, 409 (account has open obligations, e.g. active subscription).

---

### Projects

> Replace `[RESOURCE A]` for your domain. Example shown: **Projects**.

#### **GET** `/projects`

List projects visible to the caller. Supports pagination (see §6).

**Request Headers**
```http
Authorization: Bearer {token}
```

**Query Parameters:** `page`, `limit`, `sort`, `order`, optional `status` filter.

**Response — 200 OK**
```json
{
  "data": [
    {
      "id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
      "name": "Website Relaunch",
      "status": "in_progress",
      "owner_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
      "created_at": "2026-04-01T09:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

**Possible Errors:** 401, 422.

---

#### **POST** `/projects`

Create a new project.

**Request Headers**
```http
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: 9b1f2e7a-...
```

**Request Body**
```json
{
  "name": "Website Relaunch",
  "description": "Q3 marketing-site rebuild.",
  "due_date": "2026-09-30"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable project name (max 120 chars). |
| `description` | string | no | Free-text description (max 2 000 chars). |
| `due_date` | string (ISO date) | no | Target completion date. |

**Response — 201 Created**
```json
{
  "id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "name": "Website Relaunch",
  "description": "Q3 marketing-site rebuild.",
  "status": "draft",
  "due_date": "2026-09-30",
  "created_at": "2026-04-24T10:15:00Z"
}
```

**Possible Errors:** 400, 401, 403, 422.

---

#### **GET** `/projects/{id}`

Fetch a single project by ID.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 200 OK**
```json
{
  "id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "name": "Website Relaunch",
  "description": "Q3 marketing-site rebuild.",
  "status": "in_progress",
  "owner_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "due_date": "2026-09-30",
  "created_at": "2026-04-01T09:00:00Z",
  "updated_at": "2026-04-20T15:42:00Z"
}
```

**Possible Errors:** 401, 403, 404.

---

#### **PUT** `/projects/{id}`

Replace a project's mutable fields.

**Request Headers**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "Website Relaunch v2",
  "description": "Updated scope after kickoff.",
  "status": "in_progress",
  "due_date": "2026-10-15"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Updated project name. |
| `description` | string | no | Updated description. |
| `status` | string | no | One of `draft`, `in_progress`, `on_hold`, `completed`. |
| `due_date` | string (ISO date) | no | Updated target completion date. |

**Response — 200 OK** — returns the full updated project (same shape as `GET /projects/{id}`).

**Possible Errors:** 400, 401, 403, 404, 409, 422.

---

#### **DELETE** `/projects/{id}`

Soft-delete a project. The record is retained for [N days] before permanent removal.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 204 No Content**

**Possible Errors:** 401, 403, 404, 409.

---

### Tasks

> Example **[RESOURCE B]**: tasks belonging to a project.

#### **GET** `/tasks`

List tasks visible to the caller. Supports pagination and a `project_id` filter.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 200 OK**
```json
{
  "data": [
    {
      "id": "tsk_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
      "project_id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
      "title": "Draft homepage copy",
      "status": "todo",
      "assignee_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
      "due_date": "2026-05-05"
    }
  ],
  "meta": { "total": 17, "page": 1, "limit": 20 }
}
```

**Possible Errors:** 401, 422.

---

#### **POST** `/tasks`

Create a task inside a project.

**Request Headers**
```http
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: 4ad1c7b2-...
```

**Request Body**
```json
{
  "project_id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "title": "Draft homepage copy",
  "description": "First pass for review.",
  "assignee_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "due_date": "2026-05-05"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `project_id` | string | yes | Parent project ID. |
| `title` | string | yes | Task title (max 200 chars). |
| `description` | string | no | Free-text description (max 5 000 chars). |
| `assignee_id` | string | no | User ID to assign the task to. |
| `due_date` | string (ISO date) | no | Optional due date. |

**Response — 201 Created**
```json
{
  "id": "tsk_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "project_id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "title": "Draft homepage copy",
  "status": "todo",
  "assignee_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "due_date": "2026-05-05",
  "created_at": "2026-04-24T10:15:00Z"
}
```

**Possible Errors:** 400, 401, 403, 404 (unknown project), 422.

---

#### **GET** `/tasks/{id}`

Fetch a single task.

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 200 OK**
```json
{
  "id": "tsk_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "project_id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "title": "Draft homepage copy",
  "description": "First pass for review.",
  "status": "in_progress",
  "assignee_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "due_date": "2026-05-05",
  "created_at": "2026-04-24T10:15:00Z",
  "updated_at": "2026-04-25T08:00:00Z"
}
```

**Possible Errors:** 401, 403, 404.

---

#### **PUT** `/tasks/{id}`

Update a task.

**Request Headers**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "title": "Draft + finalize homepage copy",
  "status": "in_progress",
  "assignee_id": "usr_02JZX9V8K3M2N7Q5R6T4Y2P9B2",
  "due_date": "2026-05-10"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | Updated title. |
| `description` | string | no | Updated description. |
| `status` | string | no | One of `todo`, `in_progress`, `blocked`, `done`. |
| `assignee_id` | string | no | Re-assign the task to another user. |
| `due_date` | string (ISO date) | no | Updated due date. |

**Response — 200 OK** — returns the full updated task (same shape as `GET /tasks/{id}`).

**Possible Errors:** 400, 401, 403, 404, 409, 422.

---

#### **DELETE** `/tasks/{id}`

Delete a task. Cannot be undone after [N days].

**Request Headers**
```http
Authorization: Bearer {token}
```

**Response — 204 No Content**

**Possible Errors:** 401, 403, 404.

---

## 5. Webhooks

[PRODUCT NAME] can deliver webhook callbacks to a customer-supplied HTTPS endpoint when key events occur.

**Supported events**

- `project.created`
- `project.updated`
- `project.deleted`
- `task.created`
- `task.updated`
- `task.deleted`

**Delivery**

- Method: **POST** to the registered endpoint
- Header: `X-[PRODUCT]-Signature: t=<timestamp>,v1=<hmac_sha256>`
- Retries: exponential back-off for up to [24 hours] on non-2xx responses

**Payload example**

```json
{
  "id": "evt_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
  "type": "project.created",
  "created_at": "2026-04-24T10:15:00Z",
  "data": {
    "id": "prj_01HZX9V8K3M2N7Q5R6T4Y2P9B1",
    "name": "Website Relaunch",
    "status": "draft",
    "owner_id": "usr_01HZX9V8K3M2N7Q5R6T4Y2P9B1"
  }
}
```

---

## 6. Pagination

All list endpoints accept the same query parameters and return the same envelope.

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | 1-based page number. |
| `limit` | integer | `20` | Items per page (max `100`). |
| `sort` | string | `created_at` | Field to sort by. |
| `order` | string | `desc` | `asc` or `desc`. |

**Response envelope**

```json
{
  "data": [ /* array of resource objects */ ],
  "meta": {
    "total": 137,
    "page": 1,
    "limit": 20
  }
}
```

---

## 7. Changelog

| Version | Date | Changes |
|---|---|---|
| v0.1 | [YYYY-MM-DD] | Initial draft of the public REST API documentation. |
