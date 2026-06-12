import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DocumentHistory from "@/models/DocumentHistory";
import Student from "@/models/Student";

function normalizeDocumentNumber(value: string) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const docId = normalizeDocumentNumber(decodeURIComponent(id));
    if (!docId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    let record = await DocumentHistory.findOne({ documentNumber: docId }).lean();
    if (!record) {
      record = await DocumentHistory.findOne({
        documentNumber: { $regex: "^" + docId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", $options: "i" }
      }).lean();
    }

    if (record) {
      const student = record.studentId
        ? await Student.findById(record.studentId).select("firstName lastName name employeeId domain collegeName college").lean()
        : null;
        
      const studentName = (record.studentName || student?.name || `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "").trim();
      const employeeId = record.employeeId || student?.employeeId || "";
      const domain = record.domain || student?.domain || "";
      const college = record.college || student?.collegeName || student?.college || "";
      const issuedDate = record.sentAt || record.createdAt || null;

      return NextResponse.json({
        verified: true,
        document_number: record.documentNumber,
        student_name: studentName,
        employee_id: employeeId,
        document_type: record.documentType || record.documentKey || "",
        domain: domain || "N/A",
        college: college || "N/A",
        issued_date: issuedDate,
        issued_by: "The Entrepreneurship Network (TEN)",
        document: {
          documentId: record.documentNumber,
          docType: record.documentKey || "document",
          employeeId,
          domain,
          generatedAt: issuedDate,
          generatedBy: record.sentBy || "TEN"
        },
        student: {
          firstName: student?.firstName || "",
          lastName: student?.lastName || "",
          employeeId,
          domain,
          college
        }
      });
    }

    // Fallback search in Student collection
    const student = await Student.findOne({ autoDocUniqueId: docId })
      .select("firstName lastName employeeId domain collegeName college email documentsAutoSentAt autoDocUniqueId")
      .lean();
      
    if (!student) {
      return NextResponse.json({ error: "Document not found", docId }, { status: 404 });
    }

    return NextResponse.json({
      verified: true,
      exactMatch: student.autoDocUniqueId === docId,
      document_number: docId,
      student_name: (student.firstName || "") + " " + (student.lastName || ""),
      employee_id: student.employeeId || "",
      document_type: "Internship Documents",
      domain: student.domain || "N/A",
      college: student.collegeName || student.college || "N/A",
      issued_date: student.documentsAutoSentAt || null,
      issued_by: "The Entrepreneurship Network (TEN)",
      document: {
        documentId: docId,
        docType: "internship_documents",
        employeeId: student.employeeId || "",
        domain: student.domain || "",
        generatedAt: student.documentsAutoSentAt || null,
        generatedBy: "System (Auto-generated)"
      },
      student: {
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        employeeId: student.employeeId || "",
        domain: student.domain || "",
        college: student.collegeName || student.college || ""
      }
    });
  } catch (err: any) {
    console.error("[VERIFY API V2] Error:", err.message);
    return NextResponse.json({ error: "Server error during verification" }, { status: 500 });
  }
}