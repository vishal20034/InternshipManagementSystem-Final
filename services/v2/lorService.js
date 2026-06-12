"use strict";

const DocumentHistory = require("../../models/DocumentHistory");
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const { COLORS, A4_WIDTH, renderHeader, renderTitle, renderRefDate, renderSignatureBlock, renderFooter } = require("./pdfHelpers");

/**
 * Generates a Letter of Recommendation (LOR) PDF for a student.
 * @param {Object} data - Student data
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<string>} resolves with outputPath on success
 */
async function generateLORPDF(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc    = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Letter of Recommendation — TEN" } });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W       = A4_WIDTH;
            const { gold, cream, textDark } = COLORS;

            renderHeader(doc);
            renderTitle(doc, "LETTER OF RECOMMENDATION");
            renderRefDate(doc, data, "TEN/LOR/");

            // To Whom It May Concern box
            doc.rect(50, 174, W - 100, 40).fillAndStroke(cream, gold);
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(10)
                .text("To Whomsoever It May Concern", 62, 188, { width: W - 124, align: "center" });

            // Subject
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(10)
                .text(`Subject: Letter of Recommendation for ${data.studentName || "Student"}`, 50, 228);
            doc.moveTo(50, 244).lineTo(W - 50, 244).lineWidth(0.5).strokeColor("#ccc").stroke();

            const bodyOpts = { width: W - 100, align: "justify", lineGap: 4 };
            const name       = data.studentName      || "the candidate";
            const domain     = data.domain           || "the assigned domain";
            const dur        = data.durationText     || data.tenure || "the internship period";
            const start      = data.startDate        || "the joining date";
            const end        = data.endDate          || "the completion date";
            const completion = data.completionPercent != null ? data.completionPercent + "%" : "significant";
            const director   = data.directorName     || "Kamlesh Gupta";

            doc.fillColor(textDark).font("Helvetica").fontSize(10.5)
                .text(`Dear Hiring Manager,`, 50, 258);
            doc.moveDown(0.5);
            doc.text(
                `It is with great pleasure that I write this Letter of Recommendation for ${name}, who has completed a Virtual Internship at The Entrepreneurship Network (TEN) in the domain of ${domain}.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `${name} interned with us from ${start} to ${end} for a duration of ${dur}. During this period, they demonstrated a completion rate of ${completion} in their assigned coursework and tasks, reflecting genuine dedication and commitment to learning.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `Throughout the internship, ${name} showed a strong work ethic, ability to learn quickly, and consistent engagement with the program. They completed all assigned tasks to a satisfactory standard and actively participated in assessments and activities.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `I wholeheartedly recommend ${name} for any professional or academic opportunities they may pursue. We believe they have the drive and capability to make meaningful contributions in their chosen field.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `Should you require any further information, please feel free to contact us at hr@entrepreneurshipnetwork.net.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text("Yours sincerely,", 50, doc.y, bodyOpts);

            renderSignatureBlock(doc, { y: 680, directorName: director });

            // Stamp box
            doc.rect(50, 735, W - 100, 30).fillAndStroke(cream, gold);
            doc.fillColor("#555").font("Helvetica").fontSize(8)
                .text(`Document Number: ${data.documentNumber || "TEN/LOR/N/A"}  ·  Employee ID: ${data.employeeId || "N/A"}  ·  Domain: ${domain}`, 62, 745, { width: W - 124, align: "center" });

            renderFooter(doc, "Letter of Recommendation");

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Logs a Letter of Recommendation send into the Document Send History.
 * Delegates to the shared DocumentHistory.logSend helper.
 * @param {Object} entry - student / document info
 * @param {string} [method] - 'manual' | 'automation'
 * @returns {Promise<Object|null>} the created DocumentHistory record or null on failure
 */
function logLORSend(entry = {}, method = "manual") {
    return DocumentHistory.logSend({ ...entry, documentType: "Letter of Recommendation", documentKey: "lor" }, method);
}

module.exports = { generateLORPDF, logLORSend };
