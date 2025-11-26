import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DebugDrawerProps {
  data: any;
}

export function DebugDrawer({ data }: DebugDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Debug JSON has been copied",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 shadow-lg"
        >
          <Code2 className="h-4 w-4 mr-2" />
          Debug
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Debug Information</SheetTitle>
          <SheetDescription>
            Raw webhook response data for developers
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)] w-full">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto border border-border">
              {JSON.stringify(data, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
