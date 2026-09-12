import LegacyLessonDiagram, {
  type LessonDiagramBlock as LegacyLessonDiagramBlock,
} from "./LessonDiagramLegacy";
import ViscosityDiagrams, {
  type ViscosityDiagramBlock,
} from "./ViscosityDiagrams";
import BodyResistanceDiagram, {
  type BodyResistanceDiagramBlock,
} from "./BodyResistanceDiagram";
import CardiovascularDiagrams, {
  type CardiovascularDiagramBlock,
} from "./CardiovascularDiagrams";
import SolidStateDiagrams, {
  type SolidStateDiagramBlock,
} from "./SolidStateDiagrams";

export type LessonDiagramBlock = Omit<LegacyLessonDiagramBlock, "kind"> & {
  kind?:
    | LegacyLessonDiagramBlock["kind"]
    | ViscosityDiagramBlock["kind"]
    | BodyResistanceDiagramBlock["kind"]
    | CardiovascularDiagramBlock["kind"]
    | SolidStateDiagramBlock["kind"];
};

const viscosityKinds = new Set<string>([
  "viscousLayeredPipe",
  "velocityGradient",
  "laminarPipeProfile",
  "flowAroundObstacle",
  "poiseuilleTube",
]);

const cardiovascularKinds = new Set<string>([
  "bloodVesselModel",
  "heartCycleCardiogram",
  "bloodPressureMeasurement",
]);

const solidStateKinds = new Set<string>([
  "crystalForms",
  "crystalLattice",
  "crystalAnisotropy",
]);

export default function LessonDiagram({ value }: { value: LessonDiagramBlock }) {
  if (!value) return null;

  if (value.kind && viscosityKinds.has(value.kind)) {
    return <ViscosityDiagrams value={value as ViscosityDiagramBlock} />;
  }

  if (value.kind === "bodyResistance") {
    return <BodyResistanceDiagram value={value as BodyResistanceDiagramBlock} />;
  }

  if (value.kind && cardiovascularKinds.has(value.kind)) {
    return <CardiovascularDiagrams value={value as CardiovascularDiagramBlock} />;
  }

  if (value.kind && solidStateKinds.has(value.kind)) {
    return <SolidStateDiagrams value={value as SolidStateDiagramBlock} />;
  }

  return <LegacyLessonDiagram value={value as LegacyLessonDiagramBlock} />;
}
