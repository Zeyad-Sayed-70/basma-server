import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GradebookQuizScore {
  @ApiProperty({ example: 'clx...', description: 'Quiz ID' })
  quizId: string;

  @ApiProperty({
    example: 'اختبار الجبر - الوحدة الأولى',
    description: 'Quiz title',
  })
  title: string;

  @ApiProperty({
    example: 15,
    description: 'Score achieved (null if theory questions ungraded)',
  })
  score: number | null;

  @ApiProperty({ example: 20, description: 'Total marks for the quiz' })
  totalMarks: number;

  @ApiPropertyOptional({
    example: 75,
    description: 'Percentage score (null if ungraded)',
  })
  percentage?: number | null;
}

class GradebookAssignmentScore {
  @ApiProperty({ example: 'clx...', description: 'Assignment ID' })
  assignmentId: string;

  @ApiProperty({
    example: 'واجب الجبر - الوحدة الأولى',
    description: 'Assignment title',
  })
  title: string;

  @ApiPropertyOptional({
    example: 85,
    description: 'Grade achieved (null if not yet graded)',
  })
  grade: number | null;

  @ApiProperty({ example: 100, description: 'Maximum marks / total degree for this assignment' })
  totalMarks: number;

  @ApiPropertyOptional({
    example: 85,
    description: 'Percentage of max grade in this assignment set',
  })
  percentage?: number | null;
}

class GradebookStudentEntry {
  @ApiProperty({ example: 'clx...', description: 'Student ID' })
  studentId: string;

  @ApiProperty({ example: 'علي أحمد', description: 'Student name' })
  studentName: string;

  @ApiPropertyOptional({
    example: 'ali@example.com',
    description: 'Student email',
  })
  email?: string;

  @ApiProperty({
    type: [GradebookQuizScore],
    description: 'Quiz scores for this student',
  })
  quizzes: GradebookQuizScore[];

  @ApiProperty({
    type: [GradebookAssignmentScore],
    description: 'Assignment grades for this student',
  })
  assignments: GradebookAssignmentScore[];

  @ApiPropertyOptional({
    example: 72.5,
    description: 'Overall percentage across all graded items',
  })
  overallPercentage?: number | null;
}

export class GradebookCourseResponseDto {
  @ApiProperty({ example: 'clx...', description: 'Course ID' })
  courseId: string;

  @ApiProperty({ example: 'الرياضيات - الجبر', description: 'Course title' })
  courseTitle: string;

  @ApiProperty({ type: [GradebookStudentEntry] })
  students: GradebookStudentEntry[];
}

export class GradebookGroupResponseDto {
  @ApiProperty({ example: 'clx...', description: 'Group ID' })
  groupId: string;

  @ApiProperty({ example: 'الصف الأول الثانوي', description: 'Group name' })
  groupName: string;

  @ApiProperty({ type: [GradebookStudentEntry] })
  students: GradebookStudentEntry[];
}

export class GradebookStudentResponseDto {
  @ApiProperty({ example: 'clx...', description: 'Student ID' })
  studentId: string;

  @ApiProperty({ example: 'علي أحمد', description: 'Student name' })
  studentName: string;

  @ApiProperty({ type: [GradebookQuizScore] })
  quizzes: GradebookQuizScore[];

  @ApiProperty({ type: [GradebookAssignmentScore] })
  assignments: GradebookAssignmentScore[];

  @ApiPropertyOptional({ example: 72.5 })
  overallPercentage?: number | null;
}
