describe('Teams API', () => {
  let teamId: string;

  it('creates a team', () => {
    cy.apiRequest('POST', '/teams', {
      name: 'Cypress FC',
      sport: 'Soccer',
      season: 'Spring 2026',
      description: 'A test team created by Cypress',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('teamId');
      expect(response.body.name).to.eq('Cypress FC');
      expect(response.body.sport).to.eq('Soccer');
      teamId = response.body.teamId;
    });
  });

  it('lists teams', () => {
    cy.apiRequest('GET', '/teams').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('items');
      expect(response.body.items.length).to.be.greaterThan(0);
    });
  });

  it('gets a team by id', () => {
    cy.apiRequest('GET', `/teams/${teamId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.teamId).to.eq(teamId);
      expect(response.body.name).to.eq('Cypress FC');
    });
  });

  it('updates a team', () => {
    cy.apiRequest('PUT', `/teams/${teamId}`, {
      name: 'Cypress FC Updated',
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.name).to.eq('Cypress FC Updated');
    });
  });

  it('deletes a team', () => {
    cy.apiRequest('DELETE', `/teams/${teamId}`).then((response) => {
      expect(response.status).to.eq(204);
    });
  });

  it('returns 404 for deleted team', () => {
    cy.apiRequest('GET', `/teams/${teamId}`).then((response) => {
      expect(response.status).to.eq(404);
    });
  });
});
