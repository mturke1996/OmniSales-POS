import { DownloadSimple, DeviceMobile } from "@phosphor-icons/react";
import { cn } from "../lib/cn";
import {
  APK_FILENAME,
  resolveApkDownloadUrl,
  shouldOfferApkDownload,
} from "../lib/app-download";
import { detectRuntime } from "../lib/native";

export function AppDownloadLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const runtime = detectRuntime();
  if (!shouldOfferApkDownload(runtime)) return null;

  const href = resolveApkDownloadUrl();

  if (compact) {
    return (
      <a
        href={href}
        download={APK_FILENAME}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-highlight/15 px-2.5 text-[11px] font-bold text-highlight transition hover:bg-highlight/25",
          className
        )}
      >
        <DownloadSimple size={14} weight="duotone" />
        APK
      </a>
    );
  }

  return (
    <a
      href={href}
      download={APK_FILENAME}
      className={cn(
        "flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-highlight/25 bg-highlight/10 px-2.5 py-2 text-[13px] font-bold text-white transition hover:bg-highlight/20",
        className
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-highlight/25">
        <DeviceMobile size={18} weight="duotone" />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate">تحميل تطبيق Android</span>
        <span className="block truncate text-[10px] font-medium text-sidebar-mute">
          APK — تثبيت بضغطة واحدة
        </span>
      </span>
      <DownloadSimple size={16} weight="duotone" className="shrink-0 text-highlight" />
    </a>
  );
}
