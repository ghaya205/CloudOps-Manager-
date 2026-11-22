import {
  BadRequestException,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ originalUrl: '/servers/1' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe('AllExceptionsFilter', () => {
  it('uses one error shape for HTTP exceptions', () => {
    const { status, body } = run(new NotFoundException('Server not found'));
    expect(status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      message: 'Server not found',
      error: 'Not Found',
      path: '/servers/1',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('keeps field-level validation messages', () => {
    const { status, body } = run(
      new BadRequestException(['email must be an email']),
    );
    expect(status).toBe(400);
    expect(body.message).toEqual(['email must be an email']);
  });

  it.each([
    ['P2002', 409],
    ['P2003', 409],
    ['P2025', 404],
  ])('maps Prisma error %s to %i', (code, expected) => {
    const err = Object.assign(new Error('db'), {
      name: 'PrismaClientKnownRequestError',
      code,
    });
    expect(run(err).status).toBe(expected);
  });

  it('hides the details of unexpected errors', () => {
    const { status, body } = run(new Error('secret stack detail'));
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
