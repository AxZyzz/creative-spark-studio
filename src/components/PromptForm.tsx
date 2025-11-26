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
  const [selectedModels, setSelectedModels] = useState<ModelName[]>([
    "nano_banana_pro",
    "gemini_25",
    "ideogram",
  ]);

  const handleModelToggle = (model: ModelName) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && selectedModels.length > 0) {
      onGenerate(prompt, selectedModels);
    }
  };

  const models: ModelName[] = ["nano_banana_pro", "gemini_25", "ideogram"];

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

      <div className="space-y-3">
        <Label className="text-lg font-medium">Select models</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {models.map((model) => (
            <div
              key={model}
              className="flex items-center space-x-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <Checkbox
                id={model}
                checked={selectedModels.includes(model)}
                onCheckedChange={() => handleModelToggle(model)}
                disabled={isGenerating}
              />
              <Label
                htmlFor={model}
                className="flex-1 cursor-pointer font-medium"
              >
                {MODEL_LABELS[model]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!prompt.trim() || selectedModels.length === 0 || isGenerating}
        className="w-full text-base"
      >
        <Wand2 className="mr-2 h-5 w-5" />
        {isGenerating ? "Generating..." : "Generate Images"}
      </Button>
    </form>
  );
}
