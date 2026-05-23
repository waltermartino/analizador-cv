import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Esta es la función que recibirá los datos cuando se inserte un postulante
serve(async (req) => {
  // Recibimos los datos del nuevo postulante que se guardó en la tabla
  const { record } = await req.json()
  const cvUrl = record.column_cv_url 

  console.log("Procesando CV de la URL:", cvUrl)

  // Aquí más adelante conectaremos con Gemini
  
  return new Response(
    JSON.stringify({ message: "Función recibida correctamente" }),
    { headers: { "Content-Type": "application/json" } },
  )
})
