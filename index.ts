import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  console.log("LOG: Iniciando función...")

  try {
    const payload = await req.json()
    console.log("LOG: Payload recibido.")
    
    const record = payload.record 
    const cvUrl = record.column_cv_url 
    const postId = record.id 
    console.log("LOG: Datos extraídos. ID:", postId)

    // Configuración de Gemini
    console.log("LOG: Configurando Gemini...")
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

    // Llamada a la IA
    console.log("LOG: Enviando solicitud a Gemini...")
    const result = await model.generateContent([
      "Analizá el CV en esta URL y extraé un resumen ejecutivo detallado.",
      { text: `URL del documento: ${cvUrl}` }
    ])
    
    const resumen = result.response.text()
    console.log("LOG: Gemini respondió correctamente.")

    // Guardado en Supabase
    console.log("LOG: Intentando guardar en la base de datos...")
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { error } = await supabase
      .from('postulantes')
      .update({ column_cv_texto_extraido: resumen })
      .eq('id', postId)

    if (error) {
      console.error("LOG ERROR: Falló el guardado en BD:", error)
      throw error
    }

    console.log("LOG: ¡Éxito total! Datos guardados.")

    return new Response(JSON.stringify({ status: "success" }), { 
      headers: { "Content-Type": "application/json" } 
    })
    
  } catch (err) {
    console.error("LOG ERROR: El proceso se detuvo en un punto crítico:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
