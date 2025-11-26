import { useState, useEffect } from "react";
import { PromptForm } from "@/components/PromptForm";
import { QuestionDialog } from "@/components/QuestionDialog";
import { ImageGallery } from "@/components/ImageGallery";
import { DebugDrawer } from "@/components/DebugDrawer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  ModelName,
  GenerateInitRequest,
  GenerateAnswersRequest,
  WebhookResponse,
  ImageResult,
  Question,
} from "@/types/webhook";
import { Sparkles } from "lucide-react";

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || "https://a2bofc.app.n8n.cloud/webhook/b576d565-d282-4eec-9f01-cf092704874a";

const Index = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [storedImages, setStoredImages] = useState<ImageResult[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelName[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoadingStored, setIsLoadingStored] = useState(true);
  const { toast } = useToast();

  // Fetch stored images from Supabase on mount
  const fetchStoredImages = async () => {
    setIsLoadingStored(true);
    try {
      // Try proxy endpoint first (uses service role key on server)
      try {
        const proxyBase = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
        const proxyResp = await fetch(`${proxyBase}/api/images`);
        if (proxyResp.ok) {
          const json = await proxyResp.json();
          if (Array.isArray(json.data)) {
            console.log('Fetched images from proxy /api/images:', json.data);
            setStoredImages(json.data as ImageResult[]);
            setIsLoadingStored(false);
            return;
          }
        } else {
          console.warn(`${proxyBase}/api/images proxy returned`, proxyResp.status);
        }
      } catch (err) {
        console.log('Proxy /api/images not available, falling back to client Supabase', err);
      }

      const tableName = import.meta.env.VITE_SUPABASE_TABLE_NAME || "images";
      console.log(`Fetching images from table: ${tableName}`);
      console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
      
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stored images:", error);
        console.error("Error details:", JSON.stringify(error));
      } else {
        console.log("Stored images fetched successfully:", data);
        if (Array.isArray(data)) {
          setStoredImages(data as ImageResult[]);
        } else {
          console.warn("Data is not an array:", data);
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching images:", error);
    } finally {
      setIsLoadingStored(false);
    }
  };

  useEffect(() => {
    fetchStoredImages();
  }, []);

  // Poll for images matching a prompt (used when webhook request times out)
  const pollForImages = async (
    promptToMatch: string,
    intervalMs = 5000,
    timeoutMs = 5 * 60 * 1000
  ) => {
    const start = Date.now();
    toast({ title: "Processing", description: "Generation running in background. Polling for results..." });

    return new Promise<void>((resolve) => {
      const iv = setInterval(async () => {
        try {
          // Try proxy first
          try {
            const proxyResp = await fetch('/api/images');
            if (proxyResp.ok) {
              const json = await proxyResp.json();
              if (Array.isArray(json.data)) {
                const matches = json.data.filter((r: any) => {
                  if (!r) return false;
                  const promptField = r.prompt_used || r.prompt || r.final_prompt || r.prompt_used_text;
                  return (
                    typeof promptField === 'string' &&
                    promptField.toLowerCase().includes(promptToMatch.toLowerCase())
                  );
                });

                if (matches.length > 0) {
                  console.log('Poll found matches via proxy:', matches);
                  setStoredImages(matches as ImageResult[]);
                  clearInterval(iv);
                  resolve();
                }
              }
            }
          } catch (e) {
            // ignore proxy errors and fallback to client supabase
            console.log('Proxy poll failed, falling back to client supabase', e);
          }

          // Fallback: client-side supabase query
          try {
            const tableName = import.meta.env.VITE_SUPABASE_TABLE_NAME || 'images';
            const { data } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
            if (Array.isArray(data)) {
              const matches = data.filter((r: any) => {
                const promptField = r.prompt_used || r.prompt || r.final_prompt || r.prompt_used_text;
                return (
                  typeof promptField === 'string' &&
                  promptField.toLowerCase().includes(promptToMatch.toLowerCase())
                );
              });
              if (matches.length > 0) {
                console.log('Poll found matches via supabase client:', matches);
                setStoredImages(matches as ImageResult[]);
                clearInterval(iv);
                resolve();
              }
            }
          } catch (e) {
            console.error('Error polling supabase client:', e);
          }

          if (Date.now() - start > timeoutMs) {
            clearInterval(iv);
            toast({ title: 'Timeout', description: 'No results found within timeout period', variant: 'destructive' });
            resolve();
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, intervalMs);
    });
  };

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
      // Use AbortController to timeout the webhook request if it's too long
      const controller = new AbortController();
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: WebhookResponse = await response.json();
      console.log("Webhook response:", data);
      setDebugData(data);

      if (data.status === "followup") {
        console.log("Questions received:", data.questions);
        setQuestions(data.questions);
        setSessionId(data.session_id);
        setShowQuestions(true);
        setIsGenerating(false);
      } else if (data.status === "done") {
        console.log("Done response with results:", data.results);
        // Transform results to ensure correct structure
        const transformedResults = (data.results || []).map((result: any) => ({
          model: result.model || "unknown",
          image_url: result.image_url || result.url || result.imageUrl || "",
          seed: result.seed || 0,
          prompt_used: result.prompt_used || result.prompt || "",
        }));
        console.log("Transformed results:", transformedResults);
        setResults(transformedResults);
        setIsGenerating(false);
        
        // Refresh stored images to show newly generated ones
        fetchStoredImages();
      } else {
        console.warn("Unexpected response status:", (data as any).status);
      }
    } catch (error) {
      console.error("Generation error:", error);
      // If aborted due to timeout, start polling for results instead of failing hard
      if ((error as any)?.name === 'AbortError') {
        console.warn('Webhook request timed out, polling for results in background');
        toast({ title: 'Processing', description: 'Request timed out; polling for results in background' });
        await pollForImages(prompt, 5000, 5 * 60 * 1000);
      } else {
      toast({
        title: "Generation failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect to webhook",
        variant: "destructive",
      });
      }
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
      console.log("Webhook response after questions:", data);
      setDebugData(data);

      if (data.status === "done") {
        console.log("Done response with results:", data.results);
        // Transform results to ensure correct structure
        const transformedResults = (data.results || []).map((result: any) => ({
          model: result.model || "unknown",
          image_url: result.image_url || result.url || result.imageUrl || "",
          seed: result.seed || 0,
          prompt_used: result.prompt_used || result.prompt || "",
        }));
        console.log("Transformed results:", transformedResults);
        setResults(transformedResults);
        
        // Refresh stored images to show newly generated ones
        await fetchStoredImages();
      } else {
        console.warn("Unexpected response status:", (data as any).status);
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

          {results.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Generated Images</h2>
              <ImageGallery
                results={results}
                isLoading={isGenerating}
                selectedModels={selectedModels}
              />
            </div>
          )}

          {storedImages.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">
                Past Generations {isLoadingStored && "(Loading...)"}
              </h2>
              <ImageGallery
                results={storedImages}
                isLoading={isLoadingStored}
                selectedModels={[]}
              />
            </div>
          )}
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
