import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the seed`);
  return value;
}

async function upsertUser(
  email: string,
  name: string,
  role: 'ADMIN' | 'DEVOPS' | 'VIEWER',
  password: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

async function main() {
  const admin = await upsertUser(
    required('SEED_ADMIN_EMAIL').toLowerCase(),
    process.env.SEED_ADMIN_NAME ?? 'Platform Admin',
    'ADMIN',
    required('SEED_ADMIN_PASSWORD'),
  );
  console.log(`Admin ready: ${admin.email}`);

  if (process.env.SEED_DEMO !== 'true') return;

  const demoPassword = required('SEED_DEMO_PASSWORD');
  const devops = await upsertUser(
    'devops@example.com',
    'Demo DevOps',
    'DEVOPS',
    demoPassword,
  );
  await upsertUser('viewer@example.com', 'Demo Viewer', 'VIEWER', demoPassword);

  const team = await prisma.team.upsert({
    where: { name: 'Platform' },
    update: {},
    create: { name: 'Platform', description: 'Runs the shared infrastructure' },
  });

  const project = await prisma.project.upsert({
    where: { name: 'Billing platform' },
    update: {},
    create: {
      name: 'Billing platform',
      description: 'Invoices and payments',
      status: 'ACTIVE',
      ownerId: admin.id,
      environments: { create: [{ name: 'DEV' }, { name: 'PRODUCTION' }] },
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: devops.id, role: 'MANAGER', teamId: team.id },
        ],
      },
    },
    include: { environments: true },
  });

  const prod = project.environments.find((e) => e.name === 'PRODUCTION');
  if (!prod) return;

  const web = await prisma.server.upsert({
    where: { projectId_name: { projectId: project.id, name: 'web-01' } },
    update: {},
    create: {
      name: 'web-01',
      provider: 'AWS',
      region: 'eu-west-3',
      cpu: 4,
      ramGb: 16,
      storageGb: 100,
      ipAddress: '10.0.1.10',
      projectId: project.id,
      environmentId: prod.id,
    },
  });
  await prisma.server.upsert({
    where: { projectId_name: { projectId: project.id, name: 'db-01' } },
    update: {},
    create: {
      name: 'db-01',
      provider: 'Azure',
      region: 'westeurope',
      cpu: 8,
      ramGb: 32,
      storageGb: 500,
      ipAddress: '10.0.2.10',
      projectId: project.id,
      environmentId: prod.id,
    },
  });
  await prisma.application.upsert({
    where: { serverId_name: { serverId: web.id, name: 'billing-api' } },
    update: {},
    create: {
      name: 'billing-api',
      version: '1.4.2',
      serverId: web.id,
      environmentId: prod.id,
    },
  });

  if ((await prisma.alertRule.count()) === 0) {
    await prisma.alertRule.createMany({
      data: [
        { metric: 'CPU', operator: 'GT', threshold: 90, severity: 'CRITICAL' },
        { metric: 'RAM', operator: 'GT', threshold: 85, severity: 'WARNING' },
      ],
    });
  }
  console.log('Demo data ready');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
