const DocumentHistory = require("../../models/DocumentHistory");
// NEW FEATURE: Certificate PDF Generation Service
// Generates HTML/CSS certificate templates and renders to PDF using PDFKit
// Template styles: Expert (ivory/gold), Nano Degree (navy), Fellowship (forest green)
"use strict";
const DocumentHistory = require('../../models/DocumentHistory'); 
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const crypto      = require("crypto");

/**
 * Generate a unique certificate ID
 * @param {string} type - 'expert' | 'nano_degree' | 'fellowship'
 * @returns {string}
 */
function generateCertificateId(type) {
    const year  = new Date().getFullYear();
    const code  = type === "expert" ? "EXP" : type === "nano_degree" ? "ND" : "FEL";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let   uid   = "";
    for (let i = 0; i < 6; i++) uid += chars[Math.floor(Math.random() * chars.length)];
    return `TEN-${year}-${code}-${uid}`;
}

/**
 * Generate Expert Certificate PDF (A4 landscape, ivory/gold)
 */
async function generateExpertCertificate(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc    = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W = 841.89, H = 595.28;
            const gold  = "#C9A84C";
            const ivory = "#FDFAF4";
            const dark  = "#2C1810";

            // Background
            doc.rect(0, 0, W, H).fill(ivory);

            // Outer gold border
            doc.rect(18, 18, W - 36, H - 36).lineWidth(1.5).strokeColor(gold).stroke();
            doc.rect(24, 24, W - 48, H - 48).lineWidth(0.5).strokeColor(gold).stroke();

            // Corner ornaments
            const corners = [[28, 28], [W - 28, 28], [28, H - 28], [W - 28, H - 28]];
            corners.forEach(([cx, cy]) => {
                doc.circle(cx, cy, 6).lineWidth(1).strokeColor(gold).stroke();
                doc.circle(cx, cy, 3).fill(gold);
            });

            // Diagonal watermark
            doc.save();
            doc.opacity(0.03);
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(60)
                .text("THE ENTREPRENEURSHIP NETWORK", 50, H / 2 - 40, { width: W - 100, align: "center", rotate: -15 });
            doc.restore();

            // Header
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(11)
                .text("THE ENTREPRENEURSHIP NETWORK", 0, 52, { width: W, align: "center", characterSpacing: 3 });
            doc.fillColor(dark).font("Helvetica").fontSize(8)
                .text("Shaping Tomorrow's Entrepreneurs", 0, 68, { width: W, align: "center" });

            // Title
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(9)
                .text("CERTIFICATE OF COMPLETION", 0, 95, { width: W, align: "center", characterSpacing: 4 });

            doc.moveTo(200, 112).lineTo(W - 200, 112).lineWidth(1).strokeColor(gold).stroke();

            // "This certifies that"
            doc.fillColor("#8B7355").font("Helvetica-Oblique").fontSize(13)
                .text("This certifies that", 0, 122, { width: W, align: "center" });

            // Student name
            doc.fillColor(dark).font("Helvetica-Bold").fontSize(38)
                .text(data.studentName || "Student Name", 0, 145, { width: W, align: "center" });

            // Has completed
            doc.fillColor("#555").font("Helvetica").fontSize(12)
                .text(`has successfully completed the ${data.domain || "Technology"} Internship Program`, 0, 196, { width: W, align: "center" });

            // Duration + date
            doc.fillColor("#777").font("Helvetica").fontSize(10)
                .text(`Duration: ${data.durationText || data.tenure || "N/A"}  ·  Period: ${data.startDate || ""} – ${data.endDate || ""}  ·  Issued: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
                    0, 220, { width: W, align: "center" });

            // Gold divider
            doc.moveTo(100, 244).lineTo(W - 100, 244).lineWidth(1).strokeColor(gold).stroke();

            // Bottom row: signature | seal | cert ID + QR placeholder
            const sigX = 100;
            doc.moveTo(sigX, 280).lineTo(sigX + 160, 280).lineWidth(0.8).strokeColor("#333").stroke();
            doc.fillColor(dark).font("Helvetica-Bold").fontSize(9).text("Kamlesh Gupta", sigX, 284);
            doc.fillColor("#777").font("Helvetica").fontSize(8).text("Director, TEN", sigX, 296);

            // Seal (circle)
            const sealX = W / 2, sealY = 280;
            doc.circle(sealX, sealY, 36).lineWidth(2).strokeColor(gold).stroke();
            doc.circle(sealX, sealY, 30).lineWidth(0.5).strokeColor(gold).stroke();
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(8)
                .text("TEN", sealX - 10, sealY - 6);
            doc.fillColor(dark).font("Helvetica").fontSize(6)
                .text("CERTIFIED", sealX - 14, sealY + 4);

            // Certificate ID
            const certId = data.certificateId || generateCertificateId("expert");
            doc.fillColor("#999").font("Helvetica").fontSize(7)
                .text(`Certificate ID: ${certId}`, W - 300, 275);
            doc.fillColor("#777").font("Helvetica").fontSize(7)
                .text(`Verify at: entrepreneurshipnetwork.net/cert-verify?id=${certId}`, W - 300, 288);

            doc.end();
            stream.on("finish", () => resolve({ path: outputPath, certificateId: certId }));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate Nano Degree Certificate PDF (A4 landscape, navy)
 */
async function generateNanoCertificate(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc    = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W = 841.89, H = 595.28;
            const gold = "#FFD700";
            const navy = "#0A1628";
            const white = "#FFFFFF";

            // Background
            doc.rect(0, 0, W, H).fill(navy);

            // Double border
            doc.rect(12, 12, W - 24, H - 24).lineWidth(1).strokeColor(white).stroke();
            doc.rect(20, 20, W - 40, H - 40).lineWidth(1).strokeColor(gold).stroke();

            // Top ribbon band
            doc.rect(0, 0, W, 80).fill("#061020");
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(12)
                .text("THE ENTREPRENEURSHIP NETWORK", 0, 30, { width: W, align: "center", characterSpacing: 5 });
            doc.fillColor(white).font("Helvetica").fontSize(8)
                .text("Shaping Tomorrow's Entrepreneurs", 0, 52, { width: W, align: "center" });

            // Left shimmer strip
            const shimmerGrad = doc.linearGradient(0, 0, 30, H);
            shimmerGrad.stop(0, "#B8860B").stop(0.5, "#FFD700").stop(1, "#DAA520");
            doc.rect(0, 80, 8, H - 80).fill(shimmerGrad);

            // Title
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(10)
                .text("NANO DEGREE CERTIFICATE", 0, 100, { width: W, align: "center", characterSpacing: 6 });

            // Seals (two)
            [W / 2 - 220, W / 2 + 220].forEach(sx => {
                doc.circle(sx, 100, 16).lineWidth(1.5).strokeColor(gold).stroke();
                doc.fillColor(gold).font("Helvetica-Bold").fontSize(6).text("TEN", sx - 8, 96);
            });

            doc.moveTo(150, 120).lineTo(W - 150, 120).lineWidth(0.8).strokeColor(gold).stroke();

            // "This certifies that"
            doc.fillColor("#AAA").font("Helvetica-Oblique").fontSize(13)
                .text("This certifies that", 0, 132, { width: W, align: "center" });

            // Student name — gold gradient effect
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(44)
                .text(data.studentName || "Student Name", 0, 155, { width: W, align: "center" });

            doc.fillColor(white).font("Helvetica").fontSize(13)
                .text(`has been awarded the Nano Degree in ${data.domain || "Technology"}`, 0, 210, { width: W, align: "center" });

            doc.fillColor("#888").font("Helvetica").fontSize(10)
                .text(`Duration: ${data.durationText || "N/A"}  ·  Issued: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
                    0, 234, { width: W, align: "center" });

            doc.moveTo(150, 256).lineTo(W - 150, 256).lineWidth(0.8).strokeColor(gold).stroke();

            // Signature
            doc.moveTo(120, 310).lineTo(280, 310).lineWidth(0.5).strokeColor("#666").stroke();
            doc.fillColor(white).font("Helvetica-Bold").fontSize(9).text("Kamlesh Gupta", 120, 316);
            doc.fillColor("#888").font("Helvetica").fontSize(8).text("Director, TEN", 120, 328);

            // LinkedIn note
            const certId = data.certificateId || generateCertificateId("nano_degree");
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(8)
                .text("Add to LinkedIn →", W - 280, 305);
            doc.fillColor("#666").font("Helvetica").fontSize(7)
                .text(`linkedin.com/in/ — Add this certificate using ID: ${certId}`, W - 280, 318);

            // Cert ID
            doc.fillColor("#444").font("Helvetica").fontSize(7)
                .text(`Certificate ID: ${certId}`, W - 280, 340);
            doc.fillColor("#444").font("Helvetica").fontSize(7)
                .text(`Verify: entrepreneurshipnetwork.net/cert-verify?id=${certId}`, W - 280, 352);

            // Central QR placeholder
            doc.rect(W / 2 - 20, 296, 40, 40).lineWidth(0.5).strokeColor(gold).stroke();
            doc.fillColor("#555").font("Helvetica").fontSize(5)
                .text("QR", W / 2 - 6, 314);

            doc.end();
            stream.on("finish", () => resolve({ path: outputPath, certificateId: certId }));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Generate Fellowship Certificate PDF (A4 landscape, forest green)
 */
async function generateFellowshipCertificate(data, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc    = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const W = 841.89, H = 595.28;
            const gold   = "#FFD700";
            const green  = "#0D2818";
            const white  = "#FFFFFF";

            // Background
            doc.rect(0, 0, W, H).fill(green);

            // Constellation-style border decoration
            doc.rect(15, 15, W - 30, H - 30).lineWidth(1).strokeColor(gold).opacity(0.3).stroke();
            doc.opacity(1);
            doc.rect(22, 22, W - 44, H - 44).lineWidth(0.5).strokeColor(gold).opacity(0.2).stroke();
            doc.opacity(1);

            // "FELLOW" masthead
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(72)
                .text("FELLOW", 0, 30, { width: W, align: "center", characterSpacing: 28 });
            doc.fillColor(white).font("Helvetica").fontSize(10)
                .text("of The Entrepreneurship Network", 0, 115, { width: W, align: "center", characterSpacing: 2 });

            doc.moveTo(100, 136).lineTo(W - 100, 136).lineWidth(0.8).strokeColor(gold).stroke();

            // Citation
            const citation = `This certifies that ${data.studentName || "the student"} has demonstrated exceptional dedication and commitment throughout their ${data.durationText || data.tenure || "internship"} journey at TEN. This Fellowship is awarded in recognition of achievement in the top 3% of their cohort in ${data.domain || "their domain"}.`;
            doc.fillColor("#AAA").font("Helvetica-Oblique").fontSize(10)
                .text(citation, 80, 150, { width: W - 160, align: "center", lineGap: 3 });

            // Student name (largest element)
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(52)
                .text(data.studentName || "Student Name", 0, 220, { width: W, align: "center" });

            doc.fillColor(white).font("Helvetica").fontSize(11)
                .text(`Domain: ${data.domain || "Technology"}  ·  Duration: ${data.durationText || "N/A"}  ·  Issued: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
                    0, 285, { width: W, align: "center" });

            doc.moveTo(100, 305).lineTo(W - 100, 305).lineWidth(0.8).strokeColor(gold).stroke();

            // Wax seal (CSS-style) — circle with label
            const waxX = W / 2;
            doc.circle(waxX, 350, 32).fill("#8B0000");
            doc.circle(waxX, 350, 32).lineWidth(2).strokeColor(gold).stroke();
            doc.circle(waxX, 350, 24).lineWidth(0.5).strokeColor(gold).stroke();
            doc.fillColor(gold).font("Helvetica-Bold").fontSize(7)
                .text("TEN", waxX - 8, 346);

            // Three signature lines
            const sigs = [
                { x: 80,      label: "Director" },
                { x: W / 2 - 80, label: "Program Head" },
                { x: W - 260, label: "Domain Expert" }
            ];
            sigs.forEach(({ x, label }) => {
                doc.moveTo(x, 420).lineTo(x + 160, 420).lineWidth(0.6).strokeColor("#555").stroke();
                doc.fillColor(white).font("Helvetica-Bold").fontSize(8).text(label, x, 426);
                doc.fillColor("#666").font("Helvetica").fontSize(7).text("The Entrepreneurship Network", x, 438);
            });

            const certId = data.certificateId || generateCertificateId("fellowship");
            doc.fillColor("#444").font("Helvetica").fontSize(7)
                .text(`Certificate ID: ${certId}  ·  Verify: entrepreneurshipnetwork.net/cert-verify?id=${certId}`, 0, H - 30, { width: W, align: "center" });

            doc.end();
            stream.on("finish", () => resolve({ path: outputPath, certificateId: certId }));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificateId,
    generateExpertCertificate,
    generateNanoCertificate,
    generateFellowshipCertificate
};
