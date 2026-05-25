import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. Mensaje de control para verificar que corremos la versión nueva
  console.log("--- PROCESANDO CV: Iniciando lógica v4.0 ---")

  try {
    const payload = await req.json()
    const record = payload.record 
    const cvUrl = record.column_cv_url 
    const postId = record.id 

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

    const result = await model.generateContent([
      "Analizá el contenido de este CV y devolvé un resumen profesional.",
      { text: `URL del archivo: ${cvUrl}` }
    ])
    
    const resumen = result.response.text()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    await supabase
      .from('postulantes')
      .update({ column_cv_texto_extraido: resumen })
      .eq('id', postId)

    console.log("¡Éxito! Texto extraído y guardado para ID:", postId)

    return new Response(JSON.stringify({ status: "success" }), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (err) {
    console.error("Error en la ejecución:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
