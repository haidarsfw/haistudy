"use client";

import type { KilatCardProps } from "../kilat-types";
import { IntroCard, ExplainCard, QuoteCard } from "./basic-cards";
import { ChoiceCard, FillCard, MultiCard, ScenarioCard } from "./choice-cards";
import { OrderCard, CategorizeCard } from "./sort-cards";
import { SwipeCard } from "./swipe-card";
import { MatchCard } from "./match-card";
import { CalcCard } from "./calc-card";
import { TableCard } from "./table-card";
import { HotspotCard, PromptCard } from "./media-cards";

export function KilatCardView(props: KilatCardProps) {
  const { card } = props;
  switch (card.kind) {
    case "intro":
      return <IntroCard card={card} />;
    case "explain":
      return <ExplainCard card={card} />;
    case "quote":
      return <QuoteCard card={card} />;
    case "check":
      return <ChoiceCard {...props} isCheckpoint={false} />;
    case "checkpoint":
      return <ChoiceCard {...props} isCheckpoint />;
    case "fill":
      return <FillCard {...props} />;
    case "multi":
      return <MultiCard {...props} />;
    case "scenario":
      return <ScenarioCard {...props} />;
    case "match":
      return <MatchCard {...props} />;
    case "order":
      return <OrderCard {...props} />;
    case "categorize":
      return <CategorizeCard {...props} />;
    case "swipe":
      return <SwipeCard {...props} />;
    case "calc":
      return <CalcCard {...props} />;
    case "table":
      return <TableCard {...props} />;
    case "hotspot":
      return <HotspotCard {...props} />;
    case "prompt":
      return <PromptCard {...props} />;
    default:
      return null;
  }
}
