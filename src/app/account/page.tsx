import { SiteShell } from "@/components/SiteShell";
import { AccountForms } from "@/components/AccountForms";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [content, skin, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    requireUser(),
  ]);
  const googleReady = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );

  return (
    <SiteShell brand={content["home.brand"]} skin={skin} user={user}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <AccountForms user={user} googleReady={googleReady} />
      </div>
    </SiteShell>
  );
}
