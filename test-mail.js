import fetch from "node-fetch";

async function testMail() {
  const baseUrl = "http://localhost:3000/api/mail";
  
  // Send mail test
  const sendRes = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: "user@test.com", subject: "Test", body: "Hello" })
  });
  console.log("Send mail response:", await sendRes.json());
  
  // Fetch inbox
  const inboxRes = await fetch(`${baseUrl}?folder=INBOX`);
  const inbox = await inboxRes.json();
  console.log("Inbox mails:", inbox);
  
  console.log("Mail MVP test finished ✅");
}

testMail();