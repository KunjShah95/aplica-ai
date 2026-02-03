# SentinelBot REST API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require either:
- **Bearer Token**: `Authorization: Bearer <access_token>`
- **API Key**: `Authorization: Bearer sk_<api_key>`

---

## Auth Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePassword123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "displayName": "John Doe",
    "role": "USER"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 604800
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "New Name",
  "avatar": "https://example.com/avatar.jpg"
}
```

### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

---

## API Keys

### List API Keys
```http
GET /api/auth/api-keys
Authorization: Bearer <token>
```

### Create API Key
```http
POST /api/auth/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My API Key",
  "scopes": ["read", "write", "conversations"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "uuid",
    "name": "My API Key",
    "key": "sk_live_...",
    "scopes": ["read", "write", "conversations"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

### Revoke API Key
```http
DELETE /api/auth/api-keys/:id
Authorization: Bearer <token>
```

---

## Conversations

### List Conversations
```http
GET /api/conversations?limit=20&offset=0&workspaceId=<workspace_id>
Authorization: Bearer <token>
```

### Create Conversation
```http
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Chat",
  "workspaceId": "uuid",
  "platform": "api"
}
```

### Get Conversation
```http
GET /api/conversations/:id
Authorization: Bearer <token>
```

### Delete Conversation
```http
DELETE /api/conversations/:id
Authorization: Bearer <token>
```

### Add Message
```http
POST /api/conversations/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "USER",
  "content": "Hello, how are you?",
  "model": "claude-sonnet-4-20250514"
}
```

### Share Conversation
```http
POST /api/conversations/:id/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "expiresInDays": 7
}
```

**Response:**
```json
{
  "share": {
    "shareToken": "abc123...",
    "shareUrl": "http://localhost:3000/shared/abc123"
  }
}
```

### Get Shared Conversation
```http
GET /api/shared/:token
```
*No authentication required*

---

## Memory

### Search Memories
```http
GET /api/memory?q=search+query&type=FACT&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` - Search query (optional)
- `type` - Memory type: FACT, PREFERENCE, EXPERIENCE, SKILL, RELATIONSHIP, CONTEXT
- `limit` - Max results (default: 10)

### Add Memory
```http
POST /api/memory
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "FACT",
  "content": "The user prefers dark mode interfaces",
  "tags": ["preferences", "ui"],
  "importance": 0.8,
  "metadata": {
    "source": "conversation"
  }
}
```

### Get Memory
```http
GET /api/memory/:id
Authorization: Bearer <token>
```

### Update Memory
```http
PUT /api/memory/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated content",
  "importance": 0.9
}
```

### Delete Memory
```http
DELETE /api/memory/:id
Authorization: Bearer <token>
```

---

## Knowledge Bases

### List Knowledge Bases
```http
GET /api/knowledge-bases?workspaceId=<workspace_id>
Authorization: Bearer <token>
```

### Create Knowledge Base
```http
POST /api/knowledge-bases
Authorization: Bearer <token>
Content-Type: application/json

{
  "workspaceId": "uuid",
  "name": "Product Documentation",
  "description": "All product docs and guides"
}
```

### Get Knowledge Base
```http
GET /api/knowledge-bases/:id
Authorization: Bearer <token>
```

### Delete Knowledge Base
```http
DELETE /api/knowledge-bases/:id
Authorization: Bearer <token>
```

### Add Document
```http
POST /api/knowledge-bases/:id/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Getting Started Guide",
  "content": "# Getting Started\n\nThis guide...",
  "sourceType": "TEXT",
  "source": "manual"
}
```

### Search Knowledge Base
```http
POST /api/knowledge-bases/:id/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "how to install",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk": "To install the application...",
      "document": {
        "id": "uuid",
        "title": "Getting Started Guide"
      },
      "similarity": 0.89
    }
  ]
}
```

---

## Teams

### List User Teams
```http
GET /api/teams
Authorization: Bearer <token>
```

### Create Team
```http
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Team",
  "slug": "my-team",
  "description": "A collaborative workspace"
}
```

### Get Team
```http
GET /api/teams/:id
Authorization: Bearer <token>
```

### Update Team
```http
PUT /api/teams/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Team Name",
  "description": "New description"
}
```

### Delete Team
```http
DELETE /api/teams/:id
Authorization: Bearer <token>
```

### Invite Member
```http
POST /api/teams/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "role": "MEMBER"
}
```

**Roles:** `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

### Remove Member
```http
DELETE /api/teams/:id/members/:userId
Authorization: Bearer <token>
```

---

## Workspaces

### List Workspaces
```http
GET /api/teams/:teamId/workspaces
Authorization: Bearer <token>
```

### Create Workspace
```http
POST /api/teams/:teamId/workspaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Development",
  "description": "Development projects workspace"
}
```

### Get Workspace
```http
GET /api/workspaces/:id
Authorization: Bearer <token>
```

### Update Workspace
```http
PUT /api/workspaces/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Workspace",
  "settings": {
    "theme": "dark"
  }
}
```

### Delete Workspace
```http
DELETE /api/workspaces/:id
Authorization: Bearer <token>
```

---

## Analytics

### Get Dashboard
```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "today": {
    "totalRequests": 150,
    "totalTokens": 45000,
    "totalCost": 0.45,
    "avgDuration": 234
  },
  "week": { ... },
  "month": { ... },
  "conversationCount": 25,
  "memoryCount": 142
}
```

### Get Usage
```http
GET /api/analytics/usage?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Get Audit Logs
```http
GET /api/analytics/audit-logs?limit=50&offset=0
Authorization: Bearer <token>
```

---

## Health Check

### Health Status
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

### Common Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
```

---

## WebSocket API

Connect to: `ws://localhost:3001`

### Authentication
Send authentication message after connecting:
```json
{
  "type": "auth",
  "token": "<access_token>"
}
```

### Send Message
```json
{
  "type": "message",
  "conversationId": "uuid",
  "content": "Hello!"
}
```

### Receive Message
```json
{
  "type": "message",
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "role": "ASSISTANT",
    "content": "Hello! How can I help you?",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Streaming Response
```json
{
  "type": "stream",
  "conversationId": "uuid",
  "chunk": "partial response text",
  "done": false
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/api/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'New Chat',
  }),
});

const { conversation } = await response.json();
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:3000/api/conversations',
    headers={'Authorization': f'Bearer {access_token}'},
    json={'title': 'New Chat'}
)

conversation = response.json()['conversation']
```

### cURL
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Chat"}'
```
