/**
 * X-Portal Subscription System Test/Demo
 *
 * This file demonstrates how to use the new subscription package system
 * Run this after seeding the subscription p/**
 * 9. DELETE PACKAGE (SuperAdmin - Soft Delete)
 * DELETE export {
  createPackageExample,
  getPackagesExample,
  getPackageByIdExample,
  subscribeSchoolExample,
  extendSubscriptionExample,
  assignSubscriptionExample,
  getAnalyticsExample,
  updatePackageExample,
  deletePackageExample,
  verifyPaymentExample
};on/packages/:id
 * Headers: Authorization: Bearer <super_admin_token>
 */
const deletePackageExample = {
  method: 'DELETE',
  url: '/subscription/packages/package_id_here',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
  },
};

/**
 * 10. MANUAL PAYMENT VERIFICATION (SuperAdmin)
 * POST /subscription/payments/verify/:reference
 * Headers: Authorization: Bearer <super_admin_token>
 */
const verifyPaymentExample = {
  method: 'POST',
  url: '/subscription/payments/verify/PAY_REF_123456',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
  },
};
// Example API Endpoints Usage:

/**
 * 1. CREATE SUBSCRIPTION PACKAGES (SuperAdmin only)
 * POST /subscription/packages
 * Headers: Authorization: Bearer <super_admin_token>
 */
const createPackageExample = {
  method: 'POST',
  url: '/subscription/packages',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
    'Content-Type': 'application/json',
  },
  body: {
    name: 'Custom School Package',
    description: 'Custom package for specific school needs',
    amount: 20000, // ₦20,000
    duration: 3, // 3 months
    studentLimit: 500,
    features: {
      studentLimit: 500,
      teachers: 25,
      subjects: 30,
      storage: '10GB',
      support: 'Priority',
      cbt: true,
      feeManagement: true,
      bulkSMS: true,
      attendance: true,
      results: true,
      parentPortal: true,
    },
    isActive: true,
  },
};

/**
 * 2. GET ALL SUBSCRIPTION PACKAGES (Public - no auth required)
 * GET /subscription/packages?search=Basic&isActive=true&page=1&limit=10
 */
const getPackagesExample = {
  method: 'GET',
  url: '/subscription/packages?search=Basic&isActive=true&page=1&limit=10',
};

/**
 * 3. GET PACKAGE BY ID (Public)
 * GET /subscription/packages/:id
 */
const getPackageByIdExample = {
  method: 'GET',
  url: '/subscription/packages/package_id_here',
};

/**
 * 4. SUBSCRIBE SCHOOL TO PACKAGE (School Admin)
 * POST /subscription/subscribe
 * Headers: Authorization: Bearer <school_admin_token>
 */
const subscribeSchoolExample = {
  method: 'POST',
  url: '/subscription/subscribe',
  headers: {
    Authorization: 'Bearer <school_admin_token>',
    'Content-Type': 'application/json',
  },
  body: {
    packageId: 'package_id_here',
    email: 'admin@schoolname.com',
    paymentMethod: 'online',
    metadata: {
      schoolName: 'ABC Secondary School',
      adminName: 'John Doe',
    },
  },
};

/**
 * 5. EXTEND SCHOOL SUBSCRIPTION (School Admin)
 * POST /subscription/extend
 * Headers: Authorization: Bearer <school_admin_token>
 */
const extendSubscriptionExample = {
  method: 'POST',
  url: '/subscription/extend',
  headers: {
    Authorization: 'Bearer <school_admin_token>',
    'Content-Type': 'application/json',
  },
  body: {
    packageId: 'current_package_id',
    email: 'admin@schoolname.com',
    additionalMonths: 6, // Extend by 6 months
    metadata: {
      reason: 'School year extension',
    },
  },
};

/**
 * 6. ASSIGN SUBSCRIPTION TO SCHOOL (SuperAdmin - for offline payments)
 * POST /subscription/assign
 * Headers: Authorization: Bearer <super_admin_token>
 */
const assignSubscriptionExample = {
  method: 'POST',
  url: '/subscription/assign',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
    'Content-Type': 'application/json',
  },
  body: {
    schoolId: 'school_id_here',
    packageId: 'package_id_here',
    paymentMethod: 'offline',
    paymentReference: 'BANK_TRANSFER_REF_123',
    metadata: {
      paymentMode: 'Bank Transfer',
      verifiedBy: 'Finance Team',
    },
  },
};

/**
 * 7. GET SUBSCRIPTION ANALYTICS (SuperAdmin)
 * GET /subscription/analytics
 * Headers: Authorization: Bearer <super_admin_token>
 */
const getAnalyticsExample = {
  method: 'GET',
  url: '/subscription/analytics',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
  },
};

/**
 * 8. UPDATE PACKAGE (SuperAdmin)
 * PATCH /subscription/packages/:id
 * Headers: Authorization: Bearer <super_admin_token>
 */
const updatePackageExample = {
  method: 'PATCH',
  url: '/subscription/packages/package_id_here',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
    'Content-Type': 'application/json',
  },
  body: {
    amount: 25000, // Increase price
    features: {
      // Add more features
      studentLimit: 600,
      apiAccess: true,
    },
  },
};

/**
 * 9. DELETE PACKAGE (SuperAdmin - Soft Delete)
 * DELETE /subscription/packages/:id
 * Headers: Authorization: Bearer <super_admin_token>
 */
const deletePackageExample = {
  method: 'DELETE',
  url: '/subscription/packages/package_id_here',
  headers: {
    Authorization: 'Bearer <super_admin_token>',
  },
};

/**
 * EXAMPLE WORKFLOW:
 *
 * 1. SuperAdmin creates subscription packages
 * 2. Schools browse available packages (GET /subscription/packages)
 * 3. School admin subscribes to a package (POST /subscription/subscribe)
 * 4. Paystack payment is processed via webhook
 * 5. School subscription is activated with expiry date
 * 6. School can extend subscription before/after expiry
 * 7. SuperAdmin can view analytics and manage packages
 * 8. Cron job automatically deactivates expired subscriptions
 */

/**
 * FEATURES INCLUDED:
 *
 * ✅ Real subscription packages with Nigerian pricing
 * ✅ JSON-based feature storage for flexibility
 * ✅ Paystack integration with proper school context
 * ✅ Rollover logic for subscription extensions
 * ✅ Offline payment assignment
 * ✅ Comprehensive analytics
 * ✅ Automated expiry handling
 * ✅ Soft delete for data integrity
 * ✅ Backward compatibility with legacy endpoints
 */

export {
  createPackageExample,
  getPackagesExample,
  getPackageByIdExample,
  subscribeSchoolExample,
  extendSubscriptionExample,
  assignSubscriptionExample,
  getAnalyticsExample,
  updatePackageExample,
  deletePackageExample,
};
