/**
 * Email notifications for new movies.
 *
 * TODO: Wire a real provider when RESEND_API_KEY (or similar) is bound.
 * Until then, opt-in preferences are stored and sends are logged as stubs.
 */

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

  // Real Resend path (runs only when secret is present on the published host).
  const from =
    process.env.EMAIL_FROM?.trim() || "RoiEt Movie Club <onboarding@resend.dev>";
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
