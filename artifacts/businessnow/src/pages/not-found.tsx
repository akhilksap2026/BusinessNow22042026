import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Compass className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist or may have moved.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
