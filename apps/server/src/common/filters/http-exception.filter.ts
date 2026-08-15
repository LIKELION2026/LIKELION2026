import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

interface ErrorResponseBody {
  message: string | string[];
  path: string;
  statusCode: number;
  timestamp: string;
}

interface HttpResponseLike {
  status(statusCode: number): {
    json(body: ErrorResponseBody): void;
  };
}

interface HttpRequestLike {
  url: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      message: getMessage(exception),
      path: request.url,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
}

function getMessage(exception: unknown): string | string[] {
  if (!(exception instanceof HttpException)) {
    return "Internal server error";
  }

  const response = exception.getResponse();
  if (typeof response === "string") {
    return response;
  }

  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response
  ) {
    const message = response.message;

    if (typeof message === "string" || isStringArray(message)) {
      return message;
    }
  }

  return exception.message;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
