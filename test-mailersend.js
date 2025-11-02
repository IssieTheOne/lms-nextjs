require('dotenv').config({ path: '.env.local' });

async function testMailerSend() {
  try {
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: "test@yourdomain.com", name: "Test LMS" },
        to: [{ email: "test@example.com" }],
        subject: "Test Email",
        html: "<p>This is a test email for MailerSend validation.</p>",
      }),
    });
    if (!res.ok) throw new Error("MailerSend failed: " + res.statusText);
    console.log('MailerSend test passed: email sent');
    return true;
  } catch (err) {
    console.error('MailerSend test failed:', err.message);
    return false;
  }
}

testMailerSend();