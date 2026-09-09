// Route middleware is exported here to keep security requirements visible at the
// router boundary; authentication implementation is shared with auth controllers.
export { createAuthentication, requireProfile, requireRoles } from '../services/auth.js';
