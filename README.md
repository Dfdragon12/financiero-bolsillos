# 💰 Control Financiero — Sistema de Bolsillos

Sistema personal de control de gastos basado en el método de **tres bolsillos**, integrado con Google Sheets para persistencia de datos.

---

## ¿Qué es el sistema de bolsillos?

El método divide el ingreso quincenal en tres fondos con propósitos distintos:

| Bolsillo | Propósito | Ingreso quincenal |
|---|---|---|
| **Bolsillo 1 — Día a día** | Gastos operativos: transporte, comida, salud, obligaciones | $727.041 COP |
| **Bolsillo 2 — Gastos personales** | Ocio, salidas, restaurantes, compras, regalos | $436.225 COP |
| **Bolsillo 3 — Ahorro / Emergencias** | Intocable salvo emergencia real · 10.5% E.A. | $290.086 COP |

---

## Características

- Registro de gastos con categoría, bolsillo y medio de pago (efectivo o tarjeta de crédito)
- Sincronización automática con Google Sheets vía Apps Script
- Saldos actualizados en tiempo real
- Seguimiento de tarjeta de crédito por bolsillo
- Dashboard con gastos por categoría y presupuesto mensual
- Alertas de sobregiro y saldo bajo en Bolsillo 2
- Aplicación de ingresos quincenales con un clic
- Sin dependencias externas — un solo archivo HTML

---

## Estructura del proyecto

```
financiero-bolsillos/
├── index.html          # App principal — abrir en el navegador
├── apps-script.js      # Código del Google Apps Script (backend)
└── README.md
```

---

## Configuración

### 1. Google Sheets

Crea una hoja de cálculo en Google Sheets con estas pestañas:
- `Movimientos` — registro de transacciones
- `Saldos` — estado de los bolsillos
- `Presupuesto` — seguimiento mensual
- `Instrucciones` — guía de uso

La hoja debe tener estas columnas en `Movimientos`:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Fecha | Categoría | Descripción | Bolsillo | Tipo | Medio de pago | Valor (COP) | Saldo B1 | Saldo B2 |

### 2. Google Apps Script

1. En tu Google Sheet ve a **Extensiones → Apps Script**
2. Pega el contenido de `apps-script.js`
3. Reemplaza `TU_SHEET_ID` con el ID de tu hoja (está en la URL entre `/d/` y `/edit`)
4. Ve a **Implementar → Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier usuario**
5. Copia la URL generada (`https://script.google.com/macros/s/.../exec`)

### 3. Configurar el HTML

Abre `index.html` y reemplaza en la línea indicada:

```javascript
const SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT';
```

### 4. Usar la app

Abre `index.html` directamente en Chrome. No necesita servidor.

---

## Categorías soportadas

**Bolsillo 1 (Día a día)**
`Transporte` `Gasolina` `Peaje` `Parqueadero` `GoPass` `TuLlave` `Comida` `Farmacia` `Salud` `Psicólogo` `Deporte` `Pagos`

**Bolsillo 2 (Personal)**
`Ocio` `Regalos` `Compras` `Eventos`

---

## Presupuesto mensual objetivo

| Categoría | Objetivo |
|---|---|
| Alimentación | $450.000 COP |
| Transporte | $500.000 COP |
| Salud | $200.000 COP |
| Deporte | $240.000 COP |
| Ocio | $250.000 COP |
| Regalos | $200.000 COP |

---

## Tarjeta de crédito

Los gastos con tarjeta de crédito se registran normalmente pero **no descuentan el saldo inmediatamente**. El sistema acumula el total pendiente por bolsillo y lo descuenta cuando se registra el pago mensual.

Formato para registrar el pago:
- Categoría: `Pagos`
- Tipo: `Pago TC`
- Bolsillo: el que corresponda según el consumo

---

## Flujo recomendado con Claude

Este proyecto fue construido y es operado junto con **Claude (Anthropic)** como asesor financiero personal:

1. Registras gastos desde `index.html` → se guardan en Sheets automáticamente
2. Periódicamente compartes el resumen con Claude para análisis
3. Claude detecta patrones, alertas de presupuesto y sugiere ajustes

---

## Tecnologías

- HTML / CSS / JavaScript vanilla
- Google Sheets como base de datos
- Google Apps Script como API REST
- Chart.js para visualizaciones

---

## Licencia

MIT — úsalo, modifícalo y compártelo libremente.
