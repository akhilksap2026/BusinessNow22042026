import { Layout } from "@/components/layout";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Briefcase, Clock, AlertCircle, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();

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

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          {unreadNotifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markRead.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all read ({unreadNotifications.length})
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
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
                <p className="text-sm mt-1">No new notifications to show.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications?.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`flex gap-4 p-4 border rounded-lg transition-colors ${
                      notification.read ? 'bg-transparent border-border opacity-70' : 'bg-primary/5 border-primary/20 shadow-sm'
                    }`}
                  >
                    <div className="shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        {notification.projectId && (
                          <>
                            <span className="text-muted-foreground text-xs">•</span>
                            <Link href={`/projects/${notification.projectId}`} className="text-xs text-primary hover:underline">
                              {notification.projectName}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="shrink-0 h-8 text-xs" 
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
