import { Layout } from "@/components/layout";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Briefcase, Clock, AlertCircle, DollarSign, CheckCircle2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function notificationLink(n: { projectId?: number | null; type: string }): string | null {
  if (n.projectId) return `/projects/${n.projectId}`;
  if (n.type === "invoice_paid" || n.type === "invoice_overdue") return "/finance";
  if (n.type === "timesheet_reminder") return "/time";
  return null;
}

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const dismissNotification = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}/api/notifications/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'project_alert': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'invoice_paid': return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'task_assigned': return <Briefcase className="h-5 w-5 text-blue-500" />;
      case 'timesheet_reminder': return <Clock className="h-5 w-5 text-amber-500" />;
      default: return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const unreadNotifications = notifications?.filter(n => !n.read) ?? [];

  const handleMarkAllRead = () => {
    if (unreadNotifications.length === 0) return;
    Promise.all(
      unreadNotifications.map(n => markRead.mutateAsync({ id: n.id }))
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    });
  };

  const handleClearRead = () => {
    const read = notifications?.filter(n => n.read) ?? [];
    Promise.all(read.map(n => dismissNotification.mutateAsync(n.id)));
  };

  function handleRowClick(n: { id: number; read: boolean; projectId?: number | null; type: string }) {
    if (!n.read) handleMarkRead(n.id);
    const link = notificationLink(n);
    if (link) navigate(link);
  }

  const readCount = notifications?.filter(n => n.read).length ?? 0;

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <div className="flex items-center gap-2">
            {unreadNotifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markRead.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark all read ({unreadNotifications.length})
              </Button>
            )}
            {readCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearRead} disabled={dismissNotification.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear read ({readCount})
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p>You're all caught up!</p>
                <p className="text-sm mt-1">No notifications to show.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications?.map(notification => {
                  const link = notificationLink(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`group flex gap-4 p-4 border rounded-lg transition-colors ${
                        notification.read
                          ? 'bg-transparent border-border opacity-70 hover:opacity-100 hover:bg-muted/30'
                          : 'bg-primary/5 border-primary/20 shadow-sm hover:bg-primary/10 cursor-pointer'
                      } ${link ? 'cursor-pointer' : ''}`}
                      onClick={() => handleRowClick(notification)}
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                          {notification.projectId && (
                            <>
                              <span className="text-muted-foreground text-xs">•</span>
                              <span
                                className="text-xs text-primary hover:underline"
                                onClick={e => { e.stopPropagation(); navigate(`/projects/${notification.projectId}`); }}
                              >
                                {notification.projectName}
                              </span>
                            </>
                          )}
                          {link && !notification.projectId && (
                            <>
                              <span className="text-muted-foreground text-xs">•</span>
                              <span className="text-xs text-primary">View →</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-1 shrink-0 mt-0.5">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={e => { e.stopPropagation(); handleMarkRead(notification.id); }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                          onClick={e => { e.stopPropagation(); dismissNotification.mutate(notification.id); }}
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
