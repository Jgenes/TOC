"use client";
import { workspaceText } from "@/lib/platform-copy";
import { useSite } from "./site-shell";

export function WorkspaceText({ text }: { text: string }) {
  const { language } = useSite();
  return workspaceText(text, language);
}
export function useWorkspaceCopy() {
  const { language } = useSite();
  return (text: string) => workspaceText(text, language);
}
