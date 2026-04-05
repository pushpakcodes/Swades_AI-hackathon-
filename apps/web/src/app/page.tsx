"use client";

import Link from "next/link";
import { Button } from "@my-better-t-app/ui/components/button";

const TITLE_TEXT = `
  ██████╗ ███████╗████████╗████████╗███████╗██████╗
  ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
  ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
  ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
  ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
  ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

  ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
  ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
     ██║       ███████╗   ██║   ███████║██║     █████╔╝
     ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
     ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
     ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

export default function Home() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm text-center mb-8">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-8 flex flex-col items-center justify-center space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Transcription Service</h2>
          <p className="text-muted-foreground text-center">
            Choose an option below to begin. Your recordings are safely stored to your local browser using OPFS before uploading to guarantee zero data loss.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/recorder" className="w-full sm:w-auto">
              <Button size="lg" className="w-full">
                Live Recording
              </Button>
            </Link>
            <Link href="/upload" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full">
                Upload Audio File
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
