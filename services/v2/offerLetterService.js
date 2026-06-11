const DocumentHistory = require("../../models/DocumentHistory");
// NEW FEATURE: Offer Letter PDF Generation Service
"use strict";

const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");

/**
 * Generates an offer letter PDF for a student.
 * @param {Object} data - Student data for the offer letter
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<string>} resolves with outputPath on success
 */
async function generateOfferLetterPDF(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc  = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Internship Offer Letter — TEN" } });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W = 595.28; // A4 width in pts
            const gold   = "#C9A84C";
            const navy   = "#0A1628";
            const white  = "#FFFFFF";
            const cream  = "#F8F5ED";
            const textDark = "#1A1A2E";

            // ── Header band ──
            doc.rect(0, 0, W, 90).fill(navy);
            doc.rect(0, 90, W, 4).fill(gold);

            // Org name
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(18)
                .text("THE ENTREPRENEURSHIP NETWORK", 50, 28, { width: W - 100, align: "center" });
            doc.fillColor(white).font("Helvetica").fontSize(10)
                .text("TEN — Shaping Tomorrow's Entrepreneurs", 50, 52, { width: W - 100, align: "center" });
            doc.fillColor(gold).font("Helvetica").fontSize(9)
                .text("hr@entrepreneurshipnetwork.net  |  www.entrepreneurshipnetwork.net", 50, 70, { width: W - 100, align: "center" });

            // ── Title ──
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(15)
                .text("INTERNSHIP OFFER LETTER", 50, 110, { width: W - 100, align: "center" });
            doc.moveTo(100, 132).lineTo(W - 100, 132).lineWidth(0.8).strokeColor(gold).stroke();

            // ── Reference & Date ──
            const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
            doc.fillColor("#555").font("Helvetica").fontSize(9)
                .text(`Date: ${data.dateIssued || today}`, 50, 142);
            doc.text(`Ref: ${data.documentNumber || "TEN/OL/" + Date.now().toString().slice(-6)}`, 50, 156);

            // ── Addressee box ──
            doc.rect(50, 174, W - 100, 70).fillAndStroke(cream, gold);
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(11)
                .text(`To,`, 66, 184);
            doc.font("Helvetica").fontSize(11)
                .text(`${data.studentName || "Student Name"}`, 66, 198)
                .text(`${data.collegeName || "College Name"}`, 66, 213)
                .text(`Employee ID: ${data.employeeId || "N/A"}`, 66, 228);

            // ── Subject ──
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(10)
                .text("Subject: Internship Offer — Virtual Internship Program", 50, 258);
            doc.moveTo(50, 272).lineTo(W - 50, 272).lineWidth(0.5).strokeColor("#ccc").stroke();

            // ── Salutation & body ──
            const name   = data.studentName  || "Candidate";
            const domain = data.domain       || data.role || "the assigned domain";
            const dur    = data.durationText || data.tenure || "the internship period";
            const start  = data.startDate    || "the joining date";
            const end    = data.endDate      || "the completion date";

            const bodyOpts = { width: W - 100, align: "justify", lineGap: 4 };
            doc.fillColor(textDark).font("Helvetica").fontSize(10.5).text(
                `Dear ${name},`, 50, 282
            );
            doc.moveDown(0.5);
            doc.text(
                `We are pleased to offer you an internship position at The Entrepreneurship Network (TEN) as a ${domain} Intern. After reviewing your application and qualifications, we believe you will be a valuable addition to our program.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `This offer is for a virtual internship engagement for a duration of ${dur}, commencing from ${start} to ${end}. During this period, you will be working under the mentorship of our domain experts and coordinators.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `As part of your internship, you will be required to complete assigned tasks, maintain regular attendance via our online portal, participate in assessments, and uphold the standards of conduct set forth by TEN.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `This internship is a fantastic opportunity to gain real-world exposure, develop professional skills, and build your career network. We look forward to your active participation and contributions.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text(
                `Please report to the TEN Student Portal (https://virtualinternships.entrepreneurshipnetwork.net) on the first day. Your Employee ID is ${data.employeeId || "as shared separately"}.`,
                50, doc.y, bodyOpts
            );
            doc.moveDown(0.6);
            doc.text("We wish you a rewarding and enriching internship experience.", 50, doc.y, bodyOpts);

            // ── Terms box ──
            const termsY = doc.y + 14;
            if (termsY < 650) {
                doc.rect(50, termsY, W - 100, 54).fillAndStroke("rgba(201,168,76,0.05)", gold);
                doc.fillColor(gold).font("Helvetica-Bold").fontSize(8.5).text("TERMS & CONDITIONS", 62, termsY + 8);
                doc.fillColor(textDark).font("Helvetica").fontSize(8).text(
                    "1. This offer is contingent upon maintaining satisfactory attendance and task completion.\n2. Internship may be terminated in case of misconduct or non-compliance with TEN policies.\n3. Certificates will be issued upon successful completion of the internship program.",
                    62, termsY + 20, { width: W - 124, lineGap: 3 }
                );
            }

            // ── Signature area ──
            const sigY = 720;
            doc.moveTo(50, sigY).lineTo(200, sigY).lineWidth(0.8).strokeColor("#333").stroke();
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9.5).text("Kamlesh Gupta", 50, sigY + 5);
            doc.font("Helvetica").fontSize(8.5).fillColor("#555")
                .text("Director", 50, sigY + 18)
                .text("The Entrepreneurship Network", 50, sigY + 30);

            doc.moveTo(W - 200, sigY).lineTo(W - 50, sigY).lineWidth(0.8).strokeColor("#333").stroke();
            doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9.5).text("HR Department", W - 200, sigY + 5);
            doc.font("Helvetica").fontSize(8.5).fillColor("#555")
                .text("Human Resources", W - 200, sigY + 18)
                .text("The Entrepreneurship Network", W - 200, sigY + 30);

            // ── Footer ──
            doc.rect(0, 800, W, 42).fill(navy);
            doc.fillColor(gold).font("Helvetica").fontSize(8)
                .text("The Entrepreneurship Network  ·  hr@entrepreneurshipnetwork.net  ·  www.entrepreneurshipnetwork.net", 0, 816, { width: W, align: "center" });
            doc.fillColor(white).font("Helvetica").fontSize(7)
                .text("This is a digitally generated offer letter. For verification contact hr@entrepreneurshipnetwork.net", 0, 828, { width: W, align: "center" });

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error",  reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateOfferLetterPDF };
