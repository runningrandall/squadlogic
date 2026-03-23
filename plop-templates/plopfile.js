export default function (plop) {
  plop.setGenerator('entity', {
    description: 'Create a new backend entity with hexagonal architecture scaffolding',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Entity name (e.g., Customer, Invoice):',
        validate: (value) => {
          if (!value || !value.trim()) {
            return 'Entity name is required';
          }
          return true;
        },
      },
    ],
    actions: [
      {
        type: 'add',
        path: '../backend/src/domain/{{camelCase name}}.ts',
        template: '// {{pascalCase name}} domain types and interfaces\n\nexport interface {{pascalCase name}} {\n  {{camelCase name}}Id: string;\n  organizationId: string;\n  createdAt: string;\n  updatedAt: string;\n}\n',
      },
      {
        type: 'add',
        path: '../backend/src/ports/{{camelCase name}}-repository.port.ts',
        template:
          '// {{pascalCase name}} repository port\n\nimport type { {{pascalCase name}} } from \'../domain/{{camelCase name}}.js\';\n\nexport interface {{pascalCase name}}Repository {\n  create(item: {{pascalCase name}}): Promise<{{pascalCase name}}>;\n  getById(organizationId: string, {{camelCase name}}Id: string): Promise<{{pascalCase name}} | null>;\n  list(organizationId: string): Promise<{{pascalCase name}}[]>;\n  update(item: {{pascalCase name}}): Promise<{{pascalCase name}}>;\n  delete(organizationId: string, {{camelCase name}}Id: string): Promise<void>;\n}\n',
      },
      {
        type: 'add',
        path: '../backend/src/adapters/{{camelCase name}}-dynamo.adapter.ts',
        template:
          '// {{pascalCase name}} DynamoDB adapter\n\n// TODO: implement {{pascalCase name}}Repository using ElectroDB\n',
      },
      {
        type: 'add',
        path: '../backend/src/entities/{{camelCase name}}.entity.ts',
        template:
          '// {{pascalCase name}} ElectroDB entity definition\n\n// TODO: define ElectroDB entity for {{pascalCase name}}\n',
      },
      {
        type: 'add',
        path: '../backend/src/handlers/{{camelCase name}}.handler.ts',
        template:
          '// {{pascalCase name}} Lambda handler\n\n// TODO: implement CRUD handlers for {{pascalCase name}}\n',
      },
    ],
  });
}
