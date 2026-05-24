import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

serve(async (req) => {
  const payload = await req.json()
  const record = payload.record 
  const cvUrl = record.column_cv_url 

  // Inicializamos Gemini
  const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  console.log("Intentando leer el CV en:", cvUrl)

  // Le pedimos a Gemini que extraiga el texto del PDF
  const result = await model.generateContent([
    "Extraé el texto de este documento y mostrame solo los primeros 500 caracteres:",
    {
      fileData: {
        fileUri: cvUrl,
        mimeType: "application/pdf",
      },
    },
  ])

  const response = await result.response
  console.log("Texto extraído por Gemini:", response.text())

  return new Response(
    JSON.stringify({ status: "success", preview: response.text() }),
    { headers: { "Content-Type": "application/json" } },
  )
})
