ALTER TABLE "User"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "passwordHash" TEXT;

-- Backfill note:
-- 既存データがある場合は email / passwordHash を手動で埋めてください。

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

