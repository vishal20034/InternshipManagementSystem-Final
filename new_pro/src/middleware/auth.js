// new_pro/src/middleware/auth.js
// Authentication middleware and constants for the TEN Internship Management System

const Student = require("../../models/Student");
const HR = require("../../models/HR");
const Coordinator = require("../../models/Coordinator");

// ── Legacy Accounts (read from .env or use defaults) ────────────────────────
const HR_ACCOUNTS = {
    "hr_admin": { password: "HR@TEN2026", name: "HR Administrator", email: "hr.admin@ten.local" },
    "hr_manager": { password: "HRMgr@2026", name: "HR Manager", email: "hr.manager@ten.local" }
};

const COORDINATORS = {
    "devops_aws_admin": { password: "DevOpsAWS@2026", domain: "DevOps with AWS" },
    "python_admin": { password: "Python@2026", domain: "Python Development" },
    "java_admin": { password: "Java@2026", domain: "Java Development" },
    "web_admin": { password: "Web@2026", domain: "Web Development" },
    "mern_admin": { password: "Mern@2026", domain: "MERN Stack Development" },
    "ai_admin": { password: "AI@2026", domain: "Artificial Intelligence" },
    "datascience_admin": { password: "DS@2026", domain: "Data Science" },
    "cyber_admin": { password: "Cyber@2026", domain: "Cyber Security" },
    "software_admin": { password: "Software@2026", domain: "Software Engineering" },
    "flutter_admin": { password: "Flutter@2026", domain: "Flutter Development" },
    "hrmgmt_admin": { password: "HRMgmt@2026", domain: "HR Management" },
    "venturecapital_admin": { password: "VC@TEN2026", domain: "Venture Capital" },
    "vibecoding_admin": { password: "Vibe@TEN2026", domain: "Vibe Coding" },
    "spaceresearch_admin": { password: "Space@TEN2026", domain: "Space Research" },
    "businessanalyst_admin": { password: "BA@TEN2026", domain: "Business Analyst" },
    "hr_domain_admin": { password: "HRDomain@TEN2026", domain: "HR" }
};

// ── Chat Identity Verification (for Socket.IO) ─────────────────────────────
async function verifyChatIdentity(claim) {
    if (!claim || !claim.role) return null;
    if (claim.role === "student") {
        if (!claim.employeeId) return null;
        const s = await Student.findOne({ employeeId: claim.employeeId });
        if (!s) return null;
        return {
            role: "student", id: s.employeeId,
            name: (s.name || ((s.firstName || "") + " " + (s.lastName || ""))).trim() || s.employeeId,
            domain: s.domain || ""
        };
    }
    if (claim.role === "coordinator") {
        const id = claim.username || claim.email;
        if (!id) return null;
        const legacy = COORDINATORS[id];
        if (legacy) return { role: "coordinator", id, name: id, domain: legacy.domain };
        const q = id.indexOf("@") !== -1 ? { email: id.toLowerCase() } : { $or: [{ username: id }, { email: id.toLowerCase() }] };
        const dbC = await Coordinator.findOne(q);
        if (dbC) return { role: "coordinator", id: dbC.email || dbC.username || id, name: dbC.name, domain: dbC.domain };
        return null;
    }
    if (claim.role === "hr") {
        const id = claim.username || claim.email;
        if (!id) return null;
        const legacy = HR_ACCOUNTS[id];
        if (legacy) return { role: "hr", id, name: legacy.name, domain: "" };
        const legacyByEmail = Object.entries(HR_ACCOUNTS).find(([_, v]) => (v.email || "").toLowerCase() === String(id).toLowerCase());
        if (legacyByEmail) { const [u, v] = legacyByEmail; return { role: "hr", id: v.email || u, name: v.name, domain: "" }; }
        if (id.indexOf("@") !== -1) {
            const dbH = await HR.findOne({ email: id.toLowerCase() });
            if (dbH) return { role: "hr", id: dbH.email, name: dbH.name, domain: "" };
        }
        return null;
    }
    return null;
}

function roomsAllowedFor(identity) {
    const rooms = ["general"];
    if (identity.role === "student") { if (identity.domain) rooms.push("domain_" + identity.domain); }
    else if (identity.role === "coordinator") { if (identity.domain) rooms.push("domain_" + identity.domain); rooms.push("hr_coordinators"); }
    else if (identity.role === "hr") { rooms.push("hr_coordinators"); rooms.push("hr_internal"); }
    return rooms;
}

function canAccessRoom(identity, room) {
    if (!room) return false;
    if (roomsAllowedFor(identity).indexOf(room) !== -1) return true;
    if (room.indexOf("domain_") === 0 && identity.domain && room === "domain_" + identity.domain) return true;
    return false;
}

function canDeleteIn(identity, room) {
    if (!canAccessRoom(identity, room)) return false;
    if (identity.role === "student") return false;
    return true;
}

module.exports = {
    HR_ACCOUNTS,
    COORDINATORS,
    verifyChatIdentity,
    roomsAllowedFor,
    canAccessRoom,
    canDeleteIn
};