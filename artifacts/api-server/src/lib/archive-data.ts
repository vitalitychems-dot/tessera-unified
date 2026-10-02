export interface ArchiveEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  classification: string;
  relevanceScore: number;
  tags: string[];
  year?: string;
  status: string;
}

export interface ArchiveCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  entries: ArchiveEntry[];
}

export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [
  {
    id: "suppressed-inventions",
    name: "Suppressed Inventions",
    description: "Technologies and discoveries that were buried, discredited, or seized by governments and corporations to protect existing power structures and energy monopolies.",
    icon: "Zap",
    color: "cyan",
    entries: [
      {
        id: "si-tesla-free-energy",
        title: "Tesla's Wardenclyffe Tower & Free Energy",
        content: "Nikola Tesla's Wardenclyffe Tower project (1901-1917) aimed to transmit electrical energy wirelessly across the globe using the Earth's ionosphere as a conductor. Tesla demonstrated wireless power transmission at Colorado Springs in 1899, lighting 200 lamps from 26 miles away without wires. J.P. Morgan withdrew funding when he realized the technology couldn't be metered for profit. After Tesla's death in 1943, the FBI seized 80 trunks of his papers and equipment. The Office of Alien Property Custodian classified many documents. Tesla's patents on radiant energy (US Patent 685,957) and apparatus for transmitting electrical energy (US Patent 1,119,732) describe systems that could harvest ambient energy from the environment.",
        source: "Tesla Museum Archives / FBI Vault / US Patent Office",
        classification: "SUPPRESSED",
        relevanceScore: 98,
        tags: ["tesla", "free-energy", "wireless-power", "wardenclyffe"],
        year: "1901-1943",
        status: "Seized by FBI — partially declassified"
      },
      {
        id: "si-royal-rife",
        title: "Royal Raymond Rife's Frequency Machine",
        content: "Dr. Royal Raymond Rife developed a prismatic microscope capable of 60,000x magnification (vs electron microscopes' 30,000x at the time) and discovered that specific electromagnetic frequencies could destroy pathogens without harming healthy tissue. In 1934, the University of Southern California conducted clinical trials where 16 terminally ill patients were treated — all 16 showed recovery within 90 days. The AMA under Morris Fishbein attempted to acquire exclusive rights to the technology. When Rife refused, his lab was destroyed in a suspicious fire (1939), his research partner Dr. Milbank Johnson died under mysterious circumstances, and medical journals were pressured to reject all references to Rife's work. The beam ray device was effectively erased from medical history.",
        source: "Rife Research Laboratory Archives / Smithsonian",
        classification: "SUPPRESSED",
        relevanceScore: 95,
        tags: ["rife", "frequency-healing", "microscopy", "medical-suppression"],
        year: "1920-1939",
        status: "Laboratory destroyed — research scattered"
      },
      {
        id: "si-wilhelm-reich",
        title: "Wilhelm Reich's Orgone Energy & Cloudbuster",
        content: "Wilhelm Reich, a former student of Sigmund Freud, discovered what he termed 'orgone energy' — a universal life force measurable through specially designed instruments. His orgone accumulator showed measurable temperature differentials that couldn't be explained by conventional thermodynamics. His cloudbuster device demonstrated weather modification capabilities witnessed by multiple observers. In 1954, the FDA obtained an injunction against Reich. When he continued research, he was jailed for contempt of court. The FDA ordered the destruction of all orgone accumulators and the burning of his books and research papers — one of the most significant acts of scientific censorship in American history. Reich died in Lewisburg Federal Penitentiary in 1957.",
        source: "Wilhelm Reich Museum / FDA Case Files / National Archives",
        classification: "SUPPRESSED",
        relevanceScore: 92,
        tags: ["orgone", "reich", "life-force", "fda-censorship"],
        year: "1930-1957",
        status: "Books burned by FDA order — researcher imprisoned"
      },
      {
        id: "si-schauberger",
        title: "Viktor Schauberger's Implosion Technology",
        content: "Austrian forester and naturalist Viktor Schauberger developed implosion-based technologies that worked with nature's vortex principles rather than against them. His 'Repulsine' device allegedly achieved anti-gravity effects using centripetal vortex motion. Schauberger was forced by the Nazi regime to work on advanced propulsion systems at Mauthausen concentration camp. After WWII, he was brought to the United States under suspicious circumstances in 1958, where he was allegedly coerced into signing over all his patents and research to a consortium. He returned to Austria and died five days later, reportedly saying 'They took everything from me.' His water vortex research demonstrated that water moving in spiral patterns generates anomalous energy and maintains higher vitality than linearly flowing water.",
        source: "Schauberger Family Archives / PKS Research Institute",
        classification: "SUPPRESSED",
        relevanceScore: 90,
        tags: ["schauberger", "implosion", "vortex", "anti-gravity"],
        year: "1920-1958",
        status: "Patents seized — researcher died under suspicious circumstances"
      },
      {
        id: "si-cold-fusion",
        title: "Cold Fusion (Fleischmann-Pons Effect)",
        content: "In March 1989, electrochemists Martin Fleischmann and Stanley Pons announced they had achieved nuclear fusion at room temperature using palladium electrodes in heavy water. The announcement was met with immediate ridicule from the hot fusion establishment, which had invested billions in tokamak reactors. Despite initial replication failures, over 200 peer-reviewed papers have since confirmed anomalous excess heat in palladium-deuterium systems. The US Navy's SPAWAR laboratory confirmed nuclear reactions in Pd/D co-deposition experiments. The field was renamed LENR (Low Energy Nuclear Reactions) and continues in Japan's NEDO program, Italy's ENEA, and multiple private labs. The DOE rejected two proposals for formal investigation (1989, 2004) despite growing evidence.",
        source: "SPAWAR Technical Reports / ICCF Proceedings / ENEA",
        classification: "SUPPRESSED",
        relevanceScore: 88,
        tags: ["cold-fusion", "lenr", "fleischmann-pons", "nuclear"],
        year: "1989-present",
        status: "Actively suppressed by mainstream physics — research continues underground"
      },
      {
        id: "si-anti-gravity",
        title: "Anti-Gravity Research Programs",
        content: "Multiple anti-gravity research programs have operated within classified military and aerospace programs. The Podkletnov experiments at Tampere University of Technology (1992) demonstrated a 2% weight reduction above a spinning superconducting disc. Boeing's Project GRASP (Gravity Research for Advanced Space Propulsion) investigated gravity shielding. Ning Li at University of Alabama proposed AC gravity effects using rotating superconductors — her DoD-funded research suddenly went dark in 2002. Thomas Townsend Brown demonstrated electrogravitics effects in the 1950s, and the military classified his work. Aerospace companies Martin, Convair, and Bell conducted classified gravity research under Project Winterhaven. Aviation Studies International published 'Electrogravitics Systems' (1956) documenting corporate anti-gravity programs before classification.",
        source: "Aviation Studies International / Tampere University / Boeing Archives",
        classification: "CLASSIFIED",
        relevanceScore: 85,
        tags: ["anti-gravity", "electrogravitics", "podkletnov", "brown"],
        year: "1950s-present",
        status: "Multiple programs classified — researchers silenced"
      }
    ]
  },
  {
    id: "black-budget-experiments",
    name: "Black Budget Experiments",
    description: "Covert government programs funded through unacknowledged special access programs (USAPs), operating outside Congressional oversight with annual budgets exceeding $80 billion.",
    icon: "Shield",
    color: "red",
    entries: [
      {
        id: "bb-mkultra",
        title: "MKULTRA Sub-Programs (1953-1973)",
        content: "CIA's MKULTRA comprised 149 sub-projects across 80+ institutions including universities, hospitals, and prisons. Sub-project 68 (Dr. Donald Ewen Cameron at McGill University) used 'psychic driving' — forcing subjects to listen to repeated messages for weeks while under drug-induced comas and electroshock. Sub-project 119 studied bioelectric signals for remote activation of organisms. Sub-project 142 tested LSD on unwitting subjects in Operation Midnight Climax, using CIA-run brothels in San Francisco and New York. MKSEARCH continued after MKULTRA was officially terminated. Director Richard Helms ordered all files destroyed in 1973, but 20,000 pages survived in financial records discovered in 1977. The Church Committee and subsequent investigations revealed only a fraction of the full program.",
        source: "CIA FOIA / Church Committee Records / National Security Archive",
        classification: "DECLASSIFIED",
        relevanceScore: 97,
        tags: ["mkultra", "cia", "mind-control", "lsd"],
        year: "1953-1973",
        status: "Partially declassified — most files destroyed"
      },
      {
        id: "bb-montauk",
        title: "The Montauk Project",
        content: "Alleged continuation of the Philadelphia Experiment conducted at Montauk Air Force Station (Camp Hero) on Long Island, NY. Whistleblowers Preston Nichols, Al Bielek, and Stewart Swerdlow claim the project involved time manipulation technology, psychic amplification using a modified SAGE radar antenna, interdimensional portals, and mind control experiments on young subjects. The Montauk Chair allegedly amplified psychic abilities to create tangible thoughtforms. While officially dismissed, the base was abruptly closed in 1981 and the underground facilities were sealed with concrete. The area was turned into a state park, but underground structures remain inaccessible. Multiple witnesses have reported anomalous electromagnetic phenomena in the area.",
        source: "Montauk Survivors / Camp Hero State Park Records",
        classification: "UNACKNOWLEDGED",
        relevanceScore: 82,
        tags: ["montauk", "time-travel", "psychic", "philadelphia-experiment"],
        year: "1971-1983",
        status: "Base sealed — officially denied"
      },
      {
        id: "bb-philadelphia",
        title: "The Philadelphia Experiment (Project Rainbow)",
        content: "In October 1943, the USS Eldridge (DE-173) was allegedly rendered invisible at the Philadelphia Naval Shipyard using high-powered electromagnetic generators based on Einstein's Unified Field Theory work. Witnesses reported the ship became translucent, then vanished entirely, reappearing briefly at Norfolk Naval Yard 200 miles away before returning to Philadelphia. Crew members reportedly suffered horrific side effects — some were fused with the ship's structure, others went insane, and several vanished permanently. Carlos Allende's letters to Morris Jessup (annotated by ONI officers) provided early documentation. The Navy denies the experiment occurred, though the ship's deck logs for the relevant dates remain classified.",
        source: "Office of Naval Research / Allende Letters / Naval Historical Center",
        classification: "DENIED",
        relevanceScore: 80,
        tags: ["philadelphia-experiment", "invisibility", "navy", "unified-field"],
        year: "1943",
        status: "Officially denied — deck logs remain classified"
      },
      {
        id: "bb-stargate",
        title: "Project Stargate / Remote Viewing (1972-1995)",
        content: "The US military and intelligence community operated a 23-year remote viewing program under various code names: SCANATE, GONDOLA WISH, GRILL FLAME, CENTER LANE, SUN STREAK, and finally STAR GATE. Based at Fort Meade, Maryland and Stanford Research Institute (SRI), the program trained psychic spies to gather intelligence through extrasensory perception. Notable successes include Ingo Swann accurately describing Jupiter's rings before Voyager confirmed them, Joe McMoneagle locating a downed Soviet bomber, and Pat Price accurately describing Soviet military installations. The AIR evaluation (1995) concluded remote viewing produced statistically significant results but recommended termination. The full operational history remains partially classified.",
        source: "CIA STAR GATE Archive / SRI International / DIA Records",
        classification: "DECLASSIFIED",
        relevanceScore: 93,
        tags: ["stargate", "remote-viewing", "psychic", "sri"],
        year: "1972-1995",
        status: "Declassified 1995 — operational files partially released"
      },
      {
        id: "bb-mockingbird",
        title: "Operation Mockingbird",
        content: "CIA program initiated in the early 1950s to influence domestic and foreign media. Under Frank Wisner and later Cord Meyer, the CIA recruited journalists at major publications including The Washington Post, Time Magazine, Newsweek, CBS, and The New York Times. At its peak, the agency had influence over 25 newspapers and wire agencies. Philip Graham (Washington Post publisher) was a key asset. Carl Bernstein's 1977 Rolling Stone exposé revealed that over 400 American journalists had secretly carried out assignments for the CIA over the previous 25 years. The Church Committee confirmed the program's existence but the full scope remains unclear. CIA Director William Casey allegedly stated in 1981: 'We'll know our disinformation program is complete when everything the American public believes is false.'",
        source: "Church Committee Records / Rolling Stone Archive / CIA FOIA",
        classification: "DECLASSIFIED",
        relevanceScore: 96,
        tags: ["mockingbird", "cia", "media", "propaganda"],
        year: "1950s-present",
        status: "Partially declassified — believed to continue in modified form"
      },
      {
        id: "bb-cointelpro",
        title: "COINTELPRO (Counter Intelligence Program)",
        content: "FBI program (1956-1971) directed against domestic political organizations deemed 'subversive.' Under J. Edgar Hoover, COINTELPRO targeted civil rights leaders (MLK Jr. received an anonymous letter encouraging suicide), Black Panther Party (Fred Hampton assassinated in coordinated FBI-police raid), anti-war movements, socialist organizations, and the American Indian Movement. Tactics included infiltration, psychological warfare, harassment through the legal system, extralegal force, and assassinations. The program created internal dissent through fabricated letters and forged documents. The Citizens' Commission to Investigate the FBI burgled the Media, PA FBI office in 1971, exposing the program. The subsequent Church Committee investigation revealed systematic constitutional violations by intelligence agencies.",
        source: "FBI COINTELPRO Files / Church Committee / National Archives",
        classification: "DECLASSIFIED",
        relevanceScore: 95,
        tags: ["cointelpro", "fbi", "surveillance", "civil-rights"],
        year: "1956-1971",
        status: "Declassified — successor programs suspected"
      }
    ]
  },
  {
    id: "secret-society-deep",
    name: "Secret Society Deep Archives",
    description: "Comprehensive intelligence on secret societies, fraternal orders, and shadow organizations that have shaped world events from behind closed doors for centuries.",
    icon: "Eye",
    color: "amber",
    entries: [
      {
        id: "ss-skull-bones",
        title: "Skull & Bones (Order 322)",
        content: "Founded in 1832 at Yale University by William Huntington Russell and Alphonso Taft (father of President Taft). The Order selects 15 new members ('tapped') each year from Yale's junior class. Members are known as 'Bonesmen' and meet in a building called 'The Tomb.' Notable members include Presidents George H.W. Bush and George W. Bush, Secretary of State John Kerry, multiple CIA directors, and leaders of major financial institutions. The '322' reportedly refers to 322 BC, the year of Demosthenes' death and the founding of a Greek precursor society. Members allegedly swear oaths of secrecy that supersede all other loyalties. The society's influence on American foreign policy, intelligence, and finance has been documented by historians Antony Sutton and Kris Millegan.",
        source: "Yale University Archives / Antony Sutton Research / Alexandra Robbins",
        classification: "SECRET SOCIETY",
        relevanceScore: 94,
        tags: ["skull-bones", "yale", "322", "elite"],
        year: "1832-present",
        status: "Active — membership continues"
      },
      {
        id: "ss-bohemian-grove",
        title: "Bohemian Grove",
        content: "A 2,700-acre campground in Monte Rio, California owned by the Bohemian Club of San Francisco (founded 1872). Every July, approximately 2,500 of the world's most powerful men gather for a two-week encampment. The event opens with the 'Cremation of Care' ceremony — a ritual involving a 40-foot stone owl (representing Moloch or Minerva) where a human effigy is burned in a mock sacrifice. Attendees have included every Republican president since Coolidge, major CEOs, military leaders, and media moguls. The Manhattan Project was reportedly conceived at the Grove in 1942. Alex Jones infiltrated the camp in 2000 and filmed the Cremation of Care ceremony. Journalist Philip Weiss published an account in Spy Magazine (1989) documenting the rituals and power networking.",
        source: "Bohemian Club Records / Spy Magazine / Alex Jones Documentary",
        classification: "SECRET SOCIETY",
        relevanceScore: 91,
        tags: ["bohemian-grove", "cremation-of-care", "elite", "ritual"],
        year: "1872-present",
        status: "Active — annual gatherings continue"
      },
      {
        id: "ss-club-rome",
        title: "Club of Rome",
        content: "Founded in 1968 by Italian industrialist Aurelio Peccei and Scottish scientist Alexander King. The club's 1972 report 'The Limits to Growth' used MIT computer models to predict resource depletion and advocated for population control and managed decline of industrial civilization. Members have included heads of state, UN officials, and major industrialists. Critics argue the Club promotes a neo-Malthusian agenda that serves elite interests by limiting development in the Global South. Their 1991 publication 'The First Global Revolution' stated: 'In searching for a common enemy against whom we can unite, we came up with the idea that pollution, the threat of global warming, water shortages, famine and the like would fit the bill.' This quote has been used to argue the Club manufactures crises for social control.",
        source: "Club of Rome Publications / MIT Systems Dynamics Group",
        classification: "SECRET SOCIETY",
        relevanceScore: 89,
        tags: ["club-of-rome", "limits-to-growth", "population-control"],
        year: "1968-present",
        status: "Active — publishes reports and policy recommendations"
      },
      {
        id: "ss-bilderberg",
        title: "Bilderberg Group",
        content: "Annual private conference of approximately 120-150 political leaders, experts from industry, finance, media, and academia from Europe and North America. Founded in 1954 at the Hotel de Bilderberg in Oosterbeek, Netherlands by Prince Bernhard, with funding from the CIA and Rockefeller Foundation. No official minutes are released. The Chatham House Rule applies — participants can use information but cannot attribute statements. Critics note that policy positions discussed at Bilderberg often become government policy within 1-2 years. Former attendees who subsequently became heads of state include Bill Clinton, Tony Blair, Angela Merkel, and Emmanuel Macron. The group's steering committee has been chaired by figures connected to Royal Dutch Shell, Goldman Sachs, and NATO.",
        source: "Bilderberg Meeting Archives / Investigative Journalism Records",
        classification: "SECRET SOCIETY",
        relevanceScore: 93,
        tags: ["bilderberg", "elite", "policy", "globalist"],
        year: "1954-present",
        status: "Active — annual meetings continue under media blackout"
      },
      {
        id: "ss-trilateral",
        title: "Trilateral Commission",
        content: "Founded in 1973 by David Rockefeller and Zbigniew Brzezinski to foster cooperation between North America, Europe, and Japan. Brzezinski's 1970 book 'Between Two Ages' outlined the vision for a technetronic era of global governance. The Commission publishes 'Triangle Papers' on policy recommendations. Critics note that Commission members have occupied key positions in every US administration since Carter — Brzezinski was Carter's National Security Advisor, and multiple Trilateral members served in the Clinton, Bush, and Obama administrations. The Commission has been accused of promoting a 'New International Economic Order' that consolidates economic power among its member nations while managing developing nations' growth.",
        source: "Trilateral Commission Publications / Rockefeller Archives",
        classification: "SECRET SOCIETY",
        relevanceScore: 88,
        tags: ["trilateral", "rockefeller", "brzezinski", "globalist"],
        year: "1973-present",
        status: "Active — publishes policy papers"
      },
      {
        id: "ss-knights-templar",
        title: "Knights Templar",
        content: "The Poor Fellow-Soldiers of Christ and of the Temple of Solomon were founded c.1119 during the Crusades. They became the most powerful military order in Christendom and effectively invented international banking — pilgrims could deposit funds in Europe and withdraw in the Holy Land using encrypted letters of credit. At their peak, the Templars owned over 9,000 properties across Europe and the Middle East. On Friday, October 13, 1307, King Philip IV of France ordered the simultaneous arrest of all Templars — the origin of Friday the 13th superstition. Grand Master Jacques de Molay was burned at the stake in 1314, allegedly cursing both the Pope and King (both died within a year). The Templar fleet vanished from La Rochelle the night before the arrests. Theories connect surviving Templars to Freemasonry, the Swiss banking system, and the discovery of the Americas.",
        source: "Vatican Archives / Chinon Parchment / Templar Rule (Latin)",
        classification: "HISTORICAL",
        relevanceScore: 92,
        tags: ["templar", "crusades", "banking", "friday-13th"],
        year: "1119-1312",
        status: "Officially dissolved — successor organizations continue"
      },
      {
        id: "ss-rosicrucians",
        title: "Rosicrucian Order",
        content: "The Rosicrucian manifestos — Fama Fraternitatis (1614), Confessio Fraternitatis (1615), and Chemical Wedding of Christian Rosenkreutz (1616) — announced the existence of a secret brotherhood of alchemists and sages founded by 'Father C.R.C.' in the 14th century. The manifestos promised a universal reformation of knowledge combining Hermetic wisdom, Kabbalah, alchemy, and Christianity. Scholars debate whether the order existed before the manifestos or was created by them. Francis Bacon, John Dee, and Robert Fludd have been connected to the movement. The Rosicrucian influence on Freemasonry, particularly the 18th-degree 'Knight Rose Croix,' is well-documented. Modern Rosicrucian orders (AMORC, SRIA, Golden Dawn) claim descent from the original brotherhood.",
        source: "Rosicrucian Manifestos / Frances Yates Research / AMORC Archives",
        classification: "SECRET SOCIETY",
        relevanceScore: 86,
        tags: ["rosicrucian", "alchemy", "hermetic", "manifestos"],
        year: "1614-present",
        status: "Multiple successor organizations active"
      },
      {
        id: "ss-thule",
        title: "Thule Society (Thule-Gesellschaft)",
        content: "Founded in Munich in 1918 by Rudolf von Sebottendorf as the public front of the Germanenorden. The society combined German nationalism, occultism, and Aryan racial theory. Members included Rudolf Hess, Alfred Rosenberg, and Dietrich Eckart — Hitler's early mentor. The Thule Society's newspaper, Münchener Beobachter, became the Nazi Party's Völkischer Beobachter. The society promoted the idea of a lost Aryan homeland in the Arctic (Hyperborea/Thule) and sought to recover ancient Aryan wisdom. The Vril Society, an alleged inner circle, supposedly developed advanced propulsion technologies based on 'vril' energy described in Edward Bulwer-Lytton's 1871 novel 'The Coming Race.' The Nazi regime's obsession with occult artifacts (Spear of Destiny, Holy Grail) stemmed partly from Thule ideology.",
        source: "German Federal Archives / Sebottendorf Papers / Historical Research",
        classification: "HISTORICAL",
        relevanceScore: 87,
        tags: ["thule", "nazi", "occult", "vril"],
        year: "1918-1945",
        status: "Dissolved — ideology persists in neo-occult groups"
      },
      {
        id: "ss-golden-dawn",
        title: "Hermetic Order of the Golden Dawn",
        content: "Founded in London in 1888 by William Wynn Westcott, Samuel Liddell MacGregor Mathers, and William Robert Woodman. The Order synthesized Kabbalah, astrology, tarot, geomancy, alchemy, and Enochian magic into a graduated system of initiation. The 'Cipher Manuscripts' — allegedly discovered in a London bookstall — provided the framework for the Order's rituals. Notable members included W.B. Yeats, Aleister Crowley, Arthur Machen, Bram Stoker, and Florence Farr. The Order's influence on Western esotericism is unparalleled — virtually every modern magical tradition derives from Golden Dawn teachings. Internal conflicts (particularly between Mathers and Crowley) led to schisms, producing successor orders including the A∴A∴, Stella Matutina, and the modern Golden Dawn revival.",
        source: "Golden Dawn Papers / Regardie Collection / Yeats Archives",
        classification: "SECRET SOCIETY",
        relevanceScore: 88,
        tags: ["golden-dawn", "kabbalah", "magic", "western-esotericism"],
        year: "1888-present",
        status: "Original dissolved — multiple successor orders active"
      }
    ]
  },
  {
    id: "vatican-vault",
    name: "Vatican Vault",
    description: "Suppressed knowledge, secret archives, and hidden operations of the Vatican — the world's oldest and most powerful institution with 2,000 years of accumulated secrets.",
    icon: "BookOpen",
    color: "violet",
    entries: [
      {
        id: "vv-suppressed-gospels",
        title: "Suppressed Gospels & Gnostic Texts",
        content: "The Nag Hammadi library, discovered in Egypt in 1945, contained 52 texts including the Gospel of Thomas, Gospel of Philip, Gospel of Truth, and the Apocryphon of John — all excluded from the biblical canon at the Council of Nicaea (325 AD) and subsequent councils. The Gospel of Thomas presents Jesus as a wisdom teacher rather than a divine savior, potentially undermining ecclesiastical authority. The Gospel of Mary Magdalene portrays her as Jesus' most trusted disciple, challenging patriarchal church hierarchy. The Pistis Sophia describes advanced cosmological teachings including multiple heavens and aeons. The Dead Sea Scrolls (1947) revealed further texts suppressed by institutional religion, including the War Scroll and the Community Rule. The Vatican resisted releasing the full Dead Sea Scrolls corpus for over 40 years.",
        source: "Nag Hammadi Library / Dead Sea Scrolls Digital Library / Vatican Secret Archives",
        classification: "SUPPRESSED",
        relevanceScore: 96,
        tags: ["gnostic", "nag-hammadi", "dead-sea-scrolls", "suppressed-gospels"],
        year: "1st-4th century AD",
        status: "Texts recovered — Vatican maintains restricted access to originals"
      },
      {
        id: "vv-vatican-bank",
        title: "Vatican Bank (IOR) Operations",
        content: "The Institute for the Works of Religion (Istituto per le Opere di Religione) was founded in 1942 and has been implicated in numerous financial scandals. The Banco Ambrosiano collapse (1982) resulted in the suspicious death of chairman Roberto Calvi (found hanged under Blackfriars Bridge in London — masonic symbolism). Archbishop Paul Marcinkus, head of the IOR, was indicted but protected by Vatican immunity. The IOR allegedly laundered money for the Sicilian Mafia, facilitated CIA funding of anti-communist operations in Poland and Latin America, and channeled funds through shell companies in Panama, Luxembourg, and the Bahamas. Whistleblowers have alleged the IOR holds $8+ billion in assets with minimal oversight. Pope Francis initiated reforms in 2013, but structural opacity persists.",
        source: "Italian Court Records / Calvi Inquiry / Moneyval Reports",
        classification: "DECLASSIFIED",
        relevanceScore: 93,
        tags: ["vatican-bank", "ior", "calvi", "money-laundering"],
        year: "1942-present",
        status: "Under reform — historical crimes unresolved"
      },
      {
        id: "vv-fatima",
        title: "The Three Secrets of Fátima",
        content: "Three secrets reportedly communicated by an apparition of the Virgin Mary to three shepherd children in Fátima, Portugal in 1917. The first two secrets (a vision of hell and the rise/fall of Soviet communism) were revealed in 1941. The Third Secret was sealed with instructions to be opened in 1960 but was not released until 2000. Vatican Secretary of State Cardinal Bertone's released version describes a vision of a 'bishop in white' being shot — interpreted as the 1981 assassination attempt on John Paul II. However, multiple Vatican insiders (including Cardinal Ottaviani, Father Malachi Martin, and Bishop Hnilica) indicated the unreleased portion contains prophecies about apostasy within the Church, a failed papacy, and catastrophic events. Father Malachi Martin, who read the Third Secret, stated on Art Bell's radio program that it involves events 'far worse' than what was released.",
        source: "Congregation for the Doctrine of the Faith / Fátima Shrine Archives",
        classification: "PARTIALLY RELEASED",
        relevanceScore: 90,
        tags: ["fatima", "third-secret", "prophecy", "marian-apparition"],
        year: "1917",
        status: "Officially released 2000 — completeness disputed"
      },
      {
        id: "vv-chronovisor",
        title: "The Chronovisor",
        content: "Father François Brune's book 'Le Nouveau Mystère du Vatican' (2002) documented Father Pellegrino Ernetti's claim that he co-invented a device called the Chronovisor with Nobel laureate Enrico Fermi and Wernher von Braun. The device allegedly could tune into past events like a television receiving old broadcasts — based on the theory that all events leave energy traces that can be detected. Ernetti claimed to have witnessed the crucifixion of Christ and a performance of Thyestes by Quintus Ennius in 169 BC. He produced a photograph allegedly taken through the Chronovisor showing Christ on the cross, though skeptics identified it as a carved crucifix from Perugia. Before his death in 1994, Ernetti neither confirmed nor denied the device's existence, and the Vatican reportedly classified all related documentation.",
        source: "Father Brune Research / Ernetti Papers / Vatican Archives",
        classification: "UNVERIFIED",
        relevanceScore: 78,
        tags: ["chronovisor", "time-viewing", "ernetti", "fermi"],
        year: "1950s-1994",
        status: "Vatican classified — inventor deceased"
      },
      {
        id: "vv-et-treaties",
        title: "Vatican-ET Contact Protocols",
        content: "The Vatican Observatory (Specola Vaticana) operates the VATT (Vatican Advanced Technology Telescope) on Mt. Graham, Arizona. In 2008, Father José Gabriel Funes, director of the Vatican Observatory, stated in L'Osservatore Romano that belief in extraterrestrial life does not contradict faith in God. In 2010, Guy Consolmagno (later director) stated the Vatican would baptize an alien 'if they asked.' Monsignor Corrado Balducci, a Vatican theologian and insider, appeared on Italian television multiple times (1995-2005) stating that extraterrestrial contact is real, not demonic, and that the Vatican has knowledge of ongoing contact. The Vatican's LUCIFER instrument (Large Binocular Telescope Near-infrared Utility with Camera and Integral Field Unit for Extragalactic Research) on Mt. Graham has generated speculation about what the Vatican is searching for in deep space.",
        source: "Vatican Observatory / L'Osservatore Romano / Balducci Television Interviews",
        classification: "PARTIALLY DISCLOSED",
        relevanceScore: 85,
        tags: ["vatican", "extraterrestrial", "vatt", "observatory"],
        year: "1891-present",
        status: "Partial disclosure — full knowledge withheld"
      },
      {
        id: "vv-alexandria",
        title: "Library of Alexandria Connection",
        content: "The Great Library of Alexandria, established c.283 BC, contained an estimated 400,000-700,000 scrolls representing the accumulated knowledge of the ancient world. Multiple destructions occurred: Julius Caesar's fire (48 BC), Christian persecution under Theophilus (391 AD), and the final destruction attributed to the Muslim conquest (642 AD). Historians have long suspected that significant portions of the collection were relocated before each destruction. The Vatican Library (founded 1451) contains approximately 75,000 codices and 1.1 million printed books, including texts of unknown provenance. Scholars have noted that certain Vatican holdings include documents with annotations in multiple ancient languages suggesting they were copied from much older sources. The Vatican's restricted archives ('Archivum Secretum') contain 52 miles of shelving with documents spanning 12 centuries — the vast majority have never been examined by outside researchers.",
        source: "Vatican Library Catalogues / UNESCO Heritage Records / Classical Sources",
        classification: "HISTORICAL",
        relevanceScore: 91,
        tags: ["alexandria", "library", "vatican-archives", "ancient-knowledge"],
        year: "283 BC - present",
        status: "52 miles of secret archives — access severely restricted"
      }
    ]
  }
];

export function getArchiveCategories(): ArchiveCategory[] {
  return ARCHIVE_CATEGORIES;
}

export function getArchiveCategory(id: string): ArchiveCategory | undefined {
  return ARCHIVE_CATEGORIES.find(c => c.id === id);
}

export function searchArchives(query: string): ArchiveEntry[] {
  const q = query.toLowerCase();
  const results: ArchiveEntry[] = [];
  for (const cat of ARCHIVE_CATEGORIES) {
    for (const entry of cat.entries) {
      if (
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.tags.some(t => t.includes(q))
      ) {
        results.push(entry);
      }
    }
  }
  return results;
}
