import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuthStack } from '../lib/auth-stack.js';

describe('AuthStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new AuthStack(app, 'TestAuthStack', {
      stageName: 'test',
    });
    template = Template.fromStack(stack);
  });

  test('creates Cognito User Pool with custom attributes', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'TeamManager-Users-test',
      Schema: Match.arrayWith([
        Match.objectLike({
          Name: 'organizationId',
          AttributeDataType: 'String',
          Mutable: true,
        }),
        Match.objectLike({
          Name: 'teamId',
          AttributeDataType: 'String',
          Mutable: true,
        }),
      ]),
    });
  });

  test('creates User Pool Client', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'TeamManager-Client-test',
    });
  });

  test('creates 8 User Pool Groups', () => {
    template.resourceCountIs('AWS::Cognito::UserPoolGroup', 8);

    const expectedGroups = [
      'SuperAdmin',
      'OrgAdmin',
      'OrgManager',
      'OrgUser',
      'TeamAdmin',
      'TeamManager',
      'TeamUser',
      'Athlete',
    ];

    for (const groupName of expectedGroups) {
      template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
        GroupName: groupName,
      });
    }
  });

  test('creates Verified Permissions Policy Store with STRICT validation', () => {
    template.hasResourceProperties(
      'AWS::VerifiedPermissions::PolicyStore',
      {
        ValidationSettings: {
          Mode: 'STRICT',
        },
      },
    );
  });

  test('creates 8 Cedar policies', () => {
    template.resourceCountIs('AWS::VerifiedPermissions::Policy', 8);
  });

  test('creates Cognito Identity Source for Verified Permissions', () => {
    template.hasResourceProperties(
      'AWS::VerifiedPermissions::IdentitySource',
      {
        PrincipalEntityType: 'SquadLogic::User',
      },
    );
  });

  test('creates Pre Token Generation Lambda function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'TeamManager-PreTokenGen-test',
      Runtime: 'nodejs22.x',
      Handler: 'index.handler',
    });
  });

  test('outputs UserPoolId, UserPoolClientId, and PolicyStoreId', () => {
    template.hasOutput('UserPoolId', {});
    template.hasOutput('UserPoolClientId', {});
    template.hasOutput('PolicyStoreId', {});
  });
});
