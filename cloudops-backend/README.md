# CloudOps Manager – backend (NestJS + Prisma + PostgreSQL)



## Run it

```bash

npm install                     # also runs `prisma generate`
npm run db:migrate              # prisma migrate deploy
npm run db:seed                 # first Admin (+ demo data when SEED_DEMO=true)
npm run start:dev               # http://localhost:3001  ·  Swagger: /api/docs  ·  Health: /health
npx prisma studio
```

