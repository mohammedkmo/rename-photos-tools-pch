import type { Metadata } from "next";
import ApplicationsList from "@/components/documents/ApplicationsList";

export const metadata: Metadata = {
  title: "Applications",
  description: "Badge applications saved on this device",
};

// The home page is the list of applications kept on this device. Opening one
// is like opening a file; the sheet itself has no navigation of its own.
export default function LocaleIndex() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-pch-surface">
      <ApplicationsList />
    </div>
  );
}
