import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  it('lets any authenticated user through when no role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ role: 'VIEWER' }))).toBe(true);
  });

  it('allows a listed role', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'DEVOPS']);
    expect(guard.canActivate(contextFor({ role: 'DEVOPS' }))).toBe(true);
  });

  it('rejects an unlisted role with 403', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'DEVOPS']);
    expect(() => guard.canActivate(contextFor({ role: 'VIEWER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request without a user', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
