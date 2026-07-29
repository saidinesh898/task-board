import type { Metadata } from "next"
import { InterviewGuide } from "@/features/interview-guide/interview-guide"

export const metadata: Metadata = {
  title: "Board Systems Lab · Interview guide",
  description:
    "An interactive guide to the architecture, patterns, code, and tradeoffs behind the collaborative task board.",
}

export default function InterviewGuidePage() {
  return <InterviewGuide />
}
