export interface DailyInspiration {
  prompt: string;
  theme: string;
  suggestedTitle: string;
  quote: string;
  suggestedTag: string;
}

const FALLBACK_INSPIRATIONS: DailyInspiration[] = [
  {
    theme: 'LA QUIETUD MATUTINA',
    suggestedTitle: 'El despertar de la luz',
    prompt: '¿Qué sonido o sensación inadvertida capturó tu atención en los primeros minutos de este día?',
    quote: '«La soledad no es la ausencia de compañía, sino el momento en que nuestra alma es libre de conversar con nosotros mismos.»',
    suggestedTag: 'quietud',
  },
  {
    theme: 'MEMORIA Y DETALLE',
    suggestedTitle: 'Un recuerdo involuntario',
    prompt: 'Describe un objeto sencillo que hayas conservado durante años y el peso secreto que tiene para ti.',
    quote: '«El tiempo es un río que me arrebata, pero yo soy el río.» — J.L. Borges',
    suggestedTag: 'memoria',
  },
  {
    theme: 'LOS PENSAMIENTOS NO DICHOS',
    suggestedTitle: 'Lo que callamos hoy',
    prompt: '¿Qué pensamiento pasó hoy por tu mente que decidiste no pronunciar en voz alta? Escríbelo aquí con total franqueza.',
    quote: '«Escribir es la manera más profunda de leerse a uno mismo.»',
    suggestedTag: 'introspección',
  },
  {
    theme: 'GRATITUD INADVERTIDA',
    suggestedTitle: 'Pequeñas certezas',
    prompt: 'Menciona tres cosas diminutas y ordinarias que ocurrieron recientemente y que hicieron el día un poco más llevadero.',
    quote: '«Encuentra el éxtasis en la vida; la simple sensación de vivir es alegría suficiente.» — Emily Dickinson',
    suggestedTag: 'gratitud',
  },
  {
    theme: 'EL CAMBIO INVISIBLE',
    suggestedTitle: 'Metamorfosis silenciosa',
    prompt: '¿En qué te sientes sutilmente diferente a quien eras hace exactamente un año, aunque nadie más lo note?',
    quote: '«Nadie se baña dos veces en el mismo río.» — Heráclito',
    suggestedTag: 'evolución',
  },
];

/**
 * Fetches an inspiration prompt from the server-side Gemini API.
 * Uses curated philosophical inspirations as a graceful fallback when offline.
 */
export async function getDailyInspiration(
  category?: string,
  mood?: string
): Promise<DailyInspiration> {
  try {
    const res = await fetch('/api/inspiration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category, mood }),
    });

    if (!res.ok) {
      throw new Error(`Error en servidor (${res.status})`);
    }

    const data: DailyInspiration = await res.json();
    if (!data.prompt) {
      throw new Error('Respuesta inválida de Gemini');
    }

    return data;
  } catch (error) {
    console.warn('Usando inspiración local curada:', error);
    // Pick a random fallback
    const randomIndex = Math.floor(Math.random() * FALLBACK_INSPIRATIONS.length);
    return FALLBACK_INSPIRATIONS[randomIndex];
  }
}
