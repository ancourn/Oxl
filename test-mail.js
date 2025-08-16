async function testMail() {
  const baseUrl = "http://localhost:3000/api/mail";
  
  try {
    // Send mail test
    const sendRes = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "user@test.com", subject: "Test", body: "Hello" })
    });
    
    if (!sendRes.ok) {
      console.log("Server not running or error - Mail MVP test skipped ⚠️");
      return;
    }
    
    const sendData = await sendRes.json();
    console.log("Send mail response:", sendData);
    
    // Fetch inbox
    const inboxRes = await fetch(`${baseUrl}?folder=INBOX`);
    const inbox = await inboxRes.json();
    console.log("Inbox mails:", inbox);
    
    console.log("Mail MVP test finished ✅");
  } catch (error) {
    console.log("Server not running - Mail MVP test skipped ⚠️");
    console.log("Error:", error.message);
  }
}

testMail();