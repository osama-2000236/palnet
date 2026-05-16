-- Sprint 25 D1: extend PaymentMethod with Palestinian wallet providers. Stubs
-- only at this point; provider clients land once merchant onboarding completes.

ALTER TYPE "PaymentMethod" ADD VALUE 'JAWWALPAY';
ALTER TYPE "PaymentMethod" ADD VALUE 'PALPAY';
ALTER TYPE "PaymentMethod" ADD VALUE 'REFLECT';
