import { PermissionScope, PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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
      id: uuidv4(),
      name: 'Staff',
      description: 'School staff member',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'Student',
      description: 'School student',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'Parent',
      description: 'Parent or guardian',
      isGlobal: true,
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'Admin',
      description: 'School administrator with full school permissions',
      isGlobal: true,
      scope: PermissionScope.school,
    },
  ];

  const permissions = [
    // Admin Menu: Dashboard
    {
      id: uuidv4(),
      name: 'dashboard:view',
      description: 'View the admin dashboard with school metrics',
      scope: PermissionScope.school,
    },
    // Admin Menu: Admission
    {
      id: uuidv4(),
      name: 'admission:create',
      description: 'Create a new admission application',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'admission:read',
      description: 'View admission applications',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'admission:update',
      description: 'Update admission details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'admission:delete',
      description: 'Delete an admission application',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'admission:approve',
      description: 'Approve or reject an admission',
      scope: PermissionScope.school,
    },
    // Admin Menu: Attendance
    {
      id: uuidv4(),
      name: 'attendance:mark',
      description: 'Mark attendance for students',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'attendance:read',
      description: 'View attendance records',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'attendance:update',
      description: 'Update attendance entries',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'attendance:delete',
      description: 'Delete attendance records',
      scope: PermissionScope.school,
    },
    // Admin Menu: Fees
    {
      id: uuidv4(),
      name: 'fee:create',
      description: 'Create a new fee structure or payment',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'fee:read',
      description: 'View fee structures and payment records',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'fee:update',
      description: 'Update fee details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'fee:delete',
      description: 'Delete a fee or payment record',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'fee:collect',
      description: 'Collect or process fee payments',
      scope: PermissionScope.school,
    },
    // Admin Menu: Students
    {
      id: uuidv4(),
      name: 'student:create',
      description: 'Add a new student',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'student:read',
      description: 'View student profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'student:update',
      description: 'Update student details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'student:delete',
      description: 'Delete a student record',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'student:manage',
      description: 'Manage student-related settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Staff
    {
      id: uuidv4(),
      name: 'staff:create',
      description: 'Add a new staff member',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'staff:read',
      description: 'View staff profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'staff:update',
      description: 'Update staff details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'staff:delete',
      description: 'Delete a staff record',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'staff:manage',
      description: 'Manage staff roles or schedules',
      scope: PermissionScope.school,
    },
    // Admin Menu: Scores
    {
      id: uuidv4(),
      name: 'score:create',
      description: 'Record a new score or grade',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'score:read',
      description: 'View scores or grade reports',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'score:update',
      description: 'Update score entries',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'score:delete',
      description: 'Delete score records',
      scope: PermissionScope.school,
    },
    // Admin Menu: Results
    {
      id: uuidv4(),
      name: 'result:read',
      description: 'View student results or report cards',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'result:publish',
      description: 'Publish or finalize results',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'result:update',
      description: 'Update result details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'result:delete',
      description: 'Delete result records',
      scope: PermissionScope.school,
    },
    // Admin Menu: CBT
    {
      id: uuidv4(),
      name: 'cbt:create',
      description: 'Create a new CBT exam or question',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'cbt:read',
      description: 'View CBT exams and results',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'cbt:update',
      description: 'Update CBT questions or settings',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'cbt:delete',
      description: 'Delete CBT exams or questions',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'cbt:manage',
      description: 'Manage CBT schedules or settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Communication
    {
      id: uuidv4(),
      name: 'communication:send',
      description: 'Send messages or notifications',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'communication:read',
      description: 'View communication logs or messages',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'communication:manage',
      description: 'Manage communication templates or settings',
      scope: PermissionScope.school,
    },
    // Admin Menu: Users
    {
      id: uuidv4(),
      name: 'user:create',
      description: 'Create a new user account',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'user:read',
      description: 'View user profiles and lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'user:update',
      description: 'Update user details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'user:delete',
      description: 'Delete a user account',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'user:manage',
      description: 'Manage user roles or permissions',
      scope: PermissionScope.school,
    },
    // Admin Menu: Lesson Plan
    {
      id: uuidv4(),
      name: 'lesson-plan:create',
      description: 'Create a new lesson plan',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'lesson-plan:read',
      description: 'View lesson plans',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'lesson-plan:update',
      description: 'Update lesson plan details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'lesson-plan:delete',
      description: 'Delete a lesson plan',
      scope: PermissionScope.school,
    },
    // Admin Menu: Help
    {
      id: uuidv4(),
      name: 'help:access',
      description: 'Access help resources or support tickets',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'help:manage',
      description: 'Manage help requests or FAQs',
      scope: PermissionScope.school,
    },
    // Admin Menu: Configuration
    {
      id: uuidv4(),
      name: 'configuration:read',
      description: 'View school configuration settings',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'configuration:update',
      description: 'Update school configuration settings',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'configuration:manage',
      description: 'Manage advanced configuration settings',
      scope: PermissionScope.school,
    },
    // SubRoles
    {
      id: uuidv4(),
      name: 'sub-role:create',
      description: 'Create a new sub-role',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'sub-role:read',
      description: 'View sub-role details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'sub-role:update',
      description: 'Update sub-role details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'sub-role:delete',
      description: 'Delete a sub-role',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'sub-role:manage',
      description: 'Assign permissions to sub-roles',
      scope: PermissionScope.school,
    },
    // Reports
    {
      id: uuidv4(),
      name: 'report:generate',
      description: 'Generate reports for various resources',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'report:export',
      description: 'Export data in various formats',
      scope: PermissionScope.school,
    },
    // Platform-scoped permissions
    {
      id: uuidv4(),
      name: 'user:read:platform',
      description: 'View all users across the platform',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'superadmin-dashboard:view',
      description: 'View the superadmin dashboard with platform metrics',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'school:create',
      description: 'Create a new school',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'school:read',
      description: 'View school details and lists',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'school:update',
      description: 'Update school details',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'school:delete',
      description: 'Delete a school',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'school:manage',
      description: 'Manage school settings or status',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subscription:create',
      description: 'Create a new subscription plan',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subscription:read',
      description: 'View subscription plans and details',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subscription:update',
      description: 'Update subscription details',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subscription:delete',
      description: 'Delete a subscription plan',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subscription:manage',
      description: 'Manage subscription assignments or billing',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'support:read',
      description: 'View support tickets or requests',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'support:manage',
      description: 'Manage or respond to support tickets',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'system:manage',
      description: 'Manage system-wide settings',
      scope: PermissionScope.platform,
    },
    {
      id: uuidv4(),
      name: 'subject:create',
      description: 'Create a new subject',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'subject:read',
      description: 'View subject details or lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'subject:update',
      description: 'Update subject details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'subject:delete',
      description: 'Delete a subject',
      scope: PermissionScope.school,
    },
    // New Class permissions
    {
      id: uuidv4(),
      name: 'class:create',
      description: 'Create a new class',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class:read',
      description: 'View class details or lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class:update',
      description: 'Update class details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class:delete',
      description: 'Delete a class',
      scope: PermissionScope.school,
    },
    // New ClassArm permissions
    {
      id: uuidv4(),
      name: 'class-arm:create',
      description: 'Create a new class arm',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class-arm:read',
      description: 'View class arm details or lists',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class-arm:update',
      description: 'Update class arm details',
      scope: PermissionScope.school,
    },
    {
      id: uuidv4(),
      name: 'class-arm:delete',
      description: 'Delete a class arm',
      scope: PermissionScope.school,
    },
  ];

  const subRolePermissions = {
    Staff: [
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
    Student: [
      'dashboard:view',
      'attendance:read',
      'score:read',
      'result:read',
      'communication:read',
      'help:access',
    ],
    Parent: [
      'dashboard:view',
      'attendance:read',
      'score:read',
      'result:read',
      'communication:send',
      'communication:read',
      'help:access',
    ],
    Admin: permissions
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
            id: uuidv4(),
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
