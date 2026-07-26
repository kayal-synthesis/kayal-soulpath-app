// ============================================================
// OMNI-SEER — RELATIONSHIPS (10 tools)
// Domain: oracle-temple
// Route: /domain/omni-seer
// Split out of the original single omni-seer-tools.ts (35 tools)
// for manageability. This file: Love (3), Family (4), and the
// relationship-adjacent additions (health cross-impact, marriage
// longevity score, the two-person flagship).
// ============================================================

export interface OmniSeerTool {
  id: string
  name: string
  tagline: string
  emoji: string
  hook: string
  price: number
  domain: 'oracle-temple'
  requiresPartner?: boolean
  requiresImage?: boolean
  isPopular?: boolean
  isBestSeller?: boolean
  isNew?: boolean
  rating?: number
  reviewCount?: number
  whatYouGet: string[]
  guidanceType?: 'practical-solution' | 'daily-guidance'
  guidanceText?: string
  upsell?: { id: string; name: string; price: number }
}

export const omniRelationshipTools: OmniSeerTool[] = [
  {
    id: 'complete-love-synthesis',
    name: 'The Complete Read on How You Love',
    tagline: 'The complete synthesis of your love life across every discipline, not a single-angle reading',
    emoji: '❤️‍🔥',
    price: 79,
    domain: 'oracle-temple',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 2341,
    hook: 'Most love readings look at one angle. This one checks your pattern across several real systems at once, so what you get is checked, not guessed.',
    whatYouGet: [
      'Your complete love pattern, checked across several real systems, not just one',
      'How your core wound, your timing, and what you actually want connect to each other',
      'Where multiple systems agree, which is where the real signal is',
      'Where they disagree, and what that tension is actually telling you',
      'Whether your current pattern is still active and building, or already starting to loosen',
      'Whether this pattern is deeply set in you, or shifts more easily than you think',
      'A clear read on where you stand right now, compared to your longer pattern',
      'One real practice this month, matched to your specific pattern, not generic advice',
      'The kind of connection most likely to interrupt the pattern in a good way',
      'The specific relationship, past or present, that reveals this pattern most clearly',
    ],
    upsell: { id: 'love-scribe', name: 'The Love Scribe', price: 24 },
  },
  {
    id: 'soulmate-compatibility-verdict',
    name: 'Two Names, One Compatibility Verdict',
    tagline: 'A direct verdict on soulmate compatibility, built from both of your complete details',
    emoji: '💍',
    price: 69,
    domain: 'oracle-temple',
    requiresPartner: true,
    rating: 4.8,
    reviewCount: 1567,
    hook: 'A percentage score does not tell you the real story. This reading checks both of your real patterns and gives you a clear, honest verdict.',
    whatYouGet: [
      'A clear verdict on real compatibility, not a vague percentage',
      'The real reasoning behind that verdict, checked across every part of your patterns',
      'Where you two align at a level deeper than day-to-day life',
      'The one thing most likely to test this connection, named honestly',
      'Whether one of you tends to lead this connection more than the other',
      'Whether this connection is still building, or already starting to settle',
      'Whether the timing is right for this connection to grow, right now',
      'One real thing to try this month if you choose to grow this connection',
      'Whether this same pattern has shown up in either of your past relationships',
      'What this connection is genuinely well-suited to build together, beyond the relationship itself',
    ],
    upsell: { id: 'complete-union-blueprint', name: 'What the Two of You Become Together', price: 99 },
  },
  {
    id: 'professional-compatibility-scan',
    name: 'Before You Sign With a Business Partner',
    tagline: 'A compatibility reading built specifically for business partners, not romantic ones',
    emoji: '🤝',
    price: 69,
    domain: 'oracle-temple',
    requiresPartner: true,
    rating: 4.7,
    reviewCount: 892,
    hook: 'Romantic compatibility and business compatibility are not the same question. This reading checks your real working styles before real money is on the line.',
    whatYouGet: [
      'A direct read on real working compatibility, not romantic compatibility',
      'Where your working styles genuinely fit together',
      'The real friction points most likely to show up under real pressure',
      'Which of those friction points can be solved, and which cannot',
      'Whether one of you naturally leads and one naturally follows in this partnership',
      'The kind of role split most likely to make this partnership actually work',
      'One thing to put in writing now, before it becomes necessary later',
      'Whether this pattern of partnership has worked or failed for either of you before',
      'What this partnership would need to survive a genuinely bad year, not just a good one',
      'What this partnership is genuinely well-positioned to do that neither of you could do alone',
    ],
    upsell: { id: 'wealth-scribe', name: 'The Wealth Scribe', price: 24 },
  },
  {
    id: 'family-destiny-synthesis',
    name: 'What Your Family Actually Passed Down',
    tagline: 'A full synthesis of what your family line actually passed down to you, named clearly',
    emoji: '🌳',
    price: 69,
    domain: 'oracle-temple',
    rating: 4.7,
    reviewCount: 1109,
    hook: 'Every family passes down more than looks. This reading checks the real pattern your family carries, using more than one system, and one way to change it.',
    whatYouGet: [
      'The real pattern your family has passed down, checked across more than one system',
      'Where in your family line this pattern most likely started',
      'How this pattern has shown up differently across your family, while staying the same underneath',
      'The unspoken rule in your family this pattern has been quietly protecting',
      'Whether this pattern is close to shifting, or still firmly in place',
      'What carrying it forward differently would actually look like',
      'One real action this month to start changing this pattern',
      'The specific family member most likely to have carried this pattern most visibly',
      'Whether this pattern shows up more in how the family handles conflict, money, or closeness',
      'What the next generation would inherit instead, if this pattern genuinely shifted',
    ],
    upsell: { id: 'spiritual-scribe', name: 'The Spiritual Scribe', price: 24 },
  },
  {
    id: 'child-blueprint',
    name: 'Who This Child Is Becoming',
    tagline: 'A reading built for a child, showing who they are becoming rather than who they should be',
    emoji: '🧒',
    price: 59,
    domain: 'oracle-temple',
    rating: 4.8,
    reviewCount: 1432,
    hook: "Most parenting advice is generic. This reading checks your child's real pattern, using their own numbers, and shows what actually helps them.",
    whatYouGet: [
      'Your child\'s real pattern, checked from their own numbers, not a generic age stage',
      'What this child genuinely needs to do well, different from standard advice',
      'Where common parenting advice might actually work against this specific child',
      'Whether this child\'s strongest gift is already showing, or still forming',
      'One real thing this child is naturally good at, even if it is not obvious yet',
      'One small way to support this child this month, based on their real pattern',
      'The kind of discipline or structure most likely to genuinely work for this child',
      'Where this child is most likely to be misread by teachers or other adults',
      'What this child will most need from you specifically as they get older',
    ],
    upsell: { id: 'parenting-scribe', name: 'The Parenting Scribe', price: 24 },
  },
  {
    id: 'parent-child-relationship-mirror',
    name: "The Parent-Child Conflict That Isn't About Either of You",
    tagline: 'A reading of a parent-child dynamic, showing what is actually driving the friction',
    emoji: '🪞',
    price: 59,
    domain: 'oracle-temple',
    hook: 'Parent and child conflict is often not about either person. This reading checks how your two real patterns clash, and shows how to ease it.',
    whatYouGet: [
      'How your pattern and your child\'s pattern actually interact',
      'Where the conflict is built into how your two patterns meet, not either person\'s fault',
      'The real situation most likely to trigger this specific conflict',
      'Where your two patterns actually work well together, often missed in the conflict',
      'What each of you is really asking for underneath the surface conflict',
      'One small change, on either side, most likely to ease this conflict this month',
      'Whether this same friction shows up with siblings, or is specific to this one relationship',
      'The age or stage where this friction is most likely to peak',
      'What genuinely repairing this dynamic would look like, beyond just reducing the conflict',
    ],
    upsell: { id: 'parenting-scribe', name: 'The Parenting Scribe', price: 24 },
  },
  {
    id: 'fertility-soul-synthesis',
    name: "When You're Both Ready to Have a Child",
    tagline: 'A reading of the timing question around conception, built from both partners\' details',
    emoji: '🌱',
    price: 69,
    domain: 'oracle-temple',
    requiresPartner: true,
    hook: 'The right timing for a child involves two real patterns, not one. This reading checks both of yours, and shows your real window.',
    whatYouGet: [
      'The real windows ahead that most favor conception, checked from both of your patterns',
      'What each of you might need before that window is fully open',
      'Whether your best window is still building, or already close',
      'How your two patterns interact around this specific question',
      'The real difference between being ready in timing and ready in the relationship',
      'One thing worth addressing together this month before actively trying',
      'Whether either of your patterns shows a natural pull toward a specific number of children',
      'The kind of support most likely to matter once this window actually opens',
      'What waiting past this window would most likely mean for you both',
      'How this window compares to what either of you may have assumed about timing',
    ],
    upsell: { id: 'relationship-scribe', name: 'The Relationship Scribe', price: 24 },
  },
  {
    id: 'synastry-health-cross-impact',
    name: 'How This Relationship Affects Your Health',
    tagline: 'A synastry reading of how this specific relationship is actually affecting your physical and emotional health',
    emoji: '💗',
    price: 59,
    domain: 'oracle-temple',
    requiresPartner: true,
    hook: 'Some relationships genuinely help your health. Others quietly cost you sleep, energy, and peace. This reading checks which one this is.',
    whatYouGet: [
      'What this relationship is genuinely doing to your health right now',
      'The specific area most affected, sleep, energy, appetite, or your nervous system',
      'Whether the real cause is your partner\'s pattern, or the dynamic between you both',
      'What this relationship gives back to your health that is easy to miss',
      'The real situation most likely to trigger a health cost in this relationship',
      'One real change, on either side, that would help your health this month',
      'Whether this impact has gotten worse or better as the relationship has gone on',
      'The specific habit in the relationship most responsible for this cost',
      'How to tell the difference between a hard season and a genuinely unhealthy pattern',
    ],
    upsell: { id: 'health-scribe', name: 'The Health Scribe', price: 24 },
  },
  {
    id: 'marriage-longevity-score',
    name: 'How Long This Is Actually Built to Last',
    tagline: 'A direct, weighted assessment of how long this relationship is actually built to last',
    emoji: '⏳',
    price: 69,
    domain: 'oracle-temple',
    requiresPartner: true,
    isPopular: true,
    hook: 'Most compatibility readings check how well you get along. This reading checks how durable your relationship actually is, built on real factors.',
    whatYouGet: [
      'A real, weighted check on how durable this relationship actually is',
      'The real factors currently working in favor of it lasting',
      'The real factors currently working against it, named honestly',
      'Which of those factors can change, and which cannot',
      'Whether trust is a real risk here, or something else is',
      'Whether one of you controls the relationship more than the other, and if that helps or hurts',
      'One real action this month to actively strengthen it, not just hope it holds',
      'Whether this durability score has shifted meaningfully since the relationship began',
      'The specific type of stress most likely to test this relationship\'s durability',
      'What a version of this relationship built to last another decade would need to look like',
    ],
    upsell: { id: 'complete-union-blueprint', name: 'What the Two of You Become Together', price: 99 },
  },
  {
    id: 'complete-union-blueprint',
    name: 'What the Two of You Become Together',
    tagline: 'A full two-person synthesis of what this specific pairing becomes together, beyond either person alone',
    emoji: '💞',
    price: 99,
    domain: 'oracle-temple',
    requiresPartner: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1432,
    hook: 'Two people together create something new. This reading checks that new thing across every real area, marriage, money, health, family, and spirit, not just chemistry.',
    whatYouGet: [
      'A real, weighted score across every major area of this relationship, not one vague number',
      'Who each of you really is, checked separately, before checking you as a pair',
      'How durable this relationship actually is, structurally, over time',
      'Your real intimacy and physical connection score, not just assumed',
      'Your fit around having and raising children together, if that question is relevant to you',
      'How well you would work together, and how your money patterns actually fit',
      'What this relationship is doing to each of your health, for better or worse',
      'How your spiritual patterns align, and where they genuinely differ',
      'Whether trust is a real structural risk here, and how power tends to move between you',
      'Which family patterns from each of your lines are most active in this relationship',
      'What this union is actually built to do together, beyond just staying together',
      'A full plan of real remedies across trust, power, money, and connection, not just one suggestion',
    ],
    upsell: { id: 'relationship-scribe', name: 'The Relationship Scribe', price: 24 },
  },
]

export const getRelationshipToolsById = (id: string) => omniRelationshipTools.find(t => t.id === id)
export const getPopularRelationshipTools = () => omniRelationshipTools.filter(t => t.isPopular)
