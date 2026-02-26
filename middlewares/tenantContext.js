// backend/middlewares/tenantContext.js
const { isValidObjectId } = require("../utils/objectId");

function tenantContext(req, res, next) {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isSuper = roles.includes("super_admin");

    let centerId = req.user?.centerId;

    if (isSuper) {
        const override = req.header("x-center-id") || req.query.centerId;
        if (override) {
            if (!isValidObjectId(override)) {
                return res.status(400).json({ success: false, message: "Invalid centerId override" });
            }
            centerId = override;
        }
    }

    if (!centerId) {
        return res.status(400).json({ success: false, message: "centerId missing for tenant context" });
    }

    req.tenant = { centerId: centerId.toString(), isSuper };
    next();
}

module.exports = tenantContext;