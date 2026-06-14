import Center from "../models/Center.js";
import { success, fail } from "../utils/response.js";

export const verifyCenterCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return fail(res, { message: "Code required" });

    const center = await Center.findOne({ "verificationCode": code }).lean();
    if (!center)
      return fail(res, { message: "Invalid code" });

    // Active campaigns are returned here so the (unauthenticated) registration
    // page can render the allowed-campaign checkboxes without a second, auth-only
    // request.
    const campaigns = (center.campaigns || [])
      .filter((c) => c.isActive !== false)
      .map((c) => ({ _id: c._id, name: c.name }));

    return success(res, {
      message: "Verification successful",
      data: {
        centerId: center._id,
        centerName: center.name,
        campaigns,
      },
    });
  } catch (err) {
    console.error(err);
    return fail(res, { message: "Server error" });
  }
};
