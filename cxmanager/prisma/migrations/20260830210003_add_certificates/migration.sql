-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "instrumento" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "numeroCertificado" TEXT NOT NULL,
    "laboratorio" TEXT NOT NULL,
    "dataCalibracao" TIMESTAMP(3) NOT NULL,
    "validade" TIMESTAMP(3) NOT NULL,
    "uso" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
