import LegacyLessonDiagram, {
  type LessonDiagramBlock as LegacyLessonDiagramBlock,
} from "./LessonDiagramLegacy";
import ViscosityDiagrams, {
  type ViscosityDiagramBlock,
} from "./ViscosityDiagrams";
import BodyResistanceDiagram, {
  type BodyResistanceDiagramBlock,
} from "./BodyResistanceDiagram";

export type LessonDiagramBlock = Omit<LegacyLessonDiagramBlock, "kind"> & {
  kind?: LegacyLessonDiagramBlock["kind"] | ViscosityDiagramBlock["kind"] | BodyResistanceDiagramBlock["kind"];
};

const viscosityKinds = new Set<string>([
  "viscousLayeredPipe",
  "velocityGradient",
  "laminarPipeProfile",
  "flowAroundObstacle",
  "poiseuilleTube",
]);

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
  if (!value) return null;

  if (value.kind && viscosityKinds.has(value.kind)) {
    return <ViscosityDiagrams value={value as ViscosityDiagramBlock} />;
  }

  if (value.kind === "bodyResistance") {
    return <BodyResistanceDiagram value={value as BodyResistanceDiagramBlock} />;
  }

  return <LegacyLessonDiagram value={value as LegacyLessonDiagramBlock} />;
}
