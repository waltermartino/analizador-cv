import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  try {
    const { filePath } = await req.json();
    console.log("Archivo solicitado:", filePath);

    // 1. Inicializar Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Descargar el archivo desde el bucket 'cv'
    // La ruta completa debe ser la que reconoce el bucket (ej: 'cv/1779507835640000.pdf')
    const { data, error } = await supabase.storage
      .from('cv')
      .download(filePath);

    if (error) throw error;

    // 3. Convertir a Base64
    const arrayBuffer = await data.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // 4. Analizar con Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: data.type
        }
      },
      "Analiza este CV y extrae: nombre, perfil, experiencia, educación y habilidades en JSON."
    ]);

    return new Response(result.response.text(), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
