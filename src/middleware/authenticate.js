import jwt from 'jsonwebtoken';

const authenticate = (req, res, next) => {
    const authorization = req.get('authorization');

    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
        return res.status(401).json({
            error: {
                code: 'UNAUTHENTICATED',
                message: 'A valid Bearer token is required',
            },
        });
    }

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const secret = process.env.JWT_SECRET;

    if(!secret){
        return res.status(500).json({
            error: {
                code: 'AUTHENTICATION_NOT_CONFIGURED',
                message: 'Authentication is not configured',
            },
       });
    }

    try {
        const payload  = jwt.verify(token,secret, {
            algorithms:['HS256'],
        });

        if(typeof payload === 'string' || typeof payload.sub !== 'string' || payload.sub.trim() === ''){
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'The authentication token is invalid',
                },
            });
        }
        req.user = { id: payload.sub };
        return next();
    } catch (error) {
        return res.status(401).json({
            error: {
                code: 'INVALID_TOKEN',
                message: 'The authentication token is invalid or expired',
            },
        });
    }
};

export default authenticate;