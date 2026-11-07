import { SiteShell } from "@/components/SiteShell";
import { AccountForms } from "@/components/AccountForms";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin } from "@/lib/data";

export const dynamic = "force-dynamic";

function bannerFromParams(sp: {
  google?: string;
  verify?: string;
  link?: string;
}): string | null {
  if (sp.verify === "ok") return "Email confirmed — you are signed in.";
  if (sp.verify === "invalid")
    return "That confirmation link is invalid or expired. Try registering again.";
  if (sp.verify === "missing") return "Missing confirmation token.";
  if (sp.link === "ok")
    return "Google connected. You can sign in with Google or email/password.";
  if (sp.link === "mismatch")
    return "Google email must match this account’s email. Pick the matching Google account.";
  if (sp.link === "conflict")
    return "That Google account is already linked to a different member.";
  if (sp.google === "missing")
    return "Google sign-in is not set up yet. Use email and password for now.";
  if (sp.google === "badclient")
    return "Google rejected the app’s client secret. The Web OAuth client ID and secret must be a matching pair from Google Cloud → Credentials (Application type: Web application). Update GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and redeploy.";
  if (sp.google === "redirect")
    return "Google redirect URI mismatch. In the Web OAuth client, add both https://movieclub101.com/api/auth/google/callback and the hosted.app …/api/auth/google/callback URIs.";
  if (sp.google === "state")
    return "Google sign-in lost its login session cookie. Try again in the same browser (don’t switch devices mid-login).";
  if (sp.google === "token" || sp.google === "profile" || sp.google === "error")
    return "Google sign-in failed. Please try again or use email.";
  if (sp.google === "unverified")
    return "Your Google account email is not verified.";
  if (sp.google === "signin")
    return "Sign in first, then connect Google from Account.";
  if (sp.google === "demo") return "Signed in with the local Google demo.";
  return null;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; verify?: string; link?: string }>;
}) {
  const sp = await searchParams;
  const [content, skin, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    requireUser(),
  ]);
  const googleReady = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const neonAuthReady = Boolean(
    process.env.NEON_AUTH_BASE_URL?.trim() &&
      (process.env.NEON_AUTH_COOKIE_SECRET?.trim().length ?? 0) >= 32,
  );

  return (
    <SiteShell
      brand={content["home.brand"]}
      footerTagline={content["footer.tagline"]}
      skin={skin}
      user={user}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <AccountForms
          user={user}
          googleReady={googleReady}
          neonAuthReady={neonAuthReady}
          banner={bannerFromParams(sp)}
          joinTitle={content["account.join_title"]}
          joinIntro={content["account.join_intro"]}
          joinIntroPassword={content["account.join_intro_password"]}
        />
      </div>
    </SiteShell>
  );
}
