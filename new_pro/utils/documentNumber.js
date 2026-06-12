const crypto = require("crypto");

function generateDocumentNumber(type) {
  const prefixes = {
    offer_letter: "TEN-OL",
    offer: "TEN-OL",
    lor: "TEN-LOR",
    loc: "TEN-LOC",
    completion: "TEN-LOC",
    expert: "TEN-EXP",
    expert_certificate: "TEN-EXP",
    nano_degree: "TEN-ND",
    fellowship: "TEN-FEL"
  };
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefixes[type] || "TEN-DOC"}-${year}-${random}`;
}

function normalizeDocumentNumber(value) {
  return String(value || "").trim().toUpperCase();
}

async function generateEmployeeId(StudentModel, domain) {
  const domainShortCodes = {
    "DevOps with AWS":          "DEVOPS",
    "Python Development":       "PY",
    "Java Development":         "JAVA",
    "Web Development":          "WEB",
    "MERN Stack Development":   "MERN",
    "Artificial Intelligence":  "AI",
    "Data Science":             "DS",
    "Cyber Security":           "CYBER",
    "Software Engineering":     "SDE",
    "Flutter Development":      "FLUTTER",
    "HR Management":            "HR",
    "Venture Capital":          "VC",
    "Vibe Coding":              "VIBE",
    "Space Research":           "SPACE",
    "Business Analyst":         "BA",
    "HR":                       "HR"
  };
  const shortCode = domainShortCodes[domain] || String(domain || "").toUpperCase().replace(/\s+/g, "");
  const totalStudents = await StudentModel.countDocuments();
  const sequenceNumber = 1001 + totalStudents;
  return `TEN/${shortCode}/${sequenceNumber}`;
}

module.exports = { generateDocumentNumber, normalizeDocumentNumber, generateEmployeeId };

