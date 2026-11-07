/**
 * Email notifications and verification.
 *
 * When RESEND_API_KEY is unset, sends are stubbed (logged). Production
 * never returns verifyUrl unless ALLOW_DEV_VERIFY_URL=1. ADMIN_EMAIL can
 * still finish setup via password bootstrap (see auth.ts) until Resend is
 * bound; once RESEND_API_KEY is set, new password signups must confirm email.
 */

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Alias used by auth bootstrap helpers. */
export function resendConfigured(): boolean {
  return isResendConfigured();
}

export async function sendVerificationEmail(input: {
  email: string;
  name: string;
  verifyUrl: string;
}): Promise<{ stubbed: boolean; verifyUrl?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(
      `[email stub] Verification link for ${input.email}: ${input.verifyUrl}`,
    );
    const expose =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_DEV_VERIFY_URL === "1";
    return {
      stubbed: true,
      verifyUrl: expose ? input.verifyUrl : undefined,
    };
  }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    "RoiEt Movie Club <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.email,
        subject: "Confirm your RoiEt Movie Club email",
        text: `Hi ${input.name || "there"},\n\nConfirm your email to finish joining RoiEt English Movie Club:\n\n${input.verifyUrl}\n\nThis link expires in 24 hours.\n`,
      }),
    });
    if (!res.ok) {
      console.error("[email] verification send failed", await res.text());
      return { stubbed: false };
    }
  } catch (err) {
    console.error("[email] verification send failed", err);
    return { stubbed: false };
  }
  return { stubbed: false };
}

export async function notifyNewMovieSubscribers(input: {
  title: string;
  showtime?: string | null;
  recipients: { email: string; name: string }[];
}): Promise<{ sent: number; stubbed: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(
      `[email stub] Would notify ${input.recipients.length} subscriber(s) about "${input.title}"${
        input.showtime ? ` (${input.showtime})` : ""
      }. Bind RESEND_API_KEY to enable sends.`,
    );
    return { sent: 0, stubbed: true };
  }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    "RoiEt Movie Club <onboarding@resend.dev>";
  let sent = 0;
  for (const r of input.recipients) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: r.email,
          subject: `New English movie: ${input.title}`,
          text: `Hi ${r.name || "there"},\n\nA new English screening was posted for RoiEt English Movie Club: ${input.title}${
            input.showtime ? `\nShowtime: ${input.showtime}` : ""
          }\n\nSee you at the cinema!\n`,
        }),
      });
      if (res.ok) sent += 1;
    } catch (err) {
      console.error("[email] send failed", err);
    }
  }
  return { sent, stubbed: false };
}
