import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let clientFingerprint = "";

function envKey(): string | undefined {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    undefined
  );
}

function fingerprint(url?: string | null, key?: string | null) {
  return `${url || ""}::${key || ""}`;
}

export function resetSupabaseClient() {
  supabaseClient = null;
  clientFingerprint = "";
}

export function getSupabaseClient(
  url?: string,
  anonKey?: string
): SupabaseClient | null {
  const envUrl =
    url ||
    import.meta.env.VITE_SUPABASE_URL ||
    localStorage.getItem("omni_supabase_url");
  const key =
    anonKey ||
    envKey() ||
    localStorage.getItem("omni_supabase_anon_key") ||
    undefined;

  const fp = fingerprint(envUrl, key);
  if (supabaseClient && clientFingerprint === fp) return supabaseClient;

  if (envUrl && key) {
    try {
      supabaseClient = createClient(envUrl, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: "omni.supabase.auth",
        },
      });
      clientFingerprint = fp;
      return supabaseClient;
    } catch {
      return null;
    }
  }
  return null;
}

export function initSupabase(url: string, anonKey: string): SupabaseClient {
  localStorage.setItem("omni_supabase_url", url);
  localStorage.setItem("omni_supabase_anon_key", anonKey);
  resetSupabaseClient();
  const client = getSupabaseClient(url, anonKey);
  if (!client) throw new Error("تعذر تهيئة عميل Supabase");
  return client;
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const client = createClient(url, anonKey);
    const { error } = await client.from("settings").select("branch_id").limit(1);
    if (!error) {
      return { ok: true, message: "الاتصال ناجح — مخطط OmniSales موجود" };
    }
    const msg = error.message || "";
    if (
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return {
        ok: false,
        message:
          "الاتصال يعمل لكن جدول settings غير موجود. أنشئ مشروع OmniSales جديد وطبق الهجرات 001→008",
      };
    }
    return { ok: false, message: `فشل الاختبار: ${msg}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "فشل الاختبار",
    };
  }
}

export async function cloudSignIn(
  url: string,
  anonKey: string,
  email: string,
  password: string
) {
  const client = initSupabase(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function cloudSignOut() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
}

export async function getCloudSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}
