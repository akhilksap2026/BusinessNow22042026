import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useUpdateInvoice,
  useListInvoiceLineItems,
  useCreateInvoiceLineItem,
  useUpdateInvoiceLineItem,
  useDeleteInvoiceLineItem,
  useAutofillInvoiceLineItems,
  getListInvoiceLineItemsQueryKey,
  getListInvoicesQueryKey,
  getGetFinanceSummaryQueryKey,
  useListAccounts,
  useListProjects
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, Trash2, Plus, Zap } from "lucide-react";
import { InvoiceStatusBadge } from "@/pages/finance";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01),
  unitRate: z.coerce.number().min(0),
  billable: z.boolean(),
});

export function InvoiceDetail({ invoice, open, onOpenChange }: { invoice: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddLineItemOpen, setIsAddLineItemOpen] = useState(false);

  const invoiceId: string = invoice?.id ?? "";
  const { data: lineItems } = useListInvoiceLineItems(invoiceId, {
    query: { enabled: !!invoiceId, queryKey: getListInvoiceLineItemsQueryKey(invoiceId) }
  });

  const { data: accounts } = useListAccounts();
  const { data: projects } = useListProjects();

  const updateInvoice = useUpdateInvoice();
  const createLineItem = useCreateInvoiceLineItem();
  const updateLineItem = useUpdateInvoiceLineItem();
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

  const handleAutofill = async () => {
    try {
      await autofillLineItems.mutateAsync({ id: invoice.id as string });
      queryClient.invalidateQueries({ queryKey: getListInvoiceLineItemsQueryKey(invoice.id) });
      toast({ title: "Line items auto-filled from time entries" });
    } catch {
      toast({ title: "Error auto-filling", variant: "destructive" });
    }
  };

  const account = accounts?.find(a => a.id === invoice.accountId);
  const project = projects?.find(p => p.id === invoice.projectId);

  const subtotal = lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const tax = invoice.tax || 0;
  const total = subtotal + tax;

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
            <InvoiceStatusBadge status={invoice.status} />
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

          <div className="flex gap-2">
            {invoice.status === "Draft" && (
              <Button onClick={() => handleStatusTransition("In Review")}>Submit for Review</Button>
            )}
            {invoice.status === "In Review" && (
              <Button onClick={() => handleStatusTransition("Approved")}>Approve</Button>
            )}
            {invoice.status === "Approved" && (
              <Button onClick={() => handleStatusTransition("Paid")} className="bg-green-600 hover:bg-green-700">Mark as Paid</Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAutofill} disabled={!canEdit || autofillLineItems.isPending}>
                  <Zap className="h-4 w-4 mr-2" /> Auto-fill from Time
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
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No line items.</TableCell></TableRow>
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
              </div>
            </div>
          </div>
        </div>

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
