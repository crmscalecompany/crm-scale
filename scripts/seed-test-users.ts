// Creates one auth user + matching public.users row per role, atomically,
// via the Supabase Admin API — a stopgap for Week 1 verification (see plan
// §4/§9). A real "admin invites teammate, picks role" UI is needed before
// onboarding actual staff; this script is not it.
//
// Usage: npm run seed:test-users [-- --env-file=.env.staging.local]
import dotenv from "dotenv";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types/database.types";

function envFileFromArgv(argv: string[]): string {
  const match = argv.find((a) => a.startsWith("--env-file="));
  return match ? match.slice("--env-file=".length) : ".env.local";
}

dotenv.config({ path: envFileFromArgv(process.argv.slice(2)) });

interface TestUserSpec {
  papel: UserRole;
  nome: string;
  email: string;
}

const TEST_USERS: TestUserSpec[] = [
  { papel: "sdr", nome: "SDR de Teste", email: "sdr.teste@crm.local" },
  { papel: "closer", nome: "Closer de Teste", email: "closer.teste@crm.local" },
  { papel: "am", nome: "AM de Teste", email: "am.teste@crm.local" },
  { papel: "advogado", nome: "Advogado de Teste", email: "advogado.teste@crm.local" },
  { papel: "admin", nome: "Admin de Teste", email: "admin.teste@crm.local" },
];

const DEFAULT_PASSWORD = process.env.SEED_TEST_USER_PASSWORD ?? "TrocarSenha123!";

async function main() {
  const db = createAdminClient();

  for (const spec of TEST_USERS) {
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email: spec.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });

    let userId: string;

    if (createError) {
      const alreadyExists = createError.message.toLowerCase().includes("already been registered") || createError.status === 422;
      if (!alreadyExists) throw createError;

      // Safe to re-run: look the existing auth user up instead of failing.
      const { data: list, error: listError } = await db.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email === spec.email);
      if (!existing) throw createError;

      userId = existing.id;
      console.log(`Usuário ${spec.email} já existia — reaproveitando.`);
    } else {
      userId = created.user.id;
      console.log(`Usuário ${spec.email} criado.`);
    }

    const { error: upsertError } = await db.from("users").upsert({ id: userId, nome: spec.nome, papel: spec.papel, ativo: true });
    if (upsertError) throw upsertError;

    console.log(`  -> public.users vinculado (papel=${spec.papel}).`);
  }

  console.log(`\nSenha padrão para todos os usuários de teste: ${DEFAULT_PASSWORD}`);
  console.log("Defina SEED_TEST_USER_PASSWORD no env para usar outra, e troque antes de qualquer uso fora do seu ambiente local.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
