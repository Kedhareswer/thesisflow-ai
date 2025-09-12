"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [status, setStatus] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Thanks! We'll get back to you shortly.");
  };
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Contact</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">We'd love to hear from you.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Send a message</CardTitle>
            <CardDescription className="font-mono">Fill in the form and we will reply by email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Input placeholder="Your name" required className="font-mono" />
              <Input placeholder="Your email" type="email" required className="font-mono" />
              <Textarea placeholder="Your message" rows={6} required className="font-mono" />
              <div className="flex justify-end">
                <Button className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono">Send</Button>
              </div>
            </form>
            {status && <p className="mt-3 text-sm text-green-600 font-mono">{status}</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
