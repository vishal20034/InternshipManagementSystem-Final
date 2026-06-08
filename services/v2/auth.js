"use strict";

const crypto = require("crypto");

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret() {
    return process.env.STUDENT_AUTH_SECRET || process.env.SESSION_SECRET || "ten-student-auth-secret";
}

function signPayload(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
    return `${body}.${sig}`;
}

function verifyStudentToken(token) {
    try {
        if (!token || typeof token !== "string" || !token.includes(".")) return null;
        const [body, sig] = token.split(".");
        const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (!payload || !payload.employeeId || !payload.exp) return null;
        if (Date.now() > Number(payload.exp)) return null;
        return payload;
    } catch (_) {
        return null;
    }
}

function issueStudentToken(student) {
    const now = Date.now();
    return signPayload({
        type: "student",
        employeeId: student.employeeId,
        iat: now,
        exp: now + TOKEN_TTL_MS
    });
}

function extractBearerToken(req) {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) {
        return auth.slice(7).trim();
    }
    return req.headers["x-student-token"] || req.query.token || (req.body && req.body.token) || null;
}

function getEmployeeIdFromRequest(req) {
    const token = extractBearerToken(req);
    const payload = verifyStudentToken(token);
    if (payload && payload.employeeId) {
        return String(payload.employeeId);
    }
    return req.headers["x-employee-id"] || (req.body && req.body.employeeId) || req.query.employeeId || null;
}

module.exports = {
    TOKEN_TTL_MS,
    issueStudentToken,
    verifyStudentToken,
    extractBearerToken,
    getEmployeeIdFromRequest
};
