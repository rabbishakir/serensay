## Image Upload — Hostinger Production Setup

Before deploying to Hostinger, update `.env` (or `.env.local`) with production-safe upload paths:

```env
UPLOAD_DIR=/home/u123456789/domains/thebaymart.com/public_html/uploads/inventory
UPLOAD_URL_PREFIX=https://thebaymart.com/uploads/inventory
```

Local development values can stay:

```env
UPLOAD_DIR=./public/uploads/inventory
UPLOAD_URL_PREFIX=/uploads/inventory
```

Checklist:

1. Make sure the `UPLOAD_DIR` folder exists and is writable by your Node/PM2 user.
2. Keep `UPLOAD_DIR` outside transient build folders so uploads survive redeploys.
3. Confirm `UPLOAD_URL_PREFIX` points to a publicly reachable URL for uploaded files.
