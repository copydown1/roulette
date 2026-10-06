import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `Extract all roulette numbers visible in this image in visual reading order (left-to-right, top-to-bottom, row by row).
Return ONLY a JSON array of integers between 0 and 36 inclusive.
Skip any text labels, headers, column titles, or values that are ambiguous or not clearly a roulette number.
Example output: [12, 5, 0, 34, 7, 22, 11]
Return the raw JSON array only, no explanation.`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "[]";

    // Parse and filter
    let parsed: number[];
    try {
      const match = raw.match(/\[[\d,\s]*\]/);
      parsed = JSON.parse(match ? match[0] : "[]");
    } catch {
      parsed = [];
    }

    const numbers = parsed.filter((n: unknown) =>
      Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 36
    );

    return new Response(JSON.stringify({ numbers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
