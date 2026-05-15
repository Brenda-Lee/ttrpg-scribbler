import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Limpa em ordem para respeitar FKs
  await prisma.glossaryTerm.deleteMany();
  await prisma.tag.deleteMany();
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

  // Silenciar warning de variável não usada do TS no contexto do seed
  void [porto, cripta, queenIvera];

  console.log("Seed concluído: projeto 'A Queda de Valoran' criado.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
