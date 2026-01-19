import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;

    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp
      ? exception.getResponse()
      : { message: 'Internal server error' };

    // HttpException.getResponse() can be string | object | array
    const message = (() => {
      if (typeof responseBody === 'string') return responseBody;
      const m = (responseBody as any)?.message;
      if (Array.isArray(m)) return m.join(', ');
      return m ?? 'Internal server error';
    })();

    this.logger.error(
      {
        err: exception,
        statusCode: status,
        method: req.method,
        path: req.originalUrl ?? req.url,
      },
      'Unhandled exception',
    );

    res.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl ?? req.url,
    });
  }
}
