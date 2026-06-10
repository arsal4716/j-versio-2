const JWT = {
  SECRET: process.env.JWT_SECRET || 'your_super_secure_jwt_secret_here',
  EXPIRES_IN: '7d'
};

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

export { JWT, ROLES, STATUS_CODES };