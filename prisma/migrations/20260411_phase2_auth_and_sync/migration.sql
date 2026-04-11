-- AlterTable
ALTER TABLE "Character"
ADD COLUMN     "ownerHash" TEXT,
ADD COLUMN     "esiAccessToken" TEXT,
ADD COLUMN     "esiRefreshToken" TEXT,
ADD COLUMN     "esiScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "esiTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "totalSkillPoints" INTEGER,
ADD COLUMN     "unallocatedSkillPoints" INTEGER;

-- CreateIndex
CREATE INDEX "Character_ownerHash_idx" ON "Character"("ownerHash");
