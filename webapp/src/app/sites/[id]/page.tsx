import { notFound } from "next/navigation";
import { getSite } from "@/lib/store";
import { SiteDetail } from "./SiteDetail";

export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = getSite(id);
  if (!site) notFound();
  return <SiteDetail initial={site} />;
}
