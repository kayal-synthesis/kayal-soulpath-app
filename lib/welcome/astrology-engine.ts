// ============================================================
// KAYAL WELCOME ENGINE — Astrology Engine
// Sun, Moon, Rising, Element, Modality, Ruling Planet
// Pure client-side. Zero API calls. Zero cost.
// ============================================================

export interface AstrologyProfile {
  sunSign:        string
  moonSign:       string
  risingSign:     string
  sunElement:     string
  moonElement:    string
  sunModality:    string
  rulingPlanet:   string
  northNode:      string
  sunTraits:      string
  moonTraits:     string
  elementNature:  string
  modalityNature: string
  planetNature:   string
}

// ── Sun Sign ──────────────────────────────────────────────────
export function getSunSign(month: number, day: number): string {
  if ((month === 3  && day >= 21) || (month === 4  && day <= 19)) return 'Aries'
  if ((month === 4  && day >= 20) || (month === 5  && day <= 20)) return 'Taurus'
  if ((month === 5  && day >= 21) || (month === 6  && day <= 20)) return 'Gemini'
  if ((month === 6  && day >= 21) || (month === 7  && day <= 22)) return 'Cancer'
  if ((month === 7  && day >= 23) || (month === 8  && day <= 22)) return 'Leo'
  if ((month === 8  && day >= 23) || (month === 9  && day <= 22)) return 'Virgo'
  if ((month === 9  && day >= 23) || (month === 10 && day <= 22)) return 'Libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius'
  if ((month === 12 && day >= 22) || (month === 1  && day <= 19)) return 'Capricorn'
  if ((month === 1  && day >= 20) || (month === 2  && day <= 18)) return 'Aquarius'
  return 'Pisces'
}

// ── Moon Sign (approximation from birth date cycle) ───────────
export function getMoonSign(month: number, day: number, year: number): string {
  const signs = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ]
  const base  = new Date(year, month - 1, day)
  const ref   = new Date(2000, 0, 6)
  const days  = Math.floor((base.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
  const index = ((Math.floor(days / 2.5) % 12) + 12) % 12
  return signs[index]
}

// ── Rising Sign (approximation from birth month + day) ────────
export function getRisingSign(month: number, day: number): string {
  const signs = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ]
  const index = ((month * 2 + Math.floor(day / 15)) % 12 + 12) % 12
  return signs[index]
}

// ── Element ───────────────────────────────────────────────────
export function getElement(sign: string): string {
  if (['Aries','Leo','Sagittarius'].includes(sign))        return 'Fire'
  if (['Taurus','Virgo','Capricorn'].includes(sign))       return 'Earth'
  if (['Gemini','Libra','Aquarius'].includes(sign))        return 'Air'
  return 'Water'
}

// ── Modality ──────────────────────────────────────────────────
export function getModality(sign: string): string {
  if (['Aries','Cancer','Libra','Capricorn'].includes(sign))  return 'Cardinal'
  if (['Taurus','Leo','Scorpio','Aquarius'].includes(sign))   return 'Fixed'
  return 'Mutable'
}

// ── Ruling Planet ─────────────────────────────────────────────
export function getRulingPlanet(sign: string): string {
  const map: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'the Moon',
    Leo: 'the Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
  }
  return map[sign] || 'the Sun'
}

// ── North Node (karmic direction by birth year) ───────────────
export function getNorthNode(year: number): string {
  const nodes = [
    'Aries','Pisces','Aquarius','Capricorn','Sagittarius','Scorpio',
    'Libra','Virgo','Leo','Cancer','Gemini','Taurus',
    'Aries','Pisces','Aquarius','Capricorn','Sagittarius','Scorpio',
  ]
  return nodes[((year - 1900) % 18 + 18) % 18]
}

// ── Plain-language sun traits ─────────────────────────────────
const sunTraitMap: Record<string, string> = {
  Aries:       'someone who leads with instinct, acts before others have finished thinking, and carries a natural authority that comes not from position but from conviction',
  Taurus:      'someone who builds slowly, beautifully, and permanently — who understands at a cellular level that real things take time and that the shortcuts others take always cost something eventually',
  Gemini:      'someone whose mind moves faster than most people can follow, connecting ideas across worlds that others keep separate, and who carries two complete selves that are both entirely real',
  Cancer:      'someone whose outer strength is inseparable from a deep emotional intelligence that most people spend their whole lives trying to develop and never quite reach',
  Leo:         'someone whose presence fills a room before they have said a word, and whose warmth — when it is genuine, which it is — people remember long after you have gone',
  Virgo:       'someone who sees what is broken and knows exactly how to fix it, who does not need the credit, and whose standards for their own work are significantly higher than what anyone else would require',
  Libra:       'someone whose entire life is a search for beauty, for justice, and for the kind of connection that feels genuinely equal — and who knows, somewhere beneath the diplomacy, exactly what they think',
  Scorpio:     'someone who sees beneath every surface, feels everything at full volume, and cannot be satisfied with anything that is not completely real — which means you have always lived at a greater depth than most people around you',
  Sagittarius: 'someone who was never built for small lives, small questions, or small versions of the truth — someone the horizon keeps calling even when the place you are is already good',
  Capricorn:   'someone who understands that everything worth having is built rather than found, and who has both the patience and the discipline to build it — even when the building takes longer than anyone else would stay',
  Aquarius:    'someone who arrived in this world already slightly ahead of it, carrying perspectives that will not make sense to most people until later, and who has probably spent significant energy wondering why what seems obvious to you is invisible to others',
  Pisces:      'someone who feels the world more deeply than most people will ever admit is possible, whose imagination reaches places logic cannot follow, and who carries a compassion that is less a quality than a way of being',
}

// ── Plain-language moon traits ────────────────────────────────
const moonTraitMap: Record<string, string> = {
  Aries:       'you process emotion through action — feeling and moving are the same impulse for you, which means your emotional life is intense but rarely prolonged',
  Taurus:      'you need stability beneath you to function at full capacity — you feel deeply but process slowly, and you carry emotional experiences longer than you reveal',
  Gemini:      'you process feeling through thought and language — you need to talk through what you feel in order to understand it, sometimes to yourself, sometimes to the right person',
  Cancer:      'your emotional memory is almost photographic — you carry the texture of significant experiences long after others have forgotten them, and your instincts about people are almost never wrong',
  Leo:         'you need to feel genuinely seen in order to feel emotionally safe — your inner life is generous but it requires reciprocity to sustain itself at full capacity',
  Virgo:       'you process emotion through analysis — you need to understand why you feel before you can release the feeling, which means your inner life is more complex than what appears on the surface',
  Libra:       'your emotional wellbeing is directly tied to the quality of your relationships — harmony is not optional for you, it is the condition under which you function',
  Scorpio:     'your emotions run so deep they are almost invisible from the outside, but internally they shape every decision you make — you feel everything at a volume most people do not have access to',
  Sagittarius: 'you need freedom within your emotional life as much as in your outer life — you process feeling through meaning, through the larger story you are telling yourself about what is happening',
  Capricorn:   'you tend to manage emotion rather than express it, until the pressure builds to the point where it must come out — which means people around you often underestimate what you are actually carrying',
  Aquarius:    'you experience emotion somewhat separately from yourself — you observe your feelings with curiosity rather than being fully consumed by them, which gives you perspective but can create distance',
  Pisces:      'your emotional boundaries are naturally porous — you absorb the feelings of those around you without always realising you are doing it, which makes you extraordinarily empathetic and occasionally exhausted',
}

// ── Element nature (plain language) ──────────────────────────
const elementNatureMap: Record<string, string> = {
  Fire:  'you are animated by vision, by the possibility of what could exist rather than what does, and by a need for your life to carry genuine meaning rather than mere function',
  Earth: 'you are grounded in what is real, what is measurable, and what can actually be built — your relationship with the material world is not attachment but craft',
  Air:   'you are animated by ideas, by connection, by the movement of thought between people and across domains — your natural element is the conversation that changes something',
  Water: 'you are animated by feeling, by depth, by the invisible currents that move beneath the surface of what is visible — your natural intelligence is emotional and intuitive rather than analytical',
}

// ── Modality nature (plain language) ─────────────────────────
const modalityNatureMap: Record<string, string> = {
  Cardinal: 'you are a natural initiator — you generate beginnings, create momentum, and move into new territory before others have decided to move',
  Fixed:    'you carry a quality of sustained commitment that most people cannot match — once you have chosen a direction you hold it with a consistency that is both your greatest strength and your most demanding quality',
  Mutable:  'you are designed for transition — you read changing conditions with an accuracy others cannot access, and you adapt to new territory without the loss of self that transition costs most people',
}

// ── Ruling planet nature (plain language) ────────────────────
const planetNatureMap: Record<string, string> = {
  Mars:     'your primary drive is action — you are energised by challenge, by the forward movement of will against resistance, and by the satisfaction of having made something happen',
  Venus:    'your primary drive is beauty and connection — you are energised by harmony, by aesthetic quality, and by the experience of genuine meeting between people',
  Mercury:  'your primary drive is understanding — you are energised by the movement of ideas, by the precision of language, and by the satisfaction of making something complex suddenly clear',
  'the Moon': 'your primary drive is emotional truth — you are energised by genuine feeling, by the quality of your connections, and by environments where authenticity is possible',
  'the Sun': 'your primary drive is expression — you are energised by the opportunity to contribute your full self, to be genuinely seen, and to create something that carries your authentic mark',
  Jupiter:  'your primary drive is expansion — you are energised by growth, by the pursuit of understanding across the largest possible territory, and by the sense that what is possible is always larger than what currently exists',
  Saturn:   'your primary drive is mastery — you are energised by the long work of building something that holds, by the development of genuine expertise, and by the satisfaction of meeting your own highest standard',
  Uranus:   'your primary drive is originality — you are energised by the unconventional, by the idea that has not been thought before, and by the possibility of changing something that everyone else accepted as fixed',
  Neptune:  'your primary drive is transcendence — you are energised by beauty, by spiritual depth, and by the experience of something larger than the ordinary self',
  Pluto:    'your primary drive is transformation — you are energised by depth, by the process of moving through what is difficult into what is more real, and by the kind of change that is permanent',
}

// ── Main export ───────────────────────────────────────────────
export function buildAstrologyProfile(month: number, day: number, year: number): AstrologyProfile {
  const sunSign  = getSunSign(month, day)
  const moonSign = getMoonSign(month, day, year)
  const rising   = getRisingSign(month, day)
  const planet   = getRulingPlanet(sunSign)

  return {
    sunSign,
    moonSign,
    risingSign:     rising,
    sunElement:     getElement(sunSign),
    moonElement:    getElement(moonSign),
    sunModality:    getModality(sunSign),
    rulingPlanet:   planet,
    northNode:      getNorthNode(year),
    sunTraits:      sunTraitMap[sunSign]    || '',
    moonTraits:     moonTraitMap[moonSign]  || '',
    elementNature:  elementNatureMap[getElement(sunSign)]   || '',
    modalityNature: modalityNatureMap[getModality(sunSign)] || '',
    planetNature:   planetNatureMap[planet] || '',
  }
}