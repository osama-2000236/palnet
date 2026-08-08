-- Hiring-fraud report classes. The existing six are a social network's set;
-- none of them names the dominant local job scam, so a worker being asked for
-- money had to file it as SPAM or OTHER and the category was invisible in
-- moderation.
--
-- ADD VALUE is not transactional in Postgres, hence one statement each and no
-- BEFORE/AFTER ordering games: OTHER stays last in the UI by the client's own
-- reason list, not by enum order.

ALTER TYPE "ReportReason" ADD VALUE IF NOT EXISTS 'FEE_REQUEST';
ALTER TYPE "ReportReason" ADD VALUE IF NOT EXISTS 'GHOST_JOB';
ALTER TYPE "ReportReason" ADD VALUE IF NOT EXISTS 'ID_REQUEST';
