import { redirect } from "next/navigation";

// There is no landing page any more: requests start in the grid and the top bar
// switches between personal and vehicle badges.
export default function LocaleIndex({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/personal`);
}
