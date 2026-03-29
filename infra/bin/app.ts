#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack.js';
import { InfraStack } from '../lib/infra-stack.js';
import { FrontendStack } from '../lib/frontend-stack.js';

const app = new cdk.App();

const stageName = app.node.tryGetContext('stageName') ?? 'dev';
const domainName = app.node.tryGetContext('domainName') ?? 'squadlogic.io';
const certificateArn = app.node.tryGetContext('certificateArn') ?? '';
const hostedZoneId = app.node.tryGetContext('hostedZoneId') ?? '';

const tags: Record<string, string> = {
  project: 'team-manager',
  stage: stageName,
};

// Domain names per stage
const apiDomain = stageName === 'prod' ? `api.${domainName}` : `api-${stageName}.${domainName}`;
const appDomain = stageName === 'prod' ? domainName : `${stageName}.${domainName}`;

const authStack = new AuthStack(app, `TeamManager-Auth-${stageName}`, {
  stageName,
  tags,
});

const infraStack = new InfraStack(app, `TeamManager-Infra-${stageName}`, {
  stageName,
  userPoolArn: authStack.userPoolArn,
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
  policyStoreId: authStack.policyStoreId,
  domainName,
  apiDomainName: apiDomain,
  certificateArn,
  hostedZoneId,
  tags,
});

infraStack.addDependency(authStack);

new FrontendStack(app, `TeamManager-Frontend-${stageName}`, {
  stageName,
  domainName,
  appDomainName: appDomain,
  certificateArn,
  hostedZoneId,
  tags,
});

app.synth();
