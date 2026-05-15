import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const forceReset = process.argv.includes("--reset");

  // Seguro por padrão: só semeia se o banco está vazio. Use `npm run db:reset`
  // para forçar uma limpeza + reinserção do projeto demo.
  const existingProjects = await prisma.project.count();
  if (existingProjects > 0 && !forceReset) {
    console.log(
      `Seed pulado: ${existingProjects} projeto(s) já existem. Use \`npm run db:reset\` para limpar e re-semear.`,
    );
    return;
  }

  // Limpa em ordem para respeitar FKs
  await prisma.chapterTag.deleteMany();
  await prisma.chapterCharacter.deleteMany();
  await prisma.glossaryTerm.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.lore.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.act.deleteMany();
  await prisma.character.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.member.deleteMany();
  await prisma.project.deleteMany();
  await prisma.system.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: { name: "Mestre Local", email: "owner@local" },
  });

  const [dnd, tormenta] = await Promise.all([
    prisma.system.create({
      data: { name: "D&D 5e", slug: "dnd-5e" },
    }),
    prisma.system.create({
      data: { name: "Tormenta 20", slug: "tormenta20" },
    }),
  ]);

  const project = await prisma.project.create({
    data: {
      ownerId: owner.id,
      systemId: tormenta.id,
      title: "A Queda de Valoran",
      summary:
        "Uma cidade portuária à beira do colapso, mercadores corrompidos e um culto subterrâneo que cresce nas sombras.",
    },
  });

  await prisma.member.create({
    data: { userId: owner.id, projectId: project.id, role: "DM" },
  });

  // Personagens
  const [saElis, jorek, queenIvera] = await Promise.all([
    prisma.character.create({
      data: {
        projectId: project.id,
        name: "Sa'Elis",
        role: "PC",
        bio: "Maga errante das Estepes de Cinzas, busca os fragmentos do Espelho de Anethel.",
        attributesJson: JSON.stringify({ classe: "Maga", nivel: 3, raca: "Élfica" }),
      },
    }),
    prisma.character.create({
      data: {
        projectId: project.id,
        name: "Jorek Punho-de-Ferro",
        role: "NPC",
        bio: "Capitão da guarda portuária. Honesto demais para o cargo.",
        attributesJson: JSON.stringify({ ocupacao: "Guarda", afiliacao: "Coroa" }),
      },
    }),
    prisma.character.create({
      data: {
        projectId: project.id,
        name: "Rainha Ivera",
        role: "VILLAIN",
        bio: "Líder secreta do Culto do Véu. Manipula o conselho com glamour.",
        attributesJson: JSON.stringify({ titulo: "Suma Sacerdotisa do Véu" }),
      },
    }),
  ]);

  // Locais
  const [valoran, porto, cripta] = await Promise.all([
    prisma.location.create({
      data: {
        projectId: project.id,
        name: "Valoran",
        description: "Cidade portuária de pedra negra, capital de uma península em declínio.",
      },
    }),
    prisma.location.create({
      data: {
        projectId: project.id,
        name: "Porto de Ferrania",
        description: "Doca principal de Valoran. Mercadores, corsários e contrabando.",
      },
    }),
    prisma.location.create({
      data: {
        projectId: project.id,
        name: "Cripta do Véu",
        description: "Templo subterrâneo do culto, escondido sob a Catedral Velha.",
      },
    }),
  ]);

  // Itens
  await Promise.all([
    prisma.item.create({
      data: {
        projectId: project.id,
        name: "Espelho de Anethel",
        description: "Artefato fragmentado capaz de revelar a verdadeira forma de qualquer glamour.",
      },
    }),
    prisma.item.create({
      data: {
        projectId: project.id,
        name: "Selo do Magistrado",
        description: "Brasão usado para autenticar éditos do Conselho de Valoran.",
      },
    }),
  ]);

  // Ato 1 + Capítulos + Cenas
  const ato1 = await prisma.act.create({
    data: { projectId: project.id, title: "Ato 1 — Chegada", order: 0 },
  });

  const capitulos = await Promise.all([
    prisma.chapter.create({
      data: {
        actId: ato1.id,
        title: "Capítulo 1 — Atracando em Valoran",
        order: 0,
        summary: "Os personagens chegam ao porto e descobrem que algo não vai bem.",
      },
    }),
    prisma.chapter.create({
      data: {
        actId: ato1.id,
        title: "Capítulo 2 — O Mercado de Cinzas",
        order: 1,
        summary: "Encontros com mercadores, o capitão Jorek e o primeiro rastro do culto.",
      },
    }),
    prisma.chapter.create({
      data: {
        actId: ato1.id,
        title: "Capítulo 3 — Sombras sob a Catedral",
        order: 2,
        summary: "Descida à Cripta do Véu.",
      },
    }),
  ]);

  const prologueContent = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Prólogo" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text:
              "Sa'Elis observou o porto de Ferrania surgir entre a bruma. O cheiro de alga, ferro e medo se misturava no ar. Em algum lugar daquela cidade, um fragmento do Espelho de Anethel a aguardava — e o glamour da Rainha Ivera ainda não suspeitava.",
          },
        ],
      },
    ],
  };

  await prisma.scene.create({
    data: {
      chapterId: capitulos[0].id,
      title: "Prólogo — Bruma no Porto",
      order: 0,
      contentJson: JSON.stringify(prologueContent),
      contentText:
        "Prólogo. Sa'Elis observou o porto de Ferrania surgir entre a bruma...",
      wordCount: 48,
      status: "DRAFT",
    },
  });
  await prisma.scene.create({
    data: {
      chapterId: capitulos[0].id,
      title: "Cena 1 — A Guarda do Cais",
      order: 1,
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      contentText: "",
      status: "DRAFT",
    },
  });
  await prisma.scene.create({
    data: {
      chapterId: capitulos[1].id,
      title: "Cena 1 — Encontro com Jorek",
      order: 0,
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      contentText: "",
      status: "DRAFT",
    },
  });
  await prisma.scene.create({
    data: {
      chapterId: capitulos[2].id,
      title: "Cena 1 — Descida",
      order: 0,
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      contentText: "",
      status: "DRAFT",
    },
  });

  // Glossário
  await Promise.all([
    prisma.glossaryTerm.create({
      data: {
        projectId: project.id,
        term: "Glamour",
        slug: "glamour",
        definition:
          "Ilusão arcana capaz de alterar a percepção de outros — visão, voz, presença. Sempre dissipa ao contato físico forte.",
        partOfSpeech: "NOUN",
        gender: "M",
      },
    }),
    prisma.glossaryTerm.create({
      data: {
        projectId: project.id,
        term: "Valoran",
        slug: "valoran",
        definition: "Cidade portuária à beira do declínio, capital da região.",
        partOfSpeech: "PROPER_NOUN",
        treatAsProper: true,
        caseSensitive: true,
        relatedLocationId: valoran.id,
      },
    }),
    prisma.glossaryTerm.create({
      data: {
        projectId: project.id,
        term: "Sa'Elis",
        slug: "sa-elis",
        definition: "Maga errante. Protagonista da campanha.",
        partOfSpeech: "PROPER_NOUN",
        treatAsProper: true,
        caseSensitive: true,
        relatedCharacterId: saElis.id,
      },
    }),
    prisma.glossaryTerm.create({
      data: {
        projectId: project.id,
        term: "Jorek",
        slug: "jorek",
        definition: "Capitão da guarda portuária de Valoran.",
        partOfSpeech: "PROPER_NOUN",
        treatAsProper: true,
        caseSensitive: true,
        relatedCharacterId: jorek.id,
      },
    }),
    prisma.glossaryTerm.create({
      data: {
        projectId: project.id,
        term: "Espelho de Anethel",
        slug: "espelho-de-anethel",
        definition:
          "Artefato pré-cataclísmico fragmentado em sete cacos, capaz de desfazer qualquer glamour.",
        partOfSpeech: "PROPER_NOUN",
        treatAsProper: true,
        caseSensitive: true,
      },
    }),
  ]);

  // Lore — entradas culturais/sociais
  await Promise.all([
    prisma.lore.create({
      data: {
        projectId: project.id,
        title: "Culto do Véu",
        category: "RELIGION",
        excerpt:
          "Seita clandestina que adora a Filha Velada — uma deidade do ocultamento e do segredo.",
        body:
          "O Culto do Véu opera em camadas concêntricas de iniciação. Os neófitos vestem tecido cru; os iniciados, linho tingido; os Olhos-do-Véu, gaze prateada que cobre o rosto inteiro. Acreditam que cada mentira bem-guardada fortalece a Filha Velada — daí a obsessão por contratos selados e juramentos.",
      },
    }),
    prisma.lore.create({
      data: {
        projectId: project.id,
        title: "Festival das Marés Tristes",
        category: "FESTIVAL",
        excerpt:
          "Realizado todo solstício de inverno em Valoran. Marinheiros perdidos no ano são lembrados.",
        body:
          "Durante três noites, lanternas de papel encerado são soltas no porto. Crianças cantam o Lamento das Marés enquanto os velhos pescadores derramam vinho doce sobre a pedra do cais. No último amanhecer, a guarda dispara três sinos longos; quem não estiver à beira-mar é considerado de mau agouro pelos próximos doze meses.",
      },
    }),
    prisma.lore.create({
      data: {
        projectId: project.id,
        title: "Cerimônia do Selo",
        category: "CEREMONY",
        excerpt:
          "Procedimento legal antigo: para um decreto valer, deve ser selado em cera vermelha sob luz solar.",
        body:
          "O Magistrado de Valoran segura o Selo do Magistrado contra a cera enquanto a luz do meio-dia atinge o brasão. Documentos não selados sob o sol são considerados nulos pela tradição — mesmo que juridicamente válidos. O culto explora essa brecha falsificando selos em dias nublados.",
      },
    }),
  ]);

  // Tags do projeto + relações com capítulos
  const [tagSuspense, tagPolitica, tagOcultismo] = await Promise.all([
    prisma.tag.create({
      data: { projectId: project.id, name: "suspense", color: "#a78bfa" },
    }),
    prisma.tag.create({
      data: { projectId: project.id, name: "política", color: "#f59e0b" },
    }),
    prisma.tag.create({
      data: { projectId: project.id, name: "ocultismo", color: "#34d399" },
    }),
  ]);

  // Capítulo 1: Sa'Elis aparece, suspense
  await prisma.chapterCharacter.create({
    data: { chapterId: capitulos[0].id, characterId: saElis.id },
  });
  await prisma.chapterTag.create({
    data: { chapterId: capitulos[0].id, tagId: tagSuspense.id },
  });

  // Capítulo 2: Sa'Elis + Jorek, política + suspense
  await prisma.chapterCharacter.createMany({
    data: [
      { chapterId: capitulos[1].id, characterId: saElis.id },
      { chapterId: capitulos[1].id, characterId: jorek.id },
    ],
  });
  await prisma.chapterTag.createMany({
    data: [
      { chapterId: capitulos[1].id, tagId: tagPolitica.id },
      { chapterId: capitulos[1].id, tagId: tagSuspense.id },
    ],
  });

  // Capítulo 3: Sa'Elis + Rainha Ivera, ocultismo + suspense
  await prisma.chapterCharacter.createMany({
    data: [
      { chapterId: capitulos[2].id, characterId: saElis.id },
      { chapterId: capitulos[2].id, characterId: queenIvera.id },
    ],
  });
  await prisma.chapterTag.createMany({
    data: [
      { chapterId: capitulos[2].id, tagId: tagOcultismo.id },
      { chapterId: capitulos[2].id, tagId: tagSuspense.id },
    ],
  });

  // Silenciar warning de variável não usada do TS no contexto do seed
  void [porto, cripta, dnd];

  console.log("Seed concluído: projeto 'A Queda de Valoran' criado.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
