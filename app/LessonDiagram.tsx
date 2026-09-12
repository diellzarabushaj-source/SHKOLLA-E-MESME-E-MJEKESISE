import LegacyLessonDiagram, {
  type LessonDiagramBlock as LegacyLessonDiagramBlock,
} from "./LessonDiagramLegacy";
import ViscosityDiagrams, {
  type ViscosityDiagramBlock,
} from "./ViscosityDiagrams";

export type LessonDiagramBlock = Omit<LegacyLessonDiagramBlock, "kind"> & {
  kind?: LegacyLessonDiagramBlock["kind"] | ViscosityDiagramBlock["kind"];
};

const viscosityKinds = new Set<string>([
  "viscousLayeredPipe",
  "velocityGradient",
  "laminarPipeProfile",
]);

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
  if (!value) return null;

  if (value.kind && viscosityKinds.has(value.kind)) {
    return <ViscosityDiagrams value={value as ViscosityDiagramBlock} />;
  }

  return <LegacyLessonDiagram value={value as LegacyLessonDiagramBlock} />;
}
