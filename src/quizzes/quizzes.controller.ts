import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import {
  QuizResponseDto,
  QuizListResponseDto,
  QuizDetailResponseDto,
} from './dto/quiz-response.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  QuestionResponseDto,
  QuestionListResponseDto,
} from './dto/question-response.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import {
  QuizAttemptResponseDto,
  AttemptListResponseDto,
} from './dto/quiz-attempt-response.dto';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new quiz',
    description:
      'Creates a quiz within a course. ' +
      'Quiz totalMarks should equal the sum of all question marks. ' +
      "Quizzes are tenant-isolated — only visible within the teacher's instance.",
  })
  @ApiBody({ type: CreateQuizDto })
  @ApiResponse({
    status: 201,
    description: 'Quiz created successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateQuizDto) {
    return this.quizzesService.create(dto);
  }

  @Get()
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all quizzes',
    description:
      "Returns all quizzes for the authenticated teacher's instance. " +
      'Optionally filter by courseId. ' +
      'Includes question counts for each quiz.',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Filter by course ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Quizzes retrieved successfully',
    type: QuizListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('courseId') courseId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.quizzesService.findAll(courseId, user);
  }

  @Get(':id')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quiz by ID',
    description:
      'Returns a single quiz with all its questions. ' +
      'Includes question details, types, options, and correct answers.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: 200,
    description: 'Quiz retrieved successfully',
    type: QuizDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quizzesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update quiz',
    description:
      'Updates quiz title, description, or total marks. ' +
      'Only fields provided in the request body will be updated.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiBody({ type: UpdateQuizDto })
  @ApiResponse({
    status: 200,
    description: 'Quiz updated successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete quiz',
    description:
      'Deletes a quiz and all its associated questions and attempts. ' +
      'This action is irreversible.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.quizzesService.remove(id);
  }

  @Post(':id/questions')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a question to a quiz',
    description:
      'Adds a new question to an existing quiz. ' +
      'Supports MCQ (multiple choice) and THEORY (written answer) types. ' +
      'For MCQ, provide options array and correctAnswer for auto-grading. ' +
      'For THEORY, no correctAnswer is needed (teacher grades manually).',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({
    status: 201,
    description: 'Question added successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.quizzesService.addQuestion(id, dto);
  }

  @Get(':id/questions')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all questions in a quiz',
    description:
      'Returns all questions for a quiz. ' +
      'Includes options, correct answers, and marks for each question.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    type: QuestionListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findQuestions(@Param('id') id: string) {
    return this.quizzesService.findQuestions(id);
  }

  @Patch(':quizId/questions/:questionId')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a question',
    description:
      "Updates a question's text, type, options, correct answer, or marks. " +
      'Only fields provided in the request body will be updated.',
  })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizzesService.updateQuestion(quizId, questionId, dto);
  }

  @Delete(':quizId/questions/:questionId')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a question',
    description:
      'Removes a question from a quiz. ' +
      'This action is irreversible and may affect existing quiz attempts.',
  })
  @ApiParam({ name: 'quizId', description: 'Quiz ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.quizzesService.removeQuestion(quizId, questionId);
  }

  @Post(':id/submit')
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit quiz attempt',
    description:
      "Submits a student's answers for a quiz. " +
      'MCQ questions are auto-graded immediately — score is calculated. ' +
      'THEORY questions are left ungraded (teacher must grade manually). ' +
      'Each student can only submit once per quiz (unique constraint). ' +
      'The answers array must contain one entry per question in the quiz.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiBody({ type: SubmitQuizAttemptDto })
  @ApiResponse({
    status: 201,
    description: 'Quiz submitted and auto-graded',
    type: QuizAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({
    status: 409,
    description: 'Student has already submitted this quiz',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitQuizAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quizzesService.submit(id, user.id, dto);
  }

  @Get(':id/attempts')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all attempts for a quiz',
    description:
      'Returns all student attempts for a quiz. ' +
      "Shows each student's score, answers, and submission time. " +
      'Use this to review student performance on a quiz.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: 200,
    description: 'Attempts retrieved successfully',
    type: AttemptListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAttempts(@Param('id') id: string) {
    return this.quizzesService.findAttempts(id);
  }

  @Get(':id/attempts/:studentId')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific student attempt',
    description:
      "Returns a single student's attempt for a quiz with full details. " +
      'Shows each answer, whether it was correct (MCQ), and marks earned.',
  })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Attempt retrieved successfully',
    type: QuizAttemptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findStudentAttempt(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.quizzesService.findStudentAttempt(id, studentId);
  }
}
