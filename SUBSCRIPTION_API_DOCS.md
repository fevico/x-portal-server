# X-Portal Subscription System API Documentation

## 📋 **Complete Endpoint List**

### **🔧 Package Management (SuperAdmin Only)**

#### 1. Create Subscription Package

```http
POST /subscription/packages
Authorization: Bearer <super_admin_token>
Content-Type: application/json

Body:
{
  "name": "Premium Package",
  "description": "Full-featured package for large schools",
  "amount": 35000,
  "duration": 12,
  "studentLimit": 1000,
  "features": {
    "cbt": true,
    "feeManagement": true,
    "bulkSMS": true,
    "apiAccess": true
  },
  "isActive": true
}

Response:
{
  "message": "Subscription package created successfully",
  "data": {
    "id": "package_id",
    "name": "Premium Package",
    "amount": 35000,
    "duration": 12,
    "studentLimit": 1000,
    "features": {...},
    "isActive": true,
    "createdAt": "2025-08-07T...",
    "updatedAt": "2025-08-07T..."
  }
}
```

#### 2. Get All Subscription Packages (Public)

```http
GET /subscription/packages?search=Basic&isActive=true&page=1&limit=10

Response:
{
  "data": [
    {
      "id": "package_id",
      "name": "Basic",
      "amount": 8000,
      "duration": 1,
      "studentLimit": 100,
      "features": {...},
      "isActive": true,
      "createdAt": "2025-08-07T...",
      "updatedAt": "2025-08-07T...",
      "_count": {
        "schools": 15,
        "payments": 23
      }
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### 3. Get Package by ID (Public)

```http
GET /subscription/packages/:id

Response:
{
  "data": {
    "id": "package_id",
    "name": "Professional",
    "amount": 28000,
    "duration": 1,
    "studentLimit": 800,
    "features": {...},
    "isActive": true,
    "_count": {
      "schools": 8,
      "payments": 12
    }
  }
}
```

#### 4. Update Subscription Package

```http
PATCH /subscription/packages/:id
Authorization: Bearer <super_admin_token>
Content-Type: application/json

Body:
{
  "amount": 30000,
  "features": {
    "newFeature": true
  }
}

Response:
{
  "message": "Subscription package updated successfully",
  "data": {
    "id": "package_id",
    "name": "Professional",
    "amount": 30000,
    ...
  }
}
```

#### 5. Delete Subscription Package (Soft Delete)

```http
DELETE /subscription/packages/:id
Authorization: Bearer <super_admin_token>

Response:
{
  "message": "Subscription package deleted successfully"
}
```

### **🏫 School Subscription Management**

#### 6. Subscribe School to Package (Online Payment)

```http
POST /subscription/subscribe
Authorization: Bearer <school_admin_token>
Content-Type: application/json

Body:
{
  "packageId": "package_id_here",
  "email": "admin@schoolname.com",
  "paymentMethod": "online",
  "metadata": {
    "schoolName": "ABC Secondary School",
    "adminName": "John Doe"
  }
}

Response:
{
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "access_code",
    "reference": "payment_reference"
  }
}
```

#### 7. Extend School Subscription (Rollover Logic)

```http
POST /subscription/extend
Authorization: Bearer <school_admin_token>
Content-Type: application/json

Body:
{
  "packageId": "current_package_id",
  "email": "admin@schoolname.com",
  "additionalMonths": 6,
  "metadata": {
    "reason": "School year extension"
  }
}

Response:
{
  "message": "Extension payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "access_code",
    "reference": "payment_reference"
  }
}
```

#### 8. Assign Subscription to School (Offline Payment)

```http
POST /subscription/assign
Authorization: Bearer <super_admin_token>
Content-Type: application/json

Body:
{
  "schoolId": "school_id_here",
  "packageId": "package_id_here",
  "paymentMethod": "offline",
  "paymentReference": "BANK_TRANSFER_REF_123",
  "metadata": {
    "paymentMode": "Bank Transfer",
    "verifiedBy": "Finance Team"
  }
}

Response:
{
  "message": "Subscription assigned successfully",
  "data": {
    "school": {...},
    "payment": {...},
    "expiryDate": "2026-08-07T..."
  }
}
```

### **📊 School Plan Details & Analytics**

#### 9. Get School Plan Details ⭐ **NEW ENDPOINT**

```http
GET /subscription/school-plan
Authorization: Bearer <school_admin_token>

Response:
{
  "schoolInfo": {
    "id": "school_id",
    "name": "ABC Secondary School",
    "slug": "abc-secondary",
    "subscriptionStatus": true,
    "subscriptionExpiresAt": "2026-08-07T...",
    "isExpired": false,
    "daysUntilExpiry": 365
  },
  "currentPlan": {
    "id": "package_id",
    "name": "Professional",
    "amount": 28000,
    "duration": 1,
    "studentLimit": 800,
    "features": {
      "cbt": true,
      "feeManagement": true,
      "bulkSMS": true,
      "attendance": true,
      "results": true,
      "parentPortal": true
    },
    "isActive": true
  },
  "usage": {
    "currentStudents": 650,
    "studentLimit": 800,
    "usagePercentage": 81
  },
  "paymentHistory": [
    {
      "id": "payment_id",
      "amount": 28000,
      "paymentDate": "2025-07-07T...",
      "paymentStatus": "success",
      "reference": "PAY_REF_123",
      "subscription": {
        "name": "Professional",
        "duration": 1
      }
    }
  ],
  "status": {
    "canAddStudents": true,
    "needsUpgrade": true,
    "isActive": true
  }
}
```

#### 10. Get Subscription Analytics (SuperAdmin)

```http
GET /subscription/analytics
Authorization: Bearer <super_admin_token>

Response:
[
  {
    "month": "January",
    "subscriptions": 15,
    "revenue": 420000
  },
  {
    "month": "February",
    "subscriptions": 23,
    "revenue": 644000
  },
  ...
]
```

### **🔗 Webhook & Payment Processing**

#### 11. Paystack Webhook

```http
POST /subscription/webhook
X-Paystack-Signature: webhook_signature

Body: (Paystack webhook payload)

Response:
{
  "message": "Payment processed successfully",
  "data": {
    "payment": {...},
    "schoolSubscription": {...}
  }
}
```

#### 12. Manual Payment Verification ⭐ **NEW ENDPOINT**

```http
POST /subscription/payments/verify/:reference
Authorization: Bearer <super_admin_token>

Response:
{
  "message": "Payment verified and processed successfully",
  "data": {
    "payment": {
      "id": "payment_id",
      "reference": "PAY_REF_123",
      "amount": 28000,
      "paymentStatus": "success",
      "paymentDate": "2025-08-07T...",
      "subscription": {...},
      "school": {...}
    },
    "school": {
      "id": "school_id",
      "subscriptionStatus": true,
      "subscriptionExpiresAt": "2026-08-07T..."
    },
    "status": "verified_and_processed",
    "expiryDate": "2026-08-07T..."
  }
}

// If already processed:
{
  "message": "Payment already verified and processed",
  "data": {
    "payment": {...},
    "status": "already_processed",
    "school": {...}
  }
}

// If verification failed:
{
  "message": "Payment verification failed",
  "data": {
    "payment": {...},
    "status": "verification_failed",
    "error": "Payment not found on Paystack"
  }
}
```

### **🔄 Legacy Endpoints (Backward Compatibility)**

#### 13. Create Subscription (Legacy)

```http
POST /subscription/create
Authorization: Bearer <super_admin_token>

Body:
{
  "name": "Legacy Package",
  "duration": 1,
  "studentLimit": 100,
  "amount": 15000
}
```

#### 13. Get All Subscriptions (Legacy)

```http
GET /subscription/fetch?search=Basic&isActive=true&page=1&limit=10
Authorization: Bearer <token>
```

#### 14. Update Subscription (Legacy)

```http
PATCH /subscription/:id
Authorization: Bearer <super_admin_token>
```

#### 15. Delete Subscription (Legacy)

```http
DELETE /subscription/:id
Authorization: Bearer <super_admin_token>
```

#### 16. Assign Subscription to School (Legacy)

```http
POST /subscription/assign-subscription-to-school
Authorization: Bearer <school_admin_token>

Body:
{
  "subscriptionId": "package_id",
  "email": "admin@school.com",
  "metadata": {}
}
```

## 📋 **Frontend Integration Guide**

### **RTK Query Setup**

```typescript
// subscription.api.ts
export const subscriptionApi = createApi({
  reducerPath: 'subscriptionApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/subscription',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Subscriptions', 'SchoolPlan'],
  endpoints: (builder) => ({
    // Get all packages (public)
    getSubscriptionPackages: builder.query<any, any>({
      query: (params) => ({
        url: '/packages',
        params,
      }),
      providesTags: ['Subscriptions'],
    }),

    // Get school plan details ⭐ YOUR REQUESTED ENDPOINT
    getSchoolPlan: builder.query<any, void>({
      query: () => ({
        url: '/school-plan',
      }),
      providesTags: ['SchoolPlan'],
    }),

    // Subscribe to package
    subscribeToPackage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/subscribe',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SchoolPlan'],
    }),

    // Extend subscription
    extendSubscription: builder.mutation<any, any>({
      query: (body) => ({
        url: '/extend',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SchoolPlan'],
    }),

    // Create package (SuperAdmin)
    createPackage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/packages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscriptions'],
    }),

    // Update package (SuperAdmin)
    updatePackage: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/packages/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Subscriptions'],
    }),

    // Delete package (SuperAdmin)
    deletePackage: builder.mutation<any, string>({
      query: (id) => ({
        url: `/packages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subscriptions'],
    }),

    // Get analytics (SuperAdmin)
    getAnalytics: builder.query<any, void>({
      query: () => ({
        url: '/analytics',
      }),
      providesTags: ['Subscriptions'],
    }),
  }),
});

export const {
  useGetSubscriptionPackagesQuery,
  useGetSchoolPlanQuery, // ⭐ YOUR REQUESTED HOOK
  useSubscribeToPackageMutation,
  useExtendSubscriptionMutation,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
  useGetAnalyticsQuery,
} = subscriptionApi;
```

### **Usage Examples**

```typescript
// In your school dashboard component
const { data: schoolPlan, isLoading, error } = useGetSchoolPlanQuery();

// In your packages listing component
const { data: packages } = useGetSubscriptionPackagesQuery({
  page: 1,
  limit: 10,
  isActive: 'true',
});

// For subscription
const [subscribeToPackage] = useSubscribeToPackageMutation();

const handleSubscribe = async (packageId: string) => {
  try {
    const result = await subscribeToPackage({
      packageId,
      email: 'admin@school.com',
      metadata: { schoolName: 'My School' },
    }).unwrap();

    // Redirect to Paystack
    window.location.href = result.data.authorization_url;
  } catch (error) {
    console.error('Subscription failed:', error);
  }
};
```

## 🎯 **Key Features**

✅ **Real Nigerian pricing** (₦8,000 - ₦45,000/month)  
✅ **Flexible JSON features** storage  
✅ **Paystack integration** with proper school context  
✅ **Rollover logic** for extensions  
✅ **Comprehensive analytics** for SuperAdmin  
✅ **School plan dashboard** for schools  
✅ **Offline payment** assignment  
✅ **Automated expiry** handling  
✅ **Soft delete** protection  
✅ **Backward compatibility** with legacy endpoints

The **`GET /subscription/school-plan`** endpoint provides everything your frontend needs to display the school's current subscription status, usage, and payment history! 🚀
