"use strict";

const DocumentHistory = require("../../models/DocumentHistory");
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const { COLORS, A4_WIDTH, renderHeader, renderTitle, renderRefDate, renderSignatureBlock, renderFooter } = require("./pdfHelpers");

/**
 * Generates a Letter of Completion (LOC) PDF for a student.
 * Auto-triggered when student reaches 100% task completion.
 * @param {Object} data - Student data
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<string>} resolves with outputPath on success
 */
async function generateLOCPDF(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc    = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Letter of Completion — TEN" } });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W       = A4_WIDTH;
            const { gold, cream, textDark } = COLORS;
            const green   = "#065F46";

            renderHeader(doc);
            renderTitle(doc, "LETTER OF COMPLETION");
            renderRefDate(doc, data, "TEN/LOC/");

            // Congratulations banner
            doc.rect(50, 174, W - 100, 50).fillAndStroke("rgba(6,95,70,0.1)", green);
            doc.fillColor(green).font("Helvetica-Bold").fontSize(12)
                .text("🎉 CERTIFICATE OF COMPLETION", 62, 188, { width: W - 124, align: "center" });
            doc.font("Helvetica").fontSize(9).fillColor("#065F46")
                .text("This document certifies successful completion of the internship programme", 62, 205, { width: W - 124, align: "center" });

            // Student info box
            doc.rect(50, 240, W - 100, 80).fillAndStroke(cream, gold);
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(11)
                .text("Student Details:", 66, 250);
            doc.font("Helvetica").fontSize(10)
                .text(`Name: ${data.studentName || "Student Name"}`, 66, 266)
                .text(`Employee ID: ${data.employeeId || "N/A"}`, 66, 281)
                .text(`Domain: ${data.domain || "N/A"}`, 66, 296)
                .text(`Duration: ${data.durationText || data.tenure || "N/A"}`, 300, 266)
                .text(`Start Date: ${data.startDate || "N/A"}`, 300, 281)
                .text(`End Date: ${data.endDate || "N/A"}`, 300, 296);

            // Body
            const bodyOpts = { width: W - 100, align: "justify", lineGap: 4 };
            const name   = data.studentName || "the candidate";
            const domain = data.domain      || "the assigned domain";
            const dur    = data.durationText || data.tenure || "the internship period";
            const start  = data.startDate   || "the joining date";
            const end    = data.endDate     || "the completion date";
            const director = data.directorName || "Kamlesh Gupta";

            doc.fillColor(textDark).font("Helvetica").fontSize(10.5)
                .text("To Whomsoever It May Concern,", 50, 340);
            doc.moveDown(0.5);
            doc.text(
                `This is to certify that ${name} (Employee ID: ${data.employeeId || "N/A"}) has successfully completed the Virtual Internship Programme at The Entrepreneurship Network (TEN) in the domain of ${domain}.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `The internship was of a duration of ${dur}, from ${start} to ${end}. ${name} has fulfilled all the requirements of the programme, including completing 100% of the assigned tasks, maintaining satisfactory attendance, and participating in all required assessments.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `Throughout the programme, ${name} demonstrated consistent effort, professionalism, and a commitment to learning. We are pleased to issue this Letter of Completion as a formal acknowledgement of their achievement.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `We wish ${name} the very best in all future endeavours. This letter may be used for any academic or professional purpose.`,
                50, doc.y, bodyOpts
            );

            // Achievement badge
            const badgeY = doc.y + 20;
            if (badgeY < 660) {
                doc.rect(50, badgeY, W - 100, 40).fillAndStroke("rgba(201,168,76,0.08)", gold);
                doc.fillColor(gold).font("Helvetica-Bold").fontSize(10)
                    .text("✅ 100% COMPLETION ACHIEVED", 62, badgeY + 8, { width: W - 124, align: "center" });
                doc.fillColor("#555").font("Helvetica").fontSize(8)
                    .text(`Document Number: ${data.documentNumber || "TEN/LOC/N/A"}`, 62, badgeY + 24, { width: W - 124, align: "center" });
            }

            renderSignatureBlock(doc, { directorName: director });
            renderFooter(doc, "Letter of Completion");

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Logs a Letter of Completion send into the Document Send History.
 * Delegates to the shared DocumentHistory.logSend helper.
 * @param {Object} entry - student / document info
 * @param {string} [method] - 'manual' | 'automation'
 * @returns {Promise<Object|null>} the created DocumentHistory record or null on failure
 */
function logLOCSend(entry = {}, method = "automation") {
    return DocumentHistory.logSend({ ...entry, documentType: "Letter of Completion", documentKey: "loc" }, method);
}

module.exports = { generateLOCPDF, logLOCSend };
