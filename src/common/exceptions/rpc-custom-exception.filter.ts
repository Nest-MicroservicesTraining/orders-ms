import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

import { RpcException } from '@nestjs/microservices';
import type { Response } from 'express';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response<unknown>>();

    const rcpError = exception.getError();

    // console.log('rcperror', rcpError);

    if (
      typeof rcpError === 'object' &&
      rcpError !== null &&
      'status' in rcpError &&
      'message' in rcpError &&
      typeof rcpError.status === 'number' &&
      typeof rcpError.message === 'string'
    )
      return response.status(rcpError.status).json(rcpError);

    return response.status(HttpStatus.BAD_REQUEST).json(rcpError);
  }
}
