
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log Headers for debugging
    console.log("Headers Received:", JSON.stringify(Object.fromEntries(req.headers.entries())))

    const body = await req.json()
    const { amount, feature } = body
    console.log(`Processing deduction: ${amount} for ${feature}`)
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("No Authorization header provided")

    const token = authHeader.replace(/^Bearer\s+/, '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
        console.error("Auth verification failed:", userError)
        return new Response(JSON.stringify({ error: "Unauthorized access or invalid token" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    console.log(`Deduction for user: ${user.id}`)

    // Get current profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
        console.error("Profile fetch error:", profileError)
        throw profileError
    }

    if (profile.credits < amount) {
        return new Response(
            JSON.stringify({ error: "Insufficient credits for this operation" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        )
    }

    // Deduct
    const newBalance = Math.max(0, parseFloat((profile.credits - amount).toFixed(2)))
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', user.id)

    if (updateError) {
        console.error("Balance update error:", updateError)
        throw updateError
    }

    // Log Audit
    await supabaseClient.from('audit_logs').insert({
        user_id: user.id,
        type: 'billing',
        message: `Deducted ${amount} credits for ${feature}`,
        metadata: { amount, feature, newBalance }
    })

    return new Response(
      JSON.stringify({ success: true, newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Edge function crash:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
