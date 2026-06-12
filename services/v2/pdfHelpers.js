"use strict";

/**
 * Shared PDFKit rendering helpers used by offerLetterService, locService,
 * lorService, and certificateService.
 *
 * Centralises the TEN header band, footer band, signature block, and common
 * colour palette so each document service only defines its own unique content.
 */

const COLORS = Object.freeze({
    gold:     "#C9A84C",
    navy:     "#0A1628",
    white:    "#FFFFFF",
    cream:    "#F8F5ED",
    textDark: "#1A1A2E",
});

const A4_WIDTH = 595.28;

/**
 * Render the standard TEN header band (navy bg + gold/white text).
 * @param {PDFDocument} doc
 * @param {object}      [opts]
 * @param {number}      [opts.width=595.28]
 */
function renderHeader(doc, { width = A4_WIDTH } = {}) {
    const W = width;
    doc.rect(0, 0, W, 90).fill(COLORS.navy);
    doc.rect(0, 90, W, 4).fill(COLORS.gold);

    doc.fillColor(COLORS.gold).font("Helvetica-Bold").fontSize(18)
        .text("THE ENTREPRENEURSHIP NETWORK", 50, 28, { width: W - 100, align: "center" });
    doc.fillColor(COLORS.white).font("Helvetica").fontSize(10)
        .text("TEN \u2014 Shaping Tomorrow's Entrepreneurs", 50, 52, { width: W - 100, align: "center" });
    doc.fillColor(COLORS.gold).font("Helvetica").fontSize(9)
        .text("hr@entrepreneurshipnetwork.net  |  www.entrepreneurshipnetwork.net", 50, 70, { width: W - 100, align: "center" });
}

/**
 * Render the document title + gold divider at y=110.
 * @param {PDFDocument} doc
 * @param {string}      title
 * @param {object}      [opts]
 * @param {number}      [opts.width=595.28]
 */
function renderTitle(doc, title, { width = A4_WIDTH } = {}) {
    const W = width;
    doc.fillColor(COLORS.textDark).font("Helvetica-Bold").fontSize(15)
        .text(title, 50, 110, { width: W - 100, align: "center" });
    doc.moveTo(100, 132).lineTo(W - 100, 132).lineWidth(0.8).strokeColor(COLORS.gold).stroke();
}

/**
 * Render reference number + date lines (y=142).
 * @param {PDFDocument} doc
 * @param {object}      data
 * @param {string}      data.dateIssued
 * @param {string}      data.documentNumber
 * @param {string}      refPrefix - e.g. "TEN/OL/"
 */
function renderRefDate(doc, data, refPrefix) {
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    doc.fillColor("#555").font("Helvetica").fontSize(9)
        .text(`Date: ${data.dateIssued || today}`, 50, 142);
    doc.text(`Ref: ${data.documentNumber || refPrefix + Date.now().toString().slice(-6)}`, 50, 156);
}

/**
 * Render the dual-column signature area (Director + HR Department).
 * @param {PDFDocument} doc
 * @param {object}      [opts]
 * @param {number}      [opts.y=710]
 * @param {number}      [opts.width=595.28]
 * @param {string}      [opts.directorName="Kamlesh Gupta"]
 */
function renderSignatureBlock(doc, { y = 710, width = A4_WIDTH, directorName = "Kamlesh Gupta" } = {}) {
    const W = width;
    doc.moveTo(50, y).lineTo(220, y).lineWidth(0.8).strokeColor("#333").stroke();
    doc.fillColor(COLORS.textDark).font("Helvetica-Bold").fontSize(9.5).text(directorName, 50, y + 5);
    doc.font("Helvetica").fontSize(8.5).fillColor("#555")
        .text("Director", 50, y + 18)
        .text("The Entrepreneurship Network", 50, y + 30);

    doc.moveTo(W - 220, y).lineTo(W - 50, y).lineWidth(0.8).strokeColor("#333").stroke();
    doc.fillColor(COLORS.textDark).font("Helvetica-Bold").fontSize(9.5).text("HR Department", W - 220, y + 5);
    doc.font("Helvetica").fontSize(8.5).fillColor("#555")
        .text("Human Resources", W - 220, y + 18)
        .text("The Entrepreneurship Network", W - 220, y + 30);
}

/**
 * Render the navy footer band (y=800).
 * @param {PDFDocument} doc
 * @param {string}      docTypeName - e.g. "offer letter", "Letter of Completion"
 * @param {object}      [opts]
 * @param {number}      [opts.width=595.28]
 */
function renderFooter(doc, docTypeName, { width = A4_WIDTH } = {}) {
    const W = width;
    doc.rect(0, 800, W, 42).fill(COLORS.navy);
    doc.fillColor(COLORS.gold).font("Helvetica").fontSize(8)
        .text("The Entrepreneurship Network  \u00B7  hr@entrepreneurshipnetwork.net  \u00B7  www.entrepreneurshipnetwork.net", 0, 816, { width: W, align: "center" });
    doc.fillColor(COLORS.white).font("Helvetica").fontSize(7)
        .text(`This is a digitally generated ${docTypeName}. For verification contact hr@entrepreneurshipnetwork.net`, 0, 828, { width: W, align: "center" });
}

/**
 * Return a today-formatted string using en-IN locale.
 */
function todayFormatted() {
    return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

module.exports = {
    COLORS,
    A4_WIDTH,
    renderHeader,
    renderTitle,
    renderRefDate,
    renderSignatureBlock,
    renderFooter,
    todayFormatted,
};
