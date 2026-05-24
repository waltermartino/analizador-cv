import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("--- ¡Iniciando despliegue de procesador de CV v3.0! ---")

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record 
    const cvUrl = record.column_cv_url 
    const postId = record.id 

    console.log("Procesando Postulante ID:", postId)
    console.log("URL:", cvUrl)

    // 1. Configuración de Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

    // 2. Análisis del documento
    const prompt = "Analizá este CV y devolvé un resumen ejecutivo detallado con nombre, experiencia y habilidades."
    const result = await model.generateContent([
      prompt,
      { text: `URL del documento: ${cvUrl}` }
    ])
    
    const resumen = result.response.text()
    console.log("Resumen obtenido exitosamente.")

    // 3. Guardado en Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { error } = await supabase
      .from('postulantes')
      .update({ column_cv_texto_extraido: resumen })
      .eq('id', postId)

    if (error) throw error

    console.log("¡Éxito total! Datos guardados en la tabla.")

    return new Response(JSON.stringify({ status: "success" }), { 
      headers: { "Content-Type": "application/json" } 
    })
    
  } catch (err) {
    console.error("Error crítico en el proceso:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
