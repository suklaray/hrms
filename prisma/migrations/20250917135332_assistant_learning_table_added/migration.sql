-- CreateTable
CREATE TABLE "public"."assistant_learning" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "user_id" VARCHAR(255),
    "intent_category" VARCHAR(100),
    "intent_labels" TEXT,
    "confidence_score" DECIMAL(3,2),
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_asked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_learning_pkey" PRIMARY KEY ("id")
);
