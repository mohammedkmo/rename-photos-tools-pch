import { Metadata } from "next";
import PersonalBadgeForm from "./form";

export const metadata: Metadata = {
  title: "Personal Badge",
  description: "Applying for Personal Badges",
}

export default function PersonalBadgePage() {
  // The shell bounds the height, so this just claims the space left under the
  // top bar. Only the grid inside scrolls.
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PersonalBadgeForm />
    </div>
  );
}
