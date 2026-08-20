const API_BASE = "https://api4cars.com/wp-json/carapi/v1";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.CARAPI_KEY;
  const apiSecret = process.env.CARAPI_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({
      success: false,
      error:
        "CARAPI_KEY oder CARAPI_SECRET ist in Vercel nicht konfiguriert."
    });
  }

  const {
    action = "vehicle",
    hsn,
    tsn,
    brand,
    model,
    generation,
    type
  } = req.query;

  try {
    let endpoint;
    const params = new URLSearchParams();

    switch (action) {
      /*
       * HSN + TSN
       * GET /vehicle?hsn=0603&tsn=COB
       */
      case "vehicle":
        if (!hsn || !tsn) {
          return res.status(400).json({
            success: false,
            error: "HSN und TSN werden benötigt."
          });
        }

        endpoint = "/vehicle";
        params.set("hsn", String(hsn).trim());
        params.set("tsn", String(tsn).trim());
        break;

      /*
       * Fahrzeugliste / Modellsuche
       * GET /vehicles?brand=...&model=...
       */
      case "vehicles":
        endpoint = "/vehicles";

        if (brand) params.set("brand", String(brand).trim());
        if (model) params.set("model", String(model).trim());

        params.set("page", "1");
        params.set("per_page", "50");
        break;

      /*
       * Marken
       */
      case "brands":
        endpoint = "/brands";
        params.set("onlyWithFitments", "0");
        break;

      /*
       * Modelle einer Marke
       */
      case "models":
        if (!brand) {
          return res.status(400).json({
            success: false,
            error: "Für die Modellsuche wird eine Marke benötigt."
          });
        }

        endpoint = "/models";
        params.set("brand", String(brand).trim());
        break;

      /*
       * Baureihen / Serien
       */
      case "series":
        if (!brand) {
          return res.status(400).json({
            success: false,
            error: "Für die Baureihensuche wird eine Marke benötigt."
          });
        }

        endpoint = "/series";
        params.set("brand", String(brand).trim());
        params.set("onlyWithFitments", "0");
        break;

      /*
       * Generationen
       */
      case "generations":
        if (!brand || !model) {
          return res.status(400).json({
            success: false,
            error: "Marke und Modell werden benötigt."
          });
        }

        endpoint = "/generations";
        params.set("brand", String(brand).trim());
        params.set("model", String(model).trim());
        break;

      /*
       * Motoren
       */
      case "engines":
        if (!brand || !model || !generation) {
          return res.status(400).json({
            success: false,
            error: "Marke, Modell und Generation werden benötigt."
          });
        }

        endpoint = "/engines";
        params.set("brand", String(brand).trim());
        params.set("model", String(model).trim());
        params.set("generation", String(generation).trim());
        break;

      /*
       * Typen
       */
      case "types":
        if (!brand || !model) {
          return res.status(400).json({
            success: false,
            error: "Marke und Modell werden benötigt."
          });
        }

        endpoint = "/types";
        params.set("brand", String(brand).trim());
        params.set("model", String(model).trim());
        break;

      /*
       * Motorvarianten
       */
      case "motors":
        if (!brand || !model) {
          return res.status(400).json({
            success: false,
            error: "Marke und Modell werden benötigt."
          });
        }

        endpoint = "/motors";
        params.set("brand", String(brand).trim());
        params.set("model", String(model).trim());

        if (type) {
          params.set("type", String(type).trim());
        }
        break;

      /*
       * Versicherung / Typklassen
       */
      case "insurance":
        endpoint = "/insurance";

        if (hsn) params.set("hsn", String(hsn).trim());
        if (tsn) params.set("tsn", String(tsn).trim());
        if (brand) params.set("brand", String(brand).trim());
        if (model) params.set("model", String(model).trim());
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unbekannte Aktion: ${action}`
        });
    }

    const url = `${API_BASE}${endpoint}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret
      }
    });

    let data;

    try {
      data = await response.json();
    } catch {
      data = {
        error: "Die API hat keine gültige JSON-Antwort geliefert."
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.message ||
          data?.error ||
          `CarAPI Fehler (${response.status})`,
        status: response.status,
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      action,
      data
    });

  } catch (error) {
    console.error("CarAPI request failed:", error);

    return res.status(500).json({
      success: false,
      error: "Fehler bei der Verbindung zur Fahrzeugdatenbank.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
}