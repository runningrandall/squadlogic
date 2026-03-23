describe('Team Roster (Members + Groups)', () => {
  let teamId: string;
  let athleteId: string;
  let coachId: string;
  let athleteMemberId: string;
  let coachMemberId: string;
  let groupId: string;

  before(() => {
    // Create a team
    cy.apiRequest('POST', '/teams', {
      name: 'Roster Test Team',
      sport: 'Basketball',
      season: 'Winter 2026',
    }).then((res) => {
      teamId = res.body.teamId;
    });

    // Create an athlete
    cy.apiRequest('POST', '/athletes', {
      firstName: 'Roster',
      lastName: 'Player',
      email: `roster.player.${Date.now()}@test.com`,
      positions: ['Guard'],
    }).then((res) => {
      athleteId = res.body.athleteId;
    });

    // Create a coach
    cy.apiRequest('POST', '/coaches', {
      firstName: 'Roster',
      lastName: 'Coach',
      email: `roster.coach.${Date.now()}@test.com`,
    }).then((res) => {
      coachId = res.body.coachId;
    });
  });

  it('adds an athlete to the team', () => {
    cy.apiRequest('POST', `/teams/${teamId}/members`, {
      memberId: athleteId,
      memberType: 'athlete',
      role: 'player',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.memberType).to.eq('athlete');
      expect(response.body.role).to.eq('player');
      athleteMemberId = response.body.teamMemberId;
    });
  });

  it('adds a coach to the team', () => {
    cy.apiRequest('POST', `/teams/${teamId}/members`, {
      memberId: coachId,
      memberType: 'coach',
      role: 'head_coach',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.memberType).to.eq('coach');
      coachMemberId = response.body.teamMemberId;
    });
  });

  it('lists team members', () => {
    cy.apiRequest('GET', `/teams/${teamId}/members`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items.length).to.eq(2);
    });
  });

  it('prevents duplicate team membership', () => {
    cy.apiRequest('POST', `/teams/${teamId}/members`, {
      memberId: athleteId,
      memberType: 'athlete',
      role: 'player',
    }).then((response) => {
      expect(response.status).to.eq(409);
    });
  });

  it('creates a group within the team', () => {
    cy.apiRequest('POST', `/teams/${teamId}/groups`, {
      name: 'Starters',
      description: 'Starting lineup',
      teamId,
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.name).to.eq('Starters');
      groupId = response.body.groupId;
    });
  });

  it('adds an athlete to the group', () => {
    cy.apiRequest('POST', `/groups/${groupId}/members`, {
      athleteId,
      role: 'member',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.athleteId).to.eq(athleteId);
    });
  });

  it('lists group members', () => {
    cy.apiRequest('GET', `/groups/${groupId}/members`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items.length).to.eq(1);
    });
  });

  // Cleanup
  after(() => {
    if (coachMemberId) cy.apiRequest('DELETE', `/team-members/${coachMemberId}`);
    if (athleteMemberId) cy.apiRequest('DELETE', `/team-members/${athleteMemberId}`);
    if (groupId) cy.apiRequest('DELETE', `/groups/${groupId}`);
    if (teamId) cy.apiRequest('DELETE', `/teams/${teamId}`);
  });
});
