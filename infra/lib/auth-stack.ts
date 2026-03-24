import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'node:path';
import * as avp from 'aws-cdk-lib/aws-verifiedpermissions';
import type { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {
  stageName: string;
  callbackUrls?: string[];
  logoutUrls?: string[];
}

export class AuthStack extends cdk.Stack {
  public readonly userPoolArn: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly policyStoreId: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'SLUserPool', {
      userPoolName: `TeamManager-Users-${stageName}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        organizationId: new cognito.StringAttribute({
          mutable: true,
        }),
        teamId: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    this.userPoolArn = userPool.userPoolArn;
    this.userPoolId = userPool.userPoolId;

    // Cognito User Pool Domain (required for OAuth / hosted UI)
    const userPoolDomain = userPool.addDomain('SLDomain', {
      cognitoDomain: {
        domainPrefix: `teammanager-${stageName}`,
      },
    });

    // Google Identity Provider (optional, configured via CDK context)
    const googleClientId = this.node.tryGetContext('googleClientId') ?? '';
    const googleClientSecret = this.node.tryGetContext('googleClientSecret') ?? '';

    let googleIdp: cognito.CfnUserPoolIdentityProvider | undefined;
    if (googleClientId && googleClientSecret) {
      googleIdp = new cognito.CfnUserPoolIdentityProvider(this, 'GoogleIdP', {
        userPoolId: userPool.userPoolId,
        providerName: 'Google',
        providerType: 'Google',
        providerDetails: {
          client_id: googleClientId,
          client_secret: googleClientSecret,
          authorize_scopes: 'openid email profile',
        },
        attributeMapping: {
          email: 'email',
          given_name: 'given_name',
          family_name: 'family_name',
        },
      });
    }

    // OAuth configuration
    const callbackUrls = props.callbackUrls ?? ['http://localhost:3000/'];
    const logoutUrls = props.logoutUrls ?? ['http://localhost:3000/'];

    const supportedProviders = [cognito.UserPoolClientIdentityProvider.COGNITO];
    if (googleClientId && googleClientSecret) {
      supportedProviders.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      'SLUserPoolClient',
      {
        userPool,
        userPoolClientName: `TeamManager-Client-${stageName}`,
        authFlows: {
          userSrp: true,
          userPassword: true,
        },
        preventUserExistenceErrors: true,
        oAuth: {
          flows: { authorizationCodeGrant: true },
          scopes: [
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls,
          logoutUrls,
        },
        supportedIdentityProviders: supportedProviders,
      },
    );

    // Ensure IdP is created before client references it
    if (googleIdp) {
      userPoolClient.node.addDependency(googleIdp);
    }

    this.userPoolClientId = userPoolClient.userPoolClientId;

    // User Pool Groups (8 roles)
    const groups = [
      'SuperAdmin',
      'OrgAdmin',
      'OrgManager',
      'OrgUser',
      'TeamAdmin',
      'TeamManager',
      'TeamUser',
      'Athlete',
    ] as const;

    for (const groupName of groups) {
      new cognito.CfnUserPoolGroup(this, `Group${groupName}`, {
        userPoolId: userPool.userPoolId,
        groupName,
        description: `${groupName} group for SquadLogic platform`,
      });
    }

    // Pre Token Generation V2 Lambda trigger
    const preTokenGenerationFn = new NodejsFunction(
      this,
      'PreTokenGenerationFn',
      {
        functionName: `TeamManager-PreTokenGen-${stageName}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.resolve('lib', 'lambdas', 'pre-token-generation.ts'),
        handler: 'handler',
        timeout: cdk.Duration.seconds(5),
        memorySize: 128,
        bundling: {
          format: cdk.aws_lambda_nodejs.OutputFormat.CJS,
          target: 'node22',
          externalModules: ['@aws-sdk/*'],
        },
        environment: {
          NODE_ENV: stageName === 'dev' ? 'development' : 'production',
        },
      },
    );

    userPool.addTrigger(
      cognito.UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
      preTokenGenerationFn,
    );

    // Verified Permissions Policy Store with Cedar Schema
    const cedarSchema: Record<string, unknown> = {
      SquadLogic: {
        entityTypes: {
          User: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
                teamId: { type: 'String', required: false },
                email: { type: 'String', required: true },
              },
            },
            memberOfTypes: ['Role'],
          },
          Role: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: false },
                teamId: { type: 'String', required: false },
              },
            },
            memberOfTypes: ['Role'],
          },
          Organization: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
                status: { type: 'String', required: true },
              },
            },
          },
          Team: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
              },
            },
            memberOfTypes: ['Organization'],
          },
          Resource: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
                teamId: { type: 'String', required: false },
              },
            },
            memberOfTypes: ['Team', 'Organization'],
          },
          Group: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
                teamId: { type: 'String', required: true },
              },
            },
            memberOfTypes: ['Team'],
          },
          Athlete: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
              },
            },
            memberOfTypes: ['Organization'],
          },
          Coach: {
            shape: {
              type: 'Record',
              attributes: {
                organizationId: { type: 'String', required: true },
              },
            },
            memberOfTypes: ['Organization'],
          },
        },
        actions: {
          View: {
            appliesTo: {
              principalTypes: ['User', 'Role'],
              resourceTypes: ['Organization', 'Team', 'Resource', 'Group', 'Athlete', 'Coach'],
            },
          },
          Create: {
            appliesTo: {
              principalTypes: ['User', 'Role'],
              resourceTypes: ['Organization', 'Team', 'Resource', 'Group', 'Athlete', 'Coach'],
            },
          },
          Update: {
            appliesTo: {
              principalTypes: ['User', 'Role'],
              resourceTypes: ['Organization', 'Team', 'Resource', 'Group', 'Athlete', 'Coach'],
            },
          },
          Delete: {
            appliesTo: {
              principalTypes: ['User', 'Role'],
              resourceTypes: ['Organization', 'Team', 'Resource', 'Group', 'Athlete', 'Coach'],
            },
          },
          Manage: {
            appliesTo: {
              principalTypes: ['User', 'Role'],
              resourceTypes: ['Organization', 'Team', 'Resource', 'Group', 'Athlete', 'Coach'],
            },
          },
        },
      },
    };

    const policyStore = new avp.CfnPolicyStore(this, 'SLPolicyStore', {
      validationSettings: {
        mode: 'STRICT',
      },
      schema: {
        cedarJson: JSON.stringify(cedarSchema),
      },
      description: `TeamManager policy store - ${stageName}`,
    });

    this.policyStoreId = policyStore.attrPolicyStoreId;

    // Cedar Policies

    // 1. SuperAdmin: permit all actions on all resources
    new avp.CfnPolicy(this, 'PolicySuperAdmin', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'SuperAdmin: permit all actions on all resources',
          statement:
            'permit (principal in SquadLogic::Role::"SuperAdmin", action, resource);',
        },
      },
    });

    // 2. OrgAdmin: all actions within own org
    new avp.CfnPolicy(this, 'PolicyOrgAdmin', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'OrgAdmin: all actions within own org',
          statement: [
            'permit (principal in SquadLogic::Role::"OrgAdmin", action, resource)',
            'when { principal.organizationId == resource.organizationId };',
          ].join('\n'),
        },
      },
    });

    // 3. OrgManager: View, Create, Update within own org
    new avp.CfnPolicy(this, 'PolicyOrgManager', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'OrgManager: View, Create, Update within own org',
          statement: [
            'permit (principal in SquadLogic::Role::"OrgManager", action in [SquadLogic::Action::"View", SquadLogic::Action::"Create", SquadLogic::Action::"Update"], resource)',
            'when { principal.organizationId == resource.organizationId };',
          ].join('\n'),
        },
      },
    });

    // 4. OrgUser: View only within own org
    new avp.CfnPolicy(this, 'PolicyOrgUser', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'OrgUser: View only within own org',
          statement: [
            'permit (principal in SquadLogic::Role::"OrgUser", action in [SquadLogic::Action::"View"], resource)',
            'when { principal.organizationId == resource.organizationId };',
          ].join('\n'),
        },
      },
    });

    // 5. TeamAdmin: all actions within own team
    new avp.CfnPolicy(this, 'PolicyTeamAdmin', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'TeamAdmin: all actions within own team',
          statement: [
            'permit (principal in SquadLogic::Role::"TeamAdmin", action, resource)',
            'when { principal.organizationId == resource.organizationId && principal has teamId && resource has teamId && principal.teamId == resource.teamId };',
          ].join('\n'),
        },
      },
    });

    // 6. TeamManager: View, Create, Update within own team
    new avp.CfnPolicy(this, 'PolicyTeamManager', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'TeamManager: View, Create, Update within own team',
          statement: [
            'permit (principal in SquadLogic::Role::"TeamManager", action in [SquadLogic::Action::"View", SquadLogic::Action::"Create", SquadLogic::Action::"Update"], resource)',
            'when { principal.organizationId == resource.organizationId && principal has teamId && resource has teamId && principal.teamId == resource.teamId };',
          ].join('\n'),
        },
      },
    });

    // 7. TeamUser: View within own team
    new avp.CfnPolicy(this, 'PolicyTeamUser', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'TeamUser: View within own team',
          statement: [
            'permit (principal in SquadLogic::Role::"TeamUser", action in [SquadLogic::Action::"View"], resource)',
            'when { principal.organizationId == resource.organizationId && principal has teamId && resource has teamId && principal.teamId == resource.teamId };',
          ].join('\n'),
        },
      },
    });

    // 8. Athlete: View within own team (same as TeamUser for now)
    new avp.CfnPolicy(this, 'PolicyAthlete', {
      policyStoreId: policyStore.attrPolicyStoreId,
      definition: {
        static: {
          description: 'Athlete: View within own team',
          statement: [
            'permit (principal in SquadLogic::Role::"Athlete", action in [SquadLogic::Action::"View"], resource)',
            'when { principal.organizationId == resource.organizationId && principal has teamId && resource has teamId && principal.teamId == resource.teamId };',
          ].join('\n'),
        },
      },
    });

    // Cognito Identity Source for Verified Permissions
    new avp.CfnIdentitySource(this, 'CognitoIdentitySource', {
      policyStoreId: policyStore.attrPolicyStoreId,
      configuration: {
        cognitoUserPoolConfiguration: {
          userPoolArn: userPool.userPoolArn,
          clientIds: [userPoolClient.userPoolClientId],
          groupConfiguration: {
            groupEntityType: 'SquadLogic::Role',
          },
        },
      },
      principalEntityType: 'SquadLogic::User',
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'PolicyStoreId', {
      value: policyStore.attrPolicyStoreId,
      description: 'Verified Permissions Policy Store ID',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain',
    });
  }
}
