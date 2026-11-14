-- The employer side of an application. Applying wrote a row and told nobody:
-- the poster only found applicants by opening the applicants page on a hunch.
--
-- ADD VALUE is not transactional in Postgres; one statement, nothing else here.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_APPLICATION_RECEIVED';
