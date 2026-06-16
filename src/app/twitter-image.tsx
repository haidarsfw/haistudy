import {
  renderBrandOg,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-brand";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderBrandOg();
}
