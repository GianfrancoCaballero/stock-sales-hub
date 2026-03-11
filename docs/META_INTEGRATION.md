# Arquitectura de Integración: Facebook Marketplace → Sistema de Gestión de Ventas

> **Fecha:** Feb 2026 | **Stack objetivo:** React + Supabase | **API:** Meta Messenger Platform v21+

---

## ⚠️ Realidad técnica que debes conocer antes de empezar

Esto es lo primero que todo documento de este tipo debe decirte claramente:

**No existe una "API de Mensajes de Facebook Marketplace" pública y directa.**

Lo que sí existe:

| Qué | Disponible | Condición |
|---|---|---|
| **Messenger Platform API** (mensajes de tu Facebook Page) | ✅ | Requiere App Review de Meta |
| Webhook de mensajes entrantes a tu Page | ✅ | `pages_messaging` permission |
| Acceso al texto del mensaje del cliente | ✅ | Con token de larga duración |
| Envío de respuestas desde tu app | ✅ | Dentro de la ventana de 24h |
| Contexto del producto de Marketplace referenciado | ⚠️ Parcial | Meta incluye `referral` en el payload si el usuario inicia desde un anuncio/listing |
| API directa de Marketplace Inbox | ❌ | No existe públicamente |
| Acceso a conversaciones de Marketplace de **otros** vendedores | ❌ | Imposible por políticas |

**Conclusión:** La arquitectura correcta es integrar la **Messenger Platform API** de tu Facebook Page. Cuando un cliente hace clic en "Enviar mensaje" en tu publicación de Marketplace, esa conversación llega al inbox de tu Page — y eso sí tiene API.

---

## 1. Arquitectura general

```
┌─────────────────┐     Mensaje desde      ┌─────────────────┐
│  Cliente en     │ ──── Marketplace ─────▶ │  Facebook Page  │
│  Marketplace    │                         │  Inbox          │
└─────────────────┘                         └────────┬────────┘
                                                     │ Webhook POST
                                                     ▼
                                            ┌────────────────────┐
                                            │  Supabase Edge     │
                                            │  Function          │
                                            │  /webhook/meta     │
                                            └────────┬───────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              ▼                      ▼                      ▼
                     ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
                     │  Validar firma │   │  Guardar en BD   │   │  Notificación    │
                     │  X-Hub-Sig-256 │   │  conversations + │   │  Realtime a      │
                     │                │   │  messages        │   │  dashboard React │
                     └────────────────┘   └──────────────────┘   └──────────────────┘
                                                                           │
                                                                           ▼
                                                                  ┌────────────────┐
                                                                  │  Dashboard     │
                                                                  │  React         │
                                                                  │  /mensajes     │
                                                                  └────────┬───────┘
                                                                           │ Responde
                                                                           ▼
                                                                  ┌────────────────┐
                                                                  │  Graph API     │
                                                                  │  POST /me/     │
                                                                  │  messages      │
                                                                  └────────────────┘
```

---

## 2. Flujo de autenticación con Meta

### 2.1 Tipo de tokens necesarios

```
Short-lived User Token (válido 1-2 horas)
    │
    │  Intercambiar vía Graph API
    ▼
Long-lived User Token (válido 60 días)
    │
    │  Obtener Page Access Token
    ▼
Page Access Token (no expira si el User Token se renueva)
```

### 2.2 Permisos requeridos (App Review obligatorio para producción)

| Permiso | Para qué | Nivel de acceso |
|---|---|---|
| `pages_messaging` | Enviar y recibir mensajes | Advanced Access |
| `pages_manage_metadata` | Suscribir webhooks a la Page | Advanced Access |
| `pages_read_engagement` | Leer conversaciones | Advanced Access |
| `pages_show_list` | Listar las pages del usuario | Standard |

> **App Review:** Necesitas enviar tu app a Meta para revisión antes de operar con usuarios reales (no rol admin/tester). El proceso tarda entre 5 y 28 días hábiles. Debes demostrar tu caso de uso con video y documentación.

### 2.3 Obtener el Page Access Token (pasos manuales iniciales)

```bash
# Paso 1: OAuth login → obtener short-lived user token
# (usar Graph API Explorer: developers.facebook.com/tools/explorer)

# Paso 2: Convertir a long-lived (60 días)
curl "https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}"

# Paso 3: Obtener Page Access Token (no expira)
curl "https://graph.facebook.com/v21.0/me/accounts
  ?access_token={LONG_LIVED_USER_TOKEN}"
# Respuesta: array de pages con su access_token permanente

# Guardar el PAGE_ACCESS_TOKEN en Supabase Vault / variable de entorno segura
```

### 2.4 Renovación automática del token

El Page Access Token generado a partir de un Long-lived User Token **no expira** mientras el usuario (admin de la page) no revoque los permisos. Aun así, implementar un job de verificación mensual:

```sql
-- Tabla para almacenar tokens de forma segura (usar Supabase Vault en prod)
CREATE TABLE meta_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL UNIQUE,
  page_name TEXT,
  access_token TEXT NOT NULL,  -- cifrado con pgsodium en producción
  token_type TEXT DEFAULT 'page',
  expires_at TIMESTAMPTZ,      -- NULL = no expira
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Configuración de Webhooks

### 3.1 Campos a suscribir

```
Webhook field       │ Qué recibes
────────────────────┼────────────────────────────────────────────
messages            │ Mensajes entrantes de clientes ← PRINCIPAL
message_deliveries  │ Confirmación de entrega de tus mensajes
message_reads       │ Confirmación de lectura
messaging_referrals │ Contexto del producto de Marketplace ← MUY IMPORTANTE
message_echoes      │ Copia de tus propios mensajes enviados
```

> **`messaging_referrals`** es el campo clave para saber de **qué publicación de Marketplace** viene la conversación. Contiene el `ref`, `source`, `ad_id` o `product_id` del listing.

### 3.2 Endpoint de verificación (GET)

Meta llama a tu endpoint con un GET para verificar que es tuyo:

```typescript
// supabase/functions/webhook-meta/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")!;

serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Verificación del webhook (GET) ──────────────────────────
  if (req.method === "GET") {
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado correctamente");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── Procesamiento de eventos (POST) ─────────────────────────
  if (req.method === "POST") {
    return await handleWebhookEvent(req);
  }

  return new Response("Method Not Allowed", { status: 405 });
});
```

### 3.3 Validación de firma HMAC-SHA256 (OBLIGATORIO en producción)

Meta firma cada POST con `X-Hub-Signature-256`. Sin esta verificación, cualquiera puede enviar datos falsos a tu endpoint.

```typescript
async function validateSignature(req: Request, rawBody: string): Promise<boolean> {
  const APP_SECRET = Deno.env.get("META_APP_SECRET")!;
  const signature  = req.headers.get("X-Hub-Signature-256") ?? "";

  if (!signature.startsWith("sha256=")) return false;

  const encoder  = new TextEncoder();
  const key      = await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computed = "sha256=" + Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  // Comparación de tiempo constante para evitar timing attacks
  return timingSafeEqual(signature, computed);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

### 3.4 Procesamiento del evento principal

```typescript
async function handleWebhookEvent(req: Request): Promise<Response> {
  const rawBody = await req.text();

  // 1. Validar firma ANTES de parsear
  if (!(await validateSignature(req, rawBody))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // 2. Verificar que es un evento de Page
  if (body.object !== "page") {
    return new Response("OK", { status: 200 }); // Ignorar otros objetos
  }

  // 3. Responder 200 INMEDIATAMENTE (Meta reintenta si tardas > 20s)
  const responsePromise = new Response("EVENT_RECEIVED", { status: 200 });

  // 4. Procesar de forma asíncrona
  EdgeRuntime.waitUntil(processEvents(body.entry));

  return responsePromise;
}

async function processEvents(entries: any[]) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service role para escribir desde Edge Function
  );

  for (const entry of entries) {
    const pageId = entry.id;

    for (const event of entry.messaging ?? []) {
      await processMessagingEvent(supabase, pageId, event);
    }
  }
}

async function processMessagingEvent(supabase: any, pageId: string, event: any) {
  const senderId  = event.sender?.id;
  const timestamp = new Date(event.timestamp);

  // ── Mensaje entrante ──────────────────────────────────────────
  if (event.message && !event.message.is_echo) {
    const threadId = event.sender.id; // PSID del usuario

    // Buscar o crear conversación
    const { data: conv } = await supabase
      .from("meta_conversations")
      .upsert({
        page_id: pageId,
        customer_psid: senderId,
        status: "unread",
        last_message_at: timestamp,
        // Datos de referral de Marketplace si están disponibles
        marketplace_product_id: event.referral?.product?.id ?? null,
        marketplace_listing_url: event.referral?.ref ?? null,
      }, {
        onConflict: "page_id,customer_psid",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    // Guardar mensaje
    await supabase.from("meta_messages").insert({
      conversation_id: conv.id,
      sender_type: "customer",
      sender_psid: senderId,
      message_mid: event.message.mid,
      text: event.message.text ?? null,
      attachments: event.message.attachments ?? null,
      sent_at: timestamp,
    });

    // Obtener perfil del usuario si no lo tenemos
    await enrichCustomerProfile(supabase, conv.id, senderId, pageId);
  }

  // ── Referral de Marketplace (se recibe antes o junto al primer mensaje) ──
  if (event.referral) {
    await supabase
      .from("meta_conversations")
      .update({
        marketplace_product_id: event.referral.product?.id,
        marketplace_listing_url: event.referral.ref,
        referral_source: event.referral.source,
      })
      .eq("page_id", pageId)
      .eq("customer_psid", senderId);
  }
}

async function enrichCustomerProfile(
  supabase: any,
  conversationId: string,
  psid: string,
  pageId: string
) {
  // Solo enriquecer si no tenemos nombre aún
  const { data: existing } = await supabase
    .from("meta_conversations")
    .select("customer_name")
    .eq("id", conversationId)
    .single();

  if (existing?.customer_name) return;

  // Llamar a Graph API para obtener nombre (requiere page token)
  const { data: tokenRow } = await supabase
    .from("meta_tokens")
    .select("access_token")
    .eq("page_id", pageId)
    .single();

  if (!tokenRow) return;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${psid}?fields=name,profile_pic&access_token=${tokenRow.access_token}`
  );
  if (!res.ok) return;

  const profile = await res.json();
  await supabase
    .from("meta_conversations")
    .update({
      customer_name: profile.name,
      customer_profile_pic: profile.profile_pic,
    })
    .eq("id", conversationId);
}
```

---

## 4. Modelo de datos en Supabase

### 4.1 Migraciones SQL

```sql
-- ═══════════════════════════════════════════════════════════════
-- Tabla: meta_conversations
-- Una fila por hilo de conversación (cliente ↔ page)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.meta_conversations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id                 TEXT NOT NULL,
  customer_psid           TEXT NOT NULL,          -- Page-Scoped ID (no es el UID real)
  customer_name           TEXT,                    -- Nombre obtenido de Graph API
  customer_profile_pic    TEXT,                    -- URL del avatar
  status                  TEXT NOT NULL DEFAULT 'unread'
                            CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  last_message_at         TIMESTAMPTZ,
  last_message_preview    TEXT,                    -- Para mostrar en lista
  -- Marketplace context
  marketplace_product_id  TEXT,                    -- ID del producto del listing (si disponible)
  marketplace_listing_url TEXT,                    -- URL de referral
  referral_source         TEXT,                    -- 'MESSENGER_CODE', 'ADS', 'SHORTLINK', etc.
  -- Relación interna (opcional): vincular con tu tabla products
  internal_product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, customer_psid)
);

-- ═══════════════════════════════════════════════════════════════
-- Tabla: meta_messages
-- Un mensaje por fila. Soporta text + attachments.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.meta_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.meta_conversations(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('customer', 'business')),
  sender_psid     TEXT,                   -- PSID del remitente
  message_mid     TEXT UNIQUE,            -- ID interno de Meta (para deduplicación)
  text            TEXT,                   -- Cuerpo del mensaje
  attachments     JSONB,                  -- Array de attachments (imagen, audio, etc.)
  is_read         BOOLEAN DEFAULT false,
  sent_at         TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- Tabla: meta_tokens (tokens de acceso por page)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.meta_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id           TEXT NOT NULL UNIQUE,
  page_name         TEXT,
  access_token      TEXT NOT NULL, -- En producción: cifrar con pgsodium
  expires_at        TIMESTAMPTZ,   -- NULL = no expira (page token)
  last_verified_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- Índices
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_meta_conversations_status    ON public.meta_conversations(status);
CREATE INDEX idx_meta_conversations_last_msg  ON public.meta_conversations(last_message_at DESC);
CREATE INDEX idx_meta_messages_conversation   ON public.meta_messages(conversation_id, sent_at DESC);
CREATE INDEX idx_meta_messages_mid            ON public.meta_messages(message_mid);

-- ═══════════════════════════════════════════════════════════════
-- Trigger: actualizar last_message_preview en conversación
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.meta_conversations SET
    last_message_at      = NEW.sent_at,
    last_message_preview = LEFT(COALESCE(NEW.text, '[Adjunto]'), 100),
    status               = CASE WHEN NEW.sender_type = 'customer' THEN 'unread' ELSE status END,
    updated_at           = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_meta_message
  AFTER INSERT ON public.meta_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_new_message();

-- ═══════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.meta_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_tokens        ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados (todos los vendedores pueden ver conversaciones)
CREATE POLICY "Authenticated users can view conversations"
  ON public.meta_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update conversations"
  ON public.meta_conversations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view messages"
  ON public.meta_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages"
  ON public.meta_messages FOR INSERT TO authenticated WITH CHECK (true);

-- Tokens: solo admins
CREATE POLICY "Admins can manage meta tokens"
  ON public.meta_tokens FOR ALL TO authenticated USING (public.is_admin());
```

### 4.2 Relación con `products` del inventario

El campo `internal_product_id` en `meta_conversations` permite vincular manualmente (o automáticamente si el `marketplace_product_id` coincide con un SKU) la conversación con un producto del inventario. 

```sql
-- Matching automático por metadata del producto (si gestionas listings vía API)
UPDATE public.meta_conversations c
SET internal_product_id = p.id
FROM public.products p
WHERE c.marketplace_product_id IS NOT NULL
  AND p.sku = c.marketplace_product_id
  AND c.internal_product_id IS NULL;
```

---

## 5. Diagrama de flujo completo

```
Cliente en Marketplace
        │
        │ Clic "Enviar mensaje" en el listing
        ▼
Facebook Messenger / Inbox de Page
        │
        │ POST https://tu-edge-function.supabase.co/webhook/meta
        │ Header: X-Hub-Signature-256: sha256=...
        │ Body: { object: "page", entry: [...] }
        ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Edge Function                  │
│                                                      │
│  1. GET /webhook?hub.mode=subscribe → responder 200  │
│  2. POST /webhook                                    │
│     a. Validar HMAC-SHA256 (X-Hub-Signature-256)    │
│     b. Responder 200 INMEDIATAMENTE                  │
│     c. EdgeRuntime.waitUntil(processEvents(...))     │
│        ├── Upsert en meta_conversations              │
│        ├── Insert en meta_messages                   │
│        ├── Fetch customer name de Graph API          │
│        └── Trigger actualiza last_message_preview    │
└─────────────────────────────────────────────────────┘
        │
        │ Supabase Realtime (broadcast)
        ▼
┌─────────────────────────────────────────────────────┐
│              Dashboard React (/mensajes)              │
│                                                      │
│  useEffect → supabase.channel('meta_messages')       │
│    .on('postgres_changes', ...)                      │
│    → actualizar lista de conversaciones en tiempo    │
│      real sin polling                                │
│                                                      │
│  Vista de conversación:                              │
│  - Nombre del cliente (de Graph API)                 │
│  - Producto referenciado (marketplace_product_id)    │
│  - Historial de mensajes                             │
│  - [Estado: no leído / respondido]                   │
│  - [Botón: Responder aquí | Abrir en Messenger]      │
└─────────────────────────────────────────────────────┘
        │
        │ (Opción A) Respuesta directa desde dashboard
        ▼
┌─────────────────────────────────────────────────────┐
│  Supabase Edge Function: POST /meta/send-message     │
│                                                      │
│  fetch("https://graph.facebook.com/v21.0/me/        │
│    messages", {                                      │
│    method: "POST",                                   │
│    body: { recipient: { id: psid }, message: {...} } │
│    headers: { Authorization: PAGE_ACCESS_TOKEN }     │
│  })                                                  │
└─────────────────────────────────────────────────────┘
```

---

## 6. Envío de respuestas (Opción A)

```typescript
// supabase/functions/meta-send-message/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { conversation_id, text } = await req.json();

  // Verificar usuario autenticado (JWT del dashboard)
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Obtener datos de la conversación
  const { data: conv } = await supabase
    .from("meta_conversations")
    .select("customer_psid, page_id")
    .eq("id", conversation_id)
    .single();

  if (!conv) return new Response("Conversation not found", { status: 404 });

  // Obtener token de la page
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: tokenRow } = await supabaseAdmin
    .from("meta_tokens")
    .select("access_token")
    .eq("page_id", conv.page_id)
    .single();

  if (!tokenRow) return new Response("Token not found", { status: 500 });

  // ── ENVIAR MENSAJE VIA GRAPH API ────────────────────────────────
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${tokenRow.access_token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: conv.customer_psid },
        message: { text },
        messaging_type: "RESPONSE", // Dentro de ventana de 24h
      }),
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json();
    console.error("Meta API error:", err);
    return new Response(JSON.stringify(err), { status: 502 });
  }

  const { message_id } = await metaRes.json();

  // Guardar el mensaje enviado localmente
  await supabaseAdmin.from("meta_messages").insert({
    conversation_id,
    sender_type: "business",
    message_mid: message_id,
    text,
    sent_at: new Date().toISOString(),
  });

  // Marcar conversación como respondida
  await supabaseAdmin
    .from("meta_conversations")
    .update({ status: "replied" })
    .eq("id", conversation_id);

  return new Response(JSON.stringify({ ok: true, message_id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## 7. Realtime en el dashboard React

```typescript
// src/hooks/useMetaConversations.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMetaConversations() {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    // Carga inicial
    supabase
      .from('meta_conversations')
      .select('*, product:products(name,sku)')
      .order('last_message_at', { ascending: false })
      .then(({ data }) => setConversations(data ?? []));

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('meta-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meta_conversations' },
        (payload) => {
          setConversations(prev => {
            const idx = prev.findIndex(c => c.id === payload.new.id);
            if (idx === -1) return [payload.new, ...prev];
            const next = [...prev];
            next[idx] = { ...prev[idx], ...payload.new };
            return next.sort((a, b) =>
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return conversations;
}
```

---

## 8. Riesgos técnicos y mitigaciones

### 8.1 Rate Limits de Meta Graph API

| API | Límite | Comportamiento al superar |
|---|---|---|
| Messenger Send API | 250 requests/segundo por page | Error `OAuthException (code 4)` |
| Graph API general | 200 calls/hora por user token | Error 429 |
| Webhook delivery | Meta reintenta hasta 7 veces con backoff | Si fallas 7 veces, el evento se pierde |

**Mitigación:**
```typescript
// Retry con exponential backoff para calls a Graph API
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;

    const err = await res.json();
    const isRateLimit = err.error?.code === 4 || res.status === 429;

    if (!isRateLimit || attempt === maxRetries - 1) throw new Error(JSON.stringify(err));

    // Backoff: 1s, 2s, 4s...
    await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
  }
}
```

### 8.2 Política de 24 horas

| Escenario | Solución |
|---|---|
| El cliente mensajeó hace > 24h | No puedes enviar mensajes normales |
| Necesitas hacer seguimiento | Usar `MESSAGE_TAG: CONFIRMED_EVENT_UPDATE` o `POST_PURCHASE_UPDATE` (solo si aplica) |
| Respuesta de agente humano | Usar tag `HUMAN_AGENT` — permite 7 días |
| Follow-up comercial | Usar **One-Time Notification** (el cliente opt-in) |

Implementar un indicador visual en el dashboard que muestre si la ventana de 24h está activa:

```typescript
const isWithin24h = (lastMessageAt: string) => {
  const diff = Date.now() - new Date(lastMessageAt).getTime();
  return diff < 24 * 60 * 60 * 1000;
};
```

### 8.3 Restricciones de permisos y App Review

- **En modo desarrollo:** Solo funciona con usuarios que tienen rol admin/developer/tester en tu app de Meta.
- **Para producción:** App Review es **obligatorio** para `pages_messaging`. Sin él, no puedes recibir mensajes de usuarios reales.
- **Tiempo de revisión:** 5–28 días hábiles. Preparar: video demo, descripción del caso de uso, política de privacidad pública.

### 8.4 Deduplicación de webhooks

Meta puede enviar el mismo evento más de una vez (reintentos). El campo `message_mid` es el identificador único de Meta — úsalo como `UNIQUE` constraint:

```sql
-- Ya incluido en el esquema: message_mid TEXT UNIQUE
-- En caso de upsert:
INSERT INTO meta_messages (message_mid, ...)
VALUES (...)
ON CONFLICT (message_mid) DO NOTHING;
```

### 8.5 PSID no es el ID real del usuario

El `sender_id` del webhook es un **Page-Scoped ID (PSID)** — único por combinación usuario+page. No es el Facebook UID. No puedes usarlo para identificar al mismo usuario en otra page.

---

## 9. Estrategia de escalabilidad

### 9.1 Arquitectura con cola de procesamiento

Para volúmenes altos (>100 mensajes/minuto), la Edge Function debe responder 200 y encolar el procesamiento:

```
Webhook POST → Edge Function → Respond 200 → Supabase Queue (pg_net / pgmq)
                                                    │
                                               Worker cron job
                                                    │
                                              Procesa eventos
                                                en batch
```

Con `pgmq` (disponible en Supabase):

```sql
-- Instalar extensión
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Crear cola
SELECT pgmq.create('meta_webhook_events');

-- En la Edge Function: encolar en lugar de procesar
SELECT pgmq.send('meta_webhook_events', '{"entry": [...]}');

-- Worker (Edge Function ejecutada por pg_cron cada 5s):
SELECT pgmq.read('meta_webhook_events', 30, 10); -- 10 mensajes, timeout 30s
```

### 9.2 Manejo de concurrencia

La constraint `UNIQUE (page_id, customer_psid)` en `meta_conversations` + el `ON CONFLICT DO UPDATE` en el upsert garantizan que dos webhooks simultáneos del mismo usuario no creen duplicados.

Para los mensajes, `ON CONFLICT (message_mid) DO NOTHING` es suficiente.

### 9.3 Reintentos del webhook de Meta

Si tu endpoint retorna un código != 2xx, Meta reintenta con el siguiente esquema:

```
Intento 1 → inmediato
Intento 2 → 1 minuto
Intento 3 → 5 minutos
Intento 4 → 30 minutos
Intento 5 → 2 horas
Intento 6 → 6 horas
Intento 7 → 24 horas (último)
```

**Garantía:** Responde siempre 200 aunque el procesamiento falle internamente. Loguea el payload crudo y reprocesa manualmente si es necesario.

```typescript
// Tabla de audit log de webhooks crudos
CREATE TABLE meta_webhook_raw (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload    JSONB NOT NULL,
  processed  BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Alternativas si el acceso directo falla

### Opción B — Redirección a Messenger (sin API, siempre funciona)

Si no puedes obtener aprobación de Meta o quieres empezar rápido, muestra en el dashboard un enlace directo al chat:

```typescript
// URL para abrir la conversación en Messenger web
const getMessengerUrl = (psid: string) =>
  `https://www.facebook.com/messages/t/${psid}`;

// URL para Messenger app (deep link)
const getMessengerAppUrl = (psid: string) =>
  `fb-messenger://user-thread/${psid}`;
```

### Opción C — Integración vía herramienta de terceros

Si el proceso de App Review es un bloqueador, plataformas como estas actúan como intermediarios con acceso ya aprobado por Meta:

| Plataforma | Qué ofrece | Costo |
|---|---|---|
| **ManyChat** | webhooks + API propia + UI de inbox | Desde $15/mes |
| **Trengo** | Inbox unificado con API REST | Desde $19/mes |
| **Chatwoot** | Open source, self-hosted | Gratis + hosting |
| **360dialog** | Acceso barato a Messenger API | €4/mes |

Todas estas tienen APIs REST/webhooks propios que puedes integrar con tu sistema en días, sin App Review.

---

## 11. Variables de entorno requeridas

```bash
# Edge Functions / Backend
META_APP_ID=123456789
META_APP_SECRET=abc123...           # Para validar firma HMAC
META_WEBHOOK_VERIFY_TOKEN=mi-token-secreto-aleatorio
META_PAGE_ACCESS_TOKEN=EAABxx...    # Guardado en meta_tokens, no aquí directamente

# Supabase (ya existentes)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Solo para Edge Functions del backend
SUPABASE_ANON_KEY=eyJ...
```

---

## 12. Checklist de implementación

```
Fase 1 — Infraestructura (1-2 días)
[ ] Crear Facebook App en developers.facebook.com
[ ] Agregar producto "Webhooks" y "Messenger" a la app
[ ] Crear página de Facebook para el negocio (si no existe)
[ ] Aplicar migraciones SQL (meta_conversations, meta_messages, meta_tokens)
[ ] Crear Edge Function webhook-meta en Supabase

Fase 2 — Autenticación (1 día)
[ ] Obtener short-lived token vía Graph API Explorer
[ ] Intercambiar por long-lived token (60 días)
[ ] Obtener Page Access Token permanente
[ ] Guardar token en tabla meta_tokens
[ ] Configurar webhook URL en Meta App Dashboard
[ ] Suscribir campos: messages, messaging_referrals

Fase 3 — Procesamiento (2-3 días)
[ ] Implementar validación HMAC-SHA256
[ ] Implementar upsert de conversaciones
[ ] Implementar insert de mensajes con deduplicación
[ ] Implementar enriquecimiento de perfil (Graph API)
[ ] Implementar Edge Function meta-send-message

Fase 4 — Dashboard (2-3 días)
[ ] Hook useMetaConversations con Realtime
[ ] Componente lista de conversaciones con estado
[ ] Componente de chat con historial
[ ] Indicador de ventana 24h
[ ] Botón "Abrir en Messenger" como fallback

Fase 5 — App Review (asíncrono, 5-28 días)
[ ] Preparar política de privacidad pública
[ ] Grabar video demo del flujo completo
[ ] Describir caso de uso y datos que se manejan
[ ] Enviar solicitud de Advanced Access para pages_messaging
```
