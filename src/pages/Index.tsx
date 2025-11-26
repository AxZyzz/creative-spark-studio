import { useState } from "react";
import { PromptForm } from "@/components/PromptForm";
import { QuestionDialog } from "@/components/QuestionDialog";
import { ImageGallery } from "@/components/ImageGallery";
import { DebugDrawer } from "@/components/DebugDrawer";
import { useToast } from "@/hooks/use-toast";
import {
  ModelName,
  GenerateInitRequest,
  GenerateAnswersRequest,
  WebhookResponse,
  ImageResult,
  Question,
} from "@/types/webhook";
import { Sparkles } from "lucide-react";

const WEBHOOK_URL = "https://your-webhook-endpoint.com/generate";

const Index = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelName[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const { toast } = useToast();

  const handleInitialGenerate = async (prompt: string, models: ModelName[]) => {
    setIsGenerating(true);
    setResults([]);
    setSelectedModels(models);
    setDebugData(null);

    const payload: GenerateInitRequest = {
      prompt,
      models,
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: WebhookResponse = await response.json();
      setDebugData(data);

      if (data.status === "followup") {
        setQuestions(data.questions);
        setSessionId(data.session_id);
        setShowQuestions(true);
        setIsGenerating(false);
      } else if (data.status === "done") {
        setResults(data.results);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect to webhook",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleAnswerQuestions = async (answers: Record<string, string>) => {
    setShowQuestions(false);
    setIsGenerating(true);

    const payload: GenerateAnswersRequest = {
      session_id: sessionId,
      answers,
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: WebhookResponse = await response.json();
      setDebugData(data);

      if (data.status === "done") {
        setResults(data.results);
      } else {
        throw new Error("Unexpected response status after answering questions");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Creative Studio</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Compare AI image generation across multiple models
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl mx-auto">
            <PromptForm
              onGenerate={handleInitialGenerate}
              isGenerating={isGenerating}
            />
          </div>

          <ImageGallery
            results={results}
            isLoading={isGenerating}
            selectedModels={selectedModels}
          />
        </div>
      </main>

      <QuestionDialog
        questions={questions}
        onSubmit={handleAnswerQuestions}
        isOpen={showQuestions}
      />

      {debugData && <DebugDrawer data={debugData} />}
    </div>
  );
};

export default Index;
