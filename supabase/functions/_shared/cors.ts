export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: string, status = 400, details?: string): Response {
  return jsonResponse({ error, ...(details ? { details } : {}) }, status);
}

export function optionsResponse(): Response {
  return new Response(null, { status: 200, headers: corsHeaders });
}
