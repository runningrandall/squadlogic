export interface AuthorizationRequest {
  principal: {
    entityType: string;
    entityId: string;
  };
  action: {
    actionType: string;
    actionId: string;
  };
  resource: {
    entityType: string;
    entityId: string;
  };
  entities?: AuthorizationEntity[];
}

export interface AuthorizationEntity {
  entityType: string;
  entityId: string;
  attributes?: Record<string, AttributeValue>;
  parents?: Array<{ entityType: string; entityId: string }>;
}

export interface AttributeValue {
  string?: string;
  long?: number;
  boolean?: boolean;
}

export interface AuthorizationPort {
  isAuthorized(request: AuthorizationRequest): Promise<boolean>;
}
