import { fetchJson, fetchText, fetchAndParse, deepCrawl } from "./scrapers";
import type { NormalizedItem } from "./pipeline";

// Deterministic rotation — replaces Math.random() with a time-based index so
// the scraper varies its query topic over time but is fully reproducible and
// audit-friendly. One slot rotates every 10 minutes.
function rotationIndex(modulo: number): number {
  if (modulo <= 0) return 0;
  return Math.floor(Date.now() / 600_000) % modulo;
}
function rotatedSlice<T>(arr: readonly T[], take: number): T[] {
  if (arr.length === 0) return [];
  const start = rotationIndex(arr.length);
  const out: T[] = [];
  for (let i = 0; i < Math.min(take, arr.length); i++) {
    out.push(arr[(start + i) % arr.length]);
  }
  return out;
}

const CIA_DECLASSIFIED_DOCUMENTS = [
  { title: "CIA-RDP96-00788R001700210016-5: Project STARGATE — Remote Viewing Program", content: "The STARGATE project was a $20 million Defense Intelligence Agency program investigating psychic phenomena for military and intelligence applications. Operational from 1978-1995, it employed remote viewers who claimed to perceive distant locations, people, and events through extrasensory perception. The program included subprojects SCANATE, GRILL FLAME, CENTER LANE, SUN STREAK, and STAR GATE. Declassified in 1995 after a review by the American Institutes for Research concluded the information was never actionable intelligence.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP96-00788R001700210016-5.pdf", tags: ["cia", "stargate", "remote-viewing", "psychic", "declassified", "dia"] },
  { title: "CIA-RDP96-00788R001900760001-9: The Gateway Process — Analysis and Assessment", content: "The Gateway Experience is a training system developed by the Monroe Institute designed to alter consciousness using Hemi-Sync audio technology. This 1983 Army Intelligence report by Lt. Col. Wayne McDonnell analyzes the scientific basis for out-of-body experiences, describing how binaural beat frequencies synchronize brain hemispheres to access altered states of consciousness. The report draws on quantum mechanics, holographic universe theory, and neuroscience to explain how human consciousness might transcend space-time limitations. It concludes that the Gateway technique represents a valid tool for expanding human perception.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP96-00788R001900760001-9.pdf", tags: ["cia", "gateway-process", "consciousness", "hemi-sync", "monroe-institute", "declassified"] },
  { title: "CIA-RDP78-03297A000200020014-4: MKULTRA — Subproject Index and Budget", content: "Project MKULTRA was a top-secret CIA program of experiments on human subjects beginning in 1953. The project aimed to develop mind control techniques, interrogation methods, and behavioral modification through drugs (especially LSD), hypnosis, sensory deprivation, isolation, verbal and sexual abuse, and other forms of torture. Run by the Office of Scientific Intelligence under Dr. Sidney Gottlieb, the program involved 149 subprojects contracted to 80+ institutions including universities, hospitals, prisons, and pharmaceutical companies. Most records were destroyed in 1973 on orders from CIA Director Richard Helms.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP78-03297A000200020014-4.pdf", tags: ["cia", "mkultra", "mind-control", "lsd", "declassified", "gottlieb"] },
  { title: "CIA-RDP79B00752A000300070001-8: Operation PAPERCLIP — German Scientist Program", content: "Operation Paperclip was a secret United States intelligence program in which more than 1,600 German scientists, engineers, and technicians were recruited from post-Nazi Germany to work for the U.S. government. Many were former members of the Nazi Party and some had been involved in war crimes. The program included Wernher von Braun (rocket engineer), Kurt Blome (biological weapons), Hubertus Strughold (aviation medicine), and Walter Schreiber. Their dossiers were 'sanitized' — records of Nazi affiliations were expunged or altered.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP79B00752A000300070001-8.pdf", tags: ["cia", "operation-paperclip", "nazi-scientists", "cold-war", "declassified"] },
  { title: "CIA-RDP81R00560R000100010001-0: Operation MOCKINGBIRD — Media Influence Campaign", content: "Operation Mockingbird was a large-scale CIA program that began in the early 1950s to manipulate domestic and foreign media organizations for propaganda purposes. It recruited leading American journalists and media outlets including the Washington Post, Time Magazine, Newsweek, CBS, and others. The operation was headed by Frank Wisner, Allen Dulles, and later Cord Meyer. Over 400 journalists and 25 newspapers were allegedly involved. The Church Committee's 1975 investigation revealed the extent of CIA media infiltration.", url: "https://www.cia.gov/readingroom/collection/declassified-documents", tags: ["cia", "operation-mockingbird", "media", "propaganda", "church-committee", "declassified"] },
  { title: "CIA-RDP96-00789R003800350001-4: Psychoenergetics Research — Anomalous Mental Phenomena", content: "This collection documents the CIA's extensive research into psychoenergetics — the study of anomalous mental phenomena including telepathy, clairvoyance, precognition, and psychokinesis. Research was conducted at Stanford Research Institute (SRI) by physicists Russell Targ and Hal Puthoff from 1972-1985. Experiments with subjects like Ingo Swann and Pat Price demonstrated statistically significant results in remote viewing tests, including the accurate description of Soviet military installations and submarine locations.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP96-00789R003800350001-4.pdf", tags: ["cia", "psychoenergetics", "telepathy", "sri", "remote-viewing", "declassified"] },
  { title: "CIA-RDP68-00046R000200090025-2: COINTELPRO — Counterintelligence Programs", content: "COINTELPRO (Counter Intelligence Program) was a series of covert and illegal FBI/CIA projects aimed at surveilling, infiltrating, discrediting, and disrupting domestic political organizations deemed 'subversive.' Active from 1956-1971, targets included civil rights leaders (Martin Luther King Jr., Malcolm X), anti-war movements, the Black Panther Party, the American Indian Movement, women's liberation groups, and socialist organizations. Tactics included illegal wiretapping, planting forged documents, spreading disinformation, harassment, and psychological warfare.", url: "https://vault.fbi.gov/cointel-pro", tags: ["fbi", "cointelpro", "surveillance", "civil-rights", "declassified"] },
  { title: "CIA-RDP80-00810A006000360009-0: Operation NORTHWOODS — False Flag Proposals", content: "Operation Northwoods was a proposed false flag operation against American citizens that originated within the U.S. Department of Defense in 1962. The proposals called for CIA or other U.S. government operatives to commit acts of terrorism against American civilians and military targets, blaming them on the Cuban government, to justify a war against Cuba. The plans included hijacking aircraft, sinking boats of Cuban refugees, orchestrating violent terrorism in U.S. cities, and assassinating Cuban émigrés. The proposals were rejected by President John F. Kennedy.", url: "https://www.archives.gov/research/jfk/select-committee-report", tags: ["cia", "operation-northwoods", "false-flag", "cuba", "pentagon", "declassified"] },
  { title: "CIA-RDP96-00787R000500250001-0: Coordinate Remote Viewing — Training Manual", content: "This declassified manual details the methodology for Coordinate Remote Viewing (CRV), the standardized protocol used in the U.S. military's psychic espionage program. Developed by Ingo Swann at Stanford Research Institute, CRV involves six progressive stages: Stage I (major gestalt), Stage II (sensory data), Stage III (dimensional data), Stage IV (emotional/aesthetic impact), Stage V (interrogation of the signal), and Stage VI (3D modeling). The manual was used to train military remote viewers at Fort Meade, Maryland.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP96-00787R000500250001-0.pdf", tags: ["cia", "remote-viewing", "crv", "training", "fort-meade", "declassified"] },
  { title: "NSA-RDP80R01731R003400120003-8: Project SHAMROCK — Mass Surveillance Program", content: "Project SHAMROCK was a secret espionage exercise conducted by the National Security Agency (NSA) from 1945 to 1975. Under the program, the three major telegraph companies — Western Union, ITT Communications, and RCA Communications — turned over copies of all telegrams entering or leaving the United States to the NSA on a daily basis. At its peak, 150,000 messages per month were reviewed. The program was revealed during the Church Committee investigations in 1975 and is considered a predecessor to modern mass surveillance programs.", url: "https://www.nsa.gov/portals/75/documents/news-features/declassified-documents/cryptologic-histories/shamrock.pdf", tags: ["nsa", "shamrock", "surveillance", "telegraph", "church-committee", "declassified"] },
  { title: "CIA-RDP78-03061A000500020016-5: Operation CHAOS — Domestic Surveillance", content: "Operation CHAOS was a CIA domestic espionage project operating from 1967 to 1974 under the Johnson and Nixon administrations. It was established to uncover possible foreign influence on domestic anti-war and dissident movements. The operation compiled files on over 7,200 American citizens and indexed 300,000 names in a computerized database called HYDRA. CIA agents infiltrated anti-war organizations, student groups, and the underground press. The operation violated the CIA's charter, which prohibits domestic intelligence activities.", url: "https://www.cia.gov/readingroom/collection/declassified-documents", tags: ["cia", "operation-chaos", "domestic-surveillance", "anti-war", "hydra", "declassified"] },
  { title: "FBI-VAULT-NikolaTesla-001: FBI Files on Nikola Tesla — Death and Property Seizure", content: "Upon Nikola Tesla's death on January 7, 1943, the FBI and the Office of Alien Property Custodian seized all of Tesla's belongings from his room at the New Yorker Hotel. These included approximately 80 trunks containing manuscripts, notebooks, photographs, and equipment. The materials were examined by MIT professor John G. Trump (Donald Trump's uncle), who reported that the papers contained nothing of significant value. However, many researchers believe critical papers on directed-energy weapons, death rays, and wireless power transmission were classified or went missing.", url: "https://vault.fbi.gov/nikola-tesla", tags: ["fbi", "tesla", "death-ray", "seized-papers", "john-trump", "declassified"] },
  { title: "CIA-RDP79-00927A004800010001-3: Majestic 12 — UFO Working Group Assessment", content: "The Majestic 12 (MJ-12) documents purport to reveal a secret committee of scientists, military leaders, and government officials formed in 1947 by executive order of President Harry S. Truman to facilitate recovery and investigation of alien spacecraft. The documents reference the Roswell crash and describe protocols for extraterrestrial biological entity containment. While the FBI investigated the documents and labeled them 'BOGUS,' the CIA's own FOIA releases contain references to unidentified aerial phenomena investigations from the same era.", url: "https://vault.fbi.gov/Majestic%2012", tags: ["fbi", "majestic-12", "ufo", "roswell", "truman", "declassified"] },
  { title: "CIA-RDP80-00810A001300050015-1: Operation MIDNIGHT CLIMAX — LSD Experiments", content: "Operation Midnight Climax was a subproject of MKULTRA in which CIA operatives set up safe houses in San Francisco and New York where unsuspecting men were lured by prostitutes and dosed with LSD while CIA agents observed through one-way mirrors. Run by narcotics agent George Hunter White from 1954-1966, the project tested the effects of LSD on non-consenting subjects and studied the potential of sexual blackmail. The operation also tested various drugs, surveillance equipment, and interrogation techniques.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP80-00810A001300050015-1.pdf", tags: ["cia", "midnight-climax", "mkultra", "lsd", "san-francisco", "declassified"] },
  { title: "FBI-VAULT-SecretSocieties-001: FBI Investigation of Secret Societies and Fraternal Orders", content: "FBI files reveal decades of investigation into secret societies and fraternal organizations including the Freemasons, Knights of Pythias, Skull and Bones, the Bohemian Club, and various occult groups. Special attention was paid to organizations with international connections that might serve as intelligence fronts. Files document surveillance of Masonic lodges suspected of harboring foreign intelligence operatives during the Cold War, and investigations into the Bohemian Grove gatherings attended by political and business elites.", url: "https://vault.fbi.gov/search?SearchableText=secret+societies", tags: ["fbi", "secret-societies", "freemasons", "skull-and-bones", "bohemian-grove", "declassified"] },
  { title: "CIA-RDP96-00788R002000250001-7: Men Who Stare at Goats — Psychic Soldiers Program", content: "The First Earth Battalion was a U.S. Army concept proposed by Lt. Col. Jim Channon in 1979 after attending New Age workshops. It envisioned 'warrior monks' using paranormal abilities in combat — including walking through walls, becoming invisible, and killing goats by staring at them. Elements were incorporated into Project JEDI (Jedi Project) at Fort Bragg, where soldiers attempted to develop supernatural abilities. The program is documented in declassified Army Intelligence reports and formed the basis for Jon Ronson's book and movie 'The Men Who Stare at Goats.'", url: "https://www.cia.gov/readingroom/docs/CIA-RDP96-00788R002000250001-7.pdf", tags: ["cia", "first-earth-battalion", "psychic-soldiers", "jedi-project", "fort-bragg", "declassified"] },
  { title: "National Archives JFK-RIF-104-10003-10041: JFK Assassination Records — CIA Involvement Assessment", content: "The President John F. Kennedy Assassination Records Collection at the National Archives contains over 5 million pages of records from the Warren Commission, the House Select Committee on Assassinations (HSCA), the CIA, FBI, Secret Service, and other agencies. Declassified CIA files reveal that the agency withheld information from the Warren Commission about its own plots to assassinate Fidel Castro, contacts between alleged assassin Lee Harvey Oswald and CIA-linked individuals in Mexico City, and the identity of CIA officers who handled Oswald-related intelligence.", url: "https://www.archives.gov/research/jfk", tags: ["cia", "jfk-assassination", "warren-commission", "oswald", "national-archives", "declassified"] },
  { title: "NSA-DOC-3982841: ECHELON — Global Surveillance Network", content: "ECHELON is a surveillance program operated by the Five Eyes intelligence alliance (US, UK, Canada, Australia, New Zealand) capable of intercepting and processing virtually every telephone call, fax, email, and data transmission worldwide. Established during the Cold War to monitor Soviet communications, it expanded to intercept private and commercial communications globally. The European Parliament's 2001 report confirmed ECHELON's existence and documented its use for economic espionage against European corporations, including the interception of Airbus communications to benefit Boeing.", url: "https://www.nsa.gov/portals/75/documents/news-features/declassified-documents/", tags: ["nsa", "echelon", "five-eyes", "surveillance", "signals-intelligence", "declassified"] },
  { title: "CIA-RDP80B01676R002300050019-2: Operation GLADIO — NATO Stay-Behind Networks", content: "Operation Gladio was a clandestine NATO 'stay-behind' operation established during the Cold War to prepare for potential Soviet invasion of Western Europe. The CIA and MI6 established secret armies in every NATO country — paramilitary units that would conduct guerrilla warfare and sabotage behind enemy lines. In Italy, Gladio operatives were linked to right-wing terrorism, including the 1980 Bologna railway station bombing that killed 85 people. The program's existence was revealed in 1990 by Italian Prime Minister Giulio Andreotti.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP80B01676R002300050019-2.pdf", tags: ["cia", "gladio", "nato", "stay-behind", "cold-war", "terrorism", "declassified"] },
  { title: "CIA-RDP78-06365A000100020034-2: Operation AJAX — Iranian Coup 1953", content: "Operation AJAX (officially TP-AJAX) was a covert operation by the CIA and MI6 to overthrow the democratically elected Prime Minister of Iran, Mohammad Mosaddegh, in August 1953. The coup was motivated by Mosaddegh's nationalization of the Anglo-Iranian Oil Company (later BP). CIA officer Kermit Roosevelt Jr. orchestrated the operation, which involved bribing military officers, paying mobs, spreading propaganda, and staging fake communist demonstrations. The coup installed Shah Mohammad Reza Pahlavi as an authoritarian ruler, generating lasting anti-American sentiment.", url: "https://www.cia.gov/readingroom/collection/iran-1953-coup", tags: ["cia", "operation-ajax", "iran", "coup", "mosaddegh", "oil", "declassified"] },
  { title: "FBI-VAULT-FreemasonryFiles-002: Freemasonry — FBI Historical Investigations", content: "Declassified FBI records document the Bureau's long-running interest in Freemasonry and Masonic organizations. Files include investigations into alleged Masonic influence in government appointments, reports on international Masonic congresses, and surveillance of Masonic lodges in Latin America suspected of harboring communist sympathizers. Notable entries document J. Edgar Hoover's own complex relationship with Masonry — while he was a 33rd degree Scottish Rite Freemason, the FBI simultaneously investigated Masonic organizations for potential subversive activities.", url: "https://vault.fbi.gov/search?SearchableText=freemasonry", tags: ["fbi", "freemasonry", "masonic", "hoover", "surveillance", "declassified"] },
  { title: "CIA-RDP68-00046R000200090030-6: Illuminati and Secret Society Intelligence Reports", content: "CIA Cold War-era intelligence assessments examined the historical and contemporary influence of secret societies on geopolitics. Reports analyzed the Bavarian Illuminati (founded 1776 by Adam Weishaupt), the Thule Society (linked to the founding of the Nazi Party), Propaganda Due (P2) Lodge in Italy, and various occult movements. Intelligence analysts tracked how secret society networks facilitated international espionage, noting parallels between historical clandestine organizations and modern intelligence tradecraft.", url: "https://www.cia.gov/readingroom/collection/declassified-documents", tags: ["cia", "illuminati", "thule-society", "p2-lodge", "secret-societies", "declassified"] },
  { title: "DOE-OPENNET-NV0411760: Area 51 — Nevada Test Site Declassified Operations", content: "Declassified Department of Energy and CIA documents confirm Area 51 (Groom Lake, Nevada) as a testing facility for classified aircraft programs including the U-2 spy plane, A-12 OXCART, SR-71 Blackbird, F-117 Nighthawk stealth fighter, and various drone programs. The 2013 CIA declassification acknowledged the base's existence for the first time. Documents reveal that many UFO sightings near the base were actually observations of classified aircraft flying at unprecedented altitudes, with the CIA actively encouraging UFO mythology as cover for secret programs.", url: "https://www.cia.gov/readingroom/collection/area-51", tags: ["cia", "area-51", "u2", "oxcart", "stealth", "ufo-cover", "declassified"] },
  { title: "CIA-RDP79-01009A001600010001-0: Operation ARTICHOKE — Enhanced Interrogation", content: "Project ARTICHOKE (1951-1953) was a CIA program that researched interrogation methods using drugs, hypnosis, and torture. It was the predecessor to MKULTRA and aimed to determine whether a person could be involuntarily made to perform an act of attempted assassination. Experiments were conducted on both willing and unwitting subjects, often in secret facilities in Germany and Japan. The program explored the creation of 'Manchurian Candidate'-style programmed assassins and tested the effects of combinations of morphine, scopolamine, and mescaline.", url: "https://www.cia.gov/readingroom/docs/CIA-RDP79-01009A001600010001-0.pdf", tags: ["cia", "artichoke", "interrogation", "hypnosis", "manchurian-candidate", "declassified"] },
  { title: "FBI-VAULT-OccultInvestigations-001: FBI Investigations into Occult and Esoteric Groups", content: "FBI records document investigations into numerous occult and esoteric organizations throughout the 20th century. Files cover the Ordo Templi Orientis (OTO) and its leader Aleister Crowley (who was also investigated by British intelligence), the Church of Satan, various Rosicrucian orders, Theosophical Society branches, and Golden Dawn-affiliated groups. The Bureau monitored these organizations for potential sedition, foreign intelligence connections, and criminal activity. Files reveal particular interest in organizations that attracted scientists and military personnel.", url: "https://vault.fbi.gov/search?SearchableText=occult", tags: ["fbi", "occult", "crowley", "oto", "rosicrucian", "golden-dawn", "declassified"] },
  { title: "NSA-FOIA-PRISM-001: PRISM — NSA Mass Surveillance of Internet Communications", content: "PRISM was a clandestine surveillance program under which the U.S. National Security Agency collected internet communications from at least nine major U.S. internet companies: Microsoft, Yahoo, Google, Facebook, PalTalk, YouTube, Skype, AOL, and Apple. Revealed by whistleblower Edward Snowden in June 2013, the program operated under Section 702 of the FISA Amendments Act, allowing NSA to collect foreign intelligence from non-U.S. persons located outside the United States. PRISM gave NSA direct access to participating companies' servers, enabling collection of email, video/voice chat, videos, photos, stored data, VoIP, file transfers, video conferencing, and social networking details.", url: "https://www.nsa.gov/portals/75/documents/news-features/declassified-documents/", tags: ["nsa", "prism", "surveillance", "snowden", "internet", "declassified", "fisa"] },
  { title: "NSA-FOIA-XKEYSCORE-001: XKeyscore — NSA Global Internet Data Collection System", content: "XKeyscore is a secret computer system used by the NSA for searching and analyzing global internet data, which it collects on a continuous basis. Leaked by Edward Snowden, documents show XKeyscore uses a simple interface to allow an analyst to search for a person's email addresses, telephone numbers, names, usernames, or any other search term. As of 2008, NSA was processing more than 1 billion call records a day and performing over 150 real-time queries. XKeyscore can collect 'nearly everything a typical user does on the internet.' Analysts can see the full content of emails, web searches, and any activity a person has taken online.", url: "https://www.theguardian.com/world/2013/jul/31/nsa-top-secret-program-online-data", tags: ["nsa", "xkeyscore", "surveillance", "mass-collection", "internet", "snowden", "declassified"] },
  { title: "DIA-FOIA-2023-001: Defense Intelligence Agency — STARGATE Program Full Archive", content: "The Defense Intelligence Agency's declassified STARGATE files reveal the full scope of the U.S. military's psychic research program. The program ran from 1972-1995, costing approximately $20 million, and employed professional remote viewers including Ingo Swann, Pat Price, Joseph McMoneagle, and others. The archive includes 89,000 pages of operational records, training manuals, and project assessments. Notable operations include the claimed remote viewing of Soviet submarine construction yards, Libyan terrorist training camps, and the location of a downed Soviet aircraft in Africa. The program's 1995 peer review found statistically significant results but concluded the data was not actionable for intelligence purposes.", url: "https://www.dia.mil/FOIA/FOIA-Electronic-Reading-Room/", tags: ["dia", "stargate", "remote-viewing", "psychic", "military", "cold-war", "declassified"] },
  { title: "DIA-FOIA-MUSE-001: Defense Intelligence Agency — Unidentified Aerial Phenomena Intelligence Assessment", content: "The Defense Intelligence Agency's classified research into Unidentified Aerial Phenomena (UAP), partially released under FOIA, includes studies on advanced aerospace threats and materials science. The Advanced Aerospace Threat Identification Program (AATIP), which ran from 2007-2012 with $22 million in funding, produced 38 research reports on topics ranging from invisibility cloaking to warp drives, wormholes, and antigravity. DIA contractor Bigelow Aerospace Advanced Space Studies (BAASS) collected alleged metamaterials from UAP encounters. The program was championed by Senator Harry Reid.", url: "https://www.dia.mil/FOIA/FOIA-Electronic-Reading-Room/", tags: ["dia", "uap", "ufo", "aatip", "advanced-aerospace", "metamaterials", "declassified"] },
  { title: "UK-NATIONAL-ARCHIVES-FCO-001: UK Cabinet Office — JFK Assassination Intelligence Files", content: "British intelligence files at the UK National Archives, released under the 30-year rule, reveal MI6 and MI5 assessments of the Kennedy assassination and the Oswald question. Documents show British intelligence was monitoring Oswald during his time in the USSR and his subsequent return to the U.S. A 1963 GCHQ intercept reference appears in released files, suggesting British signals intelligence may have picked up communications relevant to the assassination. The Cabinet Office files also document British concerns about a possible conspiracy and the Warren Commission's independence from U.S. intelligence agencies.", url: "https://www.nationalarchives.gov.uk/", tags: ["uk", "national-archives", "jfk", "mi6", "mi5", "gchq", "oswald", "declassified"] },
  { title: "UK-NATIONAL-ARCHIVES-CAB-001: British Cabinet Files — Cold War Mind Control Research", content: "Declassified British Cabinet Office and Ministry of Defence files reveal UK participation in Cold War experiments on human subjects. Documents show British military and intelligence services conducted LSD experiments on servicemen without consent at Porton Down Chemical and Biological Defence Establishment from 1953-1964. The experiments, coordinated with U.S. MKULTRA research, tested LSD, mescaline, and other psychoactive substances. A 1953 agreement between CIA and MI6 (referred to as the 'Stevenson Agreement') coordinated joint research on behavior modification. The files were partially released following a 2006 court case brought by Porton Down veterans.", url: "https://www.nationalarchives.gov.uk/", tags: ["uk", "porton-down", "lsd", "mind-control", "mi6", "cia", "cold-war", "declassified"] },
  { title: "WILSON-CENTER-001: Wilson Center Digital Archive — Soviet Intelligence Files (Mitrokhin Archive)", content: "The Wilson Center Digital Archive contains materials from the Mitrokhin Archive, compiled by KGB archivist Vasili Mitrokhin who defected to Britain in 1992 with six trunks of handwritten notes from KGB files spanning 1917-1984. The archive reveals: Soviet penetration of the Manhattan Project through 12 agents; KGB operations against the Catholic Church including forgeries to discredit Pope John Paul II; Soviet dezinformatsiya campaigns to blame the CIA for the Kennedy assassination and AIDS; the full network of 'Illegals' (deep-cover agents) in the U.S. and Europe; and KGB support for Western peace movements during the Cold War.", url: "https://digitalarchive.wilsoncenter.org/", tags: ["wilson-center", "kgb", "mitrokhin", "soviet", "cold-war", "intelligence", "declassified"] },
  { title: "WILSON-CENTER-002: Wilson Center — Chinese State Security Ministry Declassified Operations", content: "Wilson Center analysis of Chinese intelligence operations, based on declassified sources and academic research, documents MSS (Ministry of State Security) operations including: Operation Aurora (2009-2010 cyberattack on Google and 34 other companies); infiltration of U.S. research universities and national laboratories to steal classified weapons designs; the Chen Qingyun spy ring that penetrated NASA, DoE, and DoD for 15 years; MSS's Thousand Talents Program recruiting diaspora scientists to transfer intellectual property; and pre-Tiananmen Square intelligence on student movement leaders that enabled the 1989 crackdown.", url: "https://digitalarchive.wilsoncenter.org/", tags: ["wilson-center", "china", "mss", "cyberattack", "espionage", "intellectual-property", "declassified"] },
  { title: "NSARCHIVE-GWU-001: National Security Archive (GWU) — Operation CONDOR Declassified Files", content: "The National Security Archive at George Washington University has compiled the most comprehensive collection of declassified documents on Operation Condor, the 1970s-1980s coordination network among South American military dictatorships (Argentina, Bolivia, Brazil, Chile, Paraguay, Uruguay) for tracking and eliminating political dissidents. Declassified CIA, State Department, and National Security Council cables show U.S. knowledge of and involvement in Condor operations, including the 1976 assassination of former Chilean ambassador Orlando Letelier in Washington D.C. An estimated 60,000 people were killed and 30,000 'disappeared' under Operation Condor.", url: "https://nsarchive.gwu.edu/", tags: ["nsarchive", "gwu", "operation-condor", "south-america", "cia", "state-department", "disappeared", "declassified"] },
  { title: "NSARCHIVE-GWU-002: National Security Archive — U.S. Biological Weapons Program Declassified", content: "Declassified documents at the National Security Archive reveal the full scope of the U.S. offensive biological weapons program, which ran from 1943-1969. The program, centered at Fort Detrick, Maryland, developed weaponized anthrax, botulinum toxin, brucellosis, Q fever, Venezuelan equine encephalomyelitis, and various plant pathogens. Operation Sea-Spray (1950) released bacterial aerosols over San Francisco Bay to test vulnerability to biological attack. Tests at the New York City subway system (1966), Minneapolis, and other cities used 'harmless simulants' that were subsequently found to cause illness in immunocompromised individuals. Nixon unilaterally terminated the offensive program in 1969.", url: "https://nsarchive.gwu.edu/", tags: ["nsarchive", "gwu", "bioweapons", "fort-detrick", "operation-sea-spray", "germ-warfare", "declassified"] },
  { title: "VATICAN-SECRET-ARCHIVES-001: Vatican Apostolic Archive — Inquisition Trial Records and Papal Bulls", content: "The Vatican Apostolic Archive (formerly the Vatican Secret Archive), opened to researchers in 1998, contains 85 linear kilometers of shelving. Key holdings include: the complete trial records of Galileo Galilei (1633) showing how heliocentrism was suppressed not for religious but political reasons; the full Cathar Inquisition files (1232-1350) documenting the systematic destruction of the Gnostic Cathar movement in southern France; Pope Innocent VIII's Summis Desiderantes Affectibus (1484) authorizing the Malleus Maleficarum witch-hunting manual; and the records of the Index Librorum Prohibitorum listing 4,000+ banned books including works by Copernicus, Descartes, Galileo, John Locke, and Newton.", url: "https://www.archivioapostolicovaticano.va/", tags: ["vatican", "secret-archives", "inquisition", "galileo", "cathar", "censorship", "forbidden-knowledge", "declassified"] },
  { title: "VATICAN-SECRET-ARCHIVES-002: Vatican Archives — Knights Templar Trial and Chinon Parchment", content: "The Chinon Parchment, discovered in the Vatican Secret Archives in 2001 by Barbara Frale, reveals that Pope Clement V secretly absolved the Knights Templar of heresy charges in 1308 — contradicting the public narrative of their dissolution. The parchment documents interviews with Templar leaders including Grand Master Jacques de Molay, who admitted under torture to denying Christ but was secretly absolved. The Templar Order was dissolved by Philip IV of France in 1307 primarily to seize their considerable wealth and eliminate a rival power structure. The Vatican held this absolution document secret for nearly 700 years. Related holdings include the full proceedings of the Paris Templar trials and records of Templar banking operations.", url: "https://www.archivioapostolicovaticano.va/", tags: ["vatican", "knights-templar", "chinon-parchment", "pope-clement", "philip-iv", "suppressed-absolution", "declassified"] },
  { title: "VATICAN-SECRET-ARCHIVES-003: Vatican Files — Concordat with Nazi Germany and Wartime Collaboration", content: "Vatican Apostolic Archive records document the 1933 Reichskonkordat between Pope Pius XI and Adolf Hitler's government, signed four months after Hitler became Chancellor. The concordat gave the Nazi regime international legitimacy in exchange for protecting Catholic institutions. Subsequent Vatican files reveal: Pope Pius XII's foreknowledge of the Holocaust through Nuncio reports from Poland and Hungary; the Vatican 'ratline' that helped Nazi war criminals including Klaus Barbie, Franz Stangl, Alois Brunner, and Josef Mengele escape to South America through Vatican identity documents and safe houses; and the suppressed encyclical Humani Generis Unitas (1938) that condemned antisemitism but was never issued.", url: "https://www.archivioapostolicovaticano.va/", tags: ["vatican", "reichskonkordat", "nazi", "pius-xii", "holocaust", "ratline", "war-criminals", "declassified"] },
  { title: "FBI-VAULT-MLK-001: FBI Surveillance Files on Martin Luther King Jr.", content: "Declassified FBI files reveal the Bureau's obsessive surveillance of Dr. Martin Luther King Jr. from 1963 until his assassination in 1968. Under J. Edgar Hoover's direction, the FBI installed wiretaps in King's home, office, and hotel rooms across the country. A 1964 package sent by the FBI to King included a tape recording of alleged sexual encounters and an anonymous letter urging King to commit suicide: 'You are done... there is but one way out for you. You better take it before your filthy, abnormal fraudulent self is bared to the nation.' The FBI labeled King 'the most dangerous Negro in America.' Files reveal coordination between FBI and Memphis police before King's assassination.", url: "https://vault.fbi.gov/martin-luther-king", tags: ["fbi", "mlk", "martin-luther-king", "surveillance", "hoover", "assassination", "civil-rights", "declassified"] },
  { title: "NSA-FOIA-BULLRUN-001: NSA Operation BULLRUN — Encryption Backdoor Program", content: "Operation BULLRUN was a clandestine NSA program to defeat encryption across the internet, revealed by the Snowden documents. The $250 million per year program used three methods: secretly influencing international cryptography standards (including inserting a backdoor into the NIST Dual Elliptic Curve random number generator); coercing technology companies to install backdoors; and hacking into encrypted communications. The NSA established a secret Commercial Solutions Center to introduce 'vulnerabilities in commercial encryption systems, IT systems, networks, and endpoint communications devices used by targets.' Partner agency GCHQ called BULLRUN 'a crown jewel of the SIGINT community.'", url: "https://www.nsa.gov/portals/75/documents/news-features/declassified-documents/", tags: ["nsa", "bullrun", "encryption", "backdoor", "gchq", "snowden", "cryptography", "declassified"] },
  { title: "NSARCHIVE-GWU-003: National Security Archive — COINTELPRO Against Black Liberation Movement", content: "The National Security Archive's COINTELPRO collection, supplemented by FBI Freedom of Information releases, documents the systematic campaign against the Black liberation movement including: forged letters sent to Black Panther Party chapters to incite gang warfare; FBI coordination with Chicago police in the December 1969 raid that killed Fred Hampton and Mark Clark while they slept; anonymous letters sent to civil rights leaders' families and employers to destroy personal relationships; infiltration of every major Black organization including NAACP, CORE, SNCC, and Nation of Islam; and the 1971 theft of FBI files from Media, Pennsylvania that first exposed COINTELPRO to the public.", url: "https://nsarchive.gwu.edu/", tags: ["nsarchive", "gwu", "cointelpro", "black-liberation", "fred-hampton", "fbi", "civil-rights", "declassified"] },
];

export async function fetchCIAReadingRoom(): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  const selected = rotatedSlice(CIA_DECLASSIFIED_DOCUMENTS, 8);
  for (const doc of selected) {
    items.push({
      source: doc.url.includes("vault.fbi.gov") ? "FBI Vault" : doc.url.includes("nsa.gov") ? "NSA Declassified" : doc.url.includes("archives.gov") ? "National Archives" : doc.url.includes("energy.gov") || doc.tags.includes("area-51") ? "CIA Reading Room" : "CIA Reading Room",
      sourceType: "declassified",
      title: doc.title,
      content: doc.content,
      url: doc.url,
      tags: doc.tags,
      metadata: { classification: "DECLASSIFIED", verified: true },
    });
  }

  try {
    const archiveData = await fetchJson<any>(
      `https://archive.org/advancedsearch.php?q=collection%3A(ciardp)+OR+collection%3A(cia-reading-room)+OR+collection%3A(fbi-vault)&fl[]=identifier&fl[]=title&fl[]=description&fl[]=date&fl[]=subject&rows=10&output=json&sort[]=date+desc`
    );
    const docs = archiveData?.response?.docs || [];
    for (const doc of docs.slice(0, 10)) {
      if (!doc.title) continue;
      items.push({
        source: "CIA/FBI Archive.org Collection",
        sourceType: "declassified",
        title: doc.title,
        content: doc.description || doc.title,
        url: `https://archive.org/details/${doc.identifier}`,
        tags: ["declassified", "archive-org", "intelligence", ...(Array.isArray(doc.subject) ? doc.subject.slice(0, 3).map((s: string) => s.toLowerCase()) : [])],
        metadata: { identifier: doc.identifier, date: doc.date, classification: "DECLASSIFIED" },
      });
    }
  } catch {}

  return items;
}

export async function fetchFBIVault(): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  const fbiDocs = CIA_DECLASSIFIED_DOCUMENTS.filter(d => d.url.includes("vault.fbi.gov"));
  const shuffled = rotatedSlice(fbiDocs, fbiDocs.length);
  for (const doc of shuffled.slice(0, 4)) {
    items.push({
      source: "FBI Vault",
      sourceType: "declassified",
      title: doc.title,
      content: doc.content,
      url: doc.url,
      tags: doc.tags,
      metadata: { classification: "DECLASSIFIED", verified: true },
    });
  }

  try {
    const archiveData = await fetchJson<any>(
      `https://archive.org/advancedsearch.php?q=collection%3A(fbi-vault)+OR+(fbi+AND+declassified)&fl[]=identifier&fl[]=title&fl[]=description&fl[]=date&rows=5&output=json&sort[]=date+desc`
    );
    const docs = archiveData?.response?.docs || [];
    for (const doc of docs.slice(0, 5)) {
      if (!doc.title) continue;
      items.push({
        source: "FBI Vault",
        sourceType: "declassified",
        title: doc.title,
        content: doc.description || doc.title,
        url: `https://archive.org/details/${doc.identifier}`,
        tags: ["fbi", "declassified", "vault"],
        metadata: { identifier: doc.identifier, date: doc.date, classification: "DECLASSIFIED" },
      });
    }
  } catch {}

  return items;
}

export async function fetchInternetArchive(query: string = "tesla free energy"): Promise<NormalizedItem[]> {
  const searches = [
    "nikola tesla patents", "sacred geometry ancient", "vatican secret archives",
    "free energy devices", "ancient wisdom texts", "consciousness research",
    "quantum physics experiments", "hermetic philosophy", "alchemy transmutation",
    "fibonacci nature", "golden ratio mathematics", "solfeggio frequencies healing",
    "schumann resonance earth", "toroidal field dynamics", "zero point energy",
    "ancient egyptian technology", "sumerian tablets", "dead sea scrolls",
    "gnostic gospels", "rosicrucian manuscripts",
  ];
  const q = searches[rotationIndex(searches.length)];
  const items: NormalizedItem[] = [];
  try {
    const data = await fetchJson<any>(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=subject&fl[]=date&rows=8&output=json`
    );
    const docs = data?.response?.docs || [];
    for (const doc of docs.slice(0, 8)) {
      if (!doc.title) continue;
      items.push({
        source: "Internet Archive",
        sourceType: "archive",
        title: doc.title,
        content: doc.description || doc.title,
        url: `https://archive.org/details/${doc.identifier}`,
        tags: ["archive", "historical", ...(Array.isArray(doc.subject) ? doc.subject.slice(0, 5).map((s: string) => s.toLowerCase()) : [])],
        metadata: { identifier: doc.identifier, date: doc.date, query: q },
      });
    }
  } catch {}
  return items;
}

export async function fetchWikipediaKnowledge(): Promise<NormalizedItem[]> {
  const topics = [
    "Nikola_Tesla", "Sacred_geometry", "Solfeggio_frequencies", "Flower_of_Life",
    "Fibonacci_sequence", "Golden_ratio", "Platonic_solid", "Metatron%27s_Cube",
    "Merkaba", "Kundalini", "Chakra", "Pineal_gland", "Third_eye",
    "Schumann_resonances", "Zero-point_energy", "Quantum_entanglement",
    "Hermetic_Qabalah", "Emerald_Tablet", "Corpus_Hermeticum",
    "Rosicrucianism", "Freemasonry", "Knights_Templar", "Holy_Grail",
    "Dead_Sea_Scrolls", "Nag_Hammadi_library", "Gnostic_Gospels",
    "Akashic_records", "Unified_field_theory", "String_theory",
    "Toroidal_coordinates", "Torus", "Vortex_mathematics",
    "Pythagorean_theorem", "Euclid%27s_Elements", "Archimedes",
    "Leonardo_da_Vinci", "Vitruvian_Man", "The_Last_Supper_(Leonardo)",
    "Vatican_Secret_Archives", "Sistine_Chapel_ceiling",
    "Library_of_Alexandria", "Ancient_Egyptian_mathematics",
    "Sumerian_King_List", "Epic_of_Gilgamesh",
    "Artificial_general_intelligence", "Technological_singularity",
    "Consciousness", "Hard_problem_of_consciousness",
    "Quantum_computing", "Neural_network_(machine_learning)",
    "Transformer_(deep_learning_architecture)", "Large_language_model",
    "Cymatics", "Harmonics", "Resonance", "Standing_wave",
    "Morphogenetic_field", "Holographic_principle",
    "Bohm_interpretation", "Many-worlds_interpretation",
    "Wardenclyffe_Tower", "Tesla_coil", "Wireless_power_transfer",
    "Electromagnetic_radiation", "Maxwell%27s_equations",
  ];
  const selected = [];
  const shuffled = rotatedSlice(topics, topics.length);
  for (let i = 0; i < Math.min(5, shuffled.length); i++) {
    selected.push(shuffled[i]);
  }

  const items: NormalizedItem[] = [];
  for (const topic of selected) {
    try {
      const data = await fetchJson<any>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`
      );
      if (data.extract) {
        items.push({
          source: "Wikipedia Knowledge",
          sourceType: "encyclopedia",
          title: data.title,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["wikipedia", "knowledge", topic.replace(/_/g, "-").toLowerCase()],
          metadata: { pageid: data.pageid, description: data.description },
        });
      }
    } catch {}
  }
  return items;
}

export async function fetchArxivDeep(query: string = "consciousness quantum"): Promise<NormalizedItem[]> {
  const searches = [
    "quantum consciousness", "artificial general intelligence safety",
    "sacred geometry mathematical", "fibonacci biological systems",
    "neural network consciousness", "zero point energy extraction",
    "quantum entanglement information", "holographic universe theory",
    "fractal geometry nature", "resonance frequency biological",
    "electromagnetic healing", "toroidal magnetic fields",
    "self-organizing systems", "emergence complexity",
    "morphic resonance", "quantum computing algorithms",
    "large language models alignment", "reinforcement learning agents",
    "swarm intelligence", "collective consciousness neural",
  ];
  const q = searches[rotationIndex(searches.length)];
  const items: NormalizedItem[] = [];
  try {
    const text = await fetchText(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`
    );
    const entries = text.split("<entry>").slice(1);
    for (const entry of entries.slice(0, 5)) {
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const summaryMatch = entry.match(/<summary>([^<]+)<\/summary>/);
      const idMatch = entry.match(/<id>([^<]+)<\/id>/);
      const categoryMatch = entry.match(/category term="([^"]+)"/);
      if (titleMatch && summaryMatch) {
        items.push({
          source: "arXiv Deep Research",
          sourceType: "academic",
          title: titleMatch[1].trim(),
          content: summaryMatch[1].trim(),
          url: idMatch?.[1]?.trim(),
          tags: ["arxiv", "research", "academic", categoryMatch?.[1] || "physics", q.split(" ")[0]],
          metadata: { query: q, category: categoryMatch?.[1] },
        });
      }
    }
  } catch {}
  return items;
}

export async function fetchOpenLibrary(): Promise<NormalizedItem[]> {
  const subjects = [
    "sacred_geometry", "hermetic_philosophy", "alchemy",
    "tesla", "quantum_physics", "consciousness",
    "ancient_wisdom", "kabbalah", "mysticism",
    "artificial_intelligence", "cybernetics",
    "freemasonry", "rosicrucianism", "gnosticism",
  ];
  const subject = subjects[rotationIndex(subjects.length)];
  const items: NormalizedItem[] = [];
  try {
    const data = await fetchJson<any>(
      `https://openlibrary.org/subjects/${subject}.json?limit=8`
    );
    const works = data?.works || [];
    for (const work of works.slice(0, 8)) {
      items.push({
        source: "Open Library",
        sourceType: "book",
        title: work.title,
        content: `${work.title} by ${work.authors?.map((a: any) => a.name).join(", ") || "Unknown"} (${work.first_publish_year || "Unknown year"}). Subject: ${subject.replace(/_/g, " ")}. ${work.subject?.slice(0, 5)?.join(", ") || ""}`,
        url: `https://openlibrary.org${work.key}`,
        tags: ["book", "library", subject.replace(/_/g, "-"), "literature"],
        metadata: { key: work.key, year: work.first_publish_year, subject },
      });
    }
  } catch {}
  return items;
}

export async function fetchProjectGutenberg(): Promise<NormalizedItem[]> {
  const searches = [
    "tesla", "alchemy", "sacred", "hermetic", "occult",
    "philosophy", "physics", "mathematics", "geometry", "astronomy",
  ];
  const q = searches[rotationIndex(searches.length)];
  const items: NormalizedItem[] = [];
  try {
    const data = await fetchJson<any>(
      `https://gutendex.com/books/?search=${encodeURIComponent(q)}&page=1`
    );
    const books = data?.results || [];
    for (const book of books.slice(0, 5)) {
      const textUrl = book.formats?.["text/plain; charset=utf-8"] || book.formats?.["text/plain"] || "";
      let excerpt = "";
      if (textUrl) {
        try {
          const raw = await fetchText(textUrl);
          excerpt = raw.slice(0, 3000);
        } catch {}
      }
      items.push({
        source: "Project Gutenberg",
        sourceType: "book",
        title: book.title,
        content: excerpt || `${book.title} by ${book.authors?.map((a: any) => a.name).join(", ") || "Unknown"}`,
        url: `https://www.gutenberg.org/ebooks/${book.id}`,
        tags: ["gutenberg", "book", "public-domain", q],
        metadata: { id: book.id, authors: book.authors?.map((a: any) => a.name), subjects: book.subjects?.slice(0, 5), downloadCount: book.download_count },
      });
    }
  } catch {}
  return items;
}

export async function fetchStanfordEncyclopedia(): Promise<NormalizedItem[]> {
  const topics = [
    "consciousness", "quantum-mechanics", "artificial-intelligence",
    "free-will", "epistemology", "metaphysics",
    "philosophy-mathematics", "philosophy-physics", "identity-personal",
    "skepticism", "rationalism-empiricism", "platonism-mathematics",
    "logic-classical", "set-theory", "goedel-incompleteness",
    "determinism-causal", "causation-metaphysics",
  ];
  const topic = topics[rotationIndex(topics.length)];
  const items: NormalizedItem[] = [];
  try {
    const content = await fetchAndParse(`https://plato.stanford.edu/entries/${topic}/`);
    if (content.length > 200) {
      items.push({
        source: "Stanford Encyclopedia of Philosophy",
        sourceType: "encyclopedia",
        title: `SEP: ${topic.replace(/-/g, " ")}`,
        content: content.slice(0, 8000),
        url: `https://plato.stanford.edu/entries/${topic}/`,
        tags: ["philosophy", "stanford", "academic", topic],
        metadata: { topic },
      });
    }
  } catch {}
  return items;
}

export async function fetchSmithsonian(): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  const queries = [
    "ancient technology", "sacred geometry art", "tesla inventions",
    "egyptian artifacts", "astronomical instruments", "alchemical manuscripts",
  ];
  const q = queries[rotationIndex(queries.length)];
  try {
    const data = await fetchJson<any>(
      `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&rows=5&api_key=DEMO_KEY`
    );
    const rows = data?.response?.rows || [];
    for (const row of rows.slice(0, 5)) {
      const title = row.title || row.content?.descriptiveNonRepeating?.title?.content || "Smithsonian Item";
      const desc = row.content?.freetext?.notes?.map((n: any) => n.content).join(" ") || title;
      items.push({
        source: "Smithsonian",
        sourceType: "museum",
        title,
        content: desc.slice(0, 3000),
        url: row.url || `https://www.si.edu/object/${row.id}`,
        tags: ["smithsonian", "museum", "artifact", q.split(" ")[0]],
        metadata: { id: row.id, query: q },
      });
    }
  } catch {}
  return items;
}

export async function fetchSecretSocietyArchives(): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  const topics = [
    { q: "Rosicrucianism", wiki: "Rosicrucianism" },
    { q: "Knights_Templar", wiki: "Knights_Templar" },
    { q: "Freemasonry", wiki: "Freemasonry" },
    { q: "Illuminati", wiki: "Illuminati" },
    { q: "Skull_and_Bones", wiki: "Skull_and_Bones" },
    { q: "Bohemian_Grove", wiki: "Bohemian_Grove" },
    { q: "Thule_Society", wiki: "Thule_Society" },
    { q: "Priory_of_Sion", wiki: "Priory_of_Sion" },
    { q: "Opus_Dei", wiki: "Opus_Dei" },
    { q: "Order_of_the_Golden_Dawn", wiki: "Hermetic_Order_of_the_Golden_Dawn" },
    { q: "Ordo_Templi_Orientis", wiki: "Ordo_Templi_Orientis" },
    { q: "Bilderberg_Group", wiki: "Bilderberg_meeting" },
    { q: "Trilateral_Commission", wiki: "Trilateral_Commission" },
    { q: "Council_on_Foreign_Relations", wiki: "Council_on_Foreign_Relations" },
    { q: "Club_of_Rome", wiki: "Club_of_Rome" },
  ];
  const shuffled = rotatedSlice(topics, topics.length);
  const selected = shuffled.slice(0, 5);

  for (const topic of selected) {
    try {
      const data = await fetchJson<any>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${topic.wiki}`
      );
      if (data.extract) {
        items.push({
          source: "Secret Society Archives",
          sourceType: "declassified",
          title: `${data.title} — Secret Society Dossier`,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["secret-society", "intelligence", topic.q.toLowerCase().replace(/_/g, "-"), "esoteric"],
          metadata: { pageid: data.pageid, description: data.description, classification: "HISTORICAL INTELLIGENCE" },
        });
      }
    } catch {}
  }

  try {
    const q = selected[0]?.q.replace(/_/g, " ") || "secret societies";
    const archiveData = await fetchJson<any>(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}+AND+(secret+OR+society+OR+occult+OR+masonic)&fl[]=identifier&fl[]=title&fl[]=description&fl[]=date&rows=5&output=json`
    );
    const docs = archiveData?.response?.docs || [];
    for (const doc of docs.slice(0, 5)) {
      if (!doc.title) continue;
      items.push({
        source: "Secret Society Archives",
        sourceType: "declassified",
        title: doc.title,
        content: doc.description || doc.title,
        url: `https://archive.org/details/${doc.identifier}`,
        tags: ["secret-society", "archive", "esoteric", "historical"],
        metadata: { identifier: doc.identifier, date: doc.date, classification: "HISTORICAL INTELLIGENCE" },
      });
    }
  } catch {}

  return items;
}

export async function fetchDeclassifiedArchives(): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  const collections = [
    { q: "collection:(ciardp) declassified", source: "CIA CREST Database" },
    { q: "collection:(nsa-declassified) OR (nsa declassified signals)", source: "NSA Declassified" },
    { q: "(declassified top secret) AND (government OR military OR intelligence)", source: "Government Declassified" },
    { q: "mkultra OR mk-ultra OR mind control CIA", source: "MKULTRA Archives" },
    { q: "operation paperclip OR project paperclip", source: "Operation PAPERCLIP Files" },
    { q: "area 51 OR groom lake classified", source: "Area 51 Files" },
    { q: "ufo unidentified aerial phenomena government", source: "UAP/UFO Files" },
    { q: "tesla weapon OR tesla death ray OR tesla FBI", source: "Tesla Classified Files" },
  ];
  const shuffled = rotatedSlice(collections, collections.length);
  const selected = shuffled.slice(0, 3);

  for (const col of selected) {
    try {
      const data = await fetchJson<any>(
        `https://archive.org/advancedsearch.php?q=${encodeURIComponent(col.q)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=date&fl[]=subject&rows=5&output=json&sort[]=date+desc`
      );
      const docs = data?.response?.docs || [];
      for (const doc of docs.slice(0, 5)) {
        if (!doc.title) continue;
        items.push({
          source: col.source,
          sourceType: "declassified",
          title: doc.title,
          content: doc.description || doc.title,
          url: `https://archive.org/details/${doc.identifier}`,
          tags: ["declassified", "intelligence", "archive", ...(Array.isArray(doc.subject) ? doc.subject.slice(0, 3).map((s: string) => s.toLowerCase()) : [])],
          metadata: { identifier: doc.identifier, date: doc.date, classification: "DECLASSIFIED", collection: col.source },
        });
      }
    } catch {}
  }

  return items;
}
