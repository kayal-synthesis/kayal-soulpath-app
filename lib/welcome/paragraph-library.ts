// ============================================================
// KAYAL WELCOME ENGINE — Paragraph Library
// 9 cards x deep variants per Life Path, Element, Pinnacle
// Zero jargon. Pure revelation. Human voice throughout.
// No dashes. Justified alignment. World class standard.
// ============================================================

import type { NumerologyProfile } from './numerology-engine'
import type { AstrologyProfile }  from './astrology-engine'

export interface WelcomeCard {
  section:    string
  icon:       string
  paragraphs: [string, string]
}

// ── Personal Year plain meanings ──────────────────────────────
const yearMeaning: Record<number, string> = {
  1:  'asking you to begin. Something new is available to you that was not available before. The question is not whether you are ready. The question is whether you are willing to move before you feel ready, because that is the only way this particular door opens.',
  2:  'asking you to slow down and trust what is growing quietly beneath the surface. Nothing significant will happen quickly this year, but the foundations being laid in this season will support everything that follows. Patience right now is not passivity. It is the most active thing you can do.',
  3:  'asking you to be seen. Your voice, your creativity, your authentic expression are the currency of this season. The world is more ready to receive the full version of what you have to offer than it has been in years. The risk of being seen is real. The cost of remaining invisible is higher.',
  4:  'asking you to build. Not to plan for building, not to prepare to build, but to actually lay stone. What you construct this year will not feel glamorous in the making. It will hold in a way that nothing built quickly ever does. This is the year that determines what the next several years stand on.',
  5:  'asking you to move toward what is alive rather than what is familiar. Change is not arriving as disruption this year. It is arriving as invitation. The life you knew twelve months ago is already becoming something different. Your task is to stay curious rather than afraid of what is replacing it.',
  6:  'asking you to give your full attention to love, to the people who matter, and to the quality of care you bring to your most important relationships. This is not a year for ambitious external achievement. It is a year where the deepest work happens in the private spaces of your life.',
  7:  'asking you to go inward. The external world will not yield much this year, but your inner life is being upgraded in ways that will not be visible until later. What you understand about yourself by the end of this year will be more accurate, more useful, and more hard-won than anything you have understood before.',
  8:  'asking you to step into your power without apology. Every effort you have made in the past several years is available to compound now. This is the year where held-back ambition, properly directed, begins to produce results at a scale that matches what you have always known you were capable of.',
  9:  'asking you to complete and release. Something significant in your life is ending, not because it failed, but because it is finished. The next chapter cannot begin until this one is properly closed. Let it close with gratitude for what it gave you and without grief for what it is time to leave behind.',
  11: 'operating at a frequency that most years do not reach. Your sensitivity is heightened. Your intuition is running ahead of your logic. The things you sense before you can explain them are almost certainly accurate. Trust what you perceive this year more than you trust what you can prove.',
  22: 'asking you to build at a scale you may not have previously allowed yourself to consider. The vision you have been carrying, the thing you have known was possible but have been approaching cautiously, is ready to become real. Not as a plan. As an actual structure. This is the year the blueprint becomes the building.',
  33: 'asking you to give from your deepest place. The service available through you this year goes beyond the personal. What you offer, how you show up, the quality of love you bring to your work and your relationships has the capacity to change things at a level that extends well beyond what you can see from here.',
}

// ── Pinnacle meanings (plain language) ───────────────────────
const pinnacleMeaning: Record<number, string> = {
  1:  'a chapter of becoming, of establishing who you actually are independent of who you were shaped to be by everything that came before you',
  2:  'a chapter of partnership, where your greatest growth arrives through your relationships with others and through the development of a patience that is not resignation but genuine trust in the timing of things',
  3:  'a chapter of expression, where you are being called to share what you know, feel, and imagine in a form that other people can receive and be changed by',
  4:  'a chapter of building, where the discipline you develop now becomes the foundation that everything later stands on',
  5:  'a chapter of expansion, where change is not disruption but the actual mechanism of your development',
  6:  'a chapter of service and love, where your greatest work is done through and for the people you care about rather than exclusively for yourself',
  7:  'a chapter of depth and mastery, where solitude and serious inquiry are not isolation but the path to a form of authority that cannot be acquired any other way',
  8:  'a chapter of achievement, where the world is ready to meet your ambition with actual results if you bring the full weight of your capacity to what you are building',
  9:  'a chapter of completion and wisdom, where you harvest what you have lived and prepare to offer it to others in a form they can use',
  11: 'a master chapter of spiritual illumination, where your sensitivity is not a burden to be managed but the source of your most significant contribution to the people and environments around you',
  22: 'a master chapter of visionary building, where what you are here to create is larger than what most people attempt in an entire lifetime',
  33: 'a master chapter of healing and unconditional service, where the love you carry becomes one of the most quietly powerful forces in the lives you touch',
}

// ── Challenge meanings (woven into challenge card) ───────────
const challengeMeaning: Record<number, string> = {
  0:  'the challenge of choosing your own direction in a world full of strong opinions about who you should be',
  1:  'the challenge of developing genuine independence without confusing isolation with strength',
  2:  'the challenge of giving yourself the same quality of care and attention you so naturally extend to others',
  3:  'the challenge of bringing your creative vision all the way into form rather than leaving it perpetually in the stage of beautiful possibility',
  4:  'the tension between your natural need for freedom and the structural discipline that is required to build anything that lasts',
  5:  'the challenge of knowing when to stay rather than always knowing how to go, and of discovering that depth requires duration',
  6:  'the challenge of receiving as well as you give, and of understanding that your own needs are not a betrayal of your care for others',
  7:  'the challenge of trusting your own perception even when it cannot be immediately verified by the people and systems around you',
  8:  'the challenge of holding power without being held by it, and of keeping the people you love as real and important as the results you are capable of generating',
  9:  'the challenge of releasing what is complete without holding on past the natural end of things, and of trusting that completion is not loss',
}

// ── Birthday Gift meanings ────────────────────────────────────
const giftMeaning: Record<number, string> = {
  1:  'an initiating energy that allows you to begin things others are still debating, and a natural authority that arrives before any credential has been earned',
  2:  'a perceptive sensitivity that allows you to read the emotional reality of any situation with an accuracy most people spend their whole lives trying to develop',
  3:  'a communicative ease that makes complex things feel simple and ordinary things feel worth paying attention to',
  4:  'a structural intelligence that knows instinctively how to build things that hold, and a reliability that people trust without needing to articulate why',
  5:  'a natural adaptability that allows you to find your footing in conditions that destabilise everyone else, and to locate the opportunity inside the disruption while others are still processing the fact that the disruption occurred',
  6:  'a quality of care that heals simply by being present, and an aesthetic intelligence that makes environments more beautiful by the fact of your having been in them',
  7:  'a depth of perception that goes further than the obvious, and a quality of knowing that arrives before the evidence and proves accurate after it',
  8:  'a strategic intelligence that sees the gap between what exists and what could exist, and a will strong enough to close that gap through sustained effort',
  9:  'a wisdom that was not learned from books but from everything you have actually lived through, and a compassion that reaches people who have stopped expecting to be reached',
}

// ── Life Path core nature ─────────────────────────────────────
const lpNature: Record<number, string> = {
  1:  'independence, the courage to begin again, and the particular authority that belongs only to someone who has learned to trust their own compass before consulting anyone else\'s',
  2:  'a depth of attunement to others that most people never develop, and the rare capacity to hold space for someone\'s full experience without needing to fix or simplify it',
  3:  'the translation of lived experience into meaning, and the gift of making people feel something through expression that bypasses argument and lands directly in what they know to be true',
  4:  'the building of things that last, and the particular form of love that shows up not in grand declarations but in the sustained, unglamorous, irreplaceable fact of still being there',
  5:  'the intelligence of full immersion, and the particular wisdom that is only available to someone whose education has been the actual territory of their own life rather than a map of someone else\'s',
  6:  'the capacity to love in a way that heals, and the understanding that beauty is not ornamental but essential, and that care brought fully into the ordinary makes the ordinary extraordinary',
  7:  'the pursuit of what is real beneath what is apparent, and the particular authority that belongs to someone who refuses the first answer because they know, reliably, that the real one is further in',
  8:  'the conversion of vision into results, and the strategic intelligence that sees the gap between what exists and what could exist and believes, correctly, that the gap is closable',
  9:  'the wisdom that is only available on the other side of having lived through enough to understand what actually matters, and the compassion that reaches people who have stopped expecting to be reached',
  11: 'the capacity to perceive what most people cannot access, and the particular gift of inspiring others simply by being honest about your own experience in a world that rarely is',
  22: 'the ability to hold a vision and a practical blueprint simultaneously, and to build at a scale that most people never attempt because they cannot hold both the magnitude and the method at once',
  33: 'a love that does not keep score, and the particular healing that arrives not through effort but through the quality of presence that you carry when you are most fully yourself',
}

// ════════════════════════════════════════════════════════════
// CARD BUILDERS
// ════════════════════════════════════════════════════════════

// ── CARD 0: Before We Begin ───────────────────────────────────
function buildOpening(name: string): [string, string] {
  const fn = name
  return [
    `${fn}, before we go any further, there is something your blueprint reveals that most people who know you have probably never been able to name. They have felt it — in the way conversations shift when you engage fully, in the way you seem to understand things before the explanation is finished, in the way you carry a kind of knowing that does not always have a tidy source. They have felt it but they have not had the language for it. What you are about to read is that language. It was calculated from the specific date you entered this world, and it belongs entirely to you.`,
    `What follows is not a general reading. It is not a template dressed in your name. Every word of it was built from the energies your birth encodes — the ones that have been shaping your life, your decisions, your recurring tensions, and your recurring gifts since the day you were born. Some of what you read will feel like confirmation of things you have always quietly known about yourself. Some of it will name things you have never heard named before. All of it is yours.`,
  ]
}

// ── CARD 1: Who You Are ───────────────────────────────────────
function buildWhoYouAre(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn = name
  const lp = num.lifePathNumber
  const nature = lpNature[lp] || lpNature[9]

  const sunPart  = ast.sunTraits
  const moonPart = ast.moonTraits
  const elemPart = ast.elementNature

  return [
    `${fn}, the life you were born to live is organised around ${nature}. This is not something you chose, and it is not something that has always been easy to explain to the people around you, because the world tends to offer frameworks for living that do not quite fit the shape of what you actually are. You have probably spent time trying to make yourself legible in terms that were never designed with you in mind, and arriving at the same quiet conclusion: that you are ${sunPart}. That is not a limitation. It is a precise description of the kind of intelligence that moves through you.`,
    `Beneath what the world sees is a person whose inner life operates at a depth that is not always visible from the outside. Emotionally, ${moonPart}. The combination of these two realities — the outward nature and the inner one — is why you have sometimes felt simultaneously too much and not enough for the environments you have moved through. You were not built for the standard container. You were built for something that required you to be exactly the person you have been becoming across the whole of your life so far. That becoming is not finished. But it is much further along than you have probably allowed yourself to credit.`,
  ]
}

// ── CARD 2: Your Greatest Gift ────────────────────────────────
function buildGreatestGift(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const lp   = num.lifePathNumber
  const gift = num.birthdayGift
  const giftDesc = giftMeaning[gift] || giftMeaning[5]
  const planetDesc = ast.planetNature

  const giftMap: Record<number, string> = {
    1: `The gift that defines you most completely, ${fn}, is the ability to create movement where there was stillness. You do not just have ideas — you have the particular quality of will that converts an idea into an action before most people have finished deciding whether the idea is worth pursuing. This initiating capacity is not aggression. It is a form of generosity toward possibility. When you move first, you make it possible for others to move at all.`,
    2: `The gift that defines you most completely, ${fn}, is the quality of your attention. When you are fully present with someone — and you are capable of a presence that is genuinely full — they feel seen in a way that most human interactions do not produce. Not heard in the way people nod while preparing their response. Actually seen, as though you have looked at the complete reality of who they are and found it not just acceptable but worth your complete and unhurried attention.`,
    3: `The gift that defines you most completely, ${fn}, is the ability to make people feel something through the particular way you translate experience into language. This is not about being articulate in the technical sense. It is about the frequency at which your expression lands. When you speak or write about something you have actually lived through, something in the way you render it bypasses the listener's critical faculties and reaches directly the part of them that simply recognises what is true.`,
    4: `The gift that defines you most completely, ${fn}, is the ability to make things real. Not to conceive of things, not to plan them, but to actually manifest them — to close the gap between what is imagined and what is built through a combination of structural intelligence and a quality of commitment that does not depend on conditions being favourable. The things you put your name on hold. That is not a common thing.`,
    5: `The gift that defines you most completely, ${fn}, operates on two levels simultaneously and the combination is genuinely rare. On the surface it appears as the ability to communicate — to express, to articulate, to find the exact words that make a complex thing suddenly feel simple and a simple thing suddenly feel profound. Beneath that communicative gift is something that powers it: an extraordinary natural adaptability that allows you to enter almost any environment, any situation, any set of circumstances that most people would find destabilising, and find not just your footing but the opportunity inside the disruption that others are too disoriented to see.`,
    6: `The gift that defines you most completely, ${fn}, is the ability to love in a way that heals. Not the romantic kind of love exclusively, though that too, but the broader kind — the love that shows up when something is broken and stays until it is not. You have a capacity for care that does not require gratitude, does not calculate reciprocity, and does not diminish under the pressure of other people's difficulty. You give because giving is the natural expression of your full capacity, and people who have experienced it tend to describe it as unlike anything they have received from anyone else.`,
    7: `The gift that defines you most completely, ${fn}, is the ability to find the truth of something. Not the surface truth — the real one. The one that requires patience and a willingness to sit with uncertainty long enough for the actual picture to emerge from beneath the convenient simplification. You have a built-in sensor for when the first answer is not the real one, and your refusal to accept false resolution is the source of a form of knowing that most people cannot access because they do not have your tolerance for the discomfort of not-yet-knowing.`,
    8: `The gift that defines you most completely, ${fn}, is the ability to generate results at a scale most people do not attempt. Not to plan for results, not to be motivated by them, but to actually produce them in the material world through a combination of strategic vision, force of will, and a quality of leadership that makes others want to contribute to what you are building. The things you commit to getting done have a way of getting done, and the things you build tend to be larger than what you announced you were building.`,
    9: `The gift that defines you most completely, ${fn}, is the wisdom that has been earned through everything you have actually lived. This is not the wisdom of study or of theory. It is the wisdom of experience — of loss, of reinvention, of learning to hold complexity without needing to resolve it too quickly into something more comfortable. You have been through things that have given you a capacity for compassion and perspective that most people spend their whole lives trying to cultivate through practice. You developed it through living.`,
    11: `The gift that defines you most completely, ${fn}, is the ability to inspire — not through motivation or technique, but through the simple act of being honest about your own experience in a world that rarely is. When you speak truthfully about what you have felt, what you have questioned, what you have found and lost and found again, something happens in the people listening. They feel permission to acknowledge what they have been carrying in silence. You do not create this effect deliberately. It is the consequence of your being genuinely yourself in a context where most people are performing a safer version.`,
    22: `The gift that defines you most completely, ${fn}, is the simultaneous capacity for the largest possible vision and the most specific possible plan. Most people can do one or the other. Visionaries who cannot implement and implementors who cannot see beyond the next step exist everywhere. What is genuinely rare is the ability to hold both at once — to see what is possible at the largest scale and to understand, in real detail, how to get there from exactly where you are standing now.`,
    33: `The gift that defines you most completely, ${fn}, is the quality of your compassion. Not the sentiment of it — the actual functional capacity to hold another person's experience with such complete acceptance that healing becomes possible simply by being in your presence. You do not need someone to be better than they are in order to love them. You do not need their situation to be more manageable. You can be with people exactly where they are, and that is one of the rarest things one person can offer another.`,
  }

  const p1 = giftMap[lp] || giftMap[9]
  const p2 = `There is a second dimension to what you carry, ${fn}, that is less visible but equally significant. You were handed at birth ${giftDesc}. This gift has operated quietly your entire life, often without you fully recognising it as a gift because it has always felt like simply how you function. It is not. ${planetDesc.charAt(0).toUpperCase() + planetDesc.slice(1)}. The combination of these two qualities — the one that defines your life's contribution and the one you were handed at the moment you arrived — is why you are capable of more than most people around you have been able to witness, because most environments have not been designed to contain what you actually are.`

  return [p1, p2]
}

// ── CARD 3: Your Core Challenge ───────────────────────────────
function buildCoreChallenge(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const lp   = num.lifePathNumber
  const ch   = num.currentChallenge
  const chDesc = challengeMeaning[ch] || challengeMeaning[4]
  const modal  = ast.modalityNature

  const challengeMap: Record<number, [string, string]> = {
    1: [
      `The pattern that has followed you most persistently, ${fn}, is the difficulty of accepting help without interpreting it as evidence that your independence has failed. You have built so much of your sense of self around your capacity for self-direction that the moments when you genuinely need another person can feel like failures rather than what they actually are: invitations into the kind of interdependence that does not compromise you but completes you. The version of strength you have been practicing is real. There is another version available that is stronger still.`,
      `The deeper dimension of this challenge is the relationship you carry with vulnerability — not emotional vulnerability, which you can manage, but the vulnerability of being genuinely seen when you do not have it handled. The work available to you on the other side of that particular resistance is not weakness. It is a form of authority that is only accessible to someone who has first become capable enough not to need it. That person is you. The work is allowing what is already true to finally be visible.`,
    ],
    2: [
      `The pattern that has followed you most persistently, ${fn}, is the tendency to lose the shape of yourself in the process of showing up fully for others. You give so completely, feel so deeply into what the people around you need, and adjust yourself so thoroughly to the emotional requirements of your relationships that you can arrive at a point where you are no longer entirely sure which parts of what you feel and want are actually yours and which are the accumulated residue of everyone you have been present for.`,
      `This is not a flaw in your capacity for love. It is the consequence of that capacity operating without a sufficiently strong counterweight. The work available to you is the discovery — which has to be made through practice rather than through understanding — that you can be fully present for someone else and fully present for yourself simultaneously. These are not in conflict. But finding that truth requires a different quality of attention than the one you have been bringing, and the practice of it is uncomfortable precisely because it feels, at first, like caring less. It is not caring less. It is caring more accurately.`,
    ],
    3: [
      `The pattern that has followed you most persistently, ${fn}, is the gap between what you can imagine and what you actually bring fully into form. You have more creative capacity than most environments can accommodate, more ideas in an afternoon than most people produce in a month, and a vision of what your expression could be at its fullest that is genuinely extraordinary. The difficulty is the sustained effort that closes the distance between what is possible and what is real, and the self-doubt that moves into that distance and makes its home there.`,
      `There is also a pattern of scattering — of beginning multiple things simultaneously because the energy of beginning is so alive, and then meeting the familiar deflation when the middle part requires a different quality of attention than the beginning demanded. The work available to you is not generating more vision. You have more than enough. It is the development of a relationship with your own follow-through that allows one thing to be fully realised before the gravitational pull of the next beginning takes over. The world does not need more of your ideas. It needs one of them, finished, at the level you are actually capable of.`,
    ],
    4: [
      `The central tension of your life, ${fn}, has a very specific shape, and once you see it clearly the whole pattern of your recurring difficulty becomes legible in a way it probably has not been before. You were born with a nature that requires freedom the way other people require air. Movement, variety, the ability to follow what is alive rather than what is scheduled — these are not preferences for you. They are functional requirements. When they are present you are at your full capacity. When they are absent something in you begins to diminish, to push against whatever is containing it. This is not a character flaw. It is the precise nature of the person you are.`,
      `And yet the world keeps asking you to build. To commit fully. To stay with one thing long enough for the structure to develop that allows the thing to become what it is actually capable of becoming. Structure, patience, methodical effort, the willingness to lay foundation stone after foundation stone in the full knowledge that the building will not be visible for a long time — these are the exact qualities that do not come naturally to you, and they are the exact qualities that your life has repeatedly required. The friction between who you naturally are and what your circumstances keep demanding is not an accident. It is the specific curriculum your blueprint assigned you. And the resolution — the one that is available to you right now at this exact moment in your life — is the discovery that freedom built on a real foundation is the only version of freedom that cannot be taken away.`,
    ],
    5: [
      `The pattern that keeps returning for you, ${fn}, is the way the same hunger for aliveness that is your greatest strength can become the mechanism of your most significant self-sabotage. When commitment begins to feel like confinement, when what you have built begins to feel like what you are trapped in, when the restlessness arrives telling you that the next version of your life is waiting somewhere else — the impulse to leave, to start over, to begin again somewhere new, can arrive before you have fully received what the current chapter still has to offer.`,
      `There is a difference between the restlessness that signals genuine readiness for the next thing and the restlessness that is simply the discomfort of depth. The discomfort of depth is not a signal to move. It is an invitation to go further than you have gone before in the place where you already are. You have not always been able to distinguish between these two signals, and the cost of that confusion has sometimes been real. The work available to you is the development of the capacity to stay — not forever, not at all costs, but long enough to find out what is actually present in this moment before the next one pulls you away from it.`,
    ],
    6: [
      `The pattern that has followed you most persistently, ${fn}, is the difficulty of receiving the care you so naturally extend to others. You are enormously generous, enormously attuned to what the people around you need, and enormously capable of providing it. But when care is offered to you — when someone wants to support you, to hold you, to show up for you the way you show up for others — something in you tends to deflect it, to minimise what you need, or to find a way to make the situation one in which you are once again the one giving rather than the one receiving.`,
      `The belief beneath this pattern, if you look at it honestly, is something close to the conviction that your needs are too much, or that receiving makes you a burden, or that love is most secure when you are the one maintaining it. The work available to you is the discovery — not intellectual but actual, lived and felt — that you are as worthy of the love you give as anyone you have ever given it to. And that allowing yourself to be held does not make you less capable of holding others. It makes you more so, because it finally gives you access to the full version of what you have been trying to offer from a place that was partially depleted.`,
    ],
    7: [
      `The pattern that has followed you most persistently, ${fn}, is the distance that your depth creates between you and other people — not because you do not want connection, but because the effort of translating your interior life into the simplified version that most conversations require can feel so costly that withdrawal becomes the more sustainable option. People around you often experience this as distance or privacy or even coldness, when what is actually happening is that you are running an entirely different process beneath the surface that simply cannot be adequately represented in ordinary social exchange.`,
      `The deeper challenge is the doubt that can arise about the validity of your own perception. When what you sense does not match what others around you are acknowledging, when you feel something strongly that nobody else seems to notice, the temptation is to question your own accuracy rather than trust it. This is the most expensive habit you carry. The work available to you is the steady, patient development of trust in what you actually perceive — not in spite of its being unusual, but precisely because of how reliably it has turned out to be true.`,
    ],
    8: [
      `The pattern that has followed you most persistently, ${fn}, is the cost that your capacity for results has sometimes extracted from the people and relationships that matter most to you. The drive that produces your achievements in the external world does not always translate well into the domain of your closest relationships, where the same focused intensity that makes you extraordinarily effective in your work can be experienced by the people you love as a form of pressure they are always slightly failing to meet.`,
      `There is also a pattern in your relationship with control — specifically, the way the understanding that you can produce results through your own effort has sometimes extended into the belief that anything you cannot control is therefore a threat. The work available to you is the discovery that the most important things in your life — love, genuine trust, real partnership — are not results that can be produced. They are qualities that can only be invited, and only by someone who is willing to be present without an agenda. That presence is available to you. But it requires setting down, at least temporarily, the productive urgency that is otherwise the most alive thing about you.`,
    ],
    9: [
      `The pattern that has followed you most persistently, ${fn}, is the difficulty of releasing things before you have extracted every possible lesson from them. You understand that everything means something, which is a form of wisdom. But it can become the mechanism by which you hold on past the natural completion of things — to relationships that have run their full course, to versions of yourself that were necessary then but are constraining now, to pain that has already delivered its message and is waiting, patiently, to be thanked and let go.`,
      `There is also a pattern in the way you carry the weight of suffering that is not yours. Your capacity for compassion is so wide that you can find yourself holding grief, difficulty, and unresolved emotion that you absorbed through the quality of your attention to others. The work available to you is the discovery that releasing what is not yours to carry does not mean you care less. It means you are capable of caring with full presence rather than from beneath a weight that diminishes both you and the people you are trying to serve.`,
    ],
    11: [
      `The pattern that has followed you most persistently, ${fn}, is the difficulty of operating at the level your sensitivity demands in environments that were not designed to accommodate it. You process everything more deeply than most people, feel everything more thoroughly, and carry an awareness of what is happening beneath the surface of situations and relationships that most people simply do not register. This makes you extraordinarily perceptive. It also makes ordinary environments — noisy, shallow, relentlessly demanding of your attention — genuinely depleting in ways that are difficult to explain to people who do not share your frequency.`,
      `The deeper version of this challenge is the doubt that can arise about the validity of what you perceive. When your reading of a situation differs from what those around you are acknowledging, the temptation is to override your own perception in favour of the consensus version of reality. This is the most expensive habit you carry, because your perceptions are accurate in precisely the cases where the consensus version is insufficient. The work available to you is not the management of your sensitivity. It is the full trust of it — the decision to treat what you perceive as data rather than as disturbance.`,
    ],
    22: [
      `The pattern that has followed you most persistently, ${fn}, is the gap between the scale of what you can see and the pace at which the world can receive it. You carry visions that are genuinely ahead of their time, and the experience of watching those visions wait — for resources, for circumstances, for the readiness of the people who need to be part of them — is one of the more quietly difficult aspects of being who you are. The impatience this produces is real, and it has sometimes led you to either force things before they were ready or to abandon things before they had the chance to fully unfold.`,
      `There is also a pattern in the relationship between your capability and your willingness to fully claim it. The magnitude of what is possible through you creates its own form of pressure, and that pressure has sometimes expressed itself as a kind of strategic underselling — a habit of framing what you are doing in smaller terms than what you are actually attempting, so that the gap between the vision and the current reality is less exposed to scrutiny. The work available to you is the decision to close that gap between what you are building and what you are willing to say you are building. The scale is not the problem. The hesitation to claim it is.`,
    ],
    33: [
      `The pattern that has followed you most persistently, ${fn}, is the tendency to place the healing of others ahead of your own for so long that what you are offering gradually shifts from abundance to depletion without your fully noticing the transition. Your capacity for compassion is so genuine, so instinctively activated by the presence of suffering, that you can spend years — even decades — tending to what everyone else requires while the care you need for yourself remains perpetually deferred until conditions are better, until things settle, until everyone else is okay.`,
      `The belief beneath this pattern is worth examining directly. Somewhere in your formation, the idea took hold that your needs were less important than other people's — that your worth was conditional on your usefulness, and that taking up space for your own healing was a form of selfishness rather than the most fundamental act of stewardship you could perform. The work available to you is the discovery that what you give to others is only sustainable when it comes from a source that is also being replenished. You cannot give from empty. And the fullest version of what you carry is available only to someone who has allowed themselves to also be cared for.`,
    ],
  }

  const [p1, p2] = challengeMap[lp] || challengeMap[9]
  return [p1, p2]
}

// ── CARD 4: Love and Connection ───────────────────────────────
function buildLoveAndConnection(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn  = name
  const el  = ast.sunElement
  const moon = ast.moonSign

  const loveByElement: Record<string, [string, string]> = {
    Fire: [
      `In love, ${fn}, you need the temperature of a relationship to stay above a certain threshold in order to remain fully engaged. You bring an intensity and a generosity to your closest connections that can feel almost overwhelming to people who are not used to being loved at that frequency, and the moments when that intensity is genuinely matched — when someone meets you at the level you are actually offering — produce a quality of connection that you know is worth everything. You have probably spent time in relationships that were technically fine and emotionally insufficient, and you know the difference at a cellular level.`,
      `The pattern your blueprint reveals in love is a tension between your need for aliveness in connection and a tendency to interpret the quieter, more ordinary seasons of a relationship as evidence that something essential has been lost. Real love has seasons. The heat of beginning gives way to the warmth of continuity, and that warmth, when it is properly tended, is not a lesser thing than what preceded it. It is a deeper one. The work available to you in love is the development of the capacity to stay through the transition — to distinguish between the relationship that has genuinely run its course and the one that is simply asking you to go deeper than the beginning required.`,
    ],
    Earth: [
      `In love, ${fn}, you show up through consistency, through reliability, through the accumulated evidence of your presence over time. You do not do love through grand gestures primarily — or rather, the grand gesture that defines your love is not the dramatic declaration but the fact of still being there on the ordinary Tuesday, with full attention, as present as you were at the beginning. People who have experienced this kind of love from you tend to recognise it as something they did not fully understand the value of until they had it, and something they do not stop missing when it is gone.`,
      `The pattern your blueprint reveals is a tendency to express love through action and provision rather than through the direct acknowledgment of what you feel. This is not a failure of feeling. You feel deeply. But there are people in your life who need to hear what you feel as well as experience its effects, and the gap between what you carry for them internally and what you allow them to see can become, over time, a distance you did not intend and did not notice creating. The work available to you in love is finding the words for the things you show instead, and trusting that the person you love can receive them.`,
    ],
    Air: [
      `In love, ${fn}, you need a relationship that can hold your mind as well as your heart. The connections that have sustained you longest are the ones where there is genuine intellectual companionship alongside emotional intimacy — where the conversation never quite ends, where curiosity flows in both directions, where you feel that the other person finds you as interesting as you find them. Without that quality of engagement, even technically functional relationships begin to feel insufficient, not because you are demanding but because a part of you that needs to be met simply goes unmet.`,
      `The pattern your blueprint reveals is the way your facility with language and ideas can become a way of managing emotional intimacy rather than deepening it. You are extraordinarily good at talking about feelings while remaining at a slight remove from the feelings themselves — articulate about your inner life while maintaining just enough distance from the rawer, less composed version of it that is actually doing the feeling. The work available to you in love is the willingness to be occasionally less eloquent. To be overtaken by what you feel rather than observing it. To let what arrives arrive in its unedited form and trust that the person in front of you can hold what they find there.`,
    ],
    Water: [
      `In love, ${fn}, you feel everything. This is not a figure of speech. The emotional texture of your relationships is extraordinarily detailed — you register changes in tone, in energy, in availability, in the quality of someone's presence that most people move through without noticing. This makes you someone who can offer a depth of attunement that is genuinely rare, and that people who have experienced it tend to describe as the closest thing to being truly known that they have encountered.`,
      `The pattern your blueprint reveals is the difficulty of protecting your emotional boundaries without withdrawing entirely from the connection. When something in a relationship hurts you, the impulse can be to absorb it in silence rather than name it — to rearrange your own inner landscape to accommodate what happened rather than bring it into the light where it can be actually addressed. The work available to you in love is the discovery that naming what you feel does not damage love. It is, in fact, one of the primary mechanisms through which love deepens. What you name can be known. What you carry silently can only be sensed — and sensing without knowing is exhausting for everyone.`,
    ],
  }

  return loveByElement[el] || loveByElement['Water']
}

// ── CARD 5: Money and Purpose ─────────────────────────────────
function buildMoneyAndPurpose(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const lp   = num.lifePathNumber
  const dest = num.destinyNumber

  const purposeMap: Record<number, [string, string]> = {
    1: [
      `Your relationship with abundance, ${fn}, is inseparable from your relationship with independence. Money, for you, is not primarily about security in the conventional sense. It is about freedom — the freedom to make decisions that align with your own direction rather than with what you can afford, the freedom to walk away from what does not serve your vision, the freedom to build what you actually want to build rather than what was most financially obvious. This is not recklessness. It is clarity about what money is actually for in your life.`,
      `What your blueprint reveals about your purpose is that you are here to initiate things that would not exist without you. The contribution you are most built to make is not the maintenance of what is already functioning but the creation of something that begins because you decided it should. The work that will give you the deepest sense of having lived rightly is work where your particular vision of what is possible was the irreplaceable element — where without your willingness to begin, nothing would have started.`,
    ],
    2: [
      `Your relationship with abundance, ${fn}, is closely tied to the quality of the environment and relationships you work within. You do not function well in environments characterised by competition, conflict, and disregard for the human element. You function extraordinarily well in environments of genuine collaboration, where trust is the currency and your sensitivity is an asset rather than a liability to be managed. The conditions of your work matter to your productivity in ways that go beyond preference into something more foundational.`,
      `What your blueprint reveals about your purpose is that your contribution is most powerful in roles where connection is the work — where the quality of the relationships you build, the depth of care you bring to the people involved, and the trust you create are the actual product. This does not limit you to traditionally caring professions. It means that whatever field you occupy, the human dimension of how you inhabit it is what distinguishes your contribution from anyone else's doing the same technical work.`,
    ],
    3: [
      `Your relationship with abundance, ${fn}, has probably been complicated by the world's ambivalence about compensating the work you are most naturally suited for. The things you do best — the expression, the communication, the particular quality of how you render experience into meaning — are not the things most institutional structures were designed to value adequately. You have probably spent time wondering whether the work that comes most naturally to you and produces the most genuine satisfaction can actually be a sustainable path.`,
      `What your blueprint reveals is that the answer depends almost entirely on one thing: whether you are willing to treat your creative and expressive work with the same rigour and seriousness you would bring to any other professional discipline. The monetisation of expression is a skill that is entirely learnable, and the people who have successfully built lives from what they do best have not done so by being more talented than you. They have done so by refusing to accept the premise that talent alone is sufficient without the craft and the structure built around it.`,
    ],
    4: [
      `Your relationship with abundance, ${fn}, is built on a foundation that most people wish they could access: the knowledge that you can produce real results through your own sustained effort. You have a relationship with work that is genuine and deep — not as something to be avoided or minimised, but as the primary mechanism through which things actually get made. This gives you a financial resilience that is largely independent of circumstances, because your capacity to generate value through careful and sustained effort is not contingent on conditions being cooperative.`,
      `What your blueprint reveals about your purpose is that you are here to build things that serve as the foundation for others — structures, systems, organisations, environments that allow other people to do their best work because you created the conditions that make it possible. The legacy dimension of what you leave behind is not primarily what you accumulated but what you built that continued serving people after you had moved on from building it.`,
    ],
    5: [
      `Your relationship with abundance, ${fn}, has never followed the conventional trajectory, and it was never going to — because your purpose is not a conventional one and the path toward it was never going to be linear. The times in your life when you have tried to force your work into the standard model have consistently produced the same result: technical adequacy and deep insufficiency. You functioned. But you were not operating anywhere near the level of what you are actually capable of, and some part of you knew it the entire time. The abundance genuinely available to you has never been located on the conventional path. It has been located at the intersection of your full expression and the willingness to build something that has not existed before.`,
      `What your blueprint reveals about your purpose is that you are here to create something that translates lived experience into meaning for other people — something that uses the full range of what you have been through, understood, and been changed by, and offers it in a form that serves others navigating similar territory. This is the specific contribution of someone whose particular combination of lived breadth and communicative depth produces something that cannot be replicated by someone who has not done the living. The scale at which this contribution is available to you is larger than you have probably allowed yourself to fully claim.`,
    ],
    6: [
      `Your relationship with abundance, ${fn}, is most naturally aligned when your work carries a quality of genuine service — not in the diminished sense of working for others at the expense of yourself, but in the sense of feeling the direct connection between your effort and its effect on specific people's actual lives. When that connection is present and real, something in you engages at a level that is not available in work that is purely transactional. The quality of care you bring to what you do is not a liability. It is the thing that makes what you produce worth more than what anyone else produces doing the same technical work.`,
      `What your blueprint reveals about your purpose is that you are here to raise the quality of what you touch. Not just the quality of products or deliverables, but the quality of experience — the degree to which people feel genuinely cared for and well served by their encounter with you or with what you create. This is not a small contribution. It is the difference between environments that merely function and environments that flourish, and you are someone who knows, at a level that is almost instinctive, how to build the latter.`,
    ],
    7: [
      `Your relationship with abundance, ${fn}, has probably been complicated by a persistent sense that the things you value most — depth, genuine understanding, the quality of your interior life — are not what the world tends to compensate most generously. This is not entirely wrong. But it misses something important: the genuine scarcity of someone willing to go further than the first answer, to sit with uncertainty longer than is comfortable, and to develop real expertise rather than the appearance of it. That scarcity creates value. The question is whether you are willing to offer what you know in a form that others can access.`,
      `What your blueprint reveals about your purpose is that you are here to develop a form of mastery — in some area of understanding, inquiry, or wisdom — and then to make that mastery available in a form that others can use. The work that will bring you the deepest sense of rightness is work where what you know is the irreplaceable thing being offered, and where the depth of that knowing is what distinguishes it from everything else available in the same territory.`,
    ],
    8: [
      `Your relationship with abundance, ${fn}, is direct. You understand money as a tool, as a resource, as a measure of value exchanged in both directions. You are not confused about what it is for, and you are not afflicted by the ambivalence about wealth that makes other people simultaneously desire it and feel guilty for desiring it. You want real results, you are willing to do what they require, and you have enough strategic intelligence to close the gap between where you are and where you intend to be. The only question your blueprint poses is whether you are willing to operate at the scale you are actually capable of rather than the scale that feels safe to claim.`,
      `What your blueprint reveals about your purpose is that you are here to lead in the most fundamental sense: to take responsibility for outcomes at a scale that most people are not willing to accept, where your decisions produce real consequences and where the results you generate have an impact that extends beyond your immediate environment. The work that will most fully express who you are is work where the buck stops with you, where the stakes are real, and where the magnitude of what is built reflects the magnitude of what you were always capable of building.`,
    ],
    9: [
      `Your relationship with abundance, ${fn}, has probably been marked by a quality of detachment from the purely material — not because you do not value security, but because the things you value most are not primarily material. You understood early in your life that the accumulation of things is not the same as the accumulation of meaning, and that the kind of richness you are actually seeking — in experience, in understanding, in the quality of your contribution — does not arrive primarily through financial achievement, even when financial achievement is part of the picture.`,
      `What your blueprint reveals about your purpose is that you are here to give something back — not out of obligation, but because the fullest expression of who you are involves the transmission of what you have learned through the living of your actual life. The people who find you, who encounter your work, who are affected by your existence in whatever domain you occupy, tend to be changed by it in ways that are real and lasting. That is not an accident. That is your purpose, operating exactly as it was designed to.`,
    ],
    11: [
      `Your relationship with abundance, ${fn}, is most aligned when your work allows your sensitivity and your insight to be the actual product — when what you are offering is not simply a technical skill but a quality of perception, of understanding, of seeing clearly in domains where most people are working with incomplete information. This might appear in many different forms — counselling, teaching, creative work, strategic advising, healing — but the common thread is that the most irreplaceable thing you bring is the quality of your attention and the depth of what it perceives.`,
      `What your blueprint reveals about your purpose is that you are here to make the invisible visible — to name what most people sense but cannot articulate, to illuminate what is present but unacknowledged, and to do so in a form that others can use to navigate their own experience more accurately. In a world that consistently overvalues the obvious and undervalues the subtle, your particular capacity to work with what is real but not yet named is not a niche contribution. It is a necessary one.`,
    ],
    22: [
      `Your relationship with abundance, ${fn}, operates at a scale that most conventional financial frameworks were not designed to accommodate, because the scope of what you are here to build is larger than what fits comfortably in standard categories. This does not mean you are immune to ordinary financial realities. It means that your most authentic relationship with abundance comes through work that is generating real value at a meaningful scale — where the resources available to you begin to match the responsibility you are actually carrying rather than the responsibility you have been willing to claim.`,
      `What your blueprint reveals about your purpose is that you are here to build something that will still be serving people when you are no longer in the room. The legacy dimension of your work is not vanity. It is the natural consequence of building at the scale your vision requires and your capacity makes possible. The question that will guide your work most usefully is not what can I achieve, but what do I want to leave, and for whom, and what will it require of me to build it so well that it lasts.`,
    ],
    33: [
      `Your relationship with abundance, ${fn}, is most aligned when what you are doing produces a direct and visible difference in the lived experience of specific people. Abstract success, success measured only by metrics and outcomes, success that does not translate into the actual human impact you can feel — these forms of achievement produce results without fulfilment, and you are someone who needs both. The work that sustains you is not just work that pays. It is work where you can see, with some regularity, the human face of what your effort produces.`,
      `What your blueprint reveals about your purpose is that you are here to heal — not necessarily in the clinical sense, though possibly so, but in the broader sense of reducing the distance between people and the fullest version of their lives. Where you go, what was broken tends to become less broken. What was isolated tends to become more connected. What was suffering tends to find, in your presence or through your work, some measure of genuine relief. That is not a small thing to offer the world. It is, in fact, among the most significant things one person can offer another.`,
    ],
  }

  const lpi = num.isMasterNumber ?? false ? lp : Math.min(lp, 9)
  return purposeMap[lp] || purposeMap[9]
}

// ── CARD 6: Right Now ─────────────────────────────────────────
function buildRightNow(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const py   = num.personalYear
  const pin  = num.currentPinnacle
  const age  = num.age
  const mv   = num.monthlyVibration
  const pyCtx  = yearMeaning[py]   || yearMeaning[1]
  const pinCtx = pinnacleMeaning[pin] || pinnacleMeaning[1]

  const monthContext: Record<number, string> = {
    1:  'beginning something specifically — making the decision that starts the sequence, taking the first step on something that the rest of this period will then be given to building',
    2:  'patience and attentiveness — this is not a month for forcing outcomes but for listening carefully to what is developing beneath the surface of your circumstances',
    3:  'expression and connection — what you communicate in this particular window has an unusual quality of reach and resonance, so give your most important messages a voice',
    4:  'practical consolidation — the month is asking you to attend to the details, to strengthen what already exists, and to do the less glamorous work that real building requires',
    5:  'movement and adaptation — something is shifting in your circumstances and the quality of your response to that shift will determine the direction of the next several months',
    6:  'relationships and care — the most important work you can do this month is not external but relational, and the attention you give to the people who matter will compound in ways that are not immediately visible',
    7:  'inner clarity — this is a month for reflection, for the kind of honest inventory that is only possible in the quieter seasons, and for updating your understanding of where you are and what you actually want',
    8:  'decisive action — the window is open for moves you have been preparing, and the energy available right now supports the kind of bold, clear commitment that produces real results',
    9:  'completion — something in your circumstances or inner life is ready to be finished, and the space that finishing creates is what the next cycle needs in order to begin cleanly',
    11: 'heightened perception — your intuition is running ahead of your logic this month and the things you sense without yet being able to explain are almost certainly worth trusting',
    22: 'significant building — the conditions this month align unusually well with large-scale effort, and what you commit to constructing now has access to a quality of foundation that is not available in every season',
    33: 'service and compassion — the deepest work available to you this month arrives through the quality of love and care you bring to your most important relationships and commitments',
  }

  const p1 = `${fn}, what is available to you in this specific moment of your life is not ordinary, and your blueprint is unambiguous about that. The year you are inside is ${pyCtx} At the same time, the month you are currently in is asking you specifically about ${monthContext[mv] || monthContext[1]}. These two energies are not separate forces acting independently on your life. They are converging into a specific window — and the people who navigate these kinds of convergences consciously tend to look back on them as the seasons where something genuinely and permanently shifted.`

  const p2 = `For the past ${num.pinnacleStartAge > 0 ? `${num.age - num.pinnacleStartAge} years` : 'significant period'} — since your ${num.pinnacleStartAge > 0 ? `${num.pinnacleStartAge}s` : 'earlier years'} — you have been inside ${pinCtx}. This is not background context. This chapter has been actively shaping the quality of your perception, the depth of your awareness, and the kind of contribution you are now capable of making. At ${age}, with the year you are in running simultaneously alongside the chapter you are in, what you choose to build, begin, or commit to right now carries a quality of intention and depth that nothing you could have done earlier would have contained. The window is open. What you do with it is the most important question your blueprint places before you.`

  return [p1, p2]
}

// ── CARD 7: Where This Is All Leading ────────────────────────
function buildDestiny(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const lp   = num.lifePathNumber
  const age  = num.age
  const dest = num.destinyNumber

  const destinyMap: Record<number, [string, string]> = {
    1: [
      `${fn}, the arc of your life is moving toward a form of authentic leadership that is only available to someone who has done the prior work of becoming genuinely themselves. Not the kind of leadership that is assigned by title or accumulated through strategy, but the kind that emerges when someone has worked out who they actually are, what they actually believe, and what they are actually willing to stand for — and then acts from that clarity with enough consistency that others begin to orient around them not because they were asked to, but because they recognised something worth following.`,
      `The version of yourself that is becoming is someone who has stopped waiting for conditions to align before doing what you know needs to be done. Someone who has learned to distinguish between the voice that says wait until you are ready and the voice that says begin and readiness will come. Someone whose presence in any environment carries an authority that is not claimed but simply evident. That person is already present in you. Your work is not to construct them. It is to stop deferring to the version that is not yet willing to take up the full space they occupy.`,
    ],
    2: [
      `${fn}, the arc of your life is moving toward a form of genuine partnership — with another person, with your work, with the world — that can only be built on the foundation of someone who has first learned to be a complete partner to themselves. The relationships that will most fully express who you are becoming are the ones where your depth of feeling is not a burden to be managed but a resource that is genuinely valued, and where the care you offer is met with something equally real and equally sustained.`,
      `The version of yourself that is becoming is someone who has learned that the quality of your presence in relationship is deepened rather than diminished by having clearly understood needs of your own. Someone who has discovered that the vulnerability you have sometimes avoided is precisely the path to the connection you have always wanted. Someone who gives and receives with equal grace, not as an achievement but as the natural expression of someone who has finally stopped making love conditional on sacrifice.`,
    ],
    3: [
      `${fn}, the arc of your life is moving toward a form of creative expression that is fully, unambiguously yours — not the version of your voice that has been modulated to make others comfortable, not the expression that has been edited down to what felt safe, but the complete version: the one that says what you actually mean, reaches for what you actually see, and refuses the convenient simplification in favour of the more complete and more demanding truth.`,
      `The version of yourself that is becoming is someone who has decided that the risk of being fully seen is worth it. Someone who has learned that the work that matters — the work that actually reaches people, that changes something, that lasts past the moment of its making — requires a level of honesty that cannot be achieved at a comfortable distance from yourself. The audience for the complete version of what you have to offer is larger than you have allowed yourself to imagine. But it can only find you when you stop protecting yourself from it.`,
    ],
    4: [
      `${fn}, the arc of your life is moving toward the realisation of something you have been building, quietly and persistently, across a timeline that has probably felt longer than it should have. The foundations you have laid — the discipline you have developed, the reliability you have demonstrated through years of showing up when it was inconvenient, the systems you have built that hold — are becoming the infrastructure of something that will outlast the effort that created it.`,
      `The version of yourself that is becoming is someone who has learned that the satisfaction available on the other side of long-sustained effort is qualitatively different from anything available at the beginning. Someone who has discovered that the structures they built to contain their life were actually the life. Someone who looks at what they have created and recognises in it not just achievement but genuine craft — the evidence of a person who cared enough to do it right, all the way through, even when no one was watching.`,
    ],
    5: [
      `${fn}, the arc of your life is moving toward a form of freedom that is not the absence of commitment but the presence of genuine choice — the discovery that the most authentic version of your freedom is not found in leaving but in arriving somewhere that is fully and undeniably your own. Every transition you have navigated, every version of yourself you have inhabited and outgrown, every direction you turned when the current path stopped fitting — all of it has been preparation for a form of life that is finally, completely yours. Not borrowed from someone else's idea of what you should want. Yours.`,
      `The version of yourself that is becoming is someone who has learned that freedom and depth are not opposites, and that the richest experiences available to you are not found in the next departure but in the deepening of what you have already chosen to enter. Someone who moves through the world with a lightness that comes not from avoiding weight but from having developed the capacity to carry it without being reduced by it. At ${age}, you are not at the beginning of this understanding. You are at the point where it becomes something you can actually live rather than something you are still working toward.`,
    ],
    6: [
      `${fn}, the arc of your life is moving toward a form of love — for others, for your work, for the life you are building — that has been purified by everything you have already given and everything it has cost you. The love that is available to you now is not naive love. It is love that has been tested, that has survived difficulty, that has learned to hold joy and grief simultaneously without needing to choose between them. This is the fullest kind. It is not available at the beginning of the journey. It is only available to someone who has made it this far.`,
      `The version of yourself that is becoming is someone who has learned to give from abundance rather than from scarcity — to offer care because you genuinely have it to give, not because you are afraid of what happens if you do not. Someone who has released the equation between love and sacrifice and discovered that the most sustainable form of generosity is the kind that replenishes as it gives. That is not selfishness. That is mastery. And it is what makes your love, in its mature form, available to more people, at greater depth, for longer than anything you offered earlier.`,
    ],
    7: [
      `${fn}, the arc of your life is moving toward a form of mastery — not mastery over things but mastery of understanding. The culmination of all the time you have spent going deeper than the obvious, refusing the first answer, sitting with uncertainty until the real picture emerges — is a form of knowing that is both genuinely rare and genuinely needed. The world has more than enough people who can produce the surface version of any answer. It does not have enough people who are willing to go all the way to the real one.`,
      `The version of yourself that is becoming is someone who has stopped apologising for the depth of their inquiry and stopped minimising what that depth has produced. Someone who has discovered that the thing they were sometimes embarrassed by — the refusal to accept easy answers, the appetite for what is real beneath what is apparent — is precisely the quality that makes their contribution irreplaceable. Someone who has found, finally, a way to share what they know that does not require them to make it smaller than it actually is.`,
    ],
    8: [
      `${fn}, the arc of your life is moving toward a form of power that is worthy of the person you have been becoming across the whole of your adult life. Not the power that is accumulated through leverage or sustained through fear, but the power that is the natural consequence of excellence, of genuine integrity, of a sustained commitment to producing results that actually matter and building things that actually hold. The scale of what is available to you — in terms of impact, of influence, of the material abundance your effort is capable of generating — is larger than you have probably allowed yourself to fully consider at once.`,
      `The version of yourself that is becoming is someone who has learned to hold power without being held by it. Someone who has discovered that real authority is not defended but demonstrated — not claimed but recognised by people who have experienced the quality of your work and your character and decided, on that basis, to trust what you are building. You are moving toward a version of yourself whose contribution to the world is measurable, lasting, and entirely congruent with who you actually are. That is a rare alignment. And you are approaching it.`,
    ],
    9: [
      `${fn}, the arc of your life is moving toward the recognition of what all of it has been for. The experiences you have had, the losses you have carried, the reinventions you have navigated — these are converging into a form of wisdom that is not only yours but through you, available to others. This is the completion your blueprint has always been moving toward: not the accumulation of more, but the full realisation of what the accumulation was always preparing you to give.`,
      `The version of yourself that is becoming is someone who has learned to hold their own story with compassion rather than judgment — who can look at everything they have been through and see not a record of mistakes and recoveries but the actual substance of a meaningful life. Someone who has discovered that the most generous thing you can do with what experience has taught you is to stop keeping it private. The world you are moving into needs what you have become. And at ${age}, you are ready.`,
    ],
    11: [
      `${fn}, the arc of your life is moving toward a form of contribution that is most accurately described as illumination — not the dramatic kind, but the quiet persistent kind that operates through honest expression, through the courage to say what you actually perceive, through the willingness to acknowledge what is true even when the comfortable version is available. The people whose lives are genuinely changed by yours are changed not by what you do for them but by what you reveal to them about what is possible when someone is simply, fully honest.`,
      `The version of yourself that is becoming is someone who has learned to trust their own perception without apology. Someone who has discovered that the sensitivity they were once encouraged to manage is actually the source of their most irreplaceable contribution. Someone whose presence in the world carries a quality of genuine seeing that makes the people around them feel, for perhaps the first time, genuinely seen in return. That is not a small thing to offer. That is among the most significant things one person can give to another.`,
    ],
    22: [
      `${fn}, the arc of your life is moving toward the realisation of a vision that most people would not have dared to hold. The scale of what you are here to build is not going to become fully clear all at once, and it was never meant to. It is revealed incrementally — through each decision to show up at the level the work actually requires, through each choice to build with integrity rather than convenience, through the long patient accumulation of a body of work that is worthy of the vision that generated it.`,
      `The version of yourself that is becoming is someone who has learned to be a good steward of their own magnitude. Someone who has discovered that the greatness available to them is not a burden or a pressure but a form of sacred responsibility that, when accepted fully, produces not anxiety but clarity. You know what you are here to do. The work ahead is not figuring that out. The work ahead is doing it — consistently, at full capability, and at the scale it was always meant to occupy.`,
    ],
    33: [
      `${fn}, the arc of your life is moving toward a form of service so fully integrated with who you are that it no longer feels like sacrifice. The distinction between what you give and what you receive will become increasingly irrelevant, because the act of genuine contribution will be experienced as its own form of nourishment — as the direct expression of something that, when suppressed, produces only depletion, and when released, produces both impact and renewal simultaneously.`,
      `The version of yourself that is becoming is someone who has learned that the fullest love is the love that does not keep score. Someone who has discovered that genuine service — arriving from abundance rather than need, from choice rather than compulsion — is one of the most complete forms of freedom available to a human being. The world you are moving into is one where what you carry is finally fully given, and what is given is fully received. You are closer to that than you have ever been.`,
    ],
  }

  return destinyMap[lp] || destinyMap[9]
}

// ── CARD 8: Verdict and Path Forward ─────────────────────────
function buildVerdict(name: string, num: NumerologyProfile, ast: AstrologyProfile): [string, string] {
  const fn   = name
  const lp   = num.lifePathNumber
  const py   = num.personalYear
  const pin  = num.currentPinnacle
  const age  = num.age
  const bg   = num.birthdayGift
  const bgDesc = giftMeaning[bg] || giftMeaning[5]

  const verdictMap: Record<number, string> = {
    1:  `${fn}, here is what your blueprint says plainly: you are someone whose independence, initiative, and capacity to create movement where there was stillness are not qualities you developed. They are qualities you were born with and have been learning to trust your entire adult life. The version of you that is most fully expressed is not more careful, more patient, or more willing to wait for the right conditions. It is more willing to begin — specifically, completely, and without the permission that no external source was ever going to give you anyway.`,
    2:  `${fn}, here is what your blueprint says plainly: you are someone whose depth of attunement to others, whose capacity for genuine presence in relationship, and whose ability to hold space for what is difficult without flinching — these are not softnesses. They are forms of strength that most people spend their whole lives trying to develop and never quite reach. The version of you that is most fully expressed is not harder or more protected. It is more fully present, to others and to yourself simultaneously.`,
    3:  `${fn}, here is what your blueprint says plainly: you are someone whose communicative intelligence, creative capacity, and ability to translate experience into meaning for others are not peripheral features of who you are. They are the central thing. The version of you that is most fully expressed is not more disciplined or more strategic in isolation from your expressive gifts. It is those gifts brought all the way into form — finished, offered, and received at the level they are actually capable of reaching.`,
    4:  `${fn}, here is what your blueprint says plainly: you are someone whose structural intelligence, whose capacity for sustained commitment, and whose ability to build things that actually hold are not limitations of your temperament. They are the source of a contribution that most people cannot match precisely because they do not have the patience or the discipline to make it. The version of you that is most fully expressed does not find the building less demanding. It finds it more meaningful.`,
    5:  `${fn}, here is what your blueprint says plainly: you are someone whose intelligence is genuinely unusual, whose capacity for expression is a gift that belongs in the world at a larger scale than it has occupied, and whose ability to find your footing in conditions that destabilise others is not a coping mechanism but a form of power. You are also someone who has spent a significant portion of your life in productive tension with the version of yourself that knows how large the contribution could be. Your blueprint does not judge that. It simply notes that the circling phase is over, and that the person who needed to circle in order to understand the territory has now circled enough.`,
    6:  `${fn}, here is what your blueprint says plainly: you are someone whose capacity for love, care, and the creation of environments where others can flourish is not a secondary quality that supports your other contributions. It is the primary thing. The version of you that is most fully expressed does not love less carefully. It loves from a fuller place — from genuine abundance rather than from the fear that stopping would cost someone something they cannot afford to lose.`,
    7:  `${fn}, here is what your blueprint says plainly: you are someone whose depth of inquiry, whose refusal to accept the first answer, and whose capacity to go further than the obvious into what is actually true — these are not personality quirks. They are the mechanism of your most significant contribution. The version of you that is most fully expressed does not make your knowing smaller or more accessible in the ways that compromise its accuracy. It finds the form in which real depth can be genuinely received.`,
    8:  `${fn}, here is what your blueprint says plainly: you are someone whose strategic intelligence, whose capacity for results, and whose ability to build at scale are not ambitions imposed from outside. They are accurate descriptions of what you are actually capable of and what you are here to do. The version of you that is most fully expressed does not hold back from the scale that is available. It builds at that scale — thoroughly, intentionally, and without apologising for the magnitude of what it is attempting.`,
    9:  `${fn}, here is what your blueprint says plainly: you are someone whose accumulated wisdom, whose capacity for compassion across genuine difficulty, and whose ability to transmit what lived experience has taught you — these are not consolation prizes for what you have been through. They are the actual thing you were always moving toward. The version of you that is most fully expressed does not keep this wisdom private. It offers it, completely and without withholding, to the people who need it.`,
    11: `${fn}, here is what your blueprint says plainly: you are someone whose perceptive depth, whose sensitivity to what others cannot register, and whose capacity to inspire through honest expression are not burdens to be managed. They are the source of your most irreplaceable contribution. The version of you that is most fully expressed does not protect itself from the cost of that sensitivity by minimising it. It trusts it — completely and without the ongoing need for external validation of what it perceives.`,
    22: `${fn}, here is what your blueprint says plainly: you are someone whose capacity for large-scale vision, whose ability to hold a blueprint and a building simultaneously, and whose potential for a contribution that outlasts the effort of making it — these are not aspirations. They are accurate descriptions of what you are actually capable of. The version of you that is most fully expressed does not build at the scale that feels safe to claim. It builds at the scale the vision actually requires.`,
    33: `${fn}, here is what your blueprint says plainly: you are someone whose quality of compassion, whose capacity for healing through presence alone, and whose ability to love without keeping score — these are not sentimental qualities. They are among the rarest and most needed forms of intelligence a person can carry. The version of you that is most fully expressed does not deplete itself in service of others. It gives from a place that is also being replenished — and in doing so, gives more completely and more sustainably than has ever been possible before.`,
  }

  const solutionMap: Record<number, string> = {
    1:  `The single most important thing your blueprint identifies for you right now is this: stop waiting for the conditions to be right before you begin. The conditions will not be right. They were never going to be right. What is available to you in this specific season of your life — the particular convergence of where you are in your larger cycle and what this year is asking of you — is a quality of forward momentum that is not available in every season. Begin what you have been holding. Begin it now, with what you have, from where you are. The beginning is the entire work. Everything else follows from it.`,
    2:  `The single most important thing your blueprint identifies for you right now is this: give yourself the same quality of attention you give to others — not as an eventual reward when conditions are better, but as an immediate and ongoing practice. The year you are in is asking you to build, and the most important structure you can build is not external. It is the internal one that allows you to be genuinely present for others because you are first genuinely present for yourself. Start there. Everything else benefits from it.`,
    3:  `The single most important thing your blueprint identifies for you right now is this: choose one thing you have been holding in the realm of creative intention and bring it all the way to completion. Not to a good stopping point. To the actual end. The year you are in supports sustained effort more than it supports new beginnings. What finishes in this season carries a quality of realisation that is not available to things that are still in process. Finish the thing. Then begin the next one.`,
    4:  `The single most important thing your blueprint identifies for you right now is this: build something this year that you intend to be standing in ten years. Not a project. A structure. Something designed from the beginning to last. The year you are in is specifically asking for this quality of intention, and what you build with that intention in this particular season will hold in a way that nothing built without it could.`,
    5:  `The single most important thing your blueprint identifies for you right now is this: stop treating the scale of what you are capable of as something that requires further permission or further preparation. The year you are in is not a rehearsal year. It is the year your blueprint designates for the construction of something permanent — something built from the full range of what you have lived, expressed through the communicative gift you were born with, and offered at the scale your deepened perception and hard-won wisdom actually justify. Build it now. Build it with everything you have. What you construct this year will still be standing — and still serving — long after this season has passed.`,
    6:  `The single most important thing your blueprint identifies for you right now is this: give your most important relationships the quality of presence this season is asking for. Not the presence that is left over after everything else has been attended to. The primary presence — the one that shows up on the ordinary days, that asks the real question, that stays for the full answer. The year you are in is not primarily an achievement year. It is a love year. The most significant thing you can build in it is not external.`,
    7:  `The single most important thing your blueprint identifies for you right now is this: trust what you know. Not provisionally. Not with the usual caveat that it might be wrong. Actually trust it — enough to act on it, enough to share it, enough to let it guide you without waiting for the external confirmation that the nature of what you perceive means will often arrive late if it arrives at all. What you know is accurate. The year you are in is asking you to act as if you believe that.`,
    8:  `The single most important thing your blueprint identifies for you right now is this: make the move you have been preparing. The year you are in has a quality of material momentum that is not present in every season, and the effort you bring to your most significant professional or financial intention in this particular window will compound in ways that the same effort in a different season would not. This is not the time for preparation. The preparation is finished. This is the time for the commitment that puts what you have prepared into actual motion.`,
    9:  `The single most important thing your blueprint identifies for you right now is this: complete what is complete. Look honestly at what in your life — in your commitments, your relationships, your self-concept, your recurring patterns — has run its full course and is waiting for you to acknowledge that it is finished. The energy that is held in what is technically over but not formally closed is energy that the next chapter of your life needs. Release it. Consciously, gratefully, without grief for what it gave you. What is coming cannot fully arrive until what is complete is actually let go.`,
    11: `The single most important thing your blueprint identifies for you right now is this: act on what you perceive without waiting for it to be validated. Your perception of what is true in your current circumstances — about your direction, about the people in your life, about what is actually happening beneath the surface of what is being said — is accurate. The year you are in is specifically asking you to operate from that accuracy rather than deferring to the consensus version of reality that is always several steps behind what you are already seeing.`,
    22: `The single most important thing your blueprint identifies for you right now is this: commit to the large-scale version of what you are building, not the small-scale version that is easier to defend. The year you are in is specifically designated for building at significant scale, and what you commit to constructing at that scale in this particular window has access to a quality of foundational energy that is not available in every season. Do not build the version that is safe to attempt. Build the version that is actually worth attempting. The difference between those two things, in this specific season, is the most important decision your blueprint places before you.`,
    33: `The single most important thing your blueprint identifies for you right now is this: allow yourself to be cared for with the same completeness that you care for others. Not partially. Not when it is convenient. Actually and fully — in a way that replenishes rather than just maintains. The year you are in is asking for a quality of building that requires you to be genuinely resourced. You cannot build what this season is asking for from a place of depletion. Let yourself be filled first. What you give from that place will be the fullest version of what you have ever offered.`,
  }

  const p1 = verdictMap[lp] || verdictMap[9]
  const p2 = `${solutionMap[lp] || solutionMap[9]} You were also handed at birth ${bgDesc}. That gift has been available your entire life. It is available right now. This reading is shown only once. Download it to keep it, share it with someone who should read it, or step forward and begin building the life it describes.`

  return [p1, p2]
}

// ── Main export ───────────────────────────────────────────────
export function buildWelcomeCards(
  name: string,
  num:  NumerologyProfile,
  ast:  AstrologyProfile,
): WelcomeCard[] {
  const fn = num.firstName

  return [
    { section: 'Before We Begin',           icon: 'Sparkles', paragraphs: buildOpening(fn) },
    { section: 'Who You Are',               icon: 'Sparkles', paragraphs: buildWhoYouAre(fn, num, ast) },
    { section: 'Your Greatest Gift',        icon: 'Star',     paragraphs: buildGreatestGift(fn, num, ast) },
    { section: 'Your Core Challenge',       icon: 'Compass',  paragraphs: buildCoreChallenge(fn, num, ast) },
    { section: 'Love and Connection',       icon: 'Heart',    paragraphs: buildLoveAndConnection(fn, num, ast) },
    { section: 'Money and Purpose',         icon: 'Feather',  paragraphs: buildMoneyAndPurpose(fn, num, ast) },
    { section: 'Right Now',                 icon: 'Moon',     paragraphs: buildRightNow(fn, num, ast) },
    { section: 'Where This Is All Leading', icon: 'Infinity', paragraphs: buildDestiny(fn, num, ast) },
    { section: 'Your Verdict',              icon: 'Star',     paragraphs: buildVerdict(fn, num, ast) },
  ]
}