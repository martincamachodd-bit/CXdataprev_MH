-- CreateEnum
CREATE TYPE "PunchCategoria" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "PunchStatus" AS ENUM ('aberto', 'fechado');

-- CreateTable
CREATE TABLE "Punch" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "categoria" "PunchCategoria" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "prazo" TIMESTAMP(3),
    "status" "PunchStatus" NOT NULL DEFAULT 'aberto',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "Punch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
