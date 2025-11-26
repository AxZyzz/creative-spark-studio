import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Question } from "@/types/webhook";
import { Send } from "lucide-react";

interface QuestionDialogProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isOpen: boolean;
}

export function QuestionDialog({
  questions,
  onSubmit,
  isOpen,
}: QuestionDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    if (Object.keys(answers).length === questions.length) {
      onSubmit(answers);
    }
  };

  const allQuestionsAnswered = Object.keys(answers).length === questions.length;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Help us refine your vision
          </DialogTitle>
          <DialogDescription className="text-base">
            Answer these questions to get better results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <Label className="text-base font-medium">{question.text}</Label>
              <RadioGroup
                value={answers[question.id]}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: value }))
                }
              >
                {question.options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex-1 cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!allQuestionsAnswered}
          size="lg"
          className="w-full"
        >
          <Send className="mr-2 h-5 w-5" />
          Continue Generation
        </Button>
      </DialogContent>
    </Dialog>
  );
}
