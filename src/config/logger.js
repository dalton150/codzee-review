import pino from 'pino';
const isTestEnvironment = process.env.NODE_ENV === 'test';

const logger = pino({
    level:process.env.LOG_LEVEL || (isTestEnvironment ? 'silent' : 'info'),
    redact: {
        paths : [
            'req.headers.authorization',
            'req.headers.cookie',
        ],
        censor : '[REDACTED]',
    },
});

export default logger;