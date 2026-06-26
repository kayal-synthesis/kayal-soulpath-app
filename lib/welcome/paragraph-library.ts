// ============================================================
// KAYAL WELCOME ENGINE Paragraph Library v3
// Complete rewrite. Zero dashes. Zero repeated patterns.
// Every card draws from different signals invisibly.
// Varied sentence structure, rhythm, and length throughout.
// ============================================================

import type { NumerologyProfile } from './numerology-engine'
import type { AstrologyProfile }  from './astrology-engine'

export interface WelcomeCard {
  section:    string
  icon:       string
  paragraphs: [string, string]
}

const fn = (name: string) => name.trim().split(' ')[0]

const pyContext: Record<number, string> = {
  1:  'a year of initiation. Something new is available that was not available twelve months ago. The door is open. The question is not whether you are ready. It never was.',
  2:  'a year asking for patience and trust. The work is quiet, invisible, and real. What is growing beneath the surface of your circumstances right now will not be small.',
  3:  'a year calling your voice forward. Expression, connection, the willingness to be heard at the frequency you actually carry. The world is more ready for you than you have believed.',
  4:  'a year for building. Not planning to build. Actually laying stone. What gets constructed this year in discipline and intention will still be standing in a decade.',
  5:  'a year of significant movement. The ground is shifting and that is not a problem. It is the mechanism. Stay curious rather than afraid of what is replacing what you knew.',
  6:  'a year oriented around love and responsibility. The most important work available to you happens not in achievement but in the quality of care you bring to what matters most.',
  7:  'a year for going inward. The outer world will not yield much. But the interior upgrades available in this season will alter how you see everything that follows.',
  8:  'a year of power and momentum. Every effort of the past several years is available to compound now. This is not the year to hesitate.',
  9:  'a year of completion. Something significant is finishing, not because it failed but because it is done. Release it with the full weight of what it taught you.',
  11: 'a year operating at a frequency most years never reach. Your sensitivity is heightened. Trust what you perceive before you can explain it. It is almost certainly accurate.',
  22: 'a year asking you to build at a scale you may have been approaching cautiously. The vision is ready. The question is whether you will treat it with the seriousness it requires.',
  33: 'a year of deep service. What you offer this year, how you show up for others, carries an impact that extends well beyond what you can trace from where you are standing.',
}

const pinnacleTheme: Record<number, string> = {
  1:  'a chapter of becoming, of establishing who you actually are beneath everything you were taught you should be',
  2:  'a chapter of partnership and depth, where your greatest growth arrives through genuine connection rather than independent effort',
  3:  'a chapter of expression, where what you carry internally is being asked to become something the world can receive',
  4:  'a chapter of building, where the structures you construct now become the foundation that everything later stands on',
  5:  'a chapter of expansion, where change is not disruption but the actual mechanism of your development',
  6:  'a chapter of love and service, where your greatest contribution happens through how fully you show up for what and who you care about',
  7:  'a chapter of depth and mastery, where genuine authority is built through the willingness to go further than the obvious',
  8:  'a chapter of achievement and power, where what you have been capable of is finally being met by circumstances worthy of it',
  9:  'a chapter of wisdom and completion, where everything you have accumulated is becoming something you can genuinely offer',
  11: 'a master chapter of spiritual illumination, where your sensitivity is not a liability but the exact instrument this period requires',
  22: 'a master chapter of visionary building, where the scale of what is possible through you is larger than most people attempt in a lifetime',
  33: 'a master chapter of unconditional service, where the love you carry has the capacity to function as a genuine healing force',
}

const challengeDesc: Record<number, string> = {
  0:  'the ongoing task of choosing your own direction in a world full of loud, confident opinions about what you should want',
  1:  'the work of building real independence without mistaking isolation for strength or self-sufficiency for completion',
  2:  'the practice of receiving care with the same quality of attention you extend to others',
  3:  'the discipline of bringing what you imagine all the way into finished form rather than leaving it permanently in the luminous stage of possibility',
  4:  'the specific friction between your need for freedom and the structural discipline that real building requires',
  5:  'the discovery that depth requires duration, and that the restlessness you feel in the middle of things is not always a signal to leave',
  6:  'the learning that your own needs are not a betrayal of your love for others, that you matter in the equation you are always solving for everyone else',
  7:  'the practice of trusting your own perception, especially in the moments when what you sense differs from what the people around you are willing to acknowledge',
  8:  'the integration of power and tenderness, the discovery that the strength that produces results and the softness that produces love are not in conflict',
  9:  'the art of releasing what is complete, of letting the chapter close without holding on past the point where holding becomes a cost to both parties',
}

const soulUrgeHunger: Record<number, string> = {
  1:  'to operate with complete autonomy, to make decisions from their own centre without needing permission from any external authority',
  2:  'to be truly known by another person, to be in a connection so real that pretending is no longer necessary',
  3:  'to express what they actually carry, without editing, without the soft apology that precedes most of what they say',
  4:  'to build something that holds, something real and lasting that could not have existed without the specific quality of their effort',
  5:  'to taste everything, to move freely through the world without the ceiling that convention places on experience',
  6:  'to love and be loved completely, without the calculation that most relationships carry beneath their surface',
  7:  'to understand things fully, to go beneath every surface until what is actually there has been encountered rather than described',
  8:  'to operate at the scale they are actually capable of, without the modesty that keeps most people smaller than their capacity',
  9:  'to give something real back, to have their existence matter in a way that outlasts the immediate',
  11: 'to live at the level of their own perception, without the constant translation into simpler terms that most environments require',
  22: 'to build something of genuine magnitude, something that could not have been produced by someone with smaller vision or smaller nerve',
  33: 'to love without limit and to have that love be received rather than managed or redirected',
}

const personalityOuter: Record<number, string> = {
  1:  'as someone who knows where they are going before the destination is clear to anyone else, someone whose certainty in motion has a quality that makes other people want to follow',
  2:  'as someone unusually safe to be around, someone in whose presence the difficult things feel possible to say without the usual cost',
  3:  'as someone whose way of being in conversation produces something in others that they find difficult to explain, a quality of aliveness that was not present before',
  4:  'as someone profoundly reliable, someone whose word means something in a world where most people operate with significant margin for revision',
  5:  'as someone interesting in a specific way, someone who has clearly been places and thought things through in territory most people never enter',
  6:  'as someone warm in a way that has specific gravity, someone whose care is not performance but the actual texture of how they engage with everything',
  7:  'as someone who sees further than most, someone whose observations have a quality of arriving from a different depth than the usual',
  8:  'as someone carrying a particular authority that has nothing to do with titles, the authority of someone who has clearly done the work and produced the results',
  9:  'as someone in whose presence the truth tends to become more accessible, as though the depth of what they have been through makes pretence feel unnecessary',
  11: 'as someone uniquely perceptive, someone whose understanding of what is actually happening beneath the surface of things is disquieting in its accuracy',
  22: 'as someone thinking at a scale that is not typical, whose ambitions are not boasts but genuine assessments of what they understand themselves to be capable of',
  33: 'as someone in whose presence other people tend to tell the truth, as though the quality of acceptance they carry makes the edited version unnecessary',
}

const northNodeDir: Record<string, string> = {
  Aries:       'toward courage, toward the willingness to initiate, to step forward before the outcome is guaranteed, to trust the instinct that says now',
  Taurus:      'toward solidity, toward building something real and beautiful that does not require constant maintenance to persist',
  Gemini:      'toward curiosity and connection, toward the willingness to speak, to exchange, to let ideas move between people rather than accumulate in private',
  Cancer:      'toward genuine belonging, toward the vulnerability of needing and being needed, of allowing home to be a real place rather than a concept',
  Leo:         'toward authentic expression, toward the willingness to be seen fully rather than strategically, to let the light out without managing where it lands',
  Virgo:       'toward service and precision, toward the satisfaction of making something work correctly, of bringing real skill to bear on real problems',
  Libra:       'toward genuine partnership, toward the willingness to share both the weight and the credit, to build something together rather than alone',
  Scorpio:     'toward depth, toward the willingness to go all the way into what is real rather than staying at the surface where things are safer but smaller',
  Sagittarius: 'toward meaning and expansion, toward the questions that have no comfortable answers and the territories that require a larger self to inhabit',
  Capricorn:   'toward mastery, toward the long work of building something that endures, something that earns its authority through time and discipline',
  Aquarius:    'toward contribution at scale, toward the willingness to serve something larger than the personal, to bring the unusual vision into usable form',
  Pisces:      'toward surrender and compassion, toward the dissolution of the boundary between the self and what it loves, toward trust in what cannot be controlled',
}

const moonProcessing: Record<string, string> = {
  Aries:       'moves through feeling quickly, intensity followed by release, without the prolonged internal processing that other people require',
  Taurus:      'processes slowly and completely, needing time and stability to metabolise what has happened before it can be genuinely set down',
  Gemini:      'thinks through what it feels, needing language and conversation as the medium through which emotion becomes intelligible',
  Cancer:      'absorbs and retains, carrying the texture of significant experiences long after others have moved on, with instincts about people that prove accurate far more often than can be explained',
  Leo:         'needs to feel seen in order to feel safe, generously available to others but genuinely requiring reciprocity to sustain itself',
  Virgo:       'analyzes what it feels before it can release it, needing to understand the source and meaning of an experience in order to actually put it down',
  Libra:       'is directly tied to the quality of its relationships, requiring genuine harmony not as preference but as the actual condition of functioning well',
  Scorpio:     'runs deep and largely invisible, shaping decisions and directions from beneath the surface without necessarily surfacing into language',
  Sagittarius: 'processes through meaning, needing to locate an experience inside a larger story before it can be fully felt and released',
  Capricorn:   'tends to manage rather than express, containing what it carries until the pressure reaches a threshold that requires release',
  Aquarius:    'observes its feelings with a degree of detachment, experiencing emotion somewhat separately from itself, with curiosity rather than full immersion',
  Pisces:      'is porous, absorbing what surrounds it without always distinguishing between its own feelings and those it has received from others',
}

const sunNature: Record<string, string> = {
  Aries:       'someone who moves toward what calls them before the case for moving has been fully assembled',
  Taurus:      'someone who builds things slowly, beautifully, and with an endurance that most people admire without fully understanding its source',
  Gemini:      'someone whose mind makes connections across territories that most people experience as separate, at a speed that can be disorienting to those watching',
  Cancer:      'someone whose outer strength is built on an emotional intelligence most people spend decades trying to cultivate and never quite reach',
  Leo:         'someone whose presence registers before they have spoken, whose warmth when it is genuine creates the kind of memory that people carry for years',
  Virgo:       'someone who sees exactly what is broken and knows precisely how to fix it, who brings a standard to their work that has nothing to do with external requirement',
  Libra:       'someone whose entire life is organised around the search for beauty, fairness, and the kind of connection that feels genuinely equal',
  Scorpio:     'someone who cannot be satisfied with anything that is not completely real, who feels everything at full volume and sees beneath every surface as a matter of instinct',
  Sagittarius: 'someone the horizon keeps calling, who was never built for small lives or small questions and has never pretended otherwise',
  Capricorn:   'someone who understands at a cellular level that everything worth having is built rather than found, and who has both the patience and the discipline to build it',
  Aquarius:    'someone who arrived in this world already slightly ahead of it, carrying perspectives that will not make sense to most people until later',
  Pisces:      'someone whose imagination reaches places logic cannot follow, whose compassion is not a quality they practice but a way of being they inhabit',
}

const elementNature: Record<string, string> = {
  Fire:  'animated by vision and possibility, needing their life to carry genuine meaning rather than mere function',
  Earth: 'grounded in what is real and buildable, with a relationship to the material world that is less about attachment than about craft',
  Air:   'animated by ideas and the movement of thought between people, most alive in the exchange where something shifts',
  Water: 'animated by feeling and the invisible currents beneath what is visible, with an intelligence that is emotional and intuitive before it is analytical',
}

const modalityNature: Record<string, string> = {
  Cardinal: 'someone who generates beginnings, who moves into new territory before others have decided whether to move',
  Fixed:    'someone with a quality of sustained commitment that most people cannot match once a direction has been chosen',
  Mutable:  'someone designed for transition, reading changing conditions with an accuracy that allows adaptation without the loss of self that transition costs others',
}

function buildOpening(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n = fn(name)
  return [
    `${n}, stop for a moment before you read further. What follows was not written for a general audience. It was calculated from the specific numbers encoded in your exact date of birth, the letters of your name, and where you are in the larger cycles your life has been moving through since you arrived. Some of what you are about to read will feel like confirmation of things you have carried quietly for a long time. Some of it will name things you have never heard named before. All of it belongs to you.`,
    `This reading is shown only once. It cannot be retrieved after you close it. Take your time with each section. There is a listening option if you would rather hear it spoken. There is a download at the end if you want to keep it. Begin when you are ready.`,
  ]
}

function buildWhoYouAre(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n  = fn(name)
  const lp = num.lifePathNumber

  const hooks: Record<number, string> = {
    1: `Something sets you apart and people sense it before you have said anything, a quality of self-direction that reads as confidence but is actually something more specific: the knowledge, arrived at early and never quite departed, that the standard frameworks for living were designed for someone else. The conventional timelines, the expected shapes of a successful life, the permission structures most people navigate without questioning, none of them have ever quite fit you, and you have spent considerable energy either trying to make them fit or quietly, persistently, refusing to. What your blueprint reveals is that this is not a personality quirk. It is an accurate perception of who you actually are and what you are actually here to do. You are ${sunNature[ast.sunSign] || 'someone whose intelligence operates at a frequency most environments were not designed to accommodate'}. Internally, your emotional life ${moonProcessing[ast.moonSign] || 'operates with a depth that is largely invisible from the outside'}. The combination of these two realities explains why you have sometimes felt simultaneously too much and not quite right for the rooms you have occupied. You were not built for the standard container.`,
    2: `Most people move through their relationships in a state of managed presence, close enough to function but not fully there. You are one of the rare few capable of being completely present with another person, and when you are, something happens to them that they struggle to explain afterward. They feel genuinely seen, not heard in the way people nod while preparing their response, but actually encountered, as though someone finally looked at the whole of who they are and found it worth their complete attention. This is not a warmth you perform. It is a form of intelligence so specific that most people who have experienced it from you have spent years afterward looking for it in other relationships and finding only approximations. You are ${sunNature[ast.sunSign] || 'someone whose capacity for genuine attention is one of the rarest things one person can offer another'}. Emotionally, your inner life ${moonProcessing[ast.moonSign] || 'absorbs more than it releases, carrying what it has touched with a fidelity that most people never develop'}. What this combination produces is someone whose gift for connection comes at a cost that most of the people being connected to will never fully appreciate.`,
    3: `When you speak about something you actually care about, the quality of the room changes. Not because you have learned to be compelling, not because you perform warmth or authority, but because the way you translate lived experience into language operates at a frequency that bypasses other people's critical faculties and lands in the part of them that simply recognises what is true. People have probably told you that you changed something in them, in conversation or in what you made, without being able to say exactly what it was or where it came from. What your blueprint reveals is that this is not accidental and it is not separate from everything you have actually been through. The authority in your voice is the authority of someone who walked the territory rather than studied it. You are ${sunNature[ast.sunSign] || 'someone whose expressive intelligence was never designed to stay in the private register'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'processes through language, needing to say things in order to understand what it actually feels'}. This means your gift and your emotional life are more deeply connected than they may appear.`,
    4: `You build things that hold, and this is rarer than it sounds. Not starting things, not planning them, not conceiving of them with genuine detail and then watching them stay in the conception stage. Actually finishing them, correctly, in the way that does not require constant repair. When you take something on, it gets done. The people around you have learned this without necessarily naming it, and they rely on it in ways they would struggle to articulate if you asked. What most of them have never understood is the interior cost of being this person, the sustained, unglamorous, invisible discipline required to produce the reliability they take for granted. You are ${sunNature[ast.sunSign] || 'someone whose relationship with effort is not performance but the actual texture of how you engage with anything worth doing'}. Emotionally, your inner life ${moonProcessing[ast.moonSign] || 'processes slowly and with full attention, requiring time to metabolise before genuine release is possible'}. The combination explains why you are both more capable and more tired than most people around you understand.`,
    5: `You have lived more versions of your own life than most people live in total. Not because you are unstable but because your method of learning has always been immersion rather than observation, and the breadth of what you have experienced has produced a specific form of intelligence that cannot be acquired any other way. You know things about the nature of change, about the texture of disruption from the inside, about the difference between restlessness that signals genuine readiness and restlessness that is simply the discomfort of depth, that are only available to someone who has actually been in the territory. You are ${sunNature[ast.sunSign] || 'someone whose understanding of the world was always going to come through living it rather than reading about it'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'moves quickly, intensity followed by release, without the prolonged processing that other people require'}. This speed is not shallowness. It is a different kind of thoroughness.`,
    6: `People come to you when their world falls apart. Not because you advertise this capacity, but because something in how you show up communicates something that most people are starving for and rarely find: the genuine willingness to be present with what is hard without flinching, without rushing toward resolution before the person in front of you has been fully heard. You love in a way that heals. This is not a metaphor. The people whose lives have been touched by your care carry something from it for years, and what they carry is not the memory of what you did but the memory of what it felt like to be fully met. You are ${sunNature[ast.sunSign] || 'someone whose capacity for care is not a strategy but the actual way you inhabit the world'}. Emotionally, your inner life ${moonProcessing[ast.moonSign] || 'is directly tied to the quality of the connections around you, needing genuine harmony as a condition of functioning at full capacity'}. This means your gift and your most significant vulnerability share the same address.`,
    7: `There is more beneath the surface of everything than what is immediately visible, and you have always known this in a way that goes beyond intellectual conviction into something closer to direct perception. You have a built-in sense of when the explanation being offered is a simplification, when the consensus version of reality is several steps behind what is actually happening, when the obvious interpretation is simply wrong. Most people accept the first answer because searching for the real one is uncomfortable and socially inconvenient. You have never been able to accept the first answer, not because you are difficult but because you are accurate. You are ${sunNature[ast.sunSign] || 'someone whose intelligence is primarily investigative, whose natural movement is always toward the real rather than the comfortable'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'tends to analyze what it feels before it can release it, needing to understand the source before genuine resolution becomes possible'}. The same depth that makes you extraordinary makes ordinary environments expensive to inhabit for long.`,
    8: `The gap between what exists and what could exist is not abstract to you. You see it with a specificity and a confidence, not arrogance but confidence, that most people do not have access to. You believe the gap is closable because you understand, at a structural level, what closing it actually requires. This is not optimism. It is a form of intelligence that allows you to hold both the vision and the blueprint simultaneously, to see what is possible and understand in genuine detail how to get from here to there. You are ${sunNature[ast.sunSign] || 'someone whose primary intelligence is strategic, whose natural mode is the translation of vision into result'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'tends to contain rather than express, managing what it carries until the pressure requires release'}. The discipline this produces is real. The cost of it is also real, and it is usually paid in the domain of your closest relationships.`,
    9: `You have been through enough to know what actually matters, and this knowledge, earned through everything you have lived rather than studied, is one of the rarest things a person can carry. Most wisdom is theoretical. Yours is not. It has been tested at significant cost and it survived the testing, which means it is not a philosophy but something closer to a fact about the nature of things that you arrived at through the only method that produces real knowledge: living your own life with your eyes open all the way through. You are ${sunNature[ast.sunSign] || 'someone whose depth of understanding has been earned rather than inherited'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'carries what it has touched with a fidelity and a longevity that most people never develop, releasing slowly and fully rather than quickly and partially'}. The version of you that exists today has something to offer that could only have been produced by someone willing to go through exactly what you went through and come out still paying attention.`,
    11: `You sense things before they are visible. Not as a metaphor and not as something you can always explain in socially acceptable terms, but as an actual perceptive capacity that has led you to accurate conclusions before the evidence arrived, that has told you the quality of a situation or a person before the information was in, that has made you right in precisely the cases where being right was most inconvenient to defend. This is not mysticism. It is a form of perception operating at a frequency most people's instruments cannot detect. You are ${sunNature[ast.sunSign] || 'someone whose intelligence is primarily intuitive, whose most reliable information arrives before it can be explained'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'is porous, absorbing the emotional reality of your surroundings without always distinguishing between what belongs to you and what you have received from others'}. Managing the distinction between your own perception and what you have absorbed from those around you is one of the central disciplines of your life.`,
    22: `The scale at which you think is not something that translates easily into ordinary conversation. Not because you are incapable of speaking plainly, but because the frameworks most people use to plan their lives were not built to accommodate what you are actually capable of. You think in terms of what could be built, what could be changed, what would happen if the right elements came together in the right sequence, and the visions that result are not fantasies. They are blueprints. The gap between what you imagine and what gets built has more to do with timing and the willingness to operate at the actual scale than with the validity of the vision. You are ${sunNature[ast.sunSign] || 'someone whose primary intelligence is architectural, whose natural mode is designing structures that allow other people to do things they could not do without them'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'contains its intensity rather than expressing it, which produces both the discipline and the distance that characterise your outer life'}. Both are real. Both matter.`,
    33: `The love you carry is not ordinary tenderness and it has never been. It is something closer to a force, a capacity to hold another person's brokenness with such complete acceptance that healing becomes possible simply through the quality of your presence, without you doing anything in particular, without you saying the right thing, simply by being fully there without the need for the situation to be more manageable than it is. You have probably been told more times than you can count that you are easy to talk to, that people feel safe around you, that something about you makes the difficult things feel possible to say out loud. You are ${sunNature[ast.sunSign] || 'someone whose capacity for unconditional acceptance is not performed but is the actual texture of how you encounter what you love'}. Emotionally, your inner world ${moonProcessing[ast.moonSign] || 'is deeply porous, absorbing the emotional reality of the people around you with such completeness that the boundary between your feelings and theirs is genuinely difficult to locate'}. This is both the source of your gift and the thing that makes your gift most costly to carry.`,
  }

  const p1 = hooks[lp] || hooks[9]
  const p2 = `You are also ${modalityNature[ast.sunModality] || 'someone designed for a specific kind of motion through the world'}. And beneath all of it, ${elementNature[ast.sunElement] || 'animated by a quality of energy that most people around you sense without knowing its name'}. None of this is separate. It is all the same person, moving in the same direction, carrying the same thing toward a destination that is only now beginning to become clear.`

  return [p1, p2]
}

function buildGreatestGift(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n    = fn(name)
  const lp   = num.lifePathNumber
  const pnum = num.personalityNumber
  const bg   = num.birthdayGift

  const giftCore: Record<number, string> = {
    1:  `The gift is the capacity to begin. Not to plan a beginning, not to conceive of one in careful detail, but to actually initiate, to set something in motion that would not have moved without you. This is rarer than it appears because most people who can see what is possible lack the particular quality of will that converts possibility into the first concrete step. ${n}, you have that quality. It is what others experience when they are around you at your best: the sense that things are going to move now, that what was theoretical is about to become actual. They experience you ${personalityOuter[pnum] || 'as someone whose conviction in motion has a gravitational quality that makes forward movement feel possible even to people who arrived without momentum of their own'}.`,
    2:  `The gift is the quality of your attention. When you are fully present with someone, which you are capable of being in a way that most people are not, something happens to them that they find difficult to describe afterward. They felt met. Not managed, not listened to in the transactional sense, but genuinely encountered by someone who had the capacity and the willingness to be actually there. This is not common. ${n}, you carry this in your hands without always knowing it. Others experience you ${personalityOuter[pnum] || 'as someone in whose presence the difficult things feel possible to say without the usual cost'}, which is why people bring you the real version of what is happening rather than the edited one.`,
    3:  `The gift is your ability to make meaning from experience and offer it in a form other people can receive. Not through analysis, which is something else, but through the particular way you render what you have lived into language, image, story, or presence that lands in others at a frequency beneath argument. ${n}, what you produce when you are operating at full capacity does not require people to decide whether they agree. It simply arrives as true. Others experience you ${personalityOuter[pnum] || 'as someone who produces something in the room, in the conversation, in the exchange, that was not present before and that people carry with them when they leave'}.`,
    4:  `The gift is your capacity to make things real. The gap between vision and execution is enormous and most people who can see clearly cannot build what they see. You can. You close that gap through a combination of structural intelligence, sustained effort, and a quality of commitment that does not depend on conditions being favourable. ${n}, what you produce when you are at your best is not just the result but the fact of the result, the demonstration that this was possible, that it could be done, that someone did it. Others experience you ${personalityOuter[pnum] || 'as someone whose reliability is not performance but the actual texture of how they engage with anything they have agreed to carry'}.`,
    5:  `The gift operates on two levels at once. On the surface it appears as adaptability, the capacity to find your footing in conditions that destabilise most people, to locate the opportunity inside disruption while others are still processing the fact that disruption occurred. Beneath that is the gift that powers it: a communicative intelligence that translates what you have lived into something others can use. ${n}, not everyone who has been through what you have been through can articulate what it taught them. You can. Others experience you ${personalityOuter[pnum] || 'as someone interesting in a specific way, someone who has clearly been in territory that produced knowledge rather than just events'}.`,
    6:  `The gift is the quality of care you bring to what you love. Not sentimentality, not performance, but the actual willingness to be fully present with what matters, to stay with it in its difficulty, to tend to it with a consistency that does not require gratitude to sustain itself. ${n}, the things and people you love are genuinely better for being loved by you. This is not nothing. This is actually one of the rarest things a person can offer. Others experience you ${personalityOuter[pnum] || 'as someone whose warmth has specific gravity, creating the kind of environment where people can be more fully themselves than they usually are'}.`,
    7:  `The gift is depth of perception. The capacity to go further than the first answer, to sit with the real question long enough for the real answer to emerge, to refuse the simplification that makes things easier to manage and hold out for what is actually true. ${n}, what you know because you were willing to go all the way into the question is different in kind from what other people know because they stopped where it was comfortable. Others experience you ${personalityOuter[pnum] || 'as someone whose understanding of a situation arrives from a different depth than the usual, whose observations land with a quality that suggests they came from somewhere further in'}.`,
    8:  `The gift is the ability to produce results at scale. Not to want results, not to be motivated by them, but to actually convert ambition and intelligence into outcomes in the material world through a combination of strategic vision, capacity for sustained effort, and a quality of leadership that makes others want to contribute to what you are building. ${n}, the things you commit to tend to get done. Others experience you ${personalityOuter[pnum] || 'as someone carrying an authority that has nothing to do with position, the authority of someone who has demonstrably done what they said they would do and produced what they said they would produce'}.`,
    9:  `The gift is the wisdom that has been earned through everything you have lived. This is different from knowledge, which can be acquired. Wisdom of this kind can only be produced by someone willing to be genuinely changed by their experience rather than simply surviving it. ${n}, what you carry now, after everything, is not just understanding. It is the specific form of understanding that only arrives after the cost has been paid and the lesson has actually landed. Others experience you ${personalityOuter[pnum] || 'as someone in whose presence the truth tends to become more accessible, as though the depth of what they have been through makes pretence feel unnecessary'}.`,
    11: `The gift is the accuracy of your perception in domains where most people's instruments are not sensitive enough to detect what is happening. You receive information through channels that most people do not have access to, which means you arrive at accurate assessments before the evidence is in, understand what someone is actually feeling before they have said it, sense the quality of a situation that has not yet declared itself. ${n}, this is not imagination. It has been right too many times. Others experience you ${personalityOuter[pnum] || 'as someone uniquely perceptive, whose understanding of what is actually happening beneath the surface of things is disquieting in its accuracy'}.`,
    22: `The gift is the simultaneous capacity for vision at the largest possible scale and the practical intelligence to understand how to build what you can see. Most people can do one or the other. What is genuinely rare is the ability to hold both at once, to see what is possible across a large territory and to understand, in actual detail, the sequence of steps that gets from here to there. ${n}, this is your particular form of intelligence. Others experience you ${personalityOuter[pnum] || 'as someone thinking at a scale that is not typical, whose ambitions are not boasts but genuine assessments of what they understand themselves to be capable of'}.`,
    33: `The gift is your capacity for love that does not keep score. Most love is conditional in ways its holders rarely acknowledge. Yours has a quality of unconditionality that most people have encountered only in very specific relationships and very specific moments. ${n}, you are capable of loving people the way they actually are rather than the version they would need to become to earn it. Others experience you ${personalityOuter[pnum] || 'as someone in whose presence they tend to tell the truth, as though the quality of acceptance you carry makes the edited version unnecessary'}.`,
  }

  const birthdayGiftDesc: Record<number, string> = {
    1: 'the raw initiating energy that arrived with you at birth, the capacity to begin before the case for beginning has been fully assembled',
    2: 'a native sensitivity that perceives the emotional reality of any situation before the evidence is complete',
    3: 'an ease with expression that was present before it was developed, a natural facility with the conversion of experience into meaning',
    4: 'a structural intelligence that arrived fully formed, the capacity to see how things should be built before the building begins',
    5: 'a native adaptability that allows you to find your footing in conditions that destabilise others, without apparent effort and without the loss of self that transition costs most people',
    6: 'a quality of care that was present before it was cultivated, a natural orientation toward the wellbeing of what you love',
    7: 'a depth of perception that arrived as equipment, the capacity to go beneath the surface of things as a matter of instinct rather than technique',
    8: 'a native strategic intelligence, the capacity to assess what is possible and what it requires without needing someone to explain the relationship between the two',
    9: 'a compassion that was present before it was earned, a native orientation toward the wider human experience that preceded everything you went through to deepen it',
  }

  const p1 = giftCore[lp] || giftCore[9]
  const p2 = `Underneath the primary gift is what you were handed at the moment you arrived: ${birthdayGiftDesc[bg] || birthdayGiftDesc[5]}. These two things, the gift that has been developed across your life and the one that was present from the beginning, are not separate. They reinforce each other. What you are capable of at your full capacity is the combination of both, operating together, in the direction your blueprint has been pointing all along.`

  return [p1, p2]
}

function buildCoreChallenge(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n  = fn(name)
  const lp = num.lifePathNumber
  const ch = num.currentChallenge

  const challengeMap: Record<number, [string, string]> = {
    1: [
      `The pattern that returns most reliably, ${n}, is the difficulty of accepting help without interpreting it as evidence that your independence has failed. You have built so much of your identity around your capacity for self-direction that the moments requiring genuine support can feel like failures rather than what they actually are: invitations into the kind of interdependence that does not compromise you but completes you. There is another version of strength available, one that includes the willingness to be held, and it is stronger than the version you have been practicing. Your emotional life, which ${moonProcessing[ast.moonSign] || 'tends to move quickly through intensity without prolonged processing'}, does not make this easier. It makes the resistance feel like resolution rather than avoidance.`,
      `The recurring theme beneath this pattern is the relationship with vulnerability, not emotional vulnerability, which you can access, but the vulnerability of being seen when you do not have it handled. The work is not the development of a skill. It is a decision about what kind of strength you are willing to inhabit. ${challengeDesc[ch] || challengeDesc[4]}. This is the specific friction your blueprint assigned you, and the resolution, available now, is the discovery that what you most need is also what you have most resisted allowing.`,
    ],
    2: [
      `The pattern that returns most persistently, ${n}, is the tendency to lose the shape of yourself in the process of showing up fully for others. You give so completely and adjust so thoroughly to what the people around you require that you can arrive at a point where you are no longer certain which parts of what you feel and want are actually yours and which are the accumulated residue of everyone you have been present for. Your emotional life, which ${moonProcessing[ast.moonSign] || 'is deeply attentive to what surrounds it'}, does not make this easier. It makes the absorption feel like care when sometimes it is simply the loss of boundary.`,
      `The belief beneath this is worth examining with genuine honesty. Somewhere in your formation the idea took root that your needs are either too much or less important than the needs you are attending to. The work is not the development of selfishness. It is the discovery that you can be fully present for someone else and fully present for yourself simultaneously, that these are not in competition. ${challengeDesc[ch] || challengeDesc[4]}. The practice is uncomfortable at first specifically because it feels, in the early stages, like caring less. It is not. It is caring with more accuracy.`,
    ],
    3: [
      `The pattern that returns most reliably, ${n}, is the gap between what you can imagine and what you actually bring all the way into form. The creative capacity is real and extraordinary. The difficulty is the sustained attention required to close the distance between possibility and completion, and the self-doubt that moves into that distance and builds a residence there. Your emotional life, which ${moonProcessing[ast.moonSign] || 'processes through language and needs to speak things in order to understand them'}, can sometimes become the mechanism of the problem, turning creative energy into articulate analysis of the thing that has not yet been made rather than the making of it.`,
      `There is also a pattern of beginning multiple things at once because the energy of beginning is so alive, and then meeting the familiar depletion when the middle section requires a different quality of attention than the beginning demanded. ${challengeDesc[ch] || challengeDesc[4]}. The world does not need more of your ideas. It needs one of them, finished, at the level you are actually capable of producing. That is the resolution available to you.`,
    ],
    4: [
      `The central friction of your life, ${n}, has a very specific shape. You were built with a nature that requires freedom the way other people require stability, a genuine functional need for movement, variety, the ability to follow what is alive rather than what is scheduled. When that need is met you are at full capacity. When it is not, something in you begins to diminish and push against whatever is containing it. Your emotional life, which ${moonProcessing[ast.moonSign] || 'tends to move quickly and release without prolonged processing'}, registers the confinement rapidly and clearly.`,
      `And yet life keeps asking you to build. To commit fully, to stay with one thing long enough for the structure to develop that allows the thing to become what it is actually capable of becoming. Structure, patience, methodical effort, the willingness to lay stone after stone without visible progress, these are the exact qualities that do not come naturally to you and are the exact qualities that your circumstances keep requiring. ${challengeDesc[ch] || challengeDesc[4]}. The resolution, available now, is the discovery that freedom built on a real foundation is the only version of freedom that cannot be taken away.`,
    ],
    5: [
      `The pattern that keeps returning, ${n}, is the way the same hunger for aliveness that is your greatest strength can become the mechanism of your most significant self-sabotage. When commitment begins to feel like confinement, when what you have built starts to feel like what you are trapped in, the impulse to leave before you have fully received what the current chapter has to offer can arrive and feel indistinguishable from genuine readiness. Your emotional life, which ${moonProcessing[ast.moonSign] || 'moves quickly through experience without prolonged retention'}, does not always distinguish between the restlessness that signals readiness and the restlessness that is simply the discomfort of depth.`,
      `There is a difference between leaving because you are actually complete with something and leaving because you have reached the point where depth is required and depth is uncomfortable. You have not always been able to tell them apart. ${challengeDesc[ch] || challengeDesc[4]}. The work is the development of the capacity to stay, not forever and not at all costs, but long enough to find out what is actually present in this moment before the next one pulls you away from it.`,
    ],
    6: [
      `The pattern that returns most consistently, ${n}, is the difficulty of receiving care with the same quality of attention you extend to others. You are enormously generous and enormously skilled at providing what those around you need. But when care is offered to you, something tends to deflect it, to minimise what you require, or to reframe the situation so that you are again the one giving rather than the one being given to. Your emotional life, which ${moonProcessing[ast.moonSign] || 'is directly tied to the quality of its connections and requires genuine reciprocity to sustain itself at full capacity'}, pays for this pattern in ways that accumulate quietly over time.`,
      `${challengeDesc[ch] || challengeDesc[4]}. The work is not the development of selfishness. It is the discovery that you are as worthy of the love you give as anyone you have ever extended it to, and that allowing yourself to be held does not make you less capable of holding others. It makes you more so, because it finally gives you access to the full version of what you have been trying to offer from a partially depleted place.`,
    ],
    7: [
      `The pattern that returns most persistently, ${n}, is the distance that your depth creates between you and other people. Not because you do not want connection, but because the effort of translating your interior life into the simplified version that most conversations require can feel so costly that withdrawal becomes the more sustainable option. People around you experience this as privacy or reserve when what is actually happening is that you are running an entirely different process beneath the surface. Your emotional life, which ${moonProcessing[ast.moonSign] || 'analyzes what it feels before it can release it, needing to understand the source before resolution is possible'}, makes this more pronounced rather than less.`,
      `The deeper version of the challenge is the relationship with your own perception. When what you sense does not match what those around you acknowledge, the temptation is to question your accuracy rather than trust it. ${challengeDesc[ch] || challengeDesc[4]}. This is the most expensive habit you carry, specifically because your perceptions are accurate in precisely the cases where the consensus version of reality is insufficient.`,
    ],
    8: [
      `The pattern that returns most reliably, ${n}, is the cost that your capacity for results sometimes extracts from the people and relationships that matter most to you. The drive that produces what it produces in the external world does not always translate well into the domain of your closest connections, where the same focused intensity that makes you extraordinary in your work can be experienced by the people you love as a form of pressure they are always slightly failing to meet. Your emotional life, which ${moonProcessing[ast.moonSign] || 'tends to manage rather than express, containing what it carries until the pressure requires release'}, does not make this easier for the people on the receiving end.`,
      `${challengeDesc[ch] || challengeDesc[4]}. There is also a pattern in the relationship with control. The understanding that you can produce results through your own effort, which is real, has sometimes extended into the belief that anything you cannot control is therefore a threat. The work is the discovery that the most important things in your life cannot be produced. They can only be invited, and only by someone willing to be present without an agenda.`,
    ],
    9: [
      `The pattern that returns most consistently, ${n}, is the difficulty of releasing things before you have extracted every possible lesson from them. The understanding that everything means something is a form of wisdom. It can also become the mechanism by which you hold on past the natural completion of things, to relationships that have finished, to versions of yourself that were necessary then but constrain now, to pain that has already delivered its message and is waiting to be released. Your emotional life, which ${moonProcessing[ast.moonSign] || 'carries what it has touched with a fidelity and longevity that most people never develop'}, makes letting go genuinely difficult rather than simply a decision.`,
      `There is also the pattern of absorbing weight that does not belong to you. Your compassion is wide enough that you can find yourself carrying grief and difficulty that arrived through the quality of your attention to others. ${challengeDesc[ch] || challengeDesc[4]}. Releasing what is not yours to carry does not mean you care less. It means you can care with full presence rather than from beneath a weight that diminishes you both.`,
    ],
    11: [
      `The pattern that returns most persistently, ${n}, is the difficulty of operating at the level your sensitivity demands in environments that were not designed to accommodate it. You process everything more deeply, feel everything more thoroughly, and carry an awareness of what is happening beneath the surface of situations and relationships that most people do not register. Your emotional life, which ${moonProcessing[ast.moonSign] || 'is porous, absorbing the emotional reality of its surroundings without always distinguishing between what belongs to it and what it has received from others'}, makes this more pronounced in both directions.`,
      `The deeper version of the challenge is the doubt that can arise about the validity of your own perception. When what you sense differs from what those around you acknowledge, the temptation is to override your accuracy in favour of the consensus. ${challengeDesc[ch] || challengeDesc[4]}. The work is not the management of your sensitivity. It is the full trust of it, the decision to treat what you perceive as data rather than disturbance.`,
    ],
    22: [
      `The pattern that returns most consistently, ${n}, is the gap between the scale of what you can see and the pace at which the world can receive it. You carry visions that are genuinely ahead of their time, and watching them wait for circumstances to catch up is one of the more quietly difficult aspects of being who you are. The impatience this produces is real, and it has sometimes led to either forcing things before they were ready or abandoning them before they had the chance to fully unfold. Your emotional life, which ${moonProcessing[ast.moonSign] || 'tends to contain its intensity rather than express it'}, does not make the waiting easier.`,
      `There is also a pattern in the relationship between your capability and your willingness to fully claim it. The magnitude of what is possible through you creates its own pressure, and that pressure has sometimes expressed itself as strategic underselling. ${challengeDesc[ch] || challengeDesc[4]}. The work is the decision to close the gap between what you are building and what you are willing to say you are building.`,
    ],
    33: [
      `The pattern that returns most consistently, ${n}, is the tendency to place the healing of others ahead of your own for so long that what you are offering gradually shifts from abundance to depletion without your fully noticing the transition. Your compassion is so genuine and so instinctively activated by the presence of suffering that you can spend years tending to what everyone else requires while the care you need for yourself remains perpetually deferred. Your emotional life, which ${moonProcessing[ast.moonSign] || 'is deeply porous and absorbs the emotional reality of others with completeness'}, makes the boundary between giving and giving too much genuinely difficult to locate.`,
      `${challengeDesc[ch] || challengeDesc[4]}. The work is not a reduction in care. It is the discovery that what you give to others is only sustainable when it comes from a source that is also being replenished. The fullest version of your gift is only available to someone who has also allowed themselves to receive.`,
    ],
  }

  const [p1, p2] = challengeMap[lp] || challengeMap[4]
  return [p1, p2]
}

function buildLoveAndConnection(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n  = fn(name)
  const su = num.soulUrgeNumber
  const el = ast.sunElement

  const loveByElement: Record<string, [string, string]> = {
    Fire: [
      `In love, ${n}, you need the temperature of a connection to remain above a certain threshold or something in you begins to disengage without fully announcing why. You are capable of a depth of presence and generosity in your closest relationships that can be disorienting to people who are not used to being loved at that frequency. When it is genuinely matched, when someone meets you at the level you are actually offering, the quality of what becomes possible is unlike most things either person has experienced. What you secretly crave at the core of it, beneath the warmth and the strength and the capacity you present to the world, is ${soulUrgeHunger[su] || 'to be fully met, without the usual adjustment required by both parties to make the meeting feel safe'}.`,
      `The pattern your blueprint reveals is the tendency to interpret the quieter, more ordinary seasons of a relationship as evidence that something essential has been lost. Real love has seasons. The heat of beginning gives way to the warmth of continuity, and that warmth, when tended with real attention, is not a lesser thing. It is what beginning becomes when it survives contact with actual time. The work available to you is learning to distinguish between the relationship that has genuinely completed and the one that is simply asking you to inhabit a different register.`,
    ],
    Earth: [
      `In love, ${n}, you show up through consistency, through the accumulated evidence of your presence across time, through the fact of still being there on the ordinary days with the same quality of attention you brought at the beginning. The grand gesture you carry is not the dramatic declaration but the reliability itself, which is rarer and more sustaining than most of the things people describe as romance. What you secretly crave at the core of all this dependability, beneath the steadiness and the capacity you extend to others, is ${soulUrgeHunger[su] || 'to be genuinely known, to be in a connection so real that the edited version of yourself is no longer necessary'}.`,
      `The pattern your blueprint reveals is a tendency to express love through action and provision rather than through the direct acknowledgment of what you feel. This is not a failure of feeling. But there are people in your life who need to hear what you carry for them as well as experience its effects, and the gap between what you feel internally and what you allow to be visible can become a distance you did not intend and did not notice creating. The work available to you is finding the words for the things you usually demonstrate.`,
    ],
    Air: [
      `In love, ${n}, you need a connection that can hold your mind as well as your heart. The relationships that have sustained you longest are the ones where the conversation never quite ends, where genuine curiosity flows in both directions, where the other person finds you as interesting as you find them. Without that quality of intellectual aliveness, even technically functional connections begin to feel insufficient, not because you are demanding but because a part of you that needs to be met goes unmet. What you secretly crave at the core, beneath the ease of expression and the apparent self-sufficiency, is ${soulUrgeHunger[su] || 'to be known in the places that language usually does not reach, to have someone understand what you mean before you have finished saying it'}.`,
      `The pattern your blueprint reveals is the way your facility with words and ideas can become a method of managing emotional intimacy rather than deepening it. You are capable of describing what you feel with an elegance that most people cannot match, and that same capacity has sometimes allowed you to stay in the description of the feeling rather than fully inside it. The work available to you in love is the willingness to be occasionally less articulate, to be overtaken by what you feel rather than observing it from a slight distance.`,
    ],
    Water: [
      `In love, ${n}, you feel everything. This is not a figure of speech. The emotional texture of your closest relationships is extraordinarily detailed. You register changes in tone, in availability, in the quality of presence, that most people move through without noticing, and this makes you capable of offering a depth of attunement that people who have experienced it tend to describe as the closest thing to being truly known they have encountered. What you secretly crave at the core, beneath the sensitivity and the empathy and the capacity for depth, is ${soulUrgeHunger[su] || 'to be held with the same completeness you bring to holding others, to receive what you give rather than only ever giving it'}.`,
      `The pattern your blueprint reveals is the difficulty of protecting your emotional boundaries without withdrawing entirely from the connection. When something in a relationship hurts you, the movement can be toward absorbing it in silence rather than naming it, toward rearranging your inner landscape to accommodate what happened rather than bringing it into the light where it can be genuinely addressed. The work available to you is the discovery that naming what you feel does not damage love. It is actually one of the primary mechanisms through which love deepens.`,
    ],
  }

  return loveByElement[el] || loveByElement['Water']
}

function buildMoneyAndPurpose(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n  = fn(name)
  const lp = num.lifePathNumber
  const bc = num.birthdayChallenge

  const birthdayChallengeInPurpose: Record<number, string> = {
    0: 'The blueprint carries no specific karmic friction in the domain of purpose. What has held you back has been circumstance and the ordinary underestimation that most people apply to their own capacity.',
    1: 'There is a recurring pattern of waiting for external confirmation of what you already know about the direction you should be moving in. The confirmation rarely arrives before the move. It arrives after.',
    2: 'There is a pattern of undervaluing what you contribute to collaborative work, of attributing the result to the group while quietly knowing which part you were actually responsible for.',
    3: 'There is a recurring pattern of treating your creative and expressive contribution as less serious than other forms of work, of requiring it to justify itself in terms set by disciplines that were not designed to evaluate it.',
    4: 'There is a pattern of overvaluing security in ways that have occasionally kept you inside structures that could no longer grow what needed to grow.',
    5: 'There is a recurring pattern of leaving things before they have delivered everything they contained, of moving toward the next thing before the current one has been fully harvested.',
    6: 'There is a pattern of prioritising what is needed by others over what is needed by your own development, of treating your own growth as the thing that waits until everyone else is taken care of.',
    7: 'There is a recurring pattern of keeping the depth of what you know and have developed privately, of not claiming publicly the authority that the quality of your understanding has actually earned.',
    8: 'There is a pattern of occasionally operating below the scale you are actually capable of, of presenting what you are doing in smaller terms than what it actually is.',
    9: 'There is a recurring pattern of difficulty translating what you have learned through experience into a form that can be shared and offered, of keeping the wisdom available only in private.',
  }

  const purposeMap: Record<number, [string, string]> = {
    1: [
      `Your relationship with abundance, ${n}, has always been tied to your relationship with autonomy. When you are operating inside a structure someone else designed, producing results for a vision that is not yours, something functions but does not flourish. The work you were built for is the work where your direction is the irreplaceable element, where the thing would not exist or would not be what it became without the specific quality of your initiative. That is where the financial reality of your life has been most aligned with what you actually are.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to initiate things that would not exist without you. Not to maintain what others built, not to optimise within structures others designed, but to begin the thing that requires your particular certainty to get off the ground. The scale at which that initiation is available to you is larger than you have probably allowed yourself to fully claim.`,
    ],
    2: [
      `Your relationship with abundance, ${n}, is directly tied to the quality of the environment you work within. You do not produce well inside competition, conflict, or disregard for the human element of any enterprise. In environments characterised by genuine trust, where your sensitivity is an asset rather than a liability to be managed, you produce things that no one else in the room could have produced. That is where your financial life has been most aligned with what you actually are.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is most powerful in roles where connection is the actual product, where the quality of the relationships you build and the trust you create is what distinguishes your contribution from anyone else doing the same technical work. This is not a soft competency. It is the rarest and most durable form of value any professional can offer.`,
    ],
    3: [
      `Your relationship with abundance, ${n}, has been complicated by the world's ambivalence about compensating what you do best. Expression, communication, the particular way you render experience into meaning for others, these are not the things most institutional structures were designed to value adequately. But the question your blueprint asks is not whether the world values this. It asks whether you have been treating your own expressive contribution with the seriousness it actually deserves.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to create things that translate lived experience into meaning other people can use. Not to explain how things work but to show what they feel like, to make the complex feel simple and the simple feel extraordinary. The monetisation of this capacity is a skill that is entirely learnable, and the people who have built real financial lives from what they do best have not done so by being more gifted than you. They treated it as seriously as it deserved.`,
    ],
    4: [
      `Your relationship with abundance, ${n}, is built on a foundation that most people wish they could access: the knowledge that you can produce real results through your own sustained effort, regardless of circumstances. The times your financial life has been most aligned with what you are have been the times when your commitment was the most valuable thing in the room. That is not an accident. That is a description of your purpose.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to build things that serve as foundation for others. Structures, systems, environments that allow other people to do their best work because you created the conditions that make it possible. The legacy dimension of what you leave behind is not what you accumulated. It is what you built that kept serving people after you had moved on.`,
    ],
    5: [
      `Your relationship with abundance, ${n}, has never followed the conventional trajectory and it was never going to. The times your financial life has been most genuinely aligned with what you are have not been the safe bets. They have been the moments you followed something into territory where the outcome was not guaranteed, trusting what you could see that others could not yet see, moving before it was obvious. That is not recklessness. That is your method.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to create something that translates the full range of what you have lived, understood, and been changed by into a form that serves others navigating similar territory. The particular combination of lived breadth and communicative depth you carry produces something that cannot be replicated by someone who has not done the living. The scale at which this contribution is available to you is larger than you have claimed.`,
    ],
    6: [
      `Your relationship with abundance, ${n}, is most aligned when the direct connection between your effort and its effect on specific people's actual lives is visible to you. Abstract success, success measured only in metrics without human face, produces results but not the kind of satisfaction that makes the work sustainable across a lifetime. Where you have been most genuinely yourself, and most financially aligned with that, is in work where the care was the actual product.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to raise the quality of what you touch: not just the quality of deliverables but the quality of experience, of what it feels like to be in the environments and relationships you create. This is not a secondary contribution. It is the difference between things that merely function and things that genuinely flourish, and you know how to build the latter in a way that most people spend their whole careers trying to learn.`,
    ],
    7: [
      `Your relationship with abundance, ${n}, has been complicated by the persistent sense that what you value most, depth, genuine understanding, the quality of the interior life, is not what the world compensates most generously. This is not entirely wrong. But it misses the rarity of someone willing to go further than the first answer, to develop real expertise rather than the appearance of it, to know something thoroughly in a world full of people who know things adequately. That rarity is genuinely valuable.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to develop mastery in some domain of understanding and then make that mastery available in a form others can use. Not to explain but to illuminate. Not to summarise but to go all the way in and come back with what is actually there. The work that will bring you the deepest sense of rightness is work where the depth of your knowing is the irreplaceable thing on offer.`,
    ],
    8: [
      `Your relationship with abundance, ${n}, is direct and without the ambivalence that makes most people simultaneously desire and feel guilty about financial success. You understand money as a tool, as a resource, as a measure of the value that has moved in both directions. What you want, you are willing to work for, and you have enough strategic intelligence to close the gap between where you are and where you intend to be. The question your blueprint poses is not whether this is possible. It is whether you are willing to operate at the scale it actually requires.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to lead in the most fundamental sense: to take responsibility for outcomes at a scale most people are not willing to accept, where your decisions produce real consequences and the results have an impact that extends beyond your immediate environment. The work that will most fully express who you are is work where the magnitude of what is built reflects the magnitude of what you were always capable of building.`,
    ],
    9: [
      `Your relationship with abundance, ${n}, has been marked by a quality of detachment from the purely material that is not indifference but a genuine understanding, usually arrived at early in life, that accumulation of things is not the same as accumulation of meaning. What you are actually seeking, the richness of experience and contribution and the quality of what you leave behind, does not arrive primarily through financial achievement, even when financial achievement is part of the picture.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to give something real back. Not from obligation but because the fullest expression of who you are involves the transmission of what you have learned through the actual living of your life. The people who encounter your work, who are affected by your existence in whatever domain you occupy, tend to be changed by it in ways that are real and lasting. That is not an accident. That is your purpose operating exactly as it was designed to.`,
    ],
    11: [
      `Your relationship with abundance, ${n}, is most aligned when your perception and your intuitive capacity are the actual product being offered, when what you are providing is not just a technical skill but a quality of seeing clearly in domains where most people are working with incomplete information. The form this takes can vary widely, but the common thread is that the most irreplaceable thing you bring is the quality of your attention and the depth of what it perceives.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to make the invisible visible, to name what most people sense but cannot articulate, to illuminate what is present but unacknowledged, and to do so in a form that others can use to navigate their own experience more accurately. In a world that overvalues the obvious and undervalues the subtle, your particular capacity to work with what is real but not yet named is not a niche contribution. It is a necessary one.`,
    ],
    22: [
      `Your relationship with abundance, ${n}, operates at a scale that most conventional financial frameworks were not built to accommodate because the scope of what you are here to build is larger than what fits in standard categories. Your most authentic relationship with abundance arrives through work that is generating real value at a meaningful scale, where the resources available to you begin to match the responsibility you are actually carrying rather than the responsibility you have been willing to claim.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to build something that will still be serving people when you are no longer in the room. Not a project. A structure. Something designed from the beginning to last, that earns its authority through time and through the quality of what it made possible. The question that will guide your work most usefully is not what can I achieve but what do I want to leave, and for whom, and what will it require of me to build it so well that it does.`,
    ],
    33: [
      `Your relationship with abundance, ${n}, is most aligned when what you are doing produces a visible difference in the lived experience of specific people. Success that cannot be connected to a human face, to someone whose actual life is measurably better, produces results but not the kind of fulfilment that makes work sustainable across a lifetime. Where you have been most genuinely yourself, and most financially aligned with that, is in work where love was the actual mechanism.`,
      `${birthdayChallengeInPurpose[bc] || birthdayChallengeInPurpose[4]} Your purpose is to heal. Not necessarily in the clinical sense, though possibly, but in the broader sense of reducing the distance between people and the fullest version of their lives. Where you go, what was broken tends to become less broken. What was isolated tends toward connection. What was suffering tends to find, in your presence or through your work, some measure of genuine relief. That is among the most significant things one person can offer the world.`,
    ],
  }

  return purposeMap[lp] || purposeMap[9]
}

function buildRightNow(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n   = fn(name)
  const py  = num.personalYear
  const pm  = num.monthlyVibration
  const pin = num.currentPinnacle
  const age = num.age

  const monthContext: Record<number, string> = {
    1:  'beginning something specifically, making the first move on something that has been held in consideration, taking the step that starts the sequence',
    2:  'patience and careful attention, listening more deeply than speaking, trusting what is developing beneath the surface without forcing it into visibility',
    3:  'expression and genuine connection, giving your most important communications the weight they deserve, allowing the full version of what you carry to be present',
    4:  'practical consolidation, attending to the detail and structure of what already exists, doing the less visible work that real building requires',
    5:  'movement and intelligent adaptation, reading the shifting conditions accurately and responding to them with the full range of your capacity',
    6:  'the quality of care you are bringing to the relationships and commitments that matter most to you',
    7:  'honest interior inventory, updating your understanding of where you actually are and what you actually want without the edits that social presentation usually requires',
    8:  'decisive and committed action, the kind of forward movement that converts what has been prepared into what actually happens',
    9:  'completion, bringing what is genuinely finished to its actual conclusion, releasing what needs to be released so the space it occupied becomes available',
    11: 'heightened perception and the willingness to trust what you sense before you can fully explain it',
    22: 'significant building, the kind of committed effort that this particular window of time is unusually capable of supporting',
    33: 'deep service, the quality of love and presence you are bringing to everything you have agreed to show up for',
  }

  const p1 = `${n}, this is not an ordinary moment in your life, and your blueprint makes that specific and clear. The year you are inside is ${pyContext[py] || pyContext[1]} At the same time, the month you are currently in is asking you specifically about ${monthContext[pm] || monthContext[1]}. These two energies are not parallel tracks. They are converging into a window that is specific to right now, at your exact age of ${age}, in your exact circumstances. The people who navigate these windows consciously, who understand what the timing is actually asking rather than continuing on autopilot, tend to look back on this period as the one where something genuinely and permanently shifted.`

  const p2 = `For the past ${Math.max(0, age - (num.pinnacleStartAge || 0))} years, since your ${num.pinnacleStartAge > 0 ? num.pinnacleStartAge + 's' : 'earlier years'}, you have been living inside ${pinnacleTheme[pin] || pinnacleTheme[1]}. This is not background context. This chapter has been actively shaping the quality of your perception, the depth of your understanding, and the kind of contribution you are now capable of making. The year and month energies running right now are not separate from this chapter. They are happening inside it, which means what you initiate, build, or commit to in this specific window carries the full weight of everything this chapter has been developing in you. The window is open. What you choose to do with it is the most important question your blueprint places before you.`

  return [p1, p2]
}

function buildDestiny(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n    = fn(name)
  const lp   = num.lifePathNumber
  const age  = num.age
  const node = ast.northNode

  const arcMap: Record<number, [string, string]> = {
    1: [
      `The arc of your life, ${n}, is moving toward a form of authentic leadership that only becomes available to someone who has completed the prior work of becoming genuinely themselves. Not leadership assigned by title or accumulated through strategy, but the kind that emerges when someone has worked out who they actually are, what they actually believe, what they are actually willing to stand for, and then acts from that clarity with enough consistency that others begin to orient around them. This is not something you can construct. It is something that emerges when construction stops. Your karmic direction is ${northNodeDir[node] || 'toward the courage to initiate, to step forward before the outcome is guaranteed'}.`,
      `The version of yourself that is becoming is someone who has stopped waiting for conditions to align before doing what they know needs to be done. Someone who has learned to distinguish between the voice that says wait until you are ready and the voice that says begin and readiness will come. That person is already present in you. The work is not construction. It is the decision to stop deferring to the version that has not yet accepted what it is.`,
    ],
    2: [
      `The arc of your life, ${n}, is moving toward a form of genuine partnership, with a person, with work, with the world, that can only be built by someone who has first learned to be a complete partner to themselves. The relationships that will most fully express who you are becoming are the ones where your depth of feeling is not a burden to be managed but a resource that is genuinely valued, and where the care you offer is met with something equally real. Your karmic direction is ${northNodeDir[node] || 'toward genuine belonging, toward the vulnerability of needing and being needed without the usual management'}.`,
      `The version of yourself that is becoming is someone who has learned that the quality of your presence in relationship is deepened rather than diminished by having clearly understood needs of your own. Someone who gives and receives with equal grace, not as an achievement but as the natural expression of someone who has stopped making love conditional on sacrifice. At ${age}, you are closer to that version of yourself than you have ever been.`,
    ],
    3: [
      `The arc of your life, ${n}, is moving toward a form of creative expression that is fully and unambiguously yours. Not the version of your voice that has been modulated for the comfort of the room, not the expression that has been edited down to what felt safe, but the complete version: the one that says what you actually mean, that reaches for what you actually see, that refuses the convenient simplification in favour of the more demanding and more honest truth. Your karmic direction is ${northNodeDir[node] || 'toward genuine expression, toward the willingness to be fully seen rather than strategically presented'}.`,
      `The version of yourself that is becoming is someone who has decided that the risk of being fully seen is worth it. Someone who has understood that the work that actually reaches people, that changes something, that lasts past the moment of its making, requires a level of honesty that cannot be achieved at a comfortable distance from yourself. The audience for the complete version of what you have to offer is larger than you have allowed yourself to imagine. But it can only find you when you stop protecting yourself from it.`,
    ],
    4: [
      `The arc of your life, ${n}, is moving toward the realisation of something you have been building, quietly and persistently, across a timeline that has probably felt longer than it should have. The foundations you have laid, the discipline developed, the reliability demonstrated across years of showing up when it was inconvenient, are becoming the infrastructure of something that will outlast the effort that created it. Your karmic direction is ${northNodeDir[node] || 'toward mastery, toward the long work of building something that earns its authority through time and discipline'}.`,
      `The version of yourself that is becoming is someone who has learned that the satisfaction available on the other side of long-sustained effort is qualitatively different from anything available at the beginning. Someone who has discovered that the structures they built to contain their life were actually the life. Someone who looks at what they have created and recognises in it not just achievement but genuine craft, the evidence of a person who cared enough to do it correctly all the way through, even when no one was watching.`,
    ],
    5: [
      `The arc of your life, ${n}, is moving toward a form of freedom that is not the absence of commitment but the presence of genuine choice, the discovery that the most authentic version of your freedom is not found in the next departure but in the arrival somewhere that is fully and undeniably your own. Every transition navigated, every version of yourself inhabited and outgrown, every direction turned when the current path stopped fitting, has been preparation for a form of life that is finally completely yours. Your karmic direction is ${northNodeDir[node] || 'toward depth and genuine arrival rather than the next beginning'}.`,
      `The version of yourself that is becoming is someone who has learned that freedom and depth are not opposites. That the richest experiences available are not in the next departure but in the deepening of what has already been chosen. Someone who moves through the world with a lightness that comes not from avoiding weight but from having developed the capacity to carry it without being reduced by it. At ${age}, you are not at the beginning of this understanding. You are at the point where it becomes something you can actually live.`,
    ],
    6: [
      `The arc of your life, ${n}, is moving toward a form of love, for others, for your work, for the world, that has been purified by everything you have already given and everything it has cost you. The love that is available to you now is not naive love. It has been tested and it has survived the testing, which means it has earned its current form. This is the fullest kind. It is only available to someone who has made it this far and remained. Your karmic direction is ${northNodeDir[node] || 'toward complete giving without the calculation that most love carries beneath its surface'}.`,
      `The version of yourself that is becoming is someone who has learned to give from genuine abundance rather than from the fear of what happens if they do not. Someone who has released the equation between love and sacrifice and discovered that the most sustainable form of generosity is the kind that replenishes as it gives. That is not selfishness. That is mastery. And it is what makes your love, in its mature form, available to more people, at greater depth, for longer than anything you offered before.`,
    ],
    7: [
      `The arc of your life, ${n}, is moving toward a form of mastery that is not mastery over things but mastery of understanding. The culmination of all the time spent going further than the obvious, refusing the first answer, sitting with uncertainty until the real picture emerged, is a form of knowing that is both genuinely rare and genuinely needed. Your karmic direction is ${northNodeDir[node] || 'toward genuine service, toward bringing the depth of what you know into usable form for others'}.`,
      `The version of yourself that is becoming is someone who has stopped apologising for the depth of their inquiry and stopped minimising what that depth has produced. Someone who has found a way to share what they know that does not require them to make it smaller than it actually is. Someone whose contribution is irreplaceable in exactly the places where the consensus version of reality has proven insufficient. That is not a small place to be needed.`,
    ],
    8: [
      `The arc of your life, ${n}, is moving toward a form of power that is worthy of the person you have been becoming. Not power accumulated through leverage or sustained through fear, but the power that is the natural consequence of excellence, of genuine integrity, of a sustained commitment to producing results that actually matter. Your karmic direction is ${northNodeDir[node] || 'toward authority earned through demonstrated mastery, toward operating at the scale your capacity actually requires'}.`,
      `The version of yourself that is becoming is someone who has learned to hold power without being held by it. Someone who has discovered that real authority is not defended but demonstrated, not claimed but recognised by people who have experienced the quality of your work and your character. You are moving toward a version of yourself whose contribution to the world is measurable, lasting, and entirely congruent with who you actually are. That is a rare alignment. You are approaching it.`,
    ],
    9: [
      `The arc of your life, ${n}, is moving toward the recognition of what all of it has been for. The experiences had, the losses carried, the reinventions navigated, the moments of rebuilding from what remained: these are converging into a form of wisdom that is not only yours but through you, available to others. Your karmic direction is ${northNodeDir[node] || 'toward genuine giving back, toward the transmission of what lived experience has made real'}.`,
      `The version of yourself that is becoming is someone who has learned to hold their own story with compassion rather than judgment, who can look at everything they have been through and see not a record of mistakes and recoveries but the actual substance of a meaningful life. Someone who has discovered that the most generous thing you can do with what experience has taught you is to stop keeping it private. The world you are moving into needs what you have become. At ${age}, you are ready.`,
    ],
    11: [
      `The arc of your life, ${n}, is moving toward a form of contribution most accurately described as illumination. Not the dramatic kind, but the quiet persistent kind that operates through honest expression, through the courage to acknowledge what you actually perceive, through the willingness to name what is true even when the comfortable version is available. Your karmic direction is ${northNodeDir[node] || 'toward genuine expression, toward the willingness to let what you actually see be visible without the translation into safer terms'}.`,
      `The version of yourself that is becoming is someone who has learned to trust their own perception without apology. Someone who has discovered that the sensitivity they were once encouraged to manage is actually the source of their most irreplaceable contribution. Someone whose presence carries a quality of genuine seeing that makes the people around them feel, perhaps for the first time, genuinely seen in return. That is not a small thing to offer. That is among the most significant things one person can give to another.`,
    ],
    22: [
      `The arc of your life, ${n}, is moving toward the realisation of a vision that most people would not have dared to hold. The scale of what you are here to build will not become fully clear all at once. It was never meant to. It is revealed incrementally, through each decision to show up at the level the work actually requires. Your karmic direction is ${northNodeDir[node] || 'toward building something of genuine magnitude, toward the willingness to operate at the scale the vision actually requires'}.`,
      `The version of yourself that is becoming is someone who has learned to be a good steward of their own magnitude. Someone who has discovered that the greatness available to them is not a burden but a form of sacred responsibility that, when accepted fully, produces not anxiety but clarity. You know what you are here to do. The work ahead is not figuring that out. The work ahead is doing it, consistently, at full capacity, at the scale it was always meant to occupy.`,
    ],
    33: [
      `The arc of your life, ${n}, is moving toward a form of service so fully integrated with who you are that it no longer feels like sacrifice. The distinction between what you give and what you receive will become increasingly irrelevant, because genuine contribution will be experienced as its own form of nourishment. Your karmic direction is ${northNodeDir[node] || 'toward complete compassion, toward the dissolution of the boundary between your wellbeing and the wellbeing of what you love'}.`,
      `The version of yourself that is becoming is someone who has learned that the fullest love is the love that does not keep score. Someone who has discovered that genuine service, arriving from abundance rather than need, from choice rather than compulsion, is one of the most complete forms of freedom available to a human being. The world you are moving into is one where what you carry is finally fully given, and what is given is fully received. You are closer to that than you have ever been.`,
    ],
  }

  return arcMap[lp] || arcMap[9]
}

function buildVerdict(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const n   = fn(name)
  const lp  = num.lifePathNumber
  const py  = num.personalYear
  const age = num.age
  const bg  = num.birthdayGift

  const verdictByLP: Record<number, string> = {
    1:  `Your blueprint says this plainly: you are someone whose capacity for initiation, for self-direction, for creating movement where there was stillness, is not a quality you developed. It is a quality you arrived with and have been learning to trust your entire adult life. The version of you that is most fully expressed is not more careful or more patient. It is more willing to begin, specifically, completely, and without waiting for permission that no external source was ever going to provide.`,
    2:  `Your blueprint says this plainly: you are someone whose depth of attunement, whose capacity for genuine presence in connection, whose ability to hold space for what is difficult without flinching, these are not softnesses. They are forms of intelligence that most people spend their entire lives trying to develop and never reach. The version of you that is most fully expressed is not harder or more protected. It is more fully present, to others and to yourself simultaneously, without requiring you to choose between them.`,
    3:  `Your blueprint says this plainly: you are someone whose communicative intelligence, creative capacity, and ability to translate experience into meaning for others are not peripheral features of who you are. They are the central thing. The version of you that is most fully expressed is not more disciplined in isolation from these gifts. It is these gifts brought all the way into completed form, offered, and received at the level they are actually capable of reaching.`,
    4:  `Your blueprint says this plainly: you are someone whose structural intelligence, capacity for sustained commitment, and ability to build things that actually hold are not limitations of your temperament. They are the source of a contribution that most people cannot match because they do not have the patience or the discipline to make it. The version of you that is most fully expressed does not find the building less demanding. It finds it more meaningful.`,
    5:  `Your blueprint says this plainly: you are someone whose intelligence is genuinely unusual, whose adaptability is a form of power rather than a symptom of instability, and whose capacity to translate lived experience into something others can use belongs in the world at a larger scale than it has occupied. You are also someone who has spent significant time in productive tension with the version of yourself that knows how large the contribution could be. The circling phase is over. The territory has been understood. The question now is whether you are willing to step into it without reservation.`,
    6:  `Your blueprint says this plainly: you are someone whose capacity for love, care, and the creation of environments where others can flourish is not a secondary quality that supports your other contributions. It is the primary thing. The version of you that is most fully expressed does not love less carefully. It loves from a fuller place, from genuine abundance rather than from the fear that stopping would cost someone something they cannot afford to lose.`,
    7:  `Your blueprint says this plainly: you are someone whose depth of inquiry, refusal of the first answer, and capacity to go further than the obvious into what is actually true are not personality quirks. They are the mechanism of your most significant contribution. The version of you that is most fully expressed does not make your knowing smaller or more accessible in ways that compromise its accuracy. It finds the form in which real depth can be genuinely received.`,
    8:  `Your blueprint says this plainly: you are someone whose strategic intelligence, capacity for results, and ability to build at scale are not ambitions imposed from outside. They are accurate descriptions of what you are capable of and what you are here to do. The version of you that is most fully expressed does not hold back from the scale that is available. It builds at that scale, thoroughly, intentionally, and without apologising for the magnitude of what it is attempting.`,
    9:  `Your blueprint says this plainly: you are someone whose accumulated wisdom, capacity for compassion across genuine difficulty, and ability to transmit what lived experience has taught you are not consolation prizes for what you have been through. They are the actual thing you were moving toward. The version of you that is most fully expressed does not keep this wisdom private or offer it apologetically. It gives it completely, without withholding, to the people who need it.`,
    11: `Your blueprint says this plainly: you are someone whose perceptive depth, sensitivity to what others cannot register, and capacity to inspire through honest expression are not burdens to be managed. They are the source of your most irreplaceable contribution. The version of you that is most fully expressed does not protect itself from the cost of that sensitivity by minimising it. It trusts it, completely, without the ongoing need for external validation of what it perceives.`,
    22: `Your blueprint says this plainly: you are someone whose capacity for large-scale vision, ability to hold a blueprint and a building simultaneously, and potential for a contribution that outlasts the effort of making it are not aspirations. They are accurate descriptions of what you are actually capable of. The version of you that is most fully expressed does not build at the scale that feels safe to claim. It builds at the scale the vision actually requires.`,
    33: `Your blueprint says this plainly: you are someone whose quality of compassion, capacity for healing through presence alone, and ability to love without keeping score are not sentimental qualities. They are among the rarest and most needed forms of intelligence a person can carry. The version of you that is most fully expressed does not deplete itself in service of others. It gives from a place that is also being replenished, and in doing so, gives more completely and more sustainably than has ever been possible before.`,
  }

  const solutionByPY: Record<number, string> = {
    1:  `The single most important thing your blueprint identifies for this specific moment: begin. Not plan to begin. Not prepare to begin. Actually initiate the thing you have been holding. The year you are inside is designed for this specific motion. What you start now, at ${age}, in this season, with the full weight of everything you have accumulated, will not be the same thing you could have started earlier. It will be better. But only if you actually start it.`,
    2:  `The single most important thing your blueprint identifies for this specific moment: give yourself the quality of attention you give to others. Not eventually. Now. The year you are inside is building something beneath the surface that requires you to be genuinely resourced. The most important structure you can build in this season is not external.`,
    3:  `The single most important thing your blueprint identifies for this specific moment: choose one thing you have been holding in the domain of creative intention and bring it all the way to completion. Not to a good stopping point. To the actual end. What finishes in this season carries a quality of realisation that is not available to things still in process.`,
    4:  `The single most important thing your blueprint identifies for this specific moment: build something this year that you intend to be standing in ten years. Not a project. A structure. Designed from the beginning to last. The year you are inside is specifically asking for this quality of intention.`,
    5:  `The single most important thing your blueprint identifies for this specific moment: stop treating the scale of what you are capable of as something requiring further permission or preparation. The year you are inside is not a rehearsal. It is the year your blueprint designates for construction at the scale your accumulated capacity actually justifies. Build it now. Build it with everything. What you construct in this specific window will still be serving people long after this season has passed.`,
    6:  `The single most important thing your blueprint identifies for this specific moment: give your most important relationships the quality of primary attention this season is asking for. Not the attention left over after everything else has been attended to. The primary attention. The year you are inside is not primarily an achievement year. The most significant thing you can build in it is not external.`,
    7:  `The single most important thing your blueprint identifies for this specific moment: act on what you perceive without waiting for it to be validated. Your reading of what is actually happening in your current circumstances is accurate. The year you are inside is specifically asking you to operate from that accuracy rather than the consensus version that is several steps behind what you are already seeing.`,
    8:  `The single most important thing your blueprint identifies for this specific moment: make the move you have been preparing for. The year you are inside carries a quality of material momentum not present in every season. What you commit to in this window will compound in ways that the same commitment in a different year would not. This is not the time for further preparation. The preparation is done.`,
    9:  `The single most important thing your blueprint identifies for this specific moment: complete what is actually complete. Look honestly at what in your life, in your commitments, your relationships, your self-concept, has run its full course and is waiting to be acknowledged as finished. The energy held in what is technically over but not formally closed is energy the next chapter of your life needs.`,
    11: `The single most important thing your blueprint identifies for this specific moment: act on what you perceive without requiring it to be externally confirmed first. Your perception of what is true in your circumstances is accurate. The year you are inside is specifically asking you to operate from that accuracy. Trust what you sense before you can fully explain it. It is almost certainly right.`,
    22: `The single most important thing your blueprint identifies for this specific moment: commit to the large-scale version of what you are building, not the small-scale version that is easier to defend. The year you are inside is specifically designated for building at significant scale. Do not build the version that is safe to attempt. Build the version that is actually worth attempting.`,
    33: `The single most important thing your blueprint identifies for this specific moment: allow yourself to be replenished with the same completeness that you replenish others. The year you are inside requires you to be genuinely resourced. What you give from that place will be the fullest version of what you have ever offered.`,
  }

  const birthdayGiftFinal: Record<number, string> = {
    1: 'the raw initiating energy you arrived with',
    2: 'the native sensitivity to what is actually happening in any room you enter',
    3: 'the facility with expression that was present before it was developed',
    4: 'the structural intelligence that arrived fully formed at birth',
    5: 'the natural adaptability that was handed to you before you earned it',
    6: 'the native quality of care that was present before it was cultivated',
    7: 'the depth of perception that arrived as equipment rather than skill',
    8: 'the strategic intelligence that was present before the first strategy was attempted',
    9: 'the compassion that was native before it was earned through experience',
  }

  const p1 = verdictByLP[lp] || verdictByLP[9]
  const p2 = `${solutionByPY[py] || solutionByPY[5]} You were also handed at birth ${birthdayGiftFinal[bg] || birthdayGiftFinal[5]}. That gift has been available your entire life. It is available right now. This reading is shown only once in the app. Download it to keep it. Share it with someone who should read it. Or close it and step forward into what it describes.`

  return [p1, p2]
}

export function buildWelcomeCards(
  name: string,
  num:  NumerologyProfile,
  ast:  AstrologyProfile,
): WelcomeCard[] {
  return [
    { section: 'Before We Begin',           icon: 'Sparkles', paragraphs: buildOpening(name, num, ast)           },
    { section: 'Who You Are',               icon: 'Sparkles', paragraphs: buildWhoYouAre(name, num, ast)         },
    { section: 'Your Greatest Gift',        icon: 'Star',     paragraphs: buildGreatestGift(name, num, ast)      },
    { section: 'Your Core Challenge',       icon: 'Compass',  paragraphs: buildCoreChallenge(name, num, ast)     },
    { section: 'Love and Connection',       icon: 'Heart',    paragraphs: buildLoveAndConnection(name, num, ast) },
    { section: 'Money and Purpose',         icon: 'Feather',  paragraphs: buildMoneyAndPurpose(name, num, ast)   },
    { section: 'Right Now',                 icon: 'Moon',     paragraphs: buildRightNow(name, num, ast)          },
    { section: 'Where This Is All Leading', icon: 'Infinity', paragraphs: buildDestiny(name, num, ast)           },
    { section: 'Your Verdict',              icon: 'Star',     paragraphs: buildVerdict(name, num, ast)           },
  ]
}