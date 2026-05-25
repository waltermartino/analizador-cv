import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

serve(async (req) => {
  try {
    const { filePath } = await req.json();
    
    // Normalización automática de la ruta: 
    // Si la ruta viene como "cv/cv/archivo", la limpia a "cv/archivo" 
    // o maneja la estructura que sea necesaria para que el Storage la encuentre.
    const cleanPath = filePath.replace("cv/cv/", "cv/");
    
    console.log("LOG: Procesando archivo en ruta:", cleanPath);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.storage
      .from('cv') 
      .download(cleanPath);

    if (error) throw error;

    const arrayBuffer = await data.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Analiza este documento de postulante. Extrae la información relevante y responde estrictamente en formato JSON: 
    {
      "nombre": "Nombre completo",
      "perfil": "Resumen breve del perfil profesional",
      "experiencia": "Resumen de experiencia laboral",
      "educacion": "Nivel educativo y formación",
      "habilidades": ["habilidad1", "habilidad2"]
    }`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: data.type
        }
      },
      prompt
    ]);

    return new Response(result.response.text(), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("LOG: Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
