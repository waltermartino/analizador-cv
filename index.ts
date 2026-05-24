import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const payload = await req.json()
  const record = payload.record 
  const cvUrl = record.column_cv_url 
  const postId = record.id 

  // 1. Configuración de clientes
  const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  console.log("Iniciando análisis con Gemini para el postulante ID:", postId)

  // 2. Llamada a Gemini 3.5
  const result = await model.generateContent([
    "Extraé todo el texto completo del CV y proporcioná un resumen ejecutivo profesional.",
    { text: `URL del documento: ${cvUrl}` }
  ])
  
  const resumen = result.response.text()

  // 3. Guardar el resultado en la tabla 'postulantes'
  const { error } = await supabase
    .from('postulantes')
    .update({ column_cv_texto_extraido: resumen })
    .eq('id', postId)

  if (error) {
    console.error("Error al escribir en la BD:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log("¡Éxito! Texto extraído y guardado en la fila:", postId)

  return new Response(JSON.stringify({ status: "success" }), { 
    headers: { "Content-Type": "application/json" } 
  })
})
