import { z, ZodObject, ZodString, ZodNumber, ZodOptional, type ZodTypeAny } from "zod";

/**
 * Minimal Zod → JSON Schema converter that handles the shapes we actually use.
 * Avoids adding a heavyweight dependency like `zod-to-json-schema`.
 *
 * Supports: ZodObject, ZodString, ZodNumber, ZodOptional. Falls back to a
 * permissive `{}` for unsupported types — fine for our limited schemas.
 */
export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return convert(schema);
}

function convert(node: ZodTypeAny): Record<string, unknown> {
  if (node instanceof ZodObject) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    const shape = node.shape as Record<string, ZodTypeAny>;
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convert(value);
      if (!(value instanceof ZodOptional) && !value.isOptional()) {
        required.push(key);
      }
    }
    const out: Record<string, unknown> = {
      type: "object",
      properties,
      additionalProperties: false,
    };
    if (required.length > 0) out.required = required;
    return out;
  }

  if (node instanceof ZodOptional) {
    return convert(node._def.innerType);
  }

  if (node instanceof ZodString) {
    const out: Record<string, unknown> = { type: "string" };
    const desc = node.description;
    if (desc) out.description = desc;
    return out;
  }

  if (node instanceof ZodNumber) {
    const out: Record<string, unknown> = { type: "number" };
    const desc = node.description;
    if (desc) out.description = desc;
    return out;
  }

  // Fallback for anything else
  return {};
}

// Re-export z for convenience in case other modules need it from here.
export { z };
