const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in backend/.env");
}

const adapter = new PrismaPg({
  connectionString
});

const prisma = new PrismaClient({
  adapter
});

/*
  Export both ways so every existing route in this project
  can use Prisma safely.

  Supported:
    const prisma = require("../lib/prisma");

  and:
    const { prisma } = require("../lib/prisma");
*/

module.exports = prisma;
module.exports.prisma = prisma;