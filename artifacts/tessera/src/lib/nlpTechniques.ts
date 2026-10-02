export interface NLPTechniqueStyle {
  id: string;
  name: string;
  color: string;
  textColor: string;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  sizeClass: string;
  description: string;
}

export const NLP_TECHNIQUE_STYLES: NLPTechniqueStyle[] = [
  {
    id: "embedded",
    name: "Embedded Command",
    color: "violet",
    textColor: "#c084fc",
    bold: true,
    italic: true,
    uppercase: false,
    sizeClass: "text-[15px]",
    description: "Commands hidden within larger statements",
  },
  {
    id: "presupposition",
    name: "Presupposition",
    color: "cyan",
    textColor: "#67e8f9",
    bold: true,
    italic: false,
    uppercase: false,
    sizeClass: "text-[15px]",
    description: "Assumes truth, bypassing resistance",
  },
  {
    id: "temporal",
    name: "Temporal Shift",
    color: "amber",
    textColor: "#fcd34d",
    bold: false,
    italic: false,
    uppercase: true,
    sizeClass: "text-[15.5px]",
    description: "Moves listener into a future/past state",
  },
  {
    id: "analog",
    name: "Analog Marking",
    color: "emerald",
    textColor: "#6ee7b7",
    bold: true,
    italic: false,
    uppercase: false,
    sizeClass: "text-[15.5px]",
    description: "Emphasis creates subliminal message",
  },
  {
    id: "postulate",
    name: "Conversational Postulate",
    color: "rose",
    textColor: "#fda4af",
    bold: false,
    italic: true,
    uppercase: false,
    sizeClass: "text-[15.5px]",
    description: "Questions that function as commands",
  },
];
