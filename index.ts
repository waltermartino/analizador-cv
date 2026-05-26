import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const postulanteId = record.id;
    const ofertaId = record.column_oferta_id;
    const fullUrl = record.column_cv_url; 
    const filePath = fullUrl.split('/cv/').pop(); 

    console.log(`[PASO 1] Procesando ID: ${postulanteId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Descarga (Paso 2)
    const { data: fileData, error: dlError } = await supabase.storage.from('cv').download(filePath);
    if (dlError) throw new Error("Error en descarga: " + dlError.message);

    // 2. Transcripción (Paso 3 y 4)
    const buffer = await fileData.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const res = await model.generateContent([
      "Transcribe todo el CV a texto plano.",
      { inlineData: { data: base64, mimeType: fileData.type } }
    ]);
    const textoCv = res.response.text().trim();

    // 3. Obtener Oferta (PASO 7)
    console.log(`[PASO 7] Consultando oferta ID: ${ofertaId}`);
    const { data: oferta, error: ofError } = await supabase
      .from('ofertas_laborales')
      .select('column_puesto, column_descripcion, column_habilidades')
      .eq('id', ofertaId)
      .single();
    if (ofError) throw new Error("No se encontró la oferta laboral.");

    // 4. Ranking (PASO 8)
    console.log("[PASO 8] Comparando CV con oferta...");
    const rankingRes = await model.generateContent(`
      Eres un reclutador experto. Evalúa el siguiente CV para el puesto: ${oferta.column_puesto}.
      Descripción: ${oferta.column_descripcion}. Habilidades: ${oferta.column_habilidades}.
      CV: ${textoCv}.
      Devuelve un JSON con: {"puntaje": numero_del_0_al_100, "justificacion": "texto corto"}.
    `);
    const rankingJson = JSON.parse(rankingRes.response.text().replace(/```json|```/g, "").trim());

    // 5. Registro Final (PASO 9)
    console.log("[PASO 9] Guardando resultados...");
    await supabase.from('postulantes').update({
      column_cv_texto_extraido: textoCv,
      column_rankeo_ge: rankingJson.puntaje,
      column_rankeo_ge_justificacion: rankingJson.justificacion
    }).eq('id', postulanteId);

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[ERROR FINAL]:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
