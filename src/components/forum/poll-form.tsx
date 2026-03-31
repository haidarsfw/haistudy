"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PollFormProps {
  onSubmit: (question: string, options: string[]) => Promise<void>;
  onCancel: () => void;
}

export function PollForm({ onSubmit, onCancel }: PollFormProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      setError("Pertanyaan tidak boleh kosong");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError("Minimal 2 opsi yang tidak kosong");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(question.trim(), validOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat poll");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <Input
        placeholder="Pertanyaan poll..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={200}
        disabled={isSubmitting}
      />

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Opsi ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={() => removeOption(index)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {options.length < 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={addOption}
            disabled={isSubmitting}
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah opsi
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : null}
          Buat Poll
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </motion.div>
  );
}
