const mockSend = vi.fn();

vi.mock('@aws-sdk/client-verifiedpermissions', () => ({
  VerifiedPermissionsClient: vi.fn(() => ({ send: mockSend })),
  IsAuthorizedCommand: vi.fn((input: any) => input),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { VerifiedPermissionsAdapter } = await import(
  '../verified-permissions-adapter.js'
);
const { IsAuthorizedCommand } = await import(
  '@aws-sdk/client-verifiedpermissions'
);

describe('VerifiedPermissionsAdapter', () => {
  let adapter: InstanceType<typeof VerifiedPermissionsAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new VerifiedPermissionsAdapter();
  });

  it('returns true when decision is ALLOW', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    const result = await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Organization', entityId: 'org-1' },
    });
    expect(result).toBe(true);
  });

  it('returns false when decision is DENY', async () => {
    mockSend.mockResolvedValue({ decision: 'DENY' });
    const result = await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'Delete' },
      resource: { entityType: 'SquadLogic::Organization', entityId: 'org-1' },
    });
    expect(result).toBe(false);
  });

  it('sends correct IsAuthorizedCommand', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'Create' },
      resource: { entityType: 'SquadLogic::Team', entityId: 'team-1' },
    });

    expect(IsAuthorizedCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
        action: { actionType: 'SquadLogic::Action', actionId: 'Create' },
        resource: { entityType: 'SquadLogic::Team', entityId: 'team-1' },
      }),
    );
  });

  it('passes entities with string attributes', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Resource', entityId: 'res-1' },
      entities: [
        {
          entityType: 'SquadLogic::User',
          entityId: 'user-1',
          attributes: {
            organizationId: { string: 'org-1' },
            email: { string: 'test@test.com' },
          },
          parents: [{ entityType: 'SquadLogic::Role', entityId: 'OrgAdmin' }],
        },
      ],
    });

    const call = (IsAuthorizedCommand as any).mock.calls[0][0];
    expect(call.entities.entityList).toHaveLength(1);
    expect(call.entities.entityList[0].identifier).toEqual({
      entityType: 'SquadLogic::User',
      entityId: 'user-1',
    });
    expect(call.entities.entityList[0].attributes.organizationId).toEqual({ string: 'org-1' });
    expect(call.entities.entityList[0].parents).toEqual([
      { entityType: 'SquadLogic::Role', entityId: 'OrgAdmin' },
    ]);
  });

  it('handles long attribute values', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Resource', entityId: 'res-1' },
      entities: [
        {
          entityType: 'SquadLogic::Resource',
          entityId: 'res-1',
          attributes: { count: { long: 42 } },
        },
      ],
    });

    const call = (IsAuthorizedCommand as any).mock.calls[0][0];
    expect(call.entities.entityList[0].attributes.count).toEqual({ long: 42 });
  });

  it('handles boolean attribute values', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Resource', entityId: 'res-1' },
      entities: [
        {
          entityType: 'SquadLogic::Resource',
          entityId: 'res-1',
          attributes: { active: { boolean: true } },
        },
      ],
    });

    const call = (IsAuthorizedCommand as any).mock.calls[0][0];
    expect(call.entities.entityList[0].attributes.active).toEqual({ boolean: true });
  });

  it('handles empty attribute values as fallback', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Resource', entityId: 'res-1' },
      entities: [
        {
          entityType: 'SquadLogic::Resource',
          entityId: 'res-1',
          attributes: { empty: {} },
        },
      ],
    });

    const call = (IsAuthorizedCommand as any).mock.calls[0][0];
    expect(call.entities.entityList[0].attributes.empty).toEqual({ string: '' });
  });

  it('sends undefined entities when none provided', async () => {
    mockSend.mockResolvedValue({ decision: 'ALLOW' });
    await adapter.isAuthorized({
      principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
      action: { actionType: 'SquadLogic::Action', actionId: 'View' },
      resource: { entityType: 'SquadLogic::Resource', entityId: 'res-1' },
    });

    const call = (IsAuthorizedCommand as any).mock.calls[0][0];
    expect(call.entities).toBeUndefined();
  });
});
