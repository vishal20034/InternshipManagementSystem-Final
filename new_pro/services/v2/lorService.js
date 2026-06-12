"use strict";

const PDFDocument = require("pdfkit");
const fs          = require("fs");

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

            const W       = 595.28;
            const gold    = "#C9A84C";
            const navy    = "#0A1628";
            const white   = "#FFFFFF";
            const cream   = "#F8F5ED";
            const textDark = "#1A1A2E";

            // Header band
            doc.rect(0, 0, W, 90).fill(navy);
            doc.rect(0, 90, W, 4).fill(gold);

            doc.fillColor(gold).font("Helvetica-Bold").fontSize(18)
                .text("THE ENTREPRENEURSHIP NETWORK", 50, 28, { width: W - 100, align: "center" });
            doc.fillColor(white).font("Helvetica").fontSize(10)
                .text("TEN — Shaping Tomorrow's Entrepreneurs", 50, 52, { width: W - 100, align: "center" });
            doc.fillColor(gold).font("Helvetica").fontSize(9)
                .text("hr@entrepreneurshipnetwork.net  |  www.entrepreneurshipnetwork.net", 50, 70, { width: W - 100, align: "center" });

            // Title
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(15)
                .text("LETTER OF RECOMMENDATION", 50, 110, { width: W - 100, align: "center" });
            doc.moveTo(100, 132).lineTo(W - 100, 132).lineWidth(0.8).strokeColor(gold).stroke();

            // Reference & Date
            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
            doc.fillColor("#555").font("Helvetica").fontSize(9)
                .text(`Date: ${data.dateIssued || today}`, 50, 142);
            doc.text(`Ref: ${data.documentNumber || "TEN/LOR/" + Date.now().toString().slice(-6)}`, 50, 156);

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

            // Signature area
            const sigY = 680;
            doc.moveTo(50, sigY).lineTo(220, sigY).lineWidth(0.8).strokeColor("#333").stroke();
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9.5).text(director, 50, sigY + 5);
            doc.font("Helvetica").fontSize(8.5).fillColor("#555")
                .text("Director", 50, sigY + 18)
                .text("The Entrepreneurship Network", 50, sigY + 30);

            doc.moveTo(W - 220, sigY).lineTo(W - 50, sigY).lineWidth(0.8).strokeColor("#333").stroke();
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9.5).text("HR Department", W - 220, sigY + 5);
            doc.font("Helvetica").fontSize(8.5).fillColor("#555")
                .text("Human Resources", W - 220, sigY + 18)
                .text("The Entrepreneurship Network", W - 220, sigY + 30);

            // Stamp box
            doc.rect(50, sigY + 55, W - 100, 30).fillAndStroke(cream, gold);
            doc.fillColor("#555").font("Helvetica").fontSize(8)
                .text(`Document Number: ${data.documentNumber || "TEN/LOR/N/A"}  ·  Employee ID: ${data.employeeId || "N/A"}  ·  Domain: ${domain}`, 62, sigY + 65, { width: W - 124, align: "center" });

            // Footer
            doc.rect(0, 800, W, 42).fill(navy);
            doc.fillColor(gold).font("Helvetica").fontSize(8)
                .text("The Entrepreneurship Network  ·  hr@entrepreneurshipnetwork.net  ·  www.entrepreneurshipnetwork.net", 0, 816, { width: W, align: "center" });
            doc.fillColor(white).font("Helvetica").fontSize(7)
                .text("This is a digitally generated Letter of Recommendation. For verification contact hr@entrepreneurshipnetwork.net", 0, 828, { width: W, align: "center" });

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateLORPDF };
