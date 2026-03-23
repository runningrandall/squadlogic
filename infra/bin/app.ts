#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack.js';
import { InfraStack } from '../lib/infra-stack.js';
import { FrontendStack } from '../lib/frontend-stack.js';

const app = new cdk.App();

const stageName = app.node.tryGetContext('stageName') ?? 'dev';

const tags: Record<string, string> = {
  project: 'team-manager',
  stage: stageName,
};

const authStack = new AuthStack(app, `TeamManager-Auth-${stageName}`, {
  stageName,
  tags,
});

const infraStack = new InfraStack(app, `TeamManager-Infra-${stageName}`, {
  stageName,
  userPoolArn: authStack.userPoolArn,
  policyStoreId: authStack.policyStoreId,
  tags,
});

infraStack.addDependency(authStack);

new FrontendStack(app, `TeamManager-Frontend-${stageName}`, {
  stageName,
  tags,
});

app.synth();
