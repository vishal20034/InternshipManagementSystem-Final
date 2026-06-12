// NEW FEATURE: Offer Letter PDF Generation Service
"use strict";

const DocumentHistory = require("../../models/DocumentHistory");
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");
const { COLORS, A4_WIDTH, renderHeader, renderTitle, renderRefDate, renderSignatureBlock, renderFooter } = require("./pdfHelpers");

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

            const W = A4_WIDTH;
            const { gold, cream, textDark } = COLORS;

            renderHeader(doc);
            renderTitle(doc, "INTERNSHIP OFFER LETTER");
            renderRefDate(doc, data, "TEN/OL/");

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
            renderSignatureBlock(doc, { y: 720 });

            // ── Footer ──
            renderFooter(doc, "offer letter");

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
 * Delegates to the shared DocumentHistory.logSend helper.
 * @param {Object} entry - student / document info
 * @param {string} [method] - 'manual' | 'automation'
 * @returns {Promise<Object|null>} the created DocumentHistory record or null on failure
 */
function logOfferLetterSend(entry = {}, method = "manual") {
    return DocumentHistory.logSend({ ...entry, documentType: "Offer Letter", documentKey: "offer_letter" }, method);
}

module.exports = { generateOfferLetterPDF, logOfferLetterSend };
