export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MAILERSEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: "noreply@lms-platform.com", name: "LMS Platform" },
      to: [{ email: to }],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error("MailerSend failed: " + res.statusText);
}