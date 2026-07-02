import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class GradebookService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async getCourseGradebook(courseId: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId, instanceId },
      include: {
        student: true,
      },
    });

    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId, instanceId },
    });

    const assignments = await this.prisma.assignment.findMany({
      where: { courseId, instanceId },
    });

    const students = await Promise.all(
      enrollments.map(async (enr) => {
        const studentId = enr.student.id;

        const quizScores = await Promise.all(
          quizzes.map(async (quiz) => {
            const attempt = await this.prisma.studentQuizAttempt.findUnique({
              where: { studentId_quizId: { studentId, quizId: quiz.id } },
            });
            return {
              quizId: quiz.id,
              title: quiz.title,
              score: attempt?.score ?? null,
              totalMarks: quiz.totalMarks,
              percentage:
                attempt?.score != null
                  ? Math.round((attempt.score / quiz.totalMarks) * 100)
                  : null,
            };
          }),
        );

        const assignmentGrades = await Promise.all(
          assignments.map(async (assignment) => {
            const submission =
              await this.prisma.studentAssignmentSubmission.findUnique({
                where: {
                  studentId_assignmentId: {
                    studentId,
                    assignmentId: assignment.id,
                  },
                },
              });
            const maxGrade = assignment.maxGrade;
            return {
              assignmentId: assignment.id,
              title: assignment.title,
              grade: submission?.grade ?? null,
              totalMarks: maxGrade,
              percentage:
                submission?.grade != null
                  ? Math.round((submission.grade / maxGrade) * 100)
                  : null,
            };
          }),
        );

        const allScores = [
          ...quizScores
            .filter((q) => q.percentage != null)
            .map((q) => q.percentage!),
          ...assignmentGrades
            .filter((a) => a.percentage != null)
            .map((a) => a.percentage!),
        ];
        const overallPercentage =
          allScores.length > 0
            ? Math.round(
                allScores.reduce((sum, s) => sum + s, 0) / allScores.length,
              )
            : null;

        return {
          studentId: enr.student.id,
          studentName: enr.student.name,
          email: enr.student.email,
          quizzes: quizScores,
          assignments: assignmentGrades,
          overallPercentage,
        };
      }),
    );

    return {
      courseId: course.id,
      courseTitle: course.title,
      students,
    };
  }

  async getGroupGradebook(groupId: string) {
    const instanceId = this.getInstanceId();

    const group = await this.prisma.group.findFirst({
      where: { id: groupId, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    const students = await this.prisma.student.findMany({
      where: { groupId, instanceId },
    });

    const courses = await this.prisma.course.findMany({
      where: { groupId, instanceId },
    });

    const studentEntries = await Promise.all(
      students.map(async (student) => {
        const allQuizzes: Array<{
          quizId: string;
          title: string;
          score: number | null;
          totalMarks: number;
          percentage: number | null;
        }> = [];
        const allAssignments: Array<{
          assignmentId: string;
          title: string;
          grade: number | null;
          totalMarks: number;
          percentage: number | null;
        }> = [];

        for (const course of courses) {
          const quizzes = await this.prisma.quiz.findMany({
            where: { courseId: course.id, instanceId },
          });

          for (const quiz of quizzes) {
            const attempt = await this.prisma.studentQuizAttempt.findUnique({
              where: {
                studentId_quizId: { studentId: student.id, quizId: quiz.id },
              },
            });
            allQuizzes.push({
              quizId: quiz.id,
              title: quiz.title,
              score: attempt?.score ?? null,
              totalMarks: quiz.totalMarks,
              percentage:
                attempt?.score != null
                  ? Math.round((attempt.score / quiz.totalMarks) * 100)
                  : null,
            });
          }

          const assignments = await this.prisma.assignment.findMany({
            where: { courseId: course.id, instanceId },
          });

          for (const assignment of assignments) {
            const submission =
              await this.prisma.studentAssignmentSubmission.findUnique({
                where: {
                  studentId_assignmentId: {
                    studentId: student.id,
                    assignmentId: assignment.id,
                  },
                },
              });
            const maxGrade = assignment.maxGrade;
            allAssignments.push({
              assignmentId: assignment.id,
              title: assignment.title,
              grade: submission?.grade ?? null,
              totalMarks: maxGrade,
              percentage:
                submission?.grade != null
                  ? Math.round((submission.grade / maxGrade) * 100)
                  : null,
            });
          }
        }

        const allPercentages = [
          ...allQuizzes
            .filter((q) => q.percentage != null)
            .map((q) => q.percentage!),
          ...allAssignments
            .filter((a) => a.percentage != null)
            .map((a) => a.percentage!),
        ];
        const overallPercentage =
          allPercentages.length > 0
            ? Math.round(
                allPercentages.reduce((sum, p) => sum + p, 0) /
                  allPercentages.length,
              )
            : null;

        return {
          studentId: student.id,
          studentName: student.name,
          email: student.email,
          quizzes: allQuizzes,
          assignments: allAssignments,
          overallPercentage,
        };
      }),
    );

    return {
      groupId: group.id,
      groupName: group.name,
      students: studentEntries,
    };
  }

  async getStudentGradebook(studentId: string) {
    const instanceId = this.getInstanceId();

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, instanceId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const courses = await this.prisma.course.findMany({
      where: { groupId: student.groupId, instanceId },
    });

    const allQuizzes: Array<{
      quizId: string;
      title: string;
      score: number | null;
      totalMarks: number;
      percentage: number | null;
    }> = [];
    const allAssignments: Array<{
      assignmentId: string;
      title: string;
      grade: number | null;
      totalMarks: number;
      percentage: number | null;
    }> = [];

    for (const course of courses) {
      const quizzes = await this.prisma.quiz.findMany({
        where: { courseId: course.id, instanceId },
      });

      for (const quiz of quizzes) {
        const attempt = await this.prisma.studentQuizAttempt.findUnique({
          where: {
            studentId_quizId: { studentId: student.id, quizId: quiz.id },
          },
        });
        allQuizzes.push({
          quizId: quiz.id,
          title: quiz.title,
          score: attempt?.score ?? null,
          totalMarks: quiz.totalMarks,
          percentage:
            attempt?.score != null
              ? Math.round((attempt.score / quiz.totalMarks) * 100)
              : null,
        });
      }

      const assignments = await this.prisma.assignment.findMany({
        where: { courseId: course.id, instanceId },
      });

      for (const assignment of assignments) {
        const submission =
          await this.prisma.studentAssignmentSubmission.findUnique({
            where: {
              studentId_assignmentId: {
                studentId: student.id,
                assignmentId: assignment.id,
              },
            },
          });
        const maxGrade = assignment.maxGrade;
        allAssignments.push({
          assignmentId: assignment.id,
          title: assignment.title,
          grade: submission?.grade ?? null,
          totalMarks: maxGrade,
          percentage:
            submission?.grade != null
              ? Math.round((submission.grade / maxGrade) * 100)
              : null,
        });
      }
    }

    const allPercentages = [
      ...allQuizzes
        .filter((q) => q.percentage != null)
        .map((q) => q.percentage!),
      ...allAssignments
        .filter((a) => a.percentage != null)
        .map((a) => a.percentage!),
    ];
    const overallPercentage =
      allPercentages.length > 0
        ? Math.round(
            allPercentages.reduce((sum, p) => sum + p, 0) /
              allPercentages.length,
          )
        : null;

    return {
      studentId: student.id,
      studentName: student.name,
      quizzes: allQuizzes,
      assignments: allAssignments,
      overallPercentage,
    };
  }
}
