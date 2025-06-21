import {
    PrismaClient,
    TermEnum,
    AdmissionStatus,
    Gender,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Nigerian schools seeding for 2024-2025 session...');

    try {
        // Clean existing data first (optional - comment out if you want to keep existing data)
        console.log('🧹 Cleaning existing Nigerian schools data...');

        // Delete in reverse order to respect foreign key constraints
        await prisma.studentSubjectAssignment.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.studentClassAssignment.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.admission.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.student.deleteMany({
            where: {
                user: {
                    school: {
                        name: {
                            in: [
                                'Federal Government College Abuja',
                                'Command Secondary School Lagos',
                                'Government College Kaduna'
                            ]
                        }
                    }
                }
            }
        });

        await prisma.parent.deleteMany({
            where: {
                user: {
                    school: {
                        name: {
                            in: [
                                'Federal Government College Abuja',
                                'Command Secondary School Lagos',
                                'Government College Kaduna'
                            ]
                        }
                    }
                }
            }
        });

        await prisma.classArmSubjectAssignment.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.sessionClassAssignment.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.subject.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.class.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.classArm.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.classCategory.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.sessionTerm.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.session.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.termDefinition.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.user.deleteMany({
            where: {
                school: {
                    name: {
                        in: [
                            'Federal Government College Abuja',
                            'Command Secondary School Lagos',
                            'Government College Kaduna'
                        ]
                    }
                }
            }
        });

        await prisma.school.deleteMany({
            where: {
                name: {
                    in: [
                        'Federal Government College Abuja',
                        'Command Secondary School Lagos',
                        'Government College Kaduna'
                    ]
                }
            }
        });

        console.log('✅ Existing data cleaned successfully');
        // Nigerian 2024-2025 Academic Session Dates
        const sessionData = {
            name: '2024/2025',
            firstTerm: {
                start: '2024-09-16', // September (typical Nigerian school calendar)
                end: '2024-12-20',
            },
            secondTerm: {
                start: '2025-01-13',
                end: '2025-04-11',
            },
            thirdTerm: {
                start: '2025-04-28',
                end: '2025-07-25',
            },
        };

        // Common Nigerian subjects
        const commonSubjects = [
            { name: 'Mathematics', code: 'MTH' },
            { name: 'English Language', code: 'ENG' },
            { name: 'Physics', code: 'PHY' },
            { name: 'Chemistry', code: 'CHE' },
            { name: 'Biology', code: 'BIO' },
            { name: 'Geography', code: 'GEO' },
            { name: 'Economics', code: 'ECO' },
            { name: 'Government', code: 'GOV' },
            { name: 'Literature in English', code: 'LIT' },
            { name: 'Further Mathematics', code: 'FMT' },
            { name: 'Agricultural Science', code: 'AGR' },
            { name: 'Computer Studies', code: 'COM' },
            { name: 'Civic Education', code: 'CIV' },
            { name: 'Nigerian History', code: 'HIS' },
            { name: 'Christian Religious Studies', code: 'CRS' },
            { name: 'Islamic Religious Studies', code: 'IRS' },
            { name: 'French', code: 'FRE' },
            { name: 'Yoruba', code: 'YOR' },
            { name: 'Hausa', code: 'HAU' },
            { name: 'Igbo', code: 'IGB' },
        ];

        // Nigerian class structure
        const classStructure = [
            // Junior Secondary School (JSS)
            { name: 'JSS 1', category: 'Junior Secondary' },
            { name: 'JSS 2', category: 'Junior Secondary' },
            { name: 'JSS 3', category: 'Junior Secondary' },
            // Senior Secondary School (SSS)
            { name: 'SS 1', category: 'Senior Secondary' },
            { name: 'SS 2', category: 'Senior Secondary' },
            { name: 'SS 3', category: 'Senior Secondary' },
        ];

        // Class arms (typical Nigerian naming)
        const classArms = ['A', 'B', 'C', 'D'];

        // Helper function to generate Nigerian phone numbers
        const generateNigerianPhone = () => {
            const prefixes = [
                '0803',
                '0806',
                '0813',
                '0816',
                '0703',
                '0706',
                '0708',
                '0802',
            ];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = Math.floor(1000000 + Math.random() * 9000000);
            return `${prefix}${suffix}`;
        };

        // Helper function to generate Nigerian names
        const nigerianNames = {
            firstNames: [
                'Adewale',
                'Kemi',
                'Chidi',
                'Fatima',
                'Ibrahim',
                'Aisha',
                'Emeka',
                'Ngozi',
                'Musa',
                'Zainab',
                'Olumide',
                'Bukola',
                'Chioma',
                'Abdullahi',
                'Hajiya',
                'Tunde',
                'Folake',
                'Nkem',
                'Aliyu',
                'Amina',
                'Segun',
                'Adeola',
                'Chinonso',
                'Usman',
                'Blessing',
                'Kayode',
                'Funmi',
                'Ikechukwu',
                'Hadiza',
                'Babatunde',
            ],
            lastNames: [
                'Adebayo',
                'Okafor',
                'Musa',
                'Ibrahim',
                'Adeleke',
                'Eze',
                'Hassan',
                'Okonkwo',
                'Bello',
                'Nwosu',
                'Abdullahi',
                'Onyeka',
                'Salisu',
                'Emeka',
                'Yusuf',
                'Ogbonna',
                'Garba',
                'Chukwu',
                'Lawal',
                'Okoro',
                'Sani',
                'Nnamdi',
                'Umar',
                'Ejiofor',
                'Aliyu',
                'Nnaji',
                'Danjuma',
                'Okoli',
                'Shehu',
                'Ugwu',
            ],
        };

        const generateNigerianName = () => {
            const firstName =
                nigerianNames.firstNames[
                Math.floor(Math.random() * nigerianNames.firstNames.length)
                ];
            const lastName =
                nigerianNames.lastNames[
                Math.floor(Math.random() * nigerianNames.lastNames.length)
                ];
            return { firstName, lastName };
        };

        // Create 3 Nigerian Schools
        const schools = [
            {
                name: 'Federal Government College Abuja',
                email: 'admin@fgcabuja.edu.ng',
                contact: generateNigerianPhone(),
                address:
                    'Plot 2021, Ahmadu Bello Way, Central Business District, Abuja',
                location: 'Abuja',
                state: 'Federal Capital Territory',
            },
            {
                name: 'Command Secondary School Lagos',
                email: 'admin@commandlagos.edu.ng',
                contact: generateNigerianPhone(),
                address: 'Military Cantonment, Victoria Island, Lagos',
                location: 'Lagos',
                state: 'Lagos State',
            },
            {
                name: 'Government College Kaduna',
                email: 'admin@gckaduna.edu.ng',
                contact: generateNigerianPhone(),
                address: 'Independence Way, Kaduna North, Kaduna',
                location: 'Kaduna',
                state: 'Kaduna State',
            },
        ];

        // Password for all admin users
        const adminPassword = 'Admin2024!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

        console.log('📚 Creating schools and their data...');

        for (const [schoolIndex, schoolData] of schools.entries()) {
            console.log(`\n🏫 Creating ${schoolData.name}...`);

            // Create school
            const school = await prisma.school.create({
                data: {
                    name: schoolData.name,
                    email: schoolData.email,
                    slug: schoolData.name
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, ''),
                    contact: schoolData.contact,
                    address: schoolData.address,
                    isActive: true,
                    subscriptionStatus: true,
                    createdBy: 'system',
                },
            });

            console.log(`✅ School created: ${school.name}`);

            // Create admin user for school
            const adminName = generateNigerianName();
            const adminUser = await prisma.user.create({
                data: {
                    firstname: adminName.firstName,
                    lastname: adminName.lastName,
                    username: `admin${schoolIndex + 1}`,
                    email: schoolData.email,
                    contact: generateNigerianPhone(),
                    password: hashedPassword,
                    plainPassword: adminPassword,
                    role: 'admin',
                    schoolId: school.id,
                    isActive: true,
                    emailVerifiedAt: new Date(),
                    createdBy: 'system',
                },
            });

            console.log(
                `👤 Admin created: ${adminUser.firstname} ${adminUser.lastname} (${adminUser.email})`,
            );

            // Create term definitions for the school
            const termDefinitions = await Promise.all([
                prisma.termDefinition.create({
                    data: {
                        name: TermEnum.First_Term,
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                }),
                prisma.termDefinition.create({
                    data: {
                        name: TermEnum.Second_Term,
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                }),
                prisma.termDefinition.create({
                    data: {
                        name: TermEnum.Third_Term,
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                }),
            ]);

            console.log(`📅 Term definitions created`);

            // Create 2024/2025 session
            const session = await prisma.session.create({
                data: {
                    name: sessionData.name,
                    schoolId: school.id,
                    isActive: true,
                    createdBy: adminUser.id,
                },
            });

            // Create session terms with dates
            const sessionTerms = await Promise.all([
                prisma.sessionTerm.create({
                    data: {
                        termDefinitionId: termDefinitions[0].id,
                        sessionId: session.id,
                        schoolId: school.id,
                        startDate: new Date(sessionData.firstTerm.start),
                        endDate: new Date(sessionData.firstTerm.end),
                        isActive: true, // First term is currently active
                        createdBy: adminUser.id,
                    },
                }),
                prisma.sessionTerm.create({
                    data: {
                        termDefinitionId: termDefinitions[1].id,
                        sessionId: session.id,
                        schoolId: school.id,
                        startDate: new Date(sessionData.secondTerm.start),
                        endDate: new Date(sessionData.secondTerm.end),
                        isActive: false,
                        createdBy: adminUser.id,
                    },
                }),
                prisma.sessionTerm.create({
                    data: {
                        termDefinitionId: termDefinitions[2].id,
                        sessionId: session.id,
                        schoolId: school.id,
                        startDate: new Date(sessionData.thirdTerm.start),
                        endDate: new Date(sessionData.thirdTerm.end),
                        isActive: false,
                        createdBy: adminUser.id,
                    },
                }),
            ]);

            console.log(`🗓️ Session ${sessionData.name} created with terms`);

            // Update school with current session and term
            await prisma.school.update({
                where: { id: school.id },
                data: {
                    currentSessionId: session.id,
                    currentTermId: sessionTerms[0].id, // First term active
                },
            });

            // Create class categories
            const classCategories = await Promise.all([
                prisma.classCategory.create({
                    data: {
                        name: 'Junior Secondary',
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                }),
                prisma.classCategory.create({
                    data: {
                        name: 'Senior Secondary',
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                }),
            ]);

            console.log(`📚 Class categories created`);

            // Create classes and class arms
            const createdClasses = [];
            const createdClassArms = [];

            for (const classInfo of classStructure) {
                const category = classCategories.find(
                    (cat) => cat.name === classInfo.category,
                );

                const classRecord = await prisma.class.create({
                    data: {
                        name: classInfo.name,
                        schoolId: school.id,
                        classCategoryId: category!.id,
                        createdBy: adminUser.id,
                    },
                });

                createdClasses.push(classRecord);

                // Create class arms for each class
                for (const armName of classArms) {
                    const classArm = await prisma.classArm.create({
                        data: {
                            name: armName,
                            schoolId: school.id,
                            createdBy: adminUser.id,
                        },
                    });
                    createdClassArms.push({ ...classArm, classId: classRecord.id });
                }
            }

            console.log(
                `🏛️ Created ${createdClasses.length} classes with ${createdClassArms.length} class arms`,
            );

            // Assign classes to session
            const sessionClassAssignments = [];
            for (const classRecord of createdClasses) {
                const classArmsForClass = createdClassArms.filter(
                    (arm) => arm.classId === classRecord.id,
                );

                for (const classArm of classArmsForClass) {
                    sessionClassAssignments.push({
                        sessionId: session.id,
                        classId: classRecord.id,
                        classArmId: classArm.id,
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    });
                }
            }

            await prisma.sessionClassAssignment.createMany({
                data: sessionClassAssignments,
            });

            console.log(`🔗 Assigned classes to session`);

            // Create subjects for the school
            const schoolSubjects = [];
            for (const subjectInfo of commonSubjects) {
                const subject = await prisma.subject.create({
                    data: {
                        name: subjectInfo.name,
                        code: subjectInfo.code,
                        schoolId: school.id,
                        createdBy: adminUser.id,
                    },
                });
                schoolSubjects.push(subject);
            }

            console.log(`📖 Created ${schoolSubjects.length} subjects`);

            // Assign subjects to classes and class arms
            const classArmSubjectAssignments = [];
            for (const classRecord of createdClasses) {
                const relevantSubjects = schoolSubjects.filter((subject) => {
                    // All classes get core subjects
                    const coreSubjects = [
                        'Mathematics',
                        'English Language',
                        'Civic Education',
                        'Computer Studies',
                    ];
                    if (coreSubjects.includes(subject.name)) return true;

                    // Junior classes get basic subjects
                    if (classRecord.name.startsWith('JSS')) {
                        const jssSubjects = [
                            ...coreSubjects,
                            'Geography',
                            'Nigerian History',
                            'Agricultural Science',
                            'Christian Religious Studies',
                            'Islamic Religious Studies',
                        ];
                        return jssSubjects.includes(subject.name);
                    }

                    // Senior classes get advanced subjects
                    if (classRecord.name.startsWith('SS')) {
                        return true; // All subjects for senior classes
                    }

                    return false;
                });

                const classArmsForClass = createdClassArms.filter(
                    (arm) => arm.classId === classRecord.id,
                );

                for (const classArm of classArmsForClass) {
                    for (const subject of relevantSubjects) {
                        classArmSubjectAssignments.push({
                            classId: classRecord.id,
                            classArmId: classArm.id,
                            subjectId: subject.id,
                            schoolId: school.id,
                            createdBy: adminUser.id,
                        });
                    }
                }
            }

            await prisma.classArmSubjectAssignment.createMany({
                data: classArmSubjectAssignments,
            });

            console.log(`📚 Assigned subjects to class arms`);

            // Create sample students and admissions
            const studentsToCreate = Math.floor(Math.random() * 20) + 30; // 30-50 students per school
            console.log(`👥 Creating ${studentsToCreate} sample students...`);

            // Get all created class arm subject assignments with their IDs
            const createdClassArmSubjectAssignments =
                await prisma.classArmSubjectAssignment.findMany({
                    where: { schoolId: school.id },
                    select: {
                        id: true,
                        classId: true,
                        classArmId: true,
                        subjectId: true,
                    },
                });

            for (let i = 0; i < studentsToCreate; i++) {
                const studentName = generateNigerianName();
                const randomClass =
                    createdClasses[Math.floor(Math.random() * createdClasses.length)];
                const randomClassArm = createdClassArms.find(
                    (arm) => arm.classId === randomClass.id,
                );

                // Create parent first
                const parentName = generateNigerianName();
                const parentUser = await prisma.user.create({
                    data: {
                        firstname: parentName.firstName,
                        lastname: parentName.lastName,
                        username: `parent_${school.id.slice(-4)}_${i + 1}`,
                        email: `parent${i + 1}_${school.id.slice(-4)}@example.com`,
                        contact: generateNigerianPhone(),
                        password: hashedPassword,
                        plainPassword: adminPassword,
                        role: 'admin',
                        schoolId: school.id,
                        isActive: true,
                        createdBy: adminUser.id,
                    },
                });

                const parent = await prisma.parent.create({
                    data: {
                        userId: parentUser.id,
                        occupation: [
                            'Teacher',
                            'Trader',
                            'Civil Servant',
                            'Engineer',
                            'Doctor',
                            'Lawyer',
                            'Farmer',
                        ][Math.floor(Math.random() * 7)],
                        relationship: Math.random() > 0.5 ? 'Father' : 'Mother',
                        createdBy: adminUser.id,
                    },
                });

                // Create student user
                const studentUser = await prisma.user.create({
                    data: {
                        firstname: studentName.firstName,
                        lastname: studentName.lastName,
                        username: `student_${school.id.slice(-4)}_${i + 1}`,
                        email: `student${i + 1}_${school.id.slice(-4)}@example.com`,
                        contact: generateNigerianPhone(),
                        password: hashedPassword,
                        plainPassword: adminPassword,
                        role: 'admin',
                        schoolId: school.id,
                        gender: Math.random() > 0.5 ? Gender.male : Gender.female,
                        isActive: true,
                        createdBy: adminUser.id,
                    },
                });

                // Create student
                const student = await prisma.student.create({
                    data: {
                        userId: studentUser.id,
                        studentRegNo: `${school.name
                            .substring(0, 3)
                            .toUpperCase()}/${sessionData.name.replace(
                                '/',
                                '',
                            )}/${String(i + 1).padStart(4, '0')}`,
                        dateOfBirth: new Date(
                            2005 + Math.floor(Math.random() * 8),
                            Math.floor(Math.random() * 12),
                            Math.floor(Math.random() * 28) + 1,
                        ),
                        religion: ['Christianity', 'Islam', 'Traditional'][
                            Math.floor(Math.random() * 3)
                        ],
                        nationality: 'Nigerian',
                        stateOfOrigin: [
                            'Lagos',
                            'Kano',
                            'Rivers',
                            'Kaduna',
                            'Oyo',
                            'Imo',
                            'Delta',
                            'Edo',
                        ][Math.floor(Math.random() * 8)],
                        lga: `${studentName.lastName} LGA`,
                        parentId: parent.id,
                        classId: randomClass.id,
                        classArmId: randomClassArm?.id,
                        admissionStatus: AdmissionStatus.accepted,
                        admissionDate: new Date('2024-09-01'),
                        createdBy: adminUser.id,
                    },
                });

                // Create admission record
                await prisma.admission.create({
                    data: {
                        studentId: student.id,
                        parentId: parent.id,
                        sessionId: session.id,
                        presentClassId: randomClass.id,
                        classApplyingTo: randomClass.id,
                        assignedClassId: randomClass.id,
                        schoolId: school.id,
                        admissionStatus: AdmissionStatus.accepted,
                        admissionDate: new Date('2024-09-01'),
                        createdBy: adminUser.id,
                    },
                });

                // Create student class assignment
                await prisma.studentClassAssignment.create({
                    data: {
                        studentId: student.id,
                        sessionId: session.id,
                        classId: randomClass.id,
                        classArmId: randomClassArm!.id,
                        schoolId: school.id,
                        isActive: true,
                        createdBy: adminUser.id,
                    },
                });

                // Create student subject assignments
                const subjectsForClass = createdClassArmSubjectAssignments.filter(
                    (assignment) =>
                        assignment.classId === randomClass.id &&
                        assignment.classArmId === randomClassArm?.id,
                );

                for (const classArmSubjectAssignment of subjectsForClass) {
                    await prisma.studentSubjectAssignment.create({
                        data: {
                            studentId: student.id,
                            subjectId: classArmSubjectAssignment.subjectId,
                            sessionId: session.id,
                            schoolId: school.id,
                            classArmSubjectId: classArmSubjectAssignment.id,
                            createdBy: adminUser.id,
                        },
                    });
                }
            }

            console.log(
                `✅ Created ${studentsToCreate} students with their parents and assignments`,
            );
            console.log(`🎓 School ${schoolData.name} setup completed!\n`);
        }

        console.log('\n🎉 All Nigerian schools created successfully!');
        console.log('\n📋 Summary:');
        console.log(`- 3 Nigerian schools created`);
        console.log(`- Academic session: ${sessionData.name}`);
        console.log(`- Classes: JSS 1-3, SS 1-3 with arms A, B, C, D`);
        console.log(`- ${commonSubjects.length} subjects created per school`);
        console.log(`- Students, parents, and admissions created`);
        console.log(`- Current session and term activated`);

        console.log('\n🔑 Login Credentials:');
        console.log('Username: admin1, admin2, admin3');
        console.log(`Password: ${adminPassword}`);
        console.log(
            'Also: students and parents have similar credentials with pattern student_XXXX_N and parent_XXXX_N',
        );
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('🔌 Database connection closed');
    });
