// src/produtos/supabase.js
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Inicializa o cliente do Supabase globalmente para esta pasta
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);