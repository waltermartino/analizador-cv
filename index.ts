import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { record } = await req.json()
  const cvUrl = record.column_cv_url 
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  // 1. Aquí llamaríamos a Gemini enviándole la URL del archivo
  // (Nota: Gemini necesita leer el archivo, supongamos que Gemini lo procesa vía URL)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Analiza el siguiente CV y dame un resumen breve de sus habilidades principales: ${cvUrl}` }] }]
    })
  })

  const data = await response.json()
  const resumen = data.candidates[0].content.parts[0].text

  // 2. Aquí devolveremos el resumen para que el sistema lo use
  return new Response(
    JSON.stringify({ resumen: resumen }),
    { headers: { "Content-Type": "application/json" } },
  )
})
