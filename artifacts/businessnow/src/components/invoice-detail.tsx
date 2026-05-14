import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useUpdateInvoice,
  useListInvoiceLineItems,
  useCreateInvoiceLineItem,
  useDeleteInvoiceLineItem,
  useAutofillInvoiceLineItems,
  getListInvoiceLineItemsQueryKey,
  getListInvoicesQueryKey,
  getGetFinanceSummaryQueryKey,
  useListAccounts,
  useListProjects
} from "@workspace/api-client-react";
import { authHeaders } from "@/lib/auth-headers";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Plus, Zap, CreditCard, Send, Printer } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01),
  unitRate: z.coerce.number().min(0),
  billable: z.boolean(),
});

type PreviewItem = {
  description: string;
  quantity: number;
  unitRate: number;
  amount: number;
  billable: boolean;
  timeEntryId?: number;
  userId?: number;
  role?: string | null;
  taxAmount?: number;
  order?: number;
};

type InvoicePayment = {
  id: number;
  amount: number;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
};

export function InvoiceDetail({ invoice, open, onOpenChange }: { invoice: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const [isAddLineItemOpen, setIsAddLineItemOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ paymentDate: "", paymentAmount: "", paymentReference: "" });

  // V1 — autofill review state
  const [isAutofillPreviewOpen, setIsAutofillPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isConfirmingAutofill, setIsConfirmingAutofill] = useState(false);

  // V5 — payment history state
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const refreshPayments = () => {
    if (!invoice?.id) return;
    fetch(`${BASE}/api/invoices/${invoice.id}/payments`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setPayments)
      .catch(() => setPayments([]));
  };

  useEffect(() => {
    if (invoice) {
      setPaymentForm({
        paymentDate: invoice.paymentDate ? String(invoice.paymentDate).slice(0, 10) : "",
        paymentAmount: invoice.paymentAmount != null ? String(invoice.paymentAmount) : "",
        paymentReference: invoice.paymentReference ?? "",
      });
    }
  }, [invoice?.id]);

  useEffect(() => {
    refreshPayments();
  }, [invoice?.id]);

  const invoiceId: string = invoice?.id ?? "";
  const { data: lineItems } = useListInvoiceLineItems(invoiceId, {
    query: { enabled: !!invoiceId, queryKey: getListInvoiceLineItemsQueryKey(invoiceId) }
  });

  const { data: accounts } = useListAccounts();
  const { data: projects } = useListProjects();

  const updateInvoice = useUpdateInvoice();
  const createLineItem = useCreateInvoiceLineItem();
  const deleteLineItem = useDeleteInvoiceLineItem();
  const autofillLineItems = useAutofillInvoiceLineItems();

  const addLineItemForm = useForm<z.infer<typeof lineItemSchema>>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: { description: "", quantity: 1, unitRate: 0, billable: true }
  });

  if (!invoice) return null;

  const handleStatusTransition = async (newStatus: any) => {
    try {
      await updateInvoice.mutateAsync({ id: invoice.id, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
      toast({ title: `Invoice moved to ${newStatus}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const onAddLineItem = async (values: z.infer<typeof lineItemSchema>) => {
    try {
      const amount = values.quantity * values.unitRate;
      await createLineItem.mutateAsync({ 
        id: invoice.id as string, 
        data: { ...values, amount } 
      });
      queryClient.invalidateQueries({ queryKey: getListInvoiceLineItemsQueryKey(invoice.id) });
      setIsAddLineItemOpen(false);
      addLineItemForm.reset();
      toast({ title: "Line item added" });
    } catch {
      toast({ title: "Error adding line item", variant: "destructive" });
    }
  };

  // V1 — fetch preview before inserting, let PM edit descriptions
  const handleAutofill = async () => {
    setIsFetchingPreview(true);
    try {
      const res = await fetch(`${BASE}/api/invoices/${invoice.id}/line-items/autofill-preview`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data: PreviewItem[] = await res.json();
      if (data.length === 0) {
        toast({ title: "No un-billed approved time entries found" });
        return;
      }
      setPreviewItems(data);
      setIsAutofillPreviewOpen(true);
    } catch {
      toast({ title: "Error loading autofill preview", variant: "destructive" });
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleConfirmAutofill = async () => {
    setIsConfirmingAutofill(true);
    try {
      for (const item of previewItems) {
        await createLineItem.mutateAsync({
          id: invoice.id as string,
          data: {
            description: item.description,
            quantity: item.quantity,
            unitRate: item.unitRate,
            amount: item.amount,
            billable: item.billable,
            taxAmount: item.taxAmount ?? 0,
            timeEntryId: item.timeEntryId,
            userId: item.userId,
            role: item.role,
          } as any,
        });
      }
      queryClient.invalidateQueries({ queryKey: getListInvoiceLineItemsQueryKey(invoice.id) });
      setIsAutofillPreviewOpen(false);
      setPreviewItems([]);
      toast({ title: `${previewItems.length} line item${previewItems.length !== 1 ? "s" : ""} added` });
    } catch {
      toast({ title: "Error inserting line items", variant: "destructive" });
    } finally {
      setIsConfirmingAutofill(false);
    }
  };

  // V5 — record a partial payment into invoice_payments table
  const handleRecordPayment = async () => {
    if (!paymentForm.paymentDate) return;
    setIsRecordingPayment(true);
    try {
      const amount = paymentForm.paymentAmount ? Number(paymentForm.paymentAmount) : Number(invoice.total ?? 0);
      const res = await fetch(`${BASE}/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          amount,
          paymentDate: paymentForm.paymentDate,
          reference: paymentForm.paymentReference || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newPayment: InvoicePayment = await res.json();
      setPayments(prev => [...prev, newPayment]);
      toast({ title: "Payment recorded" });
      setIsPaymentOpen(false);
      setPaymentForm({ paymentDate: "", paymentAmount: "", paymentReference: "" });
      // If fully paid, auto-transition to Paid status
      const totalPaidAfter = payments.reduce((s, p) => s + Number(p.amount), 0) + amount;
      if (totalPaidAfter >= Number(invoice.total ?? 0) && invoice.status !== "Paid") {
        await updateInvoice.mutateAsync({ id: invoice.id, data: { status: "Paid" } as any });
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      }
    } catch {
      toast({ title: "Failed to record payment", variant: "destructive" });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const account = accounts?.find(a => a.id === invoice.accountId);
  const project = projects?.find(p => p.id === invoice.projectId);

  const subtotal = lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const tax = invoice.tax || 0;
  const total = subtotal + tax;
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balanceDue = total - totalPaid;

  const canEdit = invoice.status === "Draft" || invoice.status === "In Review";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">Invoice #{invoice.id}</SheetTitle>
              <SheetDescription>{invoice.description}</SheetDescription>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
        </SheetHeader>

        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Account</p>
              <p className="font-medium">{account?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Project</p>
              <p className="font-medium">{project?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Issue Date</p>
              <p className="font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {invoice.status === "Draft" && (
              <Button onClick={() => handleStatusTransition("In Review")}>Submit for Review</Button>
            )}
            {invoice.status === "In Review" && (
              <Button onClick={() => handleStatusTransition("Approved")}>Approve</Button>
            )}
            {invoice.status === "Approved" && (
              <>
                <Button onClick={() => handleStatusTransition("Sent")} className="gap-1.5">
                  <Send className="h-4 w-4" /> Send Invoice
                </Button>
                <Button variant="outline" onClick={() => handleStatusTransition("Paid")} className="text-green-700 border-green-300 hover:bg-green-50">Mark as Paid</Button>
              </>
            )}
            {(invoice.status === "Sent" || invoice.status === "Approved" || invoice.status === "Paid" || invoice.status === "Overdue") && (
              <Button variant="outline" onClick={() => setIsPaymentOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" /> Record Payment
              </Button>
            )}
            {(invoice.status === "Sent" || invoice.status === "Paid" || invoice.status === "Approved" || invoice.status === "Overdue") && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAutofill} disabled={!canEdit || isFetchingPreview || autofillLineItems.isPending}>
                  <Zap className="h-4 w-4 mr-2" /> {isFetchingPreview ? "Loading…" : "Auto-fill from Time"}
                </Button>
                <Button size="sm" onClick={() => setIsAddLineItemOpen(true)} disabled={!canEdit}>
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Billable</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unitRate}</TableCell>
                      <TableCell className="text-right font-medium">${item.amount}</TableCell>
                      <TableCell className="text-center">{item.billable ? 'Yes' : 'No'}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await deleteLineItem.mutateAsync({ id: invoice.id as string, lineItemId: item.id });
                            queryClient.invalidateQueries({ queryKey: getListInvoiceLineItemsQueryKey(invoice.id) });
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!lineItems || lineItems.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">No line items.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end pt-4">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Paid</span>
                      <span>-${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-1 border-t">
                      <span>Balance Due</span>
                      <span className={balanceDue <= 0 ? "text-green-700" : "text-destructive"}>
                        ${Math.max(0, balanceDue).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* V5 — Payment History */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Payment History</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                        <TableCell className="text-right font-medium text-sm text-green-700">
                          ${Number(p.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* V1 — Autofill Preview Dialog */}
        <Dialog open={isAutofillPreviewOpen} onOpenChange={setIsAutofillPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Auto-fill Items</DialogTitle>
              <DialogDescription>
                Edit descriptions before inserting. {previewItems.length} item{previewItems.length !== 1 ? "s" : ""} from approved time entries.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description (editable)</TableHead>
                    <TableHead className="text-right w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">Rate</TableHead>
                    <TableHead className="text-right w-28">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <input
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          value={item.description}
                          onChange={e => setPreviewItems(prev => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">${item.unitRate}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        ${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAutofillPreviewOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmAutofill} disabled={isConfirmingAutofill}>
                {isConfirmingAutofill ? "Inserting…" : `Insert ${previewItems.length} Item${previewItems.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* V5 — Record Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                {payments.length > 0
                  ? `${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded — balance due: $${Math.max(0, balanceDue).toLocaleString(undefined, {minimumFractionDigits: 2})}`
                  : `Invoice total: $${Number(invoice.total ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Date *</label>
                <input type="date" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={paymentForm.paymentDate} onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <input type="number" step="0.01" min="0" placeholder={String((Math.max(0, balanceDue) || Number(invoice.total)) ?? "")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={paymentForm.paymentAmount} onChange={e => setPaymentForm(f => ({ ...f, paymentAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reference / Cheque #</label>
                <input type="text" placeholder="e.g. TXN-20240513" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={paymentForm.paymentReference} onChange={e => setPaymentForm(f => ({ ...f, paymentReference: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
              <Button disabled={!paymentForm.paymentDate || isRecordingPayment} onClick={handleRecordPayment}>
                {isRecordingPayment ? "Saving…" : "Save Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddLineItemOpen} onOpenChange={setIsAddLineItemOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Line Item</DialogTitle></DialogHeader>
            <Form {...addLineItemForm}>
              <form onSubmit={addLineItemForm.handleSubmit(onAddLineItem)} className="space-y-4">
                <FormField control={addLineItemForm.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addLineItemForm.control} name="quantity" render={({field}) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>
                  )} />
                  <FormField control={addLineItemForm.control} name="unitRate" render={({field}) => (
                    <FormItem><FormLabel>Unit Rate ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={addLineItemForm.control} name="billable" render={({field}) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                    <FormLabel>Billable</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter><Button type="submit" disabled={createLineItem.isPending}>Add Item</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
