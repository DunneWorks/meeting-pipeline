const WORKER_URL = "https://meeting-pipeline.curaden-apps.workers.dev";

const mockPayload = {
  meeting: {
    id: "test-meeting-001",
    title: "Q2 Planning Workshop with Barbara",
    date: "2026-03-25T14:00:00Z",
    duration: 7200,
    attendees: [
      { name: "Barbara", email: "barbara@curaden.com" },
      { name: "Sean", email: "sean@curaden.com" }
    ],
    owner_email: "sean@curaden.com",
    host_email: "barbara@curaden.com"
  },
  transcript: `Barbara: Good morning everyone! Thanks for joining the Q2 Planning Workshop.
Barbara: Today we have almost 3 hours, so I want to make sure we finalize as much as possible on the spot.
Barbara: The topic I'm thinking about is Best Practice Sharing. It's part of my agenda that I'll be dropping from April, but I think it's too important to just let go.
Barbara: My rough idea is to have a quick intro to give context and explain how it's been done so far.
Barbara: Then we break into groups to create a concrete workflow, template, and implementation steps.
Barbara: Since our team is really diverse, I thought it might help to give each group a specific topic.
Barbara: Some initial ideas are template for iTOP implementation, template for student collaboration, and template for B2C education.
Barbara: I'm also thinking of inviting 1-2 marketing people so we can make something useful for other departments too.
Barbara: The final template should be easy to fill out by the country sharing their success story.
Sean: That sounds great! I can help with the B2C template.
Barbara: Perfect. Let's aim to have the first draft ready by end of next week.
Barbara: Decision: We'll use the workshop format for Best Practice Sharing going forward.
Sean: I'll send out a calendar invite for the follow-up meeting next Thursday.
Barbara: Great! Let's wrap up here.`,
  screenshots: ["https://picsum.photos/800/600"]
};

async function testWebhook() {
  console.log("Testing Meeting Pipeline...\n");
  console.log("Worker URL:", WORKER_URL);
  console.log("\nSending mock webhook payload...\n");

  try {
    const response = await fetch(`${WORKER_URL}/webhook/fireflies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mockPayload)
    });

    const result = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Body:", JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log("\n✅ Pipeline test successful!");
      console.log("\nCheck your Notion databases:");
      console.log("- Pipeline (DB1): Should have a new meeting page");
      console.log("- Official Record (DB3): Should have a new record");
    } else {
      console.log("\n❌ Pipeline test failed!");
    }
  } catch (error) {
    console.error("Error:", error);
    console.log("\n❌ Could not connect to worker. Make sure it's deployed.");
  }
}

testWebhook();
