// Icon component factory. Shapes come from the free Hugeicons set (MIT, see
// LICENSE.md in this folder), the owner's pick that replaced lucide-react. Rendered
// here rather than through @hugeicons/react: the stroke attributes every element
// shares are set once on the <svg>, which makes each icon's data about 30% smaller.
// Default stroke 1.75, not Hugeicons' 1.5: at 16px a 1.5 stroke draws 1px lines next to
// text whose stems are ~1.3px, so icons looked lighter than their labels.

import { forwardRef, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from "react";

export type IconNode = ReadonlyArray<readonly ["path" | "circle", Readonly<Record<string, string>>]>;
export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string };
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/** Like lucide: an icon is decorative (aria-hidden) unless it is given a label. */
function hasA11yProp(props: Record<string, unknown>): boolean {
  for (const key in props) {
    if (key.startsWith("aria-") || key === "role" || key === "title") return true;
  }
  return false;
}

export function icon(name: string, node: IconNode): IconComponent {
  // A caller's strokeWidth overrides every element, as it does in @hugeicons/react.
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 24, strokeWidth, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={hasA11yProp(props) ? undefined : true}
      {...props}
    >
      {node.map(([Tag, attrs], i) => (
        <Tag key={i} {...attrs} {...(strokeWidth === undefined ? null : { strokeWidth })} />
      ))}
    </svg>
  ));
  Icon.displayName = name;
  return Icon;
}
