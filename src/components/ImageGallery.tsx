import { ImageResult, MODEL_LABELS } from "@/types/webhook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ImageGalleryProps {
  results: ImageResult[];
  isLoading: boolean;
  selectedModels?: string[];
}

export function ImageGallery({
  results,
  isLoading,
  selectedModels = [],
}: ImageGalleryProps) {
  const { toast } = useToast();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied`,
    });
  };

  const handleDownload = async (url: string, model?: string) => {
    try {
      toast({ title: 'Downloading...', description: 'Preparing image...' });

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const safeModel = model || 'image';
      link.download = `${safeModel}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoke after a short delay to ensure the download started
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast({ title: 'Download started', description: 'Image saved to your downloads' });
    } catch (err: any) {
      console.error('Download failed', err);
      toast({ title: 'Download failed', description: err?.message || String(err) });
    }
  };

  if (!isLoading && results.length === 0) {
    return null;
  }

  // If no selectedModels, show all results (for stored images)
  const displayResults =
    selectedModels.length > 0
      ? selectedModels
          .map((model) => results.find((r) => r.model === model))
          .filter(Boolean)
      : results;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {displayResults.map((result, idx) => {
          if (!result) return null;

          const uniqueKey =
            (result as any).id ?? `${result.model ?? 'unknown'}-${result.seed ?? result.created_at ?? idx}`;

          const modelLabel =
            MODEL_LABELS[(result.model as keyof typeof MODEL_LABELS) ?? (result as any).model_name] ||
            (result.model as any) ||
            (result as any).model_name ||
            undefined;

          return (
            <Card key={uniqueKey} className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  {modelLabel}
                  {result.seed && (
                    <Badge variant="secondary">Seed: {result.seed}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {isLoading && !result.image_url ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Generating...</p>
                    </div>
                  ) : result.image_url ? (
                    (() => {
                      // If image_url is a storage path (no scheme), attempt to build a public URL
                      let imgSrc = result.image_url;
                      console.log('Raw image_url from result:', imgSrc);
                      try {
                        if (imgSrc && !/^https?:\/\//i.test(imgSrc)) {
                          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                          const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || import.meta.env.SUPABASE_STORAGE_BUCKET;
                          // If we have a bucket and supabase url, construct the public storage URL
                          if (supabaseUrl && bucket) {
                            const path = imgSrc.replace(/^\//, '');
                            imgSrc = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
                            console.log('Constructed Supabase URL:', imgSrc);
                          }
                        } else if (imgSrc) {
                          console.log('Already a full URL, using as-is:', imgSrc);
                        }
                      } catch (e) {
                        console.error('Error constructing URL:', e);
                      }

                      return (
                        <img
                          src={imgSrc}
                          alt={modelLabel ? `Generated by ${modelLabel}` : 'Generated image'}
                          className="w-full h-full object-cover"
                          onError={async (e) => {
                            console.error('Image failed to load from:', imgSrc);
                            
                            // Try to get a signed URL as fallback
                            try {
                              const rawPath = result.image_url?.replace(/^\//, '');
                              if (rawPath && !rawPath.startsWith('http')) {
                                const proxyBase = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
                                const signedResp = await fetch(
                                  `${proxyBase}/api/signed-url?path=${encodeURIComponent(rawPath)}`
                                );
                                if (signedResp.ok) {
                                  const json = await signedResp.json();
                                  if (json.signedUrl) {
                                    console.log('Got signed URL, retrying:', json.signedUrl);
                                    (e.target as HTMLImageElement).src = json.signedUrl;
                                    return;
                                  }
                                }
                              }
                            } catch (err) {
                              console.error('Failed to get signed URL:', err);
                            }
                            
                            // Fallback: show placeholder
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EFailed to load%3C/text%3E%3C/svg%3E';
                          }}
                          onLoad={() => console.log('Image loaded successfully from:', imgSrc)}
                        />
                      );
                    })()
                  ) : null}
                </div>

                {result && (
                  <div className="space-y-3">
                    {result.prompt_used && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Prompt
                        </p>
                        <p className="text-sm bg-muted p-2 rounded border border-border">
                          {result.prompt_used}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {result.prompt_used && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopy(result.prompt_used, "Prompt")
                          }
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      )}
                      {result.image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(result.image_url, result.model)
                          }
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
