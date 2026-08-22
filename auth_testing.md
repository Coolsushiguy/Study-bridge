# Auth Testing Playbook

Step 1: API Testing (Bearer token auth via Authorization header)
```
API=https://learn-bridge-44.preview.emergentagent.com
curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@studybridge.org","password":"StudyBridge2026!"}'
# returns { token, user }
TOKEN=... 
curl -s $API/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Endpoints:
- POST /api/auth/register-student
- POST /api/auth/register-parent
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET  /api/parent/consent/verify?token=...
