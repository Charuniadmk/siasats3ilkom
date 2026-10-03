import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import sharp from 'sharp';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.MAX_DOCUMENT_SIZE_MB = '1';
const { completeFormSchema } = await import('../src/modules/submissions/submissions.schema.js');
const { generateFormPdf } = await import('../src/modules/submissions/submissions.pdf.js');
const form = {
  phone: '081234567890',
  title: 'Penelitian Sistem Akademik',
  promoter: 'Prof. Promotor',
  coPromoter1: 'Dr. Pembimbing Pertama',
  coPromoter2: 'Dr. Pembimbing Kedua',
  program: 'Doktor Ilmu Komputer',
  city: 'Salatiga',
  formDate: '2026-10-04',
};
const student = {
  fullName: 'Mahasiswa Pengujian',
  nim: '00123456',
  gender: 'FEMALE',
  address: 'Jalan Pendidikan 10',
};
const signature = await sharp({
  create: { width: 240, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: Buffer.from(
        '<svg width="240" height="80"><path d="M10 60 Q70 0 120 45 T230 20" fill="none" stroke="black" stroke-width="3"/></svg>',
      ),
    },
  ])
  .png()
  .toBuffer();
test('PDF formulir mengacu dokumen Proposal dan Kualifikasi dengan zona tanda tangan tetap', async () => {
  assert.equal(completeFormSchema.safeParse(form).success, true);
  assert.equal(completeFormSchema.safeParse({ ...form, formDate: '2026-02-30' }).success, false);
  assert.equal(completeFormSchema.safeParse({ ...form, title: '' }).success, false);
  assert.equal(completeFormSchema.safeParse({ ...form, signatureX: 0 }).success, false);
  await mkdir('test-artifacts', { recursive: true });
  for (const kind of ['PROPOSAL', 'QUALIFICATION'] as const) {
    const buffer = await generateFormPdf(kind, form, student, signature);
    const pdf = await PDFDocument.load(buffer);
    assert.equal(pdf.getPageCount(), kind === 'PROPOSAL' ? 2 : 1);
    await writeFile(resolve('test-artifacts', kind + '.pdf'), buffer);
    {
      const template = await PDFDocument.load(
        await readFile(
          new URL(
            '../assets/forms/' +
              (kind === 'PROPOSAL' ? 'proposal' : 'qualification') +
              '-template.pdf',
            import.meta.url,
          ),
        ),
      );
      for (const [index, original] of template.getPages().entries()) {
        assert.deepEqual(pdf.getPage(index).getSize(), original.getSize());
        const streams = (document: PDFDocument, pageIndex: number) => {
          const contents = document.getPage(pageIndex).node.Contents();
          const entries = contents instanceof PDFArray ? contents.asArray() : [contents!];
          return entries
            .map((entry) => document.context.lookup(entry))
            .filter((entry): entry is PDFRawStream => entry instanceof PDFRawStream)
            .map((entry) => Buffer.from(entry.getContents()));
        };
        const filledStreams = streams(pdf, index);
        for (const content of streams(template, index)) {
          assert.ok(
            filledStreams.some((filled) => filled.equals(content)),
            'Konten statis template harus tetap identik',
          );
        }
      }
    }
    if (kind === 'PROPOSAL') {
      await assert.rejects(
        generateFormPdf(
          kind,
          { ...form, title: 'Judul sangat panjang '.repeat(60) },
          student,
          signature,
        ),
        /terlalu panjang/,
      );
      await assert.rejects(
        generateFormPdf(
          kind,
          form,
          { ...student, address: 'Alamat sangat panjang '.repeat(60) },
          signature,
        ),
        /Alamat terlalu panjang/,
      );
      await assert.rejects(
        generateFormPdf(
          kind,
          form,
          { ...student, fullName: 'Nama ' + String.fromCodePoint(0x10ffff) },
          signature,
        ),
        /karakter yang tidak didukung/,
      );
      continue;
    }
    const multiline = await generateFormPdf(
      kind,
      {
        ...form,
        title:
          'Penelitian Sistem Akademik dan Pengelolaan Data Mahasiswa Doktor dengan Pendekatan Analisis Terintegrasi',
      },
      student,
      signature,
    );
    assert.equal((await PDFDocument.load(multiline)).getPageCount(), 1);
    await writeFile(resolve('test-artifacts', 'QUALIFICATION-multibaris.pdf'), multiline);
    await assert.rejects(
      generateFormPdf(
        kind,
        { ...form, title: 'Judul sangat panjang '.repeat(60) },
        student,
        signature,
      ),
      /terlalu panjang/,
    );
    await assert.rejects(
      generateFormPdf(
        kind,
        form,
        { ...student, fullName: 'Nama ' + String.fromCodePoint(0x10ffff) },
        signature,
      ),
      /karakter yang tidak didukung/,
    );
  }
});
test('Tanda tangan Kualifikasi tetap di tengah meskipun PNG memiliki margin transparan tidak seimbang', async () => {
  const padded = await sharp(signature)
    .extend({ top: 5, bottom: 40, left: 90, right: 10, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const normal = await generateFormPdf('QUALIFICATION', form, student, signature);
  const withPadding = await generateFormPdf('QUALIFICATION', form, student, padded);
  await writeFile(resolve('test-artifacts', 'QUALIFICATION-padding.pdf'), withPadding);
  const images = async (buffer: Buffer) => {
    const document = await PDFDocument.load(buffer);
    return document.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter(
        (object): object is PDFRawStream =>
          object instanceof PDFRawStream &&
          object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image',
      )
      .filter(
        (object) =>
          Number(object.dict.get(PDFName.of('Width'))?.toString()) > 1 &&
          Number(object.dict.get(PDFName.of('Width'))?.toString()) < 500,
      )
      .map((object) => ({
        width: object.dict.get(PDFName.of('Width'))?.toString(),
        height: object.dict.get(PDFName.of('Height'))?.toString(),
        pixels: Buffer.from(object.getContents()).toString('base64'),
      }));
  };
  const reference = await images(normal);
  assert.ok(reference.length > 0);
  assert.deepEqual(
    await images(withPadding),
    reference,
    'Margin transparan tidak mengubah isi atau ukuran tanda tangan di PDF',
  );
});

test('Proposal merapatkan bagian setelah alamat dan judul tanpa mengubah ukuran huruf', async () => {
  const short = await generateFormPdf('PROPOSAL', form, student, signature);
  const long = await generateFormPdf(
    'PROPOSAL',
    {
      ...form,
      title:
        'Penelitian Sistem Akademik dan Pengelolaan Data Mahasiswa Doktor dengan Pendekatan Analisis Terintegrasi',
    },
    {
      ...student,
      address:
        'Jalan Pendidikan Nomor 10, Kelurahan Sidorejo, Kecamatan Sidomukti, Kota Salatiga, Jawa Tengah',
    },
    signature,
  );
  await writeFile(resolve('test-artifacts', 'PROPOSAL-multibaris.pdf'), long);
  const content = async (buffer: Buffer) => {
    const document = await PDFDocument.load(buffer);
    assert.equal(document.getPageCount(), 2);
    const contents = document.getPage(0).node.Contents() as PDFArray;
    const stream = document.context.lookup(contents.get(contents.size() - 1)) as PDFRawStream;
    return inflateSync(stream.getContents()).toString('latin1');
  };
  const shortContent = await content(short);
  const longContent = await content(long);
  const baseline = (source: string, x: number) =>
    Number(source.match(new RegExp('1 0 0 1 ' + x + ' ([0-9.]+) Tm'))?.[1]);
  const shortPhone = baseline(shortContent, 151.63);
  const longPhone = baseline(longContent, 151.63);
  assert.ok(
    Math.abs(shortPhone - (841.8898 - 218.0008)) < 0.001,
    'Telepon mengikuti satu baris alamat',
  );
  assert.ok(longPhone < shortPhone - 18, 'Alamat multibaris menggeser telepon ke bawah');
  assert.ok(
    baseline(longContent, 194.4) < baseline(shortContent, 194.4) - (shortPhone - longPhone),
    'Judul multibaris menambah tinggi sebelum pembimbing',
  );
  assert.ok(shortContent.includes('1 0 0 1 347.1 '), 'Kontak header berada di kanan kop');
});

test(
  'Alur MySQL dua pengajuan: dokumen privat, status terkunci, penolakan, kirim ulang, persetujuan dan konkurensi',
  { skip: process.env.AUTH_DATABASE_TESTS !== '1' },
  async (t) => {
    const { app } = await import('../src/app.js');
    const { env } = await import('../src/config/env.js');
    const { getPrisma, disconnectPrisma } = await import('../src/config/prisma.js');
    const { signSession } = await import('../src/modules/auth/auth.service.js');
    const { removeFile, uploadRoot } =
      await import('../src/modules/submissions/submissions.service.js');
    const prisma = getPrisma();
    const ids: string[] = [];
    const server = app.listen(0, '127.0.0.1');
    t.after(async () => {
      await new Promise<void>((r) => server.close(() => r()));
      const docs = await prisma.submissionDocument.findMany({
        where: { submission: { studentId: { in: ids } } },
      });
      await Promise.all(docs.map((d) => removeFile(d.filePath)));
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await disconnectPrisma();
    });
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const stamp = Date.now();
    const owner = await prisma.user.create({
      data: {
        ...student,
        role: 'STUDENT',
        gender: 'FEMALE',
        nim: '00' + stamp,
        passwordHash: 'unused-test-hash',
      },
    });
    ids.push(owner.id);
    const other = await prisma.user.create({
      data: { role: 'STUDENT', nim: '01' + stamp, passwordHash: 'unused-test-hash' },
    });
    ids.push(other.id);
    const admin = await prisma.user.create({
      data: { role: 'ADMIN', username: 'review_' + stamp, passwordHash: 'unused-test-hash' },
    });
    ids.push(admin.id);
    const cookie = (user: typeof owner) =>
      'session=' +
      signSession({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion });
    const request = (
      path: string,
      method = 'GET',
      data?: object,
      user = owner,
      origin = new URL(env.FRONTEND_URL).origin,
    ) =>
      fetch(base + path, {
        method,
        headers: {
          Cookie: cookie(user),
          Origin: origin,
          ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
    const fixturePdf = Buffer.from(await (await PDFDocument.create()).save());
    const fixture = await PDFDocument.create();
    fixture.addPage();
    const validPdf = Buffer.from(await fixture.save());
    for (const path of ['/proposals', '/qualifications']) {
      const me = path + '/me';
      const root = '/admin' + path;
      assert.equal((await fetch(base + me)).status, 401);
      assert.equal((await request(me, 'GET', undefined, admin)).status, 403);
      const initial = await (await request(me)).json();
      const id = initial.data.id;
      assert.equal(initial.data.status, 'DRAFT');
      assert.equal((await request(me + '/submit', 'POST')).status, 400);
      assert.equal((await request(me, 'PATCH', { ...form, status: 'APPROVED' })).status, 400);
      assert.equal(
        (await request(me, 'PATCH', form, owner, 'https://untrusted.example')).status,
        403,
      );
      assert.equal((await request(me, 'PATCH', form)).status, 200);
      assert.equal((await request(me + '/generate', 'POST')).status, 400);
      const upload = (
        type: string,
        content: Buffer,
        name = 'document.pdf',
        mime = 'application/pdf',
        user = owner,
      ) => {
        const data = new FormData();
        data.append('file', new Blob([new Uint8Array(content)], { type: mime }), name);
        return fetch(base + me + '/documents/' + type, {
          method: 'POST',
          headers: { Cookie: cookie(user), Origin: new URL(env.FRONTEND_URL).origin },
          body: data,
        });
      };
      const signedType =
        path === '/proposals' ? 'SIGNED_PROPOSAL_FORM' : 'SIGNED_QUALIFICATION_FORM';
      const wrongSignedType =
        path === '/proposals' ? 'SIGNED_QUALIFICATION_FORM' : 'SIGNED_PROPOSAL_FORM';
      assert.equal((await upload(signedType, validPdf)).status, 400);
      const type = path === '/proposals' ? 'PAYMENT_RECEIPT' : 'PUBLISHED_ARTICLE_DRAFT';
      assert.equal((await upload(type, signature, 'image.png', 'image/png')).status, 400);
      assert.equal((await upload(type, Buffer.from('%PDF-fake'))).status, 400);
      assert.equal((await upload(type, fixturePdf)).status, 200);
      assert.equal((await upload(type, Buffer.alloc(1024 * 1024 + 1))).status, 400);
      const opaque = await sharp({
        create: { width: 10, height: 10, channels: 3, background: 'white' },
      })
        .png()
        .toBuffer();
      assert.equal((await upload('SIGNATURE', opaque, 'signature.png', 'image/png')).status, 400);
      assert.equal(
        (await upload('SIGNATURE', signature, 'signature.png', 'image/png')).status,
        200,
      );
      assert.equal((await request(me + '/generate', 'POST')).status, 200);
      const formType = path === '/proposals' ? 'PROPOSAL_FORM' : 'QUALIFICATION_FORM';
      assert.equal((await upload(formType, validPdf)).status, 400);
      const kinds =
        path === '/proposals'
          ? ['PAYMENT_RECEIPT', 'PROPOSAL_DRAFT', 'TRANSCRIPT']
          : ['PUBLISHED_ARTICLE_DRAFT'];
      for (const kind of kinds) assert.equal((await upload(kind, validPdf)).status, 200);
      const missingSigned = await request(me + '/submit', 'POST');
      assert.equal(missingSigned.status, 400);
      assert.match((await missingSigned.json()).message, /Bertanda Tangan Persetujuan/);
      assert.equal((await upload(wrongSignedType, validPdf)).status, 400);
      assert.equal((await upload(signedType, Buffer.from('%PDF-fake'))).status, 400);
      assert.equal((await upload(signedType, validPdf, 'Persetujuan.pdf')).status, 200);
      let data = (await (await request(me)).json()).data;
      const signedDoc = data.documents.find((d: { type: string }) => d.type === signedType);
      assert.equal(
        (await request(me + '/documents/' + signedDoc.id, 'GET', undefined, other)).status,
        404,
      );
      assert.equal(
        (await request(root + '/' + id + '/documents/' + signedDoc.id, 'GET', undefined, admin))
          .status,
        200,
      );
      const adminDetail = await (await request(root + '/' + id, 'GET', undefined, admin)).json();
      assert.ok(adminDetail.data.documents.some((d: { type: string }) => d.type === signedType));
      const storedSigned = await prisma.submissionDocument.findUniqueOrThrow({
        where: { id: signedDoc.id },
      });
      assert.equal((await request(me + '/generate', 'POST')).status, 200);
      const regenerated = (await (await request(me)).json()).data;
      assert.ok(!regenerated.documents.some((d: { type: string }) => d.type === signedType));
      await assert.rejects(access(resolve(uploadRoot, storedSigned.filePath)));
      assert.equal((await upload(signedType, validPdf, 'Persetujuan-terbaru.pdf')).status, 200);
      data = (await (await request(me)).json()).data;
      const doc = data.documents.find((d: { type: string }) => d.type === formType);
      assert.equal('filePath' in doc, false);
      assert.equal((await request(me + '/documents/' + doc.id)).status, 200);
      assert.equal(
        (await request(me + '/documents/' + doc.id, 'GET', undefined, other)).status,
        404,
      );
      assert.equal(
        (await request(root + '/' + id + '/documents/' + doc.id, 'GET', undefined, other)).status,
        403,
      );
      const preview = await request(
        root + '/' + id + '/documents/' + doc.id,
        'GET',
        undefined,
        admin,
      );
      assert.equal(preview.status, 200);
      assert.equal(preview.headers.get('content-type'), 'application/pdf');
      const download = await request(
        root + '/' + id + '/documents/' + doc.id + '?download=1',
        'GET',
        undefined,
        admin,
      );
      assert.ok(download.headers.get('content-disposition')?.startsWith('attachment'));
      assert.equal(
        (await request(me, 'PATCH', { ...form, title: 'Judul diperbarui' })).status,
        200,
      );
      assert.equal((await request(me + '/submit', 'POST')).status, 400);
      const invalidated = (await (await request(me)).json()).data.documents;
      assert.ok(
        !invalidated.some((d: { type: string }) => d.type === signedType || d.type === formType),
      );
      assert.equal((await upload(signedType, validPdf)).status, 400);
      assert.equal((await request(me + '/generate', 'POST')).status, 200);
      assert.equal((await upload(signedType, validPdf, 'Persetujuan-baru.pdf')).status, 200);
      const submissions = await Promise.all([
        request(me + '/submit', 'POST'),
        request(me + '/submit', 'POST'),
      ]);
      assert.deepEqual(submissions.map((r) => r.status).sort(), [200, 409]);
      const assertLocked = async () => {
        assert.equal((await request(me, 'PATCH', form)).status, 409);
        assert.equal((await upload(type, validPdf)).status, 409);
        assert.equal((await request(me + '/generate', 'POST')).status, 409);
        assert.equal((await request(me + '/submit', 'POST')).status, 409);
      };
      await assertLocked();
      assert.equal((await request(root, 'GET', undefined, owner)).status, 403);
      const invalidFilter = await request(root + '?status=INVALID', 'GET', undefined, admin);
      assert.equal(invalidFilter.status, 400);
      assert.equal(
        (await invalidFilter.json()).message,
        'Filter atau pengurutan pengajuan tidak valid.',
      );
      const list = await (
        await request(
          root + '?status=PENDING&search=' + owner.nim + '&sortBy=nim&sortOrder=asc',
          'GET',
          undefined,
          admin,
        )
      ).json();
      assert.equal(list.meta.total, 1);
      assert.equal(list.data[0].id, id);
      assert.equal(
        (
          await request(
            root + '/' + id + '/review',
            'PATCH',
            { decision: 'REJECTED', reason: ' ' },
            admin,
          )
        ).status,
        400,
      );
      assert.equal(
        (await request(root + '/' + id + '/review', 'PATCH', { decision: 'APPROVED' }, owner))
          .status,
        403,
      );
      assert.equal(
        (
          await request(
            root + '/' + id + '/review',
            'PATCH',
            { decision: 'REJECTED', reason: 'Perbaiki dokumen.' },
            admin,
          )
        ).status,
        200,
      );
      data = (await (await request(me)).json()).data;
      assert.equal(data.status, 'REJECTED');
      assert.equal(data.rejectionReason, 'Perbaiki dokumen.');
      assert.equal(data.reviewedBy, admin.id);
      assert.equal((await request(me, 'PATCH', form)).status, 200);
      assert.equal((await upload(type, validPdf)).status, 200);
      assert.equal((await request(me + '/generate', 'POST')).status, 200);
      assert.equal((await request(me + '/submit', 'POST')).status, 400);
      assert.equal((await upload(signedType, validPdf, 'Persetujuan-ulang.pdf')).status, 200);
      assert.equal((await request(me + '/submit', 'POST')).status, 200);
      const reviews = await Promise.all([
        request(root + '/' + id + '/review', 'PATCH', { decision: 'APPROVED' }, admin),
        request(
          root + '/' + id + '/review',
          'PATCH',
          { decision: 'REJECTED', reason: 'Bertabrakan' },
          admin,
        ),
      ]);
      assert.deepEqual(reviews.map((r) => r.status).sort(), [200, 409]);
      data = (await (await request(me)).json()).data;
      assert.ok(['APPROVED', 'REJECTED'].includes(data.status));
      if (data.status === 'REJECTED') {
        await request(me + '/submit', 'POST');
        await request(root + '/' + id + '/review', 'PATCH', { decision: 'APPROVED' }, admin);
      }
      await assertLocked();
      assert.equal(
        (await request(root + '/' + id + '/review', 'PATCH', { decision: 'APPROVED' }, admin))
          .status,
        409,
      );
    }
    const ownerDocuments = await prisma.submissionDocument.findMany({
      where: { submission: { studentId: owner.id } },
    });
    assert.ok(ownerDocuments.length > 0);
    assert.equal((await request('/students/' + owner.id, 'DELETE', undefined, admin)).status, 200);
    assert.equal(await prisma.submission.count({ where: { studentId: owner.id } }), 0);
    for (const document of ownerDocuments)
      await assert.rejects(access(resolve(uploadRoot, document.filePath)));
  },
);
