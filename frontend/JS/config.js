/**
 * config.js — Configuración global del frontend
 *
 * En local:      API_BASE apunta a localhost:3000
 * En producción: cambia el valor a la URL real del backend desplegado
 *                p.ej. 'https://museo-vg-api.onrender.com'
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', ''];  // '' cubre apertura directa como archivo

const API_BASE = LOCAL_HOSTS.includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://TU-BACKEND.onrender.com';  // <-- cambiar antes de desplegar
