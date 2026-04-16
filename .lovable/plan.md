

# Webhook para envío de señales por email

## Resumen

Crear una nueva Edge Function `webhook-signal-email` que actúe como webhook público (como `receive-signal`). Al recibir un JSON con datos de señal:

- **Con `recipients` (array de emails)**: envía el email solo a esos destinatarios
- **Sin `recipients`**: consulta TODOS los usuarios de la plataforma via `auth.admin.listUsers()` y envía a todos

## Flujo

```text
Servicio externo
      │
      ▼
POST /webhook-signal-email
      │
      ├─ ¿Tiene "recipients"? ──► Sí ──► Enviar solo a esos emails
      │
      └─ No ──► Consultar todos los usuarios ──► Enviar a todos
      │
      ▼
Llama internamente a send-signal-email (SendGrid)
```

## Payload esperado

```json
{
  "ticker": "AAPL",
  "asset_name": "Apple Inc.",
  "event_name": "Earnings Report",
  "sentiment": "Positive",
  "importance_level": 4,
  "title_es": "Reporte de ganancias",
  "body_es": "Apple superó expectativas...",
  "title_pt": "Relatório de ganhos",
  "body_pt": "A Apple superou expectativas...",
  "recipients": ["user1@mail.com", "user2@mail.com"]
}
```

Si se omite `recipients`, se envía a todos los usuarios registrados.

## Implementación técnica

1. **Crear `supabase/functions/webhook-signal-email/index.ts`**:
   - Sin autenticación (webhook público, igual que `receive-signal`)
   - Extraer datos de señal del payload con la misma flexibilidad del receive-signal
   - Si `recipients` existe y tiene emails → usarlos directamente
   - Si no → usar `auth.admin.listUsers()` con service role para obtener todos los emails
   - Llamar internamente a `send-signal-email` para el envío real via SendGrid
   - Retornar resumen: cantidad enviada, errores

2. **Desplegar** la nueva función

## Ejemplo de uso

```bash
# Con grupo específico
curl -X POST ".../functions/v1/webhook-signal-email" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","sentiment":"Positive","recipients":["a@b.com"]}'

# A todos los usuarios
curl -X POST ".../functions/v1/webhook-signal-email" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","sentiment":"Positive"}'
```

