import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import SubmissionLog from '../models/SubmissionLog.js';
import { ApiResponse } from '../utils/responseHelper.js';

const router = express.Router();

/**
 * @route   GET /api/submissions
 * @desc    Get submission logs with filtering
 * @access  Private (Admin/Super Admin)
 */
router.get(
  '/',
  auth,
  authorize(['super_admin', 'admin']),
  asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 50, 
      centerId, 
      campaignName, 
      result,
      startDate,
      endDate 
    } = req.query;

    const filter = {};

    // Apply filters based on user role
    if (req.user.role !== 'super_admin') {
      filter.centerId = req.user.centerId;
    } else if (centerId) {
      filter.centerId = centerId;
    }

    if (campaignName) {
      filter.campaignName = campaignName;
    }

    if (result && ['success', 'failed', 'pending'].includes(result)) {
      filter.result = result;
    }

    if (startDate || endDate) {
      filter['timestamps.startedAt'] = {};
      if (startDate) filter['timestamps.startedAt'].$gte = new Date(startDate);
      if (endDate) filter['timestamps.startedAt'].$lte = new Date(endDate);
    }

    const submissions = await SubmissionLog.find(filter)
      .populate('centerId', 'name verificationCode')
      .populate('userId', 'name email')
      .sort({ 'timestamps.startedAt': -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await SubmissionLog.countDocuments(filter);

    return ApiResponse.success(res, {
      message: 'Submission logs retrieved',
      data: {
        submissions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   GET /api/submissions/:id
 * @desc    Get a specific submission log
 * @access  Private (Admin/Super Admin)
 */
router.get(
  '/:id',
  auth,
  authorize(['super_admin', 'admin']),
  asyncHandler(async (req, res) => {
    const submission = await SubmissionLog.findById(req.params.id)
      .populate('centerId', 'name verificationCode')
      .populate('userId', 'name email')
      .lean();

    if (!submission) {
      return ApiResponse.notFound(res, { message: 'Submission not found' });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && 
        submission.centerId._id.toString() !== req.user.centerId.toString()) {
      return ApiResponse.error(res, {
        message: 'Access denied to this submission',
        status: 403
      });
    }

    return ApiResponse.success(res, {
      message: 'Submission retrieved',
      data: submission
    });
  })
);

/**
 * @route   DELETE /api/submissions/:id
 * @desc    Delete a submission log
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:id',
  auth,
  authorize(['super_admin']),
  asyncHandler(async (req, res) => {
    const submission = await SubmissionLog.findByIdAndDelete(req.params.id);

    if (!submission) {
      return ApiResponse.notFound(res, { message: 'Submission not found' });
    }

    return ApiResponse.success(res, {
      message: 'Submission deleted successfully'
    });
  })
);

export default router;