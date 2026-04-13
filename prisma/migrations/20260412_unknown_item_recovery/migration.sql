-- CreateEnum
CREATE TYPE "UnknownItemKind" AS ENUM ('SHIP', 'ITEM', 'DRONE', 'CHARGE', 'IMPLANT', 'BOOSTER', 'SUBSYSTEM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UnknownItemObservationStatus" AS ENUM ('PENDING', 'MATCHED', 'AMBIGUOUS', 'REJECTED');

-- CreateEnum
CREATE TYPE "ItemResolutionCandidateSource" AS ENUM ('SDE', 'ESI', 'LEXICAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ItemAliasSource" AS ENUM ('MANUAL', 'AUTO_SDE', 'AUTO_ESI');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "ItemDefinition" ADD COLUMN "normalizedName" TEXT;

UPDATE "ItemDefinition"
SET "normalizedName" = LOWER(REGEXP_REPLACE(TRIM("name"), '\s+', ' ', 'g'));

ALTER TABLE "ItemDefinition" ALTER COLUMN "normalizedName" SET NOT NULL;

-- CreateTable
CREATE TABLE "UnknownItemObservation" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "kind" "UnknownItemKind" NOT NULL,
    "sourceFitHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "status" "UnknownItemObservationStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,

    CONSTRAINT "UnknownItemObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemResolutionCandidate" (
    "id" TEXT NOT NULL,
    "unknownItemObservationId" TEXT NOT NULL,
    "candidateTypeId" INTEGER,
    "candidateName" TEXT NOT NULL,
    "source" "ItemResolutionCandidateSource" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "confidenceReason" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemResolutionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAlias" (
    "id" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "canonicalTypeId" INTEGER NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "source" "ItemAliasSource" NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemDefinition_normalizedName_key" ON "ItemDefinition"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "UnknownItemObservation_normalizedName_kind_key" ON "UnknownItemObservation"("normalizedName", "kind");

-- CreateIndex
CREATE INDEX "UnknownItemObservation_status_lastSeenAt_idx" ON "UnknownItemObservation"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ItemResolutionCandidate_unknownItemObservationId_accepted_idx" ON "ItemResolutionCandidate"("unknownItemObservationId", "accepted");

-- CreateIndex
CREATE INDEX "ItemResolutionCandidate_candidateTypeId_idx" ON "ItemResolutionCandidate"("candidateTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemAlias_aliasNormalized_key" ON "ItemAlias"("aliasNormalized");

-- CreateIndex
CREATE INDEX "ItemAlias_reviewStatus_idx" ON "ItemAlias"("reviewStatus");

-- CreateIndex
CREATE INDEX "ItemAlias_canonicalTypeId_idx" ON "ItemAlias"("canonicalTypeId");

-- AddForeignKey
ALTER TABLE "ItemResolutionCandidate" ADD CONSTRAINT "ItemResolutionCandidate_unknownItemObservationId_fkey" FOREIGN KEY ("unknownItemObservationId") REFERENCES "UnknownItemObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;