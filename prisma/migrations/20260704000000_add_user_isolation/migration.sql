-- AddColumn: userId (nullable) to Job table
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AddColumn: userId (nullable) to Settings table  
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AddForeignKey: Job.userId -> User.id (on delete cascade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Job_userId_fkey'
  ) THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- AddForeignKey: Settings.userId -> User.id (on delete cascade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Settings_userId_fkey'
  ) THEN
    ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
