import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Turns common Prisma errors into proper HTTP errors instead of a generic 500. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    switch (exception.code) {
      case 'P2025': // record to update/delete not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2003': // foreign key violation, e.g. unknown restaurantId
        status = HttpStatus.NOT_FOUND;
        message = 'Related record not found (check restaurantId)';
        break;
      case 'P2002': // unique violation
        status = HttpStatus.CONFLICT;
        message = 'A record with the same unique value already exists';
        break;
    }
    res.status(status).json({ statusCode: status, message, error: exception.code });
  }
}
