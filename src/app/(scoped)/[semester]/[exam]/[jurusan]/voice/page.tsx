"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScope } from "@/components/providers/scope-provider";

export default function VoicePage() {
  const router = useRouter();
  const { scopePath } = useScope();

  useEffect(() => {
    router.replace(`/${scopePath}/dashboard`);
  }, [router, scopePath]);

  return null;
}
