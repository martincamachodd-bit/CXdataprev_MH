-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('XFM', 'MSB', 'UPS', 'ATS', 'ADP', 'PDU', 'CRAC', 'QDL');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "AssetType" NOT NULL,
    "celula" INTEGER NOT NULL,
    "fonteA" TEXT,
    "fonteB" TEXT,
    "nivelAtual" "Level" NOT NULL DEFAULT 'L1',
    "punchACount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetStepCompletion" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "stepId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,

    CONSTRAINT "AssetStepCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDocument" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "stepId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "AssetDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelTransition" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromLevel" "Level" NOT NULL,
    "toLevel" "Level" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byId" TEXT NOT NULL,

    CONSTRAINT "LevelTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tag_key" ON "Asset"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "AssetStepCompletion_assetId_level_stepId_key" ON "AssetStepCompletion"("assetId", "level", "stepId");

-- AddForeignKey
ALTER TABLE "AssetStepCompletion" ADD CONSTRAINT "AssetStepCompletion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStepCompletion" ADD CONSTRAINT "AssetStepCompletion_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStepCompletion" ADD CONSTRAINT "AssetStepCompletion_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelTransition" ADD CONSTRAINT "LevelTransition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelTransition" ADD CONSTRAINT "LevelTransition_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
