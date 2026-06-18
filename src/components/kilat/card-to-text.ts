import type { KilatCard } from "@/types";

export interface CardContext {
  /** Short, human label for the "Lagi bahas: ..." banner. */
  label: string;
  /** Readable serialization of the card, fed to the AI as grounding context. */
  text: string;
}

function clamp(s: string, n = 70): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Turn the card the user is currently looking at into a label + a readable
 * snippet. The snippet is passed as `referenceText` to the AI so its answer is
 * grounded in exactly what's on screen (the route already anchors answers to a
 * provided reference).
 */
export function cardToText(card: KilatCard): CardContext {
  switch (card.kind) {
    case "intro":
      return {
        label: clamp(card.title),
        text: `${card.title}${card.subtitle ? `\n${card.subtitle}` : ""}`,
      };
    case "explain":
      return { label: clamp(card.heading), text: `${card.heading}\n${card.body}` };
    case "quote":
      return {
        label: "Kutipan",
        text: `"${card.text}"${card.source ? `\n— ${card.source}` : ""}`,
      };
    case "check":
    case "checkpoint": {
      const opts = card.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
      return {
        label: clamp(card.question),
        text: `Pertanyaan: ${card.question}\nPilihan:\n${opts}\nJawaban benar: ${card.options[card.answer]}\nPenjelasan: ${card.explain}`,
      };
    }
    case "scenario": {
      const choices = card.choices
        .map((c) => `- ${c.text}${c.correct ? " (pilihan paling tepat)" : ""}`)
        .join("\n");
      return {
        label: clamp(card.situation),
        text: `Skenario: ${card.situation}\nPilihan:\n${choices}`,
      };
    }
    case "match": {
      const pairs = card.pairs.map((p) => `- ${p.term} = ${p.def}`).join("\n");
      return {
        label: card.prompt ? clamp(card.prompt) : "Jodohin istilah",
        text: `${card.prompt ? `${card.prompt}\n` : ""}Pasangan istilah dan artinya:\n${pairs}`,
      };
    }
    case "fill":
      return {
        label: "Lengkapi kalimat",
        text: `Kalimat rumpang: ${card.before} ___ ${card.after}\nJawaban benar: ${card.options[card.answer]}${card.explain ? `\nPenjelasan: ${card.explain}` : ""}`,
      };
    case "multi": {
      const opts = card.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
      const correct = card.answers.map((a) => card.options[a]).join("; ");
      return {
        label: clamp(card.question),
        text: `Pertanyaan (pilih semua yang benar): ${card.question}\nPilihan:\n${opts}\nJawaban benar: ${correct}\nPenjelasan: ${card.explain}`,
      };
    }
    case "order": {
      const steps = card.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      return {
        label: clamp(card.prompt),
        text: `${card.prompt}\nUrutan yang benar:\n${steps}${card.explain ? `\nPenjelasan: ${card.explain}` : ""}`,
      };
    }
    case "categorize": {
      const byBucket = card.buckets
        .map((b, bi) => {
          const items = card.items
            .filter((it) => it.bucket === bi)
            .map((it) => it.text)
            .join(", ");
          return `- ${b}: ${items}`;
        })
        .join("\n");
      return {
        label: clamp(card.prompt),
        text: `${card.prompt}\nPengelompokan yang benar:\n${byBucket}${card.explain ? `\nPenjelasan: ${card.explain}` : ""}`,
      };
    }
    case "swipe": {
      const sts = card.statements
        .map((s) => `- ${s.text} → ${s.isTrue ? "BENAR" : "SALAH"}${s.note ? ` (${s.note})` : ""}`)
        .join("\n");
      return {
        label: card.prompt ? clamp(card.prompt) : "Benar atau salah",
        text: `${card.prompt ? `${card.prompt}\n` : ""}Pernyataan:\n${sts}`,
      };
    }
    case "calc": {
      const base = `Soal hitung: ${card.question}${card.formula ? `\nRumus: ${card.formula}` : ""}`;
      const ans =
        card.mode === "pick"
          ? `\nPilihan: ${card.options.join(", ")}\nJawaban benar: ${card.options[card.answer]}`
          : `\nJawaban benar: ${card.answer}${card.unit ? ` ${card.unit}` : ""}`;
      const steps = card.steps?.length ? `\nLangkah: ${card.steps.join(" ")}` : "";
      return { label: clamp(card.question), text: `${base}${ans}${steps}\nPenjelasan: ${card.explain}` };
    }
    case "table": {
      const head = card.columns?.length ? `Kolom: ${card.columns.join(" | ")}\n` : "";
      const body = card.rows.map((r) => r.join(" | ")).join("\n");
      const extra =
        card.mode === "fill"
          ? `\nSel kosong diisi: ${card.options[card.answer]}\nPenjelasan: ${card.explain}`
          : card.notes?.length
            ? `\nCatatan: ${card.notes.join(" ")}`
            : "";
      return {
        label: card.title ? clamp(card.title) : "Tabel",
        text: `${card.title ? `${card.title}\n` : ""}${head}${body}${extra}`,
      };
    }
    case "hotspot":
      return {
        label: clamp(card.question),
        text: `${card.question}\nPenjelasan: ${card.explain}`,
      };
    case "prompt": {
      const opts = card.options
        .map((o) => `- ${o.text}${o.better ? " (lebih baik)" : ""}`)
        .join("\n");
      return {
        label: clamp(card.goal),
        text: `Tujuan prompt: ${card.goal}\nPilihan prompt:\n${opts}\nPenjelasan: ${card.explain}`,
      };
    }
    default:
      return { label: "Materi", text: "" };
  }
}
