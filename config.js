exports.DATABASE_URL =
  process.env.MONGODB_URI || "mongodb://localhost/proofing-db";

exports.TESTDATABASE_URL =
  process.env.TestDatabase_URL || "mongodb://localhost/proofing-db";

exports.PORT = process.env.PORT || 8080;

exports.CLOUDINARY_URL = process.env.CLOUDINARY_URL;

exports.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

exports.JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_EXPIRY = process.env.JWT_EXPIRY;

const GRIDUSER = process.env.GRIDUSER;
const PASSWORD = process.env.PASSWORD;

exports.sendGridOptions = {
  auth: {
    api_user: GRIDUSER,
    api_key: PASSWORD
  }
};
