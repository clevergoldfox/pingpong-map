-- Add time slot (start/end) to Category for conflict detection
ALTER TABLE "Category"
ADD COLUMN "timeSlotStart" TEXT,
ADD COLUMN "timeSlotEnd" TEXT;
