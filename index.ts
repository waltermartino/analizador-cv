import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const postulanteId = record.id;
    const fullUrl = record.column_cv_url; 
    const filePath = fullUrl.split('/cv/').pop(); 

    console.log(`[PASO 1] Procesando ID: ${postulanteId}, Path: ${filePath}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Descarga
    console.log("[PASO 2] Descargando archivo...");
    const { data, error } = await supabase.storage.from('cv').download(filePath);
    if (error) throw new Error("Error en descarga: " + error.message);

    // 2. IA - Transcripción pura
    console.log("[PASO 3] Consultando IA para transcripción total...");
    const buffer = await data.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    
    const res = await model.generateContent([
      "Transcribe todo el contenido de este CV a texto plano. Mantén toda la información original, no resumas, no omitas datos.",
      { inlineData: { data: base64, mimeType: data.type } }
    ]);

    const textoCompleto = res.response.text().trim();
    console.log("[PASO 4] Transcripción recibida. Longitud:", textoCompleto.length, "caracteres.");

    // 3. Registro - Guardado del texto completo
    console.log("[PASO 5] Guardando texto completo en column_cv_texto_extraido...");
    const { error: dbError } = await supabase
      .from('postulantes')
      .update({ column_cv_texto_extraido: textoCompleto }) // Guardamos el texto bruto
      .eq('id', postulanteId);

    if (dbError) throw new Error("Error en DB: " + dbError.message);

    console.log("[PASO 6] ÉXITO TOTAL: Registro actualizado con texto completo.");
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[ERROR FINAL]:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
