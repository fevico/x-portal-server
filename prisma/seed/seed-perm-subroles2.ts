import { PermissionScope, PrismaClient } from '@prisma/client';
import cuid = require('cuid');

const prisma = new PrismaClient();

async function seed() {
  // Step 1: Clear existing data
  try {
    await prisma.subRolePermission.deleteMany();
    console.log('Cleared existing subrole permissions');
    await prisma.subRole.deleteMany();
    console.log('Cleared existing subroles');
    await prisma.permission.deleteMany();
    console.log('Cleared existing permissions');
  } catch (error) {
    console.error('Error clearing existing data:', error);
    throw error;
  }

  // Step 2: Define seed data
  const globalSubRoles = [
    {
      id: cuid(),
      name: 'staff',
      description: 'School staff member',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'student',
      description: 'School student',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'parent',
      description: 'Parent or guardian',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'admin',
      description: 'School administrator with full school permissions',
      isGlobal: true,
      scope: PermissionScope.school,
    },
  ];

  const permissions = [
    // Admin Menu: Dashboard
    {
      id: cuid(),
      name: 'dashboard:view',
      description: 'View the admin dashboard with school metrics',
      scope: PermissionScope.school,
    },
    // Admin Menu: Admission
    {
      id: cuid(),
      name: 'admission:create',
      description: 'Create a new admission application',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'admission:read',
      description: 'View admission applications',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'admission:update',
      description: 'Update admission details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'admission:delete',
      description: 'Delete an admission application',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'admission:approve',
      description: 'Approve or reject an admission',
      scope: PermissionScope.school,
    },
    // Admin Menu: Attendance
    {
      id: cuid(),
      name: 'attendance:mark',
      description: 'Mark attendance for students',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'attendance:read',
      description: 'View attendance records',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'attendance:update',
      description: 'Update attendance entries',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'attendance:delete',
      description: 'Delete attendance records',
      scope: PermissionScope.school,
    },
    // Admin Menu: Fees
    {
      id: cuid(),
      name: 'fee:create',
      description: 'Create a new fee structure or payment',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'fee:read',
      description: 'View fee structures and payment records',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'fee:update',
      description: 'Update fee details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'fee:delete',
      description: 'Delete a fee or payment record',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'fee:collect',
      description: 'Collect or process fee payments',
      scope: PermissionScope.school,
    },
    // Admin Menu: Students
    {
      id: cuid(),
      name: 'student:create',
      description: 'Add a new student',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'student:read',
      description: 'View student profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'student:update',
      description: 'Update student details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'student:delete',
      description: 'Delete a student record',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'student:manage',
      description: 'Manage student-related settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Staff
    {
      id: cuid(),
      name: 'staff:create',
      description: 'Add a new staff member',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'staff:read',
      description: 'View staff profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'staff:update',
      description: 'Update staff details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'staff:delete',
      description: 'Delete a staff record',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'staff:manage',
      description: 'Manage staff roles or schedules',
      scope: PermissionScope.school,
    },
    // Admin Menu: Scores
    {
      id: cuid(),
      name: 'score:create',
      description: 'Record a new score or grade',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'score:read',
      description: 'View scores or grade reports',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'score:update',
      description: 'Update score entries',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'score:delete',
      description: 'Delete score records',
      scope: PermissionScope.school,
    },
    // Admin Menu: Results
    {
      id: cuid(),
      name: 'result:read',
      description: 'View student results or report cards',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'result:publish',
      description: 'Publish or finalize results',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'result:update',
      description: 'Update result details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'result:delete',
      description: 'Delete result records',
      scope: PermissionScope.school,
    },
    // Admin Menu: CBT
    {
      id: cuid(),
      name: 'cbt:create',
      description: 'Create a new CBT exam or question',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'cbt:read',
      description: 'View CBT exams and results',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'cbt:update',
      description: 'Update CBT questions or settings',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'cbt:delete',
      description: 'Delete CBT exams or questions',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'cbt:manage',
      description: 'Manage CBT schedules or settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Communication
    {
      id: cuid(),
      name: 'communication:send',
      description: 'Send messages or notifications',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'communication:read',
      description: 'View communication logs or messages',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'communication:manage',
      description: 'Manage communication templates or settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Users
    {
      id: cuid(),
      name: 'user:create',
      description: 'Create a new user account',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'user:read',
      description: 'View user profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'user:update',
      description: 'Update user details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'user:delete',
      description: 'Delete a user account',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'user:manage',
      description: 'Manage user roles or permissions',
      scope: PermissionScope.school,
    },
    // Admin Menu: Lesson Plan
    {
      id: cuid(),
      name: 'lesson-plan:create',
      description: 'Create a new lesson plan',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'lesson-plan:read',
      description: 'View lesson plans',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'lesson-plan:update',
      description: 'Update lesson plan details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'lesson-plan:delete',
      description: 'Delete a lesson plan',
      scope: PermissionScope.school,
    },
    // Admin Menu: Help
    {
      id: cuid(),
      name: 'help:access',
      description: 'Access help resources or support tickets',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'help:manage',
      description: 'Manage help requests or FAQs',
      scope: PermissionScope.school,
    },
    // Admin Menu: Configuration
    {
      id: cuid(),
      name: 'configuration:read',
      description: 'View school configuration settings',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'configuration:update',
      description: 'Update school configuration settings',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'configuration:manage',
      description: 'Manage advanced configuration settings',
      scope: PermissionScope.school,
    },
    // SubRoles
    {
      id: cuid(),
      name: 'sub-role:create',
      description: 'Create a new sub-role',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'sub-role:read',
      description: 'View sub-role details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'sub-role:update',
      description: 'Update sub-role details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'sub-role:delete',
      description: 'Delete a sub-role',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'sub-role:manage',
      description: 'Assign permissions to sub-roles',
      scope: PermissionScope.school,
    },
    // Reports
    {
      id: cuid(),
      name: 'report:generate',
      description: 'Generate reports for various resources',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'report:export',
      description: 'Export data in various formats',
      scope: PermissionScope.school,
    },
    // Platform-scoped permissions
    {
      id: cuid(),
      name: 'user:read:platform',
      description: 'View all users across the platform',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'superadmin-dashboard:view',
      description: 'View the superadmin dashboard with platform metrics',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'school:create',
      description: 'Create a new school',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'school:read',
      description: 'View school details and lists',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'school:update',
      description: 'Update school details',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'school:delete',
      description: 'Delete a school',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'school:manage',
      description: 'Manage school settings or status',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subscription:create',
      description: 'Create a new subscription plan',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subscription:read',
      description: 'View subscription plans and details',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subscription:update',
      description: 'Update subscription details',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subscription:delete',
      description: 'Delete a subscription plan',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subscription:manage',
      description: 'Manage subscription assignments or billing',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'support:read',
      description: 'View support tickets or requests',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'support:manage',
      description: 'Manage or respond to support tickets',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'system:manage',
      description: 'Manage system-wide settings',
      scope: PermissionScope.platform,
    },
    {
      id: cuid(),
      name: 'subject:create',
      description: 'Create a new subject',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'subject:read',
      description: 'View subject details or lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'subject:update',
      description: 'Update subject details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'subject:delete',
      description: 'Delete a subject',
      scope: PermissionScope.school,
    },
    // New Class permissions
    {
      id: cuid(),
      name: 'class:create',
      description: 'Create a new class',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class:read',
      description: 'View class details or lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class:update',
      description: 'Update class details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class:delete',
      description: 'Delete a class',
      scope: PermissionScope.school,
    },
    // New ClassArm permissions
    {
      id: cuid(),
      name: 'class-arm:create',
      description: 'Create a new class arm',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class-arm:read',
      description: 'View class arm details or lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class-arm:update',
      description: 'Update class arm details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'class-arm:delete',
      description: 'Delete a class arm',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'session:create',
      description: 'Create a new academic session',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'session:read',
      description: 'View academic session details or lists',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'session:update',
      description: 'Update academic session details',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'session:delete',
      description: 'Delete an academic session',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'session:manage',
      description: 'Manage academic session settings or status',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'payment:manage',
      description: 'Create and Manage payment records or history',
      scope: PermissionScope.school,
    },
    // logs
    {
      id: cuid(),
      name: 'logs:read',
      description: 'View logs for various actions',
      scope: PermissionScope.school,
    },
    {
      id: cuid(),
      name: 'logs:manage',
      description: 'Manage log settings or retention policies',
      scope: PermissionScope.school,
    },
  ];

  const subRolePermissions = {
    staff: [
      'dashboard:view',
      'attendance:mark',
      'attendance:read',
      'attendance:update',
      'score:create',
      'score:read',
      'score:update',
      'student:read',
      'student:update',
      'lesson-plan:create',
      'lesson-plan:read',
      'lesson-plan:update',
      'communication:send',
      'communication:read',
      'help:access',
    ],
    student: [
      'dashboard:view',
      'attendance:read',
      'score:read',
      'result:read',
      'communication:read',
      'help:access',
    ],
    parent: [
      'dashboard:view',
      'attendance:read',
      'score:read',
      'result:read',
      'communication:send',
      'communication:read',
      'help:access',
    ],
    admin: permissions
      .filter((p) => p.scope === PermissionScope.school)
      .map((p) => p.name),
  };

  // Step 3: Seed permissions
  try {
    await prisma.permission.createMany({
      data: permissions,
    });
    console.log('Seeded permissions successfully');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  }

  // Step 4: Seed subroles
  try {
    await prisma.subRole.createMany({
      data: globalSubRoles,
    });
    console.log('Seeded subroles successfully');
  } catch (error) {
    console.error('Error seeding subroles:', error);
    throw error;
  }

  // Step 5: Seed subrole permissions
  try {
    const subRolePermissionData = [];
    for (const subRole of globalSubRoles) {
      const subRolePerms = subRolePermissions[subRole.name] || [];
      for (const permName of subRolePerms) {
        const permission = permissions.find((p) => p.name === permName);
        if (permission) {
          subRolePermissionData.push({
            id: cuid(),
            subRoleId: subRole.id,
            permissionId: permission.id,
            schoolId: null, // Global subroles don't require schoolId
          });
        }
      }
    }

    await prisma.subRolePermission.createMany({
      data: subRolePermissionData,
    });
    console.log('Seeded subrole permissions successfully');
  } catch (error) {
    console.error('Error seeding subrole permissions:', error);
    throw error;
  }
}

async function main() {
  try {
    await seed();
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
