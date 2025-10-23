-- CreateTable
CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "position_name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "positions_created_by_idx" ON "positions"("created_by");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("empid") ON DELETE RESTRICT ON UPDATE CASCADE;
