import type {
  MetadataOptions,
  OverrideSpec,
  PrototypeHandle,
  PrototypeRef,
  PrototypeSpec,
  RunEntry,
} from "../domain/types.js";

export function prototype<Input>(
  attrs: Input,
  options?: MetadataOptions,
): PrototypeSpec<Input> {
  return {
    $kind: "prototype-spec",
    attrs,
    options: options ?? {},
  };
}

export function override<Input>(
  attrs: Partial<Input>,
  options?: MetadataOptions,
): OverrideSpec<Input> {
  return {
    $kind: "override-spec",
    attrs,
    options: options ?? {},
  };
}

export function entry(
  target: PrototypeHandle | PrototypeRef,
  attrs?: Record<string, unknown>,
  options?: MetadataOptions,
): RunEntry {
  const ref = target.$kind === "prototype-ref" ? target : target.ref;
  return {
    $kind: "run-entry",
    target: ref,
    attrs: attrs ?? {},
    options: options ?? {},
  };
}
