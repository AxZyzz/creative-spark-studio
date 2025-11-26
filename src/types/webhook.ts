// API Contract Types for Webhook Integration

export type ModelName = "nano_banana_pro" | "gemini_25" | "ideogram";

export interface GenerateInitRequest {
  prompt: string;
  models: ModelName[];
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface FollowUpResponse {
  status: "followup";
  questions: Question[];
  session_id: string;
}

export interface GenerateAnswersRequest {
  session_id: string;
  answers: Record<string, string>; // question_id -> selected value
}

export interface ImageResult {
  model: ModelName;
  image_url: string;
  seed: number;
  prompt_used: string;
}

export interface DoneResponse {
  status: "done";
  results: ImageResult[];
}

export type WebhookResponse = FollowUpResponse | DoneResponse;

export const MODEL_LABELS: Record<ModelName, string> = {
  nano_banana_pro: "Nano Banana Pro",
  gemini_25: "Gemini 2.5",
  ideogram: "Ideogram",
};
