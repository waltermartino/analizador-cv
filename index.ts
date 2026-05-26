import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  try {
    const { filePath } = await req.json();
    console.log("Analizando archivo:", filePath);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Descargar el archivo desde el bucket 'cv'
    const { data, error } = await supabase.storage.from('cv').download(filePath);
    if (error) throw error;

    // 2. Convertir a Base64
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64String = btoa(binary);

    // 3. Configurar Gemini 3.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 4. Generar contenido
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: data.type
        }
      },
      "Analiza este CV y extrae: nombre, perfil, experiencia, educación y habilidades. Devuelve solo un objeto JSON puro, sin texto adicional."
    ]);

    // 5. Limpieza de respuesta para evitar errores de formato
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    return new Response(responseText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error crítico:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
