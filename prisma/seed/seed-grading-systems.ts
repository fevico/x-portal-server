import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targetSchoolId = '4fa4c69b-b7f2-40ea-95c8-4b5c12343f55';

// A1-F9 Grading System Data
const a1ToF9Grades = [
  { name: 'A1', scoreStartPoint: 75, scoreEndPoint: 100, remark: 'Excellent', teacherComment: 'Outstanding performance', principalComment: 'Exceptional work' },
  { name: 'B2', scoreStartPoint: 70, scoreEndPoint: 74, remark: 'Very Good', teacherComment: 'Very good performance', principalComment: 'Commendable effort' },
  { name: 'B3', scoreStartPoint: 65, scoreEndPoint: 69, remark: 'Good', teacherComment: 'Good performance', principalComment: 'Good work' },
  { name: 'C4', scoreStartPoint: 60, scoreEndPoint: 64, remark: 'Credit', teacherComment: 'Credit level performance', principalComment: 'Satisfactory performance' },
  { name: 'C5', scoreStartPoint: 55, scoreEndPoint: 59, remark: 'Credit', teacherComment: 'Credit level performance', principalComment: 'Adequate performance' },
  { name: 'C6', scoreStartPoint: 50, scoreEndPoint: 54, remark: 'Credit', teacherComment: 'Credit level performance', principalComment: 'Fair performance' },
  { name: 'D7', scoreStartPoint: 45, scoreEndPoint: 49, remark: 'Pass', teacherComment: 'Pass level performance', principalComment: 'Needs improvement' },
  { name: 'E8', scoreStartPoint: 40, scoreEndPoint: 44, remark: 'Pass', teacherComment: 'Pass level performance', principalComment: 'Significant improvement needed' },
  { name: 'F9', scoreStartPoint: 0, scoreEndPoint: 39, remark: 'Fail', teacherComment: 'Below standard', principalComment: 'Must work harder' },
];

// A-F Simple Grading System Data
const aToFGrades = [
  { name: 'A', scoreStartPoint: 80, scoreEndPoint: 100, remark: 'Excellent', teacherComment: 'Excellent work', principalComment: 'Outstanding performance' },
  { name: 'B', scoreStartPoint: 70, scoreEndPoint: 79, remark: 'Very Good', teacherComment: 'Very good effort', principalComment: 'Commendable work' },
  { name: 'C', scoreStartPoint: 60, scoreEndPoint: 69, remark: 'Good', teacherComment: 'Good performance', principalComment: 'Satisfactory effort' },
  { name: 'D', scoreStartPoint: 50, scoreEndPoint: 59, remark: 'Fair', teacherComment: 'Fair performance', principalComment: 'Needs improvement' },
  { name: 'E', scoreStartPoint: 40, scoreEndPoint: 49, remark: 'Poor', teacherComment: 'Poor performance', principalComment: 'Significant improvement required' },
  { name: 'F', scoreStartPoint: 0, scoreEndPoint: 39, remark: 'Fail', teacherComment: 'Below standard', principalComment: 'Must work much harder' },
];

async function seedGradingSystems() {
  console.log('🌱 Starting grading systems seeding...');

  try {
    // Check if the school exists
    const school = await prisma.school.findUnique({
      where: { id: targetSchoolId },
    });

    if (!school) {
      console.log(`❌ School with ID ${targetSchoolId} not found!`);
      return;
    }

    console.log(`✅ Found school: ${school.name}`);

    // Clean up existing grading systems for this school (if any)
    console.log('🧹 Cleaning up existing grading systems...');
    
    // Delete grades first (foreign key constraint)
    await prisma.grade.deleteMany({
      where: { schoolId: targetSchoolId },
    });
    
    // Delete class grading system assignments
    await prisma.classGradingSystem.deleteMany({
      where: { schoolId: targetSchoolId },
    });
    
    // Delete grading systems
    await prisma.gradingSystem.deleteMany({
      where: { schoolId: targetSchoolId },
    });

    console.log('✅ Cleanup completed');

    // Create A1-F9 Grading System
    console.log('📚 Creating A1-F9 Grading System...');
    const a1ToF9System = await prisma.gradingSystem.create({
      data: {
        name: 'Nigerian WAEC Grading System (A1-F9)',
        schoolId: targetSchoolId,
        createdBy: 'system-seed',
      },
    });

    console.log(`✅ Created grading system: ${a1ToF9System.name}`);

    // Create grades for A1-F9 system
    console.log('📝 Creating A1-F9 grades...');
    for (const gradeData of a1ToF9Grades) {
      await prisma.grade.create({
        data: {
          ...gradeData,
          gradingSystemId: a1ToF9System.id,
          schoolId: targetSchoolId,
          createdBy: 'system-seed',
        },
      });
    }

    console.log(`✅ Created ${a1ToF9Grades.length} grades for A1-F9 system`);

    // Create A-F Simple Grading System
    console.log('📚 Creating A-F Simple Grading System...');
    const aToFSystem = await prisma.gradingSystem.create({
      data: {
        name: 'Simple Letter Grading System (A-F)',
        schoolId: targetSchoolId,
        createdBy: 'system-seed',
      },
    });

    console.log(`✅ Created grading system: ${aToFSystem.name}`);

    // Create grades for A-F system
    console.log('📝 Creating A-F grades...');
    for (const gradeData of aToFGrades) {
      await prisma.grade.create({
        data: {
          ...gradeData,
          gradingSystemId: aToFSystem.id,
          schoolId: targetSchoolId,
          createdBy: 'system-seed',
        },
      });
    }

    console.log(`✅ Created ${aToFGrades.length} grades for A-F system`);

    // Display summary
    console.log('\n📊 GRADING SYSTEMS SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`School: ${school.name}`);
    console.log(`School ID: ${targetSchoolId}`);
    console.log('\n🎯 Created Grading Systems:');
    console.log(`1. ${a1ToF9System.name}`);
    console.log(`   - ID: ${a1ToF9System.id}`);
    console.log(`   - Grades: A1, B2, B3, C4, C5, C6, D7, E8, F9`);
    console.log(`\n2. ${aToFSystem.name}`);
    console.log(`   - ID: ${aToFSystem.id}`);
    console.log(`   - Grades: A, B, C, D, E, F`);
    
    console.log('\n✅ Grading systems seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding grading systems:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedGradingSystems();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  main();
}

export default seedGradingSystems;
