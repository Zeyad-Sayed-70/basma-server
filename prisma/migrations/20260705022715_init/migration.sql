-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('MUBTADI', 'MUHTARIF', 'KHEBIR', 'HOUT');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'THEORY');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "WhatsAppSessionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'QR_PENDING', 'PAIRING_PENDING', 'BANNED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('LOCAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "SessionPlatform" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatSenderRole" AS ENUM ('TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "CurriculumElementType" AS ENUM ('VIDEO', 'RICH_CONTENT', 'FILE', 'QUIZ', 'ASSIGNMENT', 'SESSION');

-- CreateEnum
CREATE TYPE "ElementProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VideoJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'CANCELLED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "instances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'MUBTADI',
    "tierExpiresAt" TIMESTAMP(3),
    "tierRenewedAt" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" "WhatsAppSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ar',
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoFileSize" INTEGER,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "fontFamily" TEXT NOT NULL DEFAULT 'Cairo',
    "customDomain" TEXT,
    "customDomainVerifiedAt" TIMESTAMP(3),
    "customDomainVerifyToken" TEXT,
    "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "content" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "registrationMode" "RegistrationMode" NOT NULL DEFAULT 'OPEN',
    "invitationCode" TEXT,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "groupId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentProfile" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageFileSize" INTEGER,
    "groupId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instanceId" TEXT NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "type" "SessionType" NOT NULL DEFAULT 'LOCAL',
    "location" TEXT,
    "platform" "SessionPlatform",
    "meetingUrl" TEXT,
    "notes" TEXT,
    "courseId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalMarks" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "options" JSONB NOT NULL DEFAULT '[]',
    "correctAnswer" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "quizId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_quiz_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instanceId" TEXT NOT NULL,

    CONSTRAINT "student_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "maxGrade" INTEGER NOT NULL DEFAULT 100,
    "courseId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assignment_submissions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "grade" INTEGER,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instanceId" TEXT NOT NULL,

    CONSTRAINT "student_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "waMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymob_configs" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "hmacSecret" TEXT NOT NULL,
    "cardIntegrationId" INTEGER,
    "walletIntegrationId" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'test',
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymob_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymobIntentionId" TEXT,
    "paymobOrderId" TEXT,
    "paymobTransactionId" TEXT,
    "clientSecret" TEXT,
    "specialReference" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "options" JSONB NOT NULL DEFAULT '[]',
    "correctAnswer" TEXT,
    "category" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "ChatSenderRole" NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "groupId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_read_markers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "instanceId" TEXT NOT NULL,

    CONSTRAINT "chat_read_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_space_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'md',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_space_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_student_notes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'agent',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_student_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "opencodeSessionId" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "model" TEXT,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_elements" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "CurriculumElementType" NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "videoId" TEXT,
    "richContentId" TEXT,
    "fileId" TEXT,
    "quizId" TEXT,
    "assignmentId" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "curriculum_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_videos" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "fileObjectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_files" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileObjectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_rich_content" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_rich_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_images" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileObjectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "element_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" "ElementProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "element_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "totalRequired" INTEGER NOT NULL DEFAULT 0,
    "completedRequired" INTEGER NOT NULL DEFAULT 0,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_jobs" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "status" "VideoJobStatus" NOT NULL DEFAULT 'PENDING',
    "fileObjectKey" TEXT,
    "youtubeVideoId" TEXT,
    "bundleJson" JSONB,
    "bundleExpiresAt" TIMESTAMP(3),
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_change_logs" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fromTier" "Tier" NOT NULL,
    "toTier" "Tier" NOT NULL,
    "periodMonths" INTEGER,
    "amountPaid" INTEGER,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tier_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_channel_auth" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "channelId" TEXT,
    "channelTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_channel_auth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instances_subdomain_key" ON "instances"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_instanceId_key" ON "whatsapp_sessions"("instanceId");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_instanceId_idx" ON "whatsapp_sessions"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_instanceId_type_key" ON "notification_preferences"("instanceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_instanceId_key" ON "teachers"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_customDomain_key" ON "brands"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "brands_instanceId_key" ON "brands"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_instanceId_key" ON "landing_pages"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_invitationCode_key" ON "groups"("invitationCode");

-- CreateIndex
CREATE INDEX "groups_instanceId_idx" ON "groups"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_instanceId_name_key" ON "groups"("instanceId", "name");

-- CreateIndex
CREATE INDEX "students_groupId_idx" ON "students"("groupId");

-- CreateIndex
CREATE INDEX "students_instanceId_idx" ON "students"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "students_instanceId_email_key" ON "students"("instanceId", "email");

-- CreateIndex
CREATE INDEX "courses_groupId_idx" ON "courses"("groupId");

-- CreateIndex
CREATE INDEX "courses_instanceId_idx" ON "courses"("instanceId");

-- CreateIndex
CREATE INDEX "course_enrollments_courseId_idx" ON "course_enrollments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_studentId_courseId_key" ON "course_enrollments"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "sessions_courseId_idx" ON "sessions"("courseId");

-- CreateIndex
CREATE INDEX "sessions_instanceId_idx" ON "sessions"("instanceId");

-- CreateIndex
CREATE INDEX "quizzes_courseId_idx" ON "quizzes"("courseId");

-- CreateIndex
CREATE INDEX "quizzes_instanceId_idx" ON "quizzes"("instanceId");

-- CreateIndex
CREATE INDEX "quiz_questions_quizId_idx" ON "quiz_questions"("quizId");

-- CreateIndex
CREATE INDEX "student_quiz_attempts_quizId_idx" ON "student_quiz_attempts"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "student_quiz_attempts_studentId_quizId_key" ON "student_quiz_attempts"("studentId", "quizId");

-- CreateIndex
CREATE INDEX "assignments_courseId_idx" ON "assignments"("courseId");

-- CreateIndex
CREATE INDEX "assignments_instanceId_idx" ON "assignments"("instanceId");

-- CreateIndex
CREATE INDEX "student_assignment_submissions_assignmentId_idx" ON "student_assignment_submissions"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_assignment_submissions_studentId_assignmentId_key" ON "student_assignment_submissions"("studentId", "assignmentId");

-- CreateIndex
CREATE INDEX "notifications_instanceId_idx" ON "notifications"("instanceId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_idx" ON "notification_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "paymob_configs_instanceId_key" ON "paymob_configs"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_specialReference_key" ON "payments"("specialReference");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "payments_courseId_idx" ON "payments"("courseId");

-- CreateIndex
CREATE INDEX "payments_instanceId_idx" ON "payments"("instanceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paymobOrderId_idx" ON "payments"("paymobOrderId");

-- CreateIndex
CREATE INDEX "question_bank_instanceId_idx" ON "question_bank"("instanceId");

-- CreateIndex
CREATE INDEX "question_bank_category_idx" ON "question_bank"("category");

-- CreateIndex
CREATE INDEX "chat_messages_groupId_idx" ON "chat_messages"("groupId");

-- CreateIndex
CREATE INDEX "chat_messages_instanceId_idx" ON "chat_messages"("instanceId");

-- CreateIndex
CREATE INDEX "chat_read_markers_instanceId_idx" ON "chat_read_markers"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_read_markers_userId_groupId_key" ON "chat_read_markers"("userId", "groupId");

-- CreateIndex
CREATE INDEX "agent_space_files_instanceId_idx" ON "agent_space_files"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_space_files_instanceId_filename_key" ON "agent_space_files"("instanceId", "filename");

-- CreateIndex
CREATE INDEX "agent_student_notes_studentId_idx" ON "agent_student_notes"("studentId");

-- CreateIndex
CREATE INDEX "agent_student_notes_instanceId_idx" ON "agent_student_notes"("instanceId");

-- CreateIndex
CREATE INDEX "agent_student_notes_category_idx" ON "agent_student_notes"("category");

-- CreateIndex
CREATE INDEX "agent_conversations_studentId_idx" ON "agent_conversations"("studentId");

-- CreateIndex
CREATE INDEX "agent_conversations_instanceId_idx" ON "agent_conversations"("instanceId");

-- CreateIndex
CREATE INDEX "agent_messages_conversationId_idx" ON "agent_messages"("conversationId");

-- CreateIndex
CREATE INDEX "agent_messages_instanceId_idx" ON "agent_messages"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_courseId_key" ON "curricula"("courseId");

-- CreateIndex
CREATE INDEX "curricula_instanceId_idx" ON "curricula"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_videoId_key" ON "curriculum_elements"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_richContentId_key" ON "curriculum_elements"("richContentId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_fileId_key" ON "curriculum_elements"("fileId");

-- CreateIndex
CREATE INDEX "curriculum_elements_curriculumId_idx" ON "curriculum_elements"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_elements_instanceId_idx" ON "curriculum_elements"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_position_key" ON "curriculum_elements"("curriculumId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_quizId_key" ON "curriculum_elements"("curriculumId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_assignmentId_key" ON "curriculum_elements"("curriculumId", "assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_sessionId_key" ON "curriculum_elements"("curriculumId", "sessionId");

-- CreateIndex
CREATE INDEX "curriculum_videos_curriculumId_idx" ON "curriculum_videos"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_videos_instanceId_idx" ON "curriculum_videos"("instanceId");

-- CreateIndex
CREATE INDEX "curriculum_files_curriculumId_idx" ON "curriculum_files"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_files_instanceId_idx" ON "curriculum_files"("instanceId");

-- CreateIndex
CREATE INDEX "curriculum_rich_content_curriculumId_idx" ON "curriculum_rich_content"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_rich_content_instanceId_idx" ON "curriculum_rich_content"("instanceId");

-- CreateIndex
CREATE INDEX "curriculum_images_curriculumId_idx" ON "curriculum_images"("curriculumId");

-- CreateIndex
CREATE INDEX "curriculum_images_instanceId_idx" ON "curriculum_images"("instanceId");

-- CreateIndex
CREATE INDEX "element_progress_studentId_idx" ON "element_progress"("studentId");

-- CreateIndex
CREATE INDEX "element_progress_instanceId_idx" ON "element_progress"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "element_progress_studentId_elementId_key" ON "element_progress"("studentId", "elementId");

-- CreateIndex
CREATE INDEX "course_progress_instanceId_idx" ON "course_progress"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "course_progress_studentId_courseId_key" ON "course_progress"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "video_jobs_elementId_key" ON "video_jobs"("elementId");

-- CreateIndex
CREATE INDEX "video_jobs_instanceId_status_idx" ON "video_jobs"("instanceId", "status");

-- CreateIndex
CREATE INDEX "video_jobs_bundleExpiresAt_idx" ON "video_jobs"("bundleExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "tier_change_logs_instanceId_idx" ON "tier_change_logs"("instanceId");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_attempts" ADD CONSTRAINT "student_quiz_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_attempts" ADD CONSTRAINT "student_quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignment_submissions" ADD CONSTRAINT "student_assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignment_submissions" ADD CONSTRAINT "student_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymob_configs" ADD CONSTRAINT "paymob_configs_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_read_markers" ADD CONSTRAINT "chat_read_markers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_read_markers" ADD CONSTRAINT "chat_read_markers_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_space_files" ADD CONSTRAINT "agent_space_files_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_student_notes" ADD CONSTRAINT "agent_student_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_student_notes" ADD CONSTRAINT "agent_student_notes_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "curriculum_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_richContentId_fkey" FOREIGN KEY ("richContentId") REFERENCES "curriculum_rich_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "curriculum_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_videos" ADD CONSTRAINT "curriculum_videos_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_files" ADD CONSTRAINT "curriculum_files_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_rich_content" ADD CONSTRAINT "curriculum_rich_content_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_images" ADD CONSTRAINT "curriculum_images_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_progress" ADD CONSTRAINT "element_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_progress" ADD CONSTRAINT "element_progress_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "curriculum_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_change_logs" ADD CONSTRAINT "tier_change_logs_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
