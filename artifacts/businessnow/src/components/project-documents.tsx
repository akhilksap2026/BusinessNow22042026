import { useState } from "react";
import {
  useListDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument, useListDocumentVersions,
  getListDocumentsQueryKey, getListDocumentVersionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, FileText, History, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  projectId: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  rich_text: "Rich Text",
  spreadsheet: "Spreadsheet",
  pdf: "PDF",
  link: "Link",
};

const SPACE_LABELS: Record<string, string> = {
  shared: "Shared",
  private: "Private",
  client: "Client",
};

const APPROVAL_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  none: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

export function ProjectDocuments({ projectId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: docs, isLoading } = useListDocuments(
    { projectId },
    { query: { enabled: !!projectId, queryKey: getListDocumentsQueryKey({ projectId }) } }
  );

  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", spaceType: "shared", documentType: "rich_text" });

  const [viewDocId, setViewDocId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  const { data: versions } = useListDocumentVersions(
    viewDocId ?? 0,
    { query: { enabled: !!viewDocId && showVersions, queryKey: getListDocumentVersionsQueryKey(viewDocId ?? 0) } }
  );

  const viewDoc = docs?.find(d => d.id === viewDocId);

  async function handleCreate() {
    if (!createForm.name) return;
    try {
      await createDoc.mutateAsync({
        data: { projectId, name: createForm.name, spaceType: createForm.spaceType, documentType: createForm.documentType },
      });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ projectId }) });
      toast({ title: "Document created" });
      setCreateOpen(false);
      setCreateForm({ name: "", spaceType: "shared", documentType: "rich_text" });
    } catch {
      toast({ title: "Failed to create document", variant: "destructive" });
    }
  }

  async function handleSaveContent() {
    if (!viewDocId) return;
    try {
      await updateDoc.mutateAsync({
        id: viewDocId,
        data: { name: editName || undefined, content: editContent },
      });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ projectId }) });
      toast({ title: "Document saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteDoc.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ projectId }) });
      toast({ title: "Document deleted" });
      setDeleteDocId(null);
      if (viewDocId === id) setViewDocId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  function openView(docId: number) {
    const doc = docs?.find(d => d.id === docId);
    if (doc) {
      setViewDocId(docId);
      setEditContent(doc.content ?? "");
      setEditName(doc.name);
      setShowVersions(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Project documents, notes, and attachments</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Document
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : !docs?.length ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">No documents yet. Create the first one.</p>
            </div>
          ) : (
            <div className="divide-y">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-3 gap-3">
                  <button
                    className="flex items-center gap-3 flex-1 text-left hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                    onClick={() => openView(doc.id)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType} · {SPACE_LABELS[doc.spaceType] ?? doc.spaceType} · v{doc.version}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${APPROVAL_COLORS[doc.approvalStatus ?? "none"]}`}>
                      {doc.approvalStatus === "none" ? "Draft" : (doc.approvalStatus ?? "Draft").charAt(0).toUpperCase() + (doc.approvalStatus ?? "Draft").slice(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openView(doc.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDocId(doc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>Add a document to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document Name *</Label>
              <Input
                placeholder="e.g. Project Charter, Meeting Notes"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={createForm.documentType} onValueChange={v => setCreateForm(f => ({ ...f, documentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rich_text">Rich Text</SelectItem>
                    <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Space</Label>
                <Select value={createForm.spaceType} onValueChange={v => setCreateForm(f => ({ ...f, spaceType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!createForm.name || createDoc.isPending}>Create Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDocId} onOpenChange={open => { if (!open) setViewDocId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <Input
                  className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              {viewDoc && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">v{viewDoc.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${APPROVAL_COLORS[viewDoc.approvalStatus ?? "none"]}`}>
                    {viewDoc.approvalStatus === "none" ? "Draft" : (viewDoc.approvalStatus ?? "Draft").charAt(0).toUpperCase() + (viewDoc.approvalStatus ?? "Draft").slice(1)}
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-auto">
            <Textarea
              className="flex-1 min-h-[300px] font-mono text-sm resize-none"
              placeholder="Start writing your document content here..."
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />

            <div className="border rounded-lg">
              <button
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
                onClick={() => setShowVersions(v => !v)}
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Version History
                </span>
                {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showVersions && (
                <div className="border-t px-4 py-3">
                  {!versions?.length ? (
                    <p className="text-xs text-muted-foreground">No previous versions saved yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {versions.map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs text-muted-foreground py-1">
                          <span>Version {v.version}</span>
                          <span>{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDocId(null)}>Close</Button>
            <Button onClick={handleSaveContent} disabled={updateDoc.isPending}>
              {updateDoc.isPending ? "Saving…" : "Save Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>This will permanently delete the document and all its version history. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDocId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDocId && handleDelete(deleteDocId)} disabled={deleteDoc.isPending}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
