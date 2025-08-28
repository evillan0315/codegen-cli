# Overview

This package includes:

1. **A Node.js CLI** (`json-tool`) that validates JSON and can repair malformed JSON using JSON5/Hjson, with optional JSON Schema validation via AJV.
2. **A NestJS module** exposing `/json/validate` and `/json/repair` endpoints, fully documented in Swagger.

---

## 1) Node CLI — `json-tool`

### Install deps

```bash
npm i -D typescript ts-node @types/node
npm i yargs ajv ajv-formats json5 hjson
```

> If you prefer ESM-only, the sample uses ESM-compatible imports.

### `package.json` scripts & bin

```json
{
  "type": "module",
  "bin": {
    "json-tool": "dist/cli/json-tool.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/cli/json-tool.js"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### File: `src/cli/json-tool.ts`

```ts
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import JSON5 from 'json5';
import Hjson from 'hjson';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function readInput(input?: string): string {
  if (input && input !== '-') {
    return fs.readFileSync(path.resolve(input), 'utf8');
  }
  // stdin
  return fs.readFileSync(0, 'utf8');
}

function preClean(text: string): string {
  // Optional light clean – safe operations only
  return text.replace(/\u0000/g, '');
}

export function repairToObject(text: string): any {
  const cleaned = preClean(text);
  // 1) try strict JSON
  try { return JSON.parse(cleaned); } catch {}
  // 2) try JSON5
  try { return JSON5.parse(cleaned); } catch {}
  // 3) try Hjson (most lenient)
  return Hjson.parse(cleaned, { legacyRoot: true });
}

function stringify(obj: any, pretty?: boolean): string {
  return JSON.stringify(obj, null, pretty ? 2 : 0);
}

function validateWithSchema(obj: any, schemaPath?: string) {
  if (!schemaPath) return { valid: true as const, errors: undefined as any };
  const schemaTxt = fs.readFileSync(path.resolve(schemaPath), 'utf8');
  const schema = JSON.parse(schemaTxt);
  const validate = ajv.compile(schema);
  const valid = validate(obj);
  return { valid: !!valid, errors: validate.errors || undefined };
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('json-tool')
    .usage('$0 <cmd> [options]')
    .command(['validate [file]','v [file]'], 'Validate JSON (optionally against a schema)', y => y
      .positional('file', { type: 'string', describe: 'Input file (or - for stdin)' })
      .option('schema', { type: 'string', describe: 'JSON Schema file (draft 7/2019/2020)' })
      .option('pretty', { type: 'boolean', default: false, describe: 'Pretty-print output' })
      .option('out', { type: 'string', describe: 'Write normalized JSON to this file' })
    )
    .command(['repair [file]','r [file]'], 'Repair malformed JSON and output strict JSON', y => y
      .positional('file', { type: 'string', describe: 'Input file (or - for stdin)' })
      .option('schema', { type: 'string', describe: 'Validate repaired JSON against a schema' })
      .option('pretty', { type: 'boolean', default: true, describe: 'Pretty-print repaired JSON' })
      .option('out', { type: 'string', describe: 'Write repaired JSON to this file (default: stdout)' })
    )
    .demandCommand(1)
    .help()
    .parse();

  const cmd = (argv._[0] as string) || 'validate';
  const file = (argv.file as string | undefined) || '-';
  const text = readInput(file);

  try {
    if (cmd.startsWith('v')) {
      // validate
      const obj = repairToObject(text); // tolerant parse to allow relaxed inputs
      const { valid, errors } = validateWithSchema(obj, argv.schema as string | undefined);
      if (!valid) {
        console.error('Schema validation failed:', errors);
        process.exit(1);
      }
      const out = stringify(obj, !!argv.pretty);
      if (argv.out) fs.writeFileSync(argv.out, out, 'utf8'); else process.stdout.write(out + (argv.pretty ? '\n' : ''));
      process.exit(0);
    } else {
      // repair
      const obj = repairToObject(text);
      const { valid, errors } = validateWithSchema(obj, argv.schema as string | undefined);
      if (!valid) {
        console.error('Schema validation failed:', errors);
        process.exit(1);
      }
      const out = stringify(obj, !!argv.pretty);
      if (argv.out) fs.writeFileSync(argv.out, out, 'utf8'); else process.stdout.write(out + '\n');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Error:', err?.message || err);
    process.exit(1);
  }
}

main();
```

#### Usage

```bash
# Validate strict JSON file (prints normalized JSON to stdout)
json-tool validate data.json --pretty

# Validate from stdin
cat data.json | json-tool v - --pretty

# Repair malformed JSON and write to file
json-tool repair broken.json --out repaired.json

# Validate/repair with a JSON Schema
json-tool repair broken.json --schema schema.json --out repaired.json
json-tool validate repaired.json --schema schema.json
```

---

## 2) NestJS JSON Module (Service + Controller + Swagger)

### Install deps

```bash
pnpm add ajv ajv-formats json5 hjson
pnpm add -D @types/hjson @types/json5
```

> Assumes you already have `@nestjs/common`, `@nestjs/swagger`, `class-validator`, and `class-transformer` configured.

### File: `src/json/json.service.ts`

```ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import JSON5 from 'json5';
import Hjson from 'hjson';

@Injectable()
export class JsonService {
  private ajv = new Ajv({ allErrors: true, strict: false });

  constructor() { addFormats(this.ajv); }

  private preClean(text: string): string {
    return text.replace(/\u0000/g, '');
  }

  /** Tolerant parse: JSON -> JSON5 -> Hjson */
  parseLenient(text: string): any {
    const cleaned = this.preClean(text);
    try { return JSON.parse(cleaned); } catch {}
    try { return JSON5.parse(cleaned); } catch {}
    try { return Hjson.parse(cleaned, { legacyRoot: true }); } catch (e: any) {
      throw new BadRequestException(`Unable to parse input as JSON/JSON5/Hjson: ${e?.message || e}`);
    }
  }

  stringify(obj: any, pretty = true): string {
    return JSON.stringify(obj, null, pretty ? 2 : 0);
  }

  validate(obj: any, schema?: object): { valid: boolean; errors?: ErrorObject[] } {
    if (!schema) return { valid: true };
    const validate = this.ajv.compile(schema);
    const valid = validate(obj);
    return { valid: !!valid, errors: validate.errors || undefined };
  }

  /** Returns strict JSON string and parsed object */
  repair(textOrObj: string | any, pretty = true): { json: string; object: any } {
    const obj = typeof textOrObj === 'string' ? this.parseLenient(textOrObj) : textOrObj;
    return { json: this.stringify(obj, pretty), object: obj };
  }
}
```

### DTOs — `src/json/dto/*.ts`

**`src/json/dto/validate-request.dto.ts`**

```ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ValidateRequestDto {
  @ApiProperty({ description: 'JSON data to validate', type: 'object', additionalProperties: true })
  data!: Record<string, any>;

  @ApiPropertyOptional({ description: 'JSON Schema to validate against', type: 'object', additionalProperties: true })
  schema?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Pretty-print normalized JSON', default: false })
  pretty?: boolean = false;
}
```

**`src/json/dto/validate-response.dto.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateResponseDto {
  @ApiProperty()
  valid!: boolean;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  errors?: any[];

  @ApiProperty({ description: 'Normalized JSON as string' })
  normalized!: string;
}
```

**`src/json/dto/repair-request.dto.ts`**

```ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class RepairRequestDto {
  @ApiPropertyOptional({ description: 'Raw possibly-malformed JSON text' })
  text?: string;

  @ApiPropertyOptional({ description: 'Alternatively, supply parsed data directly', type: 'object', additionalProperties: true })
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Pretty-print repaired output', default: true })
  pretty?: boolean = true;

  @ApiPropertyOptional({ description: 'Optional JSON Schema to validate after repair', type: 'object', additionalProperties: true })
  schema?: Record<string, any>;
}
```

**`src/json/dto/repair-response.dto.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepairResponseDto {
  @ApiProperty({ description: 'Strict JSON output as string' })
  json!: string;

  @ApiProperty({ description: 'Repaired object', type: 'object', additionalProperties: true })
  object!: Record<string, any>;

  @ApiProperty()
  valid!: boolean;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  errors?: any[];
}
```

### Controller — `src/json/json.controller.ts`

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JsonService } from './json.service';
import { ValidateRequestDto } from './dto/validate-request.dto';
import { ValidateResponseDto } from './dto/validate-response.dto';
import { RepairRequestDto } from './dto/repair-request.dto';
import { RepairResponseDto } from './dto/repair-response.dto';

@ApiTags('json')
@Controller('json')
export class JsonController {
  constructor(private readonly jsonService: JsonService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate JSON, optionally against a JSON Schema' })
  @ApiBody({ type: ValidateRequestDto })
  @ApiResponse({ status: 200, type: ValidateResponseDto })
  validate(@Body() body: ValidateRequestDto): ValidateResponseDto {
    const normalized = this.jsonService.stringify(body.data, !!body.pretty);
    const { valid, errors } = this.jsonService.validate(body.data, body.schema);
    return { valid, errors, normalized };
  }

  @Post('repair')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repair malformed JSON (JSON5/Hjson tolerated) and return strict JSON' })
  @ApiBody({ type: RepairRequestDto })
  @ApiResponse({ status: 200, type: RepairResponseDto })
  repair(@Body() body: RepairRequestDto): RepairResponseDto {
    const source = body.text ?? (body.data ? JSON.stringify(body.data) : undefined);
    if (!source) {
      return { json: '', object: {}, valid: false, errors: [{ message: 'Provide either text or data' }] } as any;
    }
    const { json, object } = this.jsonService.repair(source, body.pretty);
    const { valid, errors } = this.jsonService.validate(object, body.schema);
    return { json, object, valid, errors };
  }
}
```

### Module — `src/json/json.module.ts`

```ts
import { Module } from '@nestjs/common';
import { JsonService } from './json.service';
import { JsonController } from './json.controller';

@Module({
  controllers: [JsonController],
  providers: [JsonService],
  exports: [JsonService],
})
export class JsonModule {}
```

### Wire up in `app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { JsonModule } from './json/json.module';

@Module({ imports: [JsonModule] })
export class AppModule {}
```

### Swagger setup reminder (if not already)

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('JSON Utilities')
    .setDescription('Validate & repair JSON APIs')
    .setVersion('1.0.0')
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(3000);
}
bootstrap();
```

### Example requests

**Validate:**

```bash
curl -X POST http://localhost:3000/json/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {"name":"Eddie","age":30},
    "schema": {"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}},"required":["name"],"additionalProperties":false},
    "pretty": true
  }'
```

**Repair:**

```bash
curl -X POST http://localhost:3000/json/repair \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "{name: 'Eddie', age: 30, trailing: [1,2,3,]}",
    "schema": {"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer"}},"required":["name"],"additionalProperties":true}
  }'
```

---

## Notes & Extensions

* The CLI uses a *tolerant parse (JSON → JSON5 → Hjson)* and always **emits strict JSON**.
* Both CLI and API support **AJV** schema validation with `ajv-formats`.
* Consider adding file upload support (e.g., NestJS `@UseInterceptors(FileInterceptor('file'))`) if you want to post files directly.
* For security, disable or sandbox schemas from untrusted users (e.g., limit `$ref` resolution).

