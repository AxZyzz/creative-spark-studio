import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ModelName, MODEL_LABELS } from "@/types/webhook";
import { Wand2 } from "lucide-react";

interface PromptFormProps {
  onGenerate: (prompt: string, models: ModelName[]) => void;
  isGenerating: boolean;
}

export function PromptForm({ onGenerate, isGenerating }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModels] = useState<ModelName[]>([
    "nano_banana_pro",
    "gemini_25",
    "ideogram",
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && selectedModels.length > 0) {
      onGenerate(prompt, selectedModels);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="prompt" className="text-lg font-medium">
          Describe your vision
        </Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A futuristic cityscape at sunset with flying cars..."
          className="min-h-[120px] resize-none text-base"
          disabled={isGenerating}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!prompt.trim() || isGenerating}
        className="w-full text-base"
      >
        <Wand2 className="mr-2 h-5 w-5" />
        {isGenerating ? "Generating..." : "Generate Images"}
      </Button>
    </form>
  );
}
