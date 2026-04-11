-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "eveUserId" BIGINT,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "eveCharacterId" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corporationName" TEXT,
    "allianceName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "skillTypeId" INTEGER NOT NULL,
    "activeLevel" INTEGER NOT NULL,
    "trainedLevel" INTEGER NOT NULL,
    "skillpoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkillQueue" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "queuePosition" INTEGER NOT NULL,
    "skillTypeId" INTEGER NOT NULL,
    "finishedLevel" INTEGER NOT NULL,
    "trainingStartSp" INTEGER,
    "levelEndSp" INTEGER,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterSkillQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAttributes" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "intelligence" INTEGER NOT NULL,
    "memory" INTEGER NOT NULL,
    "perception" INTEGER NOT NULL,
    "willpower" INTEGER NOT NULL,
    "charisma" INTEGER NOT NULL,
    "bonusRemaps" INTEGER,
    "accruedRemapCooldownAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCatalog" (
    "id" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rank" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPrerequisite" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "prerequisiteSkillId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDefinition" (
    "id" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT,
    "categoryName" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRequirementSkill" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "skillTypeId" INTEGER NOT NULL,
    "requiredLevel" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'generated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRequirementSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "characterId" TEXT,
    "name" TEXT,
    "eftText" TEXT NOT NULL,
    "analysisSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_eveUserId_key" ON "User"("eveUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_eveCharacterId_key" ON "Character"("eveCharacterId");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex
CREATE INDEX "Character_name_idx" ON "Character"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_skillTypeId_key" ON "CharacterSkill"("characterId", "skillTypeId");

-- CreateIndex
CREATE INDEX "CharacterSkill_skillTypeId_idx" ON "CharacterSkill"("skillTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkillQueue_characterId_queuePosition_key" ON "CharacterSkillQueue"("characterId", "queuePosition");

-- CreateIndex
CREATE INDEX "CharacterSkillQueue_skillTypeId_idx" ON "CharacterSkillQueue"("skillTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAttributes_characterId_key" ON "CharacterAttributes"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCatalog_typeId_key" ON "SkillCatalog"("typeId");

-- CreateIndex
CREATE INDEX "SkillCatalog_name_idx" ON "SkillCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SkillPrerequisite_skillId_prerequisiteSkillId_key" ON "SkillPrerequisite"("skillId", "prerequisiteSkillId");

-- CreateIndex
CREATE INDEX "SkillPrerequisite_prerequisiteSkillId_idx" ON "SkillPrerequisite"("prerequisiteSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDefinition_typeId_key" ON "ItemDefinition"("typeId");

-- CreateIndex
CREATE INDEX "ItemDefinition_name_idx" ON "ItemDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRequirementSkill_itemId_skillTypeId_key" ON "ItemRequirementSkill"("itemId", "skillTypeId");

-- CreateIndex
CREATE INDEX "ItemRequirementSkill_skillTypeId_idx" ON "ItemRequirementSkill"("skillTypeId");

-- CreateIndex
CREATE INDEX "Fit_userId_idx" ON "Fit"("userId");

-- CreateIndex
CREATE INDEX "Fit_characterId_idx" ON "Fit"("characterId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkillQueue" ADD CONSTRAINT "CharacterSkillQueue_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAttributes" ADD CONSTRAINT "CharacterAttributes_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_prerequisiteSkillId_fkey" FOREIGN KEY ("prerequisiteSkillId") REFERENCES "SkillCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRequirementSkill" ADD CONSTRAINT "ItemRequirementSkill_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fit" ADD CONSTRAINT "Fit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fit" ADD CONSTRAINT "Fit_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
