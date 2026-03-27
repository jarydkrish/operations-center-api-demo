import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { optionsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, isResponse } from "../_shared/auth.ts";
import {
  callJohnDeereApi,
  callJohnDeereUrl,
  getValidToken,
  getUserConnection,
  JOHN_DEERE_API_BASE,
  Connection,
} from "../_shared/john-deere.ts";
import {
  convertBoundaryToGeoJSON,
  extractClients,
  extractFarms,
  JdLink,
  JdBoundary,
  JdBoundaryPoint,
  JdRing,
  JdField,
} from "../_shared/boundaries.ts";

async function fetchAllFieldsPaginated(accessToken: string, orgId: string): Promise<JdField[]> {
  const allFields: JdField[] = [];
  let url: string | null = `${JOHN_DEERE_API_BASE}/organizations/${orgId}/fields?embed=activeBoundary,clients,farms`;

  while (url) {
    const response = await callJohnDeereUrl(accessToken, url);
    if (!response.ok) {
      throw new Error(`John Deere API error: ${response.status}`);
    }
    const data = await response.json();
    const values = data.values || [];
    allFields.push(...values);

    const nextLink = (data.links || []).find((l: JdLink) => l.rel === "nextPage");
    url = nextLink ? nextLink.uri : null;
  }

  return allFields;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const authResult = await getAuthenticatedUser(req);
    if (isResponse(authResult)) return authResult;
    const { user, supabase } = authResult;

    const connection = await getUserConnection(supabase, user.id);
    if (!connection) {
      return errorResponse("No John Deere connection found", 404);
    }

    const accessToken = await getValidToken(supabase, connection);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "organizations") {
      const response = await callJohnDeereApi(accessToken, "/organizations");

      if (!response.ok) {
        const errorText = await response.text();
        return errorResponse(`John Deere API error: ${response.status}`, response.status, errorText);
      }

      const data = await response.json();
      return jsonResponse(data);
    }

    if (action === "select-organization") {
      const { orgId, orgName } = await req.json();

      if (!orgId) {
        return errorResponse("Missing orgId", 400);
      }

      await supabase
        .from("john_deere_connections")
        .update({
          selected_org_id: orgId,
          selected_org_name: orgName || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return jsonResponse({ success: true });
    }

    if (action === "fields") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return errorResponse("No organization selected", 400);
      }

      const response = await callJohnDeereApi(accessToken, `/organizations/${orgId}/fields`);

      if (!response.ok) {
        const errorText = await response.text();
        return errorResponse(`John Deere API error: ${response.status}`, response.status, errorText);
      }

      const data = await response.json();
      return jsonResponse(data);
    }

    if (action === "harvest-operations") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return errorResponse("No organization selected", 400);
      }

      const fieldsResponse = await callJohnDeereApi(accessToken, `/organizations/${orgId}/fields`);

      if (!fieldsResponse.ok) {
        const errorText = await fieldsResponse.text();
        return errorResponse(`Failed to fetch fields: ${fieldsResponse.status}`, fieldsResponse.status, errorText);
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

      return jsonResponse({ values: allOperations });
    }

    if (action === "seeding-operations") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return errorResponse("No organization selected", 400);
      }

      const fieldsResponse = await callJohnDeereApi(accessToken, `/organizations/${orgId}/fields`);

      if (!fieldsResponse.ok) {
        const errorText = await fieldsResponse.text();
        return errorResponse(`Failed to fetch fields: ${fieldsResponse.status}`, fieldsResponse.status, errorText);
      }

      const fieldsData = await fieldsResponse.json();
      const fields = fieldsData.values || [];

      const allOperations: { fieldId: string; fieldName: string; operations: unknown[] }[] = [];

      for (const field of fields) {
        const fieldId = field.id;
        const fieldName = field.name || "Unknown Field";

        const opsResponse = await callJohnDeereApi(
          accessToken,
          `/organizations/${orgId}/fields/${fieldId}/fieldOperations?fieldOperationType=SEEDING`
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

      return jsonResponse({ values: allOperations });
    }

    if (action === "import-fields") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return errorResponse("No organization selected", 400);
      }

      const allFields = await fetchAllFieldsPaginated(accessToken, orgId);
      let withoutBoundaries = 0;

      for (const field of allFields) {
        let boundaryGeojson = null;
        let boundaryAreaValue = null;
        let boundaryAreaUnit = null;
        let activeBoundary = false;

        const boundary = field.activeBoundary
          || (field.boundaries && field.boundaries.find((b: JdBoundary) => b.active))
          || (field.boundaries && field.boundaries[0])
          || null;

        if (boundary) {
          boundaryGeojson = convertBoundaryToGeoJSON(boundary);
          if (boundary.area) {
            boundaryAreaValue = boundary.area.valueAsDouble;
            boundaryAreaUnit = boundary.area.unit;
          }
          activeBoundary = boundary.active !== false;
        }

        if (!boundaryGeojson) {
          withoutBoundaries++;
        }

        let clientName: string | null = null;
        let clientId: string | null = null;
        let farmName: string | null = null;
        let farmId: string | null = null;

        const embeddedClients = extractClients(field);
        if (embeddedClients.length > 0) {
          clientName = embeddedClients[0].name || null;
          clientId = embeddedClients[0].id || null;
        } else {
          const clientsLink = field.links?.find((l: JdLink) => l.rel === "clients");
          if (clientsLink) {
            try {
              const clientsResp = await callJohnDeereUrl(accessToken, clientsLink.uri);
              if (clientsResp.ok) {
                const clientsData = await clientsResp.json();
                const firstClient = (clientsData.values || [])[0];
                if (firstClient) {
                  clientName = firstClient.name || null;
                  clientId = firstClient.id || null;
                }
              }
            } catch (_) { /* skip client fetch errors */ }
          }
        }

        const embeddedFarms = extractFarms(field);
        if (embeddedFarms.length > 0) {
          farmName = embeddedFarms[0].name || null;
          farmId = embeddedFarms[0].id || null;
        } else {
          const farmsLink = field.links?.find((l: JdLink) => l.rel === "farms");
          if (farmsLink) {
            try {
              const farmsResp = await callJohnDeereUrl(accessToken, farmsLink.uri);
              if (farmsResp.ok) {
                const farmsData = await farmsResp.json();
                const firstFarm = (farmsData.values || [])[0];
                if (firstFarm) {
                  farmName = firstFarm.name || null;
                  farmId = firstFarm.id || null;
                }
              }
            } catch (_) { /* skip farm fetch errors */ }
          }
        }

        const now = new Date().toISOString();
        await supabase
          .from("fields")
          .upsert({
            user_id: user.id,
            org_id: orgId,
            jd_field_id: field.id,
            name: field.name || "Unnamed Field",
            boundary_geojson: boundaryGeojson,
            boundary_area_value: boundaryAreaValue,
            boundary_area_unit: boundaryAreaUnit,
            active_boundary: activeBoundary,
            client_name: clientName,
            client_id: clientId,
            farm_name: farmName,
            farm_id: farmId,
            raw_response: field,
            imported_at: now,
            updated_at: now,
          }, { onConflict: "user_id,org_id,jd_field_id" });
      }

      const { data: storedFields } = await supabase
        .from("fields")
        .select("*")
        .eq("user_id", user.id)
        .eq("org_id", orgId);

      return jsonResponse({
        fields: storedFields || [],
        totalImported: allFields.length,
        withoutBoundaries,
      });
    }

    if (action === "get-stored-fields") {
      const orgId = connection.selected_org_id;

      if (!orgId) {
        return errorResponse("No organization selected", 400);
      }

      const { data: storedFields, error: fieldsError } = await supabase
        .from("fields")
        .select("*")
        .eq("user_id", user.id)
        .eq("org_id", orgId);

      if (fieldsError) {
        return errorResponse(fieldsError.message, 500);
      }

      return jsonResponse({ fields: storedFields || [] });
    }

    return errorResponse("Unknown action", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(error.message, 500);
  }
});
