"use client";

import { useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareReportLink() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("Failed to copy report link:", error);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LinkIcon className="h-4 w-4 text-primary" />
        <span>Share this report with a link</span>
      </div>
      <Button type="button" onClick={copyLink} size="sm" variant="outline">
        {copied ? (
          <Check className="mr-2 h-4 w-4 text-green-600" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        {copied ? "Link copied" : "Copy share link"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Report link copied to clipboard" : ""}
      </span>
    </div>
  );
}