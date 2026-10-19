import express from 'express';
import pinoHttp from 'pino-http';
import logger from './config/logger.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import taskRoutes from './routes/taskRoutes.js';

const app = express();

app.disable('x-powered-by');
app.use(pinoHttp({
    logger,
    autoLogging:true,
}));
app.use(express.json({limit: '100kb'}));

app.get('/health',(req,res) => {
    res.status(200).json({
        status:'ok',
        service: 'codzee-review',
    });
});
app.use('/api/tasks',taskRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;