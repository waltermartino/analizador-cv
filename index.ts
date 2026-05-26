import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  console.log("--- INICIO DE EJECUCIÓN ---");
  
  try {
    const body = await req.json();
    const { filePath, postulanteId } = body;
    console.log(`Paso 1: Recibido filePath=${filePath} y postulanteId=${postulanteId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Descarga
    const { data, error } = await supabase.storage.from('cv').download(filePath);
    if (error) {
      console.error("ERROR en Paso 2 (Storage):", error.message);
      return new Response(JSON.stringify({ error: "Storage error: " + error.message }), { status: 400 });
    }
    console.log("Paso 2: Archivo descargado correctamente.");

    // 2. IA
    const buffer = await data.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    
    console.log("Paso 3: Enviando a Gemini...");
    const res = await model.generateContent([
      "Analiza este CV y extrae: nombre, perfil, experiencia, educacion, habilidades. Devuelve solo JSON puro.",
      { inlineData: { data: base64, mimeType: data.type } }
    ]);

    const jsonText = res.response.text().replace(/```json|```/g, "").trim();
    console.log("Paso 4: IA respondió. JSON bruto:", jsonText.substring(0, 50) + "...");
    const json = JSON.parse(jsonText);

    // 3. Registro (Aquí está el cambio clave)
    console.log("Paso 5: Intentando actualizar tabla postulantes...");
    const { data: dbData, error: dbError } = await supabase
      .from('postulantes')
      .update(json)
      .eq('id', postulanteId)
      .select(); // El .select() es vital para ver si realmente actualizó algo

    if (dbError) {
      console.error("ERROR en Paso 5 (Base de Datos):", dbError);
      return new Response(JSON.stringify({ error: "DB Error: " + dbError.message }), { status: 500 });
    }
    
    if (!dbData || dbData.length === 0) {
        console.warn("ADVERTENCIA: Se ejecutó el update pero NO se encontró ninguna fila con ese ID.");
        return new Response(JSON.stringify({ error: "ID no encontrado en tabla" }), { status: 404 });
    }

    console.log("Paso 6: ¡Éxito total! Fila actualizada.");
    return new Response(JSON.stringify({ success: true, updated: dbData }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("ERROR CRÍTICO:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
