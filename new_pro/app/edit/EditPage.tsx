"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, UserRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StudentForm = {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  domain: string;
  employeeId: string;
  tenure: string;
};

const emptyForm: StudentForm = {
  firstName: "",
  lastName: "",
  email: "",
  whatsapp: "",
  domain: "",
  employeeId: "",
  tenure: "",
};

export default function EditPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check security session
    const loginTime = sessionStorage.getItem("dashboardLogin");
    if (!loginTime) {
      router.push('/dashboard');
      return;
    }
    const currentTime = new Date().getTime();
    if (currentTime - parseInt(loginTime) >= 10 * 60 * 1000) {
      router.push('/dashboard');
      return;
    }

    async function loadStudent() {
      if (!id) {
        setLoading(false);
        setMessage("Student id is missing from the URL.");
        return;
      }

      try {
        const response = await fetch(`/students/${id}`);
        if (!response.ok) throw new Error("Could not load this student.");
        const student = await response.json();
        setForm({
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          email: student.email || "",
          whatsapp: student.whatsapp || "",
          domain: student.domain || "",
          employeeId: student.employeeId || "",
          tenure: student.tenure || "",
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load this student.");
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [id, router]);

  const updateField = (key: keyof StudentForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateStudent = async () => {
    if (!id) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Student update failed.");
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Student update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF7EE] px-4 py-10 text-[#1E1A17]">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-[#E2D9CD] bg-[#CB5534]/10 text-[#CB5534]">
            <UserRound className="h-5 w-5" />
          </div>
          <CardTitle className="font-serif text-3xl">Edit Student</CardTitle>
          <p className="text-sm text-[#5C524C]">Update internship profile details and save them to the coordinator dashboard.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-[#CB5534]">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[#CB5534]" />
              <span>{message}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-[#5C524C]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#CB5534]/30 border-t-[#CB5534]" />
              Loading student profile...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="First Name" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
              <Input placeholder="Last Name" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
              <Input className="sm:col-span-2" type="email" placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              <Input placeholder="Whatsapp" value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} />
              <Input placeholder="Domain" value={form.domain} onChange={(e) => updateField("domain", e.target.value)} />
              <Input placeholder="Employee ID" value={form.employeeId} onChange={(e) => updateField("employeeId", e.target.value)} />
              <Input placeholder="Tenure" value={form.tenure} onChange={(e) => updateField("tenure", e.target.value)} />
            </div>
          )}

          <Button className="w-full" onClick={updateStudent} disabled={loading || saving || !id}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Update Student"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
