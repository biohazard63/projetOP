-- AlterTable
ALTER TABLE "public"."GameState" ADD COLUMN     "opponentDonField" JSONB[],
ADD COLUMN     "playerDonField" JSONB[];
