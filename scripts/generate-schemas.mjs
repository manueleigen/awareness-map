import * as TJS from "typescript-json-schema";
import { writeFileSync, mkdirSync, watchFile } from "fs";
import { resolve } from "path";

const TARGETS = {
  "context.schema.json": "ProjectContextDefinition",
  "layers.schema.json": "LayersYamlFile",
  "scenario.schema.json": "ScenarioDefinitionInput",
  "challenge.schema.json": "ChallengeYaml",
  "content.schema.json": "ContentYaml",
};

// typescript-json-schema collapses Record<string, T> to { type: "object" } with no
// value schema. For files where all Record values share one type, inject that type
// as additionalProperties so unknown keys inside each entry are caught.
// typescript-json-schema collapses Record<string, T> to { type: "object" } with no
// value schema. nameFilter (optional) restricts injection to Record defs whose
// encoded definition name contains the given substring — needed when a schema has
// multiple Record types at different levels (e.g. context.schema.json).
const RECORD_VALUE_TYPES = {};

const SCHEMA_SOURCE = resolve("src/modules/schemas.ts");

// Add additionalProperties: false to named objects, but leave Record<string, T>
// (which appear as objects with empty properties) unrestricted.
function strictifyObjects(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(strictifyObjects); return; }
  if (node.type === "object" && node.properties && Object.keys(node.properties).length > 0) {
    if (!("additionalProperties" in node)) node.additionalProperties = false;
  }
  Object.values(node).forEach(strictifyObjects);
}

function generateAll() {
  mkdirSync("schemas", { recursive: true });
  const program = TJS.programFromConfig("tsconfig.json");
  const generator = TJS.buildGenerator(program, { required: true, skipLibCheck: true });
  for (const [file, typeName] of Object.entries(TARGETS)) {
    const schema = generator.getSchemaForSymbol(typeName);
    const recordValueConfig = RECORD_VALUE_TYPES[file];
    if (recordValueConfig) {
      const { typeName, nameFilter } = recordValueConfig;
      const { $schema, ...valueSchema } = generator.getSchemaForSymbol(typeName);
      strictifyObjects(valueSchema);
      for (const [defName, def] of Object.entries(schema.definitions || {})) {
        if (def.type === "object" && (!def.properties || Object.keys(def.properties).length === 0)) {
          if (!nameFilter || defName.includes(nameFilter)) {
            def.additionalProperties = valueSchema;
          }
        }
      }
    }
    strictifyObjects(schema);
    writeFileSync(`schemas/${file}`, JSON.stringify(schema, null, 2));
    console.log(`✓ schemas/${file}`);
  }
}

generateAll();

if (process.argv.includes("--watch")) {
  console.log(`Watching src/modules/schemas.ts for changes...`);
  watchFile(SCHEMA_SOURCE, { interval: 500 }, () => { console.log("schemas.ts changed — regenerating..."); generateAll(); });
}
