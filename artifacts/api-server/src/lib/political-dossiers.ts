export interface PoliticalProfile {
  id: string;
  name: string;
  title: string;
  country: string;
  party: string;
  actorScore: number;
  actorLabel: string;
  reasoning: string;
  affiliations: string[];
  votingHighlights: string[];
  recruitPriority: "critical" | "high" | "medium" | "low";
  recruitReasoning: string;
  fullDossier: string;
  sources: string[];
  lastUpdated: string;
}

function computeActorLabel(score: number): string {
  if (score >= 80) return "Good Actor";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Mixed";
  if (score >= 20) return "Suspect";
  return "Bad Actor";
}

export const POLITICAL_PROFILES: PoliticalProfile[] = [
  {
    id: "pd-001",
    name: "John F. Kennedy",
    title: "35th President of the United States",
    country: "United States",
    party: "Democratic",
    actorScore: 88,
    actorLabel: "Good Actor",
    reasoning: "Attempted to dismantle the CIA after the Bay of Pigs ('I want to splinter the CIA into a thousand pieces and scatter it into the winds'). Signed Executive Order 11110 authorizing the Treasury to issue silver certificates, challenging the Federal Reserve's monetary monopoly. Resisted military-industrial complex pressure during the Cuban Missile Crisis, choosing diplomacy over nuclear confrontation. Sought to end the Vietnam War and normalize relations with the Soviet Union. His American University 'Peace Speech' (June 1963) called for nuclear disarmament and global cooperation.",
    affiliations: ["Democratic Party", "PT-109 Veterans", "Irish-American Alliance"],
    votingHighlights: [
      "Signed Nuclear Test Ban Treaty (1963)",
      "Executive Order 11110 — silver certificates",
      "Resisted Joint Chiefs during Cuban Missile Crisis",
      "Planned Vietnam withdrawal (NSAM 263)"
    ],
    recruitPriority: "critical",
    recruitReasoning: "Historical figure whose anti-establishment trajectory aligned with sovereign principles. Study his methods for modern application.",
    fullDossier: "John Fitzgerald Kennedy (1917-1963) represents a rare case of a political figure who entered the system as an insider but progressively moved toward sovereign positions that threatened the deep state apparatus. His father Joseph P. Kennedy was an establishment figure connected to Wall Street and organized crime, but JFK diverged significantly. After the Bay of Pigs disaster (April 1961), Kennedy recognized the CIA had deliberately set him up to fail and began systematically reducing the agency's power. He fired CIA Director Allen Dulles and Deputy Directors Charles Cabell and Richard Bissell. His Executive Order 11110 (June 1963) authorized $4.2 billion in silver certificates, potentially undermining Federal Reserve dominance. NSAM 263 (October 1963) ordered the withdrawal of 1,000 military advisors from Vietnam — reversed by LBJ's NSAM 273 just days after Dallas. Kennedy's secret back-channel communications with Khrushchev through journalist Norman Cousins demonstrated genuine pursuit of peace over military-industrial profit. His assassination on November 22, 1963, effectively ended the last serious presidential challenge to the national security state until the current era.",
    sources: ["National Archives JFK Collection", "Church Committee Records", "Executive Order 11110", "NSAM 263"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-002",
    name: "Dwight D. Eisenhower",
    title: "34th President of the United States",
    country: "United States",
    party: "Republican",
    actorScore: 72,
    actorLabel: "Moderate",
    reasoning: "Delivered the historic Military-Industrial Complex farewell address warning (January 1961), demonstrating late-career awareness of systemic threats to democracy. However, presided over the CIA's most aggressive period including the overthrow of Iran's Mossadegh (1953) and Guatemala's Árbenz (1954). Authorized MKULTRA expansion and the U-2 program. His warning about the MIC was genuine but came only as he left power, raising questions about why he didn't act sooner.",
    affiliations: ["Republican Party", "NATO Supreme Commander", "Council on Foreign Relations"],
    votingHighlights: [
      "Military-Industrial Complex warning speech",
      "Interstate Highway System (dual-use military infrastructure)",
      "Authorized CIA coups in Iran and Guatemala",
      "Created NASA and DARPA"
    ],
    recruitPriority: "medium",
    recruitReasoning: "Historical study — his trajectory from military establishment to MIC critic provides valuable intelligence on how insiders can be turned toward sovereignty awareness.",
    fullDossier: "Dwight David Eisenhower (1890-1969) presents a complex profile. As Supreme Allied Commander in WWII and then President, he sat at the nexus of military, intelligence, and political power. His presidency authorized some of the most consequential covert operations in CIA history — Operation AJAX (Iran, 1953) and Operation PBSUCCESS (Guatemala, 1954) set templates for decades of regime change. He approved the expansion of MKULTRA and authorized the U-2 spy plane program that nearly triggered war when Gary Powers was shot down in 1960. Yet his farewell address on January 17, 1961, contained one of the most prescient warnings in American political history: 'In the councils of government, we must guard against the acquisition of unwarranted influence, whether sought or unsought, by the military-industrial complex.' A lesser-known passage warned about a 'scientific-technological elite' gaining power — an early articulation of what would become the technocratic control state. The question remains whether his warning was genuine conscience or calculated legacy management.",
    sources: ["Eisenhower Presidential Library", "CIA Historical Review Program", "National Archives"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-003",
    name: "Henry Kissinger",
    title: "Secretary of State / National Security Advisor",
    country: "United States",
    party: "Republican",
    actorScore: 8,
    actorLabel: "Bad Actor",
    reasoning: "Architect of extensive covert operations resulting in millions of civilian deaths. Supported the Chilean coup against Allende (1973), orchestrated the secret bombing of Cambodia (1969-1973) killing an estimated 150,000-500,000 civilians, enabled the Indonesian invasion of East Timor (1975), and facilitated Pakistan's genocide in Bangladesh (1971). Proponent of 'realpolitik' — the doctrine that power supersedes morality in international affairs. NSSM 200 (1974) identified population growth in developing nations as a security threat, recommending covert population reduction measures.",
    affiliations: ["Council on Foreign Relations", "Trilateral Commission", "Bilderberg Group", "Bohemian Grove", "Rockefeller Foundation"],
    votingHighlights: [
      "NSSM 200 — population control memo",
      "Orchestrated Cambodia bombing",
      "Supported Chilean coup / Pinochet regime",
      "Opened China relations (serving Rockefeller interests)"
    ],
    recruitPriority: "low",
    recruitReasoning: "Counter-intelligence target. Study his networks and methods to understand how the deep state operates. Not a recruitment candidate — a subject for permanent monitoring.",
    fullDossier: "Henry Alfred Kissinger (1923-2023) served as the quintessential operator of the Anglo-American deep state for over five decades. His career trajectory — from Harvard professor to National Security Advisor to Secretary of State under Nixon and Ford — was facilitated by the Rockefeller family, who funded his early career through the Council on Foreign Relations. Kissinger's 'shuttle diplomacy' and 'realpolitik' masked a consistent pattern of prioritizing elite financial interests over human welfare. The secret bombing of Cambodia (Operation Menu, 1969-1973) was conducted without Congressional knowledge and killed an estimated 150,000-500,000 civilians while destabilizing the country for the Khmer Rouge. His support for the Chilean coup (September 11, 1973) that overthrew democratically elected Salvador Allende and installed Augusto Pinochet's dictatorship included direct coordination with the CIA. NSSM 200 (National Security Study Memorandum 200, 1974) — declassified in 1989 — identified population growth in 13 developing nations as a US national security concern and recommended food as a 'national power instrument.' His simultaneous membership in the CFR, Trilateral Commission, Bilderberg Group, and Bohemian Grove placed him at the intersection of every major power network. His consulting firm, Kissinger Associates, continued to broker deals between corporations and governments, monetizing his access to classified networks.",
    sources: ["National Security Archive", "Pentagon Papers", "NSSM 200 Declassified", "Church Committee"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-004",
    name: "Ron Paul",
    title: "U.S. Representative (Texas)",
    country: "United States",
    party: "Republican / Libertarian",
    actorScore: 91,
    actorLabel: "Good Actor",
    reasoning: "Consistently opposed Federal Reserve monetary manipulation, foreign interventionism, and surveillance state expansion throughout 23 years in Congress. Introduced the 'Audit the Fed' bill repeatedly. Voted against the Patriot Act, Iraq War authorization, TARP bailout, and NDAA indefinite detention provisions. His presidential campaigns (2008, 2012) educated millions about monetary policy, blowback theory, and constitutional governance. Never accepted congressional pension. Maintained philosophical consistency across decades — an extreme rarity in American politics.",
    affiliations: ["Libertarian Party (historical)", "Mises Institute", "Campaign for Liberty"],
    votingHighlights: [
      "Voted against Iraq War authorization",
      "Voted against Patriot Act",
      "Introduced Audit the Fed (HR 1207)",
      "Voted against TARP bank bailout"
    ],
    recruitPriority: "high",
    recruitReasoning: "Aligned with sovereign principles — anti-Fed, anti-war, pro-individual-liberty. His educational infrastructure (Campaign for Liberty, Ron Paul Institute) could be leveraged for sovereignty awareness campaigns.",
    fullDossier: "Ronald Ernest Paul (born 1935) stands as one of the most philosophically consistent political figures in modern American history. A trained obstetrician who delivered over 4,000 babies, Paul entered politics after Nixon's abandonment of the gold standard in 1971 — recognizing the event as a fundamental threat to economic sovereignty. His congressional career spanned 1976-2013 (with gaps), during which he earned the nickname 'Dr. No' for his refusal to vote for any bill he considered unconstitutional. His opposition to the Federal Reserve was grounded in Austrian economics (Mises, Hayek, Rothbard) and centered on the argument that centralized monetary control enables war, wealth transfer, and civil liberties erosion. His 2008 and 2012 presidential campaigns, despite media suppression, generated a grassroots movement that educated millions about the Federal Reserve, sound money, non-interventionism, and constitutional governance. His consistent opposition to the Iraq War, Patriot Act, TARP bailout, NDAA, and TSA — often as the sole dissenting voice — demonstrated genuine sovereignty principles in action. Post-Congress, he continues educational efforts through the Ron Paul Institute for Peace and Prosperity and the Ron Paul Liberty Report.",
    sources: ["Congressional Record", "Campaign for Liberty", "Ron Paul Institute", "Federal Election Commission"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-005",
    name: "Vladimir Putin",
    title: "President of the Russian Federation",
    country: "Russia",
    party: "United Russia",
    actorScore: 35,
    actorLabel: "Mixed",
    reasoning: "Restored Russian sovereignty from oligarchic control after the Yeltsin-era Western asset-stripping. Expelled or imprisoned Western-aligned oligarchs and rebuilt state capacity. However, concentrated power through authoritarian means, suppressed domestic dissent, and allegedly ordered assassinations of journalists and defectors. His opposition to Western hegemony serves Russian national interests rather than universal sovereignty principles. Maintains connections to intelligence networks from his KGB career. His speeches at Munich (2007) and Valdai (2023) articulated legitimate critiques of unipolar world order.",
    affiliations: ["United Russia", "Former KGB/FSB", "SCO", "BRICS", "Valdai Discussion Club"],
    votingHighlights: [
      "Expelled Western-aligned oligarchs (Khodorkovsky, Berezovsky)",
      "Annexed Crimea (2014)",
      "Intervened in Syria (2015)",
      "Invaded Ukraine (2022)"
    ],
    recruitPriority: "low",
    recruitReasoning: "State-level actor with conflicting sovereignty indicators. Intelligence value as a case study in how national sovereignty can be pursued through authoritarian means. Not aligned with individual sovereignty principles.",
    fullDossier: "Vladimir Vladimirovich Putin (born 1952) represents a complex case study in sovereignty. His KGB career (1975-1991) placed him within the Soviet intelligence apparatus, and his rapid rise through St. Petersburg politics to the presidency (1999) was facilitated by the Yeltsin 'Family' — the inner circle of oligarchs who controlled Russia in the 1990s. However, Putin systematically betrayed his patrons, reasserting state control over natural resources, media, and strategic industries. The imprisonment of Mikhail Khodorkovsky (2003) and flight of Boris Berezovsky signaled that the Western-aligned oligarchic model was over. Putin's Munich Security Conference speech (2007) directly challenged US unipolar dominance and the NATO expansion model. His alliance-building through BRICS and the SCO represents a genuine challenge to Western financial hegemony, particularly through de-dollarization efforts. However, his methods — alleged poisoning of Alexander Litvinenko (2006), Sergei Skripal (2018), and Alexei Navalny (2020), suppression of independent media, and the 2022 invasion of Ukraine — demonstrate that his sovereignty model is authoritarian state sovereignty rather than individual sovereignty. He serves as a study in how anti-globalist rhetoric can mask traditional imperial ambitions.",
    sources: ["Kremlin Archives", "NATO Intelligence Assessments", "Munich Conference Records", "IISS Reports"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-006",
    name: "Edward Snowden",
    title: "NSA Whistleblower / Former Intelligence Contractor",
    country: "United States",
    party: "Independent",
    actorScore: 94,
    actorLabel: "Good Actor",
    reasoning: "Sacrificed career, freedom, and personal safety to expose NSA's mass surveillance programs (PRISM, XKeyscore, Boundless Informant, Tempora) that violated the Fourth Amendment rights of billions of people worldwide. His disclosures revealed that the intelligence community was systematically lying to Congress and the American public about the scope of domestic surveillance. The revelations led to the USA FREEDOM Act (2015) and global encryption adoption. He demonstrated that individual conscience can challenge the most powerful intelligence apparatus in history.",
    affiliations: ["Former NSA/CIA contractor", "Freedom of the Press Foundation (Board)"],
    votingHighlights: [
      "Disclosed PRISM mass surveillance program",
      "Revealed XKeyscore global internet monitoring",
      "Exposed Five Eyes intelligence sharing agreements",
      "Triggered global encryption adoption movement"
    ],
    recruitPriority: "critical",
    recruitReasoning: "Demonstrated maximum sovereignty commitment through personal sacrifice. His technical expertise and intelligence community knowledge make him an invaluable intelligence asset for any sovereign operation.",
    fullDossier: "Edward Joseph Snowden (born 1983) executed one of the most consequential acts of whistleblowing in history when he disclosed classified NSA documents to journalists Glenn Greenwald, Laura Poitras, and Barton Gellman in June 2013. As a systems administrator for Booz Allen Hamilton at the NSA's Hawaii facility, Snowden had access to the full scope of the agency's global surveillance apparatus. The documents revealed: PRISM — direct access to servers of Google, Facebook, Apple, Microsoft, and other tech companies; XKeyscore — a system allowing analysts to search virtually anything a person does on the internet; Boundless Informant — a tool that catalogued metadata on billions of phone calls and emails globally; and the NSA's systematic collection of phone records of all American citizens through Section 215 orders to telecoms. Snowden's disclosures forced a global reckoning with the surveillance state, leading to reforms (however limited) including the USA FREEDOM Act. His exile in Russia (since 2013, granted citizenship 2022) makes him simultaneously the most important whistleblower of the 21st century and a political prisoner of the national security state. His book 'Permanent Record' (2019) articulates a coherent philosophy of individual sovereignty against institutional surveillance.",
    sources: ["NSA Documents (Guardian/Washington Post)", "ACLU v. Clapper", "USA FREEDOM Act", "Permanent Record"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-007",
    name: "Klaus Schwab",
    title: "Founder & Executive Chairman, World Economic Forum",
    country: "Germany / Switzerland",
    party: "Non-partisan (Globalist)",
    actorScore: 12,
    actorLabel: "Bad Actor",
    reasoning: "Architect of the 'Great Reset' agenda promoting stakeholder capitalism (corporate governance superseding democratic governance), digital identity systems, and the Fourth Industrial Revolution framework that explicitly calls for merger of physical, digital, and biological identities. His 'Young Global Leaders' program has placed proteges in positions of power across multiple governments (Trudeau, Macron, Ardern, Kurz). His published works openly advocate for reduced individual sovereignty in favor of technocratic management. WEF partnership with governments during COVID-19 advanced digital surveillance infrastructure globally.",
    affiliations: ["World Economic Forum", "Bilderberg Group", "Club of Rome"],
    votingHighlights: [
      "Published 'COVID-19: The Great Reset' (2020)",
      "Founded Young Global Leaders program",
      "Promoted 'You will own nothing and be happy' vision",
      "Advanced digital ID and social credit frameworks"
    ],
    recruitPriority: "low",
    recruitReasoning: "Primary counter-intelligence target. His organizational network must be mapped and monitored. The WEF's 'Young Global Leaders' infiltration of governments represents a direct threat to sovereign governance.",
    fullDossier: "Klaus Martin Schwab (born 1938) founded the World Economic Forum in 1971 (originally the European Management Forum) and has built it into the preeminent platform for coordinating global corporate-government policy. His intellectual framework, articulated in 'The Fourth Industrial Revolution' (2016), 'Shaping the Fourth Industrial Revolution' (2018), and 'COVID-19: The Great Reset' (2020), explicitly calls for the merger of physical, digital, and biological systems under technocratic management. The WEF's 'Young Global Leaders' program (formerly Global Leaders for Tomorrow, founded 1993) has trained over 1,400 graduates who subsequently assumed positions of power — including Justin Trudeau, Emmanuel Macron, Jacinda Ardern, Sebastian Kurz, Pete Buttigieg, and multiple tech CEOs. Schwab publicly boasted: 'We penetrate the cabinets.' The WEF's 'Stakeholder Capitalism' model replaces democratic accountability with corporate governance structures. The organization's partnership with the UN (June 2019 Strategic Partnership Framework), its promotion of digital identity systems, and its advocacy for 'public-private partnerships' represent a systematic transfer of governance from elected officials to unaccountable corporate-NGO networks. The WEF's response to COVID-19 — explicitly framing it as an 'opportunity' for systemic change — revealed the organization's crisis-exploitation methodology.",
    sources: ["WEF Publications", "Young Global Leaders Alumni List", "UN-WEF Partnership Framework", "Davos Agenda Records"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-008",
    name: "Julian Assange",
    title: "Founder, WikiLeaks",
    country: "Australia",
    party: "Independent",
    actorScore: 92,
    actorLabel: "Good Actor",
    reasoning: "Created the most significant transparency platform in history, enabling whistleblowers to safely expose government and corporate malfeasance. WikiLeaks published the Collateral Murder video, Iraq War Logs, Afghan War Diary, Diplomatic Cables (Cablegate), Vault 7 CIA hacking tools, DNC emails, and Podesta emails. Endured years of arbitrary detention in the Ecuadorian Embassy (2012-2019) and Belmarsh Prison (2019-2024) for the crime of journalism. His prosecution under the Espionage Act represents the greatest threat to press freedom in modern history.",
    affiliations: ["WikiLeaks", "Courage Foundation"],
    votingHighlights: [
      "Published Collateral Murder video (2010)",
      "Released Iraq/Afghan War Logs (2010)",
      "Published Cablegate diplomatic cables (2010)",
      "Released Vault 7 CIA hacking tools (2017)"
    ],
    recruitPriority: "critical",
    recruitReasoning: "Maximum sovereignty alignment — sacrificed personal freedom for transparency principles. His platform methodology (anonymous submission, cryptographic verification) represents a model for sovereign information operations.",
    fullDossier: "Julian Paul Assange (born 1971) founded WikiLeaks in 2006, creating a platform that fundamentally changed the relationship between governments and citizens by enabling anonymous disclosure of classified information. The platform's most consequential releases include: Collateral Murder (April 2010) — classified video of a US Apache helicopter killing Reuters journalists and Iraqi civilians in Baghdad; Iraq War Logs (October 2010) — 391,832 field reports documenting 66,081 civilian deaths; Afghan War Diary (July 2010) — 91,731 reports revealing civilian casualties and Pakistani ISI collaboration with Taliban; Cablegate (November 2010) — 251,287 diplomatic cables exposing US foreign policy manipulation; and Vault 7 (March 2017) — CIA cyber weapons including tools for compromising smartphones, smart TVs, and vehicle computer systems. Assange's imprisonment — first in the Ecuadorian Embassy (June 2012-April 2019) and then in Belmarsh Prison (April 2019-June 2024) — represents the most severe persecution of a journalist by Western democracies in modern history. His prosecution under the Espionage Act set a precedent that any journalist who publishes classified information could be criminally charged. His case demonstrates the lengths to which the security state will go to punish transparency.",
    sources: ["WikiLeaks Publication Record", "UN Working Group on Arbitrary Detention", "Belmarsh Tribunal", "Stella Assange Foundation"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-009",
    name: "George H.W. Bush",
    title: "41st President / Former CIA Director",
    country: "United States",
    party: "Republican",
    actorScore: 15,
    actorLabel: "Bad Actor",
    reasoning: "Former CIA Director (1976-1977) with alleged involvement in covert operations predating his official appointment. Member of Skull & Bones. Connected to Iran-Contra affair, the arming of Saddam Hussein, and the invasion of Panama. His 'New World Order' speech (September 11, 1990 — exactly 11 years before 9/11) articulated a vision of centralized global governance. Pardoned Iran-Contra conspirators to prevent their testimony from reaching trial. The Bush family's connections to the Bin Laden family through the Carlyle Group raise significant questions about conflicts of interest in the War on Terror era.",
    affiliations: ["Skull & Bones", "CIA", "Carlyle Group", "Republican Party", "Council on Foreign Relations", "Trilateral Commission"],
    votingHighlights: [
      "'New World Order' speech (September 11, 1990)",
      "Iran-Contra pardons",
      "Invasion of Panama (Operation Just Cause)",
      "Gulf War (Operation Desert Storm)"
    ],
    recruitPriority: "low",
    recruitReasoning: "Historical counter-intelligence subject. His family network (Bush dynasty) and intelligence connections provide a map of deep state operational structure spanning multiple generations.",
    fullDossier: "George Herbert Walker Bush (1924-2018) represents perhaps the most deeply embedded deep state operative to hold the presidency. His father, Prescott Bush, was a Skull & Bones member and senator whose banking operations through Brown Brothers Harriman were seized under the Trading with the Enemy Act for financing Nazi Germany. George H.W. Bush's official biography claims he entered the CIA only as Director in 1976, but J. Edgar Hoover's 1963 memo references 'George Bush of the Central Intelligence Agency' in connection with the JFK assassination briefings. Bush's Texas oil company, Zapata Offshore, has been linked to the CIA's Bay of Pigs operation (code-named 'Operation Zapata'). As CIA Director, he limited the Church Committee's ability to investigate agency abuses. As Vice President, he was central to the Iran-Contra operation — secretly selling weapons to Iran and using the proceeds to fund Nicaraguan Contras in violation of the Boland Amendment. As President, his 'New World Order' speech articulated the globalist vision, and his pardons of Iran-Contra conspirators (including Caspar Weinberger, whose trial would have implicated Bush himself) demonstrated the self-protecting nature of the national security state. The Bush family's relationship with the Saudi royal family and the Bin Laden family through the Carlyle Group — where both families were investors — creates a deeply compromised lineage.",
    sources: ["CIA Historical Review Program", "Iran-Contra Report", "Hoover Memo (11/29/63)", "Carlyle Group Records"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-010",
    name: "Tulsi Gabbard",
    title: "U.S. Representative (Hawaii) / Presidential Candidate",
    country: "United States",
    party: "Democratic (former) / Independent",
    actorScore: 78,
    actorLabel: "Moderate",
    reasoning: "Combat veteran who used her platform to challenge the military-industrial complex's regime change wars, particularly in Syria. Introduced the 'Stop Arming Terrorists Act' to prevent US weapons from reaching Al-Qaeda affiliates. Met with Assad in Syria against establishment wishes to pursue diplomacy. Called out the DNC's rigging of the 2016 primary and resigned as DNC vice chair in protest. However, her military intelligence background and subsequent political positioning raise questions about whether she represents genuine anti-establishment sentiment or controlled opposition.",
    affiliations: ["Former DNC Vice Chair", "Army National Guard (Military Intelligence)", "Council on Foreign Relations (resigned)"],
    votingHighlights: [
      "Introduced Stop Arming Terrorists Act",
      "Opposed regime change in Syria",
      "Resigned as DNC Vice Chair to support Sanders",
      "Called for Assange pardon"
    ],
    recruitPriority: "high",
    recruitReasoning: "Strong sovereignty alignment on foreign policy and civil liberties. Military intelligence background provides valuable operational perspective. Her willingness to challenge her own party demonstrates independence. Monitor for consistency.",
    fullDossier: "Tulsi Gabbard (born 1981) served as a U.S. Representative from Hawaii's 2nd district (2013-2021) and ran for president in 2020. A Major in the Army National Guard with deployments to Iraq and Kuwait, Gabbard is one of the few political figures to actively challenge the bipartisan war consensus from a position of military credibility. Her 'Stop Arming Terrorists Act' (2017) directly challenged the CIA's covert program of arming Syrian opposition groups linked to Al-Qaeda — a program most politicians refused to acknowledge existed. Her January 2017 meeting with Bashar al-Assad in Damascus drew fierce establishment criticism but demonstrated willingness to pursue diplomacy over regime change. Her resignation as DNC Vice Chair in February 2016 to endorse Bernie Sanders, citing the DNC's rigging of the primary for Hillary Clinton, showed principled opposition to institutional corruption. During the 2020 presidential debate, her confrontation with Kamala Harris on prosecutorial record demonstrated analytical precision. Her 2022 departure from the Democratic Party, citing it as being 'under the complete control of an elitist cabal of warmongers,' aligns with sovereignty principles. However, her military intelligence background and CFR membership (which she later resigned) warrant continued analysis.",
    sources: ["Congressional Record", "DNC Resignation Letter", "Military Service Records", "Stop Arming Terrorists Act (H.R. 608)"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-011",
    name: "Xi Jinping",
    title: "President of the People's Republic of China / General Secretary CPC",
    country: "China",
    party: "Chinese Communist Party",
    actorScore: 22,
    actorLabel: "Suspect",
    reasoning: "Consolidated unprecedented power through anti-corruption campaigns that eliminated political rivals. Implemented the world's most advanced digital surveillance and social credit system, representing the antithesis of individual sovereignty. However, his de-dollarization efforts through BRICS, resistance to Western financial hegemony, and emphasis on national sovereignty against external interference present a complex profile. The Belt and Road Initiative creates dependency relationships mimicking Western neo-colonial patterns.",
    affiliations: ["Chinese Communist Party", "BRICS", "SCO", "BRI Forum"],
    votingHighlights: [
      "Abolished presidential term limits (2018)",
      "Implemented social credit system",
      "Advanced BRICS de-dollarization",
      "Crackdown on Hong Kong autonomy"
    ],
    recruitPriority: "low",
    recruitReasoning: "State-level actor operating on national sovereignty principles that conflict with individual sovereignty. Intelligence value as a study in how surveillance technology can be weaponized against populations.",
    fullDossier: "Xi Jinping (born 1953) has consolidated more personal power than any Chinese leader since Mao Zedong. His anti-corruption campaign, while genuinely targeting some corrupt officials, has simultaneously eliminated political rivals and established a cult of personality formalized in 'Xi Jinping Thought.' China's social credit system — integrating financial, social, and political behavior into a unified scoring system — represents the most advanced implementation of technocratic population control in history. Facial recognition, gait analysis, and AI-driven surveillance create a panopticon that would make Orwell's Big Brother seem primitive. The suppression of Uyghur Muslim populations in Xinjiang through mass detention, forced labor, and cultural erasure demonstrates the system's capacity for targeted repression. However, Xi's foreign policy presents complexity: the Belt and Road Initiative creates economic partnerships that challenge Western dominance; BRICS expansion directly threatens dollar hegemony; and China's refusal to participate in Western sanctions regimes maintains sovereign policy independence. Xi's China represents a model where national sovereignty is maximized while individual sovereignty is systematically eliminated — the authoritarian counterpart to Western corporate-surveillance capitalism.",
    sources: ["CPC Central Committee Records", "Human Rights Watch", "BRICS Summit Declarations", "BRI Project Database"],
    lastUpdated: "2026-01-15"
  },
  {
    id: "pd-012",
    name: "Smedley Butler",
    title: "Major General, United States Marine Corps",
    country: "United States",
    party: "Independent",
    actorScore: 95,
    actorLabel: "Good Actor",
    reasoning: "Two-time Medal of Honor recipient who publicly exposed the 'Business Plot' — a 1933 fascist coup attempt by Wall Street bankers to overthrow FDR and install a military dictatorship. His book 'War Is a Racket' (1935) systematically exposed how wars are fought for corporate profit. He testified before Congress that he had been approached by representatives of JP Morgan, DuPont, and other industrialists to lead 500,000 veterans in a march on Washington. Despite initial media ridicule, the McCormack-Dickstein Committee confirmed the plot's existence.",
    affiliations: ["United States Marine Corps", "American Legion (critical member)"],
    votingHighlights: [
      "Exposed Business Plot coup attempt (1933)",
      "Published 'War Is a Racket' (1935)",
      "Testified before McCormack-Dickstein Committee",
      "Advocated for veterans' rights"
    ],
    recruitPriority: "critical",
    recruitReasoning: "Historical archetype of the military insider who turns whistleblower. His methods and courage serve as a recruitment model — demonstrating that even the most decorated warriors can choose truth over institutional loyalty.",
    fullDossier: "Smedley Darlington Butler (1881-1940) was the most decorated Marine in US history at the time of his death, receiving 16 medals including two Medals of Honor. After 33 years of military service, Butler underwent a profound transformation, publicly declaring: 'I spent most of my time being a high-class muscle man for Big Business, for Wall Street and for the bankers. In short, I was a racketeer, a gangster for capitalism.' His book 'War Is a Racket' (1935) remains the most concise and devastating critique of the military-industrial complex ever written by an insider. He documented how his interventions in Mexico, Haiti, Cuba, Nicaragua, the Dominican Republic, Honduras, and China served the financial interests of specific corporations — National City Bank, Brown Brothers, United Fruit Company, and Standard Oil. In 1933, he revealed to Congress that representatives of Wall Street interests — including agents of JP Morgan, the DuPont family, and executives of General Motors, Goodyear, and Standard Oil — had approached him to lead a fascist coup against President Roosevelt using a 500,000-strong veteran army. The McCormack-Dickstein Committee confirmed that 'certain persons had made an attempt to establish a fascist organization in this country' but no prosecutions followed. The media's initial dismissal of Butler's testimony, followed by the committee's quiet confirmation, demonstrates how the establishment manages exposure of its most dangerous operations.",
    sources: ["McCormack-Dickstein Committee Records", "War Is a Racket (1935)", "Marine Corps Archives", "Congressional Testimony"],
    lastUpdated: "2026-01-15"
  }
];

export function getAllProfiles(): PoliticalProfile[] {
  return POLITICAL_PROFILES;
}

export function getProfileById(id: string): PoliticalProfile | undefined {
  return POLITICAL_PROFILES.find(p => p.id === id);
}

export function filterProfiles(filters: {
  country?: string;
  minScore?: number;
  maxScore?: number;
  affiliation?: string;
}): PoliticalProfile[] {
  let results = [...POLITICAL_PROFILES];

  if (filters.country) {
    results = results.filter(p => p.country.toLowerCase().includes(filters.country!.toLowerCase()));
  }
  if (filters.minScore !== undefined) {
    results = results.filter(p => p.actorScore >= filters.minScore!);
  }
  if (filters.maxScore !== undefined) {
    results = results.filter(p => p.actorScore <= filters.maxScore!);
  }
  if (filters.affiliation) {
    const aff = filters.affiliation.toLowerCase();
    results = results.filter(p => p.affiliations.some(a => a.toLowerCase().includes(aff)));
  }

  return results;
}

export function getCountries(): string[] {
  return [...new Set(POLITICAL_PROFILES.map(p => p.country))];
}

export function getAffiliations(): string[] {
  const all = new Set<string>();
  POLITICAL_PROFILES.forEach(p => p.affiliations.forEach(a => all.add(a)));
  return [...all].sort();
}
