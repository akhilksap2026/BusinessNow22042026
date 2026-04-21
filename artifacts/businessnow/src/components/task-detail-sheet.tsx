import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  useListTaskChecklist,
  useCreateTaskChecklistItem,
  useUpdateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useUpdateTask,
  useListUsers,
  getListTaskCommentsQueryKey,
  getListTaskChecklistQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Flag, CheckSquare, MessageSquare, Milestone, Shield } from "lucide-react";
import { format } from "date-fns";

interface TaskDetailSheetProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "Blocked", "In Review", "Done"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const APPROVAL_OPTIONS = ["none", "pending", "approved", "rejected"];

function statusColor(status: string) {
  if (status === "Done") return "bg-green-100 text-green-800";
  if (status === "In Progress") return "bg-blue-100 text-blue-800";
  if (status === "Blocked") return "bg-red-100 text-red-800";
  if (status === "In Review") return "bg-yellow-100 text-yellow-800";
  return "bg-slate-100 text-slate-700";
}

function priorityColor(p: string) {
  if (p === "Critical") return "bg-red-100 text-red-700";
  if (p === "High") return "bg-orange-100 text-orange-700";
  if (p === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-600";
}

export function TaskDetailSheet({ taskId, open, onOpenChange }: TaskDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useListUsers();
  const { data: comments, isLoading: loadingComments } = useListTaskComments(taskId ?? 0, {
    query: { enabled: !!taskId, queryKey: [...getListTaskCommentsQueryKey(taskId ?? 0)] },
  });
  const { data: checklist, isLoading: loadingChecklist } = useListTaskChecklist(taskId ?? 0, {
    query: { enabled: !!taskId, queryKey: [...getListTaskChecklistQueryKey(taskId ?? 0)] },
  });

  const createComment = useCreateTaskComment();
  const deleteComment = useDeleteTaskComment();
  const createItem = useCreateTaskChecklistItem();
  const updateItem = useUpdateTaskChecklistItem();
  const deleteItem = useDeleteTaskChecklistItem();
  const updateTask = useUpdateTask();

  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [addingChecklist, setAddingChecklist] = useState(false);

  const CURRENT_USER_ID = 1;

  const task = (queryClient.getQueryData(getListTasksQueryKey()) as any[])?.find((t: any) => t.id === taskId)
    ?? (queryClient.getQueriesData({ predicate: (q) => q.queryKey[0] === "listTasks" }).flatMap(([, d]) => d as any[]).find((t: any) => t?.id === taskId));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  async function handleToggleChecklist(item: any) {
    if (!taskId) return;
    await updateItem.mutateAsync({ id: taskId, itemId: item.id, data: { completed: !item.completed } });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleDeleteChecklist(item: any) {
    if (!taskId) return;
    await deleteItem.mutateAsync({ id: taskId, itemId: item.id });
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleAddChecklist() {
    if (!newChecklistItem.trim() || !taskId) return;
    await createItem.mutateAsync({ id: taskId, data: { taskId, name: newChecklistItem.trim() } });
    setNewChecklistItem("");
    setAddingChecklist(false);
    queryClient.invalidateQueries({ queryKey: getListTaskChecklistQueryKey(taskId) });
  }

  async function handleAddComment() {
    if (!newComment.trim() || !taskId) return;
    await createComment.mutateAsync({ id: taskId, data: { taskId, userId: CURRENT_USER_ID, content: newComment.trim() } });
    setNewComment("");
    setAddingComment(false);
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
  }

  async function handleDeleteComment(commentId: number) {
    if (!taskId) return;
    await deleteComment.mutateAsync({ id: taskId, commentId });
    queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
  }

  async function handleUpdateField(field: string, value: any) {
    if (!taskId) return;
    try {
      await updateTask.mutateAsync({ id: taskId, data: { [field]: value } as any });
      invalidate();
      toast({ title: "Task updated" });
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  }

  const completedCount = checklist?.filter((i) => i.completed).length ?? 0;
  const totalCount = checklist?.length ?? 0;

  const userName = (userId: number) => {
    const u = users?.find((u) => u.id === userId);
    return u ? u.name : `User ${userId}`;
  };

  const userInitials = (userId: number) => {
    const name = userName(userId);
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  if (!taskId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] w-full overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-xl font-semibold leading-tight flex-1">
                {task?.name ?? "Task Details"}
              </SheetTitle>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {task?.isMilestone && (
                  <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 flex items-center gap-1">
                    <Milestone className="h-3 w-3" /> Milestone
                  </Badge>
                )}
                {task?.approvalStatus && task.approvalStatus !== "none" && (
                  <Badge variant="outline" className="flex items-center gap-1 capitalize">
                    <Shield className="h-3 w-3" /> {task.approvalStatus}
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-6">

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <Select defaultValue={task?.status ?? "Not Started"} onValueChange={(v) => handleUpdateField("status", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s)}`}>{s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
                  <Select defaultValue={task?.priority ?? "Medium"} onValueChange={(v) => handleUpdateField("priority", v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(p)}`}>
                            <Flag className="h-3 w-3 mr-1" />{p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates & Effort */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    defaultValue={task?.startDate ?? ""}
                    onBlur={(e) => { if (e.target.value) handleUpdateField("startDate", e.target.value); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    defaultValue={task?.dueDate ?? ""}
                    onBlur={(e) => { if (e.target.value) handleUpdateField("dueDate", e.target.value); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Effort (hrs)</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    defaultValue={task?.effort ?? 0}
                    onBlur={(e) => { if (e.target.value !== "") handleUpdateField("effort", Number(e.target.value)); }}
                  />
                </div>
              </div>

              {/* Flags row */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={task?.isMilestone ?? false}
                    onCheckedChange={(v) => handleUpdateField("isMilestone", !!v)}
                  />
                  <span className="text-sm text-muted-foreground">Milestone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={task?.billable ?? true}
                    onCheckedChange={(v) => handleUpdateField("billable", !!v)}
                  />
                  <span className="text-sm text-muted-foreground">Billable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={task?.visibleToClient ?? true}
                    onCheckedChange={(v) => handleUpdateField("visibleToClient", !!v)}
                  />
                  <span className="text-sm text-muted-foreground">Visible to Client</span>
                </label>
              </div>

              {/* Approval status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval Status</label>
                <Select defaultValue={task?.approvalStatus ?? "none"} onValueChange={(v) => handleUpdateField("approvalStatus", v)}>
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Checklist</span>
                    {totalCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {completedCount}/{totalCount}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingChecklist(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>

                {totalCount > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                )}

                {loadingChecklist ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <div className="space-y-1">
                    {checklist?.sort((a, b) => a.order - b.order).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group py-1">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleChecklist(item)}
                        />
                        <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
                          onClick={() => handleDeleteChecklist(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {addingChecklist && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Checklist item…"
                      className="h-8 text-sm flex-1"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklist(); if (e.key === "Escape") { setAddingChecklist(false); setNewChecklistItem(""); } }}
                      autoFocus
                    />
                    <Button size="sm" className="h-8" onClick={handleAddChecklist} disabled={!newChecklistItem.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingChecklist(false); setNewChecklistItem(""); }}>Cancel</Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Comments</span>
                    {(comments?.length ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground">{comments?.length}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingComment(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Comment
                  </Button>
                </div>

                {loadingComments ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <div className="space-y-3">
                    {comments?.length === 0 && !addingComment && (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    )}
                    {comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                            {userInitials(comment.userId)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium">{userName(comment.userId)}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, h:mm a") : ""}
                            </span>
                            {comment.isPrivate && (
                              <Badge variant="outline" className="text-xs py-0 h-4">Private</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5 break-words">{comment.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground flex-shrink-0"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {addingComment && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Write a comment…"
                      className="text-sm resize-none"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>Post</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingComment(false); setNewComment(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
