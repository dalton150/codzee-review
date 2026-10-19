
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isClientError = Number.isInteger(err.status) && err.status >= 400 && err.status < 500;

  const isMalformedJson =
    err.type === 'entity.parse.failed' && err.status === 400;

  const statusCode = isClientError ? err.status : 500;

  const errorCode = isMalformedJson
    ? 'INVALID_JSON'
    : isClientError
      ? err.code || 'REQUEST_ERROR'
      : 'INTERNAL_SERVER_ERROR';

  const message = isMalformedJson
    ? 'Request body contains invalid JSON'
    : isClientError
      ? err.expose === true
        ? err.message
        : 'Request could not be processed'
      : 'An unexpected error occurred';

  const log = req.log || console;

  if (statusCode >= 500) {
    log.error({ err }, 'Unhandled application error');
  } else {
    log.warn({ statusCode, errorCode }, 'Request rejected');
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
    },
  });
};

export default errorHandler;
