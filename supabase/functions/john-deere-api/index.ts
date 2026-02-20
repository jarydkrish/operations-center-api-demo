import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const JOHN_DEERE_API_BASE = "https://sandboxapi.deere.com/platform";
const JOHN_DEERE_TOKEN_URL = "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token";
const JOHN_DEERE_CLIENT_ID = Deno.env.get("JOHN_DEERE_CLIENT_ID") || "";
const JOHN_DEERE_CLIENT_SECRET = Deno.env.get("JOHN_DEERE_CLIENT_SECRET") || "";

interface Connection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  selected_org_id: string | null;
  selected_org_name: string | null;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: JOHN_DEERE_CLIENT_ID,
    client_secret: JOHN_DEERE_CLIENT_SECRET,
  });

  const response = await fetch(JOHN_DEERE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

async function getValidToken(supabase: ReturnType<typeof createClient>, connection: Connection): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return connection.access_token;
  }

  const tokens = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("john_deere_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function callJohnDeereApi(accessToken: string, endpoint: string): Promise<Response> {
  const response = await fetch(`${JOHN_DEERE_API_BASE}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.deere.axiom.v3+json",
    },
  });

  return response;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection, error: connError } = await supabase
      .from("john_deere_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "No John Deere connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidToken(supabase, connection as Connection);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "organizations") {
      const response = await callJohnDeereApi(accessToken, "/organizations");

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `John Deere API error: ${response.status}`, details: errorText }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "select-organization") {
      const { orgId, orgName } = await req.json();

      if (!orgId) {
        return new Response(JSON.stringify({ error: "Missing orgId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("john_deere_connections")
        .update({
          selected_org_id: orgId,
          selected_org_name: orgName || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fields") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return new Response(JSON.stringify({ error: "No organization selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await callJohnDeereApi(accessToken, `/organizations/${orgId}/fields`);

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `John Deere API error: ${response.status}`, details: errorText }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "harvest-operations") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return new Response(JSON.stringify({ error: "No organization selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fieldsResponse = await callJohnDeereApi(accessToken, `/organizations/${orgId}/fields`);

      if (!fieldsResponse.ok) {
        const errorText = await fieldsResponse.text();
        return new Response(JSON.stringify({ error: `Failed to fetch fields: ${fieldsResponse.status}`, details: errorText }), {
          status: fieldsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fieldsData = await fieldsResponse.json();
      const fields = fieldsData.values || [];

      const allOperations: { fieldId: string; fieldName: string; operations: unknown[] }[] = [];

      for (const field of fields) {
        const fieldId = field.id;
        const fieldName = field.name || "Unknown Field";

        const opsResponse = await callJohnDeereApi(
          accessToken,
          `/organizations/${orgId}/fields/${fieldId}/fieldOperations?fieldOperationType=HARVEST`
        );

        if (opsResponse.ok) {
          const opsData = await opsResponse.json();
          allOperations.push({
            fieldId,
            fieldName,
            operations: opsData.values || [],
          });
        }
      }

      return new Response(JSON.stringify({ values: allOperations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
