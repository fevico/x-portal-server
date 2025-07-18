import { AdmissionStatus, PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// Target school ID
const TARGET_SCHOOL_ID = '2e7ac74c-6f8e-47b6-ba5c-c28c234325ce';

// Helper functions
function generateRandomEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${randomDomain}`;
}

function generateRandomPhoneNumber(): string {
  const prefixes = [
    '0801',
    '0802',
    '0803',
    '0805',
    '0806',
    '0807',
    '0808',
    '0809',
    '0810',
    '0811',
    '0812',
    '0813',
    '0814',
    '0815',
    '0816',
    '0817',
    '0818',
    '0819',
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const remaining = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return prefix + remaining;
}

function generateNigerianName() {
  const firstNames = [
    'Adaora',
    'Adebayo',
    'Adejoke',
    'Ademola',
    'Adunni',
    'Aisha',
    'Akeem',
    'Amina',
    'Bayo',
    'Binta',
    'Chioma',
    'Dare',
    'Emeka',
    'Fatima',
    'Folake',
    'Goodness',
    'Hassan',
    'Ibrahim',
    'Joke',
    'Kemi',
    'Kunle',
    'Ladi',
    'Maryam',
    'Ngozi',
    'Ola',
    'Pelumi',
    'Qasim',
    'Rasheed',
    'Sade',
    'Tayo',
    'Uche',
    'Vera',
    'Wale',
    'Yemi',
    'Zainab',
    'Bamidele',
    'Chinelo',
    'Damilola',
    'Ebere',
    'Funmi',
  ];

  const lastNames = [
    'Adebayo',
    'Ajayi',
    'Akinyemi',
    'Balogun',
    'Chigozie',
    'Danjuma',
    'Ezeani',
    'Falade',
    'Garba',
    'Hassan',
    'Idris',
    'Jakande',
    'Kalu',
    'Lawal',
    'Mohammed',
    'Nwosu',
    'Okafor',
    'Pemisire',
    'Quadri',
    'Raheem',
    'Salami',
    'Taiwo',
    'Usman',
    'Vincent',
    'Wale',
    'Xavier',
    'Yusuf',
    'Zubair',
    'Abdullahi',
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return { firstName, lastName };
}

function getRandomGender(): 'male' | 'female' {
  return Math.random() < 0.5 ? 'male' : 'female';
}

function getRandomDateOfBirth(minAge: number, maxAge: number): Date {
  const currentYear = new Date().getFullYear();
  const birthYear =
    currentYear - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, month, day);
}

// function getRandomSubjects(): string[] {
//   const allSubjects = [
//     'Mathematics',
//     'English Language',
//     'Physics',
//     'Chemistry',
//     'Biology',
//     'Geography',
//     'Economics',
//     'Government',
//     'History',
//     'Literature in English',
//     'Yoruba',
//     'Hausa',
//     'Igbo',
//     'French',
//     'Agricultural Science',
//     'Technical Drawing',
//     'Computer Studies',
//     'Civic Education',
//     'Christian Religious Studies',
//     'Islamic Studies',
//     'Fine Arts',
//     'Music',
//     'Physical Education',
//   ];

//   const numSubjects = Math.floor(Math.random() * 6) + 8; // 8-13 subjects
//   const shuffled = [...allSubjects].sort(() => 0.5 - Math.random());
//   return shuffled.slice(0, numSubjects);
// }

function getRandomReligion(): string {
  const religions = ['Christianity', 'Islam', 'Traditional', 'Other'];
  return religions[Math.floor(Math.random() * religions.length)];
}

function getRandomNationality(): string {
  return 'Nigerian';
}

function getRandomStateOfOrigin(): string {
  const states = [
    'Abia',
    'Adamawa',
    'Akwa Ibom',
    'Anambra',
    'Bauchi',
    'Bayelsa',
    'Benue',
    'Borno',
    'Cross River',
    'Delta',
    'Ebonyi',
    'Edo',
    'Ekiti',
    'Enugu',
    'Gombe',
    'Imo',
    'Jigawa',
    'Kaduna',
    'Kano',
    'Katsina',
    'Kebbi',
    'Kogi',
    'Kwara',
    'Lagos',
    'Nasarawa',
    'Niger',
    'Ogun',
    'Ondo',
    'Osun',
    'Oyo',
    'Plateau',
    'Rivers',
    'Sokoto',
    'Taraba',
    'Yobe',
    'Zamfara',
    'FCT',
  ];
  return states[Math.floor(Math.random() * states.length)];
}

function getRandomLGA(): string {
  const lgas = [
    'Ikeja',
    'Ikorodu',
    'Epe',
    'Badagry',
    'Alimosho',
    'Agege',
    'Ifako-Ijaiye',
    'Kosofe',
    'Mushin',
    'Oshodi-Isolo',
    'Shomolu',
    'Lagos Island',
    'Lagos Mainland',
    'Surulere',
    'Apapa',
    'Amuwo-Odofin',
    'Eti-Osa',
    'Ojo',
    'Ajeromi-Ifelodun',
  ];
  return lgas[Math.floor(Math.random() * lgas.length)];
}

function generateStudentRegNo(index: number): string {
  const currentYear = new Date().getFullYear();
  return `STU${currentYear}${(index + 1).toString().padStart(4, '0')}`;
}

function generateStaffId(index: number): string {
  const currentYear = new Date().getFullYear();
  return `STF${currentYear}${(index + 1).toString().padStart(4, '0')}`;
}

// Nigerian class names for secondary schools
const nigerianClasses = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
// const classArms = ['A', 'B', 'C', 'D'];

async function main() {
  console.log('🌟 Starting comprehensive seed for school:', TARGET_SCHOOL_ID);

  try {
    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: TARGET_SCHOOL_ID },
      include: {
        classes: true,
        classArms: true,
        sessions: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!school) {
      throw new Error(`School with ID ${TARGET_SCHOOL_ID} not found`);
    }

    console.log(`📚 Found school: ${school.name}`);

    // Get or create default session
    let session;
    if (school.sessions.length > 0) {
      session = school.sessions[0];
      console.log(`📅 Using existing session: ${session.name}`);
    } else {
      // Create a default session
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      session = await prisma.session.create({
        data: {
          name: `${currentYear}/${nextYear}`,
          schoolId: TARGET_SCHOOL_ID,
          isActive: true,
          createdBy: 'system-seed',
        },
      });
      console.log(`📅 Created new session: ${session.name}`);
    }

    // Get classes and class arms for this school
    const classes = await prisma.class.findMany({
      where: { schoolId: TARGET_SCHOOL_ID, isDeleted: false },
    });

    const classArms = await prisma.classArm.findMany({
      where: { schoolId: TARGET_SCHOOL_ID, isDeleted: false },
    });

    console.log(
      `📖 Found ${classes.length} classes and ${classArms.length} class arms`,
    );

    // Create classes if none exist
    if (classes.length === 0) {
      console.log('📝 Creating default classes...');
      for (const className of nigerianClasses) {
        await prisma.class.create({
          data: {
            name: className,
            schoolId: TARGET_SCHOOL_ID,
            createdBy: 'system-seed',
          },
        });
      }
    }

    // Create class arms if none exist
    if (classArms.length === 0) {
      console.log('📝 Creating default class arms...');
      for (const armName of ['A', 'B', 'C', 'D']) {
        await prisma.classArm.create({
          data: {
            name: armName,
            schoolId: TARGET_SCHOOL_ID,
            createdBy: 'system-seed',
          },
        });
      }
    }

    // Refresh classes and arms data
    const updatedClasses = await prisma.class.findMany({
      where: { schoolId: TARGET_SCHOOL_ID, isDeleted: false },
    });

    const subRoleStaff = await prisma.subRole.findFirst({
      where: { name: 'staff', isGlobal: true },
    });
    const subRoleStudent = await prisma.subRole.findFirst({
      where: { name: 'student', isGlobal: true },
    });
    const subRoleParent = await prisma.subRole.findFirst({
      where: { name: 'parent', isGlobal: true },
    });
    const updatedClassArms = await prisma.classArm.findMany({
      where: { schoolId: TARGET_SCHOOL_ID, isDeleted: false },
    });

    console.log(
      `📖 Updated: ${updatedClasses.length} classes and ${updatedClassArms.length} class arms`,
    );

    // Create session class assignments if they don't exist
    console.log('🔗 Creating session class assignments...');
    // for (const cls of updatedClasses) {
    //   for (const arm of updatedClassArms) {
    //     const existingAssignment =
    //       await prisma.sessionClassAssignment.findFirst({
    //         where: {
    //           sessionId: session.id,
    //           classId: cls.id,
    //           classArmId: arm.id,
    //           schoolId: TARGET_SCHOOL_ID,
    //         },
    //       });

    //     if (!existingAssignment) {
    //       await prisma.sessionClassAssignment.create({
    //         data: {
    //           sessionId: session.id,
    //           classId: cls.id,
    //           classArmId: arm.id,
    //           schoolId: TARGET_SCHOOL_ID,
    //           createdBy: 'system-seed',
    //         },
    //       });
    //     }
    //   }
    // }

    // Create staff members (teachers)
    console.log('👨‍🏫 Creating staff members...');
    const numberOfStaff = 25;
    const createdStaff = [];

    for (let i = 0; i < numberOfStaff; i++) {
      const { firstName, lastName } = generateNigerianName();
      const email = generateRandomEmail(firstName, lastName);
      const phoneNumber = generateRandomPhoneNumber();
      const gender = getRandomGender();
      const hashedPassword = await hash('password', 12);

      // Create user account
      const user = await prisma.user.create({
        data: {
          firstname: firstName,
          lastname: lastName,
          email: email,
          username: email,
          password: hashedPassword,
          plainPassword: 'password',
          contact: phoneNumber,
          gender: gender,
          role: 'admin',
          subRoleId: subRoleStaff?.id,
          schoolId: TARGET_SCHOOL_ID,
          createdBy: 'system-seed',
        },
      });

      // Create staff record
      const staff = await prisma.staff.create({
        data: {
          userId: user.id,
          staffRegNo: generateStaffId(i),
          qualifications: ['B.Ed', 'B.Sc', 'M.Ed'][
            Math.floor(Math.random() * 3)
          ],
          hireDate: new Date(
            2020 + Math.floor(Math.random() * 4),
            Math.floor(Math.random() * 12),
            1,
          ),
          createdBy: 'system-seed',
        },
      });

      createdStaff.push({ user, staff });
    }

    console.log(`✅ Created ${createdStaff.length} staff members`);

    // Create students
    console.log('👨‍🎓 Creating students...');
    const numberOfStudents = 200;
    const createdStudents = [];

    for (let i = 0; i < numberOfStudents; i++) {
      const { firstName, lastName } = generateNigerianName();
      const email = generateRandomEmail(firstName, lastName);
      const phoneNumber = generateRandomPhoneNumber();
      const gender = getRandomGender();
      const dateOfBirth = getRandomDateOfBirth(10, 18);
      const isAlumni = Math.random() < 0.15; // 15% chance of being alumni
      const hashedPassword = await hash('password', 12);

      // Create user account
      const user = await prisma.user.create({
        data: {
          firstname: firstName,
          lastname: lastName,
          email: email,
          username: email,
          password: hashedPassword,
          plainPassword: 'password',
          contact: phoneNumber,
          gender: gender,
          role: 'admin',
          subRoleId: subRoleStudent?.id,
          schoolId: TARGET_SCHOOL_ID,
          createdBy: 'system-seed',
        },
      });

      // Select random class and class arm
      const randomClass =
        updatedClasses[Math.floor(Math.random() * updatedClasses.length)];
      const randomClassArm =
        updatedClassArms[Math.floor(Math.random() * updatedClassArms.length)];

      // Create student record
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          studentRegNo: generateStudentRegNo(i),
          dateOfBirth: dateOfBirth,
          religion: getRandomReligion(),
          nationality: getRandomNationality(),
          stateOfOrigin: getRandomStateOfOrigin(),
          lga: getRandomLGA(),
          classId: isAlumni ? null : randomClass.id,
          classArmId: isAlumni ? null : randomClassArm.id,
          isAlumni: isAlumni,
          admissionStatus: AdmissionStatus.accepted,
          createdBy: 'system-seed',
        },
      });

      // Create student class assignment
      await prisma.studentClassAssignment.create({
        data: {
          studentId: student.id,
          classId: randomClass.id,
          classArmId: randomClassArm.id,
          sessionId: session.id,
          schoolId: TARGET_SCHOOL_ID,
          isActive: true,
          createdBy: 'system-seed',
        },
      });

      //   student subject assignments

      createdStudents.push({
        user,
        student,
        class: randomClass,
        classArm: randomClassArm,
      });
    }

    console.log(`✅ Created ${createdStudents.length} students`);

    // Create admissions for students
    console.log('📋 Creating admissions...');
    let admissionCount = 0;

    for (const { student, class: studentClass, classArm } of createdStudents) {
      // Create parent for admission
      const { firstName: parentFirstName, lastName: parentLastName } =
        generateNigerianName();
      const parentEmail = generateRandomEmail(parentFirstName, parentLastName);
      const parentPhone = generateRandomPhoneNumber();
      const hashedParentPassword = await hash('password', 12);

      const parentUser = await prisma.user.create({
        data: {
          firstname: parentFirstName,
          lastname: parentLastName,
          email: parentEmail,
          username: parentEmail,
          password: hashedParentPassword,
          plainPassword: 'password',
          contact: parentPhone,
          gender: getRandomGender(),
          role: 'admin',
          subRoleId: subRoleParent?.id,
          schoolId: TARGET_SCHOOL_ID,
          createdBy: 'system-seed',
        },
      });

      const parent = await prisma.parent.create({
        data: {
          userId: parentUser.id,
          occupation: [
            'Engineer',
            'Doctor',
            'Teacher',
            'Lawyer',
            'Trader',
            'Civil Servant',
          ][Math.floor(Math.random() * 6)],
          relationship: ['Father', 'Mother', 'Guardian'][
            Math.floor(Math.random() * 3)
          ],
          createdBy: 'system-seed',
        },
      });

      const admissionDate = new Date(
        2020 + Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 12),
        1,
      );

      // Create admission
      await prisma.admission.create({
        data: {
          sessionId: session.id,
          schoolId: TARGET_SCHOOL_ID,
          studentId: student.id,
          parentId: parent.id,
          presentClassId: studentClass.id, // Class they're currently in
          classApplyingTo: studentClass.id, // Class they're applying to
          assignedClassId: studentClass.id, // Class they've been assigned to
          assignedClassArmId: classArm.id,
          admissionStatus: AdmissionStatus.accepted,
          admissionDate,
          createdBy: 'system-seed',
        },
      });

      // Update student with parent reference
      await prisma.student.update({
        where: { id: student.id },
        data: { parentId: parent.id, admissionDate },
      });

      admissionCount++;
    }

    console.log(`✅ Created ${admissionCount} admissions with parents`);

    // Create subject assignments for students
    console.log('📚 Creating subject assignments...');
    const subjects = await prisma.subject.findMany({
      where: { schoolId: TARGET_SCHOOL_ID, isDeleted: false },
    });

    if (subjects.length > 0) {
      let subjectAssignmentCount = 0;

      for (const {
        student,
        class: studentClass,
        classArm,
      } of createdStudents) {
        // Get class arm subject assignments
        const classArmSubjectAssignments =
          await prisma.classArmSubjectAssignment.findMany({
            where: {
              classId: studentClass.id,
              classArmId: classArm.id,
              schoolId: TARGET_SCHOOL_ID,
              isActive: true,
            },
          });

        // Create student subject assignments
        for (const classArmSubjectAssignment of classArmSubjectAssignments) {
          await prisma.studentSubjectAssignment.create({
            data: {
              studentId: student.id,
              subjectId: classArmSubjectAssignment.subjectId,
              classArmSubjectId: classArmSubjectAssignment.id,
              sessionId: session.id,
              schoolId: TARGET_SCHOOL_ID,
              createdBy: 'system-seed',
            },
          });
          subjectAssignmentCount++;
        }
      }

      console.log(
        `✅ Created ${subjectAssignmentCount} student subject assignments`,
      );
    } else {
      console.log('⚠️ No subjects found - skipping subject assignments');
    }

    console.log('\n🎉 Comprehensive seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - School: ${school.name}`);
    console.log(`  - Session: ${session.name}`);
    console.log(`  - Classes: ${updatedClasses.length}`);
    console.log(`  - Class Arms: ${updatedClassArms.length}`);
    console.log(`  - Staff: ${createdStaff.length}`);
    console.log(`  - Students: ${createdStudents.length}`);
    console.log(
      `  - Alumni: ${createdStudents.filter((s) => s.student.isAlumni).length}`,
    );
    console.log(`  - Admissions: ${admissionCount}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
