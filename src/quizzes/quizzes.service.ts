import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateQuizDto) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        totalMarks: dto.totalMarks,
        courseId: dto.courseId,
        instanceId,
      },
    });
  }

  async findAll(courseId?: string) {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { instanceId };
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, instanceId },
      });
      if (!course) throw new NotFoundException('Course not found');
      where.courseId = courseId;
    }

    const quizzes = await this.prisma.quiz.findMany({
      where,
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      totalMarks: q.totalMarks,
      courseId: q.courseId,
      instanceId: q.instanceId,
      questionCount: { questions: q._count.questions },
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));

    return { data, total: quizzes.length };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, instanceId },
      include: {
        questions: true,
        _count: { select: { questions: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      totalMarks: quiz.totalMarks,
      courseId: quiz.courseId,
      instanceId: quiz.instanceId,
      questionCount: { questions: quiz._count.questions },
      questions: quiz.questions,
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: quiz.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateQuizDto) {
    await this.findOne(id);

    return this.prisma.quiz.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.prisma.quiz.delete({ where: { id } });
  }

  async addQuestion(quizId: string, dto: CreateQuestionDto) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    return this.prisma.quizQuestion.create({
      data: {
        text: dto.text,
        type: dto.type,
        options: dto.options ?? [],
        correctAnswer: dto.correctAnswer,
        marks: dto.marks,
        quizId,
        instanceId,
      },
    });
  }

  async findQuestions(quizId: string) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { id: 'asc' },
    });

    const data = questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options as string[],
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      quizId: q.quizId,
      instanceId: q.instanceId,
    }));

    return { data, total: questions.length };
  }

  async updateQuestion(
    quizId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
    });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.correctAnswer !== undefined && {
          correctAnswer: dto.correctAnswer,
        }),
        ...(dto.marks !== undefined && { marks: dto.marks }),
      },
    });
  }

  async removeQuestion(quizId: string, questionId: string) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const question = await this.prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  async submit(quizId: string, studentId: string, dto: SubmitQuizAttemptDto) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const existing = await this.prisma.studentQuizAttempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
    });
    if (existing) {
      throw new ConflictException('You have already submitted this quiz');
    }

    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    let totalScore = 0;
    let allGraded = true;
    const gradedAnswers: Array<{
      questionId: string;
      answer: string;
      correct: boolean | null;
      marksEarned: number;
    }> = [];

    for (const entry of dto.answers) {
      const question = questionMap.get(entry.questionId);
      if (!question) continue;

      let correct: boolean | null = null;
      let marksEarned = 0;

      if (question.type === 'MCQ') {
        correct = question.correctAnswer === entry.answer;
        marksEarned = correct ? question.marks : 0;
        totalScore += marksEarned;
      } else {
        allGraded = false;
      }

      gradedAnswers.push({
        questionId: entry.questionId,
        answer: entry.answer,
        correct,
        marksEarned,
      });
    }

    const attempt = await this.prisma.studentQuizAttempt.create({
      data: {
        studentId,
        quizId,
        score: allGraded ? totalScore : null,
        answers: gradedAnswers,
        instanceId,
      },
    });

    if (allGraded) {
      this.eventEmitter.emit('quiz.graded', {
        quizId,
        quizTitle: quiz.title,
        studentId,
        score: totalScore,
        totalMarks: quiz.totalMarks,
        instanceId,
      });
    }

    return {
      id: attempt.id,
      studentId: attempt.studentId,
      quizId: attempt.quizId,
      score: attempt.score,
      answers: attempt.answers,
      submittedAt: attempt.submittedAt.toISOString(),
    };
  }

  async findAttempts(quizId: string) {
    const instanceId = this.getInstanceId();

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, instanceId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const attempts = await this.prisma.studentQuizAttempt.findMany({
      where: { quizId, instanceId },
      orderBy: { submittedAt: 'desc' },
    });

    const data = attempts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      quizId: a.quizId,
      score: a.score,
      answers: a.answers,
      submittedAt: a.submittedAt.toISOString(),
    }));

    return { data, total: attempts.length };
  }

  async findStudentAttempt(quizId: string, studentId: string) {
    const instanceId = this.getInstanceId();

    const attempt = await this.prisma.studentQuizAttempt.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (attempt.instanceId !== instanceId) {
      throw new NotFoundException('Attempt not found');
    }

    return {
      id: attempt.id,
      studentId: attempt.studentId,
      quizId: attempt.quizId,
      score: attempt.score,
      answers: attempt.answers,
      submittedAt: attempt.submittedAt.toISOString(),
    };
  }
}
