"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// haistudy logomark — open book + rising reader ("h"/person + dot).
// Always renders in the brand gradient (theme-independent); inlined so it stays
// crisp at any size and needs no image request. viewBox is the tight production
// crop from brand.local/haistudy-icon.svg.
const PATHS = [
  "M 793.441 664.771 C 809.551 673.089 837.5 697.347 850.668 710.423 C 880.774 740.564 905.584 775.566 924.052 813.957 C 936.831 840.468 935.541 844.247 935.288 873.002 C 935.12 889.354 935.097 905.708 935.219 922.06 C 973.039 887.762 1005.31 878.26 1056.91 877.288 C 1110.26 876.913 1161.6 896.051 1199.48 933.763 C 1267.53 1001.53 1255.81 1097.54 1255.8 1184.93 L 1255.87 1422.78 C 1193.45 1451.94 1158.05 1479.98 1112.95 1532.82 L 1112.92 1195.25 L 1113.47 1139.37 C 1113.97 1099.01 1115.8 1064.4 1086.17 1032.59 C 1054.16 998.241 1001.07 999.928 967.948 1032.63 C 953.029 1047.24 942.853 1066 938.745 1086.48 C 935.02 1105.62 936.103 1129.27 936.104 1149.06 L 936.147 1231.1 L 935.967 1533.09 C 908.189 1496.84 874.122 1465.34 834.127 1443.1 C 820.725 1435.65 806.568 1429.59 793.094 1422.29 L 793.079 915.351 C 793.138 832.308 792.268 747.693 793.441 664.771 z",
  "M 1532.49 578.535 L 1533.83 578.519 C 1534.25 579.007 1534.67 579.495 1535.09 579.983 C 1535.29 611.147 1535.19 694.151 1535.19 720.61 L 1535.11 1369.41 C 1448.27 1368.71 1399.88 1372.48 1316.23 1399.1 L 1316.12 1216.25 L 1316.12 1121.49 C 1316.14 1070.72 1317.24 1032.07 1300.36 982.755 C 1288.06 941.507 1266.99 906.834 1236.58 876.264 C 1204.37 843.878 1168.9 828.995 1126.1 815.661 C 1142.48 777.567 1171.05 739.351 1199.86 709.524 C 1289.57 616.627 1405.4 580.08 1532.49 578.535 z",
  "M 510.674 578.831 C 542.158 578.929 573.298 583.242 604.37 587.705 C 649.638 594.206 689.307 609.277 731.175 627.229 L 730.985 1399.09 C 652.423 1370.86 591.941 1369.69 510.721 1369.54 L 510.674 578.831 z",
  "M 1014.33 533.395 C 1055.82 528.53 1093.42 558.16 1098.39 599.637 C 1103.37 641.114 1073.83 678.792 1032.37 683.872 C 990.753 688.971 952.906 659.306 947.915 617.677 C 942.925 576.047 972.687 538.278 1014.33 533.395 z",
];

export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="470 500 1095 1075"
      role="img"
      aria-label="haistudy"
      className={className}
    >
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1="520"
          y1="560"
          x2="1520"
          y2="1500"
        >
          <stop offset="0" stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      {PATHS.map((d, i) => (
        <path key={i} d={d} fill={`url(#${gid})`} />
      ))}
    </svg>
  );
}

// Wordmark: "hai" in the brand gradient, "study" theme-aware (ink/light,
// white/dark via --foreground). Gradient text here is intentional and scoped
// to the wordmark only — never used on headings/metrics.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-bold leading-none tracking-[-0.02em]",
        className
      )}
    >
      <span className="text-brand-gradient">hai</span>
      <span className="text-foreground">study</span>
    </span>
  );
}

// Full lockup: mark + wordmark, baseline aligned with a small gap.
export function Logo({
  markSize = 30,
  wordClassName,
  className,
}: {
  markSize?: number;
  wordClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <Wordmark className={wordClassName} />
    </span>
  );
}
