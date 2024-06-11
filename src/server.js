/**
 * The core server that runs on a Cloudflare worker.
 */

import { AutoRouter } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import { ROCK_FACT } from './commands.js';

const facts = [
  'If you soak a raisin in grape juice, it becomes a grape!',
  'Dinosaurs had big ears, but everyone forgot because dinosaur ears don’t have bones!',
  'Rubber bands last longer when refrigerated!',
  'Your brain is constantly eating itself 🧠🍴',
  'It was once considered sacrilegious to use a fork!',
  'Tomatoes have more genes than humans!',
  'You smell amazing!',
  'Cat pee glows under black light!',
  'Almonds are related to peaches!',
  'Sharks are the only fish that can blink with both eyes!',
  'The moon has moonquakes!',
  'You are loved ❤️',
  'The full name of Los Angeles is “El Pueblo de Nuestra Senora la Reina de los Angeles de Porciuncula”!',
  "Pigs can't look up at the sky!",
  'Our solar system is moving through space at 515,000 miles per hour!',
  'The 100 folds in a chef’s hat represent 100 ways to cook an egg!',
  'Gary Oldman is actually 13 days younger than Gary Numan.',
  'A single litter of kittens can have more than one father.',
  'Redheads typically need about 20% more anesthesia than people with different hair color.',
  'Toilet paper is thought to have first been produced in the late 800s AD in China.',
  'The "Hollywood" sign on the hills in Los Angeles originally read "Hollywoodland".',
  'When taking a warm shower, people exeprience an increased dopamine flow which leads to more creativity.',
  'A cockroach can live for nine days without its head before it finally dies of starvation.',
];

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env,
  );
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 });
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case ROCK_FACT.name.toLowerCase(): {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: fact,
          },
        });
      }
      default:
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }

  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
};

export default server;
