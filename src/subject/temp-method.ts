//   async getSubjectsByClassArm(classId: string, classArmId: string, req) {
//     try {
//         const user = req.user as AuthenticatedUser;

//         // Validate class exists and belongs to the school
//         const classExists = await this.prisma.class.findFirst({
//             where: {
//                 id: classId,
//                 schoolId: user.schoolId,
//                 isDeleted: false,
//             },
//         });

//         if (!classExists) {
//             throw new HttpException(
//                 'Class not found or does not belong to your school',
//                 HttpStatus.NOT_FOUND,
//             );
//         }

//         // Validate class arm exists and belongs to the class
//         const classArmExists = await this.prisma.classArm.findFirst({
//             where: {
//                 id: classArmId,
//                 classId,
//                 isDeleted: false,
//             },
//         });

//         if (!classArmExists) {
//             throw new HttpException(
//                 'Class arm not found or does not belong to the specified class',
//                 HttpStatus.NOT_FOUND,
//             );
//         }

//         // Fetch subjects assigned to the class arm
//         const subjectAssignments =
//             await this.prisma.classArmSubjectAssignment.findMany({
//                 where: {
//                     classId,
//                     classArmId,
//                     schoolId: user.schoolId,
//                     isActive: true,
//                 },
//                 include: {
//                     subject: {
//                         select: {
//                             id: true,
//                             name: true,
//                             code: true,
//                             createdAt: true,
//                             updatedAt: true,
//                         },
//                     },
//                     class: {
//                         select: {
//                             id: true,
//                             name: true,
//                         },
//                     },
//                     classArm: {
//                         select: {
//                             id: true,
//                             name: true,
//                         },
//                     },
//                 },
//                 orderBy: {
//                     subject: {
//                         name: 'asc',
//                     },
//                 },
//             });

//         const subjects = subjectAssignments.map((assignment) => ({
//             assignmentId: assignment.id,
//             subject: assignment.subject,
//             class: assignment.class,
//             classArm: assignment.classArm,
//             assignedAt: assignment.createdAt,
//         }));

//         return {
//             statusCode: 200,
//             message: 'Subjects retrieved successfully',
//             data: {
//                 classId,
//                 classArmId,
//                 className: classExists.name,
//                 classArmName: classArmExists.name,
//                 totalSubjects: subjects.length,
//                 subjects,
//             },
//         };
//     } catch (error) {
//         if (error instanceof HttpException) {
//             throw error;
//         }
//         console.error('Error fetching subjects for class arm:', error);
//         throw new HttpException(
//             'Failed to fetch subjects for class arm: ' +
//             (error.message || 'Unknown error'),
//             HttpStatus.INTERNAL_SERVER_ERROR,
//         );
//     }
// }
