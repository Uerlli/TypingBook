import type { BookMeta } from "@/types";

interface DemoBook {
  meta: BookMeta;
  content: string;
  filteredContent: string;
}

const domCasmurroContent = `Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus.

Sucedeu, porém, que, como eu estava cansado, fechei os olhos três ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso. Olhou-me uns instantes, e perguntou-me se eu gostava de música. Disse-lhe que sim, que era a arte que mais me falava ao coração, e ele sorriu como quem descobre num estranho uma velha afinidade.

— Pois então ouça, tornou ele, e vai ver que não é preciso viagem longa para a gente achar o que procura.

A noite caía devagar sobre os telhados, e o trem corria entre quintais e muros baixos, onde as árvores pareciam cochichar. Fiquei a imaginar que história seria aquela, que começava assim, sem pressa, com um desconhecido que se senta ao nosso lado e nos conta a vida alheia como se fosse a nossa.

Há pessoas que se apossam da nossa atenção sem pedir licença. Esse rapaz era uma delas. Falava das coisas pequenas com um cuidado de quem as havia pesado muito tempo, e cada palavra vinha no lugar exato, como se o mundo fosse composto de peças que só ele sabia ordenar. Quando o trem parou na estação, despediu-se com um aceno, e eu fiquei a olhar o vagão vazio, sem saber se havia sonhado ou ouvido.

Mais tarde, já em casa, ainda me lembrava da voz dele, daquela cadência mansa que transformava qualquer assunto em confissão. E foi então que percebi: o que ele queria, no fundo, era contar-se a si mesmo, e eu havia sido apenas a parede onde a sombra dele se projetou por alguns minutos.`;

const metamorfoseContent = `Ao acordar, certa manhã, depois de um sono inquieto, o viajante de negócios encontrou-se na cama transformado numa criatura de outra espécie. Não era um sonho. O quarto, embora pequeno para um ser humano, parecia-lhe agora vasto e estranho, e as paredes comuns haviam adquirido uma gravidade nova.

Tentou erguer-se e não conseguiu. O corpo, antes previsível, respondia com pesos e ângulos que ele não reconhecia. A luz da janela entrava oblíqua e desenhava no chão as formas familiares dos móveis, mas ele já não podia confiar no que os olhos lhe diziam.

Pensou no trem que perderia, no chefe que o esperava, no atraso que se acumulava sobre a sua reputação de homem pontual. Essas obrigações, que ontem pareciam o próprio tecido do mundo, hoje soavam distantes, como um ruído que vem de outro andar.

Do outro lado da porta, ouviu a voz da família, primeiro preocupada, depois impaciente. Batiam na madeira e perguntavam se ele estava doente. Ele tentou responder, mas a resposta saiu como um som que não pertencia a nenhuma língua conhecida, e o silêncio que se seguiu pesou mais do que qualquer palavra.

Ficou muito tempo imóvel, ouvindo a casa acordar sem ele. E, pela primeira vez, entendeu que a mudança não havia começado naquela manhã: ela vinha de longe, de todas as manhãs em que se levantara sem se perguntar por quê.`;

export const demoBooks: DemoBook[] = [
  {
    meta: {
      id: "demo-dom-casmurro",
      title: "Dom Casmurro",
      author: "Machado de Assis",
      format: "txt",
      wordCount: 342,
      progress: 42,
      currentSession: 3,
      totalSessions: 9,
      avgWpm: 48,
      completedSessions: 4,
      coverColor: "#bef264",
      lastRead: "2026-09-20T18:20:00.000Z",
      createdAt: "2026-08-02T10:00:00.000Z",
    },
    content: domCasmurroContent,
    filteredContent: domCasmurroContent,
  },
  {
    meta: {
      id: "demo-metamorfose",
      title: "A Metamorfose",
      author: "Franz Kafka",
      format: "txt",
      wordCount: 285,
      progress: 16,
      currentSession: 1,
      totalSessions: 6,
      avgWpm: 41,
      completedSessions: 1,
      coverColor: "#fcd34d",
      lastRead: "2026-09-18T20:05:00.000Z",
      createdAt: "2026-08-14T09:30:00.000Z",
    },
    content: metamorfoseContent,
    filteredContent: metamorfoseContent,
  },
];