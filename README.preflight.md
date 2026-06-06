# Trae Preflight

This folder is prepared for `wangxt-798-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18098
- API_PORT: 19098
- WEB_PORT: 20098
- DB_PORT: 21098
- REDIS_PORT: 22098

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
