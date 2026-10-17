import express from 'express';

const app = express();

app.disable('x-powered-by');
app.use(express.json({limit: '100kb'}));

app.get('/health',(req,res) => {
    res.status(200).json({
        status:'ok',
        service: 'codzee-review',
    });
});

export default app;