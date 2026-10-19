const validate = (schema, property = 'body') => {
    return ( req,res,next) => {
        const { error,value} = schema.validate(req[property], {
            abortEarly: false,
            convert: true,
            stripUnknown:false,
        });

        if(error) {
            return res.status(400).json({
                error:{
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: error.details.map((detail) => ({
                        field: detail.path.join('.'),
                        message: detail.message,
                    })),
                },
            });
        }

        if (property === 'query') {
            res.locals.validatedQuery = value;
        } else {
            req[property] = value;
        }
        next();
    };

};

export default validate;