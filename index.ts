// Esta es la forma moderna compatible con Deno v2
Deno.serve(async (req) => {
  console.log("¡Función ejecutada exitosamente!")
  
  return new Response(
    JSON.stringify({ message: "La función está viva y funcionando" }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    },
  )
})
