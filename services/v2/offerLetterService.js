"use strict";

const DocumentHistory = require("../../models/DocumentHistory");
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");
const {
    ensureFonts,
    registerFonts,
    drawLogo,
    drawCircularSeal,
    todayFormatted
} = require("./pdfHelpers");

/**
 * Generates an Internship Offer Letter PDF for a student.
 * @param {Object} data - Student data for the offer letter
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<string>} resolves with outputPath on success
 */
async function generateOfferLetterPDF(data, outputPath) {
    await ensureFonts();
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Internship Offer Letter — TEN" } });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            registerFonts(doc);

            const W = 595.28; // A4 width
            const H = 841.89; // A4 height

            // ── Background watermark ──
            drawLogo(doc, W / 2, H / 2, 260, 0.08, "#000000");

            // ── Outer double-ruled border ──
            doc.rect(15, 15, W - 30, H - 30).lineWidth(3).strokeColor("#000000").stroke();
            doc.rect(20, 20, W - 40, H - 40).lineWidth(1).strokeColor("#000000").stroke();

            // ── Top Centered Logo + Wordmark ──
            drawLogo(doc, W / 2, 50, 42, 1, "#000000");
            doc.fillColor("#000000").font("Caveat-Bold").fontSize(17)
                .text("The Entrepreneurship Network", 0, 76, { width: W, align: "center" });

            // ── Underlined Title ──
            doc.fillColor("#000000").font("Times-Bold").fontSize(13)
                .text("Internship Offer Letter with The Entrepreneurship Network", 40, 115, { width: W - 80, align: "center" });
            doc.moveTo(80, 131).lineTo(W - 80, 131).lineWidth(1).strokeColor("#000000").stroke();

            // ── Metadata Block (Left-aligned near top) ──
            const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
            const docNum = data.documentNumber || `TEN/OL/${Date.now().toString().slice(-5)}`;
            const empId = data.employeeId || "TEN/HR/00000";

            doc.fillColor("#000000").font("Times-Roman").fontSize(10)
                .text(`Date: ${data.dateIssued || today}`, 50, 150)
                .text(`Employee ID: ${empId}`, 50, 164)
                .text(`Document No.: ${docNum}`, 50, 178);

            // ── Candidate Address Block ──
            const studentName = data.studentName || "Candidate Name";
            const college = data.collegeName || data.college || "Not Provided";
            doc.font("Times-Bold").fontSize(11).text(studentName, 50, 202);
            doc.font("Times-Roman").fontSize(10).text(college, 50, 216);

            // ── Salutation ──
            const firstName = studentName.split(" ")[0] || studentName;
            doc.font("Times-Roman").fontSize(10.5).text(`Dear ${firstName},`, 50, 240);

            // ── Body Paragraphs (Serif, Justified, Bold Variables) ──
            const role = data.domain || data.role || "Intern";
            const joinDate = data.startDate || today;
            const bodyOpts = { width: W - 100, align: "justify", lineGap: 5 };

            doc.moveDown(0.5);
            doc.font("Times-Roman").fontSize(10.5);
            
            // Build first paragraph text with custom inline bolding
            doc.text("We are delighted & excited to welcome you to ", 50, doc.y, { ...bodyOpts, continued: true });
            doc.font("Times-Bold").text("The Entrepreneurship Network", { continued: true });
            doc.font("Times-Roman").text(" as a ", { continued: true });
            doc.font("Times-Bold").text(role, { continued: true });
            doc.font("Times-Roman").text(", we believe that our team is our biggest strength and we take pride in hiring only the best and the brightest. We are confident that you would play a significant role in the overall success of the venture and wish you the most enjoyable, learning packed and truly meaningful internship experience with ", { continued: true });
            doc.font("Times-Bold").text("The Entrepreneurship Network", { continued: true });
            doc.font("Times-Roman").text(". The candidate is duly informed that he/she will not be eligible for any fixed stipend over the course of his/her internship. Your joining date is ", { continued: true });
            doc.font("Times-Bold").text(joinDate, { continued: false });

            doc.moveDown(1.2);
            
            // Second paragraph text
            doc.font("Times-Roman").text("We look forward to you joining with us. The Company Policies manual is attached below, please go through it thoroughly. Please do not hesitate to call us for any information you may need. Also, ", doc.x, doc.y, { ...bodyOpts, continued: true });
            doc.font("Times-Bold").text("please sign the duplicate of this offer as your acceptance and forward the same to us on hr@entrepreneurshipnetwork.net.", { continued: false });

            doc.moveDown(1.5);
            doc.font("Times-Bold").fontSize(11).text("Congratulations!", 50, doc.y);

            // ── Signature and Seal Block ──
            const sigY = 660;

            // Cursive signature
            doc.font("DancingScript-Regular").fontSize(18).fillColor("#000000").text("Kamlesh Gupta", 50, sigY - 12);
            // Printed lines
            doc.font("Times-Bold").fontSize(9.5).text("Kamlesh Gupta", 50, sigY + 5);
            doc.font("Times-Roman").fontSize(8.5).fillColor("#555555")
                .text("Director", 50, sigY + 18)
                .text("The Entrepreneurship Network", 50, sigY + 30);

            // Circular Seal to the right
            drawCircularSeal(doc, W - 100, sigY + 12, 35);

            // ── Standard Footer ──
            doc.rect(20, 775, W - 40, 0.5).fillColor("#ccc").fill();
            doc.fillColor("#888888").font("Times-Roman").fontSize(8)
                .text("The Entrepreneurship Network  ·  hr@entrepreneurshipnetwork.net  ·  www.entrepreneurshipnetwork.net", 0, 785, { width: W, align: "center" });
            doc.fillColor("#aaaaaa").font("Times-Roman").fontSize(7)
                .text("This is a digitally generated offer letter. For verification contact hr@entrepreneurshipnetwork.net", 0, 797, { width: W, align: "center" });

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error",  reject);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Logs an offer-letter send into the Document Send History.
 */
function logOfferLetterSend(entry = {}, method = "manual") {
    return DocumentHistory.logSend({ ...entry, documentType: "Offer Letter", documentKey: "offer_letter" }, method);
}

module.exports = { generateOfferLetterPDF, logOfferLetterSend };
