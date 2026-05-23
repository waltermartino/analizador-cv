import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  // 1. Recibimos el paquete de datos que envía el Webhook
  const payload = await req.json()
  
  // 2. Extraemos la información del postulante (el record)
  const record = payload.record
  const cvUrl = record.column_cv_url 

  console.log("Procesando CV de:", cvUrl)

  // 3. Obtenemos la llave de Gemini (asegurate de tenerla en Secrets)
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  // 4. Llamamos a Gemini
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Analiza el contenido del CV en esta URL y dame un resumen breve: ${cvUrl}` }] }]
    })
  })

  const data = await response.json()
  const resumen = data.candidates[0].content.parts[0].text

  // 5. ¡Importante! Aquí podríamos incluso actualizar la tabla con el resumen
  // pero por ahora, solo confirmamos que la función terminó
  return new Response(
    JSON.stringify({ message: "CV procesado", resumen: resumen }),
    { headers: { "Content-Type": "application/json" } },
  )
})
