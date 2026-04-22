import * as TJS from "typescript-json-schema";
import { writeFileSync, mkdirSync, watchFile } from "fs";
import { resolve } from "path";

const TARGETS = {
  "context.schema.json": "ProjectContextDefinition",
  "layers.schema.json": "LayersYamlFile",
  "scenario.schema.json": "ScenarioDefinition",
  "challenge.schema.json": "ChallengeYaml",
  "content.schema.json": "ContentYaml",
};

// typescript-json-schema collapses Record<string, T> to { type: "object" } with no
// value schema. For files where all Record values share one type, inject that type
// as additionalProperties so unknown keys inside each entry are caught.
const RECORD_VALUE_TYPES = {
  "layers.schema.json": "LayerTypeDefinition",
};

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
    const valueTypeName = RECORD_VALUE_TYPES[file];
    if (valueTypeName) {
      const { $schema, ...valueSchema } = generator.getSchemaForSymbol(valueTypeName);
      strictifyObjects(valueSchema);
      for (const def of Object.values(schema.definitions || {})) {
        if (def.type === "object" && (!def.properties || Object.keys(def.properties).length === 0)) {
          def.additionalProperties = valueSchema;
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
