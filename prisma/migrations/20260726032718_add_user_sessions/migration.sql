-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "tokenJti" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_tokenJti_key" ON "user_sessions"("tokenJti");

-- CreateIndex
CREATE INDEX "user_sessions_userId_role_idx" ON "user_sessions"("userId", "role");

-- CreateIndex
CREATE INDEX "user_sessions_instanceId_idx" ON "user_sessions"("instanceId");

-- CreateIndex
CREATE INDEX "user_sessions_tokenJti_idx" ON "user_sessions"("tokenJti");
