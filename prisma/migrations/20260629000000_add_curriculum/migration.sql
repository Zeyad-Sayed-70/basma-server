-- CreateEnum
CREATE TYPE "CurriculumElementType" AS ENUM ('VIDEO', 'RICH_CONTENT', 'FILE', 'QUIZ', 'ASSIGNMENT', 'SESSION');

-- CreateEnum
CREATE TYPE "ElementProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

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

-- Indices
CREATE UNIQUE INDEX "curricula_courseId_key" ON "curricula"("courseId");
CREATE INDEX "curricula_instanceId_idx" ON "curricula"("instanceId");
CREATE UNIQUE INDEX "curriculum_elements_videoId_key" ON "curriculum_elements"("videoId");
CREATE UNIQUE INDEX "curriculum_elements_richContentId_key" ON "curriculum_elements"("richContentId");
CREATE UNIQUE INDEX "curriculum_elements_fileId_key" ON "curriculum_elements"("fileId");
CREATE INDEX "curriculum_elements_curriculumId_idx" ON "curriculum_elements"("curriculumId");
CREATE INDEX "curriculum_elements_instanceId_idx" ON "curriculum_elements"("instanceId");
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_position_key" ON "curriculum_elements"("curriculumId", "position");
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_quizId_key" ON "curriculum_elements"("curriculumId", "quizId");
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_assignmentId_key" ON "curriculum_elements"("curriculumId", "assignmentId");
CREATE UNIQUE INDEX "curriculum_elements_curriculumId_sessionId_key" ON "curriculum_elements"("curriculumId", "sessionId");
CREATE INDEX "curriculum_videos_curriculumId_idx" ON "curriculum_videos"("curriculumId");
CREATE INDEX "curriculum_videos_instanceId_idx" ON "curriculum_videos"("instanceId");
CREATE INDEX "curriculum_files_curriculumId_idx" ON "curriculum_files"("curriculumId");
CREATE INDEX "curriculum_files_instanceId_idx" ON "curriculum_files"("instanceId");
CREATE INDEX "curriculum_rich_content_curriculumId_idx" ON "curriculum_rich_content"("curriculumId");
CREATE INDEX "curriculum_rich_content_instanceId_idx" ON "curriculum_rich_content"("instanceId");
CREATE INDEX "curriculum_images_curriculumId_idx" ON "curriculum_images"("curriculumId");
CREATE INDEX "curriculum_images_instanceId_idx" ON "curriculum_images"("instanceId");
CREATE INDEX "element_progress_studentId_idx" ON "element_progress"("studentId");
CREATE INDEX "element_progress_instanceId_idx" ON "element_progress"("instanceId");
CREATE UNIQUE INDEX "element_progress_studentId_elementId_key" ON "element_progress"("studentId", "elementId");
CREATE INDEX "course_progress_instanceId_idx" ON "course_progress"("instanceId");
CREATE UNIQUE INDEX "course_progress_studentId_courseId_key" ON "course_progress"("studentId", "courseId");

-- Foreign keys
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "curriculum_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_richContentId_fkey" FOREIGN KEY ("richContentId") REFERENCES "curriculum_rich_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "curriculum_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_elements" ADD CONSTRAINT "curriculum_elements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_videos" ADD CONSTRAINT "curriculum_videos_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_files" ADD CONSTRAINT "curriculum_files_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_rich_content" ADD CONSTRAINT "curriculum_rich_content_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_images" ADD CONSTRAINT "curriculum_images_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "element_progress" ADD CONSTRAINT "element_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "element_progress" ADD CONSTRAINT "element_progress_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "curriculum_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one curriculum per existing course (skip if already exists)
INSERT INTO "curricula" ("id", "courseId", "instanceId", "title", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text)::text || substr(md5(random()::text), 1, 12),
       c."id", c."instanceId", c."title", now(), now()
FROM "courses" c
LEFT JOIN "curricula" cu ON cu."courseId" = c."id"
WHERE cu."id" IS NULL;
