const notFound = (req,res,next) => {
    res.status(404).json({
        error: {
            code: 'ROUTE_NOT_FOUND',
            message:`Route ${req.method} ${req.originalUrl} not found`,
        },
    });
};

export default notFound;