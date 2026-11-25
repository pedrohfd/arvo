-- CreateEnum
CREATE TYPE "Flow" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'PIX', 'CASH', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "SeriesKind" AS ENUM ('RECURRING', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('SPEND', 'KEEP');

-- CreateEnum
CREATE TYPE "GoalMovementType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'COMPLETE');

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "kind" "Flow" NOT NULL,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "last4" TEXT,
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SeriesKind" NOT NULL,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "anchorDay" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "count" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "kind" "Flow" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "title" TEXT,
    "categoryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "cardId" TEXT,
    "dueDate" DATE,
    "seriesId" TEXT,
    "seriesIndex" INTEGER,
    "reimbursedSplitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_split" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" DATE,

    CONSTRAINT "transaction_split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "kind" "GoalKind" NOT NULL,
    "targetCents" INTEGER NOT NULL,
    "deadline" DATE,
    "completedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_movement" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" "GoalMovementType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL,
    "minimumBalanceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "category_userId_idx" ON "category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "category_userId_kind_name_key" ON "category"("userId", "kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "category_userId_systemKey_key" ON "category"("userId", "systemKey");

-- CreateIndex
CREATE INDEX "card_userId_idx" ON "card"("userId");

-- CreateIndex
CREATE INDEX "person_userId_idx" ON "person"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "person_userId_name_key" ON "person"("userId", "name");

-- CreateIndex
CREATE INDEX "series_userId_idx" ON "series"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_reimbursedSplitId_key" ON "transaction"("reimbursedSplitId");

-- CreateIndex
CREATE INDEX "transaction_userId_date_idx" ON "transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "transaction_userId_dueDate_idx" ON "transaction"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "transaction_seriesId_seriesIndex_idx" ON "transaction"("seriesId", "seriesIndex");

-- CreateIndex
CREATE INDEX "transaction_categoryId_idx" ON "transaction"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_userId_clientId_key" ON "transaction"("userId", "clientId");

-- CreateIndex
CREATE INDEX "transaction_split_personId_idx" ON "transaction_split"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_split_transactionId_personId_key" ON "transaction_split"("transactionId", "personId");

-- CreateIndex
CREATE INDEX "goal_userId_idx" ON "goal"("userId");

-- CreateIndex
CREATE INDEX "goal_movement_goalId_date_idx" ON "goal_movement"("goalId", "date");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_reimbursedSplitId_fkey" FOREIGN KEY ("reimbursedSplitId") REFERENCES "transaction_split"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_movement" ADD CONSTRAINT "goal_movement_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Restrições que o Prisma não expressa. Mantêm o banco coerente mesmo que um bug no app tente gravar
-- dado inválido (as mesmas regras também são validadas na API).
-- Dinheiro: centavos inteiros positivos, até R$ 9.999.999,99 (P1).
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_range" CHECK ("amountCents" > 0 AND "amountCents" <= 999999999);
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_amount_range" CHECK ("amountCents" > 0 AND "amountCents" <= 999999999);
ALTER TABLE "goal" ADD CONSTRAINT "goal_target_range" CHECK ("targetCents" > 0 AND "targetCents" <= 999999999);
ALTER TABLE "goal_movement" ADD CONSTRAINT "goal_movement_amount_range" CHECK ("amountCents" > 0 AND "amountCents" <= 999999999);
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_minimum_range" CHECK ("minimumBalanceCents" >= 0 AND "minimumBalanceCents" <= 999999999);

-- Transação: entrada não usa cartão nem tem fatura; depósito só existe como forma de recebimento.
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_income_shape" CHECK (
  "kind" = 'EXPENSE' OR ("paymentMethod" <> 'CARD' AND "dueDate" IS NULL)
);
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_deposit_is_income" CHECK ("paymentMethod" <> 'DEPOSIT' OR "kind" = 'INCOME');
-- Pertencer a uma série e ter posição nela andam juntos.
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_series_position" CHECK (
  ("seriesId" IS NULL) = ("seriesIndex" IS NULL) AND ("seriesIndex" IS NULL OR "seriesIndex" >= 1)
);

-- Cartão: o crédito precisa de fechamento e vencimento (1 a 31); o débito não tem.
ALTER TABLE "card" ADD CONSTRAINT "card_credit_days" CHECK (
  ("type" = 'CREDIT' AND "closingDay" IS NOT NULL AND "dueDay" IS NOT NULL AND "closingDay" BETWEEN 1 AND 31 AND "dueDay" BETWEEN 1 AND 31)
  OR ("type" = 'DEBIT' AND "closingDay" IS NULL AND "dueDay" IS NULL)
);
ALTER TABLE "card" ADD CONSTRAINT "card_last4_digits" CHECK ("last4" IS NULL OR "last4" ~ '^[0-9]{4}$');

-- Série: periodicidade, dia âncora e quantidade válidos; parcelamento sempre tem quantidade.
ALTER TABLE "series" ADD CONSTRAINT "series_interval" CHECK ("intervalMonths" >= 1);
ALTER TABLE "series" ADD CONSTRAINT "series_anchor_day" CHECK ("anchorDay" BETWEEN 1 AND 31);
ALTER TABLE "series" ADD CONSTRAINT "series_count" CHECK (
  ("count" IS NULL OR "count" >= 1) AND ("kind" <> 'INSTALLMENT' OR "count" IS NOT NULL)
);

-- Categoria e pessoa em uso não podem ser apagadas, mas a cascata de "apagar a conta" tem que passar:
-- por isso estas duas chaves (NO ACTION) são conferidas só no fim da transação (P6).
ALTER TABLE "transaction" ALTER CONSTRAINT "transaction_categoryId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "transaction_split" ALTER CONSTRAINT "transaction_split_personId_fkey" DEFERRABLE INITIALLY DEFERRED;
