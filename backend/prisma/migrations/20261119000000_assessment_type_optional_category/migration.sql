CREATE TYPE "assessment_type" AS ENUM ('GENERAL', 'PRE_TEST', 'POST_TEST');

ALTER TABLE "assessments"
  ALTER COLUMN "category_id" DROP NOT NULL,
  ADD COLUMN "assessment_type" "assessment_type" NOT NULL DEFAULT 'GENERAL';
