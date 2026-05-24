import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0"

serve(async (req) => {
  const payload = await req.json()
  const record = payload.record 
  const cvUrl = record.column_cv_url 

  // Usamos el modelo más actual y eficiente: gemini-3.5-flash
  const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

  console.log("Procesando con modelo: gemini-3.5-flash")

  try {
    const result = await model.generateContent([
      "Analizá el siguiente CV y extraé: Nombre completo, años de experiencia y habilidades principales. Devolvé un resumen ejecutivo claro.",
      { text: `URL del documento: ${cvUrl}` }
    ])

    const response = await result.response
    const textoResumen = response.text()
    
    console.log("Resumen generado:", textoResumen)

    // Aquí después agregaremos el código para guardar en la BD
    return new Response(JSON.stringify({ 
      status: "success", 
      resumen: textoResumen 
    }), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (error) {
    console.error("Error al llamar a Gemini 3.5:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
