import { supabase } from "./supabase-client";

type Row = Record<string, any>;

async function requireAdmin() {
  if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sesi Admin tidak valid.");
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (error || profile?.role !== "admin") throw new Error("Operasi ini hanya tersedia untuk Admin.");
  return auth.user.id;
}

function mapInvoice(row: Row) {
  const items = (row.invoice_items ?? []).map((item: Row) => ({
    sessionId: item.meeting_id == null ? item.id : String(item.meeting_id),
    sessionNumber: item.session_number ?? 0,
    sessionDate: item.session_date ?? "",
    amount: Number(item.amount ?? 0),
    description: item.description ?? "",
  }));
  return {
    id: row.id,
    studentId: row.student_id,
    period: row.month_year,
    status: row.status === "paid" ? "paid" : row.status === "draft" ? "draft" : "unpaid",
    currency: row.currency ?? "IDR",
    rateSnapshot: Number(row.price_per_meeting ?? 0),
    items,
    totalSessions: Number(row.attended_meetings ?? items.length),
    subtotalAmount: items.length
      ? items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
      : Number(row.attended_meetings ?? 0) * Number(row.price_per_meeting ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    additionalCharges: Number(row.additional_charges ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    adjustmentNote: row.adjustment_note ?? "",
    createdAt: row.created_at,
    createdBy: row.created_by ?? "",
    updatedAt: row.updated_at ?? row.created_at,
    updatedBy: row.updated_by ?? "",
    issuedAt: row.issued_at ?? null,
    issuedBy: row.issued_by ?? null,
    paidAt: row.paid_at ?? null,
    payments: row.invoice_payments ?? [],
  };
}

async function fetchInvoices(studentId?: string, issuedOnly = false) {
  if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
  let query = supabase
    .from("invoices")
    .select("*,invoice_items(id,meeting_id,session_number,session_date,description,amount),invoice_payments(id,amount,paid_at,payment_method,reference,notes)")
    .order("created_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  if (issuedOnly) query = query.in("status", ["sent", "paid"]);
  const { data, error } = await query;
  if (error) throw new Error("Data tagihan gagal dimuat dari Supabase.");
  return (data ?? []).map((row) => mapInvoice(row as Row));
}

export const supabaseAdminBillingRepository = {
  async getInvoices() {
    await requireAdmin();
    return fetchInvoices();
  },

  async getStudentInvoices(studentId: string) {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth.user || auth.user.id !== studentId) throw new Error("Akses tagihan siswa ditolak.");
    return fetchInvoices(studentId, true);
  },

  async getStudentInvoiceHistory(studentId: string) {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth.user || auth.user.id !== studentId) throw new Error("Akses riwayat tagihan siswa ditolak.");
    return fetchInvoices(studentId, true);
  },

  async getRate(studentId: string) {
    await requireAdmin();
    if (!supabase) return null;
    const { data, error } = await supabase.from("student_tariffs").select("amount_per_session").eq("student_id", studentId).maybeSingle();
    if (error) throw new Error("Tarif siswa gagal dimuat.");
    return data ? Number(data.amount_per_session) : null;
  },

  async setRate(studentId: string, amountPerSession: number) {
    try {
      const actorId = await requireAdmin();
      if (!Number.isSafeInteger(amountPerSession) || amountPerSession < 0) {
        return { error: "VALIDATION_ERROR", message: "Tarif harus berupa bilangan bulat non-negatif." };
      }
      const { error } = await supabase!
        .from("student_tariffs")
        .upsert({ student_id: studentId, amount_per_session: amountPerSession, currency: "IDR", updated_by: actorId });
      if (error) return { error: error.code || "SAVE_FAILED", message: "Tarif gagal disimpan. Pastikan siswa terdaftar." };
      return { success: true };
    } catch (error) {
      return { error: "FORBIDDEN", message: error instanceof Error ? error.message : "Tarif gagal disimpan." };
    }
  },

  async createInvoice(studentId: string, period: string) {
    try {
      await requireAdmin();
      const { data, error } = await supabase!.rpc("create_draft_invoice", { p_student_id: studentId, p_period: period });
      if (error || !data) return { success: false, message: error?.message ?? "Draft tagihan gagal dibuat." };
      const invoices = await fetchInvoices(studentId);
      return { success: true, invoice: invoices.find((invoice) => invoice.id === (data as Row).id) ?? mapInvoice(data as Row) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Draft tagihan gagal dibuat." };
    }
  },

  async updateDraftInvoice(invoiceId: string, changes: Row) {
    try {
      await requireAdmin();
      const ids = Array.isArray(changes.sessionIds)
        ? changes.sessionIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isSafeInteger(id) && id > 0)
        : null;
      const { data, error } = await supabase!.rpc("update_draft_invoice", {
        p_invoice_id: invoiceId,
        p_discount_amount: Number(changes.discountAmount ?? 0),
        p_additional_charges: Number(changes.additionalCharges ?? 0),
        p_adjustment_note: String(changes.adjustmentNote ?? ""),
        p_meeting_ids: ids,
        p_manual_total: changes.totalAmount == null ? null : Number(changes.totalAmount),
      });
      if (error || !data) return { success: false, message: error?.message ?? "Draft tagihan gagal diperbarui." };
      const invoices = await fetchInvoices((data as Row).student_id);
      return { success: true, invoice: invoices.find((invoice) => invoice.id === invoiceId) ?? mapInvoice(data as Row) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Draft tagihan gagal diperbarui." };
    }
  },

  async issueInvoice(invoiceId: string) {
    try {
      await requireAdmin();
      const { data, error } = await supabase!.rpc("issue_draft_invoice", { p_invoice_id: invoiceId });
      if (error || !data) return { success: false, message: error?.message ?? "Tagihan gagal diterbitkan." };
      return { success: true, invoice: mapInvoice(data as Row) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Tagihan gagal diterbitkan." };
    }
  },

  async markPaid(invoiceId: string) {
    try {
      await requireAdmin();
      const { data, error } = await supabase!.rpc("mark_invoice_paid", {
        p_invoice_id: invoiceId,
        p_payment_method: "manual",
        p_reference: null,
        p_notes: "",
      });
      if (error || !data) return { success: false, message: error?.message ?? "Pembayaran gagal dicatat." };
      return { success: true, invoice: mapInvoice(data as Row) };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Pembayaran gagal dicatat." };
    }
  },

  subscribe() {
    return () => undefined;
  },
};
