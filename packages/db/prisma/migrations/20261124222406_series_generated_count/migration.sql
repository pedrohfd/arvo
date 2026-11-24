-- AlterTable
ALTER TABLE "series" ADD COLUMN     "generatedCount" INTEGER NOT NULL DEFAULT 0;

-- Séries que já existem: o contador parte do que elas têm hoje.
UPDATE "series" SET "generatedCount" = COALESCE(
  (SELECT MAX("seriesIndex") FROM "transaction" WHERE "transaction"."seriesId" = "series"."id"), 0);
