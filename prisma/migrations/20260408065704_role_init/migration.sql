-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'EDITOR', 'CONTRIBUTOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
