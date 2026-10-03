import { parseArgs } from 'node:util';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { hash } from 'bcrypt';
import { getPrisma, disconnectPrisma } from '../config/prisma.js';
import { accountPasswordSchema, nimSchema, usernameSchema } from '../modules/auth/auth.schema.js';

async function main() {
  const { values } = parseArgs({ options: { role: { type: 'string' }, identifier: { type: 'string' } } });
  if (values.role !== 'ADMIN' && values.role !== 'STUDENT') {
    throw new Error('Gunakan --role ADMIN atau --role STUDENT.');
  }
  const result = (values.role === 'ADMIN' ? usernameSchema : nimSchema).safeParse(values.identifier);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Identitas akun tidak valid.');
  if (!process.stdin.isTTY) throw new Error('Jalankan perintah ini melalui terminal interaktif.');

  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const reader = createInterface({ input: process.stdin, output, terminal: true });
  const askPassword = async (prompt: string) => {
    const answer = reader.question(prompt);
    muted = true;
    try { return await answer; }
    finally { muted = false; process.stdout.write('\n'); }
  };

  let password: string;
  try {
    password = await askPassword('Password baru (minimal 8 karakter, maksimal 72 byte): ');
    const parsed = accountPasswordSchema.safeParse(password);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Password tidak valid.');
    const confirmation = await askPassword('Ulangi password: ');
    if (password !== confirmation) throw new Error('Konfirmasi password tidak sesuai.');
  } finally { reader.close(); }

  await getPrisma().user.create({ data: {
    role: values.role,
    username: values.role === 'ADMIN' ? result.data : null,
    nim: values.role === 'STUDENT' ? result.data : null,
    passwordHash: await hash(password, 12),
  } });
  console.log('Akun berhasil dibuat.');
}

main().catch((error: unknown) => {
  const duplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  console.error(duplicate ? 'Username atau NIM sudah digunakan.'
    : error instanceof Error && error.name === 'Error' ? error.message
    : 'Akun gagal dibuat. Periksa koneksi database dan jalankan migrasi terlebih dahulu.');
  process.exitCode = 1;
}).finally(disconnectPrisma);
