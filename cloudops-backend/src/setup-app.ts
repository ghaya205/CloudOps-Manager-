import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** HTTP-level setup shared by main.ts and the e2e tests: security headers, CORS, Swagger. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // NFR-3: security headers. Swagger UI needs inline scripts, so the docs path skips Helmet's CSP.
  const secure = helmet();
  app.use((req: { path: string }, res: unknown, next: () => void) =>
    req.path.startsWith('/api/docs')
      ? next()
      : (secure as unknown as (...a: unknown[]) => void)(req, res, next),
  );

  // NFR-3: CORS restricted to the frontend origin.
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  // FR-X1: Swagger UI with a Bearer auth button.
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CloudOps Manager API')
      .setDescription(
        'Projects, servers, applications, monitoring and alerts. Roles: ADMIN, DEVOPS, VIEWER.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
